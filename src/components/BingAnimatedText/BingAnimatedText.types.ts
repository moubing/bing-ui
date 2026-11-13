/**
 * - `shine`：保持文字原色，一道高光扫过。
 * - `shimmer`：文字常态减淡，一道原色光带扫过，适合「思考中」「同步中」等持续状态。
 * - `jump`：逐字跳跃，hover 时从指针最近的字向两侧扩散。
 */
export type BingAnimatedTextEffect = 'none' | 'shine' | 'shimmer' | 'jump'

/** `once` 在文字进入视口时播放一次；`always` 离开视口时自动暂停。 */
export type BingAnimatedTextTrigger = 'always' | 'hover' | 'once'

export type BingAnimatedTextShineDirection = 'left' | 'right'

/** 可直接传入 PointerEvent / MouseEvent，让动画从指针位置起势。 */
export interface BingAnimatedTextPlayOrigin {
  clientX: number
  clientY: number
}

export interface BingAnimatedTextProps {
  effect?: BingAnimatedTextEffect
  trigger?: BingAnimatedTextTrigger
  disabled?: boolean
  /**
   * hover / 键盘聚焦的感应区域，默认是文字自身。
   * 传入元素，或传入选择器并从文字向上 `closest()` 查找，例如按钮整体。
   */
  hoverTarget?: string | HTMLElement | null
  /** hover 时是否从指针进入的位置起势：jump 从最近的字扩散，shine 从进入一侧扫入。 */
  followPointer?: boolean
  /** 文字内容变化时逐字过渡：保留的字滑到新位置，删除的字上移淡出，新增的字从下方翻入。 */
  swap?: boolean
  shineColor?: string
  shineBaseColor?: string
  /** 单次扫光穿过文字的时长，单位秒。 */
  shineSpeed?: number
  shineDelay?: number
  shineInterval?: number
  shineDirection?: BingAnimatedTextShineDirection
  shineAngle?: number
  jumpY?: number
  jumpStagger?: number
  jumpDuration?: number
  jumpEase?: string
  jumpReturnEase?: string
  jumpRepeatDelay?: number
}

export interface BingAnimatedTextExpose {
  /** 手动播放一次当前效果；传入指针事件时从该位置起势。 */
  play: (origin?: BingAnimatedTextPlayOrigin) => void
}
