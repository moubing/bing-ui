<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import { createScrollLock } from '../../utils/scrollLock'
import { useOverlay } from '../../utils/overlay'
import { computed, nextTick, onBeforeUnmount, ref, watch, useId } from 'vue'
import { Eye, EyeOff, X } from '../../icons'
import { gsap } from 'gsap'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import BingTooltip from '../BingTooltip/BingTooltip.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import { normalizeGlassCssLength } from '../../utils/glass'
import type {
  BingDialogCloseReason,
  BingDialogEmits,
  BingDialogOverlayOrb,
  BingDialogProps,
} from './BingDialog.types'
import { useReducedMotion } from '../../motion/reducedMotion'
import { clearDialogMotion, useDialogMotion } from './useDialogMotion'
import { useDialogViewport } from './useDialogViewport'
import { useDialogSwipe } from './useDialogSwipe'
import { useDialogClose } from './useDialogClose'

const prefersReducedMotion = useReducedMotion({ onChange: handleReducedMotionChange })

const props = withDefaults(defineProps<BingDialogProps>(), {
  modelValue: false,
  title: undefined,
  width: '520px',
  maxWidth: undefined,
  height: undefined,
  maxHeight: undefined,
  lockScroll: true,
  smoothScroll: true,
  closeOnOverlay: true,
  closeOnEsc: true,
  closeOnConfirm: false,
  showClose: true,
  showFooter: true,
  cancelText: '关闭',
  confirmText: '确定',
  confirmLoading: false,
  confirmDisabled: false,
  busy: undefined,
  transitionOrigin: 'auto',
  initialFocus: 'auto',
  rejectFeedback: true,
  beforeClose: undefined,
  glass: true,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
  overlayBlur: true,
  overlayOrbs: () => [],
  overlayOrbsAnimated: false,
  showPeek: true,
  peekOpacity: 0,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
})

const emit = defineEmits<BingDialogEmits>()
const resolvedZIndex = useConfigZIndex('dialog', () => props.zIndex)
const clientReady = useClientReady()

const dialogId = `bing-dialog-${useId()}`
let renderGeneration = 0
let disposed = false
let closeReason: BingDialogCloseReason = 'cancel'
let stackTween: gsap.core.Tween | undefined
let peekTimeline: gsap.core.Timeline | undefined
let isListeningForPeekRelease = false
let overlayOrbContext: gsap.Context | undefined

const shouldRender = ref(props.modelValue)
const isActive = ref(false)
const isPeeking = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const peekAnchorRef = ref<HTMLElement | null>(null)
const bodyScrollRef = ref<BingScrollbarExpose | null>(null)
const { narrow, viewportStyle, scrolled, moreBelow, updateScroll } = useDialogViewport(rootRef)
const isBusy = computed(() => props.busy ?? props.confirmLoading)
const getPanel = () => rootRef.value?.querySelector<HTMLElement>('.bing-dialog') ?? null
const getLayers = () => Array.from(rootRef.value?.querySelectorAll<HTMLElement>('.bing-dialog__overlay, .bing-dialog__overlay-blur, .bing-dialog__ambience') ?? [])
const motionController = useDialogMotion({ panel: getPanel, layers: getLayers, reduced: prefersReducedMotion, narrow: () => Boolean(narrow.value) })

const normalizedWidth = computed(() => {
  if (typeof props.width === 'number') {
    return `${props.width}px`
  }

  return props.width
})

const overlay = useOverlay({
  open: () => clientReady.value && shouldRender.value,
  elements: () => [rootRef.value?.querySelector<HTMLElement>('.bing-dialog')],
  zIndex: () => resolvedZIndex.value,
  modal: true,
  kind: 'dialog',
  initialFocus: resolveInitialFocus,
  closeOnEscape: () => props.modelValue,
  onEscape: () => closeDialog('escape'),
})

function resolveInitialFocus() {
  if (props.initialFocus === false) return undefined
  const panel = getPanel()
  if (!panel) return undefined
  if (props.initialFocus instanceof HTMLElement) return panel.contains(props.initialFocus) ? props.initialFocus : panel
  if (props.initialFocus !== 'auto') {
    try { return panel.querySelector<HTMLElement>(props.initialFocus) ?? panel } catch { return panel }
  }
  const body = panel.querySelector('.bing-dialog__body')
  const candidates = [...(body?.querySelectorAll<HTMLElement>('[autofocus],[data-autofocus]') ?? []),
    ...(body?.querySelectorAll<HTMLElement>('input,select,textarea,[contenteditable="true"],[role="combobox"],[role="textbox"],[role="checkbox"],[role="switch"]') ?? [])]
  return candidates.find(element => {
    if (element.matches(':disabled,[type="hidden"]') || element.closest('[inert],[hidden]')) return false
    for (let node: HTMLElement | null = element; node && node !== panel; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
    }
    return true
  }) ?? panel
}

