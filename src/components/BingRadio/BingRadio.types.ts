import type { BingRadioGroupSize, BingRadioValue } from '../BingRadioGroup/BingRadioGroup.types'

export type BingRadioSize = BingRadioGroupSize

export interface BingRadioProps {
  id?: string
  modelValue?: BingRadioValue | null
  value?: BingRadioValue
  disabled?: boolean
  size?: BingRadioSize
  label?: string
  description?: string
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
  name?: string
}

export interface BingRadioEmits {
  'update:modelValue': [value: BingRadioValue]
  change: [value: BingRadioValue, event: Event]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}
