import type { VNodeChild } from 'vue'
import type { SmoothScrollValue } from '../../motion/smoothScroll'

export type BingTableKey = string | number

export type BingTableAlign = 'left' | 'center' | 'right'

export type BingTableFixed = 'left' | 'right'

export type BingTableSize = 'sm' | 'md' | 'lg'

export type BingTableVirtualMode = boolean | 'auto'

export type BingTableSelectionMode = 'multiple' | 'single'

export type BingTableSelectionStrategy = 'independent' | 'cascade'
export type BingTableScrollbarGutter = 'auto' | 'stable'
export type BingTableLoadingVariant = 'overlay' | 'skeleton'

export type BingTableSortOrder = 'asc' | 'desc' | null

export type BingTableRow = Record<string, unknown>

export type BingTableRowKeyGetter = (
  row: BingTableRow,
  /** 原始数据中的同级序号，不随排序、分页或展开变化；建议使用行字段或 path。 */
  index: number,
  path: number[],
) => BingTableKey

export type BingTableRowClass =
  | string
  | ((row: BingTableRow, index: number) => string | undefined)

export type BingTableRowDisabled =
  | string
  /** index 是原始全树的前序序号，禁用结果不依赖展开 / 排序。 */
  | ((row: BingTableRow, index: number) => boolean)

export interface BingTableColumn {
  key: string
  title?: string
  dataKey?: string
  width?: number | string
  minWidth?: number
  maxWidth?: number
  fixed?: BingTableFixed
  hidden?: boolean
  align?: BingTableAlign
  headerAlign?: BingTableAlign
  sortable?: boolean
  /** 默认 ['asc', 'desc', null]；可省略 null，或把 desc 放在首位。 */
  sortDirections?: BingTableSortOrder[]
  resizable?: boolean
  description?: string
  ellipsis?: boolean
  class?: string
  headerClass?: string
  sorter?: (left: BingTableRow, right: BingTableRow) => number
}

export interface BingTableColumnResizePayload {
  key: string
  width: number
  widths: Record<string, number>
}

export interface BingTableColumnReorderPayload {
  key: string
  from: number
  to: number
  order: string[]
}

export interface BingTableColumnVisibilityPayload {
  key: string
  hidden: boolean
  hiddenColumnKeys: string[]
}

export interface BingTableColumnFixedPayload {
  key: string
  fixed: BingTableFixed | null
  columnFixed: Record<string, BingTableFixed | null>
}

export interface BingTableSelectionPayload {
  keys: BingTableKey[]
  /** 已加载且仍被选中的行；远程全选时未加载的行由 allPages / excludedKeys 表示。 */
  rows: BingTableRow[]
  allPages?: boolean
  excludedKeys?: BingTableKey[]
}

export interface BingTableExpandPayload {
  key: BingTableKey
  row: BingTableRow
  expanded: boolean
  expandedRowKeys: BingTableKey[]
}

export interface BingTablePageChangePayload {
  page: number
  pageSize: number
}

export interface BingTableSortPayload {
  key: string | null
  order: BingTableSortOrder
  column?: BingTableColumn
}

