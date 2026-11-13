<script setup lang="ts">
import { computed, h, nextTick, provide, ref, watch, type CSSProperties } from 'vue'
import { DragDropProvider, DragOverlay } from '@dnd-kit/vue'
import { LoaderCircle } from '../../icons'
import BingTableState from './BingTableState.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import BingTableColumnControls from '../BingTableColumnControls/BingTableColumnControls.vue'
import BingTableHeaderContent from './BingTableHeaderContent.vue'
import BingTableHeaderRow from './BingTableHeaderRow.vue'
import BingTableBodyRow from './BingTableBodyRow.vue'
import BingTablePager from './BingTablePager.vue'
import BingTableHorizontalScrollbar from './BingTableHorizontalScrollbar.vue'
import BingTableFixedEdges from './BingTableFixedEdges.vue'
import { useTableColumns } from './useTableColumns'
import type { BingTableColumn, BingTableKey, BingTableEmits, BingTableExpose, BingTableProps, BingTableSlots, BingTableColumnReorderPayload, BingTableColumnVisibilityPayload, BingTableColumnFixedPayload } from './BingTable.types'
import type { BingSortableListDragPayload } from '../BingSortableList/BingSortableList.types'
import type { BingTableFlatRow, BingTableInteractionStyle } from './BingTable.internal'
import { scrollbarOverflowTolerance } from './BingTable.utils'
import { useConfigSize } from '../../utils/config'
import { useTableLoading } from './composables/useTableLoading'
import { useTableExpansion } from './composables/useTableExpansion'
import { useTableData } from './composables/useTableData'
import { useTableSelection } from './composables/useTableSelection'
import { useVirtualRows } from './composables/useVirtualRows'
import { useHorizontalScrollbar } from './composables/useHorizontalScrollbar'
import { useColumnResize } from './composables/useColumnResize'
import { useColumnDnd } from './composables/useColumnDnd'
import { useTableViewport } from './composables/useTableViewport'
import { useFixedColumns } from './composables/useFixedColumns'
import { useTablePager } from './composables/useTablePager'
import { useTableKeyboard, tableKeyboardKey } from './composables/useTableKeyboard'
import { useTableAnnouncements } from './composables/useTableAnnouncements'
import { useTableMotion } from './composables/useTableMotion'