const rootStyle = computed(() => ({
  ...viewportStyle.value,
  '--bing-dialog-overlay-glass-blur': props.glassBlur === undefined ? 'var(--bing-glass-blur, 16px)' : normalizeGlassCssLength(props.glassBlur),
  '--bing-dialog-overlay-glass-saturation': props.glassSaturation === undefined ? 'var(--bing-glass-saturation, 1.05)' : String(Math.max(0, props.glassSaturation)),
  zIndex: overlay.zIndex.value,
}))

const dialogStyle = computed(() => ({
  width: normalizedWidth.value,
  height: toCssLength(props.height),
  maxWidth: props.maxWidth === undefined ? undefined : `min(100%, ${toCssLength(props.maxWidth)})`,
  maxHeight: props.height === undefined && props.maxHeight === undefined ? undefined
    : `min(${toCssLength(props.maxHeight) ?? '100dvh'}, calc(var(--bing-dialog-viewport-height, 100dvh) - 2 * var(--bing-dialog-gutter)))`,
}))

function toCssLength(value: number | string | undefined) {
  return typeof value === 'number' ? `${Math.max(0, value)}px` : value
}

const dialogClasses = computed(() => ['bing-dialog'])

const rootClasses = computed(() => [
  'bing-dialog-root',
  {
    'is-active': isActive.value,
    'is-peeking': isPeeking.value,
    'is-scrolled': scrolled.value,
    'has-more-below': moreBelow.value,
    'is-nested': overlay.hasDialogBelow.value,
    'is-covered': overlay.hasDialogAbove.value,
    'is-dragging': swipe.dragging.value,
    'has-overlay-blur': props.overlayBlur && !overlay.hasDialogBelow.value,
    'has-animated-orbs': props.overlayBlur && props.overlayOrbsAnimated && !overlay.hasDialogBelow.value,
  },
])

const labelledBy = computed(() => (props.title ? `${dialogId}-title` : undefined))
const fallbackAriaLabel = computed(() => props.ariaLabel ?? (props.title ? undefined : '对话框'))
const normalizedPeekOpacity = computed(() => Math.min(1, Math.max(0, props.peekOpacity)))
const visibleOverlayOrbs = computed(() => (props.overlayBlur && !overlay.hasDialogBelow.value ? props.overlayOrbs : []))

function normalizeCssSize(value: number | string | undefined, fallback: number) {
  return typeof value === 'number' ? `${value}px` : (value ?? `${fallback}px`)
}

