import type { BingGlassEffectProps } from '../../utils/glass'

export type BingColorPickerSize = 'sm' | 'md' | 'lg'

export type BingColorPickerFormat = 'hex' | 'rgba' | 'hsl'

export type BingColorPickerChangeSource = 'field' | 'slider' | 'alpha' | 'preset' | 'input'

export type BingColorPickerModelValue = string

export interface BingColorPickerPreset {
  label?: string
  value: string
}

export type BingColorPickerPresetInput = string | BingColorPickerPreset

export interface BingColorPickerRgbValue {
  r: number
  g: number
  b: number
  a: number
}

export interface BingColorPickerHslValue {
  h: number
  s: number
  l: number
  a: number
}

export interface BingColorPickerColorValue {
  hex: string
  hexAlpha: string
  rgba: string
  hsl: string
  rgb: BingColorPickerRgbValue
  hslParts: BingColorPickerHslValue
}

export interface BingColorPickerChangePayload extends BingColorPickerColorValue {
  value: string
  source: BingColorPickerChangeSource
}

export interface BingColorPickerCopyPayload {
  format: BingColorPickerFormat
  value: string
  color: BingColorPickerColorValue
}

export interface BingColorPickerProps extends BingGlassEffectProps {
  id?: string
  modelValue?: BingColorPickerModelValue
  presets?: BingColorPickerPresetInput[]
  disabled?: boolean
  size?: BingColorPickerSize
  block?: boolean
  width?: string | number
  minWidth?: string | number
  panelWidth?: string | number
  copyLabel?: string
  copiedLabel?: string
  copyResetDelay?: number
  ariaLabel?: string
  ariaDescribedby?: string
  status?: 'default' | 'error' | 'success' | 'warning'
}

export interface BingColorPickerEmits {
  'update:modelValue': [value: BingColorPickerModelValue]
  change: [payload: BingColorPickerChangePayload]
  copy: [payload: BingColorPickerCopyPayload]
  copyError: [error: Error]
  open: []
  close: []
}

export interface BingColorPickerExpose {
  focus: () => void
  blur: () => void
  openPanel: () => void
  closePanel: () => void
}