const props = withDefaults(defineProps<BingTableProps>(), {
  data: () => [],
  columns: () => [],
  rowKey: 'id',
  childrenKey: 'children',
  height: undefined,
  maxHeight: undefined,
  smoothScroll: true,
  bordered: false,
  striped: true,
  loading: false,
  loadingVariant: 'overlay',
  error: false,
  keyboardNavigation: true,
  activeRowKey: undefined,
  scrollbarGutter: 'auto',
  selectionStrategy: 'independent',
  allPagesSelected: undefined,
  excludedRowKeys: undefined,
  emptyText: '暂无数据',
  loadingText: '正在加载数据',
  selectable: false,
  selectionMode: 'multiple',
  selectedRowKeys: undefined,
  defaultSelectedRowKeys: () => [],
  rowDisabled: undefined,
  selectOnRowClick: false,
  selectionFixed: true,
  selectionColumnWidth: 54,
  expandedRowKeys: undefined,
  defaultExpandedRowKeys: () => [],
  defaultExpandAll: false,
  treeColumnKey: undefined,
  indentSize: 22,
  treeGuides: false,
  columnWidths: undefined,
  defaultColumnWidths: () => ({}),
  columnOrder: undefined,
  defaultColumnOrder: () => [],
  hiddenColumnKeys: undefined,
  defaultHiddenColumnKeys: () => [],
  columnFixed: undefined,
  defaultColumnFixed: () => ({}),
  resizableColumns: true,
  reorderableColumns: true,
  showColumnControls: true,
  columnControlsPlacement: 'auto',
  virtual: 'auto',
  virtualThreshold: 80,
  virtualRowHeight: undefined,
  virtualOverscan: 6,
  pagination: false,
  remotePagination: false,
  remoteSort: false,
  preservePageHeight: true,
  page: undefined,
  defaultPage: 1,
  pageSize: undefined,
  defaultPageSize: 10,
  pageSizeOptions: () => [10, 20, 50, 100],
  total: undefined,
  sortKey: undefined,
  defaultSortKey: null,
  sortOrder: undefined,
  defaultSortOrder: null,
  rowClass: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<BingTableEmits>()
const slots = defineSlots<BingTableSlots>()
const resolvedSize = useConfigSize(() => props.size)
const rootRef = ref<HTMLElement | null>(null)
const frameRef = ref<HTMLElement | null>(null)
const scrollRef = ref<BingScrollbarExpose | null>(null)
const pagerRef = ref<InstanceType<typeof BingTablePager> | null>(null)
const horizontalScrollbarRef = ref<InstanceType<typeof BingTableHorizontalScrollbar> | null>(null)
const paginationRef = computed(() => pagerRef.value?.element ?? null)
const horizontalRailRef = computed(() => horizontalScrollbarRef.value?.rail ?? null)
const isColumnPanelOpen = ref(false)
const focusedRowKey = ref<BingTableKey | null>(null)
const localActiveRowKey = ref<BingTableKey | null>(null)
const effectiveActiveRowKey = computed(() => props.activeRowKey === undefined ? localActiveRowKey.value : props.activeRowKey)
const { announcement, announce } = useTableAnnouncements()
let lastMovedColumnKey: string | null = null
const interactionStyle: BingTableInteractionStyle = { previousCursor: '', previousUserSelect: '' }

const {
  localColumnWidths, localColumnFixed, allColumns, visibleColumns, effectiveColumnOrder,
  effectiveHiddenColumnKeySet, getColumnByKey, getColumnFixed, applyColumnFixed, applyColumnOrderValue,
  applyColumnWidthsValue, applyHiddenColumnKeys, reorderColumns, resetColumns,
} = useTableColumns(props, emit)
const { isLoadingVisible, isBusy, displayedData, settledTotal } = useTableLoading(props)
const { localExpandedRowKeys, effectiveExpandedRowKeySet, toggleRowExpansion } =
  useTableExpansion(props, emit, () => allKnownFlatRows.value)
const {
  effectivePage, effectivePageSize, effectiveSortKey, effectiveSortOrder, totalItems,
  pageCount, visibleFlatRows, allKnownFlatRows, itemsByKey, ariaRowCount, selectionEpoch, hasTreeData,
  toggleSort, setPage, handlePageSizeSelectChange,
} = useTableData(props, emit, {
  displayedData, isBusy, settledTotal, allColumns, effectiveExpandedRowKeySet,
  beginPageSizeTransition: (size) => beginPageSizeTransition(size),
})
const {
  effectiveSelectedRowKeys, allPages, excludedKeys, isRowSelected, isRowIndeterminate, selectableVisibleRows,
  allVisibleRowsSelected, someVisibleRowsSelected,
  toggleRowSelection, toggleAllVisibleRows, clearSelection, selectAllPages, handleRowClick,
} = useTableSelection(props, emit, {
  visibleFlatRows, allKnownFlatRows, itemsByKey, resetKey: selectionEpoch, activateRow,
})
const {
  draggedColumnKey, dragOverColumnKey, columnDropAnimation, columnDndSensors, columnDndPlugins,
  finishColumnDrag, handleColumnDndDragStart, handleColumnDndDragMove, handleColumnDndDragEnd,
} = useColumnDnd(props, { rootRef, scrollRef, visibleColumns, reorderColumns })
const {
  activeResizeColumnKey, getColumnPixelWidth, getColumnWidthStyle, getColumnMaximumWidth,
  canResizeColumn, beginColumnResize, handleResizeKeydown, autoFitColumn, autoFitColumns,
} = useColumnResize(props, emit, { allColumns, localColumnWidths, interactionStyle, rootRef })

// 分页过渡需要虚拟行状态；虚拟窗口通过延迟读取保留行，避免复制状态。
const retainedRows = computed(() => transitionVisibleFlatRows.value)
const {
  virtualScrollTop, virtualViewportHeight, minimumRowHeight,
  usesVirtualRows, renderedRows, renderedEntries, virtualBottomSpacerHeight, scrollToRow, pageTarget, cancelPendingScroll,
} = useVirtualRows(props, {
  resolvedSize, visibleFlatRows, transitionVisibleFlatRows: retainedRows, rootRef, scrollRef, focusedRowKey, allKnownFlatRows,
  viewportBounds: () => tableViewport.bounds(),
  revealRow: (row, nearest) => tableViewport.reveal(row, nearest, false),
})
const {
  horizontalScrollLeft, horizontalMaxScrollLeft, hasVerticalOverflow, hasHorizontalOverflow,
  isDraggingHorizontalScrollbar, horizontalScrollbarThumbStyle, handleScroll, refreshScrollState,
  handleHorizontalRailPointerDown, beginHorizontalScrollbarDrag, scrollTo,
} = useHorizontalScrollbar(emit, {
  scrollRef, horizontalRailRef, virtualScrollTop, virtualViewportHeight, interactionStyle,
})
const hasRenderedBodyRows = computed(
  () => !props.error && visibleColumns.value.length > 0 && renderedRows.value.length > 0,
)
const {
  normalizedSelectionColumnWidth, tableMinWidth, leftFixedShadowStyle, rightFixedShadowStyle,
  leftFixedMaskStyle, rightFixedMaskStyle, showLeftFixedMask, showRightFixedMask,
  hasLeftFixedShadow, hasRightFixedShadow, shouldFixSelectionColumn,
  getColumnCellStyle, getSelectionCellStyle, getColumnClasses, leftFixedWidth, rightFixedWidth,
} = useFixedColumns(props, {
  gutter: () => viewportGutter.value,
  visibleColumns, getColumnFixed, getColumnPixelWidth, getColumnWidthStyle,
  usesVirtualRows, hasRenderedBodyRows, hasHorizontalOverflow, horizontalScrollLeft,
  horizontalMaxScrollLeft, effectiveSortKey, effectiveSortOrder,
  draggedColumnKey, dragOverColumnKey, activeResizeColumnKey,
})
const { currentPagerSnapshot, pageSizeSelectOptions, pageRangeText } = useTablePager(props, {
  effectivePage, effectivePageSize, pageCount, totalItems, visibleFlatRows,
})
const {
  frameStyle, isFrameHeightAnimating, isPageSizeTransitioning, isPaginationLayoutFloating,
  paginationLayoutReserve, paginationMotionStyle, transitionVisibleFlatRows,
  shouldPreservePageHeight, pageFillerRowCount, displayedPagerSnapshot,
  beginPageSizeTransition, handleFrameHeightTransitionEnd, observeFrameHeight,
} = useTableMotion(props, {
  rootRef, frameRef, paginationRef, isBusy, usesVirtualRows, visibleFlatRows, visibleColumns,
  effectivePage, effectivePageSize, totalItems, normalizedVirtualRowHeight: minimumRowHeight,
  currentPagerSnapshot, refreshScrollState,
})

const controlsPlacement = computed(() => !props.showColumnControls ? null
  : props.columnControlsPlacement !== 'auto' ? props.columnControlsPlacement
  : props.pagination ? 'footer' : slots.toolbar ? 'toolbar' : 'header')
const showFooter = computed(() => props.pagination || controlsPlacement.value === 'footer')
// 右上角列设置占用独立窄格，与滚动条共用留白，避免遮住最后一列。
const viewportGutter = computed(() =>
  (props.scrollbarGutter === 'stable' || hasVerticalOverflow.value ? 26 : 0) + (controlsPlacement.value === 'header' ? 36 : 0))
const tableViewport = useTableViewport({ rootRef, scrollRef,
  leftWidth: computed(() => leftFixedWidth.value - (props.selectable && props.selectionFixed && !shouldFixSelectionColumn.value ? normalizedSelectionColumnWidth.value : 0)),
  rightWidth: rightFixedWidth, gutter: viewportGutter,
})
const ColumnControls = () => h(BingTableColumnControls, {
  open: isColumnPanelOpen.value, 'onUpdate:open': (open: boolean) => { isColumnPanelOpen.value = open },
  placement: controlsPlacement.value === 'footer' ? 'top-start' : 'bottom-end',
  columns: props.columns, columnWidths: props.columnWidths ?? localColumnWidths.value,
  defaultColumnWidths: props.defaultColumnWidths, columnOrder: effectiveColumnOrder.value,
  defaultColumnOrder: props.defaultColumnOrder, hiddenColumnKeys: [...effectiveHiddenColumnKeySet.value],
  defaultHiddenColumnKeys: props.defaultHiddenColumnKeys, columnFixed: props.columnFixed ?? localColumnFixed.value,
  defaultColumnFixed: props.defaultColumnFixed, reorderableColumns: props.reorderableColumns, smoothScroll: props.smoothScroll,
  'onUpdate:columnWidths': applyColumnWidthsValue, 'onUpdate:columnOrder': applyColumnOrderValue,
  'onUpdate:hiddenColumnKeys': applyHiddenColumnKeys, 'onUpdate:columnFixed': applyColumnFixed,
  onColumnReorder: (payload: BingTableColumnReorderPayload) => emit('column-reorder', payload),
  onColumnVisibilityChange: (payload: BingTableColumnVisibilityPayload) => emit('column-visibility-change', payload),
  onColumnFixedChange: (payload: BingTableColumnFixedPayload) => emit('column-fixed-change', payload),
  onDragStart: (payload: BingSortableListDragPayload) => { draggedColumnKey.value = String(payload.key) }, onDragEnd: finishColumnDrag,
})

const normalizedIndentSize = computed(() => Math.max(0, Math.floor(props.indentSize)))

const tableClasses = computed(() => [
  'bing-table',
  `bing-table--${resolvedSize.value}`,
  {
    'is-bordered': props.bordered,
    'has-footer': showFooter.value,
    'has-toolbar': Boolean(slots.toolbar) || controlsPlacement.value === 'toolbar',
    'is-striped': props.striped,
    'is-loading': isBusy.value,
    'has-error': Boolean(props.error),
    'has-keyboard-navigation': props.keyboardNavigation,
    'is-virtual': usesVirtualRows.value,
    'is-preserving-page-height': shouldPreservePageHeight.value,
    'has-horizontal-scrollbar': hasHorizontalOverflow.value,
    'has-vertical-scrollbar': hasVerticalOverflow.value,
    'has-selection': props.selectable,
    'has-column-panel': isColumnPanelOpen.value,
    'has-reorderable-columns': props.reorderableColumns,
    'is-resizing-column': Boolean(activeResizeColumnKey.value),
    'is-reordering-columns': Boolean(draggedColumnKey.value),
    'is-page-size-transitioning': isPageSizeTransitioning.value,
    'is-pagination-floating': isPaginationLayoutFloating.value,
  },
])

const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    '--_table-size-row-height': `${minimumRowHeight.value}px`,
    '--_table-min-width': `${tableMinWidth.value}px`,
    '--bing-table-selection-width': `${normalizedSelectionColumnWidth.value}px`,
    '--bing-table-vertical-scrollbar-gutter': `${viewportGutter.value}px`,
    '--bing-table-horizontal-scrollbar-height': props.scrollbarGutter === 'stable' || hasHorizontalOverflow.value ? '22px' : '0px',
  }

  if (paginationLayoutReserve.value !== null) {
    style.paddingBottom = `${paginationLayoutReserve.value}px`
  }

  return style
})