function getOverlayOrbStyle(orb: BingDialogOverlayOrb) {
  return {
    left: `${orb.x ?? 50}%`,
    top: `${orb.y ?? 50}%`,
    width: normalizeCssSize(orb.size, 360),
    height: normalizeCssSize(orb.size, 360),
    '--bing-dialog-orb-color': orb.color,
    '--bing-dialog-orb-opacity': Math.min(1, Math.max(0, orb.opacity ?? 0.18)),
    '--bing-dialog-orb-blur': `${Math.max(0, orb.blur ?? 64)}px`,
  }
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

const { lock: lockBodyScroll, unlock: unlockBodyScroll } = createScrollLock()

function syncBodyScrollLock() {
  if (props.modelValue && props.lockScroll) {
    lockBodyScroll()
    return
  }

  if (!props.lockScroll) {
    unlockBodyScroll()
  }
}

function acceptClose(reason: BingDialogCloseReason) {
  closeReason = reason
  bodyScrollRef.value?.stop()
  emit('update:modelValue', false)
  emit('close', reason)
  // 父级未接受此次关闭时，之后直接更新模型仍按取消方向退出。
  void nextTick(() => { if (props.modelValue && closeReason === reason) closeReason = 'cancel' })
}

function preventClose(reason: BingDialogCloseReason) {
  if (reason === 'swipe') swipe.reset()
  if (props.rejectFeedback) motionController.reject()
  emit('close-prevented', reason)
}

const closeGuard = useDialogClose({
  open: () => props.modelValue,
  allowed: reason => !isBusy.value && !((reason === 'overlay' || reason === 'swipe') && !props.closeOnOverlay)
    && !(reason === 'escape' && !props.closeOnEsc),
  beforeClose: () => props.beforeClose,
  accept: acceptClose, reject: preventClose, waiting: () => swipe.reset(),
})
const isClosingBlocked = computed(() => isBusy.value || closeGuard.pending.value)
const closeDialog = (reason: BingDialogCloseReason = 'close') => closeGuard.close(reason)
const swipe = useDialogSwipe({
  panel: getPanel,
  enabled: () => Boolean(narrow.value) && props.modelValue && isActive.value && !isPeeking.value && !overlay.hasDialogAbove.value,
  allowed: () => props.closeOnOverlay && !isClosingBlocked.value,
  reduced: prefersReducedMotion,
  interrupt: () => { motionController.kill(); killPeekTimeline() },
  close: () => closeDialog('swipe'),
})

function handleBlockedButton(event: PointerEvent) {
  if (!isClosingBlocked.value) return
  const button = (event.target as Element).closest('.bing-dialog__close, .bing-dialog__cancel, [data-close-blocked]')
  if (!button) return
  event.preventDefault()
  preventClose(button.classList.contains('bing-dialog__close') || button.getAttribute('data-close-reason') === 'close' ? 'close' : 'cancel')
}

function handleCloseClick() {
  closeDialog('close')
}

function handleCancel() {
  if (isClosingBlocked.value) { preventClose('cancel'); return }
  emit('cancel')
  closeDialog('cancel')
}

function handleConfirm() {
  if (isClosingBlocked.value) { preventClose('confirm'); return }
  emit('confirm')

  if (props.closeOnConfirm) {
    closeDialog('confirm')
  }
}

function handleOverlayClick() {
  closeDialog('overlay')
}

const scrollableOverflow = /^(auto|scroll|overlay)$/

function canScrollElement(element: HTMLElement, axis: 'horizontal' | 'vertical', delta: number) {
  if (!delta) {
    return false
  }

  const isVertical = axis === 'vertical'
  const clientSize = isVertical ? element.clientHeight : element.clientWidth
  const scrollSize = isVertical ? element.scrollHeight : element.scrollWidth
  const maximum = Math.max(0, scrollSize - clientSize)

  if (maximum <= 0.5) {
    return false
  }

  const styles = window.getComputedStyle(element)
  const overflow = isVertical ? styles.overflowY : styles.overflowX

  if (!scrollableOverflow.test(overflow)) {
    return false
  }

  const position = isVertical ? element.scrollTop : element.scrollLeft
  if (delta < 0) {
    return position > 0.5
  }

  return position < maximum - 0.5
}

function nestedScrollableCanConsume(event: WheelEvent) {
  if (!(event.target instanceof Element)) {
    return false
  }

  const dialog = event.target.closest('.bing-dialog')
  if (!dialog || !rootRef.value?.contains(dialog)) {
    return false
  }

  const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0)
  const verticalDelta = event.shiftKey && !event.deltaX ? 0 : event.deltaY
  let element: HTMLElement | null =
    event.target instanceof HTMLElement ? event.target : event.target.parentElement

  while (element && element !== dialog) {
    if (
      canScrollElement(element, 'horizontal', horizontalDelta) ||
      canScrollElement(element, 'vertical', verticalDelta)
    ) {
      return true
    }

    element = element.parentElement
  }

  return false
}

function handleRootWheel(event: WheelEvent) {
  if (event.defaultPrevented || nestedScrollableCanConsume(event)) {
    return
  }

  event.preventDefault()
}

function killOverlayOrbMotion() {
  overlayOrbContext?.revert()
  overlayOrbContext = undefined
}

function getOrbMotionPoints(orb: BingDialogOverlayOrb) {
  const motionX = orb.motionX ?? 48
  const motionY = orb.motionY ?? 34
  const spreadX = Math.abs(motionX)
  const spreadY = Math.abs(motionY)
  const directionX = motionX < 0 ? -1 : 1
  const directionY = motionY < 0 ? -1 : 1

  return [
    { x: -spreadX * 0.42 * directionX, y: -spreadY * 0.28 * directionY },
    { x: spreadX * 0.34 * directionX, y: -spreadY * 0.7 * directionY },
    { x: spreadX * 0.72 * directionX, y: spreadY * 0.18 * directionY },
    { x: -spreadX * 0.16 * directionX, y: spreadY * 0.78 * directionY },
    { x: -spreadX * 0.62 * directionX, y: spreadY * 0.08 * directionY },
  ]
}

function setupOverlayOrbMotion() {
  killOverlayOrbMotion()

  if (
    !props.modelValue ||
    !props.overlayBlur ||
    !props.overlayOrbsAnimated ||
    overlay.hasDialogBelow.value ||
    overlay.hasDialogAbove.value ||
    prefersReducedMotion() ||
    !rootRef.value
  ) {
    return
  }

  const orbElements = Array.from(
    rootRef.value.querySelectorAll<HTMLElement>('.bing-dialog__orb'),
  )

  if (orbElements.length === 0) {
    return
  }

  overlayOrbContext = gsap.context(() => {
    orbElements.forEach((element, index) => {
      const orb = visibleOverlayOrbs.value[index]

      if (!orb) {
        return
      }

      const points = getOrbMotionPoints(orb)
      const duration = Math.max(4, orb.duration ?? 12)
      const segmentDuration = duration / points.length
      const timeline = gsap.timeline({
        delay: Math.max(0, orb.delay ?? index * 0.28),
        repeat: -1,
      })

      gsap.set(element, {
        x: points[0].x,
        y: points[0].y,
        force3D: true,
      })

      points.slice(1).forEach((point) => {
        timeline.to(element, {
          x: point.x,
          y: point.y,
          duration: segmentDuration,
          ease: 'sine.inOut',
          force3D: true,
        })
      })

      timeline.to(element, {
        x: points[0].x,
        y: points[0].y,
        duration: segmentDuration,
        ease: 'sine.inOut',
        force3D: true,
      })
    })
  }, rootRef.value)
}

