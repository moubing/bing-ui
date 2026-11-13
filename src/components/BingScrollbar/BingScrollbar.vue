<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { createSmoothScrollController } from '../../motion/smoothScroll'
import type {
  SmoothScrollController,
  SmoothScrollOptions,
} from '../../motion/smoothScroll'
import type {
  BingScrollbarEmits,
  BingScrollbarExpose,
  BingScrollbarProps,
  BingScrollbarSlots,
  BingScrollbarViewportSlotProps,
} from './BingScrollbar.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const props = withDefaults(defineProps<BingScrollbarProps>(), {
  height: undefined,
  maxHeight: undefined,
  minThumbSize: 28,
  overflowTolerance: 1,
  vertical: true,
  horizontal: false,
  always: false,
  disabled: false,
  focusable: true,
  ariaLabel: undefined,
  smooth: true,
})

const emit = defineEmits<BingScrollbarEmits>()
const slots = defineSlots<BingScrollbarSlots>()

const viewportRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const verticalRailRef = ref<HTMLElement | null>(null)
const horizontalRailRef = ref<HTMLElement | null>(null)
const verticalThumbRef = ref<HTMLElement | null>(null)
const horizontalThumbRef = ref<HTMLElement | null>(null)
const hasVerticalOverflow = ref(false)
const hasHorizontalOverflow = ref(false)
const verticalThumbSize = ref(0)
const horizontalThumbSize = ref(0)
const isHovering = ref(false)
const draggingAxis = ref<'vertical' | 'horizontal' | null>(null)
const isScrolling = ref(false)

let resizeObserver: ResizeObserver | undefined
let contentObserver: MutationObserver | undefined
let scrollTimer: number | undefined
let updateFrame: number | undefined
let horizontalWheelFrame: number | undefined
let horizontalWheelTarget: number | undefined
let smoothScrollController: SmoothScrollController | undefined
let dragStartPointer = 0
let dragStartScrollTop = 0
let dragStartScrollLeft = 0
let verticalMaxScroll = 0
let horizontalMaxScroll = 0
let verticalThumbTravel = 0
let horizontalThumbTravel = 0
let verticalThumbOffset = 0
let horizontalThumbOffset = 0

const rootClasses = computed(() => [
  'bing-scrollbar',
  {
    'has-overflow': hasVerticalOverflow.value || hasHorizontalOverflow.value,
    'has-vertical-overflow': hasVerticalOverflow.value,
    'has-horizontal-overflow': hasHorizontalOverflow.value,
    'is-vertical': props.vertical,
    'is-horizontal': props.horizontal,
    'is-always-visible': props.always,
    'is-disabled': props.disabled,
    'is-dragging': Boolean(draggingAxis.value),
    'is-dragging-vertical': draggingAxis.value === 'vertical',
    'is-dragging-horizontal': draggingAxis.value === 'horizontal',
    'is-hovering': isHovering.value,
    'is-scrolling': isScrolling.value,
    'is-smooth': Boolean(props.smooth),
  },
])

const rootStyle = computed<CSSProperties>(() => ({
  height: normalizeSize(props.height),
  maxHeight: normalizeSize(props.maxHeight),
}))

function verticalThumbStyle(): CSSProperties {
  return {
    height: `${verticalThumbSize.value}px`,
    transform: `translate(-50%, ${verticalThumbOffset}px)`,
  }
}

function horizontalThumbStyle(): CSSProperties {
  return {
    width: `${horizontalThumbSize.value}px`,
    transform: `translate(${horizontalThumbOffset}px, -50%)`,
  }
}

const normalizedOverflowTolerance = computed(() => Math.max(1, props.overflowTolerance))
const isViewportFocusable = computed(
  () =>
    (hasVerticalOverflow.value || hasHorizontalOverflow.value) &&
    props.focusable &&
    !props.disabled,
)
const resolvedAriaLabel = computed(
  () => props.ariaLabel ?? (isViewportFocusable.value ? '可滚动内容' : undefined),
)

function setViewportRef(element: unknown) {
  viewportRef.value = element instanceof HTMLElement ? element : null
}

