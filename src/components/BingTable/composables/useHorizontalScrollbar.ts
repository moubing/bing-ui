import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties, type Ref } from 'vue'
import type { BingScrollbarExpose } from '../../BingScrollbar/BingScrollbar.types'
import type { BingTableEmits } from '../BingTable.types'
import type { EmitFn } from 'vue'
import type { BingTableInteractionStyle } from '../BingTable.internal'
import { clamp, isBrowser, scrollbarOverflowTolerance } from '../BingTable.utils'

interface HorizontalScrollbarDragSnapshot {
  maxScrollLeft: number
  startClientX: number
  startScrollLeft: number
  thumbTravel: number
}

interface ScrollbarOptions {
  scrollRef: Readonly<Ref<BingScrollbarExpose | null>>
  horizontalRailRef: Readonly<Ref<HTMLElement | null>>
  virtualScrollTop: Ref<number>
  virtualViewportHeight: Ref<number>
  interactionStyle: BingTableInteractionStyle
}

export function useHorizontalScrollbar(
  emit: EmitFn<Pick<BingTableEmits, 'scroll'>>,
  {
    scrollRef, horizontalRailRef, virtualScrollTop, virtualViewportHeight, interactionStyle,
  }: ScrollbarOptions,
) {
  const horizontalViewportWidth = ref(0)

  const horizontalScrollWidth = ref(0)

  const horizontalRailWidth = ref(0)

  const horizontalScrollLeft = ref(0)

  const horizontalMaxScrollLeft = ref(0)

  const hasVerticalOverflow = ref(false)

  const isDraggingHorizontalScrollbar = ref(false)

  let resizeObserver: ResizeObserver | undefined

  let scrollRefreshFrame: number | undefined
  let metricsFrame: number | undefined
  let disposed = false

  let horizontalScrollbarDragSnapshot: HorizontalScrollbarDragSnapshot | undefined

  const hasHorizontalOverflow = computed(() => horizontalMaxScrollLeft.value > 1)

  const horizontalScrollbarThumbStyle = computed<CSSProperties>(() => {
    if (
      !hasHorizontalOverflow.value ||
      horizontalRailWidth.value <= 0 ||
      horizontalViewportWidth.value <= 0 ||
      horizontalScrollWidth.value <= 0
    ) {
      return {
        width: '0px',
        transform: 'translate3d(0, 0, 0)',
      }
    }

    const thumbWidth = clamp(
      (horizontalViewportWidth.value / horizontalScrollWidth.value) * horizontalRailWidth.value,
      36,
      horizontalRailWidth.value,
    )
    const thumbTravel = Math.max(0, horizontalRailWidth.value - thumbWidth)
    const thumbLeft =
      horizontalMaxScrollLeft.value > 0
        ? (horizontalScrollLeft.value / horizontalMaxScrollLeft.value) * thumbTravel
        : 0

    return {
      width: `${thumbWidth}px`,
      transform: `translate3d(${clamp(thumbLeft, 0, thumbTravel)}px, 0, 0)`,
    }
  })

  function handleScroll(event: Event) {
    const target = event.target as HTMLElement

    virtualScrollTop.value = target.scrollTop
    horizontalScrollLeft.value = target.scrollLeft
    horizontalViewportWidth.value = target.clientWidth
    horizontalScrollWidth.value = target.scrollWidth
    horizontalMaxScrollLeft.value = getHorizontalMaxScrollLeft(target)
    hasVerticalOverflow.value = getVerticalOverflow(target)
    updateHorizontalRailMetrics()
    emit('scroll', event)
  }

  function updateHorizontalRailMetrics() {
    horizontalRailWidth.value = horizontalRailRef.value?.clientWidth ?? 0
  }

  function updateScrollViewportMetrics() {
    const viewport = scrollRef.value?.viewport

    virtualViewportHeight.value = viewport?.clientHeight ?? 0
    horizontalViewportWidth.value = viewport?.clientWidth ?? 0
    horizontalScrollWidth.value = viewport?.scrollWidth ?? 0
    horizontalScrollLeft.value = viewport?.scrollLeft ?? 0
    horizontalMaxScrollLeft.value = viewport ? getHorizontalMaxScrollLeft(viewport) : 0
    hasVerticalOverflow.value = viewport ? getVerticalOverflow(viewport) : false
    updateHorizontalRailMetrics()
  }

  function refreshScrollState() {
    void nextTick(() => {
      if (disposed) return
      scrollRef.value?.update()
      updateScrollViewportMetrics()

      if (!isBrowser() || typeof window.requestAnimationFrame !== 'function') {
        return
      }

      if (scrollRefreshFrame !== undefined) {
        window.cancelAnimationFrame(scrollRefreshFrame)
      }

      scrollRefreshFrame = window.requestAnimationFrame(() => {
        scrollRefreshFrame = undefined
        scrollRef.value?.update()
        updateScrollViewportMetrics()
      })
    })
  }

  function getHorizontalMaxScrollLeft(viewport: HTMLElement) {
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    const threshold = hasHorizontalOverflow.value ? scrollbarOverflowTolerance - 2 : scrollbarOverflowTolerance
    const overflow = scrollRef.value?.hasHorizontalOverflow ?? maxScrollLeft > threshold
    return overflow || (hasHorizontalOverflow.value && maxScrollLeft > threshold) ? maxScrollLeft : 0
  }

  function getVerticalOverflow(viewport: HTMLElement) {
    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    const overflow = scrollRef.value?.hasVerticalOverflow ?? maxScrollTop > scrollbarOverflowTolerance
    return overflow || (hasVerticalOverflow.value && maxScrollTop > scrollbarOverflowTolerance - 2)
  }

  function setHorizontalScrollLeft(scrollLeft: number) {
    const viewport = scrollRef.value?.viewport

    if (!viewport) {
      return
    }

    viewport.scrollLeft = clamp(scrollLeft, 0, getHorizontalMaxScrollLeft(viewport))
    updateScrollViewportMetrics()
  }

  function getHorizontalThumbTravel() {
    if (
      horizontalRailWidth.value <= 0 ||
      horizontalViewportWidth.value <= 0 ||
      horizontalScrollWidth.value <= 0
    ) {
      return 0
    }

    const thumbWidth = clamp(
      (horizontalViewportWidth.value / horizontalScrollWidth.value) * horizontalRailWidth.value,
      36,
      horizontalRailWidth.value,
    )

    return Math.max(0, horizontalRailWidth.value - thumbWidth)
  }

  function handleHorizontalRailPointerDown(event: PointerEvent) {
    if (!hasHorizontalOverflow.value || !horizontalRailRef.value) {
      return
    }

    event.preventDefault()
    scrollRef.value?.stop()
    updateHorizontalRailMetrics()
    const railRect = horizontalRailRef.value.getBoundingClientRect()
    const thumbTravel = getHorizontalThumbTravel()

    if (thumbTravel <= 0) {
      return
    }

    const thumbWidth = horizontalRailWidth.value - thumbTravel
    const nextThumbLeft = clamp(event.clientX - railRect.left - thumbWidth / 2, 0, thumbTravel)
    const nextScrollLeft =
      (nextThumbLeft / thumbTravel) * Math.max(1, horizontalMaxScrollLeft.value)

    setHorizontalScrollLeft(nextScrollLeft)
  }

  function beginHorizontalScrollbarDrag(event: PointerEvent) {
    if (!hasHorizontalOverflow.value) {
      return
    }

    scrollRef.value?.stop()
    updateHorizontalRailMetrics()
    const thumbTravel = getHorizontalThumbTravel()

    if (thumbTravel <= 0 || !isBrowser()) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    horizontalScrollbarDragSnapshot = {
      maxScrollLeft: horizontalMaxScrollLeft.value,
      startClientX: event.clientX,
      startScrollLeft: horizontalScrollLeft.value,
      thumbTravel,
    }
    isDraggingHorizontalScrollbar.value = true
    interactionStyle.previousCursor = document.documentElement.style.cursor
    interactionStyle.previousUserSelect = document.documentElement.style.userSelect
    document.documentElement.style.cursor = 'grabbing'
    document.documentElement.style.userSelect = 'none'
    window.addEventListener('pointermove', handleHorizontalScrollbarDragMove)
    window.addEventListener('pointerup', finishHorizontalScrollbarDrag)
    window.addEventListener('pointercancel', finishHorizontalScrollbarDrag)
  }

  function handleHorizontalScrollbarDragMove(event: PointerEvent) {
    if (!horizontalScrollbarDragSnapshot) {
      return
    }

    const delta = event.clientX - horizontalScrollbarDragSnapshot.startClientX
    const scrollDelta =
      (delta / horizontalScrollbarDragSnapshot.thumbTravel) *
      horizontalScrollbarDragSnapshot.maxScrollLeft

    setHorizontalScrollLeft(horizontalScrollbarDragSnapshot.startScrollLeft + scrollDelta)
  }

  function finishHorizontalScrollbarDrag() {
    if (!horizontalScrollbarDragSnapshot || !isBrowser()) {
      horizontalScrollbarDragSnapshot = undefined
      isDraggingHorizontalScrollbar.value = false
      return
    }

    horizontalScrollbarDragSnapshot = undefined
    isDraggingHorizontalScrollbar.value = false
    document.documentElement.style.cursor = interactionStyle.previousCursor
    document.documentElement.style.userSelect = interactionStyle.previousUserSelect
    window.removeEventListener('pointermove', handleHorizontalScrollbarDragMove)
    window.removeEventListener('pointerup', finishHorizontalScrollbarDrag)
    window.removeEventListener('pointercancel', finishHorizontalScrollbarDrag)
  }

  function scrollTo(top: number) {
    if (!scrollRef.value) {
      return
    }

    scrollRef.value.scrollTo(Math.max(0, top))
    virtualScrollTop.value = scrollRef.value.viewport?.scrollTop ?? 0
    updateScrollViewportMetrics()
  }

  function setupResizeObserver() {
    resizeObserver?.disconnect()
    resizeObserver = undefined

    if (!isBrowser() || typeof ResizeObserver === 'undefined') {
      updateScrollViewportMetrics()
      window.addEventListener('resize', updateScrollViewportMetrics)
      return
    }

    resizeObserver = new ResizeObserver(scheduleMetrics)

    if (scrollRef.value?.viewport) {
      resizeObserver.observe(scrollRef.value.viewport)
    }

    if (horizontalRailRef.value) {
      resizeObserver.observe(horizontalRailRef.value)
    }

    updateScrollViewportMetrics()
  }

  function scheduleMetrics() {
    if (disposed || metricsFrame !== undefined || !isBrowser()) return
    metricsFrame = window.requestAnimationFrame(() => {
      metricsFrame = undefined
      scrollRef.value?.update()
      updateScrollViewportMetrics()
    })
  }
  // 固定高度视口中的内容增高不会触发视口 ResizeObserver，订阅 Scrollbar 的溢出状态。
  watch(() => [scrollRef.value?.hasVerticalOverflow, scrollRef.value?.hasHorizontalOverflow], scheduleMetrics)

  onMounted(() => {
    void nextTick(() => {
      if (disposed) return
      setupResizeObserver()
      refreshScrollState()
    })
  })
  onBeforeUnmount(() => {
    disposed = true
    finishHorizontalScrollbarDrag()
    resizeObserver?.disconnect()
    resizeObserver = undefined
    if (metricsFrame !== undefined && isBrowser()) window.cancelAnimationFrame(metricsFrame)
    if (scrollRefreshFrame !== undefined && isBrowser()) {
      window.cancelAnimationFrame(scrollRefreshFrame)
      scrollRefreshFrame = undefined
    }
    if (isBrowser()) {
      window.removeEventListener('resize', updateScrollViewportMetrics)
    }
  })
  return {
    horizontalScrollLeft, horizontalMaxScrollLeft, hasVerticalOverflow, hasHorizontalOverflow,
    isDraggingHorizontalScrollbar, horizontalScrollbarThumbStyle, handleScroll, refreshScrollState,
    handleHorizontalRailPointerDown, beginHorizontalScrollbarDrag, scrollTo,
  }
}
