import type { Component } from 'vue'

export type BingInputSize = 'sm' | 'md' | 'lg'

export type BingInputType = 'text' | 'search' | 'email' | 'password' | 'tel' | 'url' | 'number'
export type BingInputValue = string | number | null

export interface BingInputProps {
  id?: string
  modelValue?: BingInputValue
  type?: BingInputType
  min?: number | string
  max?: number | string
  step?: number | string
  /** 数字输入在失焦、Enter 时按 min/max 和 step 规整，默认开启。 */
  clampOnBlur?: boolean
  /** 密码显隐按钮，默认开启。 */
  passwordToggle?: boolean
  prefix?: string
  suffix?: string
  maxLength?: number
  showCount?: boolean
  loading?: boolean
  /** 数字类型可在 prefix 上横向拖动，每 4px 一个步长；Shift 为十倍步长。 */
  scrub?: boolean
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  /** 搜索输入默认开启，其他类型默认关闭；可显式覆盖。 */
  clearable?: boolean
  /** 默认开启约 90ms 的光标位移过渡，组词时跟随原生选区焦点端；不能可靠定位时保留原生光标。 */
  smoothCaret?: boolean
  icon?: Component
  iconLabel?: string
  size?: BingInputSize
  block?: boolean
  debounceDelay?: number
  clearAriaLabel?: string
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
  name?: string
  /** 浏览器自动填充设置，默认 'off'。 */
  autocomplete?: string
  spellcheck?: boolean | 'true' | 'false'
}

export interface BingInputEmits {
  'update:modelValue': [value: BingInputValue]
  input: [value: string, event: Event]
  'debounced-input': [value: string]
  clear: []
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  enter: [value: BingInputValue, event: KeyboardEvent]
}

export interface BingInputExpose {
  input: HTMLInputElement | null
  focus: () => void
  blur: () => void
  select: () => void
}
