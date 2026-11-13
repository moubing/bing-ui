<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import BingButton from '../BingButton/BingButton.vue'
import { createScrollLock } from '../../utils/scrollLock'
import { useOverlay } from '../../utils/overlay'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Download, RefreshCcw, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from '../../icons'
import { gsap } from 'gsap'
import BingIcon from '../BingIcon/BingIcon.vue'
import {
  createGlassCssVariables,
  defaultGlassEffect,
} from '../../utils/glass'
import type {
  BingImagePreviewCloseReason,
  BingImagePreviewEmits,
  BingImagePreviewProps,
} from './BingImagePreview.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const PREVIEW_EXIT_DURATION = 180
const DRAG_THRESHOLD = 4
const LOADING_INDICATOR_DELAY = 180
const LOADING_INDICATOR_MIN_VISIBLE = 220

const props = withDefaults(defineProps<BingImagePreviewProps>(), {
  modelValue: false,
  items: () => [],
  initialIndex: 0,
  currentIndex: undefined,
  minScale: 0.5,
  maxScale: 5,
  zoomStep: 0.25,
  downloadable: false,
  loop: true,
  lockScroll: true,
  closeOnEsc: true,
  closeOnOverlay: true,
  showToolbar: true,
  showCounter: true,
  teleportTo: 'body',
  ariaLabel: '图片预览',
  glass: defaultGlassEffect.glass,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
})

const emit = defineEmits<BingImagePreviewEmits>()
const resolvedZIndex = useConfigZIndex('imagePreview', () => props.zIndex)
const clientReady = useClientReady()

const rootRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const shouldRender = ref(props.modelValue)
const isActive = ref(false)
const activeIndex = ref(0)
const pendingIndex = ref<number | undefined>()
const isDragging = ref(false)
const imageStatus = ref<'loading' | 'loaded' | 'error'>('loading')
const showLoadingIndicator = ref(false)
const imageSwitchDirection = ref<-1 | 1>(1)

const transform = reactive({
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
})

let isListeningForKeys = false
let animationFrame = 0
let unmountTimer: number | undefined
let loadingIndicatorDelayTimer: number | undefined
let loadingIndicatorHideTimer: number | undefined
let loadingIndicatorShownAt = 0
let preloadRequestId = 0
let preloadingImage: HTMLImageElement | undefined
let transformTween: gsap.core.Tween | undefined
let imageTransitionTimeline: gsap.core.Timeline | undefined
let activeImageTransitionComplete: (() => void) | undefined
let enteringImageFrame: HTMLElement | undefined
let leavingImageFrame: HTMLElement | undefined
let enterImageDone: (() => void) | undefined
let leaveImageDone: (() => void) | undefined
let imageTransitionQueued = false
let hasPresentedImage = false
let entranceContext: gsap.Context | undefined
let dragPointerId: number | undefined
let dragStartClientX = 0
let dragStartClientY = 0
let dragStartX = 0
let dragStartY = 0
let hasDragged = false

const safeItems = computed(() => props.items.filter((item) => Boolean(item.src || item.previewSrc)))
const total = computed(() => safeItems.value.length)
const hasItems = computed(() => total.value > 0)
const activeItem = computed(() => safeItems.value[activeIndex.value])
const activeSrc = computed(() => activeItem.value?.previewSrc || activeItem.value?.src || '')
const activeAlt = computed(() => activeItem.value?.alt ?? '')
const canNavigate = computed(() => total.value > 1)
const canDownload = computed(() => props.downloadable && Boolean(activeItem.value))
const normalizedMinScale = computed(() => Math.max(0.1, Math.min(props.minScale, props.maxScale)))
const normalizedMaxScale = computed(() => Math.max(normalizedMinScale.value, props.maxScale))
const normalizedZoomStep = computed(() => Math.max(0.05, props.zoomStep))
const isAtMinScale = computed(() => transform.scale <= normalizedMinScale.value + 0.001)
const isAtMaxScale = computed(() => transform.scale >= normalizedMaxScale.value - 0.001)
const navigationIndex = computed(() => pendingIndex.value ?? activeIndex.value)
const isImageLoading = computed(
  () => imageStatus.value === 'loading' || pendingIndex.value !== undefined,
)

