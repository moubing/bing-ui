import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import type { BingTooltipTriggerProps } from './BingTooltip.types'

const focusable = 'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
const normalize = (text: string | null | undefined) => text?.replace(/\s+/g, ' ').trim() ?? ''

/** 将关联放到实际触发器上，并且只撤销 Tooltip 自己添加的属性。 */
export function useTooltipTrigger(options: {
  root: Ref<HTMLElement | null>
  id: () => string
  ownerId: string
  open: () => boolean
  expandable: () => boolean
  description: () => string
  shortcut: () => string | undefined
}) {
  const target = shallowRef<HTMLElement | null>(null)
  const expanded = shallowRef(false)
  const duplicate = shallowRef(false)
  const owned = new Map<string, { before: string | null; value: string }>()
  const ownedTokens = new Map<string, string>()
  let observer: MutationObserver | undefined
  let frame = 0
  let attachedId: string | undefined

  function setAttribute(element: HTMLElement, name: string, value: string | null) {
    if (element.getAttribute(name) === value) return
    if (value === null) element.removeAttribute(name)
    else element.setAttribute(name, value)
  }

  function token(element: HTMLElement, name: string, id: string, add: boolean) {
    const tokens = new Set((element.getAttribute(name) ?? '').split(/\s+/).filter(Boolean))
    if (add && !tokens.has(id)) {
      tokens.add(id)
      ownedTokens.set(name, id)
    } else if (!add && ownedTokens.get(name) === id) {
      tokens.delete(id)
      ownedTokens.delete(name)
    }
    setAttribute(element, name, [...tokens].join(' ') || null)
  }

  function restore(name: string) {
    const item = owned.get(name)
    if (target.value && item && target.value.getAttribute(name) === item.value) {
      setAttribute(target.value, name, item.before)
    }
    owned.delete(name)
  }

  function assign(name: string, value: string | undefined) {
    const element = target.value
    if (!element) return
    if (value === undefined) { restore(name); return }
    const old = owned.get(name)
    const current = element.getAttribute(name)
    // 已有的菜单状态和业务快捷键由业务拥有；不覆盖。
    if (current !== null && !old && !element.hasAttribute('data-bing-tooltip-trigger')) return
    if (old && current !== old.value) {
      owned.delete(name)
      return
    }
    owned.set(name, { before: old ? old.before : current, value })
    setAttribute(element, name, value)
  }

  function detach() {
    const element = target.value
    if (element && attachedId) {
      token(element, 'aria-describedby', attachedId, false)
      token(element, 'aria-controls', attachedId, false)
    }
    for (const name of [...owned.keys()]) restore(name)
    attachedId = undefined
  }

  function sync() {
    const root = options.root.value
    if (!root) return
    const explicit = root.querySelector<HTMLElement>(`[data-bing-tooltip-trigger="${options.ownerId}"]`)
    const next = explicit ?? root.querySelector<HTMLElement>(focusable) ?? root
    if (next !== target.value) {
      detach()
      target.value = next
    }
    const id = options.id()
    if (attachedId && attachedId !== id) detach()
    attachedId = id
    duplicate.value = normalize(next.getAttribute('aria-label') || next.textContent) === normalize(options.description())
    token(next, 'aria-describedby', id, options.open() && !duplicate.value)
    token(next, 'aria-controls', id, options.expandable())
    assign('aria-expanded', options.expandable() ? String(options.open()) : undefined)
    assign('aria-keyshortcuts', options.shortcut())
    const ownExpanded = owned.get('aria-expanded')
    // Tooltip 的 aria-expanded 不参与菜单展开抑制。
    expanded.value = next.getAttribute('aria-expanded') === 'true'
      && !(ownExpanded?.value === 'true')
      && !(explicit && options.expandable())
  }

  function schedule() {
    if (frame || typeof window === 'undefined') return
    frame = window.requestAnimationFrame(() => { frame = 0; sync() })
  }

  onMounted(() => {
    sync()
    observer = new MutationObserver(sync)
    observer.observe(options.root.value!, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-expanded', 'aria-label', 'aria-describedby', 'aria-keyshortcuts', 'tabindex'],
    })
  })
  onUpdated(schedule)
  watch(() => [options.open(), options.id(), options.expandable(), options.shortcut(), options.description()],
    () => { sync(); void nextTick(sync) }, { flush: 'post' })
  onBeforeUnmount(() => {
    observer?.disconnect()
    if (frame) window.cancelAnimationFrame(frame)
    detach()
  })

  const triggerProps = computed<BingTooltipTriggerProps>(() => ({
    'data-bing-tooltip-trigger': options.ownerId,
    'aria-describedby': options.open() && !duplicate.value ? options.id() : undefined,
    'aria-controls': options.expandable() ? options.id() : undefined,
    'aria-expanded': options.expandable() ? options.open() : undefined,
    'aria-keyshortcuts': options.shortcut(),
  }))
  return { target, expanded, triggerProps, sync }
}
