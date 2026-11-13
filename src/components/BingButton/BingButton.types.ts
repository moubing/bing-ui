export type BingButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'

export type BingButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type BingButtonRounded = 'none' | 'sm' | 'md' | 'lg' | 'full'

export type BingButtonHtmlType = 'button' | 'submit' | 'reset'

export type BingButtonTextShine = 'none' | 'hover' | 'always'

export type BingButtonTextEffect = 'none' | 'shine' | 'jump'

export type BingButtonTextEffectTrigger = 'always' | 'hover'

export type BingButtonShineDirection = 'left' | 'right'

export interface BingButtonProps {
  variant?: BingButtonVariant
  size?: BingButtonSize
  rounded?: BingButtonRounded
  htmlType?: BingButtonHtmlType
  disabled?: boolean
  loading?: boolean
  block?: boolean
  /** 是否启用点击节流，默认关闭。开启后使用 throttleDelay 指定间隔。 */
  throttle?: boolean
  throttleDelay?: number
  textEffect?: BingButtonTextEffect
  textEffectTrigger?: BingButtonTextEffectTrigger
  textShine?: BingButtonTextShine
  /** 文字内容变化时逐字过渡，按钮宽度随之平滑伸缩，例如「复制」→「已复制」。 */
  textSwap?: boolean
  shineColor?: string
  shineBaseColor?: string
  shineSpeed?: number
  shineDelay?: number
  shineInterval?: number
  shineDirection?: BingButtonShineDirection
  shineAngle?: number
  textJumpY?: number
  textJumpStagger?: number
  textJumpDuration?: number
  textJumpEase?: string
  textJumpReturnEase?: string
  textJumpRepeatDelay?: number
  ariaLabel?: string
}

export interface BingButtonThrottledPayload {
  event: MouseEvent
  remaining: number
}

export interface BingButtonEmits {
  click: [event: MouseEvent]
  throttled: [payload: BingButtonThrottledPayload]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}
