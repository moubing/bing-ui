import type { Component } from 'vue'

export type BingIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number | `${number}px`

export type BingIconTone =
  | 'inherit'
  | 'muted'
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'

export interface BingIconProps {
  icon: Component
  size?: BingIconSize
  tone?: BingIconTone
  strokeWidth?: number
  decorative?: boolean
  label?: string
}