const scrollHeight = computed(() => props.height)

const scrollMaxHeight = computed(() =>
  props.maxHeight ?? (usesVirtualRows.value ? 520 : undefined),
)

const treeColumn = computed(() => {
  if (!visibleColumns.value.length) {
    return undefined
  }

  if (props.treeColumnKey) {
    return visibleColumns.value.find((column) => column.key === props.treeColumnKey)
  }

  return visibleColumns.value[0]
})

const tableColspan = computed(() => visibleColumns.value.length + (props.selectable ? 1 : 0))

function isFillerStriped(index: number) {
  return (visibleFlatRows.value.length + index - 1) % 2 === 1
}

function isTreeCell(column: BingTableColumn) {
  return hasTreeData.value && treeColumn.value?.key === column.key
}

const headerDisabled = computed(() => isBusy.value || Boolean(props.error) || !visibleFlatRows.value.length)
const showSkeleton = computed(() => isBusy.value && !displayedData.value.length && props.loadingVariant === 'skeleton')
const selectionCount = computed(() => allPages.value ? Math.max(0, totalItems.value - excludedKeys.value.length) : effectiveSelectedRowKeys.value.length)
function activateRow(item: BingTableFlatRow, event: MouseEvent | KeyboardEvent) {
  if (item.disabled || isBusy.value || props.error) return
  if (props.activeRowKey === undefined) localActiveRowKey.value = item.key
  emit('update:activeRowKey', item.key)
  emit('row-activate', item.row, item.key, event)
}
function moveColumn(key: string, direction: number) {
  if (!props.reorderableColumns) return
  const index = visibleColumns.value.findIndex(column => column.key === key)
  const current = visibleColumns.value[index]
  const target = visibleColumns.value[index + direction]
  if (!current || !target || getColumnFixed(current) !== getColumnFixed(target)) return
  lastMovedColumnKey = key
  reorderColumns(key, target.key)
}
const keyboard = useTableKeyboard({
  enabled: computed(() => props.keyboardNavigation),
  rootRef, rows: computed(() => props.error ? [] : visibleFlatRows.value), columns: visibleColumns,
  selectable: computed(() => props.selectable),
  allSelected: allVisibleRowsSelected,
  focusedRowKey, isTreeCell, sort: toggleSort, resize: handleResizeKeydown,
  moveColumn,
  toggleSelection: (key, selected, range) => { if (!headerDisabled.value) toggleRowSelection(key, selected, range) },
  toggleAll: selected => { if (!headerDisabled.value) toggleAllVisibleRows(selected) },
  toggleExpansion: toggleRowExpansion, activate: activateRow, scrollToRow, pageTarget, reveal: tableViewport.reveal,
})
provide(tableKeyboardKey, keyboard)
watch([effectiveSortKey, effectiveSortOrder], ([key, order]) => {
  announce(key && order ? `已按 ${getColumnByKey(key)?.title || key} ${order === 'asc' ? '升序' : '降序'}排序` : '已取消排序')
})
watch(selectionCount, count => announce(allPages.value ? `已选择全部结果中的 ${count} 行` : `已选择 ${count} 行`))
watch(draggedColumnKey, key => { if (key) lastMovedColumnKey = key })
watch(effectiveColumnOrder, async (order, previous) => {
  const key = lastMovedColumnKey ?? order.find((key, index) => key !== previous[index])
  await nextTick()
  if (key && order.indexOf(key) !== previous.indexOf(key)) announce(`${getColumnByKey(key)?.title || key} 已移到第 ${order.indexOf(key) + 1} 列`)
})
watch(() => props.error, error => { if (error) announce(typeof error === 'string' ? error : '数据加载失败') })

