import type { SmoothScrollValue } from '../../motion/smoothScroll'

export const BING_TOAST_POSITIONS = [
  'top',
  'bottom',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const

export const BING_TOAST_POSITION_ALIASES = ['top-center', 'bottom-center'] as const

export const BING_TOAST_POSITION_OPTIONS = [
  ...BING_TOAST_POSITIONS,
  ...BING_TOAST_POSITION_ALIASES,
] as const

export type BingToastRenderPosition = (typeof BING_TOAST_POSITIONS)[number]

export type BingToastPosition = (typeof BING_TOAST_POSITION_OPTIONS)[number]

export type BingToastViewportPosition = BingToastPosition | 'all'

export type BingToastType = 'default' | 'success' | 'error' | 'loading' | 'warning' | 'info'

export type BingToastInput = string | BingToastOptions

export interface BingToastAction {
  /** 按钮文字，例如「撤销」。 */
  label: string
  /**
   * 点击回调。返回 Promise 时按钮显示处理中，提示暂停计时：兑现后按 closeOnClick 关闭；
   * 拒绝表示操作未成功，保留提示并恢复按钮供重试，组件不另行报错，失败原因由调用方提示。
   * 同步抛错视为缺陷，会交给应用的 errorHandler。
   */
  onClick: (toast: BingToastItem) => unknown
  /** 完成后是否关闭提示，默认 true。 */
  closeOnClick?: boolean
  ariaLabel?: string
}

export interface BingToastOptions {
  id?: string | number
  title?: string
  message?: string
  type?: BingToastType
  /** 未指定时，带操作按钮的提示至少保留 6000ms，loading 仍不自动关闭。 */
  duration?: number
  /** 提示内的单个操作按钮，例如撤销。 */
  action?: BingToastAction
  closable?: boolean
  position?: BingToastPosition
  ariaLabel?: string
  closeAriaLabel?: string
}

export interface BingToastItem {
  id: string
  type: BingToastType
  title?: string
  message: string
  duration: number
  closable: boolean
  position: BingToastRenderPosition
  createdAt: number
  order: number
  ariaLabel?: string
  closeAriaLabel: string
  action?: BingToastAction
  /** 操作按钮的 Promise 尚未完成。 */
  actionPending: boolean
}

export interface BingToastProps {
  viewportPosition?: BingToastViewportPosition
  zIndex?: number
  offset?: string | number
  gap?: string | number
  width?: string | number
  max?: number
  smoothScroll?: SmoothScrollValue
}

export interface BingToastEmits {
  close: [toast: BingToastItem]
}

export interface BingToastService {
  show: (input: BingToastInput) => string
  success: (input: BingToastInput) => string
  error: (input: BingToastInput) => string
  fail: (input: BingToastInput) => string
  failed: (input: BingToastInput) => string
  loading: (input: BingToastInput) => string
  warning: (input: BingToastInput) => string
  info: (input: BingToastInput) => string
  close: (id: string | number) => void
  clear: (position?: BingToastPosition) => void
  getToasts: () => BingToastItem[]
}

const bingToastRenderPositionSet = new Set<string>(BING_TOAST_POSITIONS)
const bingToastPositionAliases: Record<string, BingToastRenderPosition> = {
  'top-center': 'top',
  'bottom-center': 'bottom',
}

export function normalizeBingToastPosition(
  position: BingToastPosition | undefined,
  fallback: BingToastRenderPosition = 'top-right',
) {
  if (!position) {
    return fallback
  }

  if (bingToastRenderPositionSet.has(position)) {
    return position as BingToastRenderPosition
  }

  return bingToastPositionAliases[position] ?? fallback
}
