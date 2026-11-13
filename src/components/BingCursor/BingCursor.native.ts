import { cursorHotspots } from './BingCursor.presets'
import { cursorShapes } from './BingCursor.shapes'
import type { BingCursorType } from './BingCursor.types'

// 有界缓存可复用浏览器已解码的图片，也避免主题、尺寸频繁变化时无限积累。
const images = new Map<string, string>()
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 只在外观变化时生成图片；鼠标位置完全交给浏览器的 cursor 管线。 */
export function createNativeCursor(type: BingCursorType, size: number, color: string, outline: string, hotspot?: readonly [number, number]) {
  const pixels = Math.round(Math.max(8, Math.min(128, Number.isFinite(size) ? size : 28)))
  const key = JSON.stringify([type, pixels, color, outline])
  let url = images.get(key)
  if (!url) {
    const paths = cursorShapes[type].map(part =>
      `<path d="${part.d}" fill="${escapeAttribute(part.ink ? color : outline)}" stroke="${escapeAttribute(part.outline ? color : outline)}" stroke-width="${part.strokeWidth}" stroke-linejoin="round" paint-order="stroke fill"/>`,
    ).join('')
    url = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 32 32">${paths}</svg>`)}`
    if (images.size >= 128) images.delete(images.keys().next().value!)
    images.set(key, url)
  }
  const point = hotspot ?? cursorHotspots[type].map(value => value * pixels / 32)
  const [x, y] = point.map(value => Math.max(0, Math.min(pixels - 1, Math.round(Number.isFinite(value) ? value : 0))))
  // 图片被 CSP 或浏览器尺寸限制拒绝时仍有语义正确的系统光标，绝不回退为 none。
  return `url("${url}") ${x} ${y}, ${type}`
}
