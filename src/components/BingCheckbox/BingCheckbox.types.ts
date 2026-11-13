export type BingCheckboxSize = 'sm' | 'md' | 'lg' | number

export type BingCheckboxShape = 'rounded' | 'circle'

export type BingCheckboxTone = 'primary' | 'secondary'

export interface BingCheckboxProps {
  id?: string
  modelValue?: boolean
  indeterminate?: boolean
  disabled?: boolean
  size?: BingCheckboxSize
  shape?: BingCheckboxShape
  tone?: BingCheckboxTone
  label?: string
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
  name?: string
  value?: string | number
  decorative?: boolean
}

export interface BingCheckboxEmits {
  'update:modelValue': [value: boolean]
  change: [value: boolean, event: Event]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}
