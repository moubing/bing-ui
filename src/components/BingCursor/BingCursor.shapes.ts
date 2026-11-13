import type { BingCursorType } from './BingCursor.types'

export interface CursorPath {
  d: string
  /** 1 为主色，0 为描边色。 */
  ink: number
  outline: number
  strokeWidth: number
}

const round = (value: number) => Math.round(value * 1000) / 1000
const point = (x: number, y: number) => `${round(x)} ${round(y)}`

function circle(x: number, y: number, radius: number) {
  return `M${point(x - radius, y)}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0Z`
}

/** 将线段固化为带圆头的闭合轮廓。 */
function line(x1: number, y1: number, x2: number, y2: number, width = 1.55) {
  const length = Math.hypot(x2 - x1, y2 - y1)
  const radius = width / 2
  const nx = -(y2 - y1) / length * radius
  const ny = (x2 - x1) / length * radius
  return `M${point(x1 + nx, y1 + ny)}L${point(x2 + nx, y2 + ny)}A${radius} ${radius} 0 0 0 ${point(x2 - nx, y2 - ny)}L${point(x1 - nx, y1 - ny)}A${radius} ${radius} 0 0 0 ${point(x1 + nx, y1 + ny)}Z`
}

function polygon(points: readonly (readonly [number, number])[], rotation = 0) {
  const radians = rotation * Math.PI / 180
  return points.map(([x, y], index) => `${index ? 'L' : 'M'}${point(
    16 + (x - 16) * Math.cos(radians) - (y - 16) * Math.sin(radians),
    16 + (x - 16) * Math.sin(radians) + (y - 16) * Math.cos(radians),
  )}`).join('') + 'Z'
}

const detail = (d: string, ink = 1): CursorPath => ({ d, ink, outline: 0, strokeWidth: 0 })
function shape(body: string, ink = 1, strokeWidth = 2.5, details: CursorPath[] = []): readonly CursorPath[] {
  return [{ d: body, ink, outline: 1 - ink, strokeWidth }, ...details]
}

const resizePoints = [[2, 16], [8.3, 9.7], [9.7, 11.1], [5.8, 15], [26.2, 15], [22.3, 11.1],
  [23.7, 9.7], [30, 16], [23.7, 22.3], [22.3, 20.9], [26.2, 17], [5.8, 17], [9.7, 20.9], [8.3, 22.3]] as const
const zoom = 'M21.1 18.7L29.2 26.8C30.9 28.5 28.5 30.9 26.8 29.2L18.7 21.1A9.9 9.9 0 1 1 21.1 18.7Z'
const lens = detail(circle(13, 13, 8.1), 0)

/** 预览与原生光标图片共用的静态路径。 */
export const cursorShapes: Record<BingCursorType, readonly CursorPath[]> = {
  // 经典箭头与独立尾柄使用黑底白边；尖端对齐 [4, 3] 点击热点。
  default: shape('M4 3L24.6 17.1C25.5 17.7 25.2 18.8 24.1 18.7L16.2 18.2L20.5 27Q20.8 27.8 20 28.2L17.5 29.4Q16.7 29.8 16.3 29L12 20.1L5.9 25.3C5.1 26 4 25.4 4 24.4V3Z', 1, 3.2),
  pointer: shape('M10 16V5.2C10 2.3 14 2.3 14 5.2v7.4c.9-2.1 4-1.5 4 .8v.5c1-1.8 4-1.1 4 1.1v.7c1.4-1.3 3.8-.3 3.8 1.8v4.3c0 3.1-2 4.8-2.7 7.2H12.4c-.4-2.8-2.4-4.7-4-6.4L4.8 19c-1.6-1.8.8-4.3 2.5-2.8l2.7 2.4V16Z', 1, 2.8, [
    detail(line(14, 15, 14, 20), 0), detail(line(18, 16, 18, 20), 0), detail(line(22, 17.5, 22, 20.5), 0),
  ]),
  grab: shape('m9.2 17-3-7.4C5.1 7.1 8.5 5.6 9.6 8l2.5 5.2V4.6c0-2.7 3.7-2.7 3.7 0v7.8L17 5.4c.4-2.6 4-2.1 3.6.5l-1 7.4 2.8-5.5c1.2-2.3 4.4-.7 3.2 1.6L22.8 17c.2 4.4-1.5 6.6-1.8 11.5h-9.6c-.2-2.8-1.5-4.4-3.2-6.2l-3.7-4.1c-1.9-2.1.7-4.5 2.5-2.8L9.2 17Z', 1, 2.8, [
    detail(line(12.6, 17, 13.1, 21), 0), detail(line(16.2, 17, 16.2, 21), 0), detail(line(19.4, 17.4, 18.9, 21), 0),
  ]),
  grabbing: shape('M7.5 17.5V12c0-2.8 3.8-3.2 4.1-.5v-1c0-2.9 4-2.9 4 0v.3c.4-2.7 4.2-2.5 4.2.4v1c1-2.1 4.2-1.4 4.2 1.2v5.3c0 3.6-2.7 4.8-2.9 9.3H11c-.3-3.1-1.8-4.4-3.6-6.2l-2.5-2.6c-1.9-2 .6-4.7 2.6-3Z', 1, 2.8, [
    detail(line(11.6, 13, 11.6, 16) + line(7.5, 16.3, 11, 18.9), 0), detail(line(15.6, 13, 15.6, 16), 0), detail(line(19.8, 14, 19.8, 16.5), 0),
  ]),
  'not-allowed': shape(circle(16, 16, 10), 0, 4.2, [detail(line(9, 9, 23, 23, 2.5))]),
  text: shape('M11 4.1H13C14.3 4.1 15.4 4.5 16 5.3C16.6 4.5 17.7 4.1 19 4.1H21V5.9H19C17.7 5.9 16.9 6.4 16.9 8V24C16.9 25.6 17.7 26.1 19 26.1H21V27.9H19C17.7 27.9 16.6 27.5 16 26.7C15.4 27.5 14.3 27.9 13 27.9H11V26.1H13C14.3 26.1 15.1 25.6 15.1 24V8C15.1 6.4 14.3 5.9 13 5.9H11Z'),
  crosshair: shape([line(16, 3, 16, 13, 1.8), line(16, 19, 16, 29, 1.8), line(3, 16, 13, 16, 1.8), line(19, 16, 29, 16, 1.8)].join('')),
  move: shape('M16 2.1L21 7.1L19.7 8.4L16.9 5.6V15.1H26.4L23.6 12.3L24.9 11L29.9 16L24.9 21L23.6 19.7L26.4 16.9H16.9V26.4L19.7 23.6L21 24.9L16 29.9L11 24.9L12.3 23.6L15.1 26.4V16.9H5.6L8.4 19.7L7.1 21L2.1 16L7.1 11L8.4 12.3L5.6 15.1H15.1V5.6L12.3 8.4L11 7.1Z'),
  'col-resize': shape(polygon(resizePoints)),
  'row-resize': shape(polygon(resizePoints, 90)),
  'ew-resize': shape(polygon(resizePoints)),
  'ns-resize': shape(polygon(resizePoints, 90)),
  'nwse-resize': shape(polygon(resizePoints, 45)),
  'nesw-resize': shape(polygon(resizePoints, -45)),
  'zoom-in': shape(zoom, 1, 2.5, [lens, detail(line(9, 13, 17, 13, 1.8)), detail(line(13, 9, 13, 17, 1.8))]),
  'zoom-out': shape(zoom, 1, 2.5, [lens, detail(line(9, 13, 17, 13, 1.8))]),
}