async function syncOverlayOrbMotion() {
  await nextTick()
  setupOverlayOrbMotion()
}

function killPeekTimeline() {
  peekTimeline?.kill()
  peekTimeline = undefined
}

function getPeekElements() {
  if (!rootRef.value) {
    return null
  }

  return {
    overlay: rootRef.value.querySelector<HTMLElement>('.bing-dialog__overlay'),
    overlayBlur: rootRef.value.querySelector<HTMLElement>('.bing-dialog__overlay-blur'),
    ambience: rootRef.value.querySelector<HTMLElement>('.bing-dialog__ambience'),
    dialog: rootRef.value.querySelector<HTMLElement>('.bing-dialog'),
    peek: rootRef.value.querySelector<HTMLElement>('.bing-dialog__peek'),
    peekAnchor: peekAnchorRef.value,
  }
}

function getDefinedElements(elements: Array<HTMLElement | null>) {
  return elements.filter((element): element is HTMLElement => element !== null)
}

function animatePeekState(peeking: boolean) {
  const elements = getPeekElements()

  if (!elements) {
    return
  }

  const backgroundLayers = getDefinedElements([
    elements.overlay,
    elements.overlayBlur,
    elements.ambience,
  ])
  const duration = prefersReducedMotion() ? 0 : peeking ? 0.32 : 0.42
  const ease = peeking ? 'power3.inOut' : 'power4.out'

  if (!elements.dialog || !elements.peekAnchor) {
    return
  }

  killPeekTimeline()
  motionController.kill()
  motionController.clearRejection()
  swipe.kill()

  let collapsedScale = 0.08

  if (peeking) {
    const dialogRect = elements.dialog.getBoundingClientRect()
    const peekRect = elements.peek?.getBoundingClientRect()

    if (!peekRect) {
      return
    }

    const peekCenterX = peekRect.left + peekRect.width / 2
    const peekCenterY = peekRect.top + peekRect.height / 2
    const transformOriginX = (peekCenterX - dialogRect.left) * elements.dialog.offsetWidth / (dialogRect.width || 1)
    const transformOriginY = (peekCenterY - dialogRect.top) * elements.dialog.offsetHeight / (dialogRect.height || 1)
    const style = getComputedStyle(elements.dialog)
    const [oldX = 0, oldY = 0] = style.transformOrigin.split(' ').map(value => Number.parseFloat(value) || 0)
    const scale = Number.parseFloat(style.getPropertyValue('--dialog-motion-scale')) || 1
    const x = Number.parseFloat(style.getPropertyValue('--dialog-motion-x')) || 0
    const y = Number.parseFloat(style.getPropertyValue('--dialog-motion-y')) || 0

    collapsedScale = Math.min(
      0.12,
      Math.max(0.055, peekRect.width / Math.max(dialogRect.width, dialogRect.height)),
    )

    gsap.set(elements.dialog, {
      '--dialog-origin': `${transformOriginX}px ${transformOriginY}px`,
      '--dialog-motion-x': `${x + (1 - scale) * (oldX - transformOriginX)}px`,
      '--dialog-motion-y': `${y + (1 - scale) * (oldY - transformOriginY)}px`,
    })
    gsap.set(elements.peekAnchor, {
      x: peekCenterX,
      y: peekCenterY,
      xPercent: -50,
      yPercent: -50,
    })
  }

  peekTimeline = gsap.timeline({
    defaults: {
      duration,
      ease,
      overwrite: 'auto',
    },
    onComplete: () => {
      peekTimeline = undefined

      if (!peeking) {
        const clearTargets = getDefinedElements([
          ...backgroundLayers,
          elements.dialog,
          elements.peekAnchor,
        ])

        gsap.set(clearTargets, {
          clearProps: 'opacity,visibility,transform,transformOrigin,transition',
        })
        clearDialogMotion(elements.dialog!)
        isActive.value = true
      }
    },
  })

  if (peeking) {
    gsap.set(elements.peekAnchor, {
      autoAlpha: 0,
      scale: 1,
    })

    peekTimeline
      .to(backgroundLayers, { opacity: 0 }, 0)
      .to(
        elements.dialog,
        {
          '--dialog-motion-scale': collapsedScale,
          '--dialog-motion-x': '0px',
          '--dialog-motion-y': '0px',
          opacity: normalizedPeekOpacity.value,
        },
        0,
      )
      .to(
        elements.peekAnchor,
        {
          autoAlpha: 1,
          duration: duration * 0.58,
          ease: 'power3.out',
        },
        duration * 0.18,
      )

    return
  }

  peekTimeline
    .to(elements.dialog, { '--dialog-motion-scale': 1, '--dialog-motion-x': '0px', '--dialog-motion-y': '0px', opacity: 1 }, 0)
    .to(
      elements.peekAnchor,
      {
        autoAlpha: 0,
        duration: Math.min(duration * 0.48, 0.18),
        ease: 'power2.in',
      },
      0,
    )
    .to(backgroundLayers, { opacity: 1 }, duration ? 0.04 : 0)
}