const rootClasses = computed(() => [
  'bing-image-preview-root',
  {
    'is-active': isActive.value,
    'is-dragging': isDragging.value,
    'is-loading': isImageLoading.value,
    'is-error': imageStatus.value === 'error',
  },
])

const overlay = useOverlay({
  open: () => clientReady.value && shouldRender.value,
  elements: () => [rootRef.value],
  zIndex: () => resolvedZIndex.value,
  modal: true,
  closeOnEscape: () => props.modelValue && props.closeOnEsc,
  onEscape: () => closePreview('escape'),
})

const rootStyle = computed(() => ({
  ...createGlassCssVariables('bing-image-preview', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
  zIndex: overlay.zIndex.value,
}))

const imageStyle = computed(() => ({
  transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
}))

const counter = computed(() => {
  const current = navigationIndex.value + 1
  const digits = Math.max(2, String(total.value).length)

  return {
    current: String(current).padStart(digits, '0'),
    total: String(total.value).padStart(digits, '0'),
    label: `第 ${current} 张，共 ${total.value} 张`,
  }
})

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function clearLoadingIndicatorTimers() {
  if (!isBrowser()) {
    return
  }

  if (loadingIndicatorDelayTimer) {
    window.clearTimeout(loadingIndicatorDelayTimer)
    loadingIndicatorDelayTimer = undefined
  }

  if (loadingIndicatorHideTimer) {
    window.clearTimeout(loadingIndicatorHideTimer)
    loadingIndicatorHideTimer = undefined
  }
}

function beginLoadingFeedback() {
  if (!isBrowser()) {
    return
  }

  clearLoadingIndicatorTimers()

  if (showLoadingIndicator.value) {
    return
  }

  loadingIndicatorDelayTimer = window.setTimeout(() => {
    loadingIndicatorDelayTimer = undefined
    loadingIndicatorShownAt = Date.now()
    showLoadingIndicator.value = true
  }, LOADING_INDICATOR_DELAY)
}

function finishLoadingFeedback(immediate = false) {
  if (!isBrowser()) {
    showLoadingIndicator.value = false
    return
  }

  if (loadingIndicatorDelayTimer) {
    window.clearTimeout(loadingIndicatorDelayTimer)
    loadingIndicatorDelayTimer = undefined
  }

  if (!showLoadingIndicator.value) {
    return
  }

  if (immediate) {
    clearLoadingIndicatorTimers()
    showLoadingIndicator.value = false
    return
  }

  const remaining = Math.max(
    0,
    LOADING_INDICATOR_MIN_VISIBLE - (Date.now() - loadingIndicatorShownAt),
  )

  loadingIndicatorHideTimer = window.setTimeout(() => {
    loadingIndicatorHideTimer = undefined
    showLoadingIndicator.value = false
  }, remaining)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const { lock: lockBodyScroll, unlock: unlockBodyScroll } = createScrollLock()

function clampIndex(index: number) {
  if (total.value === 0) {
    return 0
  }

  return clamp(index, 0, total.value - 1)
}

function getInitialActiveIndex() {
  const sourceIndex = props.currentIndex ?? props.initialIndex
  return clampIndex(sourceIndex)
}

function killTransformTween() {
  transformTween?.kill()
  transformTween = undefined
}

function setTransform(nextTransform: Partial<typeof transform>, animate = true) {
  killTransformTween()

  const vars = {
    scale: nextTransform.scale ?? transform.scale,
    x: nextTransform.x ?? transform.x,
    y: nextTransform.y ?? transform.y,
    rotation: nextTransform.rotation ?? transform.rotation,
  }

  if (!animate || prefersReducedMotion()) {
    transform.scale = vars.scale
    transform.x = vars.x
    transform.y = vars.y
    transform.rotation = vars.rotation
    return
  }

  transformTween = gsap.to(transform, {
    ...vars,
    duration: 0.22,
    ease: 'power3.out',
    overwrite: true,
    onComplete: () => {
      transformTween = undefined
    },
    onInterrupt: () => {
      transformTween = undefined
    },
  })
}

function resetTransform(animate = true) {
  setTransform(
    {
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
    },
    animate,
  )
}

function zoomTo(scale: number, animate = true) {
  const nextScale = clamp(scale, normalizedMinScale.value, normalizedMaxScale.value)
  const ratio = transform.scale === 0 ? 1 : nextScale / transform.scale
  const nextX = nextScale <= 1 ? 0 : transform.x * ratio
  const nextY = nextScale <= 1 ? 0 : transform.y * ratio

  setTransform(
    {
      scale: nextScale,
      x: nextX,
      y: nextY,
    },
    animate,
  )
}

function zoomIn() {
  zoomTo(transform.scale + normalizedZoomStep.value)
}

function zoomOut() {
  zoomTo(transform.scale - normalizedZoomStep.value)
}

function rotate(delta: number) {
  setTransform({
    rotation: transform.rotation + delta,
  })
}

function cancelPendingImage() {
  preloadRequestId += 1

  if (preloadingImage) {
    preloadingImage.onload = null
    preloadingImage.onerror = null
    preloadingImage = undefined
  }

  pendingIndex.value = undefined
}

function commitActiveIndex(index: number, failed = false) {
  activeIndex.value = index
  pendingIndex.value = undefined
  imageStatus.value = failed ? 'error' : 'loading'
  resetTransform(false)

  if (failed) {
    finishLoadingFeedback()
    return
  }

  void nextTick(() => {
    const image = imageRef.value

    if (!image?.complete) {
      return
    }

    if (image.naturalWidth > 0) {
      handleImageLoad()
      return
    }

    handleImageError()
  })
}

function setActiveIndex(index: number, direction?: -1 | 1) {
  const nextIndex = clampIndex(index)
  const currentNavigationIndex = navigationIndex.value
  const hadPendingImage = pendingIndex.value !== undefined

  if (pendingIndex.value === nextIndex || (activeIndex.value === nextIndex && !hadPendingImage)) {
    return
  }

  cancelPendingImage()
  imageSwitchDirection.value = direction ?? (nextIndex >= currentNavigationIndex ? 1 : -1)

  if (activeIndex.value === nextIndex) {
    finishLoadingFeedback()

    if (hadPendingImage) {
      emit('update:currentIndex', nextIndex)

      const item = activeItem.value
      if (item) {
        emit('change', nextIndex, item)
      }
    }

    return
  }

  const item = safeItems.value[nextIndex]
  const src = item?.previewSrc || item?.src || ''

  pendingIndex.value = nextIndex
  beginLoadingFeedback()
  emit('update:currentIndex', nextIndex)

  if (item) {
    emit('change', nextIndex, item)
  }

  if (!isBrowser() || !src) {
    commitActiveIndex(nextIndex, !src)
    return
  }

  const requestId = ++preloadRequestId
  const loader = new Image()

  preloadingImage = loader
  loader.decoding = 'async'
  loader.onload = () => {
    if (requestId !== preloadRequestId) {
      return
    }

    preloadingImage = undefined
    commitActiveIndex(nextIndex)
  }
  loader.onerror = () => {
    if (requestId !== preloadRequestId) {
      return
    }

    preloadingImage = undefined
    commitActiveIndex(nextIndex, true)
  }
  loader.src = src
}

function goPrevious() {
  if (!canNavigate.value) {
    return
  }

  if (navigationIndex.value === 0) {
    if (props.loop) {
      setActiveIndex(total.value - 1, -1)
    }
    return
  }

  setActiveIndex(navigationIndex.value - 1, -1)
}

function goNext() {
  if (!canNavigate.value) {
    return
  }

  if (navigationIndex.value === total.value - 1) {
    if (props.loop) {
      setActiveIndex(0, 1)
    }
    return
  }

  setActiveIndex(navigationIndex.value + 1, 1)
}

function closePreview(reason: BingImagePreviewCloseReason) {
  emit('update:modelValue', false)
  emit('close', reason)
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    closePreview('overlay')
  }
}

function handleImageLoad() {
  imageStatus.value = 'loaded'
  hasPresentedImage = true
  finishLoadingFeedback()
}

function handleImageError() {
  imageStatus.value = 'error'
  finishLoadingFeedback()
}

function finishCurrentImageTransition() {
  const complete = activeImageTransitionComplete

  activeImageTransitionComplete = undefined
  imageTransitionTimeline?.kill()
  imageTransitionTimeline = undefined
  complete?.()
}

function playQueuedImageTransition() {
  imageTransitionQueued = false

  if (!enteringImageFrame || !enterImageDone) {
    return
  }

  finishCurrentImageTransition()

  const entering = enteringImageFrame
  const leaving = leavingImageFrame
  const enterDone = enterImageDone
  const leaveDone = leaveImageDone
  let completed = false

  enteringImageFrame = undefined
  leavingImageFrame = undefined
  enterImageDone = undefined
  leaveImageDone = undefined

  const complete = () => {
    if (completed) {
      return
    }

    completed = true
    gsap.set(entering, { clearProps: 'opacity,visibility,transform' })

    if (leaving) {
      gsap.set(leaving, { clearProps: 'opacity,visibility,transform' })
    }

    enterDone()
    leaveDone?.()
    hasPresentedImage = true

    if (activeImageTransitionComplete === complete) {
      activeImageTransitionComplete = undefined
      imageTransitionTimeline = undefined
    }
  }

  activeImageTransitionComplete = complete

  if (prefersReducedMotion()) {
    complete()
    return
  }

  imageTransitionTimeline = gsap.timeline({
    defaults: {
      overwrite: 'auto',
    },
    onComplete: complete,
  })

  if (leaving) {
    imageTransitionTimeline.to(
      leaving,
      {
        autoAlpha: 0,
        x: imageSwitchDirection.value * -18,
        scale: 0.992,
        duration: 0.22,
        ease: 'power2.inOut',
      },
      0,
    )
  }

  imageTransitionTimeline.to(
    entering,
    {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: leaving ? 0.34 : 0.28,
      ease: 'power3.out',
    },
    leaving ? 0.04 : 0,
  )
}

function scheduleImageTransition() {
  if (imageTransitionQueued) {
    return
  }

  imageTransitionQueued = true
  queueMicrotask(playQueuedImageTransition)
}

function handleImageBeforeEnter(element: Element) {
  const frame = element as HTMLElement

  gsap.set(frame, {
    autoAlpha: 0,
    x: hasPresentedImage ? imageSwitchDirection.value * 24 : 0,
    y: hasPresentedImage ? 0 : 10,
    scale: 0.985,
  })
}

function handleImageEnter(element: Element, done: () => void) {
  enteringImageFrame = element as HTMLElement
  enterImageDone = done
  scheduleImageTransition()
}

function handleImageLeave(element: Element, done: () => void) {
  leavingImageFrame = element as HTMLElement
  leaveImageDone = done
  scheduleImageTransition()
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()

  if (!hasItems.value) {
    return
  }

  if (event.deltaY < 0) {
    zoomIn()
    return
  }

  zoomOut()
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0 || !hasItems.value || imageStatus.value === 'error') {
    return
  }

  killTransformTween()
  isDragging.value = true
  hasDragged = false
  dragPointerId = event.pointerId
  dragStartClientX = event.clientX
  dragStartClientY = event.clientY
  dragStartX = transform.x
  dragStartY = transform.y

  try {
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  } catch {
    // Synthetic events may not support pointer capture.
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value || event.pointerId !== dragPointerId) {
    return
  }

  const deltaX = event.clientX - dragStartClientX
  const deltaY = event.clientY - dragStartClientY

  if (Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
    hasDragged = true
  }

  transform.x = dragStartX + deltaX
  transform.y = dragStartY + deltaY
}

