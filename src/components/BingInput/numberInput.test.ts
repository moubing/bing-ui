import { describe, expect, it } from 'vitest'
import { normalizeNumber, numberConstraints, stepNumber } from './numberInput'

describe('数字步长与范围', () => {
  it.each([
    [0.46, 0.1, 0.8, 0.2, 0.5], [0.8, 0.1, 0.8, 0.2, 0.7],
    [-3, -2, 3, 0.5, -2], [999, 640, 1800, 20, 1000],
    [0.37, 0, 1, 'any', 0.37], [0.30000000000000004, 0, 1, 0.1, 0.3],
  ])('将 %s 在 [%s, %s] step=%s 下规整为 %s', (value, min, max, step, expected) => {
    expect(normalizeNumber(Number(value), numberConstraints(min, max, step))).toBe(expected)
  })
  it('从不对齐的值沿步进方向对齐，十倍步长精确且不会反向越界', () => {
    const limits = numberConstraints(0.1, 4, 0.2)
    expect(stepNumber(0.4, 1, limits)).toBe(0.5)
    expect(stepNumber(0.4, -1, limits)).toBe(0.3)
    expect(stepNumber(0.3, 10, limits)).toBe(2.3)
    expect(stepNumber(3.9, 1, limits)).toBe(3.9)
    expect(stepNumber(0.1, -1, limits)).toBe(0.1)
  })
})
