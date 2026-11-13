import type { BingGlassEffectProps } from '../../utils/glass'

export interface BingImagePreviewItem {
  src: string
  alt?: string
  previewSrc?: string
  downloadUrl?: string
  downloadName?: string
  caption?: string
}

export type BingImagePreviewCloseReason = 'close' | 'overlay' | 'escape'

export interface BingImagePreviewProps extends BingGlassEffectProps {
  modelValue?: boolean
  items?: BingImagePreviewItem[]
  initialIndex?: number
  currentIndex?: number
  zIndex?: number
  minScale?: number
  maxScale?: number
  zoomStep?: number
  downloadable?: boolean
  loop?: boolean
  lockScroll?: boolean
  closeOnEsc?: boolean
  closeOnOverlay?: boolean
  showToolbar?: boolean
  showCounter?: boolean
  teleportTo?: string | HTMLElement
  ariaLabel?: string
}

export interface BingImagePreviewDownloadPayload {
  item: BingImagePreviewItem
  index: number
}

export interface BingImagePreviewEmits {
  'update:modelValue': [value: boolean]
  'update:currentIndex': [value: number]
  close: [reason: BingImagePreviewCloseReason]
  change: [index: number, item: BingImagePreviewItem]
  download: [payload: BingImagePreviewDownloadPayload]
}