const viewportAttrs: BingScrollbarViewportSlotProps['viewportAttrs'] = {
  class: 'bing-scrollbar__custom-viewport',
  onScroll: handleScroll,
  onWheel: handleWheel,
  onKeydown: handleKeydown,
  onInput: scheduleUpdate,
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function normalizeSize(value: string | number | undefined) {
  if (typeof value === 'number') {
    return `${value}px`
  }

  return value
}

function clearScrollTimer() {
  if (!isBrowser() || scrollTimer === undefined) {
    return
  }

  window.clearTimeout(scrollTimer)
  scrollTimer = undefined
}

function clearUpdateFrame() {
  if (!isBrowser() || updateFrame === undefined) {
    return
  }

  window.cancelAnimationFrame(updateFrame)
  updateFrame = undefined
}

function clearHorizontalWheelFrame() {
  if (!isBrowser() || horizontalWheelFrame === undefined) {
    return
  }

  window.cancelAnimationFrame(horizontalWheelFrame)
  horizontalWheelFrame = undefined
}

function cancelHorizontalWheelAnimation() {
  clearHorizontalWheelFrame()
  horizontalWheelTarget = undefined
}

function cancelScrollAnimations() {
  cancelHorizontalWheelAnimation()
  smoothScrollController?.cancel()
}

function getSmoothScrollOptions(): SmoothScrollOptions | undefined {
  return typeof props.smooth === 'object' ? props.smooth : undefined
}

function smoothScrollEnabled() {
  return Boolean(props.smooth) && !props.disabled
}

function update() {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  const clientHeight = viewport.clientHeight
  const scrollHeight = viewport.scrollHeight
  const clientWidth = viewport.clientWidth
  const scrollWidth = viewport.scrollWidth
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
  const maxScrollLeft = Math.max(0, scrollWidth - clientWidth)
  const nextHasVerticalOverflow =
    props.vertical && !props.disabled && maxScrollTop > normalizedOverflowTolerance.value
  const nextHasHorizontalOverflow =
    props.horizontal && !props.disabled && maxScrollLeft > normalizedOverflowTolerance.value

  hasVerticalOverflow.value = nextHasVerticalOverflow
  hasHorizontalOverflow.value = nextHasHorizontalOverflow
  verticalMaxScroll = nextHasVerticalOverflow ? maxScrollTop : 0
  horizontalMaxScroll = nextHasHorizontalOverflow ? maxScrollLeft : 0

  if (!nextHasVerticalOverflow || !verticalRailRef.value) {
    verticalThumbSize.value = 0
    setVerticalThumbOffset(0)
    verticalThumbTravel = 0
  } else {
    const railHeight = verticalRailRef.value.clientHeight
    const proportionalSize = scrollHeight > 0 ? (clientHeight / scrollHeight) * railHeight : railHeight
    const nextThumbSize = Math.min(
      railHeight,
      Math.max(Math.max(12, props.minThumbSize), proportionalSize),
    )
    verticalThumbTravel = Math.max(0, railHeight - nextThumbSize)
    const scrollProgress = maxScrollTop > 0 ? viewport.scrollTop / maxScrollTop : 0

    verticalThumbSize.value = nextThumbSize
    setVerticalThumbOffset(verticalThumbTravel * scrollProgress)
  }

  if (!nextHasHorizontalOverflow || !horizontalRailRef.value) {
    horizontalThumbSize.value = 0
    setHorizontalThumbOffset(0)
    horizontalThumbTravel = 0
  } else {
    const railWidth = horizontalRailRef.value.clientWidth
    const proportionalSize = scrollWidth > 0 ? (clientWidth / scrollWidth) * railWidth : railWidth
    const nextThumbSize = Math.min(
      railWidth,
      Math.max(Math.max(12, props.minThumbSize), proportionalSize),
    )
    horizontalThumbTravel = Math.max(0, railWidth - nextThumbSize)
    const scrollProgress = maxScrollLeft > 0 ? viewport.scrollLeft / maxScrollLeft : 0

    horizontalThumbSize.value = nextThumbSize
    setHorizontalThumbOffset(horizontalThumbTravel * scrollProgress)
  }
}

// 位移只写入滑块，避免滚动每一帧重新调用内容插槽。
// 尺寸仍由 Vue 管理，尺寸改变时使用这里保存的最新位置。
function setVerticalThumbOffset(offset: number) {
  verticalThumbOffset = offset
  if (verticalThumbRef.value) {
    verticalThumbRef.value.style.transform = `translate(-50%, ${offset}px)`
  }
}

function setHorizontalThumbOffset(offset: number) {
  horizontalThumbOffset = offset
  if (horizontalThumbRef.value) {
    horizontalThumbRef.value.style.transform = `translate(${offset}px, -50%)`
  }
}

function syncThumbOffsets() {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  if (hasVerticalOverflow.value) {
    const scrollProgress = verticalMaxScroll > 0 ? viewport.scrollTop / verticalMaxScroll : 0

    setVerticalThumbOffset(verticalThumbTravel * scrollProgress)
  }

  if (hasHorizontalOverflow.value) {
    const scrollProgress = horizontalMaxScroll > 0 ? viewport.scrollLeft / horizontalMaxScroll : 0

    setHorizontalThumbOffset(horizontalThumbTravel * scrollProgress)
  }
}

function requestUpdate() {
  if (!isBrowser() || typeof window.requestAnimationFrame !== 'function') {
    update()
    return
  }

  if (updateFrame !== undefined) {
    return
  }

  updateFrame = window.requestAnimationFrame(() => {
    updateFrame = undefined
    update()
  })
}

function scheduleUpdate() {
  void nextTick(requestUpdate)
}

function markScrolling() {
  if (!isBrowser()) {
    return
  }

  clearScrollTimer()
  isScrolling.value = true
  scrollTimer = window.setTimeout(() => {
    scrollTimer = undefined
    isScrolling.value = false
  }, 720)
}

function getWheelDelta(event: WheelEvent) {
  const rawDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY

  if (event.deltaMode === 1) {
    return rawDelta * 16
  }

  if (event.deltaMode === 2) {
    return rawDelta * (viewportRef.value?.clientWidth ?? 1)
  }

  return rawDelta
}

function handleScroll(event: Event) {
  syncThumbOffsets()
  markScrolling()
  emit('scroll', event)
}

function handleWheel(event: WheelEvent): boolean {
  if (event.defaultPrevented) {
    return false
  }

  if (smoothScrollEnabled()) {
    cancelHorizontalWheelAnimation()
    return smoothScrollController?.handleWheel(event) ?? false
  }

  if (props.disabled || !props.horizontal) {
    return false
  }

  if (!event.shiftKey) {
    cancelHorizontalWheelAnimation()
    return false
  }

  const viewport = viewportRef.value

  if (!viewport) {
    return false
  }

  const maxScrollLeft = horizontalMaxScroll || Math.max(0, viewport.scrollWidth - viewport.clientWidth)
  const baseScrollLeft = horizontalWheelTarget ?? viewport.scrollLeft
  const nextScrollLeft = clamp(baseScrollLeft + getWheelDelta(event), 0, maxScrollLeft)

  if (nextScrollLeft === baseScrollLeft && nextScrollLeft === viewport.scrollLeft) {
    return false
  }

  event.preventDefault()
  horizontalWheelTarget = nextScrollLeft
  startHorizontalWheelAnimation()
  return true
}

function handleKeydown(event: KeyboardEvent) {
  if (smoothScrollEnabled()) {
    smoothScrollController?.handleKeydown(event)
  }
}

function getScrollMetrics(axis: 'vertical' | 'horizontal') {
  const viewport = viewportRef.value
  const rail = axis === 'vertical' ? verticalRailRef.value : horizontalRailRef.value

  if (!viewport || !rail) {
    return null
  }

  const maxScroll =
    axis === 'vertical'
      ? Math.max(0, viewport.scrollHeight - viewport.clientHeight)
      : Math.max(0, viewport.scrollWidth - viewport.clientWidth)
  const thumbTravel =
    axis === 'vertical'
      ? Math.max(0, rail.clientHeight - verticalThumbSize.value)
      : Math.max(0, rail.clientWidth - horizontalThumbSize.value)

  return {
    maxScroll,
    thumbTravel,
  }
}

function setScrollTop(top: number) {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  const maxScroll = verticalMaxScroll || Math.max(0, viewport.scrollHeight - viewport.clientHeight)

  viewport.scrollTop = Math.min(maxScroll, Math.max(0, top))
  syncThumbOffsets()
  markScrolling()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function setScrollLeft(left: number) {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  const maxScroll = horizontalMaxScroll || Math.max(0, viewport.scrollWidth - viewport.clientWidth)

  viewport.scrollLeft = Math.min(maxScroll, Math.max(0, left))
  syncThumbOffsets()
  markScrolling()
}

function runHorizontalWheelAnimation() {
  horizontalWheelFrame = undefined

  const viewport = viewportRef.value

  if (!viewport || horizontalWheelTarget === undefined) {
    horizontalWheelTarget = undefined
    return
  }

  const distance = horizontalWheelTarget - viewport.scrollLeft

  if (Math.abs(distance) < 0.5) {
    setScrollLeft(horizontalWheelTarget)
    horizontalWheelTarget = undefined
    return
  }

  setScrollLeft(viewport.scrollLeft + distance * 0.42)
  queueHorizontalWheelFrame()
}

function queueHorizontalWheelFrame() {
  if (
    !isBrowser() ||
    horizontalWheelFrame !== undefined ||
    typeof window.requestAnimationFrame !== 'function'
  ) {
    return
  }

  horizontalWheelFrame = window.requestAnimationFrame(runHorizontalWheelAnimation)
}

function startHorizontalWheelAnimation() {
  if (horizontalWheelTarget === undefined) {
    return
  }

  if (!isBrowser() || typeof window.requestAnimationFrame !== 'function' || prefersReducedMotion()) {
    setScrollLeft(horizontalWheelTarget)
    horizontalWheelTarget = undefined
    return
  }

  if (horizontalWheelFrame === undefined) {
    runHorizontalWheelAnimation()
  }
}

function handleRailPointerDown(axis: 'vertical' | 'horizontal', event: PointerEvent) {
  if (
    props.disabled ||
    (axis === 'vertical' ? !hasVerticalOverflow.value : !hasHorizontalOverflow.value) ||
    event.button !== 0 ||
    event.target !== event.currentTarget
  ) {
    return
  }

  const rail = axis === 'vertical' ? verticalRailRef.value : horizontalRailRef.value
  const metrics = getScrollMetrics(axis)

  if (!rail || !metrics || metrics.thumbTravel <= 0) {
    return
  }

  event.preventDefault()
  cancelScrollAnimations()

  const railRect = rail.getBoundingClientRect()
  const desiredOffset =
    axis === 'vertical'
      ? event.clientY - railRect.top - verticalThumbSize.value / 2
      : event.clientX - railRect.left - horizontalThumbSize.value / 2
  const progress = Math.min(1, Math.max(0, desiredOffset / metrics.thumbTravel))

  if (axis === 'vertical') {
    setScrollTop(progress * metrics.maxScroll)
    return
  }

  setScrollLeft(progress * metrics.maxScroll)
}

function addDragListeners() {
  if (!isBrowser()) {
    return
  }

  window.addEventListener('pointermove', handleDragPointerMove)
  window.addEventListener('pointerup', handleDragPointerEnd)
  window.addEventListener('pointercancel', handleDragPointerEnd)
}

function removeDragListeners() {
  if (!isBrowser()) {
    return
  }

  window.removeEventListener('pointermove', handleDragPointerMove)
  window.removeEventListener('pointerup', handleDragPointerEnd)
  window.removeEventListener('pointercancel', handleDragPointerEnd)
}

function handleThumbPointerDown(axis: 'vertical' | 'horizontal', event: PointerEvent) {
  if (
    props.disabled ||
    (axis === 'vertical' ? !hasVerticalOverflow.value : !hasHorizontalOverflow.value) ||
    event.button !== 0
  ) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  cancelScrollAnimations()

  dragStartPointer = axis === 'vertical' ? event.clientY : event.clientX
  dragStartScrollTop = viewportRef.value?.scrollTop ?? 0
  dragStartScrollLeft = viewportRef.value?.scrollLeft ?? 0
  draggingAxis.value = axis
  addDragListeners()

  try {
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  } catch {
    // Global pointer listeners keep dragging reliable when capture is unavailable.
  }
}

function handleDragPointerMove(event: PointerEvent) {
  const axis = draggingAxis.value

  if (!axis) {
    return
  }

  const metrics = getScrollMetrics(axis)

  if (!metrics || metrics.thumbTravel <= 0) {
    return
  }

  event.preventDefault()

  const pointer = axis === 'vertical' ? event.clientY : event.clientX
  const delta = pointer - dragStartPointer
  const scrollDelta = delta * (metrics.maxScroll / metrics.thumbTravel)

  if (axis === 'vertical') {
    setScrollTop(dragStartScrollTop + scrollDelta)
    return
  }

  setScrollLeft(dragStartScrollLeft + scrollDelta)
}

function handleDragPointerEnd() {
  if (!draggingAxis.value) {
    return
  }

  draggingAxis.value = null
  removeDragListeners()
}

function scrollTo(options: ScrollToOptions | number) {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  if (typeof options === 'number') {
    cancelScrollAnimations()
    setScrollTop(options)
    return
  }

  cancelScrollAnimations()
  viewport.scrollTo(options)
  requestUpdate()
}

function scrollBy(options: ScrollToOptions | number) {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  if (typeof options === 'number') {
    cancelScrollAnimations()
    setScrollTop(viewport.scrollTop + options)
    return
  }

  cancelScrollAnimations()
  viewport.scrollBy(options)
  requestUpdate()
}

function setupResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = undefined
  contentObserver?.disconnect()
  contentObserver = undefined

  if (!isBrowser()) return

  if (slots.viewport && viewportRef.value && typeof MutationObserver !== 'undefined') {
    contentObserver = new MutationObserver(scheduleUpdate)
    contentObserver.observe(viewportRef.value, { childList: true, subtree: true, characterData: true })
  }

  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()
    return
  }

  resizeObserver = new ResizeObserver(scheduleUpdate)

  if (viewportRef.value) {
    resizeObserver.observe(viewportRef.value)
  }

  if (contentRef.value) {
    resizeObserver.observe(contentRef.value)
  }

  // 自定义视口（如 textarea）的尺寸与轨道可能分别变化。
  if (verticalRailRef.value) resizeObserver.observe(verticalRailRef.value)
  if (horizontalRailRef.value) resizeObserver.observe(horizontalRailRef.value)

  scheduleUpdate()
}