function endDrag() {
  isDragging.value = false
  dragPointerId = undefined
}

function handleDoubleClick() {
  if (hasDragged || imageStatus.value === 'error') {
    return
  }

  if (transform.scale <= 1.01) {
    zoomTo(Math.min(2, normalizedMaxScale.value))
    return
  }

  setTransform({
    scale: 1,
    x: 0,
    y: 0,
  })
}

function handleDownload() {
  const item = activeItem.value

  if (!item) {
    return
  }

  emit('download', {
    item,
    index: activeIndex.value,
  })

  if (!isBrowser()) {
    return
  }

  const link = document.createElement('a')
  link.href = item.downloadUrl || item.previewSrc || item.src
  link.download = item.downloadName || ''
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.modelValue || !overlay.isTop(event) || event.defaultPrevented) {
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrevious()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
    return
  }

  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomIn()
    return
  }

  if (event.key === '-') {
    event.preventDefault()
    zoomOut()
    return
  }

  if (event.key === '0') {
    event.preventDefault()
    resetTransform()
  }
}

function syncKeyListener() {
  if (!isBrowser()) {
    return
  }

  if (props.modelValue && !isListeningForKeys) {
    window.addEventListener('keydown', handleKeydown)
    isListeningForKeys = true
    return
  }

  if (!props.modelValue && isListeningForKeys) {
    window.removeEventListener('keydown', handleKeydown)
    isListeningForKeys = false
  }
}

