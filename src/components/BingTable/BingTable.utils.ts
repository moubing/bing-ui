import type { BingTableColumn, BingTableRow } from './BingTable.types'

export function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function hasOwn(object: object | undefined, key: string) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key))
}

export function toFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value)

    if (Number.isFinite(numeric)) {
      return numeric
    }
  }

  return fallback
}

export function getCellValue(row: BingTableRow, column: BingTableColumn) {
  return row[column.dataKey ?? column.key]
}

export function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return value.toLocaleString()
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

const cellCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function compareCellValues(left: unknown, right: unknown) {
  if (left === right) {
    return 0
  }

  if (left === null || left === undefined) {
    return 1
  }

  if (right === null || right === undefined) {
    return -1
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  return cellCollator.compare(String(left), String(right))
}

export const scrollbarOverflowTolerance = 8

// 单元格焦点管理、溢出测量和行点击共同识别交互内容。
const tableControlSelector = 'button,a[href],input,select,textarea,[role="button"],[role="combobox"],[contenteditable]:not([contenteditable="false"])'
export const tableInteractiveSelector = `${tableControlSelector},[tabindex]:not([data-bing-table-cell])`
// 全文提示的焦点入口仍属于普通单元格文字；不能阻止行激活和点击选择。
export const tableRowClickIgnoreSelector = `${tableControlSelector},[tabindex]:not([data-bing-table-cell]):not(.bing-table__cell-value),label,[data-bing-table-row-click-ignore]`

export function getSortDirections(column: BingTableColumn) {
  return column.sortDirections?.length ? [...new Set(column.sortDirections)] : ['asc', 'desc', null] as const
}
