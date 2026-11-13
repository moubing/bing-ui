import type { BingGlassEffectProps } from '../../utils/glass'
import type { SmoothScrollValue } from '../../motion/smoothScroll'

export type BingSelectValue = string | number

export type BingSelectModelValue = BingSelectValue | BingSelectValue[] | null

export type BingSelectSize = 'sm' | 'md' | 'lg'

export type BingSelectVirtualMode = boolean | 'auto'

export type BingSelectSearchable = boolean | 'auto'

export type BingSelectSmoothScroll = SmoothScrollValue

export type BingSelectPanelPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right'

export type BingSelectPanelAlign = 'start' | 'middle' | 'end'

export type BingSelectOptionMetaValue = string | number | boolean | null | undefined

export interface BingSelectOption {
  label: string
  value: BingSelectValue
  disabled?: boolean
  description?: string
  detail?: string
  meta?: Record<string, BingSelectOptionMetaValue>
  [key: string]: unknown
}

export interface BingSelectProps extends BingGlassEffectProps {
  id?: string
  modelValue?: BingSelectModelValue
  options?: BingSelectOption[]
  multiple?: boolean
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  showSelectAll?: boolean
  selectAllText?: string
  clearAllText?: string
  emptyText?: string
  searchable?: BingSelectSearchable
  /** 面板打开且焦点不在搜索框时，输入字符定位选项。 */
  typeahead?: boolean
  /** 高亮默认选项标签中的搜索命中；自定义 option 插槽自行处理 matchRanges。 */
  highlightMatches?: boolean
  searchPlaceholder?: string
  noSearchResultsText?: string
  smoothScroll?: BingSelectSmoothScroll
  size?: BingSelectSize
  block?: boolean
  width?: string | number
  minWidth?: string | number
  panelMinHeight?: string | number
  panelMaxHeight?: string | number
  panelPlacement?: BingSelectPanelPlacement
  panelAlign?: BingSelectPanelAlign
  panelGap?: number
  virtual?: BingSelectVirtualMode
  virtualThreshold?: number
  virtualItemHeight?: number
  virtualOverscan?: number
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
}

export interface BingSelectChangePayload {
  value: BingSelectModelValue
  option?: BingSelectOption
  options: BingSelectOption[]
}

export interface BingSelectEmits {
  'update:modelValue': [value: BingSelectModelValue]
  change: [payload: BingSelectChangePayload]
  clear: []
  open: []
  close: []
}