function removePeekReleaseListeners() {
  if (!isBrowser() || !isListeningForPeekRelease) {
    return
  }

  window.removeEventListener('pointerup', handleGlobalPeekEnd)
  window.removeEventListener('pointercancel', handleGlobalPeekEnd)
  window.removeEventListener('blur', handleGlobalPeekEnd)
  isListeningForPeekRelease = false
}

function addPeekReleaseListeners() {
  if (!isBrowser() || isListeningForPeekRelease) {
    return
  }

  window.addEventListener('pointerup', handleGlobalPeekEnd)
  window.addEventListener('pointercancel', handleGlobalPeekEnd)
  window.addEventListener('blur', handleGlobalPeekEnd)
  isListeningForPeekRelease = true
}

function interruptPeek() {
  isPeeking.value = false
  removePeekReleaseListeners()
  killPeekTimeline()
  peekAnchorRef.value?.removeAttribute('style')
}

async function syncRenderedState(value: boolean) {
  if (!isBrowser()) {
    shouldRender.value = value
    isActive.value = value
    return
  }

  const generation = ++renderGeneration
  const fresh = !getPanel()
  motionController.kill()
  swipe.cancel()
  swipe.kill()
  interruptPeek()

  if (value) {
    if (fresh) motionController.captureOrigin(props.transitionOrigin)
    shouldRender.value = true
    isActive.value = false
    await nextTick()
    if (disposed || generation !== renderGeneration || !props.modelValue) return
    motionController.play(true, fresh, 'cancel', () => { isActive.value = true; updateScroll() })
    setupOverlayOrbMotion()
    return
  }

  bodyScrollRef.value?.stop()
  isActive.value = false
  killOverlayOrbMotion()
  const reason = closeReason
  closeReason = 'cancel'
  motionController.play(false, false, reason, () => {
    shouldRender.value = false
    unlockBodyScroll()
  })
}

function handleReducedMotionChange() {
  syncStackDepth(overlay.hasDialogAbove.value)
  if (clientReady.value) void syncRenderedState(props.modelValue)
  void syncOverlayOrbMotion()
}

function handlePeekStart(event: PointerEvent | KeyboardEvent) {
  event.preventDefault()

  if (!props.modelValue || overlay.hasDialogAbove.value || isPeeking.value || ('repeat' in event && event.repeat)) {
    return
  }

  isPeeking.value = true

  if ('pointerId' in event) {
    const target = event.currentTarget as HTMLElement | null
    addPeekReleaseListeners()

    try {
      target?.setPointerCapture?.(event.pointerId)
    } catch {
      // Synthetic pointer events may not be capturable; the hold interaction still works.
    }
  }

  animatePeekState(true)
}

function handlePeekEnd() {
  removePeekReleaseListeners()

  if (!isPeeking.value) {
    return
  }

  isPeeking.value = false
  animatePeekState(false)
}

function handleGlobalPeekEnd() {
  handlePeekEnd()
}

function isPeekKey(event: KeyboardEvent) {
  return event.key === ' ' || event.key === 'Enter'
}

function handlePeekKeydown(event: KeyboardEvent) {
  if (!isPeekKey(event)) {
    return
  }

  handlePeekStart(event)
}

function handlePeekKeyup(event: KeyboardEvent) {
  if (!isPeekKey(event)) {
    return
  }

  event.preventDefault()
  handlePeekEnd()
}

watch(() => [clientReady.value, props.modelValue, props.lockScroll], () => {
  if (clientReady.value) syncBodyScrollLock()
}, { immediate: true })
watch([clientReady, () => props.modelValue], ([ready, open]) => {
  if (ready) void syncRenderedState(open)
}, { immediate: true })
watch(
  () => [props.overlayBlur, props.overlayOrbsAnimated, props.overlayOrbs, overlay.hasDialogBelow.value, overlay.hasDialogAbove.value],
  syncOverlayOrbMotion,
  { deep: true, flush: 'post' },
)

