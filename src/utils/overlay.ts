import { computed, inject, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import type { InjectionKey, Ref } from 'vue'

interface OverlayEntry {
  parent: OverlayEntry | null
  elements: () => Array<HTMLElement | null | undefined>
  modal: boolean
  minimumZIndex: () => number
  zIndex: Ref<number>
  onEscape?: (event: KeyboardEvent) => void
  closeOnEscape: () => boolean
  previousFocus: HTMLElement | null
  initialFocus?: () => HTMLElement | null | undefined
  kind?: 'dialog'
  hasDialogBelow: Ref<boolean>
  hasDialogAbove: Ref<boolean>
}

const overlayKey: InjectionKey<OverlayEntry> = Symbol('BingOverlay')
const managers = new WeakMap<Document, ReturnType<typeof createManager>>()
const scopeListeners = new WeakMap<Document, Set<() => void>>()

/** 只订阅浮层作用域变化，不接管焦点或键盘。 */
export function onOverlayScopeChange(doc: Document, listener: () => void) {
  let listeners = scopeListeners.get(doc)
  if (!listeners) { listeners = new Set(); scopeListeners.set(doc, listeners) }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) scopeListeners.delete(doc)
  }
}
const focusableSelector = 'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]'

function belongsTo(entry: OverlayEntry, ancestor: OverlayEntry): boolean {
  return entry === ancestor || Boolean(entry.parent && belongsTo(entry.parent, ancestor))
}

function createManager(doc: Document) {
  const stack: OverlayEntry[] = []
  const keyOwners = new WeakMap<KeyboardEvent, OverlayEntry | undefined>()
  const top = () => stack.at(-1)
  const modal = () => [...stack].reverse().find(entry => entry.modal)
  const contains = (entry: OverlayEntry, target: Node | null) =>
    !!target && stack.some(candidate => belongsTo(candidate, entry) && candidate.elements().some(element => element?.contains(target)))

  function updateZIndices() {
    let previous = 0
    for (const entry of stack) {
      entry.zIndex.value = Math.max(entry.minimumZIndex(), previous + 2)
      previous = entry.zIndex.value
      const index = stack.indexOf(entry)
      entry.hasDialogBelow.value = stack.slice(0, index).some(candidate => candidate.kind === 'dialog')
      entry.hasDialogAbove.value = stack.slice(index + 1).some(candidate => candidate.kind === 'dialog')
    }
  }

  function focusables(entry: OverlayEntry) {
    const elements = stack.filter(candidate => belongsTo(candidate, entry)).flatMap(candidate => candidate.elements())
    return [...new Set(elements.flatMap(element => element ? [element, ...element.querySelectorAll<HTMLElement>(focusableSelector)] : []))]
      .filter(element => element.matches(focusableSelector) && element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length > 0 && doc.defaultView?.getComputedStyle(element).visibility !== 'hidden')
  }

  function focusFirst(entry: OverlayEntry) {
    const element = entry.initialFocus?.() ?? focusables(entry)[0] ?? entry.elements().find(Boolean)
    element?.focus({ preventScroll: true })
  }

  function captureKey(event: KeyboardEvent) {
    keyOwners.set(event, top())
    const current = modal()
    if (event.key !== 'Tab' || !current) return
    const items = focusables(current)
    const index = items.indexOf(doc.activeElement as HTMLElement)
    if (!items.length || index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
      event.preventDefault()
      if (items.length) items[event.shiftKey ? items.length - 1 : 0]?.focus()
      else focusFirst(current)
    }
  }

  function handleKey(event: KeyboardEvent) {
    const owner = keyOwners.get(event)
    if (event.key === 'Escape' && !event.defaultPrevented && owner?.closeOnEscape()) {
      event.preventDefault()
      keyOwners.set(event, undefined)
      owner.onEscape?.(event)
    }
  }

  function handleFocus(event: FocusEvent) {
    const current = modal()
    if (current && !contains(current, event.target as Node)) focusFirst(current)
  }

  return {
    contains,
    allowsFocus: (target: Node) => !top() || contains(top()!, target),
    isTop: (entry: OverlayEntry, event?: KeyboardEvent) => (event && keyOwners.has(event) ? keyOwners.get(event) : top()) === entry,
    add(entry: OverlayEntry) {
      if (stack.includes(entry)) {
        updateZIndices()
        return
      }
      entry.previousFocus = doc.activeElement as HTMLElement | null
      stack.push(entry)
      updateZIndices()
      scopeListeners.get(doc)?.forEach(listener => listener())
      if (stack.length === 1) {
        doc.defaultView?.addEventListener('keydown', captureKey, true)
        doc.defaultView?.addEventListener('keydown', handleKey)
        doc.addEventListener('focusin', handleFocus)
      }
      if (entry.modal) void nextTick(() => {
        if (modal() === entry && !contains(entry, doc.activeElement)) focusFirst(entry)
      })
    },
    remove(entry: OverlayEntry) {
      const index = stack.indexOf(entry)
      if (index < 0) return
      const wasTopModal = modal() === entry
      stack.splice(index, 1)
      updateZIndices()
      if (wasTopModal) void nextTick(() => {
        const current = modal()
        const previous = entry.previousFocus
        if (previous?.isConnected && (!current || contains(current, previous))) previous.focus({ preventScroll: true })
        else if (current) focusFirst(current)
      })
      if (!stack.length) {
        doc.defaultView?.removeEventListener('keydown', captureKey, true)
        doc.defaultView?.removeEventListener('keydown', handleKey)
        doc.removeEventListener('focusin', handleFocus)
        managers.delete(doc)
      }
      scopeListeners.get(doc)?.forEach(listener => listener())
    },
  }
}

