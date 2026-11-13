import { ref } from 'vue'
import { computeFloatingPosition, useFloatingAutoUpdate, snapToDevicePixel } from '../../utils/floating'
import type { FloatingRect, FloatingSide } from '../../utils/floating'

function layoutHeight(element: HTMLElement) {
  const style = getComputedStyle(element)
  return (parseFloat(style.height) || 0) + (style.boxSizing === 'border-box' ? 0
    : ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom']
      .reduce((sum, key) => sum + (parseFloat(style[key as keyof CSSStyleDeclaration] as string) || 0), 0))
}

export function usePanelPlacement(options: {
  panel: () => HTMLElement | undefined
  viewport: () => HTMLElement | null | undefined
  body: () => HTMLElement | null | undefined
  anchor: () => FloatingRect | undefined
  boundary?: () => FloatingRect | undefined
  side: () => FloatingSide
  align: () => 'start' | 'end'
  gap: () => number
  shift?: () => boolean
  alignOffset?: () => number
  estimatedHeight?: () => number
  afterUpdate?: () => void
}) {
  const bodyMaxHeight = ref<number>()
  const boundaryWidth = ref<number>()
  const position = ref({ placement: 'bottom' as FloatingSide, align: 'start' as 'start' | 'end', left: 0, top: 0 })
  function update() {
    const panel = options.panel(), anchorRect = options.anchor()
    if (!panel || !anchorRect || typeof window === 'undefined') return
    const bounds = options.boundary?.()
    const left = Math.max(0, bounds?.left ?? 0), top = Math.max(0, bounds?.top ?? 0)
    const width = Math.max(0, Math.min(innerWidth, bounds?.right ?? innerWidth) - left)
    const height = Math.max(0, Math.min(innerHeight, bounds?.bottom ?? innerHeight) - top)
    const viewport = options.viewport(), body = options.body()
    const style = getComputedStyle(panel)
    const chrome = Math.max(2, panel.offsetHeight && viewport?.offsetHeight ? layoutHeight(panel) - layoutHeight(viewport)
      : ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'].reduce((sum, key) => sum + (parseFloat(style[key as keyof CSSStyleDeclaration] as string) || 0), 0)
        + Array.from(panel.children).filter(child => child.matches('.bing-dropdown__header,.bing-dropdown__footer')).reduce((sum, child) => sum + (child as HTMLElement).offsetHeight, 0))
    const measuredBodyHeight = body ? Math.max(body.scrollHeight, layoutHeight(body)) : 0
    const naturalHeight = chrome + (measuredBodyHeight || options.estimatedHeight?.() || 0)
    boundaryWidth.value = Math.max(0, width - 24)
    const panelWidth = Math.min(panel.offsetWidth || panel.getBoundingClientRect().width || parseFloat(style.width)
      || parseFloat(style.getPropertyValue('--bing-dropdown-width')) || parseFloat(style.getPropertyValue('--bing-dropdown-min-width')) || 220, boundaryWidth.value)
    const offset = options.alignOffset?.() ?? 0
    // DOMRect 的尺寸是原型访问器，展开对象不会保留 width/height。
    const anchor = { width: anchorRect.width, height: anchorRect.height, left: anchorRect.left - left, right: anchorRect.right - left,
      top: anchorRect.top - top - offset, bottom: anchorRect.bottom - top - offset }
    const layout = { anchor, align: options.align(), gap: options.gap(), padding: 12, viewport: { width, height } }
    const preferred = computeFloatingPosition({ ...layout, floating: { width: panelWidth, height: naturalHeight }, side: options.side() })
    const available = options.shift?.() || preferred.side === 'left' || preferred.side === 'right' ? height - 24
      : preferred.side === 'top' ? anchor.top - layout.gap - 12 : height - anchor.bottom - layout.gap - 12
    const panelHeight = Math.max(chrome, Math.min(naturalHeight, Math.max(0, available)))
    bodyMaxHeight.value = Math.max(0, naturalHeight <= available ? panelHeight - chrome
      : Math.floor((panelHeight - chrome) * (devicePixelRatio || 1)) / (devicePixelRatio || 1))
    const result = computeFloatingPosition({ ...layout, floating: { width: panelWidth, height: panelHeight }, side: preferred.side, flip: 'none' })
    const next = { placement: result.side, align: layout.align, left: snapToDevicePixel(result.left + left), top: snapToDevicePixel(result.top + top) }
    if (Object.keys(next).some(key => next[key as keyof typeof next] !== position.value[key as keyof typeof next])) position.value = next
    options.afterUpdate?.()
  }
  const autoUpdate = useFloatingAutoUpdate(update, { enabled: () => !!options.panel() })
  return { bodyMaxHeight, boundaryWidth, position, update, ...autoUpdate }
}