function clearRenderTimers() {
  if (!isBrowser()) {
    return
  }

  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }

  if (unmountTimer) {
    window.clearTimeout(unmountTimer)
    unmountTimer = undefined
  }
}

function playEntrance() {
  if (!rootRef.value) {
    return
  }

  entranceContext?.revert()
  entranceContext = gsap.context(() => {
    const image = rootRef.value?.querySelector<HTMLElement>('.bing-image-preview__media')
    const toolbar = rootRef.value?.querySelector<HTMLElement>('.bing-image-preview__toolbar')

    if (!image || prefersReducedMotion()) {
      return
    }

    gsap.fromTo(
      image,
      { autoAlpha: 0, scale: 0.96, y: 16 },
      {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.28,
        ease: 'power3.out',
        clearProps: 'opacity,visibility,transform',
      },
    )

    if (toolbar) {
      gsap.fromTo(
        toolbar,
        { autoAlpha: 0, y: -8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.22,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,transform',
        },
      )
    }
  }, rootRef.value)
}

async function syncRenderedState(open: boolean) {
  if (!isBrowser()) {
    shouldRender.value = open
    isActive.value = open
    return
  }

  clearRenderTimers()

  if (open) {
    cancelPendingImage()
    finishLoadingFeedback(true)
    hasPresentedImage = false
    activeIndex.value = getInitialActiveIndex()
    imageStatus.value = 'loading'
    beginLoadingFeedback()
    resetTransform(false)

    if (props.lockScroll) {
      lockBodyScroll()
    }

    shouldRender.value = true
    isActive.value = false
    await nextTick()
    if (overlay.isTop()) rootRef.value?.focus()
    playEntrance()

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0
      isActive.value = true
    })
    return
  }

  isActive.value = false
  cancelPendingImage()
  finishLoadingFeedback(true)
  finishCurrentImageTransition()
  entranceContext?.revert()
  entranceContext = undefined
  endDrag()
  killTransformTween()

  unmountTimer = window.setTimeout(() => {
    unmountTimer = undefined
    shouldRender.value = false
    unlockBodyScroll()
  }, prefersReducedMotion() ? 0 : PREVIEW_EXIT_DURATION)
}