// 跨职责联动集中在装配层，注册顺序保持展开初始化、回顶、列宽和页码修正。
watch(
  () => [props.defaultExpandAll, displayedData.value, props.childrenKey] as const,
  () => {
    if (props.defaultExpandAll && props.expandedRowKeys === undefined) {
      localExpandedRowKeys.value = allKnownFlatRows.value
        .filter((item) => item.hasChildren)
        .map((item) => item.key)
    }
    refreshScrollState()
  },
  { deep: true, immediate: true },
)
observeFrameHeight()
watch(
  () => [effectivePage.value, effectivePageSize.value] as const,
  () => {
    scrollTo(0)
    refreshScrollState()
  },
)
watch(visibleFlatRows, refreshScrollState)
watch(tableMinWidth, refreshScrollState)
watch(pageCount, (count) => {
  if (effectivePage.value > count) setPage(count)
})

defineExpose<BingTableExpose>({
  clearSelection,
  toggleRowSelection,
  toggleRowExpansion,
  resetColumns,
  scrollTo, autoFitColumn, autoFitColumns, focusCell: keyboard.focusCell, scrollToRow, selectAllPages,
})
</script>

<template>
  <section ref="rootRef" :class="tableClasses" :style="rootStyle" :aria-busy="isBusy"
    @wheel.capture.passive="cancelPendingScroll" @touchstart.capture.passive="cancelPendingScroll"
    @pointerdown.capture="cancelPendingScroll" @keydown.capture="cancelPendingScroll">
    <div v-if="$slots.toolbar || controlsPlacement === 'toolbar'" class="bing-table__toolbar">
      <div class="bing-table__toolbar-main">
        <slot
          name="toolbar"
          :selected-row-keys="effectiveSelectedRowKeys"
          :visible-columns="visibleColumns"
          :select-all-pages="selectAllPages"
          :clear-selection="clearSelection"
          :all-visible-rows-selected="allVisibleRowsSelected"
          :all-pages="allPages"
          :excluded-keys="excludedKeys"
          :selection-count="selectionCount"
        />
      </div>
      <ColumnControls v-if="controlsPlacement === 'toolbar'" />
    </div>

    <div
      ref="frameRef"
      class="bing-table__frame"
      :class="{ 'is-height-animating': isFrameHeightAnimating }"
      :style="frameStyle"
      @transitionend="handleFrameHeightTransitionEnd"
    >
      <div v-if="controlsPlacement === 'header'" class="bing-table__header-controls"><ColumnControls /></div>
      <DragDropProvider
        :sensors="columnDndSensors"
        :plugins="columnDndPlugins"
        @drag-start="handleColumnDndDragStart"
        @drag-move="handleColumnDndDragMove"
        @drag-end="handleColumnDndDragEnd"
      >
        <BingScrollbar
          ref="scrollRef"
          class="bing-table__scroll"
          :height="scrollHeight"
          :max-height="scrollMaxHeight"
          :overflow-tolerance="scrollbarOverflowTolerance"
          :smooth="smoothScroll"
          horizontal
          vertical
          always
          :aria-label="ariaLabel"
          :inert="isBusy"
          :focusable="!keyboardNavigation"
          @scroll="handleScroll"
        >
        <table class="bing-table__table" :style="{ minWidth: `${tableMinWidth}px` }"
          :role="keyboardNavigation ? (hasTreeData ? 'treegrid' : 'grid') : undefined"
          :aria-label="ariaLabel" :aria-rowcount="ariaRowCount"
          :aria-colcount="tableColspan" :aria-multiselectable="selectable ? selectionMode === 'multiple' : undefined"
          @keydown="keyboard.handleKeydown" @focusin="keyboard.handleFocusin" @focusout="keyboard.handleFocusout">
          <colgroup>
            <col v-if="selectable" :style="{ width: `${normalizedSelectionColumnWidth}px` }" />
            <col
              v-for="column in visibleColumns"
              :key="column.key"
              :style="{ width: getColumnWidthStyle(column) }"
            />
          </colgroup>

          <BingTableHeaderRow
            :selectable="selectable"
            :selection-mode="selectionMode"
            :should-fix-selection-column="shouldFixSelectionColumn"
            :all-visible-rows-selected="allVisibleRowsSelected"
            :some-visible-rows-selected="someVisibleRowsSelected"
            :reorderable-columns="reorderableColumns"
            :visible-columns="visibleColumns"
            :effective-sort-key="effectiveSortKey"
            :effective-sort-order="effectiveSortOrder"
            :get-selection-cell-style="getSelectionCellStyle"
            :get-column-classes="getColumnClasses"
            :get-column-cell-style="getColumnCellStyle"
            :can-resize-column="canResizeColumn"
            :get-column-pixel-width="getColumnPixelWidth"
            :get-column-maximum-width="getColumnMaximumWidth"
            :disabled="headerDisabled"
            :selection-disabled="!selectableVisibleRows.length"
            @auto-fit="autoFitColumn"
            @select-all="toggleAllVisibleRows"
            @sort="toggleSort"
            @resize-start="beginColumnResize"
            @resize-keydown="handleResizeKeydown"
          >
            <template v-for="(_, name) in $slots" #[name]="scope">
              <slot :name="name as keyof BingTableSlots" v-bind="scope" />
            </template>
          </BingTableHeaderRow>

          <BingTableState
            v-if="error || !transitionVisibleFlatRows.length || !visibleColumns.length"
            :selectable="selectable" :colspan="tableColspan" :busy="isBusy" :skeleton="showSkeleton"
            :error="error" :empty-text="emptyText" @retry="emit('retry')"
          >
            <template v-if="$slots.empty" #empty><slot name="empty" /></template>
            <template v-if="$slots.error" #error="scope"><slot name="error" v-bind="scope" /></template>
          </BingTableState>

          <tbody v-else class="bing-table__body">
            <template v-for="{ item, gap } in renderedEntries" :key="item.key">
              <tr v-if="gap > 0" class="bing-table__virtual-spacer" aria-hidden="true">
                <td :colspan="tableColspan" :style="{ height: `${gap}px` }"></td>
              </tr>
              <BingTableBodyRow
                :item="item"
                :selected="isRowSelected(item.key)"
                :indeterminate="isRowIndeterminate(item.key)"
                :active="effectiveActiveRowKey === item.key"
                :tree="hasTreeData && keyboardNavigation"
                :tree-guides="treeGuides"
                :keyboard-navigation="keyboardNavigation"
                :row-class="rowClass"
                :selectable="selectable"
                :should-fix-selection-column="shouldFixSelectionColumn"
                :visible-columns="visibleColumns"
                :normalized-indent-size="normalizedIndentSize"
                :is-busy="isBusy"
                :is-tree-cell="isTreeCell"
                :get-selection-cell-style="getSelectionCellStyle"
                :get-column-classes="getColumnClasses"
                :get-column-cell-style="getColumnCellStyle"
                @row-click="handleRowClick(item, $event)"
                @select="(selected, range) => toggleRowSelection(item.key, selected, range)"
                @expand="toggleRowExpansion(item.key)"
              >
                <template v-for="(_, name) in $slots" #[name]="scope">
                  <slot :name="name as keyof BingTableSlots" v-bind="scope" />
                </template>
              </BingTableBodyRow>
            </template>
            <BingTableBodyRow
              v-for="index in pageFillerRowCount"
              :key="'__bing-page-filler-' + index"
              :filler-striped="isFillerStriped(index)"
              :selectable="selectable"
              :should-fix-selection-column="shouldFixSelectionColumn"
              :visible-columns="visibleColumns"
              :normalized-indent-size="normalizedIndentSize"
              :is-busy="isBusy"
              :is-tree-cell="isTreeCell"
              :get-selection-cell-style="getSelectionCellStyle"
              :get-column-classes="getColumnClasses"
              :get-column-cell-style="getColumnCellStyle"
            />

            <tr
              v-if="usesVirtualRows && virtualBottomSpacerHeight > 0"
              class="bing-table__virtual-spacer"
              aria-hidden="true"
            >
              <td :colspan="tableColspan" :style="{ height: `${virtualBottomSpacerHeight}px` }"></td>
            </tr>
          </tbody>
          </table>
        </BingScrollbar>

        <DragOverlay
          v-slot="{ source }"
          class="bing-table__column-drag-overlay"
          :drop-animation="columnDropAnimation"
          :style="{
            '--bing-table-column-drop-duration': `${columnDropAnimation.duration}ms`,
            '--bing-table-column-drop-easing': columnDropAnimation.easing,
          }"
        >
          <!-- Overlay 的 source 会保留到归位动画结束，不能由 drag-end 清空的状态控制卡片。 -->
          <div
            v-if="source"
            class="bing-table__header-cell bing-table__column-drag-card"
            :class="[
              getColumnClasses(getColumnByKey(String(source.id)) ?? { key: String(source.id) }, true),
              { 'is-landing': !draggedColumnKey },
            ]"
            aria-hidden="true"
            inert
          >
            <BingTableHeaderContent
              :column="getColumnByKey(String(source.id)) ?? { key: String(source.id) }"
              :sort-order="effectiveSortKey === String(source.id) ? effectiveSortOrder : null"
              preview
            >
              <template #default="{ column }">
                <slot :name="`header-${column.key}`" :column="column">
                  {{ column.title || column.key }}
                </slot>
              </template>
            </BingTableHeaderContent>
          </div>
        </DragOverlay>
      </DragDropProvider>

      <BingTableHorizontalScrollbar
        ref="horizontalScrollbarRef"
        :gutter="scrollbarGutter"
        :has-horizontal-overflow="hasHorizontalOverflow"
        :is-dragging-horizontal-scrollbar="isDraggingHorizontalScrollbar"
        :horizontal-scrollbar-thumb-style="horizontalScrollbarThumbStyle"
        @rail-pointerdown="handleHorizontalRailPointerDown"
        @thumb-pointerdown="beginHorizontalScrollbarDrag"
      />

      <BingTableFixedEdges
        :show-left-fixed-mask="showLeftFixedMask"
        :show-right-fixed-mask="showRightFixedMask"
        :has-left-fixed-shadow="hasLeftFixedShadow"
        :has-right-fixed-shadow="hasRightFixedShadow"
        :left-fixed-mask-style="leftFixedMaskStyle"
        :right-fixed-mask-style="rightFixedMaskStyle"
        :left-fixed-shadow-style="leftFixedShadowStyle"
        :right-fixed-shadow-style="rightFixedShadowStyle"
      />

      <div
        v-if="isBusy && !showSkeleton"
        class="bing-table__loading-overlay"
        :class="{ 'is-visible': isLoadingVisible }"
      >
        <span v-if="isLoadingVisible" class="bing-table__loading-status" aria-hidden="true">
          <span class="bing-table__loading-mark" aria-hidden="true">
            <BingIcon :icon="LoaderCircle" size="sm" :stroke-width="1.75" />
          </span>
          {{ loadingText }}
        </span>
      </div>
    </div>

    <BingTablePager
      v-if="showFooter"
      ref="pagerRef"
      :pagination="pagination"
      :initial-loading="isBusy && !displayedData.length"
      :is-busy="isBusy"
      :is-pagination-layout-floating="isPaginationLayoutFloating"
      :pagination-motion-style="paginationMotionStyle"
      :page-range-text="pageRangeText"
      :effective-page="effectivePage"
      :effective-page-size="effectivePageSize"
      :page-count="pageCount"
      :displayed-pager-snapshot="displayedPagerSnapshot"
      :page-size-select-options="pageSizeSelectOptions"
      @page="setPage"
      @page-size="handlePageSizeSelectChange"
    >
      <template #column-controls>
        <ColumnControls v-if="controlsPlacement === 'footer'" />
      </template>
    </BingTablePager>
    <span class="bing-table__sr-only" :role="isLoadingVisible ? 'status' : undefined" aria-live="polite" aria-atomic="true">{{ isLoadingVisible ? loadingText : announcement }}</span>
  </section>
