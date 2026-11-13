import type { BingImagePreviewItem } from '../BingImagePreview/BingImagePreview.types'

export type BingImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'

export type BingImageRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

export type BingImageLoading = 'lazy' | 'eager'

export type BingImageDecoding = 'async' | 'sync' | 'auto'

export type BingImageFetchPriority = 'high' | 'low' | 'auto'

export type BingImageCrossOrigin = '' | 'anonymous' | 'use-credentials'

export type BingImageReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

export type BingImageStatus = 'idle' | 'loading' | 'loaded' | 'error'

export interface BingImageProps {
  src?: string
  alt?: string
  srcset?: string
  sizes?: string
  width?: number | string
  height?: number | string
  aspectRatio?: number | string
  fit?: BingImageFit
  position?: string
  radius?: BingImageRadius
  block?: boolean
  loading?: BingImageLoading
  decoding?: BingImageDecoding
  fetchPriority?: BingImageFetchPriority
  fallbackSrc?: string
  placeholderSrc?: string
  showLoading?: boolean
  showError?: boolean
  errorText?: string
  crossorigin?: BingImageCrossOrigin
  referrerPolicy?: BingImageReferrerPolicy
  preview?: boolean
  previewSrc?: string
  previewItems?: BingImagePreviewItem[]
  previewInitialIndex?: number
  previewDownloadable?: boolean
  previewDownloadUrl?: string
  previewDownloadName?: string
  previewAriaLabel?: string
}

export interface BingImageLoadPayload {
  event: Event
  src: string
  naturalWidth: number
  naturalHeight: number
}

export interface BingImageErrorPayload {
  event: Event
  src: string
  isFallback: boolean
}

export interface BingImageStatusChangePayload {
  status: BingImageStatus
  src?: string
}

export interface BingImagePreviewOpenPayload {
  src: string
}

export interface BingImagePreviewClosePayload {
  reason: 'close' | 'overlay' | 'escape'
}

export interface BingImageEmits {
  load: [payload: BingImageLoadPayload]
  error: [payload: BingImageErrorPayload]
  statusChange: [payload: BingImageStatusChangePayload]
  previewOpen: [payload: BingImagePreviewOpenPayload]
  previewClose: [payload: BingImagePreviewClosePayload]
}
