import type {
  BingColorPickerFormat,
  BingColorPickerHslValue,
  BingColorPickerPreset,
  BingColorPickerPresetInput,
  BingColorPickerRgbValue,
} from './BingColorPicker.types'

export interface FormatEntry {
  format: BingColorPickerFormat
  label: string
  value: string
}

export interface NormalizedPreset {
  label: string
  value: string
}

export interface HsvColor {
  h: number
  s: number
  v: number
  a: number
}

export interface ParsedColor {
  alpha: number
  hex: string
}

export type ColorValue = ReturnType<typeof createColorValue>

export const defaultColor = '#ec4899'
export const defaultPresets: BingColorPickerPreset[] = [
  { label: '冰粉', value: '#ec4899' },
  { label: '玫瑰红', value: '#f43f5e' },
  { label: '琥珀橙', value: '#f59e0b' },
  { label: '柔金', value: '#eab308' },
  { label: '青柠绿', value: '#84cc16' },
  { label: '翡翠绿', value: '#10b981' },
  { label: '青色', value: '#06b6d4' },
  { label: '天蓝', value: '#0ea5e9' },
  { label: '亮蓝', value: '#3b82f6' },
  { label: '靛蓝', value: '#6366f1' },
  { label: '紫罗兰', value: '#8b5cf6' },
  { label: '品红', value: '#d946ef' },
  { label: '蓝灰', value: '#334155' },
  { label: '石墨黑', value: '#111827' },
  { label: '瓷白', value: '#f8fafc' },
  { label: '浅粉', value: '#fdf2f8' },
]

export function normalizeCssLength(value: string | number) {
  if (typeof value === 'number') {
    return `${value}px`
  }

  const trimmedValue = value.trim()

  return /^-?\d+(\.\d)?\d*$/.test(trimmedValue) ? `${trimmedValue}px` : value
}

export function parseCssSize(value: string | number | undefined, fallback: number) {
  if (typeof value === 'number') {
    return Math.max(0, value)
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)

    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback
  }

  return fallback
}

export function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

export function normalizeHue(value: number) {
  return ((Math.round(value) % 360) + 360) % 360
}

export function normalizeChannel(value: number) {
  return clamp(Math.round(value), 0, 255)
}

export function normalizeAlpha(value: number) {
  return Math.round(clamp(value, 0, 1) * 100) / 100
}

export function formatAlpha(value: number) {
  const alpha = normalizeAlpha(value)

  return Number.isInteger(alpha) ? `${alpha}` : `${alpha}`
}

export function componentToHex(value: number) {
  return normalizeChannel(value).toString(16).padStart(2, '0')
}

export function alphaToHex(value: number) {
  return componentToHex(normalizeAlpha(value) * 255)
}

export function rgbToHex(rgb: Pick<BingColorPickerRgbValue, 'r' | 'g' | 'b'>) {
  return `#${componentToHex(rgb.r)}${componentToHex(rgb.g)}${componentToHex(rgb.b)}`
}

export function rgbToHexAlpha(
  rgb: Pick<BingColorPickerRgbValue, 'r' | 'g' | 'b'>,
  alpha = 1,
) {
  return `${rgbToHex(rgb)}${alphaToHex(alpha)}`
}

export function parseAlphaChannel(value: string | undefined, fallback = 1) {
  if (value === undefined || value.trim() === '') {
    return fallback
  }

  const trimmed = value.trim()
  const parsed = Number.parseFloat(trimmed)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return normalizeAlpha(trimmed.endsWith('%') ? parsed / 100 : parsed)
}

export function parseRgbChannel(value: string | undefined) {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  const trimmed = value.trim()
  const parsed = Number.parseFloat(trimmed)

  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return normalizeChannel(trimmed.endsWith('%') ? (parsed / 100) * 255 : parsed)
}

export function parsePercentChannel(value: string | undefined) {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  const trimmed = value.trim()
  const parsed = Number.parseFloat(trimmed)

  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return clamp(parsed, 0, 100)
}

export function parseFunctionColorParts(value: string) {
  const [channelPart, alphaPart] = value.split('/')
  const channels = channelPart
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)

  return {
    alphaPart: alphaPart?.trim(),
    channels,
  }
}

