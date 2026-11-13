import type { BingTabValue } from '../BingTabs'

export interface BingCarouselTransitionItem {
  value: BingTabValue
  label: string
  disabled?: boolean
  ariaLabel?: string
  [key: string]: unknown
}

export interface BingCarouselTransitionProps {
  modelValue?: BingTabValue
  items?: BingCarouselTransitionItem[]
  disabled?: boolean
  respectReducedMotion?: boolean
  loop?: boolean
  showTabs?: boolean
  ariaLabel?: string
}

export interface BingCarouselTransitionSlotProps {
  item: BingCarouselTransitionItem
  index: number
  active: boolean
  isAnimating: boolean
}

export interface BingCarouselTransitionChangePayload {
  value: BingTabValue
  previousValue?: BingTabValue
  item: BingCarouselTransitionItem
  previousItem?: BingCarouselTransitionItem
}

export interface BingCarouselTransitionEmits {
  'update:modelValue': [value: BingTabValue]
  change: [payload: BingCarouselTransitionChangePayload]
}
