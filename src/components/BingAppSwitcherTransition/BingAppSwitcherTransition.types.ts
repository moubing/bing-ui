import type { BingTabValue } from '../BingTabs'

export interface BingAppSwitcherTransitionItem {
  value: BingTabValue
  label: string
  disabled?: boolean
  ariaLabel?: string
  [key: string]: unknown
}

export interface BingAppSwitcherTransitionProps {
  modelValue?: BingTabValue
  items?: BingAppSwitcherTransitionItem[]
  disabled?: boolean
  respectReducedMotion?: boolean
  loop?: boolean
  showTabs?: boolean
  ariaLabel?: string
}

export interface BingAppSwitcherTransitionSlotProps {
  item: BingAppSwitcherTransitionItem
  index: number
  active: boolean
  isAnimating: boolean
}

export interface BingAppSwitcherTransitionChangePayload {
  value: BingTabValue
  previousValue?: BingTabValue
  item: BingAppSwitcherTransitionItem
  previousItem?: BingAppSwitcherTransitionItem
}

export interface BingAppSwitcherTransitionEmits {
  'update:modelValue': [value: BingTabValue]
  change: [payload: BingAppSwitcherTransitionChangePayload]
}
