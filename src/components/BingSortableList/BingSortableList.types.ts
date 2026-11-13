import type { ComponentPublicInstance, HTMLAttributes } from 'vue'

export type BingSortableListKey = string | number

export type BingSortableListAxis = 'vertical' | 'horizontal'

export type BingSortableListReorderMode = 'drop' | 'live'

export type BingSortableListItemKey<T> =
  | keyof T
  | ((item: T, index: number) => BingSortableListKey)

export type BingSortableListItemDisabled<T> =
  | keyof T
  | ((item: T, index: number) => boolean)

export interface BingSortableListPayload<T = Record<string, unknown>> {
  key: BingSortableListKey
  item: T
  from: number
  to: number
  order: BingSortableListKey[]
  event?: PointerEvent | KeyboardEvent
}

export interface BingSortableListDragPayload<T = Record<string, unknown>> {
  key: BingSortableListKey
  item: T
  index: number
  order: BingSortableListKey[]
  event: PointerEvent
}

export interface BingSortableListProps<T = Record<string, unknown>> {
  items?: T[]
  order?: BingSortableListKey[]
  itemKey?: BingSortableListItemKey<T>
  itemDisabled?: BingSortableListItemDisabled<T>
  disabledKeys?: BingSortableListKey[]
  axis?: BingSortableListAxis
  disabled?: boolean
  keyboard?: boolean
  flip?: boolean
  reorderMode?: BingSortableListReorderMode
  duration?: number
  settleDuration?: number
  dragThreshold?: number
  /** 使用浮层展示拖拽项，预览复用默认插槽。 */
  dragOverlay?: boolean
  ariaLabel?: string
  handleAriaLabel?: string | ((item: T, index: number) => string)
}

export interface BingSortableListEmits<T = Record<string, unknown>> {
  'update:order': [order: BingSortableListKey[]]
  reorder: [payload: BingSortableListPayload<T>]
  'drag-start': [payload: BingSortableListDragPayload<T>]
  drag: [payload: BingSortableListDragPayload<T>]
  'drag-end': [payload: BingSortableListDragPayload<T>]
}

export interface BingSortableListHandleProps extends HTMLAttributes {
  ref: (element: Element | ComponentPublicInstance | null) => void
  role: 'button'
  tabindex: number
  'aria-label': string
  'aria-disabled': 'true' | 'false'
  onKeydown: (event: KeyboardEvent) => void
}

export interface BingSortableListSlotProps<T = Record<string, unknown>> {
  item: T
  key: BingSortableListKey
  index: number
  active: boolean
  dragging: boolean
  disabled: boolean
  handleProps: BingSortableListHandleProps
}
