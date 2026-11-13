import type { BingTableEmits, BingTableProps } from '../BingTable/BingTable.types'
import type { BingDropDownPlacement } from '../BingDropDown/BingDropDown.types'
import type { BingSortableListDragPayload } from '../BingSortableList/BingSortableList.types'

/** 可与一个或多个 BingTable 绑定同一组列模型，不依赖任何表格实例。 */
export interface BingTableColumnControlsProps extends Pick<BingTableProps,
  'columns' | 'columnWidths' | 'defaultColumnWidths' | 'columnOrder' | 'defaultColumnOrder' |
  'hiddenColumnKeys' | 'defaultHiddenColumnKeys' | 'columnFixed' | 'defaultColumnFixed' |
  'reorderableColumns' | 'smoothScroll'> {
  open?: boolean
  defaultOpen?: boolean
  disabled?: boolean
  placement?: BingDropDownPlacement
  ariaLabel?: string
}

export interface BingTableColumnControlsEmits extends Pick<BingTableEmits,
  'update:columnWidths' | 'update:columnOrder' | 'update:hiddenColumnKeys' | 'update:columnFixed' |
  'column-reorder' | 'column-visibility-change' | 'column-fixed-change'> {
  'update:open': [open: boolean]
  'drag-start': [payload: BingSortableListDragPayload]
  'drag-end': [payload: BingSortableListDragPayload]
}

export interface BingTableColumnControlsExpose {
  resetColumns: () => void
}
