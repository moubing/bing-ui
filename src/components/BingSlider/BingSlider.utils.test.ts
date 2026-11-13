import { describe, expect, it } from 'vitest'
import { createSliderScale } from './BingSlider.utils'

describe('Slider 数值边界', () => {
  it('normalizes reversed ranges and respects decimal step origins', () => {
    const scale = createSliderScale({ min: 0.1, max: 0.95, step: 0.1, minDistance: 0.25 })
    expect(scale.normalize([0.84, 0.76], true)).toEqual([0.6, 0.9])
    expect(scale.update([0.2, 0.8], 0, 0.8)).toEqual([0.5, 0.8])
    expect(scale.update([0.2, 0.8], 1, 0.1)).toEqual([0.2, 0.5])
    expect(scale.normalize(undefined, true)).toEqual([0.1, 0.9])
  })
  it('limits impossible distances to the available span', () => {
    const scale = createSliderScale({ min: 0, max: 95, step: 10, minDistance: 200 })
    expect(scale.normalize([50, 60], true)).toEqual([0, 90])
    expect(scale.update([0, 90], 0, 30)).toEqual([0, 90])
  })
  it('filters, sorts and deduplicates marks, and keeps snapped ranges feasible', () => {
    const scale = createSliderScale({ marks: [100, -10, 35, NaN, 0, { value: 35, label: '标准' }], snapToMarks: true, minDistance: 40 })
    expect(scale.marks).toEqual([{ value: 0 }, { value: 35, label: '标准' }, { value: 100 }])
    expect(scale.normalize([35, 35], true)).toEqual([35, 100])
    expect(scale.update([0, 100], 1, 40)).toEqual([0, 100])
    expect(scale.update([35, 100], 0, 100)).toEqual([35, 100])
  })
  it('falls back to steps for empty marks and sanitizes invalid bounds', () => {
    const scale = createSliderScale({ min: NaN, max: 10, step: -1, marks: [20], snapToMarks: true })
    expect(scale.normalize(4.8, false)).toBe(5)
    expect(scale.normalize(NaN, false)).toBe(0)
    expect(createSliderScale({ min: 50, max: 10 }).normalize([0, 100], true)).toEqual([50, 50])
  })
})
