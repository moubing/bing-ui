import { computed, nextTick, ref } from 'vue'
import type { CSSProperties, Ref } from 'vue'
import type { BingScrollbarExpose } from '../components/BingScrollbar/BingScrollbar.types'
import { clampToRange } from './floating'

/** 虚拟列表上下各留出的内边距总和，和面板内容区的上下 padding 对应。 */
export const VIRTUAL_LIST_PADDING_Y = 18

export interface UseVirtualListOptions {
  /** 当前可见条目总数（已过滤）。 */
  count: () => number
  /** `true` 强制开启，`false` 关闭，`'auto'` 超过阈值后开启。 */
  mode: () => boolean | 'auto'
  threshold: () => number
  /** 已归一化的固定行高。 */
  itemHeight: () => number
  overscan: () => number
  scrollbar: Ref<BingScrollbarExpose | null>
  /** 面板滚动区域的计算高度，视口还没挂载时用它兜底。 */
  fallbackViewportHeight: Ref<number>
  /** 写在面板内容区上的行高 CSS 变量名。 */
  itemHeightVar: string
}

/**
 * 固定行高的虚拟列表窗口计算，配合 BingScrollbar 使用。
 */
export function useVirtualList(options: UseVirtualListOptions) {
  const { scrollbar, fallbackViewportHeight } = options
  const scrollTop = ref(0)
  const viewportHeight = ref(0)

  const enabled = computed(() => {
    const mode = options.mode()
    const count = options.count()

    if (mode === true) {
      return count > 0
    }

    if (mode === false) {
      return false
    }

    return count > options.threshold()
  })

  const totalHeight = computed(() => (enabled.value ? options.count() * options.itemHeight() : 0))

  const startIndex = computed(() => {
    if (!enabled.value) {
      return 0
    }

    const rawStart = Math.floor(scrollTop.value / options.itemHeight())

    return clampToRange(rawStart - options.overscan(), 0, options.count())
  })

  const endIndex = computed(() => {
    if (!enabled.value) {
      return options.count()
    }

    const height = viewportHeight.value || fallbackViewportHeight.value || options.itemHeight()
    const rawEnd = Math.ceil((scrollTop.value + height) / options.itemHeight())

    return clampToRange(rawEnd + options.overscan(), startIndex.value, options.count())
  })

  const bodyStyle = computed<CSSProperties | undefined>(() => {
    if (!enabled.value) {
      return undefined
    }

    return {
      height: `${totalHeight.value + VIRTUAL_LIST_PADDING_Y}px`,
      [options.itemHeightVar]: `${options.itemHeight()}px`,
    } as CSSProperties
  })

  const stackStyle = computed<CSSProperties | undefined>(() => {
    if (!enabled.value) {
      return undefined
    }

    const offsetY = startIndex.value * options.itemHeight()

    return {
      transform: `translate3d(0, ${offsetY + VIRTUAL_LIST_PADDING_Y / 2}px, 0)`,
    }
  })

  /** 面板内容的自然高度：开启时按行高推算，否则返回 `undefined` 交给 DOM 测量。 */
  function getContentHeight() {
    return enabled.value ? totalHeight.value + VIRTUAL_LIST_PADDING_Y : undefined
  }

  function readViewport(viewport: HTMLElement) {
    scrollTop.value = viewport.scrollTop
    viewportHeight.value = viewport.clientHeight || fallbackViewportHeight.value
  }

  /** 从滚动视口同步当前位置和高度。 */
  function sync() {
    const viewport = scrollbar.value?.viewport

    if (!viewport) {
      viewportHeight.value = fallbackViewportHeight.value
      return
    }

    readViewport(viewport)
  }

  /** 下一帧同步视口，并刷新滚动条尺寸。 */
  function refresh() {
    void nextTick(() => {
      sync()
      scrollbar.value?.update()
    })
  }

  /** 滚回顶部。 */
  function reset() {
    scrollTop.value = 0
    scrollbar.value?.stop()
    scrollbar.value?.scrollTo(0)

    const viewport = scrollbar.value?.viewport

    viewportHeight.value = viewport?.clientHeight || fallbackViewportHeight.value
    scrollbar.value?.update()
  }

  /** 条目变少后把滚动位置收回有效范围。 */
  function clampScroll() {
    if (!enabled.value) {
      scrollTop.value = 0
      return
    }

    const height = viewportHeight.value || fallbackViewportHeight.value || options.itemHeight()
    const maxScrollTop = Math.max(0, totalHeight.value - height)

    if (scrollTop.value <= maxScrollTop) {
      return
    }

    scrollbar.value?.scrollTo(maxScrollTop)
    scrollTop.value = maxScrollTop
  }

  /**
   * 把指定位置的条目滚进视口（仅在开启虚拟列表时调用）。
   * 需要滚动时先调用 `beforeScroll`，返回是否找到了视口。
   */
  function scrollToIndex(
    index: number,
    { offsetTop = VIRTUAL_LIST_PADDING_Y / 2, beforeScroll }: { offsetTop?: number; beforeScroll?: () => void } = {},
  ) {
    const viewport = scrollbar.value?.viewport

    if (!viewport || index < 0) {
      return false
    }

    const itemHeight = options.itemHeight()
    const itemTop = index * itemHeight + offsetTop
    const itemBottom = itemTop + itemHeight
    const height = viewport.clientHeight || fallbackViewportHeight.value
    const viewportTop = viewport.scrollTop
    let nextTop = viewportTop

    if (itemTop < viewportTop) {
      nextTop = itemTop
    } else if (itemBottom > viewportTop + height) {
      nextTop = itemBottom - height
    }

    if (Math.abs(nextTop - viewportTop) > 0.5) {
      beforeScroll?.()
      scrollbar.value?.scrollTo(nextTop)
    }

    sync()
    scrollbar.value?.update()

    return true
  }

  return {
    enabled,
    scrollTop,
    viewportHeight,
    totalHeight,
    startIndex,
    endIndex,
    bodyStyle,
    stackStyle,
    getContentHeight,
    readViewport,
    sync,
    refresh,
    reset,
    clampScroll,
    scrollToIndex,
  }
}
