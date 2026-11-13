import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

interface ScrubOptions {
  field: Ref<HTMLInputElement | null>
  enabled: () => boolean
  value: () => number | null
  step: (steps: number, event: Event) => void
  finish: (event: Event, initial: number | null) => void
  cancel: (value: number | null, event: Event) => void
}

/** 前缀拖动只在释放时提交 change；取消恢复起点，所有出口都释放全局监听。 */
export function useNumberScrub(options: ScrubOptions) {
  const active = ref(false)
  let pointerId: number | undefined
  let consumedX = 0
  let initial: number | null = null
  let target: HTMLElement | undefined
  let view: Window | undefined
  let previousStyles: Array<readonly [string, string, string]> = []

  function cleanup() {
    const element = target
    const id = pointerId
    active.value = false
    pointerId = undefined
    view?.removeEventListener('pointermove', move)
    view?.removeEventListener('pointerup', finish)
    view?.removeEventListener('pointercancel', cancel)
    view?.removeEventListener('blur', cancel)
    view?.removeEventListener('keydown', keydown, true)
    element?.removeEventListener('lostpointercapture', cancel)
    if (element && id !== undefined && element.hasPointerCapture?.(id)) element.releasePointerCapture(id)
    if (view) {
      const style = view.document.documentElement.style
      previousStyles.forEach(([name, value, priority]) => {
        if (value) style.setProperty(name, value, priority)
        else style.removeProperty(name)
      })
    }
    previousStyles = []
    target = undefined
    view = undefined
  }
  function move(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    const steps = Math.trunc((event.clientX - consumedX) / 4)
    if (!steps) return
    event.preventDefault()
    consumedX += steps * 4
    options.step(steps * (event.shiftKey ? 10 : 1), event)
  }
  function finish(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    move(event)
    cleanup()
    options.finish(event, initial)
  }
  function cancel(event: Event) {
    if (event instanceof PointerEvent && event.pointerId !== pointerId) return
    if (!active.value) return
    cleanup()
    options.cancel(initial, event)
  }
  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    cancel(event)
  }
  function start(event: PointerEvent) {
    if (!options.enabled() || active.value || event.button !== 0 || event.isPrimary === false) return
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return
    event.preventDefault()
    options.field.value?.focus()
    initial = options.value()
    consumedX = event.clientX
    pointerId = event.pointerId
    target = event.currentTarget as HTMLElement
    view = target.ownerDocument.defaultView ?? undefined
    active.value = true
    if (view) {
      const style = view.document.documentElement.style
      previousStyles = ['cursor', 'user-select'].map(name => [name, style.getPropertyValue(name), style.getPropertyPriority(name)] as const)
      style.setProperty('cursor', 'ew-resize', 'important')
      style.setProperty('user-select', 'none', 'important')
    }
    target.setPointerCapture?.(event.pointerId)
    target.addEventListener('lostpointercapture', cancel)
    view?.addEventListener('pointermove', move, { passive: false })
    view?.addEventListener('pointerup', finish)
    view?.addEventListener('pointercancel', cancel)
    view?.addEventListener('blur', cancel)
    view?.addEventListener('keydown', keydown, true)
  }
  watch(options.enabled, enabled => { if (!enabled) cancel(new Event('cancel')) })
  onBeforeUnmount(cleanup)
  return { active, start }
}
