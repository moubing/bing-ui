import { describe, expect, it } from 'vitest'
import { isPointInTriangle } from './isPointInTriangle'

describe('菜单指针安全三角', () => {
  it.each([1, -1])('支持左右镜像、边界和顶点，方向=%i', direction => {
    const a = { x: 0, y: 50 }, b = { x: 100 * direction, y: 0 }, c = { x: 100 * direction, y: 100 }
    expect(isPointInTriangle({ x: 60 * direction, y: 50 }, a, b, c)).toBe(true)
    expect(isPointInTriangle({ x: 50 * direction, y: 25 }, a, b, c)).toBe(true)
    expect(isPointInTriangle(a, a, b, c)).toBe(true)
    expect(isPointInTriangle({ x: 20 * direction, y: 90 }, a, b, c)).toBe(false)
    expect(isPointInTriangle({ x: -10 * direction, y: 50 }, a, b, c)).toBe(false)
    expect(isPointInTriangle({ x: 101 * direction, y: 50 }, a, b, c)).toBe(false)
  })
  it('不把零面积或重复顶点当作保护区域', () => {
    expect(isPointInTriangle({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 2 }, { x: 3, y: 3 })).toBe(false)
    expect(isPointInTriangle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false)
  })
})
