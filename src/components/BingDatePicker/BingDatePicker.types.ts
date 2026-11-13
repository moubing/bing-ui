import type { Dayjs } from 'dayjs'
import type { SmoothScrollValue } from '../../motion/smoothScroll'
import type { BingGlassEffectProps } from '../../utils/glass'

export type BingDatePickerType = 'date' | 'datetime' | 'month' | 'year' | 'time'

export type BingDatePickerSize = 'sm' | 'md' | 'lg'

export type BingDatePickerSingleValue = string | null

export type BingDatePickerRangeValue = [string, string] | null

export type BingDatePickerModelValue =
  | BingDatePickerSingleValue
  | BingDatePickerRangeValue

export type BingDatePickerRangeRole = 'start' | 'end'

export type BingDatePickerTimeUnit = 'hour' | 'minute' | 'second'

export interface BingDatePickerDisabledDateContext {
  type: BingDatePickerType
  range: boolean
  role?: BingDatePickerRangeRole
}

export interface BingDatePickerDisabledTimeContext
  extends BingDatePickerDisabledDateContext {
  unit: BingDatePickerTimeUnit
  value: number
}

export interface BingDatePickerChangePayload {
  value: BingDatePickerModelValue
  parsedValue: Dayjs | [Dayjs, Dayjs] | null
  type: BingDatePickerType
  range: boolean
}

export interface BingDatePickerProps extends BingGlassEffectProps {
  id?: string
  modelValue?: BingDatePickerModelValue
  type?: BingDatePickerType
  range?: boolean
  placeholder?: string
  startPlaceholder?: string
  endPlaceholder?: string
  disabled?: boolean
  clearable?: boolean
  size?: BingDatePickerSize
  block?: boolean
  minWidth?: string | number
  format?: string
  valueFormat?: string
  /** 日历月份、星期的格式化语言，默认 zh-CN。 */
  locale?: string
  firstDayOfWeek?: number
  min?: string
  max?: string
  disabledDate?: (
    value: Dayjs,
    context: BingDatePickerDisabledDateContext,
  ) => boolean
  disabledTime?: (
    value: Dayjs,
    context: BingDatePickerDisabledTimeContext,
  ) => boolean
  hourStep?: number
  minuteStep?: number
  secondStep?: number
  smoothScroll?: SmoothScrollValue
  showShortcuts?: boolean
  panelMaxHeight?: string | number
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
}

export interface BingDatePickerEmits {
  'update:modelValue': [value: BingDatePickerModelValue]
  change: [payload: BingDatePickerChangePayload]
  clear: []
  open: []
  close: []
  confirm: [payload: BingDatePickerChangePayload]
  cancel: []
}

export interface BingDatePickerExpose {
  focus: () => void
  blur: () => void
  openPanel: () => void
  closePanel: () => void
  clear: () => void
}
