import type { BingTableKey, BingTableRow } from './BingTable.types'

export type BingTableColumnClasses = (string | undefined | Record<string, boolean>)[]

export interface BingTableFlatRow {
  row: BingTableRow
  key: BingTableKey
  level: number
  parentKey: BingTableKey | null
  index: number
  path: number[]
  disabled: boolean
  hasChildren: boolean
  expanded: boolean
  /** 以下元数据由稳定行索引提供。 */
  childrenKeys?: BingTableKey[]
  posInSet?: number
  setSize?: number
  rowIndex?: number
}

export interface BingTablePagerSnapshot {
  page: number
  pageCount: number
  pageNumbers: number[]
}

/** 两种指针拖动沿用同一份文档样式快照，保持拆分前的恢复顺序。 */
export interface BingTableInteractionStyle {
  previousCursor: string
  previousUserSelect: string
}
