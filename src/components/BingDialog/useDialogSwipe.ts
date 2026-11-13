import { gsap } from 'gsap'
import { onBeforeUnmount, ref } from 'vue'
import { motion } from '../../motion'

export function useDialogSwipe(options: {
  panel: () => HTMLElement | null
  enabled: () => boolean
  allowed: () => boolean
  reduced: () => boolean
  interrupt: () => void
  close: () => void
}) {
  const dragging = ref(false)
  let gesture: { id: number; target: HTMLElement; y: number; lastY: number; time: number; velocity: number; height: number; offset: number } | undefined
  let rebound: gsap.core.Tween | undefined
  function kill() { rebound?.kill(); rebound = undefined }
  function reset() {
    kill()
    const panel = options.panel()
    if (!panel) return
    rebound = gsap.to(panel, { '--dialog-motion-y': '0px', duration: options.reduced() ? 0 : 0.26,
      ease: motion.ease.smooth, onComplete: () => { rebound = undefined; panel.style.removeProperty('--dialog-motion-y') } })
  }
  function cancel() {
    const current = gesture
    gesture = undefined
    dragging.value = false
    if (current?.target.hasPointerCapture?.(current.id)) current.target.releasePointerCapture(current.id)
  }
  function down(event: PointerEvent) {
    const panel = options.panel()
    if (!options.enabled() || !panel || event.button !== 0 || event.isPrimary === false
      || (event.target as Element).closest('button,a,input,select,textarea,[contenteditable="true"],[role="button"]')) return
    kill()
    options.interrupt()
    const target = event.currentTarget as HTMLElement
    gesture = { id: event.pointerId, target, y: event.clientY, lastY: event.clientY, time: event.timeStamp,
      velocity: 0, height: panel.getBoundingClientRect().height, offset: 0 }
    try { target.setPointerCapture(event.pointerId) } catch { /* 合成事件可能不支持捕获。 */ }
    dragging.value = true
  }
  function move(event: PointerEvent) {
    if (!gesture || gesture.id !== event.pointerId) return
    event.preventDefault()
    const delta = event.clientY - gesture.y
    const elapsed = event.timeStamp - gesture.time
    if (elapsed > 0) gesture.velocity = (event.clientY - gesture.lastY) / elapsed
    gesture.lastY = event.clientY
    gesture.time = event.timeStamp
    gesture.offset = delta
    const offset = delta < 0 ? -Math.min(12, -delta * 0.15) : options.allowed() ? delta : Math.min(24, delta * 0.12)
    options.panel()?.style.setProperty('--dialog-motion-y', `${offset}px`)
  }
  function end(event: PointerEvent) {
    if (!gesture || gesture.id !== event.pointerId) return
    const current = gesture
    const distance = current.offset
    const velocity = event.timeStamp - current.time > 100 ? 0 : current.velocity
    cancel()
    if (event.type !== 'pointerup' || distance <= 0) { reset(); return }
    if (!options.allowed() && distance > 4) { reset(); options.close(); return }
    if (distance > current.height * 0.3 || velocity > 0.6) options.close()
    else reset()
  }
  onBeforeUnmount(() => { cancel(); kill() })
  return { dragging, down, move, end, cancel, kill, reset }
}
