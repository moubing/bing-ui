export type BingRadioValue = string | number | boolean

export type BingRadioGroupSize = 'sm' | 'md' | 'lg'

export type BingRadioGroupDirection = 'row' | 'column' | 'wrap'

export interface BingRadioGroupOption {
  label: string
  value: BingRadioValue
  disabled?: boolean
  description?: string
}

export interface BingRadioGroupProps {
  id?: string
  modelValue?: BingRadioValue | null
  options?: BingRadioGroupOption[]
  disabled?: boolean
  size?: BingRadioGroupSize
  direction?: BingRadioGroupDirection
  name?: string
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
}

export interface BingRadioGroupEmits {
  'update:modelValue': [value: BingRadioValue]
  change: [value: BingRadioValue, event: Event]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}
