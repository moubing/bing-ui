export interface Point { x: number; y: number }

/** 包含边界；退化为线段的三角形不提供指针保护。 */
export function isPointInTriangle(point: Point, a: Point, b: Point, c: Point) {
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  if (Math.abs(cross(a, b, c)) < 0.001) return false
  const values = [cross(a, b, point), cross(b, c, point), cross(c, a, point)]
  return !values.some(value => value < -0.001) || !values.some(value => value > 0.001)
}