function syncStackDepth(covered: boolean) {
  stackTween?.kill()
  const panel = getPanel()
  if (!panel) return
  if (isPeeking.value) handlePeekEnd()
  const reduce = prefersReducedMotion()
  stackTween = gsap.to(panel, { '--dialog-depth-scale': covered && !reduce ? 0.97 : 1,
    '--dialog-depth-y': covered && !reduce ? '-8px' : '0px', duration: reduce ? 0 : 0.26,
    ease: 'power3.out', onComplete: () => {
      stackTween = undefined
      if (!covered) { panel.style.removeProperty('--dialog-depth-scale'); panel.style.removeProperty('--dialog-depth-y') }
    } })
}
watch(() => [rootRef.value, overlay.hasDialogAbove.value] as const, ([root, covered], previous) => {
  if (!root) { stackTween?.kill(); return }
  if (covered || previous?.[1]) syncStackDepth(covered)
}, { flush: 'post' })

onBeforeUnmount(() => {
  disposed = true
  renderGeneration++
  stackTween?.kill()
  killOverlayOrbMotion()
  removePeekReleaseListeners()
  killPeekTimeline()
  bodyScrollRef.value?.stop()
  unlockBodyScroll()
})
</script>

<template>
  <Teleport v-if="clientReady" to="body">
    <div
      v-if="shouldRender"
      ref="rootRef"
      :class="rootClasses"
      :style="rootStyle"
      @wheel="handleRootWheel"
      @pointerdown.capture="handleBlockedButton"
    >
      <div class="bing-dialog__overlay-blur" aria-hidden="true"></div>
      <div
        v-if="visibleOverlayOrbs.length > 0"
        class="bing-dialog__ambience"
        aria-hidden="true"
      >
        <span
          v-for="(orb, index) in visibleOverlayOrbs"
          :key="orb.id ?? index"
          class="bing-dialog__orb-anchor"
          :style="getOverlayOrbStyle(orb)"
        >
          <span class="bing-dialog__orb"></span>
        </span>
      </div>
      <div class="bing-dialog__overlay" aria-hidden="true" @click="handleOverlayClick"></div>
      <section
        :class="dialogClasses"
        :style="dialogStyle"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        :aria-busy="isClosingBlocked || undefined"
        :inert="overlay.hasDialogAbove.value"
        :aria-label="fallbackAriaLabel"
        :aria-labelledby="labelledBy"
        :aria-describedby="ariaDescribedby"
      >
        <div class="bing-dialog__surface" aria-hidden="true"></div>
        <div class="bing-dialog__outline" aria-hidden="true"></div>
        <header class="bing-dialog__header"
          @pointerdown="swipe.down" @pointermove="swipe.move" @pointerup="swipe.end"
          @pointercancel="swipe.end" @lostpointercapture="swipe.end">
          <span class="bing-dialog__handle" aria-hidden="true"></span>
          <div class="bing-dialog__heading">
            <slot name="title">
              <h2 v-if="title" :id="labelledBy" class="bing-dialog__title">{{ title }}</h2>
            </slot>
          </div>
          <div class="bing-dialog__actions">
            <BingTooltip v-if="showPeek" content="按住查看背景" :open-delay="400"
              :disabled="isPeeking || !isActive || overlay.hasDialogAbove.value">
              <BingButton
                class="bing-dialog__icon-button bing-dialog__peek"
                variant="ghost" size="sm" rounded="md" :throttle="false"
                aria-label="按住查看背景"
                :aria-pressed="isPeeking || undefined"
                @pointerdown="handlePeekStart"
                @pointerup="handlePeekEnd"
                @pointercancel="handlePeekEnd"
                @lostpointercapture="handlePeekEnd"
                @blur="handlePeekEnd"
                @keydown="handlePeekKeydown"
                @keyup="handlePeekKeyup"
              >
                <template #prefix><BingIcon :icon="isPeeking ? EyeOff : Eye" size="sm" :stroke-width="1.75" /></template>
              </BingButton>
            </BingTooltip>
            <span v-if="showClose" class="bing-dialog__disabled-action" data-close-reason="close" :data-close-blocked="isClosingBlocked || undefined">
              <BingButton
                class="bing-dialog__close"
                :throttle="false"
                variant="ghost"
                size="sm"
                rounded="md"
                aria-label="关闭弹窗"
                :disabled="isClosingBlocked"
                @click="handleCloseClick"
              >
                <template #prefix>
                  <BingIcon :icon="X" size="sm" :stroke-width="1.75" />
                </template>
              </BingButton>
            </span>
          </div>
          <div v-if="$slots['header-addon']" class="bing-dialog__header-addon">
            <slot name="header-addon" />
          </div>
        </header>

        <BingScrollbar
          ref="bodyScrollRef"
          class="bing-dialog__body-scroll"
          :smooth="smoothScroll"
          :focusable="true"
          @scroll="updateScroll"
        >
          <div class="bing-dialog__body">
            <slot />
          </div>
        </BingScrollbar>

        <footer v-if="$slots.footer || showFooter" class="bing-dialog__footer">
          <slot name="footer" :close="closeDialog" :cancel="handleCancel" :confirm="handleConfirm" :busy="isClosingBlocked">
            <span class="bing-dialog__disabled-action" data-close-reason="cancel" :data-close-blocked="isClosingBlocked || undefined">
              <BingButton class="bing-dialog__cancel" variant="secondary" :throttle="false" :disabled="isClosingBlocked" @click="handleCancel">
                {{ cancelText }}
              </BingButton>
            </span>
            <BingButton
              variant="primary"
              :throttle="true"
              :loading="confirmLoading"
              :disabled="confirmDisabled || (isClosingBlocked && !confirmLoading)"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </BingButton>
          </slot>
        </footer>
      </section>
      <div
        v-if="showPeek"
        ref="peekAnchorRef"
        class="bing-dialog__peek-anchor"
        aria-hidden="true"
      >
        <BingIcon :icon="EyeOff" size="sm" :stroke-width="1.75" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.bing-dialog-root {
  --bing-dialog-gutter: 24px;
  box-sizing: border-box;
  position: fixed;
  inset: var(--bing-dialog-viewport-offset, 0px) 0 var(--bing-dialog-keyboard-inset, 0px);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  place-items: center;
  padding: var(--bing-dialog-gutter);
  pointer-events: auto;
}