watch([clientReady, () => props.modelValue], ([ready, open]) => {
  if (!ready) return
  void syncRenderedState(open)
  syncKeyListener()
}, { immediate: true })
watch(
  () => props.currentIndex,
  (index) => {
    if (index === undefined || !props.modelValue) {
      return
    }

    setActiveIndex(index)
  },
)
watch(
  () => total.value,
  () => {
    if (pendingIndex.value !== undefined && pendingIndex.value >= total.value) {
      cancelPendingImage()
      finishLoadingFeedback()
    }

    activeIndex.value = clampIndex(activeIndex.value)
  },
)

onBeforeUnmount(() => {
  clearRenderTimers()
  cancelPendingImage()
  finishLoadingFeedback(true)
  imageTransitionTimeline?.kill()
  imageTransitionTimeline = undefined
  activeImageTransitionComplete = undefined
  enteringImageFrame = undefined
  leavingImageFrame = undefined
  enterImageDone = undefined
  leaveImageDone = undefined
  entranceContext?.revert()
  entranceContext = undefined
  killTransformTween()
  unlockBodyScroll()

  if (isBrowser() && isListeningForKeys) {
    window.removeEventListener('keydown', handleKeydown)
    isListeningForKeys = false
  }
})
</script>

<template>
  <Teleport v-if="clientReady" :to="teleportTo">
    <div
      v-if="shouldRender"
      ref="rootRef"
      :class="rootClasses"
      :style="rootStyle"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-label="ariaLabel"
      @wheel="handleWheel"
    >
      <div class="bing-image-preview__backdrop" aria-hidden="true" @click="handleOverlayClick"></div>

      <div v-if="showToolbar" class="bing-image-preview__toolbar" aria-label="图片预览工具栏">
        <div v-if="hasItems" class="bing-image-preview__status">
          <span
            v-if="showCounter"
            class="bing-image-preview__counter"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            :aria-label="counter.label"
          >
            <span class="bing-image-preview__counter-current" aria-hidden="true">{{ counter.current }}</span>
            <span class="bing-image-preview__counter-divider" aria-hidden="true">/</span>
            <span class="bing-image-preview__counter-total" aria-hidden="true">{{ counter.total }}</span>
          </span>
          <span class="bing-image-preview__loading-slot" aria-live="polite">
            <Transition name="bing-image-preview-loading">
              <span
                v-if="showLoadingIndicator"
                class="bing-image-preview__loading"
                role="status"
                aria-label="正在加载图片"
              >
                <span class="bing-image-preview__spinner" aria-hidden="true"></span>
              </span>
            </Transition>
          </span>
        </div>

        <div class="bing-image-preview__toolbar-group">
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-image-preview__tool bing-image-preview__tool--zoom-out"
            aria-label="缩小"
            :disabled="isAtMinScale"
            @click="zoomOut"
          >
            <template #prefix>
              <BingIcon :icon="ZoomOut" size="sm" />
            </template>
          </BingButton>
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-image-preview__tool bing-image-preview__tool--zoom-in"
            aria-label="放大"
            :disabled="isAtMaxScale"
            @click="zoomIn"
          >
            <template #prefix>
              <BingIcon :icon="ZoomIn" size="sm" />
            </template>
          </BingButton>
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-image-preview__tool"
            aria-label="向左旋转"
            @click="rotate(-90)"
          >
            <template #prefix>
              <BingIcon :icon="RotateCcw" size="sm" />
            </template>
          </BingButton>
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-image-preview__tool"
            aria-label="向右旋转"
            @click="rotate(90)"
          >
            <template #prefix>
              <BingIcon :icon="RotateCw" size="sm" />
            </template>
          </BingButton>
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false" class="bing-image-preview__tool" aria-label="重置图片" @click="resetTransform()">
            <template #prefix>
              <BingIcon :icon="RefreshCcw" size="sm" />
            </template>
          </BingButton>
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            v-if="canDownload"
            class="bing-image-preview__tool"
            aria-label="下载图片"
            @click="handleDownload"
          >
            <template #prefix>
              <BingIcon :icon="Download" size="sm" />
            </template>
          </BingButton>
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false" class="bing-image-preview__tool" aria-label="关闭预览" @click="closePreview('close')">
            <template #prefix>
              <BingIcon :icon="X" size="sm" />
            </template>
          </BingButton>
        </div>
      </div>

      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        v-if="canNavigate"
        class="bing-image-preview__nav bing-image-preview__nav--prev"
        aria-label="上一张图片"
        @click="goPrevious"
      >
        <template #prefix>
          <BingIcon :icon="ChevronLeft" size="lg" />
        </template>
      </BingButton>
      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        v-if="canNavigate"
        class="bing-image-preview__nav bing-image-preview__nav--next"
        aria-label="下一张图片"
        @click="goNext"
      >
        <template #prefix>
          <BingIcon :icon="ChevronRight" size="lg" />
        </template>
      </BingButton>

      <div class="bing-image-preview__stage">
        <div
          class="bing-image-preview__media"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @lostpointercapture="endDrag"
          @dblclick="handleDoubleClick"
        >
          <Transition
            :css="false"
            @before-enter="handleImageBeforeEnter"
            @enter="handleImageEnter"
            @leave="handleImageLeave"
          >
            <div v-if="hasItems" :key="activeSrc" class="bing-image-preview__image-frame">
              <img
                ref="imageRef"
                class="bing-image-preview__img"
                :src="activeSrc"
                :alt="activeAlt"
                draggable="false"
                :style="imageStyle"
                @load="handleImageLoad"
                @error="handleImageError"
              />
            </div>
          </Transition>
          <div v-if="!hasItems" class="bing-image-preview__empty">暂无图片</div>
          <div v-if="imageStatus === 'error'" class="bing-image-preview__error" role="status">
            图片加载失败
          </div>
        </div>

        <div v-if="activeItem?.caption" class="bing-image-preview__caption">
          {{ activeItem.caption }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.bing-image-preview-root {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 18px;
  color: #ffffff;
  opacity: 0;
  outline: none;
  pointer-events: none;
  transition: opacity 180ms var(--bing-ease-smooth);
}

.bing-image-preview-root.is-active {
  opacity: 1;
  pointer-events: auto;
}

.bing-image-preview__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgb(9 9 11 / 0.88);
  backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px))
    saturate(var(--bing-image-preview-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px))
    saturate(var(--bing-image-preview-glass-saturation, 1.05));
}