watch(viewportRef, () => {
  cancelScrollAnimations()
  removeDragListeners()
  setupResizeObserver()
}, { flush: 'post' })

watch(
  () => [
    props.height,
    props.maxHeight,
    props.minThumbSize,
    props.overflowTolerance,
    props.disabled,
    props.vertical,
    props.horizontal,
  ],
  scheduleUpdate,
)

watch(
  () => [props.disabled, props.smooth],
  () => {
    if (!smoothScrollEnabled()) {
      smoothScrollController?.cancel()
    }
  },
  { deep: true },
)

onMounted(() => {
  smoothScrollController = createSmoothScrollController({
    getElement: () => viewportRef.value,
    getOptions: getSmoothScrollOptions,
    getAxes: () => ({
      horizontal: props.horizontal,
      vertical: props.vertical,
    }),
    isEnabled: smoothScrollEnabled,
    prefersReducedMotion: () => prefersReducedMotion(),
  })
  setupResizeObserver()
})

onBeforeUnmount(() => {
  clearScrollTimer()
  clearUpdateFrame()
  cancelScrollAnimations()
  smoothScrollController = undefined
  removeDragListeners()
  resizeObserver?.disconnect()
  resizeObserver = undefined
  contentObserver?.disconnect()
  contentObserver = undefined

  if (isBrowser()) {
    window.removeEventListener('resize', scheduleUpdate)
  }
})

