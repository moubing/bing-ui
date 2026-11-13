export type BingDragDropKey = string | number

/** 正在拖动的条目。`zone` 是条目当前所在的区域，由 BingDraggable 声明。 */
export interface BingDragDropItem<T = unknown> {
  id: BingDragDropKey
  zone?: BingDragDropKey
  data?: T
}

export interface BingDragDropActive<T = unknown> extends BingDragDropItem<T> {
  /** 指针下方且接受该条目的区域；不在任何区域时为 null。 */
  over: BingDragDropKey | null
  pointerType?: string
}

export interface BingDragDropStartPayload<T = unknown> extends BingDragDropItem<T> {
  event?: Event
}

export interface BingDragDropOverPayload<T = unknown> extends BingDragDropItem<T> {
  over: BingDragDropKey | null
}

export interface BingDragDropDropPayload<T = unknown> {
  id: BingDragDropKey
  data?: T
  from?: BingDragDropKey
  to: BingDragDropKey
  event?: Event
}

export interface BingDragDropEndPayload<T = unknown> {
  id: BingDragDropKey
  data?: T
  from?: BingDragDropKey
  /** 松手时所在的区域；取消或不在区域内时为 null。 */
  to: BingDragDropKey | null
  canceled: boolean
  event?: Event
}

export interface BingDragDropProps {
  disabled?: boolean
  /** 鼠标与触控笔按下后移动超过该距离（px）才开始拖动，单击保持原有行为。 */
  dragThreshold?: number
  /** 触屏长按多久（ms）开始拖动；长按前移动视为滚动页面。 */
  touchDelay?: number
  /** 长按期间允许的手指抖动距离（px），超过即放弃拖动。 */
  touchTolerance?: number
  /** 拖到滚动容器或窗口边缘时自动滚动。 */
  autoScroll?: boolean
  /**
   * 落在源区域内是否也触发 drop。默认 false：
   * 放回原区域只触发 drag-end，不触发 drop。
   */
  dropOnSource?: boolean
}

export interface BingDragDropEmits<T = unknown> {
  'drag-start': [payload: BingDragDropStartPayload<T>]
  'drag-over': [payload: BingDragDropOverPayload<T>]
  drop: [payload: BingDragDropDropPayload<T>]
  'drag-end': [payload: BingDragDropEndPayload<T>]
}

export interface BingDragDropSlotProps<T = unknown> {
  active: BingDragDropActive<T> | null
  cancel: () => void
}

export interface BingDraggableProps<T = unknown> {
  id: BingDragDropKey
  /** 条目当前所在的区域，用于识别源区域和 drop 的 from。 */
  zone?: BingDragDropKey
  data?: T
  disabled?: boolean
  tag?: string
  /**
   * 命中这些元素时不开始拖动，例如条目内的菜单按钮或输入框。
   * 条目本身是链接或按钮时不受影响。
   */
  ignore?: string
}

export interface BingDraggableSlotProps {
  /** 当前条目正被拖动（原位置留作占位）。 */
  dragging: boolean
  /** 同一 BingDragDrop 内有任意条目正在拖动。 */
  active: boolean
  disabled: boolean
}

/**
 * - `idle`：没有拖动
 * - `source`：被拖条目所在的区域
 * - `target`：可放置
 * - `over`：指针正在该区域上方，松手即放置
 * - `disabled`：不接受当前条目
 */
export type BingDropZoneState = 'idle' | 'source' | 'target' | 'over' | 'disabled'

export interface BingDropZoneProps<T = unknown> {
  id: BingDragDropKey
  /** 返回 false 时不接受该条目；源区域不调用。 */
  accept?: (item: BingDragDropItem<T>) => boolean
  disabled?: boolean
  tag?: string
  /** 区域的可访问名称，例如列名。 */
  ariaLabel?: string
}

export interface BingDropZoneSlotProps<T = unknown> {
  state: BingDropZoneState
  /** 指针在该区域上方（含源区域）。 */
  over: boolean
  active: BingDragDropActive<T> | null
}

export interface BingDragOverlayProps {
  /** 拖动时的倾斜角度（deg）；减少动效时为 0。 */
  tilt?: number
  /** 松手后浮层回到落点的动画时长（ms），0 表示直接消失。 */
  dropDuration?: number
}

export interface BingDragOverlaySlotProps<T = unknown> {
  id: BingDragDropKey
  zone?: BingDragDropKey
  data?: T
  over: BingDragDropKey | null
}
