export type BingTextareaSize = 'sm' | 'md' | 'lg'
export type BingTextareaSubmitOn = 'enter' | 'mod-enter' | 'none'

export type BingTextareaAutosize =
  | boolean
  | {
      minRows?: number
      maxRows?: number
    }

export interface BingTextareaProps {
  id?: string
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  /** 默认关闭。开启后，清除可在焦点仍在控件内的 5 秒内通过 Ctrl / ⌘ + Z 撤销。 */
  clearable?: boolean
  smoothCaret?: boolean
  rows?: number
  autosize?: BingTextareaAutosize
  /** 默认开启 120ms 的自动增高过渡；宽度变化、超过三行的增长、达到 maxRows 或减少动效时直接调整。 */
  autosizeTransition?: boolean
  /** 默认 none；enter 保留 Shift+Enter 换行，mod-enter 使用 Ctrl / ⌘ + Enter 提交。 */
  submitOn?: BingTextareaSubmitOn
  maxLength?: number
  showCount?: boolean
  /** 自定义计数文案，计数按原生 maxlength 的 UTF-16 长度计算。 */
  countFormatter?: (count: number, max?: number) => string
  size?: BingTextareaSize
  block?: boolean
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
  name?: string
  autocomplete?: string
  spellcheck?: boolean | 'true' | 'false'
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  clearAriaLabel?: string
}

export interface BingTextareaEmits {
  'update:modelValue': [value: string]
  input: [value: string, event: Event]
  clear: []
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  submit: [value: string, event: KeyboardEvent]
  /** autosize 的实际高度稳定后通知一次；单位 px，不包含计数区和外框。 */
  resize: [height: number]
}

export interface BingTextareaExpose {
  textarea: HTMLTextAreaElement | null
  focus: () => void
  blur: () => void
  select: () => void
}
