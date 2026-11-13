import type { BingTabValue } from '../BingTabs'

export interface BingDeckTransitionItem {
  value: BingTabValue
  label: string
  disabled?: boolean
  [key: string]: unknown
}

export interface BingDeckTransitionProps {
  modelValue?: BingTabValue
  items?: BingDeckTransitionItem[]
  disabled?: boolean
  respectReducedMotion?: boolean
  loop?: boolean
  showControls?: boolean
  controlLabel?: string
}

export interface BingDeckTransitionSlotProps {
  item: BingDeckTransitionItem
  index: number
  active: boolean
  isAnimating: boolean
}

export interface BingDeckTransitionControlsSlotProps {
  next: () => void
  activeItem?: BingDeckTransitionItem
  activeIndex: number
  isAnimating: boolean
}

export interface BingDeckTransitionChangePayload {
  value: BingTabValue
  previousValue?: BingTabValue
  item: BingDeckTransitionItem
  previousItem?: BingDeckTransitionItem
}

export interface BingDeckTransitionEmits {
  'update:modelValue': [value: BingTabValue]
  change: [payload: BingDeckTransitionChangePayload]
}