export function parseColorInput(value: string | null | undefined) {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  const trimmed = normalized.replace(/^#/, '')

  if (/^[\da-f]{3}$/.test(trimmed)) {
    return {
      alpha: 1,
      hex: `#${trimmed.split('').map((part) => `${part}${part}`).join('')}`,
    }
  }

  if (/^[\da-f]{4}$/.test(trimmed)) {
    const parts = trimmed.split('')

    return {
      alpha: normalizeAlpha(Number.parseInt(`${parts[3]}${parts[3]}`, 16) / 255),
      hex: `#${parts.slice(0, 3).map((part) => `${part}${part}`).join('')}`,
    }
  }

  if (/^[\da-f]{6}$/.test(trimmed)) {
    return {
      alpha: 1,
      hex: `#${trimmed}`,
    }
  }

  if (/^[\da-f]{8}$/.test(trimmed)) {
    return {
      alpha: normalizeAlpha(Number.parseInt(trimmed.slice(6), 16) / 255),
      hex: `#${trimmed.slice(0, 6)}`,
    }
  }

  const rgbMatch = normalized.match(/^rgba?\((.+)\)$/)

  if (rgbMatch) {
    const { alphaPart, channels } = parseFunctionColorParts(rgbMatch[1])
    const [r, g, b] = channels.map(parseRgbChannel)
    const alpha = parseAlphaChannel(alphaPart ?? channels[3], 1)

    if (r !== undefined && g !== undefined && b !== undefined) {
      return {
        alpha,
        hex: rgbToHex({ r, g, b }),
      }
    }
  }

  const hslMatch = normalized.match(/^hsla?\((.+)\)$/)

  if (hslMatch) {
    const { alphaPart, channels } = parseFunctionColorParts(hslMatch[1])
    const hue = Number.parseFloat(channels[0] ?? '')
    const saturation = parsePercentChannel(channels[1])
    const lightness = parsePercentChannel(channels[2])
    const alpha = parseAlphaChannel(alphaPart ?? channels[3], 1)

    if (Number.isFinite(hue) && saturation !== undefined && lightness !== undefined) {
      return {
        alpha,
        hex: rgbToHex(
          hslToRgb({
            h: hue,
            s: saturation,
            l: lightness,
          }),
        ),
      }
    }
  }

  return undefined
}

export function normalizeHex(value: string | null | undefined) {
  return parseColorInput(value)?.hex
}

export function resolveColor(value: string | null | undefined) {
  return normalizeHex(value) ?? defaultColor
}

export function resolveAlpha(value: string | null | undefined) {
  return parseColorInput(value)?.alpha ?? 1
}

export function hexToRgb(hex: string): BingColorPickerRgbValue {
  const normalized = resolveColor(hex).slice(1)
  const value = Number.parseInt(normalized, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
    a: 1,
  }
}

export function getHueFromHex(hex: string, fallback: number) {
  const hsv = rgbToHsv(hexToRgb(hex))

  return hsv.s > 0 && hsv.v > 0 ? hsv.h : fallback
}

export function rgbToHsl(rgb: Pick<BingColorPickerRgbValue, 'r' | 'g' | 'b'>): BingColorPickerHslValue {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))

    if (max === r) {
      h = 60 * (((g - b) / delta) % 6)
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2)
    } else {
      h = 60 * ((r - g) / delta + 4)
    }
  }

  return {
    h: normalizeHue(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: 1,
  }
}

export function rgbToHsv(rgb: Pick<BingColorPickerRgbValue, 'r' | 'g' | 'b'>): HsvColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6)
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2)
    } else {
      h = 60 * ((r - g) / delta + 4)
    }
  }

  return {
    h: normalizeHue(h),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
    a: 1,
  }
}

export function hsvToRgb(hsv: Pick<HsvColor, 'h' | 's' | 'v'>): BingColorPickerRgbValue {
  const h = normalizeHue(hsv.h)
  const s = clamp(hsv.s, 0, 100) / 100
  const v = clamp(hsv.v, 0, 100) / 100
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: normalizeChannel((r + m) * 255),
    g: normalizeChannel((g + m) * 255),
    b: normalizeChannel((b + m) * 255),
    a: 1,
  }
}

export function hslToRgb(hsl: Pick<BingColorPickerHslValue, 'h' | 's' | 'l'>): BingColorPickerRgbValue {
  const h = normalizeHue(hsl.h)
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: normalizeChannel((r + m) * 255),
    g: normalizeChannel((g + m) * 255),
    b: normalizeChannel((b + m) * 255),
    a: 1,
  }
}

export function createColorValue(hex: string, alpha = 1) {
  const normalizedAlpha = normalizeAlpha(alpha)
  const rgb = {
    ...hexToRgb(hex),
    a: normalizedAlpha,
  }
  const hslParts = rgbToHsl(rgb)
  hslParts.a = normalizedAlpha
  const normalizedHex = rgbToHex(rgb)
  const alphaValue = formatAlpha(normalizedAlpha)

  return {
    hex: normalizedHex,
    hexAlpha: rgbToHexAlpha(rgb, normalizedAlpha),
    rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaValue})`,
    hsl:
      normalizedAlpha >= 1
        ? `hsl(${hslParts.h}, ${hslParts.s}%, ${hslParts.l}%)`
        : `hsla(${hslParts.h}, ${hslParts.s}%, ${hslParts.l}%, ${alphaValue})`,
    rgb,
    hslParts,
  }
}

export function getFormatLabel(format: BingColorPickerFormat) {
  return format === 'hex' ? 'HEX' : format === 'rgba' ? 'RGBA' : 'HSL'
}

export function getColorFormatValue(
  color: ReturnType<typeof createColorValue>,
  format: BingColorPickerFormat,
) {
  if (format === 'hex') {
    return color.hexAlpha
  }

  return format === 'rgba' ? color.rgba : color.hsl
}

export function normalizePreset(preset: BingColorPickerPresetInput): NormalizedPreset | undefined {
  const value = typeof preset === 'string' ? preset : preset.value
  const hex = normalizeHex(value)

  if (!hex) {
    return undefined
  }

  return {
    label: typeof preset === 'string' ? hex : preset.label ?? hex,
    value: hex,
  }
}
