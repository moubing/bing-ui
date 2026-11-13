import type { BingResizableProps } from '../BingResizable/BingResizable.types'
import type { SmoothScrollValue } from '../../motion/smoothScroll'

export type BingCodeBlockHighlightLine = number | [number, number]

export type BingCodeBlockTheme =
  | 'auto'
  | 'vitesse-light'
  | 'vitesse-dark'
  | 'github-light'
  | 'github-dark'
  | 'light-plus'
  | 'dark-plus'
  | (string & {})

export interface BingCodeBlockResizableOptions
  extends Pick<
    BingResizableProps,
    | 'defaultSize'
    | 'minWidth'
    | 'minHeight'
    | 'maxWidth'
    | 'maxHeight'
    | 'mode'
    | 'snapMode'
    | 'directions'
    | 'step'
    | 'disabled'
    | 'lockAspectRatio'
    | 'contain'
    | 'showSize'
    | 'handleSize'
    | 'ariaLabel'
  > {}

export interface BingCodeBlockProps {
  code: string
  language?: string
  /** Shiki theme name. `auto` follows the global Bing UI light/dark/system theme. */
  theme?: BingCodeBlockTheme
  title?: string
  languageLabel?: string
  copyable?: boolean
  copyLabel?: string
  copiedLabel?: string
  copyResetDelay?: number
  lineNumbers?: boolean
  highlightLines?: BingCodeBlockHighlightLine[]
  width?: string | number
  maxHeight?: string | number
  smoothScroll?: SmoothScrollValue
  resizable?: boolean
  resizableOptions?: BingCodeBlockResizableOptions
  wrap?: boolean
  ariaLabel?: string
}

export interface BingCodeBlockCopyPayload {
  code: string
  language: string
}

export interface BingCodeBlockEmits {
  copy: [payload: BingCodeBlockCopyPayload]
  copyError: [error: Error]
  highlightError: [error: Error]
}
