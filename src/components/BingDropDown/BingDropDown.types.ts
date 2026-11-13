import type { Component } from 'vue'
import type { BingGlassEffectProps } from '../../utils/glass'

export type BingDropDownPlacement =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end'

export type BingDropDownSize = 'sm' | 'md' | 'lg'

export type BingDropDownTrigger = 'click' | 'hover' | 'contextmenu'
export type BingDropDownHighlightMotion = 'liquid' | 'slide'
export type BingDropDownItemType = 'item' | 'radio' | 'checkbox'

/** 客户端视口坐标；可传真实元素，也可传光标/选区的虚拟锚点。 */
export interface BingDropDownAnchor {
  getBoundingClientRect: () => Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height'>
}

export type BingDropDownItemTone =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'

export interface BingDropDownProps extends BingGlassEffectProps {
  open?: boolean | null
  context?: unknown | null
  trigger?: BingDropDownTrigger
  placement?: BingDropDownPlacement
  anchor?: BingDropDownAnchor | null
  boundary?: BingDropDownAnchor | null
  size?: BingDropDownSize
  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  panelClass?: string
  block?: boolean
  closeOnOutside?: boolean
  closeOnEscape?: boolean
  autoFocus?: boolean
  loop?: boolean
  hoverOpenDelay?: number
  hoverCloseDelay?: number
  typeahead?: boolean
  highlightMotion?: BingDropDownHighlightMotion
  ariaLabel?: string
}

export interface BingDropDownContextOpenPayload {
  event: MouseEvent | KeyboardEvent
  context: unknown | null
  x: number
  y: number
}

export interface BingDropDownEmits {
  'update:open': [open: boolean]
  'update:context': [context: unknown | null]
  open: []
  close: []
  'context-open': [payload: BingDropDownContextOpenPayload]
  'after-enter': []
  'after-leave': []
}

export interface BingDropDownExpose {
  openPanel: () => void
  close: () => void
  toggle: () => void
  focusFirstItem: () => void
}

export interface BingDropDownItemProps {
  title?: string
  description?: string
  shortcut?: string | string[]
  icon?: Component
  href?: string
  target?: string
  rel?: string
  tone?: BingDropDownItemTone
  disabled?: boolean
  active?: boolean
  type?: BingDropDownItemType
  checked?: boolean
  /** 键盘前缀匹配文本，可填写拼音或别名；默认读取标题。 */
  textValue?: string
  closeOnClick?: boolean
  ariaLabel?: string
}

export interface BingDropDownItemEmits {
  click: [event: MouseEvent]
}

export interface BingDropDownGroupProps {
  label?: string
}
