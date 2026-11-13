import type { BingGlassEffectProps } from '../../utils/glass'
import type { SmoothScrollValue } from '../../motion/smoothScroll'

export type BingTreeSelectValue = string | number

export type BingTreeSelectModelValue =
  | BingTreeSelectValue
  | BingTreeSelectValue[]
  | null

export type BingTreeSelectSize = 'sm' | 'md' | 'lg'

export type BingTreeSelectVirtualMode = boolean | 'auto'

export type BingTreeSelectSearchable = boolean | 'auto'

export type BingTreeSelectSmoothScroll = SmoothScrollValue

export type BingTreeSelectPanelPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right'

export type BingTreeSelectPanelAlign = 'start' | 'middle' | 'end'

export type BingTreeSelectNodeMetaValue = string | number | boolean | null | undefined

export interface BingTreeSelectNode {
  label: string
  value: BingTreeSelectValue
  disabled?: boolean
  selectable?: boolean
  description?: string
  children?: BingTreeSelectNode[]
  meta?: Record<string, BingTreeSelectNodeMetaValue>
  [key: string]: unknown
}

export interface BingTreeSelectProps extends BingGlassEffectProps {
  id?: string
  modelValue?: BingTreeSelectModelValue
  options?: BingTreeSelectNode[]
  multiple?: boolean
  checkStrictly?: boolean
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  showSelectAll?: boolean
  selectAllText?: string
  clearAllText?: string
  showTreeActions?: boolean
  expandAllText?: string
  collapseAllText?: string
  emptyText?: string
  searchable?: BingTreeSelectSearchable
  /** 无搜索框时通过连续字符定位可见节点，默认开启。 */
  typeahead?: boolean
  /** 默认节点标签高亮搜索匹配片段，默认开启。 */
  highlightMatches?: boolean
  searchPlaceholder?: string
  noSearchResultsText?: string
  smoothScroll?: BingTreeSelectSmoothScroll
  defaultExpandedValues?: BingTreeSelectValue[]
  defaultExpandAll?: boolean
  size?: BingTreeSelectSize
  block?: boolean
  panelMinHeight?: string | number
  panelMaxHeight?: string | number
  panelPlacement?: BingTreeSelectPanelPlacement
  panelAlign?: BingTreeSelectPanelAlign
  panelGap?: number
  virtual?: BingTreeSelectVirtualMode
  virtualThreshold?: number
  virtualItemHeight?: number
  virtualOverscan?: number
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
}

export interface BingTreeSelectChangePayload {
  value: BingTreeSelectModelValue
  node?: BingTreeSelectNode
  nodes: BingTreeSelectNode[]
}

export interface BingTreeSelectExpandPayload {
  value: BingTreeSelectValue
  node: BingTreeSelectNode
  expandedValues: BingTreeSelectValue[]
}

export interface BingTreeSelectEmits {
  'update:modelValue': [value: BingTreeSelectModelValue]
  change: [payload: BingTreeSelectChangePayload]
  clear: []
  open: []
  close: []
  expand: [payload: BingTreeSelectExpandPayload]
  collapse: [payload: BingTreeSelectExpandPayload]
}