</template>

<style scoped src="./BingTable.cells.css"></style>
<style scoped>
.bing-table__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.bing-table__frame::before { content: ''; position: absolute; top: 0; right: 0; width: var(--bing-table-vertical-scrollbar-gutter); height: var(--_table-head-height); z-index: calc(var(--bing-table-fixed-selection-head-z) + 1); background: var(--_table-header-bg); pointer-events: none; }
.bing-table__frame::after {
  content: ''; position: absolute; right: 0; top: var(--_table-head-height);
  bottom: var(--bing-table-horizontal-scrollbar-height); width: var(--bing-table-vertical-scrollbar-gutter);
  z-index: 12; background: var(--bing-table-row-bg); pointer-events: none;
}
.bing-table {
  --_table-radius: var(--bing-table-radius, 8px);
  --_table-head-height: var(--bing-table-head-height, var(--_table-size-head-height, 36px));
  --_table-row-height: var(--bing-table-row-height, var(--_table-size-row-height, 40px));
  --_table-cell-padding-x: var(--bing-table-cell-padding-x, var(--_table-size-padding-x, 12px));
  --_table-cell-padding-y: var(--bing-table-cell-padding-y, var(--_table-size-padding-y, 6px));
  --_table-focus-ring: var(--bing-table-focus-ring, var(--bing-focus-ring));
  --_table-line: var(--bing-table-line, var(--bing-border));
  --_table-line-strong: var(--bing-table-line-strong, var(--bing-border-strong));
  --_table-header-bg: var(--bing-table-header-bg, var(--bing-surface-muted));
  --bing-table-horizontal-scrollbar-height: 22px;
  --bing-table-vertical-scrollbar-right: 9px;
  --bing-table-vertical-scrollbar-width: 5px;
  --bing-table-fixed-mask-z: 8;
  --bing-table-fixed-shadow-z: 9;
  --bing-table-fixed-z: 10;
  --bing-table-fixed-selection-z: 11;
  --bing-table-head-z: 30;
  --bing-table-fixed-head-z: 31;
  --bing-table-fixed-selection-head-z: 32;
  --bing-table-row-bg: var(--bing-table-bg, var(--bing-surface-solid));
  --bing-table-row-striped-bg: var(--bing-table-striped-bg, var(--bing-surface-muted));
  --_table-row-hover-bg: var(--bing-table-row-hover-bg, var(--bing-surface-hover));
  --_table-row-selected-bg: var(--bing-table-row-selected-bg, color-mix(in srgb, var(--bing-accent) 7%, var(--bing-table-row-bg)));
  --_table-row-active-bg: var(--bing-table-row-active-bg, var(--bing-surface-active));
  --_table-row-active-accent: var(--bing-table-row-active-accent, var(--bing-accent));

  position: relative;
  display: grid;
  min-width: 0;
  border: 1px solid var(--_table-line-strong);
  border-radius: var(--_table-radius);
  background: var(--bing-table-row-bg);
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.bing-table--sm {
  --_table-size-head-height: 32px;
  --_table-size-padding-x: 10px;
  --_table-size-padding-y: 4px;
  font-size: 13px;
}

.bing-table--lg {
  --_table-size-head-height: 40px;
  --_table-size-padding-x: 14px;
  --_table-size-padding-y: 8px;
  font-size: 14px;
}

.bing-table__header-controls {
  position: absolute; top: 0; right: 0; z-index: 45;
  display: grid; place-items: center; width: 36px; height: var(--_table-head-height);
  border-left: 1px solid var(--_table-line); border-bottom: 1px solid var(--_table-line);
  background: var(--_table-header-bg);
}
.bing-table__header-controls :deep(.bing-table__icon-button) { --button-height: 28px; min-height: 28px; }
.bing-table :deep(.bing-table__icon-button:focus-visible) { outline: 2px solid var(--_table-focus-ring); outline-offset: -2px; }
.bing-table :deep(.bing-checkbox__input:focus-visible + .bing-checkbox__control) { outline-color: var(--_table-focus-ring); outline-offset: -2px; }
@media (forced-colors: active) {
  .bing-table :deep(.bing-table__icon-button:focus-visible),
  .bing-table :deep(.bing-checkbox__input:focus-visible + .bing-checkbox__control) { outline-color: Highlight; }
}
.bing-table__toolbar {
  position: relative;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 12px;
  padding: 12px var(--_table-cell-padding-x);
  border-bottom: 1px solid var(--_table-line);
}

.bing-table__toolbar-main {
  min-width: 0;
}

.bing-table.is-reordering-columns,
.bing-table.is-reordering-columns * {
  cursor: grabbing !important;
}

.bing-table__frame {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 0;
  background: var(--bing-table-row-bg);
}

.bing-table:not(.has-toolbar) .bing-table__frame {
  border-top-left-radius: var(--_table-radius);
  border-top-right-radius: var(--_table-radius);
}

.bing-table:not(.has-footer) .bing-table__frame {
  border-bottom-left-radius: var(--_table-radius);
  border-bottom-right-radius: var(--_table-radius);
}

.bing-table__frame.is-height-animating {
  transition: height 260ms var(--bing-ease-smooth);
  will-change: height;
}

.bing-table__scroll {
  min-width: 0;
}

.bing-table__scroll > :deep(.bing-scrollbar__viewport) {
  overscroll-behavior: contain;
  overflow-anchor: none;
}

.bing-table__scroll > :deep(.bing-scrollbar__viewport:focus-visible) {
  outline: none;
}

.bing-table .bing-table__scroll.bing-scrollbar.is-vertical.is-horizontal > :deep(.bing-scrollbar__viewport > .bing-scrollbar__content) {
  min-width: calc(var(--_table-min-width) + var(--bing-table-vertical-scrollbar-gutter));
  padding-bottom: 0;
  padding-right: var(--bing-table-vertical-scrollbar-gutter);
}

.bing-table__scroll > :deep(.bing-scrollbar__rail--horizontal) {
  display: none;
  z-index: 20;
  height: 5px;
  border: 0;
  background: rgb(var(--bing-heading-rgb) / 0.075);
  box-shadow: none;
}

.bing-table__scroll > :deep(.bing-scrollbar__rail--horizontal > .bing-scrollbar__thumb--horizontal) {
  z-index: 1;
  height: 4px;
  background: rgb(var(--bing-heading-rgb) / 0.3);
  box-shadow: none;
}

.bing-table__scroll > :deep(.bing-scrollbar__rail--horizontal > .bing-scrollbar__thumb--horizontal:hover),
.bing-table__scroll.is-dragging-horizontal > :deep(.bing-scrollbar__rail--horizontal > .bing-scrollbar__thumb--horizontal) {
  height: 5px;
}

.bing-table__scroll > :deep(.bing-scrollbar__rail--vertical) {
  z-index: 40;
  top: calc(var(--_table-head-height) + 6px);
  right: var(--bing-table-vertical-scrollbar-right);
  bottom: 10px;
  width: var(--bing-table-vertical-scrollbar-width);
  border: 0;
  background: transparent;
  box-shadow: none;
}

.bing-table__scroll.has-horizontal-overflow > :deep(.bing-scrollbar__rail--vertical) {
  bottom: 10px;
}

.bing-table__scroll > :deep(.bing-scrollbar__rail--vertical > .bing-scrollbar__thumb--vertical) {
  z-index: 2;
  width: 4px;
  background: rgb(var(--bing-heading-rgb) / 0.3);
  box-shadow: none;
}

.bing-table__scroll > :deep(.bing-scrollbar__rail--vertical > .bing-scrollbar__thumb--vertical:hover),
.bing-table__scroll.is-dragging-vertical > :deep(.bing-scrollbar__rail--vertical > .bing-scrollbar__thumb--vertical) {
  width: 4px;
  background: rgb(var(--bing-heading-rgb) / 0.4);
}

.bing-table__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.bing-table__virtual-spacer td {
  padding: 0;
  border: 0;
}

.bing-table__state-cell {
  height: 148px;
  padding: 24px;
  color: var(--bing-muted);
  font-weight: 400;
  text-align: center;
}

.bing-table__loading-mark {
  display: inline-flex;
  color: var(--bing-accent-strong);
  animation: bing-table-spin 900ms linear infinite;
}

.bing-table__loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--bing-surface-rgb) / 0.62);
  cursor: progress;
  opacity: 0;
  transition: opacity 140ms var(--bing-ease-smooth);
}

