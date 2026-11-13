export interface BingGlassEffectProps {
  glass?: boolean
  glassBlur?: string | number
  glassOpacity?: number
  glassSaturation?: number
}

export const defaultGlassEffect = {
  glass: true,
  glassBlur: 16,
  glassOpacity: 0.85,
  glassSaturation: 1.28,
} satisfies Required<BingGlassEffectProps>

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeGlassCssLength(value: string | number) {
  if (typeof value === 'number') {
    return `${Math.max(0, value)}px`
  }

  const trimmedValue = value.trim()

  return /^-?\d+(\.\d+)?$/.test(trimmedValue) ? `${Math.max(0, Number(trimmedValue))}px` : value
}

export function createGlassCssVariables(
  prefix: string,
  options: BingGlassEffectProps,
) {
  const enabled = options.glass !== false
  const blur = enabled
    ? options.glassBlur === undefined
      ? 'var(--bing-glass-blur, 16px)'
      : normalizeGlassCssLength(options.glassBlur)
    : '0px'
  const opacity = enabled
    ? options.glassOpacity === undefined
      ? 'var(--bing-glass-opacity, 0.85)'
      : clamp(options.glassOpacity, 0, 1)
    : 1
  const saturation = enabled
    ? options.glassSaturation === undefined
      ? 'var(--bing-glass-saturation, 1.05)'
      : Math.max(0, options.glassSaturation)
    : 1

  return {
    [`--${prefix}-glass-blur`]: blur,
    [`--${prefix}-glass-opacity`]: String(opacity),
    [`--${prefix}-glass-saturation`]: String(saturation),
  }
}
