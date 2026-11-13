import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch, type CSSProperties, type Ref } from 'vue'
import { useReducedMotion } from '../../../motion/reducedMotion'
import type { BingTableColumn, BingTableProps } from '../BingTable.types'
import type { BingTableFlatRow, BingTablePagerSnapshot } from '../BingTable.internal'
import { isBrowser } from '../BingTable.utils'

interface BingTablePaginationLayoutSnapshot {
  top: number
  left: number
  width: number
  reserve: number
}

type MotionProps = Required<Pick<BingTableProps, 'preservePageHeight' | 'pagination' | 'remotePagination' | 'loading'>> & Pick<BingTableProps, 'height'>
interface MotionOptions {
  rootRef: Readonly<Ref<HTMLElement | null>>
  frameRef: Readonly<Ref<HTMLElement | null>>
  paginationRef: Readonly<Ref<HTMLElement | null>>
  isBusy: Readonly<Ref<boolean>>
  usesVirtualRows: Readonly<Ref<boolean>>
  visibleFlatRows: Readonly<Ref<BingTableFlatRow[]>>
  visibleColumns: Readonly<Ref<BingTableColumn[]>>
  effectivePage: Readonly<Ref<number>>
  effectivePageSize: Readonly<Ref<number>>
  totalItems: Readonly<Ref<number>>
  normalizedVirtualRowHeight: Readonly<Ref<number>>
  currentPagerSnapshot: Readonly<Ref<BingTablePagerSnapshot>>
  refreshScrollState: () => void
}