.bing-table__loading-overlay.is-visible {
  opacity: 1;
}

.bing-table__loading-status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: calc(100% - 32px);
  padding: 10px 15px;
  border: 1px solid var(--_table-line);
  border-radius: 6px;
  background: var(--bing-surface-solid);
  box-shadow: var(--bing-shadow-sm);
  color: var(--bing-text);
  font-size: 13px;
  font-weight: 400;
}

:global(.bing-table__column-drag-overlay) {
  z-index: 10000;
  overflow: visible;
  cursor: grabbing;
  pointer-events: none;
}

:global(.bing-table__column-drag-overlay[data-dnd-dragging]) {
  border-bottom: 1px solid var(--_table-line);
}

.bing-table.is-bordered .bing-table__column-drag-overlay[data-dnd-dragging] {
  border-right: 1px solid rgb(var(--bing-heading-rgb) / 0.07);
}

.bing-table__header-cell.bing-table__column-drag-card {
  position: relative;
  top: auto;
  left: auto;
  right: auto;
  z-index: auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  /* Preserve the source header border space inside the drag preview. */
  padding: 0 0 1px;
  border: 0;
  border-radius: 8px;
  outline: 1px solid var(--bing-popover-border);
  outline-offset: -1px;
  background: var(--_table-header-bg);
  box-shadow: var(--bing-popover-shadow);
}

.bing-table.is-bordered .bing-table__column-drag-card {
  border: 0;
  padding-right: 1px;
}

.bing-table__header-cell.bing-table__column-drag-card:is(.is-fixed-left, .is-fixed-right) {
  background: var(--_table-header-bg);
}

.bing-table__column-drag-card.is-landing {
  animation: bing-table-header-land var(--bing-table-column-drop-duration)
    var(--bing-table-column-drop-easing) both;
}

@keyframes bing-table-header-land {
  from {
    border-radius: 8px;
    outline-color: var(--bing-popover-border);
    box-shadow: var(--bing-popover-shadow);
    opacity: 1;
  }

  70% {
    opacity: 1;
  }

  to {
    border-radius: 0;
    outline-color: transparent;
    box-shadow: none;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-table__column-drag-card.is-landing {
    animation: none;
    opacity: 0;
  }
}

@keyframes bing-table-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-table,
  .bing-table *,
  .bing-table *::before {
    animation: none !important;
    transition: none !important;
  }
}
</style>