defineExpose<BingScrollbarExpose>({
  get hasVerticalOverflow() { return hasVerticalOverflow.value },
  get hasHorizontalOverflow() { return hasHorizontalOverflow.value },
  handleWheel,
  scrollBy,
  scrollTo,
  stop: cancelScrollAnimations,
  update,
  get viewport() {
    return viewportRef.value
  },
})
</script>

<template>
  <div
    :class="rootClasses"
    :style="rootStyle"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <slot name="viewport" :viewport-ref="setViewportRef" :viewport-attrs="viewportAttrs">
      <div
        ref="viewportRef"
        class="bing-scrollbar__viewport"
        :tabindex="isViewportFocusable ? 0 : undefined"
        :role="resolvedAriaLabel ? 'region' : undefined"
        :aria-label="resolvedAriaLabel"
        @scroll="handleScroll"
        @wheel="handleWheel"
        @keydown="handleKeydown"
      >
        <div ref="contentRef" class="bing-scrollbar__content">
          <slot />
        </div>
      </div>
    </slot>

    <div
      v-show="hasVerticalOverflow"
      ref="verticalRailRef"
      class="bing-scrollbar__rail bing-scrollbar__rail--vertical"
      aria-hidden="true"
      @pointerdown="handleRailPointerDown('vertical', $event)"
    >
      <div
        ref="verticalThumbRef"
        class="bing-scrollbar__thumb bing-scrollbar__thumb--vertical"
        :style="verticalThumbStyle()"
        @pointerdown="handleThumbPointerDown('vertical', $event)"
      ></div>
    </div>

    <div
      v-show="hasHorizontalOverflow"
      ref="horizontalRailRef"
      class="bing-scrollbar__rail bing-scrollbar__rail--horizontal"
      aria-hidden="true"
      @pointerdown="handleRailPointerDown('horizontal', $event)"
    >
      <div
        ref="horizontalThumbRef"
        class="bing-scrollbar__thumb bing-scrollbar__thumb--horizontal"
        :style="horizontalThumbStyle()"
        @pointerdown="handleThumbPointerDown('horizontal', $event)"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.bing-scrollbar {
  --bing-scrollbar-gutter: 13px;
  --bing-scrollbar-gutter-left: 0px;

  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: clip;
}