.bing-image-preview__toolbar {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: min(100%, 980px);
  margin: 0 auto;
  pointer-events: none;
}

.bing-image-preview__toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(24, 24, 27, var(--bing-image-preview-glass-opacity, 0.82));
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.16);
  backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px))
    saturate(var(--bing-image-preview-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px))
    saturate(var(--bing-image-preview-glass-saturation, 1.05));
  pointer-events: auto;
}

.bing-image-preview__tool,
.bing-image-preview__nav {
  box-sizing: border-box;
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.86);
  cursor: pointer;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-image-preview__tool:hover:not(:disabled),
.bing-image-preview__nav:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.bing-image-preview__tool:focus-visible,
.bing-image-preview__nav:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 3px;
}

.bing-image-preview__tool:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.bing-image-preview__status {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-height: 18px;
}

.bing-image-preview__counter {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  min-width: 64px;
  padding: 0 4px;
  font-size: 13px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.bing-image-preview__counter-current {
  color: rgba(255, 255, 255, 0.94);
  font-weight: 500;
}

.bing-image-preview__counter-divider {
  color: rgba(255, 255, 255, 0.42);
}

.bing-image-preview__counter-total {
  color: rgba(255, 255, 255, 0.58);
}

.bing-image-preview__loading-slot {
  position: absolute;
  inset-inline-start: calc(100% + 10px);
  top: 50%;
  display: inline-grid;
  width: 18px;
  height: 18px;
  place-items: center;
  transform: translateY(-50%);
}

.bing-image-preview__loading {
  display: inline-grid;
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.82);
  place-items: center;
}

