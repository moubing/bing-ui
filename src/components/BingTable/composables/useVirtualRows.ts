import { computed, nextTick, provide, ref, watch, type Ref } from 'vue'
import type { BingTableKey, BingTableProps, BingTableSize } from '../BingTable.types'
import type { BingTableFlatRow } from '../BingTable.internal'
import type { BingScrollbarExpose } from '../../BingScrollbar/BingScrollbar.types'
import { bingTableMeasurementsKey, createTableMeasurements } from '../BingTable.measurements'
import { isBrowser } from '../BingTable.utils'
import { TableHeightIndex } from './tableHeightIndex'

type VirtualProps = Required<Pick<BingTableProps, 'virtual' | 'virtualThreshold' | 'virtualOverscan'>> & Pick<BingTableProps, 'virtualRowHeight'>
interface VirtualOptions {
  resolvedSize: Readonly<Ref<BingTableSize>>
  visibleFlatRows: Readonly<Ref<BingTableFlatRow[]>>
  transitionVisibleFlatRows: Readonly<Ref<BingTableFlatRow[]>>
  rootRef: Readonly<Ref<HTMLElement | null>>
  scrollRef: Readonly<Ref<BingScrollbarExpose | null>>
  focusedRowKey?: Readonly<Ref<BingTableKey | null>>
  allKnownFlatRows?: Readonly<Ref<BingTableFlatRow[]>>
  viewportBounds: () => { top: number; bottom: number } | undefined
  revealRow: (row: HTMLElement, nearest: boolean) => void
}

