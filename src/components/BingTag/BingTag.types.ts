export type BingTagSize = 'sm' | 'md' | 'lg'

export type BingTagTone =
  | 'primary'
  | 'secondary'
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'

export type BingTagVariant = 'glass' | 'soft'

export interface BingTagProps {
  label?: string
  size?: BingTagSize
  tone?: BingTagTone
  variant?: BingTagVariant
  closable?: boolean
  disabled?: boolean
  closeAriaLabel?: string
}

export interface BingTagEmits {
  close: [event: MouseEvent]
}
