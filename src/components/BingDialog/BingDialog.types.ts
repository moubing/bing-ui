import type { BingGlassEffectProps } from '../../utils/glass'
import type { SmoothScrollValue } from '../../motion/smoothScroll'

export type BingDialogCloseReason = 'close' | 'cancel' | 'overlay' | 'escape' | 'confirm' | 'swipe'
export type BingDialogTransitionOrigin = 'auto' | 'center' | HTMLElement | { x: number; y: number }
export type BingDialogInitialFocus = 'auto' | string | HTMLElement | false

export interface BingDialogOverlayOrb {
  id?: string
  color: string
  x?: number
  y?: number
  size?: number | string
  opacity?: number
  blur?: number
  motionX?: number
  motionY?: number
  duration?: number
  delay?: number
}

export interface BingDialogProps extends BingGlassEffectProps {
  modelValue?: boolean
  title?: string
  width?: string | number
  /** 显式宽度仍受视口限制；默认最大宽度为 720px。 */
  maxWidth?: string | number
  /** 固定弹窗高度，内容在头部和底部之间滚动。 */
  height?: string | number
  /** 显式最大高度，始终限制在可用视口内。 */
  maxHeight?: string | number
  zIndex?: number
  lockScroll?: boolean
  smoothScroll?: SmoothScrollValue
  closeOnOverlay?: boolean
  closeOnEsc?: boolean
  closeOnConfirm?: boolean
  showClose?: boolean
  showFooter?: boolean
  cancelText?: string
  confirmText?: string
  confirmLoading?: boolean
  confirmDisabled?: boolean
  /** 默认跟随 confirmLoading；显式 false 可允许加载期间关闭。程序修改 v-model 不受限制。 */
  busy?: boolean
  /** 打开和取消关闭时的方向参考点，默认从当前焦点元素浮起。 */
  transitionOrigin?: BingDialogTransitionOrigin
  /** 默认优先内容区 autofocus、表单控件，再聚焦面板；false 沿用浮层默认焦点。 */
  initialFocus?: BingDialogInitialFocus
  /** 关闭被拦截时播放缩放与描边反馈，默认开启。 */
  rejectFeedback?: boolean
  /** 返回 false、抛错或等待超过 30 秒时保留弹窗；等待期间不重复调用。 */
  beforeClose?: (reason: BingDialogCloseReason) => boolean | Promise<boolean>
  /** @deprecated 此属性无视觉效果；背景模糊请使用 overlayBlur，下个大版本移除。 */
  glass?: boolean
  overlayBlur?: boolean
  overlayOrbs?: BingDialogOverlayOrb[]
  overlayOrbsAnimated?: boolean
  showPeek?: boolean
  peekOpacity?: number
  ariaLabel?: string
  ariaDescribedby?: string
}

export interface BingDialogEmits {
  'update:modelValue': [value: boolean]
  close: [reason: BingDialogCloseReason]
  'close-prevented': [reason: BingDialogCloseReason]
  cancel: []
  confirm: []
}
