import { describe, expect, it } from 'vitest'
import {
  createColorValue,
  getColorFormatValue,
  getHueFromHex,
  hexToRgb,
  hslToRgb,
  hsvToRgb,
  normalizeCssLength,
  normalizePreset,
  parseColorInput,
  parseCssSize,
  resolveColor,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from './BingColorPicker.utils'

describe('BingColorPicker utils', () => {
  it('parses hex shorthand and alpha forms', () => {
    expect(parseColorInput('#FFF')).toEqual({ alpha: 1, hex: '#ffffff' })
    expect(parseColorInput('0f08')).toEqual({ alpha: 0.53, hex: '#00ff00' })
    expect(parseColorInput('#3b82f6')).toEqual({ alpha: 1, hex: '#3b82f6' })
    expect(parseColorInput('#3b82f680')).toEqual({ alpha: 0.5, hex: '#3b82f6' })
  })

  it('parses rgb/rgba and hsl/hsla functions in comma and space syntax', () => {
    expect(parseColorInput('rgb(59, 130, 246)')).toEqual({ alpha: 1, hex: '#3b82f6' })
    expect(parseColorInput('rgba(59 130 246 / 40%)')).toEqual({ alpha: 0.4, hex: '#3b82f6' })
    expect(parseColorInput('rgb(100%, 0%, 0%)')).toEqual({ alpha: 1, hex: '#ff0000' })
    expect(parseColorInput('hsl(120, 100%, 50%)')).toEqual({ alpha: 1, hex: '#00ff00' })
    expect(parseColorInput('hsla(240 100% 50% / 0.25)')).toEqual({ alpha: 0.25, hex: '#0000ff' })
  })

  it('rejects invalid input and falls back to the default color', () => {
    expect(parseColorInput('')).toBeUndefined()
    expect(parseColorInput('#12345')).toBeUndefined()
    expect(parseColorInput('rgb(1, 2)')).toBeUndefined()
    expect(parseColorInput('tomato')).toBeUndefined()
    expect(resolveColor('nope')).toBe('#ec4899')
  })

  it('round-trips between rgb, hsv and hsl', () => {
    for (const hex of ['#ec4899', '#10b981', '#334155', '#f8fafc', '#000000', '#ffffff']) {
      const rgb = hexToRgb(hex)

      expect(rgbToHex(hsvToRgb(rgbToHsv(rgb)))).toMatch(/^#[\da-f]{6}$/)
      expect(rgbToHex(rgb)).toBe(hex)
    }

    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100, a: 1 })
    expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50, a: 1 })
    expect(rgbToHex(hsvToRgb({ h: 120, s: 100, v: 100 }))).toBe('#00ff00')
    expect(rgbToHex(hslToRgb({ h: 300, s: 100, l: 50 }))).toBe('#ff00ff')
  })

  it('keeps the previous hue for achromatic colors', () => {
    expect(getHueFromHex('#ff0000', 200)).toBe(0)
    expect(getHueFromHex('#ffffff', 200)).toBe(200)
    expect(getHueFromHex('#000000', 42)).toBe(42)
  })

  it('creates every output format and switches hsl to hsla below full opacity', () => {
    const opaque = createColorValue('#3b82f6')
    const translucent = createColorValue('#3b82f6', 0.5)

    expect(opaque.hexAlpha).toBe('#3b82f6ff')
    expect(opaque.rgba).toBe('rgba(59, 130, 246, 1)')
    expect(opaque.hsl).toMatch(/^hsl\(/)
    expect(translucent.hexAlpha).toBe('#3b82f680')
    expect(translucent.hsl).toMatch(/^hsla\(.+, 0\.5\)$/)
    expect(getColorFormatValue(translucent, 'hex')).toBe('#3b82f680')
    expect(getColorFormatValue(translucent, 'rgba')).toBe('rgba(59, 130, 246, 0.5)')
  })

  it('normalizes presets and css sizes', () => {
    expect(normalizePreset('#ABC')).toEqual({ label: '#aabbcc', value: '#aabbcc' })
    expect(normalizePreset({ label: '海蓝', value: '#0EA5E9' })).toEqual({ label: '海蓝', value: '#0ea5e9' })
    expect(normalizePreset('nope')).toBeUndefined()
    expect(normalizeCssLength(240)).toBe('240px')
    expect(normalizeCssLength(' 12.5 ')).toBe('12.5px')
    expect(normalizeCssLength('50%')).toBe('50%')
    expect(parseCssSize('360px', 320)).toBe(360)
    expect(parseCssSize('auto', 320)).toBe(320)
    expect(parseCssSize(-5, 320)).toBe(0)
  })
})
