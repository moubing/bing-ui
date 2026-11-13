import type { VNode } from 'vue'

export type BingCursorType =
  | 'default'
  | 'pointer'
  | 'not-allowed'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'move'
  | 'crosshair'
  | 'col-resize'
  | 'row-resize'
  | 'ew-resize'
  | 'ns-resize'
  | 'nwse-resize'
  | 'nesw-resize'
  | 'zoom-in'
  | 'zoom-out'

export interface BingCursorProps {
  /** 自动识别元素的 CSS cursor 和交互语义，也可固定一种光标。 */
  type?: BingCursorType | 'auto'
  /** 默认只作用于默认插槽的内容；开启后作用于当前文档。 */
  global?: boolean
  disabled?: boolean
  /** 光标画布大小，单位 px。 */
  size?: number
  color?: string
  outlineColor?: string
  /** 点击热点，相对于光标左上角，单位 px；原生渲染会取整并限制在画布内。 */
  hotspot?: readonly [number, number]
}

export interface BingCursorSlots {
  default?: () => VNode[]
}

export interface BingCursorEmits {
  change: [type: BingCursorType]
  'visibility-change': [visible: boolean]
}
