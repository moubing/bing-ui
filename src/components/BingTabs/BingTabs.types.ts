import type { SmoothScrollValue } from '../../motion/smoothScroll'

export type BingTabValue = string | number

export type BingTabsSize = 'sm' | 'md' | 'lg'

export type BingTabsVariant = 'pill' | 'glass' | 'soft'

export type BingTabsActivation = 'auto' | 'manual'

export interface BingTabItem {
  value: BingTabValue
  label: string
  disabled?: boolean
  ariaLabel?: string
  [key: string]: unknown
}

export interface BingTabsProps {
  modelValue?: BingTabValue
  items?: BingTabItem[]
  size?: BingTabsSize
  variant?: BingTabsVariant
  activation?: BingTabsActivation
  disabled?: boolean
  block?: boolean
  loop?: boolean
  animated?: boolean
  respectReducedMotion?: boolean
  smoothScroll?: SmoothScrollValue
  ariaLabel?: string
}

export interface BingTabsChangePayload {
  value: BingTabValue
  previousValue?: BingTabValue
  item: BingTabItem
  previousItem?: BingTabItem
  event: MouseEvent | KeyboardEvent
}

export interface BingTabsFocusPayload {
  value: BingTabValue
  item: BingTabItem
  event: FocusEvent
}

export interface BingTabsEmits {
  'update:modelValue': [value: BingTabValue]
  change: [payload: BingTabsChangePayload]
  focus: [payload: BingTabsFocusPayload]
  blur: [payload: BingTabsFocusPayload]
}
