export type BingCheckboxGroupValue = string | number

export type BingCheckboxGroupSize = 'sm' | 'md' | 'lg'

export type BingCheckboxGroupDirection = 'row' | 'column' | 'wrap'

export interface BingCheckboxGroupOption {
  label: string
  value: BingCheckboxGroupValue
  disabled?: boolean
  description?: string
}

export interface BingCheckboxGroupProps {
  id?: string
  modelValue?: BingCheckboxGroupValue[]
  options?: BingCheckboxGroupOption[]
  disabled?: boolean
  size?: BingCheckboxGroupSize
  direction?: BingCheckboxGroupDirection
  /** 鼠标或触控笔跨项拖动时连续选择；触摸保持原生滚动。默认关闭。 */
  dragSelect?: boolean
  /** Shift + 点击选择上一次点击项到当前项之间的可用项。默认关闭。 */
  rangeSelect?: boolean
  name?: string
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
}

export interface BingCheckboxGroupEmits {
  'update:modelValue': [value: BingCheckboxGroupValue[]]
  change: [value: BingCheckboxGroupValue[], event: Event]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}