.bing-scrollbar__viewport {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  max-height: inherit;
  overflow: auto;
  overscroll-behavior-x: contain;
  overscroll-behavior-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.bing-scrollbar :deep(.bing-scrollbar__custom-viewport) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.bing-scrollbar__viewport::-webkit-scrollbar,
.bing-scrollbar :deep(.bing-scrollbar__custom-viewport)::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.bing-scrollbar__viewport:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: -2px;
}

.bing-scrollbar__content {
  box-sizing: border-box;
  min-width: 0;
}

.bing-scrollbar.is-vertical > .bing-scrollbar__viewport > .bing-scrollbar__content {
  padding-left: var(--bing-scrollbar-gutter-left);
  padding-right: var(--bing-scrollbar-gutter);
}

.bing-scrollbar.is-horizontal > .bing-scrollbar__viewport > .bing-scrollbar__content {
  padding-bottom: var(--bing-scrollbar-gutter);
}

.bing-scrollbar__rail {
  position: absolute;
  z-index: 3;
  border: 0;
  background: rgb(var(--bing-heading-rgb) / 0.075);
  opacity: 0;
  transition: opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-scrollbar__rail--vertical {
  top: 6px;
  right: 4px;
  bottom: 6px;
  width: 4px;
  border-radius: 999px;
}

.bing-scrollbar__rail--horizontal {
  right: var(--bing-scrollbar-horizontal-right, 6px);
  bottom: var(--bing-scrollbar-horizontal-bottom, 4px);
  left: var(--bing-scrollbar-horizontal-left, 6px);
  height: 4px;
  border-radius: 999px;
}

.bing-scrollbar.has-horizontal-overflow > .bing-scrollbar__rail--vertical {
  bottom: calc(var(--bing-scrollbar-gutter) + 4px);
}

.bing-scrollbar.has-vertical-overflow > .bing-scrollbar__rail--horizontal {
  right: var(
    --bing-scrollbar-horizontal-right-with-vertical,
    calc(var(--bing-scrollbar-gutter) + 4px)
  );
}

.bing-scrollbar.is-always-visible > .bing-scrollbar__rail,
.bing-scrollbar.is-hovering > .bing-scrollbar__rail,
.bing-scrollbar.is-scrolling > .bing-scrollbar__rail,
.bing-scrollbar.is-dragging > .bing-scrollbar__rail,
.bing-scrollbar:focus-within > .bing-scrollbar__rail {
  opacity: 1;
}

.bing-scrollbar__thumb {
  position: absolute;
  border-radius: 999px;
  background: rgb(var(--bing-heading-rgb) / 0.3);
  box-shadow: none;
  cursor: grab;
  transition:
    width var(--bing-duration-fast) var(--bing-ease-smooth),
    height var(--bing-duration-fast) var(--bing-ease-smooth),
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth);
  will-change: transform;
}

.bing-scrollbar__thumb--vertical {
  top: 0;
  left: 50%;
  width: 100%;
  min-height: 12px;
}

.bing-scrollbar__thumb--horizontal {
  top: 50%;
  left: 0;
  height: 100%;
  min-width: 12px;
}

.bing-scrollbar__thumb:hover,
.bing-scrollbar.is-dragging .bing-scrollbar__thumb {
  background: rgb(var(--bing-heading-rgb) / 0.45);
  box-shadow: none;
}

.bing-scrollbar.is-dragging,
.bing-scrollbar.is-dragging * {
  cursor: grabbing;
  user-select: none;
}

.bing-scrollbar.is-disabled > .bing-scrollbar__viewport,
.bing-scrollbar.is-disabled :deep(.bing-scrollbar__custom-viewport) {
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .bing-scrollbar__rail,
  .bing-scrollbar__thumb {
    transition: none;
  }
}
</style>