.bing-dialog__overlay-blur,
.bing-dialog__ambience,
.bing-dialog__overlay {
  position: absolute;
  inset: 0;
}

.bing-dialog__overlay-blur {
  z-index: 0;
  opacity: 1;
  transform: translateZ(0);
}

.bing-dialog-root.has-overlay-blur .bing-dialog__overlay-blur {
  backdrop-filter: blur(var(--bing-dialog-overlay-glass-blur, 16px))
    saturate(var(--bing-dialog-overlay-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-dialog-overlay-glass-blur, 16px))
    saturate(var(--bing-dialog-overlay-glass-saturation, 1.05));
}

.bing-dialog__ambience {
  z-index: 1;
  overflow: hidden;
  opacity: 1;
  pointer-events: none;
}

.bing-dialog__orb-anchor {
  position: absolute;
  display: block;
  transform: translate(-50%, -50%);
}

.bing-dialog__orb {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--bing-dialog-orb-color, rgba(244, 114, 182, 0.18));
  opacity: var(--bing-dialog-orb-opacity, 0.18);
  filter: blur(var(--bing-dialog-orb-blur, 64px));
  transform: translateZ(0);
}

.bing-dialog-root.has-animated-orbs .bing-dialog__orb {
  will-change: transform;
}

.bing-dialog__overlay {
  z-index: 2;
  background: var(--bing-overlay);
  opacity: 1;
}

.bing-dialog-root.is-nested .bing-dialog__overlay {
  background: color-mix(in srgb, var(--bing-overlay) 50%, transparent);
}

.bing-dialog {
  --bing-dialog-focus-gutter: 6px;
  /* GSAP 读取自定义属性的实际初值，不能仅依赖 var() 的回退值。 */
  --dialog-motion-x: 0px;
  --dialog-motion-y: 0px;
  --dialog-motion-scale: 1;
  --dialog-origin: 50% 50%;
  --dialog-reject-scale: 1;
  --dialog-depth-scale: 1;
  --dialog-depth-y: 0px;

  box-sizing: border-box;
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-width: min(100%, 720px);
  max-height: min(82vh, 760px);
  overflow: hidden;
  border: 1px solid var(--bing-popover-border);
  border-radius: var(--bing-dialog-radius, var(--bing-radius-lg, 12px));
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  box-shadow: var(--bing-popover-shadow);
  opacity: 1;
  /* 三组变换各管进出场、拒绝反馈和嵌套退后，避免互相覆盖。 */
  transform: translate3d(var(--dialog-motion-x, 0px), calc(var(--dialog-motion-y, 0px) + var(--dialog-depth-y, 0px)), 0)
    scale(calc(var(--dialog-motion-scale, 1) * var(--dialog-reject-scale, 1) * var(--dialog-depth-scale, 1)));
  transform-origin: var(--dialog-origin, 50% 50%);
  will-change: opacity, transform;
}

.bing-dialog:focus {
  outline: none;
}

.bing-dialog::after {
  position: absolute;
  z-index: 5;
  inset: 0;
  content: '';
  pointer-events: none;
  border-radius: inherit;
  background: black;
  opacity: 0;
  transition: opacity 160ms ease-out;
}

.bing-dialog-root.is-covered .bing-dialog::after {
  opacity: 0.06;
}

