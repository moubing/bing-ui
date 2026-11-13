import type { Ref } from 'vue'
import type { BingScrollbarExpose } from '../../BingScrollbar/BingScrollbar.types'

/** 固定列、表头和滚动条共用的可阅读区域；不再让原生 scrollIntoView 隐藏焦点。 */
export function useTableViewport(options: {
  rootRef: Readonly<Ref<HTMLElement | null>>
  scrollRef: Readonly<Ref<BingScrollbarExpose | null>>
  leftWidth: Readonly<Ref<number>>
  rightWidth: Readonly<Ref<number>>
  gutter: Readonly<Ref<number>>
}) {
  function bounds() {
    const viewport = options.scrollRef.value?.viewport
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const headerHeight = options.rootRef.value?.querySelector('.bing-table__head')?.getBoundingClientRect().height ?? 0
    return {
      viewport, headerHeight,
      left: rect.left + viewport.clientLeft + options.leftWidth.value,
      right: rect.left + viewport.clientLeft + viewport.clientWidth - options.rightWidth.value - options.gutter.value,
      top: rect.top + viewport.clientTop + headerHeight,
      bottom: rect.top + viewport.clientTop + viewport.clientHeight,
    }
  }
  function reveal(element: HTMLElement, nearest = true, horizontal = true) {
    const area = bounds()
    if (!area) return
    const cell = element.closest<HTMLElement>('td,th') ?? element
    const rect = element.getBoundingClientRect()
    const isHeader = Boolean(cell.closest('thead'))
    const delta = (start: number, end: number, min: number, max: number) =>
      !nearest || end - start > max - min || start < min ? start - min : Math.max(0, end - max)
    options.scrollRef.value?.stop()
    // 固定列本身始终停留在边缘，聚焦它不应改变正文的横向阅读位置。
    if (horizontal && !cell.matches('.is-fixed-left,.is-fixed-right')) {
      area.viewport.scrollLeft += delta(rect.left, rect.right, area.left, Math.max(area.left, area.right))
    }
    if (!isHeader) area.viewport.scrollTop += delta(rect.top, rect.bottom, area.top, area.bottom)
  }
  return { bounds, reveal }
}