/** 字段导航等非浮层行为不能越过当前最上层浮层抢夺焦点。 */
export function isInActiveOverlayScope(element: HTMLElement) {
  return managers.get(element.ownerDocument)?.allowsFocus(element) ?? true
}

export function useOverlay(options: {
  open: () => boolean
  elements: OverlayEntry['elements']
  zIndex: () => number
  modal?: boolean
  closeOnEscape?: () => boolean
  onEscape?: (event: KeyboardEvent) => void
  /** 仅显式提供的组件改变初始焦点；其他浮层沿用原规则。 */
  initialFocus?: OverlayEntry['initialFocus']
  kind?: 'dialog'
}) {
  const entry: OverlayEntry = {
    parent: inject(overlayKey, null),
    elements: options.elements,
    modal: options.modal ?? false,
    minimumZIndex: options.zIndex,
    zIndex: ref(options.zIndex()),
    closeOnEscape: options.closeOnEscape ?? (() => true),
    onEscape: options.onEscape,
    previousFocus: null,
    initialFocus: options.initialFocus,
    kind: options.kind,
    hasDialogBelow: ref(false),
    hasDialogAbove: ref(false),
  }
  provide(overlayKey, entry)
  let manager: ReturnType<typeof createManager> | undefined
  watch([options.open, options.zIndex], ([open]) => {
    if (typeof document === 'undefined') return
    if (open) {
      manager = managers.get(document)
      if (!manager) { manager = createManager(document); managers.set(document, manager) }
      manager.add(entry)
    } else manager?.remove(entry)
  }, { immediate: true, flush: 'post' })
  onBeforeUnmount(() => manager?.remove(entry))
  return {
    zIndex: computed(() => Math.max(options.zIndex(), entry.zIndex.value)),
    isTop: (event?: KeyboardEvent) => manager?.isTop(entry, event) ?? false,
    contains: (target: Node | null) => manager?.contains(entry, target) ?? false,
    hasDialogBelow: computed(() => entry.hasDialogBelow.value),
    hasDialogAbove: computed(() => entry.hasDialogAbove.value),
  }
}