.bing-dialog__surface,
.bing-dialog__outline {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.bing-dialog__surface {
  z-index: 0;
  background: var(--bing-surface-solid);
}

.bing-dialog__outline {
  z-index: 2;
  border: 1px solid var(--bing-border-strong);
  opacity: 0;
}

.bing-dialog__header {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-width: 0;
  gap: 8px 16px;
  /* 把部分标题下间距放进滚动区，容纳首项控件向外绘制的焦点轮廓。 */
  padding: 16px 16px calc(12px - var(--bing-dialog-focus-gutter));
}

.bing-dialog__header-addon {
  grid-column: 1 / -1;
  min-width: 0;
}

.bing-dialog__heading {
  min-width: 0;
}

.bing-dialog__title {
  margin: 0;
  color: var(--bing-heading);
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  overflow-wrap: anywhere;
}

.bing-dialog__actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.bing-dialog__peek,
.bing-dialog__close {
  flex: 0 0 auto;
  color: var(--bing-muted);
}

.bing-dialog__disabled-action { display: inline-flex; }
.bing-dialog__disabled-action[data-close-blocked] { cursor: not-allowed; }
/* Firefox 不会冒泡原生 disabled 按钮的指针事件，由等尺寸容器接收拒绝反馈。 */
.bing-dialog__disabled-action[data-close-blocked] > :deep(button) { pointer-events: none; }

.bing-dialog__peek:hover:not(:disabled),
.bing-dialog__close:hover:not(:disabled) {
  color: var(--bing-heading);
}

.bing-dialog__peek:hover:not(:disabled) {
  background: var(--bing-surface-hover);
}

.bing-dialog__peek[aria-pressed='true'] {
  color: var(--bing-heading);
  background: transparent;
}

.bing-dialog__peek-anchor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  border: 1px solid var(--bing-popover-border);
  border-radius: 6px;
  background: var(--bing-popover-bg);
  color: var(--bing-heading);
  box-shadow: var(--bing-shadow-md);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: transform, opacity;
}

.bing-dialog__body-scroll {
  position: relative;
  z-index: 1;
  min-height: 0;
  /* 外层只裁剪，内容滚动由 BingScrollbar 的 viewport 承担。 */
  overflow: clip;
}

.bing-dialog__body {
  padding: var(--bing-dialog-focus-gutter) 16px 16px;
  color: var(--bing-text);
  line-height: 1.65;
}

.bing-dialog__body-scroll > :deep(.bing-scrollbar__viewport) {
  scroll-padding-block: var(--bing-dialog-focus-gutter);
}

.bing-dialog__body :deep(p) {
  margin: 0;
}

.bing-dialog__footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  /* 保留原边框占位，分隔线淡入不挪动内容或底部按钮。 */
  border-top: 1px solid transparent;
  background: transparent;
}

.bing-dialog__header::after,
.bing-dialog__footer::before {
  position: absolute;
  inset-inline: 0;
  height: 1px;
  background: var(--bing-popover-border);
  content: '';
  pointer-events: none;
  opacity: 0;
  transition: opacity 160ms ease-out;
}

.bing-dialog__header::after {
  bottom: 0;
  box-shadow: 0 2px 4px rgb(0 0 0 / 0.035);
}

.bing-dialog__footer::before { top: -1px; }
.bing-dialog-root.is-scrolled .bing-dialog__header::after,
.bing-dialog-root.has-more-below .bing-dialog__footer::before { opacity: 1; }
.bing-dialog__handle { display: none; }
.bing-dialog-root.is-dragging { user-select: none; }

@media (max-width: 560px) {
  .bing-dialog__header { touch-action: none; }
  .bing-dialog__actions, .bing-dialog__header-addon { touch-action: auto; }
  .bing-dialog__handle {
    position: absolute;
    display: block;
    top: 5px;
    left: calc(50% - 18px);
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--bing-border-strong);
  }
}

@media (max-width: 560px) {
  .bing-dialog-root {
    --bing-dialog-gutter: 0px;
    align-items: end;
  }

  .bing-dialog {
    width: 100% !important;
    max-width: 100%;
    max-height: min(88dvh, var(--bing-dialog-viewport-height, 100dvh));
    border-radius: var(--bing-dialog-radius, var(--bing-radius-lg, 12px)) var(--bing-dialog-radius, var(--bing-radius-lg, 12px)) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .bing-dialog__header {
    padding: 12px 16px calc(12px - var(--bing-dialog-focus-gutter));
  }

  .bing-dialog__body {
    padding: var(--bing-dialog-focus-gutter) 16px 16px;
  }

  .bing-dialog__footer {
    flex-direction: column-reverse;
    padding: 12px 16px;
  }

  .bing-dialog__footer :deep(.bing-button) {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-dialog,
  .bing-dialog__overlay-blur,
  .bing-dialog__ambience,
  .bing-dialog__overlay {
    transition: none;
  }

  .bing-dialog__orb {
    transform: none !important;
  }

}
</style>
