import { onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { CheckboxOptionRegistration } from './BingCheckboxGroup.context'
import type { BingCheckboxGroupValue as Value } from './BingCheckboxGroup.types'

type Entry = [HTMLElement, CheckboxOptionRegistration]
interface SelectionOptions {
  root: Ref<HTMLElement | null>
  values: () => Value[]
  disabled: () => boolean
  dragSelect: () => boolean
  rangeSelect: () => boolean
  update: (values: Value[]) => void
  commit: (values: Value[], event: Event) => void
}

// 快速移动可能跨过几个选项才收到下一次 pointermove，按实际经过的线段补齐它们。
function segmentEntry(x: number, y: number, nextX: number, nextY: number, rect: DOMRect) {
  let enter = 0
  let exit = 1
  for (const [start, delta, low, high] of [[x, nextX - x, rect.left, rect.right], [y, nextY - y, rect.top, rect.bottom]]) {
    if (delta === 0) { if (start! < low! || start! > high!) return; continue }
    const a = (low! - start!) / delta!
    const b = (high! - start!) / delta!
    enter = Math.max(enter, Math.min(a, b))
    exit = Math.min(exit, Math.max(a, b))
    if (enter > exit) return
  }
  return enter
}

export function useCheckboxSelection(options: SelectionOptions) {
  const entries = new Map<HTMLElement, CheckboxOptionRegistration>()
  const isDragging = ref(false)
  let anchor: HTMLElement | undefined
  let cleanupGesture: (() => void) | undefined
  let cleanupClick: (() => void) | undefined

  function register(element: HTMLElement, option: CheckboxOptionRegistration) {
    entries.set(element, option)
    return () => {
      entries.delete(element)
      if (anchor === element) anchor = undefined
    }
  }

  function orderedEntries() {
    return [...entries].filter(([element]) => options.root.value?.contains(element))
      .sort(([a], [b]) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
  }

  function apply(current: Value[], targets: Entry[], checked: boolean) {
    const next = new Set(current)
    for (const [, option] of targets) {
      const value = option.value()
      if (option.disabled() || value === undefined) continue
      if (next.has(value) === checked) continue
      option.markDirect()
      if (checked) next.add(value)
      else next.delete(value)
    }
    return [...next]
  }

  function updateValue(value: Value, checked: boolean, event: Event, click?: MouseEvent) {
    if (options.disabled()) return
    const ordered = orderedEntries()
    const target = ordered.find(([, option]) => option.value() === value && !option.disabled())
    let targets = target ? [target] : []
    // 键盘产生的 click.detail 为 0，Shift + Space 仍只切换当前项。
    if (target && options.rangeSelect() && click?.shiftKey && click.detail > 0 && anchor) {
      const start = ordered.findIndex(([element]) => element === anchor)
      const end = ordered.indexOf(target)
      if (start >= 0) targets = ordered.slice(Math.min(start, end), Math.max(start, end) + 1)
    }
    const next = target ? apply(options.values(), targets, checked)
      : checked ? [...new Set([...options.values(), value])] : options.values().filter(item => item !== value)
    if (target && click && click.detail > 0) anchor = target[0]
    options.update(next)
    options.commit(next, event)
  }

  function findEntry(target: Element | null): Entry | undefined {
    const element = target?.closest<HTMLElement>('.bing-checkbox')
    const option = element && entries.get(element)
    return element && option ? [element, option] : undefined
  }

  function handleClick(event: MouseEvent) {
    if (event.defaultPrevented || options.disabled() || !options.rangeSelect() || !event.shiftKey || event.detail === 0) return
    const target = findEntry(event.target instanceof Element ? event.target : null)
    const value = target?.[1].value()
    if (!target || target[1].disabled() || value === undefined) return
    // Firefox 的 Shift + label 点击不会执行与 Chromium 一致的原生激活。
    // 范围手势统一处理一次，普通点击与键盘仍交给原生 input。
    event.preventDefault()
    const checked = !options.values().includes(value)
    target[0].querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    target[1].playSelection(checked, event)
    updateValue(value, checked, event, event)
  }

  function suppressFollowingClick(doc: Document) {
    cleanupClick?.()
    const suppress = (event: MouseEvent) => {
      if (event.detail === 0) return
      event.preventDefault()
      event.stopImmediatePropagation()
      cleanupClick?.()
    }
    // pointerup 的原生 click 在同一轮事件中发出；下一轮立即释放，避免吞掉下一次操作。
    const timer = doc.defaultView?.setTimeout(() => cleanupClick?.(), 0)
    cleanupClick = () => {
      doc.removeEventListener('click', suppress, true)
      doc.defaultView?.clearTimeout(timer)
      cleanupClick = undefined
    }
    doc.addEventListener('click', suppress, true)
  }

  function handlePointerDown(event: PointerEvent) {
    if (!options.dragSelect() || options.disabled() || event.defaultPrevented || event.button !== 0 ||
      (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return
    const start = findEntry(event.target instanceof Element ? event.target : null)
    if (!start || start[1].disabled() || start[1].value() === undefined) return
    cleanupGesture?.()
    const doc = start[0].ownerDocument
    const view = doc.defaultView
    const checked = !options.values().includes(start[1].value()!)
    let values = [...options.values()]
    const visited = new Set<HTMLElement>()
    let last = start
    let lastX = event.clientX
    let lastY = event.clientY

    function visit(entry: Entry) {
      if (visited.has(entry[0]) || entry[1].disabled()) return
      visited.add(entry[0])
      last = entry
      const next = apply(values, [entry], checked)
      if (next.length !== values.length || next.some((value, index) => value !== values[index])) {
        values = next
        options.update(values)
      }
    }

    function move(next: PointerEvent) {
      if (next.pointerId !== event.pointerId) return
      const target = findEntry(doc.elementFromPoint(next.clientX, next.clientY))
      const crossed = orderedEntries().map(entry => ({ entry, at: segmentEntry(lastX, lastY, next.clientX, next.clientY, entry[0].getBoundingClientRect()) }))
        .filter((hit): hit is { entry: Entry; at: number } => hit.at !== undefined)
        .sort((a, b) => a.at - b.at)
      lastX = next.clientX
      lastY = next.clientY
      if (!isDragging.value && crossed.some(hit => hit.entry[0] !== start![0]) &&
        Math.hypot(next.clientX - event.clientX, next.clientY - event.clientY) > 4) {
        isDragging.value = true
        start![0].querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
        visit(start!)
      }
      if (!isDragging.value) return
      next.preventDefault()
      for (const hit of crossed) visit(hit.entry)
      if (target) visit(target)
    }

    function finish(next: Event) {
      if (next instanceof PointerEvent && next.pointerId !== event.pointerId) return
      const changed = isDragging.value
      cleanupGesture?.()
      if (changed) {
        anchor = last[0]
        if (next.type === 'pointerup') suppressFollowingClick(doc)
        options.commit(values, next)
      }
    }
    cleanupGesture = () => {
      doc.removeEventListener('pointermove', move)
      doc.removeEventListener('pointerup', finish)
      doc.removeEventListener('pointercancel', finish)
      view?.removeEventListener('blur', finish)
      isDragging.value = false
      cleanupGesture = undefined
    }
    doc.addEventListener('pointermove', move, { passive: false })
    doc.addEventListener('pointerup', finish)
    doc.addEventListener('pointercancel', finish)
    view?.addEventListener('blur', finish)
  }

  watch(() => [options.dragSelect(), options.disabled()], () => {
    if (!options.dragSelect() || options.disabled()) cleanupGesture?.()
  })
  onBeforeUnmount(() => { cleanupGesture?.(); cleanupClick?.(); entries.clear() })
  return { isDragging, register, updateValue, handlePointerDown, handleClick }
}
