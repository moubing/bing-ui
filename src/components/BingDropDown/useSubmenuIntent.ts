import { onBeforeUnmount } from 'vue'
import { isPointInTriangle } from '../../utils/isPointInTriangle'
import type { Point } from '../../utils/isPointInTriangle'
import type { MenuHighlightSource } from './useMenuNavigation'

interface SubmenuEntry {
  panel: () => HTMLElement | undefined
  visible: () => boolean
  open: (focus?: boolean) => void
  close: () => void
}

export function useSubmenuIntent(resume: (item: HTMLElement, event: PointerEvent) => void) {
  const entries = new Map<HTMLElement, SubmenuEntry>()
  const closeTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>()
  let opening: { item: HTMLElement; timer: ReturnType<typeof setTimeout> } | undefined
  let grace: { item: HTMLElement; a: Point; b: Point; c: Point; previousX: number; event: PointerEvent } | undefined
  let graceTimer: ReturnType<typeof setTimeout> | undefined
  function cancelOpen() { if (opening) clearTimeout(opening.timer); opening = undefined }
  function cancelClose(item: HTMLElement) { clearTimeout(closeTimers.get(item)); closeTimers.delete(item) }
  function clearGrace() {
    grace = undefined; clearTimeout(graceTimer); graceTimer = undefined
    if (typeof document !== 'undefined') document.removeEventListener('pointermove', track, true)
  }
  function close(item: HTMLElement) {
    if (opening?.item === item) cancelOpen()
    cancelClose(item)
    if (grace?.item === item) clearGrace()
    const entry = entries.get(item)
    const panel = entry?.panel()
    if (panel) for (const child of entries.keys()) if (child !== item && child.closest('[role="menu"]') === panel) close(child)
    entry?.close()
  }
  function register(item: HTMLElement, entry: SubmenuEntry) {
    entries.set(item, entry)
    return () => { close(item); entries.delete(item) }
  }
  function activate(item: HTMLElement, source: MenuHighlightSource) {
    if (opening?.item !== item) cancelOpen()
    const menu = item.closest('[role="menu"]')
    for (const other of entries.keys()) if (other !== item && other.closest('[role="menu"]') === menu) close(other)
    if (source === 'pointer') enter(item)
  }
  function enter(item: HTMLElement) {
    const entry = entries.get(item)
    cancelClose(item)
    if (grace?.item === item) clearGrace()
    if (!entry || entry.visible() || opening?.item === item) return
    cancelOpen()
    opening = { item, timer: setTimeout(() => { opening = undefined; entry.open() }, 100) }
  }
  function scheduleClose(item: HTMLElement) {
    cancelClose(item)
    closeTimers.set(item, setTimeout(() => { closeTimers.delete(item); close(item) }, 90))
  }
  function stopGrace(resumePointer: boolean) {
    const current = grace
    clearGrace()
    if (!current) return
    scheduleClose(current.item)
    const target = current.event.target instanceof Element ? current.event.target.closest<HTMLElement>('[data-bing-dropdown-item]') : null
    if (resumePointer && target && target !== current.item) resume(target, current.event)
  }
  function track(event: PointerEvent) {
    if (!grace || event.pointerType === 'touch') return
    const current = grace, panel = entries.get(current.item)?.panel()
    current.event = event
    if (event.target instanceof Node && (panel?.contains(event.target) || current.item.contains(event.target))) {
      cancelClose(current.item); clearGrace(); return
    }
    const toward = Math.abs(current.b.x - event.clientX) <= Math.abs(current.b.x - current.previousX) + 1
    current.previousX = event.clientX
    if (!toward || !isPointInTriangle({ x: event.clientX, y: event.clientY }, current.a, current.b, current.c)) stopGrace(true)
  }
  function leave(item: HTMLElement, event: PointerEvent) {
    if (opening?.item === item) cancelOpen()
    const entry = entries.get(item), panel = entry?.panel()
    if (!entry?.visible() || !panel) return
    const rect = panel.getBoundingClientRect()
    if (!rect.width || event.pointerType === 'touch') { scheduleClose(item); return }
    clearGrace(); cancelClose(item)
    const edge = rect.left >= item.getBoundingClientRect().right - 1 ? rect.left : rect.right
    grace = { item, a: { x: event.clientX, y: event.clientY }, b: { x: edge, y: rect.top - 4 },
      c: { x: edge, y: rect.bottom + 4 }, previousX: event.clientX, event }
    document.addEventListener('pointermove', track, true)
    graceTimer = setTimeout(() => stopGrace(true), 300)
  }
  function protects(item: HTMLElement, event: PointerEvent) {
    if (!grace || grace.item === item) return false
    // capture 监听已处理方向；这里也覆盖合成 pointerenter 与首个边界事件。
    return isPointInTriangle({ x: event.clientX, y: event.clientY }, grace.a, grace.b, grace.c)
  }
  function enterPanel(item: HTMLElement) { cancelClose(item); if (grace?.item === item) clearGrace() }
  function open(item: HTMLElement, focus = true) {
    const entry = entries.get(item)
    if (!entry) return false
    cancelOpen(); activate(item, 'keyboard'); enterPanel(item); entry.open(focus)
    return true
  }
  function closePanel(panel: HTMLElement) {
    const item = [...entries.keys()].find(candidate => entries.get(candidate)?.panel() === panel)
    if (item) close(item)
    return item
  }
  function reset() {
    cancelOpen(); clearGrace()
    for (const item of entries.keys()) close(item)
  }
  onBeforeUnmount(reset)
  return { register, activate, enter, leave, protects, enterPanel, scheduleClose, open, close, closePanel, reset }
}
