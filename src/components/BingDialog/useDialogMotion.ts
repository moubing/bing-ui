import { gsap } from 'gsap'
import { onBeforeUnmount } from 'vue'
import { motion } from '../../motion'
import type { BingDialogCloseReason, BingDialogTransitionOrigin } from './BingDialog.types'

export const dialogMotion = {
  open: 0.34, openDelay: 0.03, backdropIn: 0.2, fadeIn: motion.duration.fast,
  close: 0.16, confirm: 0.18, backdropOut: 0.16, closeDelay: 0.04,
  reduced: 0.12, sheetIn: 0.38, sheetOut: 0.2,
  rejectIn: 0.08, rejectOut: 0.18, outlineIn: 0.1, outlineOut: 0.26,
} as const

const motionProperties = ['--dialog-motion-x', '--dialog-motion-y', '--dialog-motion-scale', '--dialog-origin', 'opacity']
export function clearDialogMotion(panel: HTMLElement) {
  for (const property of motionProperties) panel.style.removeProperty(property)
}

export function useDialogMotion(options: {
  panel: () => HTMLElement | null
  layers: () => HTMLElement[]
  reduced: () => boolean
  narrow: () => boolean
}) {
  let timeline: gsap.core.Timeline | undefined
  let rejection: gsap.core.Timeline | undefined
  let trigger: HTMLElement | null = null
  let point: { x: number; y: number } | null = null
  let direction = { x: 0, y: 12, origin: '50% 50%', scale: 0.96 }

  function captureOrigin(origin: BingDialogTransitionOrigin) {
    const panel = options.panel()
    const doc = panel?.ownerDocument ?? document
    const active = doc.activeElement
    trigger = origin instanceof HTMLElement ? origin
      : origin === 'auto' && active instanceof HTMLElement && active !== doc.body && active !== doc.documentElement
        && !panel?.contains(active) ? active : null
    point = null
    if (trigger?.isConnected) {
      const rect = trigger.getBoundingClientRect()
      if (rect.width && rect.height) point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    } else if (typeof origin === 'object' && !(origin instanceof HTMLElement)
      && Number.isFinite(origin.x) && Number.isFinite(origin.y)) point = origin
  }

  function resolveDirection(panel: HTMLElement) {
    direction = { x: 0, y: 12, origin: '50% 50%', scale: 0.96 }
    if (!point) return
    const bounds = panel.getBoundingClientRect()
    const dx = point.x - (bounds.left + bounds.width / 2)
    const dy = point.y - (bounds.top + bounds.height / 2)
    const length = Math.hypot(dx, dy)
    const ratio = length ? Math.min(length, 24) / length : 0
    direction = { x: dx * ratio, y: dy * ratio, scale: 0.94,
      origin: `${Math.max(0, Math.min(bounds.width, point.x - bounds.left))}px ${Math.max(0, Math.min(bounds.height, point.y - bounds.top))}px` }
  }

  function kill() { timeline?.kill(); timeline = undefined }
  function clearRejection() {
    rejection?.kill(); rejection = undefined
    const panel = options.panel()
    panel?.style.removeProperty('--dialog-reject-scale')
    panel?.querySelector<HTMLElement>('.bing-dialog__outline')?.style.removeProperty('opacity')
  }
  function reject() {
    const panel = options.panel()
    const outline = panel?.querySelector<HTMLElement>('.bing-dialog__outline')
    if (!panel || !outline) return
    rejection?.kill()
    rejection = gsap.timeline({ onComplete: clearRejection })
    if (!options.reduced()) {
      rejection.to(panel, { '--dialog-reject-scale': 1.015, duration: dialogMotion.rejectIn, ease: 'power2.out' }, 0)
        .to(panel, { '--dialog-reject-scale': 1, duration: dialogMotion.rejectOut, ease: 'back.out(1.6)' }, dialogMotion.rejectIn)
    }
    rejection.to(outline, { opacity: 0.9, duration: dialogMotion.outlineIn, ease: 'power2.out' }, 0)
      .to(outline, { opacity: 0, duration: dialogMotion.outlineOut, ease: 'power2.out' }, dialogMotion.outlineIn)
  }

  function play(open: boolean, fresh: boolean, reason: BingDialogCloseReason, complete: () => void) {
    kill()
    clearRejection()
    const panel = options.panel()
    if (!panel) { complete(); return }
    const layers = options.layers()
    const reduced = options.reduced()
    const sheet = options.narrow()
    if (fresh) {
      resolveDirection(panel)
      gsap.set(layers, { opacity: 0 })
      gsap.set(panel, { opacity: 0, '--dialog-origin': sheet ? '50% 50%' : direction.origin,
        '--dialog-motion-x': `${reduced || sheet ? 0 : direction.x}px`,
        '--dialog-motion-y': `${reduced ? 0 : sheet ? panel.getBoundingClientRect().height : direction.y}px`,
        '--dialog-motion-scale': reduced || sheet ? 1 : direction.scale })
    }
    if (reduced) {
      for (const property of motionProperties.slice(0, 4)) panel.style.removeProperty(property)
    }
    let exit = { x: direction.x / 2, y: direction.y / 2 }
    if (trigger) {
      const bounds = trigger.getBoundingClientRect()
      if (!trigger.isConnected || !trigger.getClientRects().length || bounds.bottom <= 0 || bounds.right <= 0
        || bounds.top >= innerHeight || bounds.left >= innerWidth) exit = { x: 0, y: 12 }
    }
    timeline = gsap.timeline({ onComplete: () => {
      timeline = undefined
      // 退出后由 Vue 卸载，避免在同一帧清除透明度重新露出面板。
      if (open) { clearDialogMotion(panel); for (const layer of layers) layer.style.removeProperty('opacity') }
      complete()
    } })
    const fadeDuration = reduced ? dialogMotion.reduced : open ? dialogMotion.fadeIn : reason === 'confirm' ? dialogMotion.confirm : dialogMotion.close
    timeline.to(panel, { opacity: open ? 1 : 0, duration: fadeDuration, ease: open ? 'power2.out' : 'power2.in' }, open && !sheet && !reduced ? dialogMotion.openDelay : 0)
    timeline.to(layers, { opacity: open ? 1 : 0,
      duration: reduced ? dialogMotion.reduced : open ? dialogMotion.backdropIn : dialogMotion.backdropOut,
      ease: open ? 'power2.out' : 'power2.in' }, open || reduced ? 0 : dialogMotion.closeDelay)
    if (!reduced) timeline.to(panel, {
      '--dialog-motion-x': `${open || sheet || reason === 'confirm' ? 0 : exit.x}px`,
      '--dialog-motion-y': `${open ? 0 : sheet ? panel.getBoundingClientRect().height : reason === 'confirm' ? -8 : exit.y}px`,
      '--dialog-motion-scale': open || sheet ? 1 : reason === 'confirm' ? 0.98 : 0.96,
      duration: open ? sheet ? dialogMotion.sheetIn : dialogMotion.open : sheet ? dialogMotion.sheetOut : reason === 'confirm' ? dialogMotion.confirm : dialogMotion.close,
      ease: open ? motion.ease.glide : 'power2.in',
    }, open && !sheet ? dialogMotion.openDelay : 0)
  }

  onBeforeUnmount(() => { kill(); clearRejection() })
  return { captureOrigin, play, kill, reject, clearRejection }
}
