export type BingSplitPaneResizeSource = 'pointer' | 'keyboard' | 'reset'
export type BingSplitPaneCancelReason = 'escape' | 'pointercancel' | 'capture-lost' | 'blur' | 'container' | 'props' | 'unmount'

export interface BingSplitPaneProps {
  /** 右侧栏的持久偏好宽度；容器不足时临时压缩显示，不改写此值。 */
  sideSize?: number
  defaultSideSize?: number
  minSideSize?: number
  maxSideSize?: number
  minMainSize?: number
  keyboardStep?: number
  disabled?: boolean
  ariaLabel?: string
}

export interface BingSplitPaneResizePayload {
  /** 当前容器中的实际侧栏宽度，单位 px。 */
  size: number
  /** 已提交的偏好；resize-end 中为本次请求提交的偏好。 */
  preferredSize: number
  source: BingSplitPaneResizeSource
}

export interface BingSplitPaneCancelPayload extends BingSplitPaneResizePayload {
  reason: BingSplitPaneCancelReason
}

export interface BingSplitPaneEmits {
  /** 只在松手、键盘操作或重置时提交；取消和容器压缩不发送。 */
  'update:sideSize': [size: number]
  'resize-start': [payload: BingSplitPaneResizePayload]
  resize: [payload: BingSplitPaneResizePayload]
  'resize-end': [payload: BingSplitPaneResizePayload]
  'resize-cancel': [payload: BingSplitPaneCancelPayload]
}

export interface BingSplitPaneExpose {
  reset: () => void
}