.bing-image-preview-loading-enter-active,
.bing-image-preview-loading-leave-active {
  transition:
    opacity 140ms var(--bing-ease-smooth),
    transform 140ms var(--bing-ease-smooth);
}

.bing-image-preview-loading-enter-from,
.bing-image-preview-loading-leave-to {
  opacity: 0;
  transform: scale(0.72);
}

.bing-image-preview__stage {
  position: relative;
  z-index: 2;
  display: block;
  min-width: 0;
  min-height: 0;
}

.bing-image-preview__media {
  position: absolute;
  inset: 22px 70px 20px;
  display: grid;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  place-items: center;
  touch-action: none;
  user-select: none;
}

.bing-image-preview__image-frame {
  position: absolute;
  inset: 0;
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  place-items: center;
  will-change: transform, opacity;
}

.bing-image-preview__img {
  display: block;
  max-width: min(100%, 92vw);
  max-height: min(100%, calc(100vh - 150px));
  border-radius: 6px;
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.24);
  cursor: grab;
  object-fit: contain;
  transform-origin: 50% 50%;
  will-change: transform;
}

.bing-image-preview-root.is-dragging .bing-image-preview__img {
  cursor: grabbing;
}

.bing-image-preview__error,
.bing-image-preview__empty {
  position: absolute;
  inset: 50% auto auto 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 128px;
  max-width: calc(100vw - 32px);
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: rgba(24, 24, 27, var(--bing-image-preview-glass-opacity, 0.82));
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  font-weight: 400;
  transform: translate(-50%, -50%);
  backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px));
  -webkit-backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px));
}

