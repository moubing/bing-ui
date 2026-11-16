/**
 * 元素在视口里的尺寸相对布局尺寸的比例。
 * 祖先带 transform: scale（等比缩放的大屏、缩放预览等）时，getBoundingClientRect 返回的是缩放后的视口像素；
 * 要把测量结果写回 left / width / transform 这类布局像素，需要先除以这个比例。未缩放时为 1。
 */
export function getLayoutScale(element: HTMLElement, rect: DOMRect = element.getBoundingClientRect()) {
  const style = window.getComputedStyle(element)
  const read = (value: string) => {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const isBorderBox = style.boxSizing === 'border-box'
  // 计算样式里的宽高带小数，比取整后的 offsetWidth/offsetHeight 精确；取不到时（如未渲染）再回退。
  const layoutSize = (size: string, edges: string[], fallback: number) => {
    const parsed = Number.parseFloat(size)
    if (!Number.isFinite(parsed)) return fallback
    return isBorderBox ? parsed : parsed + edges.reduce((total, edge) => total + read(edge), 0)
  }
  const layoutWidth = layoutSize(
    style.width,
    [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth],
    element.offsetWidth,
  )
  const layoutHeight = layoutSize(
    style.height,
    [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth],
    element.offsetHeight,
  )
  const resolve = (visual: number, layout: number) => (visual > 0 && layout > 0 ? visual / layout : 1)

  return {
    x: resolve(rect.width, layoutWidth),
    y: resolve(rect.height, layoutHeight),
  }
}