export interface BingTableProps {
  data?: BingTableRow[]
  columns?: BingTableColumn[]
  rowKey?: string | BingTableRowKeyGetter
  childrenKey?: string
  height?: number | string
  maxHeight?: number | string
  smoothScroll?: SmoothScrollValue
  size?: BingTableSize
  bordered?: boolean
  striped?: boolean
  loading?: boolean
  loadingVariant?: BingTableLoadingVariant
  error?: boolean | string
  keyboardNavigation?: boolean
  activeRowKey?: BingTableKey | null
  scrollbarGutter?: BingTableScrollbarGutter
  emptyText?: string
  loadingText?: string
  selectable?: boolean
  selectionMode?: BingTableSelectionMode
  selectionStrategy?: BingTableSelectionStrategy
  /** 远程全选的受控模型；通过 clearSelection 或设为 false 退出。 */
  allPagesSelected?: boolean
  excludedRowKeys?: BingTableKey[]
  selectedRowKeys?: BingTableKey[]
  defaultSelectedRowKeys?: BingTableKey[]
  rowDisabled?: BingTableRowDisabled
  selectOnRowClick?: boolean
  selectionFixed?: boolean
  selectionColumnWidth?: number
  expandedRowKeys?: BingTableKey[]
  defaultExpandedRowKeys?: BingTableKey[]
  defaultExpandAll?: boolean
  treeColumnKey?: string
  /** 显示树形层级引导线，默认 false。 */
  treeGuides?: boolean
  indentSize?: number
  columnWidths?: Record<string, number>
  defaultColumnWidths?: Record<string, number>
  columnOrder?: string[]
  defaultColumnOrder?: string[]
  hiddenColumnKeys?: string[]
  defaultHiddenColumnKeys?: string[]
  columnFixed?: Record<string, BingTableFixed | null>
  defaultColumnFixed?: Record<string, BingTableFixed | null>
  resizableColumns?: boolean
  reorderableColumns?: boolean
  showColumnControls?: boolean
  /** auto：有分页放页脚，否则优先工具栏，最后使用表头右上角。 */
  columnControlsPlacement?: 'auto' | 'toolbar' | 'footer'
  virtual?: BingTableVirtualMode
  virtualThreshold?: number
  virtualRowHeight?: number
  virtualOverscan?: number
  pagination?: boolean
  remotePagination?: boolean
  /** 只维护排序状态并发送事件，保持服务端传入的数据顺序。与远程分页独立。 */
  remoteSort?: boolean
  preservePageHeight?: boolean
  page?: number
  defaultPage?: number
  pageSize?: number
  defaultPageSize?: number
  pageSizeOptions?: number[]
  total?: number
  sortKey?: string | null
  defaultSortKey?: string | null
  sortOrder?: BingTableSortOrder
  defaultSortOrder?: BingTableSortOrder
  rowClass?: BingTableRowClass
  ariaLabel?: string
}

export interface BingTableEmits {
  'update:activeRowKey': [key: BingTableKey | null]
  'row-activate': [row: BingTableRow, key: BingTableKey, event: MouseEvent | KeyboardEvent]
  'update:allPagesSelected': [selected: boolean]
  'update:excludedRowKeys': [keys: BingTableKey[]]
  retry: []
  'update:selectedRowKeys': [keys: BingTableKey[]]
  'selection-change': [payload: BingTableSelectionPayload]
  'update:expandedRowKeys': [keys: BingTableKey[]]
  'expand-change': [payload: BingTableExpandPayload]
  'update:columnWidths': [widths: Record<string, number>]
  'column-resize': [payload: BingTableColumnResizePayload]
  'update:columnOrder': [order: string[]]
  'column-reorder': [payload: BingTableColumnReorderPayload]
  'update:hiddenColumnKeys': [keys: string[]]
  'column-visibility-change': [payload: BingTableColumnVisibilityPayload]
  'update:columnFixed': [columnFixed: Record<string, BingTableFixed | null>]
  'column-fixed-change': [payload: BingTableColumnFixedPayload]
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'page-change': [payload: BingTablePageChangePayload]
  'update:sortKey': [key: string | null]
  'update:sortOrder': [order: BingTableSortOrder]
  'sort-change': [payload: BingTableSortPayload]
  'row-click': [row: BingTableRow, event: MouseEvent]
  scroll: [event: Event]
}

export interface BingTableExpose {
  clearSelection: () => void
  toggleRowSelection: (key: BingTableKey, selected?: boolean) => void
  toggleRowExpansion: (key: BingTableKey, expanded?: boolean) => void
  resetColumns: () => void
  scrollTo: (top: number) => void
  autoFitColumn: (key: string) => void
  autoFitColumns: () => void
  /** rowKey 为 null 时定位表头；column 可传列 key 或包含选择列的零基序号。 */
  focusCell: (rowKey: BingTableKey | null, column?: string | number) => Promise<void>
  scrollToRow: (key: BingTableKey) => void
  selectAllPages: () => void
}

export interface BingTableCellSlotProps {
  row: BingTableRow
  column: BingTableColumn
  value: unknown
  rowIndex: number
  level: number
}

export interface BingTableToolbarSlotProps {
  selectedRowKeys: BingTableKey[]
  visibleColumns: BingTableColumn[]
  selectAllPages: () => void
  clearSelection: () => void
  allVisibleRowsSelected: boolean
  allPages: boolean
  excludedKeys: BingTableKey[]
  selectionCount: number
}

export interface BingTableSlots {
  toolbar?: (props: BingTableToolbarSlotProps) => VNodeChild
  empty?: () => VNodeChild
  error?: (props: { error: boolean | string; retry: () => void }) => VNodeChild
  cell?: (props: BingTableCellSlotProps) => VNodeChild
  [name: `cell-${string}`]: ((props: BingTableCellSlotProps) => VNodeChild) | undefined
  [name: `header-${string}`]: ((props: { column: BingTableColumn }) => VNodeChild) | undefined
}
