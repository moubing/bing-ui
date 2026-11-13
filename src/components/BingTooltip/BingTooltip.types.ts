import type { BingGlassEffectProps } from '../../utils/glass'

export type BingTooltipTrigger = 'hover' | 'click' | 'manual'

export type BingTooltipPlacement = 'top' | 'right' | 'bottom' | 'left'

export type BingTooltipAlign = 'start' | 'center' | 'end'

export type BingTooltipTone = 'surface' | 'inverse'

export interface BingTooltipTriggerProps {
  'data-bing-tooltip-trigger': string
  'aria-describedby'?: string
  'aria-controls'?: string
  'aria-expanded'?: boolean
  'aria-keyshortcuts'?: string
}

export type BingTooltipOpenReason = 'hover' | 'click' | 'focus' | 'manual'

export type BingTooltipCloseReason =
  | 'hover'
  | 'click'
  | 'focus'
  | 'outside'
  | 'escape'
  | 'manual'
  | 'disabled'
  | 'replaced'

export interface BingTooltipProps extends BingGlassEffectProps {
  modelValue?: boolean
  content?: string
  trigger?: BingTooltipTrigger | BingTooltipTrigger[]
  placement?: BingTooltipPlacement
  align?: BingTooltipAlign
  disabled?: boolean
  interactive?: boolean
  openDelay?: number
  closeDelay?: number
  /** 上一个提示关闭后，免去悬停等待的时间窗口（毫秒）。 */
  skipDelay?: number
  /** 默认检测溢出后再启用滚动；富内容可显式开启，避免切换容器。 */
  scrollable?: boolean
  /** 菜单等触发器 aria-expanded=true 时自动关闭并抑制提示。 */
  suppressWhenExpanded?: boolean
  shortcut?: string | string[]
  tone?: BingTooltipTone
  offset?: number
  viewportPadding?: number
  maxWidth?: string | number
  zIndex?: number
  closeOnOutside?: boolean
  closeOnEsc?: boolean
  id?: string
  ariaLabel?: string
}

export interface BingTooltipEmits {
  'update:modelValue': [value: boolean]
  open: [reason: BingTooltipOpenReason]
  close: [reason: BingTooltipCloseReason]
}

export interface BingTooltipExpose {
  show: (reason?: BingTooltipOpenReason) => void
  hide: (reason?: BingTooltipCloseReason) => void
  toggle: (reason?: BingTooltipOpenReason | BingTooltipCloseReason) => void
  updatePosition: () => void
}
