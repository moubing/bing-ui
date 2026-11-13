import type { BingGlassEffectProps } from '../../utils/glass'
import type { SmoothScrollValue } from '../../motion/smoothScroll'

export type BingFilePreviewKind =
  | 'auto'
  | 'image'
  | 'pdf'
  | 'text'
  | 'json'
  | 'csv'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'office'
  | 'unknown'

export type BingFilePreviewResolvedKind = Exclude<BingFilePreviewKind, 'auto'>

export type BingFilePreviewCloseReason = 'close' | 'overlay' | 'escape'

export interface BingFilePreviewFile {
  src?: string
  name?: string
  type?: BingFilePreviewKind
  mimeType?: string
  previewSrc?: string
  content?: string
  downloadUrl?: string
  size?: number
}

export interface BingFilePreviewProps extends BingGlassEffectProps {
  modelValue?: boolean
  file?: BingFilePreviewFile
  src?: string
  name?: string
  type?: BingFilePreviewKind
  mimeType?: string
  previewSrc?: string
  content?: string
  downloadUrl?: string
  size?: number
  zIndex?: number
  width?: string | number
  height?: string | number
  smoothScroll?: SmoothScrollValue
  lockScroll?: boolean
  closeOnEsc?: boolean
  closeOnOverlay?: boolean
  downloadable?: boolean
  openable?: boolean
  jsonHighlight?: boolean
  jsonHighlightMaxLength?: number
  textMaxLength?: number
  csvMaxRows?: number
  csvMaxColumns?: number
  teleportTo?: string | HTMLElement
  ariaLabel?: string
}

export interface BingFilePreviewDownloadPayload {
  file: BingFilePreviewFile
  kind: BingFilePreviewResolvedKind
}

export interface BingFilePreviewOpenExternalPayload {
  file: BingFilePreviewFile
  kind: BingFilePreviewResolvedKind
}

export interface BingFilePreviewEmits {
  'update:modelValue': [value: boolean]
  close: [reason: BingFilePreviewCloseReason]
  download: [payload: BingFilePreviewDownloadPayload]
  openExternal: [payload: BingFilePreviewOpenExternalPayload]
  error: [error: Error]
}
