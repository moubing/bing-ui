export type BingResizableDirection =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type BingResizableMode = 'fixed' | 'mirror'

export type BingResizableSnapMode = 'live' | 'end'

export type BingResizableSizeValue = number | string

export interface BingResizableSize {
  width?: BingResizableSizeValue
  height?: BingResizableSizeValue
}

export interface BingResizableResolvedSize {
  width: number
  height: number
}

export interface BingResizablePosition {
  x: number
  y: number
}

export type BingResizableStep =
  | number
  | {
      x?: number
      y?: number
    }

export interface BingResizableDelta {
  x: number
  y: number
}

export interface BingResizablePayload {
  direction: BingResizableDirection
  size: BingResizableResolvedSize
  position: BingResizablePosition
  delta: BingResizableDelta
  event: PointerEvent | KeyboardEvent
}

export interface BingResizableProps {
  size?: BingResizableSize
  defaultSize?: BingResizableSize
  position?: Partial<BingResizablePosition>
  defaultPosition?: Partial<BingResizablePosition>
  minWidth?: BingResizableSizeValue
  minHeight?: BingResizableSizeValue
  maxWidth?: BingResizableSizeValue
  maxHeight?: BingResizableSizeValue
  mode?: BingResizableMode
  snapMode?: BingResizableSnapMode
  directions?: BingResizableDirection[]
  step?: BingResizableStep
  disabled?: boolean
  lockAspectRatio?: boolean
  contain?: boolean
  showSize?: boolean
  handleSize?: number
  ariaLabel?: string
}

export interface BingResizableEmits {
  'update:size': [size: BingResizableResolvedSize]
  'update:position': [position: BingResizablePosition]
  'resize-start': [payload: BingResizablePayload]
  resize: [payload: BingResizablePayload]
  'resize-end': [payload: BingResizablePayload]
}

export interface BingResizableExpose {
  reset: () => void
  getSize: () => BingResizableResolvedSize
  getPosition: () => BingResizablePosition
}