export function useVirtualRows(
  props: VirtualProps,
  { resolvedSize, visibleFlatRows, transitionVisibleFlatRows, rootRef, scrollRef, focusedRowKey, allKnownFlatRows, viewportBounds, revealRow }: VirtualOptions,
) {
  const virtualScrollTop = ref(0)
  const virtualViewportHeight = ref(0)
  const revision = ref(0)
  const resetVersion = ref(0)
  const heights = new Map<BingTableKey, number>()
  let scrollRequest = 0
  let pendingScroll: { position: () => void; expected: number; scrollHeight: number } | undefined
  function cancelPendingScroll() { pendingScroll = undefined; scrollRequest++ }
  watch(virtualScrollTop, value => {
    if (!pendingScroll || Math.abs(value - pendingScroll.expected) <= 1) return
    const height = scrollRef.value?.viewport?.scrollHeight
    // DOM 窗口提交或实测行缩短引起的原生钳制，不应取消正在定位的行。
    if (height !== undefined && height !== pendingScroll.scrollHeight) {
      pendingScroll.expected = value
      pendingScroll.scrollHeight = height
    } else cancelPendingScroll()
  }, { flush: 'sync' })
  const minimumRowHeight = computed(() => ({ sm: 36, md: 40, lg: 44 }[resolvedSize.value]))
  const normalizedVirtualRowHeight = computed(() =>
    Math.max(32, Math.floor(props.virtualRowHeight ?? minimumRowHeight.value)),
  )
  const normalizedVirtualOverscan = computed(() => Math.max(0, Math.floor(props.virtualOverscan)))
  const usesVirtualRows = computed(() => props.virtual === true
    ? visibleFlatRows.value.length > 0
    : props.virtual !== false && visibleFlatRows.value.length > Math.max(0, Math.floor(props.virtualThreshold)))
  const rowPositions = computed(() => new Map(visibleFlatRows.value.map((item, index) => [item.key, index])))
  const heightIndex = computed(() => {
    void resetVersion.value
    return new TableHeightIndex(visibleFlatRows.value.map(item => heights.get(item.key) ?? normalizedVirtualRowHeight.value))
  })
  const virtualStartIndex = computed(() => {
    void revision.value
    return usesVirtualRows.value
      ? Math.max(0, heightIndex.value.indexAt(virtualScrollTop.value) - normalizedVirtualOverscan.value) : 0
  })
  const virtualEndIndex = computed(() => {
    void revision.value
    return usesVirtualRows.value
      ? Math.min(visibleFlatRows.value.length,
        heightIndex.value.indexAt(virtualScrollTop.value + (virtualViewportHeight.value || normalizedVirtualRowHeight.value * 10)) + normalizedVirtualOverscan.value + 1)
      : visibleFlatRows.value.length
  })
  const renderedEntries = computed(() => {
    void revision.value
    if (!usesVirtualRows.value) return transitionVisibleFlatRows.value.map(item => ({ item, gap: 0 }))
    const rows = visibleFlatRows.value
    const indices = new Set<number>()
    for (let i = virtualStartIndex.value; i < virtualEndIndex.value; i++) indices.add(i)
    const key = focusedRowKey?.value
    const pinned = key !== null && key !== undefined ? rowPositions.value.get(key) : undefined
    if (pinned !== undefined) indices.add(pinned)
    let previousEnd = 0
    return [...indices].sort((a, b) => a - b).map(index => {
      const offset = heightIndex.value.offset(index)
      const gap = Math.max(0, offset - previousEnd)
      previousEnd = heightIndex.value.offset(index + 1)
      return { item: rows[index]!, gap }
    })
  })
  const renderedRows = computed(() => renderedEntries.value.map(entry => entry.item))
  const virtualBottomSpacerHeight = computed(() => {
    void revision.value
    if (!usesVirtualRows.value) return 0
    const last = renderedRows.value.at(-1)
    const index = last ? rowPositions.value.get(last.key) ?? -1 : -1
    return Math.max(0, heightIndex.value.offset(visibleFlatRows.value.length) - heightIndex.value.offset(index + 1))
  })

  function scrollToRow(key: BingTableKey, nearest = false) {
    const index = rowPositions.value.get(key)
    const viewport = scrollRef.value?.viewport
    if (index === undefined || !viewport) return
    scrollRef.value?.stop()
    if (!usesVirtualRows.value) {
      const row = rootRef.value?.querySelector<HTMLElement>('.bing-table__row[data-row-index="' + index + '"]')
      if (row) revealRow(row, nearest)
      virtualScrollTop.value = viewport.scrollTop
      return
    }
    const request = ++scrollRequest
    const position = () => {
      const currentIndex = rowPositions.value.get(key)
      if (request !== scrollRequest || scrollRef.value?.viewport !== viewport || currentIndex === undefined) return
      const top = heightIndex.value.offset(currentIndex)
      const bottom = heightIndex.value.offset(currentIndex + 1)
      const area = viewportBounds()
      const height = Math.max(1, area ? area.bottom - area.top : viewport.clientHeight)
      if (nearest && top >= viewport.scrollTop && bottom <= viewport.scrollTop + height) return
      const target = nearest && bottom > viewport.scrollTop + height ? bottom - height : top
      viewport.scrollTop = Math.max(0, target)
      if (pendingScroll?.position === position) {
        pendingScroll.expected = viewport.scrollTop
        pendingScroll.scrollHeight = viewport.scrollHeight
      }
      virtualScrollTop.value = viewport.scrollTop
    }
    pendingScroll = { position, expected: viewport.scrollTop, scrollHeight: viewport.scrollHeight }
    position()
    // 保留焦点行的窗口换位会暂时移除大 spacer，浏览器可能同步钳制 scrollTop。
    // 待整批 DOM 提交后重新定位到请求的 key，避免原生钳制让窗口跳回起点。
    void nextTick(() => { position(); cellMeasurements.invalidate() })
  }
  function pageTarget(key: BingTableKey, direction: number) {
    const index = rowPositions.value.get(key) ?? 0
    return heightIndex.value.indexAt(heightIndex.value.offset(index) +
      direction * (virtualViewportHeight.value || normalizedVirtualRowHeight.value * 10))
  }
  function readVirtualRowHeights(elements: HTMLElement[]) {
    if (!usesVirtualRows.value || !isBrowser()) return
    const rows = new Set(elements.map(element => element.closest<HTMLElement>('.bing-table__row[data-row-index]')).filter((row): row is HTMLElement => Boolean(row)))
    const updates: Array<[BingTableKey, number]> = []
    for (const row of rows) {
      const item = visibleFlatRows.value[Number(row.dataset.rowIndex)]
      if (!item) continue
      let height = parseFloat(window.getComputedStyle(row).getPropertyValue('--_table-row-height')) || minimumRowHeight.value
      for (const content of row.querySelectorAll<HTMLElement>('.bing-table__cell-content')) {
        const styles = window.getComputedStyle(content)
        const padding = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0)
        const natural = Math.max(0, ...Array.from(content.children).map(child => child.getBoundingClientRect().height))
        const border = parseFloat(window.getComputedStyle(content.parentElement!).borderBottomWidth) || 0
        height = Math.max(height, Math.ceil(natural + padding + border))
      }
      if (height !== (heights.get(item.key) ?? normalizedVirtualRowHeight.value)) updates.push([item.key, height])
    }
    const requestedScroll = pendingScroll
    if (!updates.length && !requestedScroll) return
    const anchorScrollTop = virtualScrollTop.value
    const anchorIndex = heightIndex.value.indexAt(anchorScrollTop)
    const anchorKey = visibleFlatRows.value[anchorIndex]?.key
    const within = virtualScrollTop.value - heightIndex.value.offset(anchorIndex)
    return () => {
      for (const [key, height] of updates) {
        heights.set(key, height)
        const index = rowPositions.value.get(key)
        if (index !== undefined) heightIndex.value.update(index, height)
      }
      if (updates.length) revision.value++
      void nextTick(() => {
        if (requestedScroll && pendingScroll === requestedScroll) {
          requestedScroll.position()
          pendingScroll = undefined
          return
        }
        const viewport = scrollRef.value?.viewport
        const index = anchorKey === undefined ? undefined : rowPositions.value.get(anchorKey)
        // 测量提交期间的用户滚动 / focusCell / scrollToRow 优先于旧锚点。
        if (virtualScrollTop.value !== anchorScrollTop || (viewport && Math.abs(viewport.scrollTop - anchorScrollTop) > 1)) return
        if (viewport && index !== undefined) {
          viewport.scrollTop = heightIndex.value.offset(index) + Math.min(within, heightIndex.value.heights[index]! - 1)
          virtualScrollTop.value = viewport.scrollTop
        }
      })
    }
  }
  const cellMeasurements = createTableMeasurements(rootRef, readVirtualRowHeights)
  provide(bingTableMeasurementsKey, cellMeasurements)
  watch(() => [resolvedSize.value, props.virtualRowHeight], () => {
    heights.clear()
    resetVersion.value++
    cellMeasurements.invalidate()
  }, { flush: 'sync' })
  watch(usesVirtualRows, () => cellMeasurements.invalidate())
  if (allKnownFlatRows) watch(allKnownFlatRows, rows => {
    const known = new Set(rows.map(item => item.key))
    for (const key of heights.keys()) if (!known.has(key)) heights.delete(key)
  })
  return {
    virtualScrollTop, virtualViewportHeight, normalizedVirtualRowHeight, minimumRowHeight, usesVirtualRows,
    renderedRows, renderedEntries, virtualBottomSpacerHeight, scrollToRow, pageTarget, cancelPendingScroll,
  }
}
