import type { BingControlStatus } from '../BingForm/BingForm.types'

export type BingSliderSize = 'sm' | 'md' | 'lg'
export type BingSliderValue = number | [number, number]
export type BingSliderMark = number | { value: number; label?: string }
export type BingSliderTooltipMode = 'auto' | 'always' | 'never'
export type BingSliderOrientation = 'horizontal' | 'vertical'
/** 单值用法继续推断为 number，显式 range 时推断为元组。 */
export type BingSliderModelValue<Range extends boolean> = Range extends true ? [number, number] : number

export interface BingSliderProps<Range extends boolean = boolean> {
  id?: string
  modelValue?: BingSliderModelValue<Range>
  defaultValue?: BingSliderModelValue<Range>
  /** 默认 horizontal；vertical 从下到上递增，可通过 style.height 设置高度。 */
  orientation?: BingSliderOrientation
  /** 配置后双击滑块恢复该值；范围模式恢复整个元组，并遵守步长、刻度与最小间距。 */
  resetValue?: BingSliderModelValue<Range>
  min?: number
  max?: number
  step?: number
  size?: BingSliderSize
  disabled?: boolean
  name?: string
  status?: BingControlStatus
  ariaLabel?: string
  ariaLabelledby?: string
  ariaDescribedby?: string
  formatValueText?: (value: number) => string
  /** 默认 never；auto 仅在操作或键盘聚焦时显示，结束后延迟 600ms 隐藏。 */
  tooltip?: BingSliderTooltipMode
  formatTooltip?: (value: number) => string
  marks?: BingSliderMark[]
  /** 无有效标记时回退到 step；离散模式下标记值不再受 step 限制。 */
  snapToMarks?: boolean
  range?: Range & boolean
  /** 最小间距，无法整除 step 时向上对齐；超过可用跨度时限制为整个跨度。 */
  minDistance?: number
  /** 范围模式下分别指定两个 input 的完整读屏名称。 */
  thumbAriaLabels?: [string, string]
}

export interface BingSliderEmits<Range extends boolean = boolean> {
  'update:modelValue': [value: BingSliderModelValue<Range>]
  /** 指针松开、键盘调整结束或失焦时提交。 */
  change: [value: BingSliderModelValue<Range>]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}

export interface BingSliderExpose {
  input: HTMLInputElement | null
  inputs: HTMLInputElement[]
  focus: (index?: number) => void
  blur: () => void
}