.bing-image-preview__spinner {
  width: 14px;
  height: 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.24);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: bing-image-preview-spin 760ms linear infinite;
}

.bing-image-preview__error {
  color: #fecaca;
}

.bing-image-preview__caption {
  box-sizing: border-box;
  width: max-content;
  overflow-wrap: anywhere;
  position: absolute;
  left: 50%;
  bottom: 14px;
  max-width: min(720px, calc(100vw - 36px));
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: rgba(24, 24, 27, var(--bing-image-preview-glass-opacity, 0.82));
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.35;
  text-align: center;
  transform: translateX(-50%);
  backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px));
  -webkit-backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px));
}

.bing-image-preview__nav {
  position: absolute;
  top: 50%;
  z-index: 3;
  width: 36px;
  height: 36px;
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(24, 24, 27, var(--bing-image-preview-glass-opacity, 0.82));
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.16);
  transform: translateY(-50%);
  backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px));
  -webkit-backdrop-filter: blur(var(--bing-image-preview-glass-blur, 16px));
}

.bing-image-preview__nav--prev {
  left: 20px;
}

.bing-image-preview__nav--next {
  right: 20px;
}

@keyframes bing-image-preview-spin {
  to {
    transform: rotate(1turn);
  }
}

/* 深色预览统一悬停层，避免继承页面浅色主题的实心背景。 */
.bing-image-preview__tool.bing-button,
.bing-image-preview__nav.bing-button {
  --button-interaction-overlay: rgb(255 255 255 / 0.08);
  --bing-click-particle-color: currentColor;
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-image-preview__tool.bing-button {
  --button-height: 32px;
  --button-icon-size: 16px;
  min-height: 32px;
  width: var(--button-height);
  padding: 0;
}

.bing-image-preview__nav.bing-button {
  --button-height: 36px;
  --button-icon-size: 24px;
  min-height: 36px;
  width: var(--button-height);
  padding: 0;
}

@media (max-width: 680px) {
  .bing-image-preview-root {
    padding: 12px;
  }

  .bing-image-preview__toolbar {
    align-items: center;
    flex-direction: column;
    width: 100%;
  }

  .bing-image-preview__toolbar-group {
    justify-content: center;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
  }

  .bing-image-preview__stage {
    padding: 0;
  }

  .bing-image-preview__media {
    inset: 18px 0 14px;
  }

  .bing-image-preview__nav.bing-button {
    --button-height: 44px;
    min-height: 44px;
    height: 44px;
  }

  .bing-image-preview__nav--prev {
    left: 8px;
  }

  .bing-image-preview__nav--next {
    right: 8px;
  }

  .bing-image-preview__img {
    max-height: calc(100vh - 176px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-image-preview-root,
  .bing-image-preview__tool,
  .bing-image-preview__nav,
  .bing-image-preview-loading-enter-active,
  .bing-image-preview-loading-leave-active,
  .bing-image-preview__spinner {
    animation: none;
    transition: none;
  }
}

</style>