export function useTableMotion(
  props: MotionProps,
  {
    rootRef, frameRef, paginationRef, isBusy, usesVirtualRows, visibleFlatRows, visibleColumns,
    effectivePage, effectivePageSize, totalItems, normalizedVirtualRowHeight, currentPagerSnapshot,
    refreshScrollState,
  }: MotionOptions,
) {
  const prefersReducedMotion = useReducedMotion()

  const loadingFrameHeight = ref<number | null>(null)

  const frameHeightStyle = ref<string | null>(null)

  const isFrameHeightAnimating = ref(false)

  const isPageSizeTransitioning = ref(false)

  const pageSizeVisibleRowsSnapshot = ref<BingTableFlatRow[] | null>(null)

  const isPaginationLayoutFloating = ref(false)

  const paginationLayoutReserve = ref<number | null>(null)

  const paginationMotionStyle = shallowRef<CSSProperties | undefined>(undefined)

  const pagerSnapshot = ref<BingTablePagerSnapshot | null>(null)

  let frameHeightAnimationFrame: number | undefined

  let frameHeightTransitionTimer: number | undefined

  let pageSizeTransitionTimer: number | undefined

  let paginationMotionFrame: number | undefined

  let paginationLayoutSnapshot: BingTablePaginationLayoutSnapshot | undefined

  let pageSizeFrameStartHeight: number | undefined

  const frameStyle = computed<CSSProperties | undefined>(() => {
    if (isBusy.value && loadingFrameHeight.value !== null) {
      return { height: `${loadingFrameHeight.value}px` }
    }

    return frameHeightStyle.value ? { height: frameHeightStyle.value } : undefined
  })

  const transitionVisibleFlatRows = computed(() =>
    isPageSizeTransitioning.value && pageSizeVisibleRowsSnapshot.value
      ? pageSizeVisibleRowsSnapshot.value
      : visibleFlatRows.value,
  )

  const pageSizeRetainedRowCount = computed(() =>
    pageSizeVisibleRowsSnapshot.value
      ? Math.max(0, pageSizeVisibleRowsSnapshot.value.length - visibleFlatRows.value.length)
      : 0,
  )

  const shouldPreservePageHeight = computed(
    () =>
      props.preservePageHeight &&
      props.pagination &&
      props.height === undefined &&
      !usesVirtualRows.value,
  )

  const pageFillerRowCount = computed(() => {
    if (
      !shouldPreservePageHeight.value ||
      !visibleColumns.value.length ||
      !visibleFlatRows.value.length ||
      totalItems.value === 0
    ) {
      return 0
    }

    const targetRowCount = Math.min(effectivePageSize.value, totalItems.value)

    return Math.max(0, targetRowCount - visibleFlatRows.value.length)
  })

  const frameHeightTransitionSignature = computed(() =>
    [
      props.pagination ? 'paginated' : 'plain',
      isBusy.value ? 'loading' : 'ready',
      props.height === undefined ? 'auto-height' : 'fixed-height',
      usesVirtualRows.value ? 'virtual' : 'static',
      effectivePage.value,
      effectivePageSize.value,
      visibleFlatRows.value.length,
      pageFillerRowCount.value,
      visibleColumns.value.length,
    ].join('|'),
  )

  const displayedPagerSnapshot = computed(
    () => pagerSnapshot.value ?? currentPagerSnapshot.value,
  )

  function getFrameContentHeight(frame: HTMLElement) {
    const scroll = frame.querySelector<HTMLElement>(':scope > .bing-table__scroll')
    const horizontalScrollbar = frame.querySelector<HTMLElement>(
      ':scope > .bing-table__horizontal-scrollbar',
    )
    const scrollHeight = scroll?.getBoundingClientRect().height ?? 0
    const horizontalScrollbarHeight = horizontalScrollbar?.getBoundingClientRect().height ?? 0

    return scrollHeight + horizontalScrollbarHeight
  }

  function getPageSizeRetainedRowsHeight() {
    return pageSizeRetainedRowCount.value * normalizedVirtualRowHeight.value
  }

  function clearPageSizeTransitionTimer() {
    if (!isBrowser()) {
      pageSizeTransitionTimer = undefined
      return
    }

    if (pageSizeTransitionTimer !== undefined) {
      window.clearTimeout(pageSizeTransitionTimer)
      pageSizeTransitionTimer = undefined
    }
  }

  function canRunFrameHeightTransition() {
    return (
      Boolean(frameRef.value) &&
      props.height === undefined &&
      !usesVirtualRows.value &&
      !prefersReducedMotion()
    )
  }

  function getPaginationLayoutSnapshot(): BingTablePaginationLayoutSnapshot | undefined {
    const root = rootRef.value
    const frame = frameRef.value
    const pagination = paginationRef.value

    if (!root || !frame || !pagination) {
      return undefined
    }

    const rootRect = root.getBoundingClientRect()
    const frameRect = frame.getBoundingClientRect()
    const paginationRect = pagination.getBoundingClientRect()

    if (paginationRect.width <= 0 || paginationRect.height <= 0) {
      return undefined
    }

    return {
      top: paginationRect.top - rootRect.top,
      left: paginationRect.left - rootRect.left,
      width: paginationRect.width,
      reserve: Math.max(0, paginationRect.bottom - frameRect.bottom),
    }
  }

  function getPaginationFloatingStyle(
    snapshot: BingTablePaginationLayoutSnapshot,
    transform: string,
    transition = 'none',
  ): CSSProperties {
    return {
      position: 'absolute',
      top: `${snapshot.top}px`,
      left: `${snapshot.left}px`,
      width: `${snapshot.width}px`,
      transform,
      transition,
    }
  }

  function clearPaginationLayoutTransition() {
    if (paginationMotionFrame !== undefined && isBrowser()) {
      window.cancelAnimationFrame(paginationMotionFrame)
    }

    paginationMotionFrame = undefined
    paginationLayoutSnapshot = undefined
    paginationLayoutReserve.value = null
    paginationMotionStyle.value = undefined
    isPaginationLayoutFloating.value = false
  }

  function beginPaginationLayoutTransition() {
    clearPaginationLayoutTransition()

    const snapshot = getPaginationLayoutSnapshot()

    if (!snapshot) {
      return
    }

    paginationLayoutSnapshot = snapshot
    paginationLayoutReserve.value = snapshot.reserve
    paginationMotionStyle.value = getPaginationFloatingStyle(
      snapshot,
      'translate3d(0, 0, 0)',
    )
    isPaginationLayoutFloating.value = true
  }

  function animatePaginationLayoutTransition(startHeight: number, endHeight: number) {
    const snapshot = paginationLayoutSnapshot
    const distance = endHeight - startHeight

    if (!snapshot || !isPaginationLayoutFloating.value || Math.abs(distance) < 1) {
      return
    }

    const targetTransform = `translate3d(0, ${distance}px, 0)`
    const targetTransition = 'transform 260ms var(--bing-ease-smooth)'

    if (!isBrowser() || typeof window.requestAnimationFrame !== 'function') {
      paginationMotionStyle.value = getPaginationFloatingStyle(
        snapshot,
        targetTransform,
        targetTransition,
      )
      return
    }

    paginationMotionFrame = window.requestAnimationFrame(() => {
      paginationMotionFrame = undefined
      paginationMotionStyle.value = getPaginationFloatingStyle(
        snapshot,
        targetTransform,
        targetTransition,
      )
    })
  }

  function clonePagerSnapshot(snapshot: BingTablePagerSnapshot): BingTablePagerSnapshot {
    return {
      page: snapshot.page,
      pageCount: snapshot.pageCount,
      pageNumbers: [...snapshot.pageNumbers],
    }
  }

  function finishPageSizeTransition() {
    clearPageSizeTransitionTimer()
    clearPaginationLayoutTransition()
    pageSizeFrameStartHeight = undefined
    pagerSnapshot.value = null
    pageSizeVisibleRowsSnapshot.value = null
    isPageSizeTransitioning.value = false
  }

  function captureShrinkingPageSizeRows(nextPageSize: number) {
    pageSizeVisibleRowsSnapshot.value = null

    if (
      !props.pagination ||
      props.remotePagination ||
      props.loading ||
      usesVirtualRows.value ||
      nextPageSize >= effectivePageSize.value ||
      visibleFlatRows.value.length <= nextPageSize
    ) {
      return
    }

    pageSizeVisibleRowsSnapshot.value = [...visibleFlatRows.value]
  }

  function beginPageSizeTransition(nextPageSize: number) {
    if (!canRunFrameHeightTransition()) {
      pageSizeVisibleRowsSnapshot.value = null
      return
    }

    clearPageSizeTransitionTimer()
    captureShrinkingPageSizeRows(nextPageSize)
    pageSizeFrameStartHeight = frameRef.value?.getBoundingClientRect().height
    beginPaginationLayoutTransition()
    pagerSnapshot.value = clonePagerSnapshot(currentPagerSnapshot.value)
    isPageSizeTransitioning.value = true

    if (isBrowser()) {
      pageSizeTransitionTimer = window.setTimeout(finishPageSizeTransition, 420)
    }
  }

  function clearFrameHeightTransitionTimers() {
    if (!isBrowser()) {
      frameHeightAnimationFrame = undefined
      frameHeightTransitionTimer = undefined
      return
    }

    if (frameHeightAnimationFrame !== undefined) {
      window.cancelAnimationFrame(frameHeightAnimationFrame)
      frameHeightAnimationFrame = undefined
    }

    if (frameHeightTransitionTimer !== undefined) {
      window.clearTimeout(frameHeightTransitionTimer)
      frameHeightTransitionTimer = undefined
    }
  }

  function finishFrameHeightTransition() {
    clearFrameHeightTransitionTimers()
    frameHeightStyle.value = null
    isFrameHeightAnimating.value = false
    finishPageSizeTransition()
    refreshScrollState()
  }

  function scheduleFrameHeightTargetUpdate(callback: () => void) {
    if (!isBrowser() || typeof window.requestAnimationFrame !== 'function') {
      callback()
      return
    }

    frameHeightAnimationFrame = window.requestAnimationFrame(() => {
      if (!isPageSizeTransitioning.value) {
        frameHeightAnimationFrame = undefined
        callback()
        return
      }

      frameHeightAnimationFrame = window.requestAnimationFrame(() => {
        frameHeightAnimationFrame = undefined
        callback()
      })
    })
  }

  function animateFrameHeightChange() {
    const frame = frameRef.value

    if (
      !frame ||
      isBusy.value ||
      props.height !== undefined ||
      usesVirtualRows.value ||
      prefersReducedMotion()
    ) {
      return
    }

    const startHeight = pageSizeFrameStartHeight ?? frame.getBoundingClientRect().height
    pageSizeFrameStartHeight = undefined

    if (startHeight <= 0) {
      return
    }

    clearFrameHeightTransitionTimers()
    frameHeightStyle.value = `${startHeight}px`
    isFrameHeightAnimating.value = true

    void nextTick(() => {
      const currentFrame = frameRef.value

      if (!currentFrame) {
        finishFrameHeightTransition()
        return
      }

      const endHeight = Math.max(
        0,
        getFrameContentHeight(currentFrame) - getPageSizeRetainedRowsHeight(),
      )

      if (endHeight <= 0 || Math.abs(endHeight - startHeight) < 1) {
        finishFrameHeightTransition()
        return
      }

      if (!isBrowser() || typeof window.requestAnimationFrame !== 'function') {
        frameHeightStyle.value = `${endHeight}px`
        finishFrameHeightTransition()
        return
      }

      scheduleFrameHeightTargetUpdate(() => {
        animatePaginationLayoutTransition(startHeight, endHeight)
        frameHeightStyle.value = `${endHeight}px`
        frameHeightTransitionTimer = window.setTimeout(finishFrameHeightTransition, 340)
      })
    })
  }

  function handleFrameHeightTransitionEnd(event: TransitionEvent) {
    if (event.target !== frameRef.value || event.propertyName !== 'height') {
      return
    }

    finishFrameHeightTransition()
  }

  watch(isBusy, (busy) => {
    if (busy) {
      const height = frameRef.value?.getBoundingClientRect().height ?? 0
      loadingFrameHeight.value = height > 0 ? height : null
      clearFrameHeightTransitionTimers()
      frameHeightStyle.value = null
      isFrameHeightAnimating.value = false
      finishPageSizeTransition()
    } else {
      loadingFrameHeight.value = null
    }
  })
  // 先让装配层初始化默认展开，再订阅高度，避免初次展开触发额外过渡。
  function observeFrameHeight() {
    watch(frameHeightTransitionSignature, animateFrameHeightChange, { flush: 'pre' })
  }
  onBeforeUnmount(() => {
    clearFrameHeightTransitionTimers()
    clearPageSizeTransitionTimer()
    clearPaginationLayoutTransition()
  })
  return {
    frameStyle, isFrameHeightAnimating, isPageSizeTransitioning, isPaginationLayoutFloating,
    paginationLayoutReserve, paginationMotionStyle, transitionVisibleFlatRows,
    shouldPreservePageHeight, pageFillerRowCount, displayedPagerSnapshot, beginPageSizeTransition,
    handleFrameHeightTransitionEnd, observeFrameHeight,
  }
}
