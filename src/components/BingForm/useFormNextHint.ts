import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { CSSProperties, Ref } from 'vue'
import type { BingFormNextHintContext, BingFormNextHintField } from './BingForm.context'
import { nextFormTabStop } from './formTabOrder'
import { isInActiveOverlayScope, onOverlayScopeChange } from '../../utils/overlay'

interface NextHint {
  target: HTMLElement
  anchor: HTMLElement
  text: string
  offscreen: boolean
  submit: boolean
}

/** 每个表单只有一个不可交互的提示；用户仍由浏览器原生 Tab 顺序导航。 */
export function useFormNextHint(root: Ref<HTMLFormElement | null>, hintRef: Ref<HTMLElement | null>, enabled: () => boolean) {
  const fields = new Set<BingFormNextHintField>()
  const hint = shallowRef<NextHint | null>(null)
  const style = shallowRef<CSSProperties>({ visibility: 'hidden' })
  let cleanup: (() => void) | undefined
  let schedule = () => {}
  let windowActive = true

  function clippedBounds(element: HTMLElement) {
    const doc = element.ownerDocument
    const bounds = { left: 0, top: 0, right: doc.documentElement.clientWidth, bottom: doc.documentElement.clientHeight }
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const css = doc.defaultView!.getComputedStyle(parent)
      const rect = parent.getBoundingClientRect()
      if (/(auto|scroll|hidden|clip)/.test(css.overflowX)) {
        bounds.left = Math.max(bounds.left, rect.left)
        bounds.right = Math.min(bounds.right, rect.right)
      }
      if (/(auto|scroll|hidden|clip)/.test(css.overflowY)) {
        bounds.top = Math.max(bounds.top, rect.top)
        bounds.bottom = Math.min(bounds.bottom, rect.bottom)
      }
    }
    return bounds
  }

  function inView(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const bounds = clippedBounds(element)
    return rect.top >= bounds.top && rect.bottom <= bounds.bottom && rect.left >= bounds.left && rect.right <= bounds.right
  }

  function fieldFor(element: HTMLElement) {
    return [...fields].find(field => field.element() === element.closest('.bing-form-item'))
  }

  function refresh() {
    const form = root.value
    const active = form?.ownerDocument.activeElement as HTMLElement | null
    hint.value = null
    style.value = { visibility: 'hidden' }
    if (!enabled() || !windowActive || !form || !active || !isInActiveOverlayScope(form)) return
    const current = fieldFor(active)
    if (!current || active.closest('[aria-expanded="true"]')) return
    const next = nextFormTabStop(form, active)
    if (!next || next.matches('[aria-disabled="true"]')) return
    const submit = (next instanceof HTMLButtonElement || next instanceof HTMLInputElement) && next.type === 'submit' && next.form === form
    const nextField = fieldFor(next)
    if (!submit && (!nextField || nextField === current || nextField.target() !== next)) return
    const offscreen = !inView(next)
    const anchor = offscreen ? current.element() : submit ? next : nextField?.element()
    if (!anchor) return
    hint.value = {
      target: next, anchor, offscreen, submit,
      text: offscreen ? submit ? '下一步：前往提交' : `下一项：${nextField!.label()}` : submit ? '前往提交' : '下一项',
    }
    void nextTick(position)
  }

  function position() {
    const form = root.value
    const node = hintRef.value
    const state = hint.value
    if (!form || !node || !state || !enabled()) return
    const bounds = clippedBounds(state.anchor)
    const formRect = form.getBoundingClientRect()
    const anchorRect = state.anchor.getBoundingClientRect()
    const sx = formRect.width / form.offsetWidth || 1
    const sy = formRect.height / form.offsetHeight || 1
    const height = node.offsetHeight * sy
    let left: number
    let top: number
    let right = Math.min(bounds.right - 4, formRect.right, anchorRect.right)
    if (state.submit && !state.offscreen) {
      left = anchorRect.left
      top = anchorRect.top - height - 6
      right = Math.min(bounds.right - 4, formRect.right)
    } else {
      const label = state.anchor.querySelector<HTMLElement>('.bing-form-item__label')
      const parts = label ? Array.from(label.children).filter(child => !child.matches('kbd') && child.getBoundingClientRect().width > 0) : []
      if (!label || !parts.length || state.anchor.classList.contains('bing-form-item--label-left')) return
      const labelRect = label.getBoundingClientRect()
      left = Math.max(...parts.map(child => child.getBoundingClientRect().right)) + 10
      top = labelRect.top + (labelRect.height - height) / 2
    }
    // 空间不足就隐藏，不能遮住标签、输入内容，或把窄屏布局撑开。
    if (right - left < 88 * sx || left < bounds.left || top < bounds.top || top + height > bounds.bottom) return
    if (state.submit && !state.offscreen) {
      const hintRight = left + Math.min(node.offsetWidth * sx, right - left)
      const occupied = form.querySelectorAll('.bing-form-item__control,.bing-form-item__label,.bing-form-item__message-text,button,a[href]')
      if (Array.from(occupied).some(element => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && rect.left < hintRight && rect.right > left && rect.top < top + height && rect.bottom > top
      })) return
    }
    style.value = {
      left: `${(left - formRect.left) / sx - form.clientLeft + form.scrollLeft}px`,
      top: `${(top - formRect.top) / sy - form.clientTop + form.scrollTop}px`,
      maxWidth: `${Math.min(280, (right - left) / sx)}px`,
      visibility: 'visible',
    }
  }

  function start() {
    cleanup?.()
    cleanup = undefined
    hint.value = null
    if (!enabled() || !root.value) return
    const form = root.value
    const doc = form.ownerDocument
    const win = doc.defaultView!
    let frame = 0
    let disposed = false
    schedule = () => {
      if (!disposed && !frame) frame = win.requestAnimationFrame(() => { frame = 0; refresh() })
    }
    const observer = new MutationObserver(records => {
      if (records.some(record => !hintRef.value?.contains(record.target))) schedule()
    })
    observer.observe(form, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['disabled', 'hidden', 'inert', 'tabindex', 'style', 'class', 'aria-expanded', 'aria-disabled', 'name', 'type', 'open'] })
    const resize = new ResizeObserver(schedule)
    resize.observe(form)
    const unsubscribe = onOverlayScopeChange(doc, schedule)
    const events = ['focusin', 'focusout', 'input', 'change', 'scroll'] as const
    events.forEach(event => doc.addEventListener(event, schedule, true))
    win.addEventListener('resize', schedule)
    const blur = () => { windowActive = false; clear() }
    const focus = () => { windowActive = true; schedule() }
    win.addEventListener('blur', blur)
    win.addEventListener('focus', focus)
    cleanup = () => {
      disposed = true
      win.cancelAnimationFrame(frame)
      observer.disconnect()
      resize.disconnect()
      unsubscribe()
      events.forEach(event => doc.removeEventListener(event, schedule, true))
      win.removeEventListener('resize', schedule)
      win.removeEventListener('blur', blur)
      win.removeEventListener('focus', focus)
      schedule = () => {}
      clear()
    }
    schedule()
  }

  function clear() { hint.value = null; style.value = { visibility: 'hidden' } }
  const context: BingFormNextHintContext = {
    register(field) {
      fields.add(field)
      schedule()
      return () => { fields.delete(field); schedule() }
    },
  }
  onMounted(start)
  watch(enabled, start, { flush: 'post' })
  onBeforeUnmount(() => cleanup?.())
  return { context, hint, style }
}
