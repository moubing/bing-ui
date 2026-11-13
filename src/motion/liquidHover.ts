import { gsap } from 'gsap'

function clearLiquidStyles(liquid: HTMLElement) {
  for (const property of ['transform', 'opacity', 'visibility', 'will-change']) liquid.style.removeProperty(property)
}

// 按钮、选择器和菜单共用铺开与收起的节奏。
export function enterLiquidHover(liquid: HTMLElement) {
  gsap.killTweensOf(liquid)
  liquid.style.willChange = 'transform, opacity'

  return gsap.fromTo(
    liquid,
    { autoAlpha: 0, scale: 0.08 },
    { autoAlpha: 1, scale: 1, duration: 0.38, ease: 'expo.out', overwrite: true },
  )
}

export function leaveLiquidHover(liquid: HTMLElement) {
  return gsap.to(liquid, {
    autoAlpha: 0,
    scale: 1.04,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: true,
    onComplete: () => clearLiquidStyles(liquid),
  })
}

export function resetLiquidHover(liquid: HTMLElement) {
  gsap.killTweensOf(liquid)
  // clearProps 会通过 CSSPlugin 重新解析 transform，触发全页同步样式/布局。
  // 此处只需回到样式表的静止态，下次 enter 的显式 fromTo 会重设动画值。
  clearLiquidStyles(liquid)
}

export function setLiquidHoverOrigin(
  surface: HTMLElement,
  liquid: HTMLElement,
  event: MouseEvent | PointerEvent,
) {
  const rect = surface.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const x = Math.max(0, Math.min(surface.clientWidth,
    (event.clientX - rect.left) * surface.offsetWidth / rect.width - surface.clientLeft))
  const y = Math.max(0, Math.min(surface.clientHeight,
    (event.clientY - rect.top) * surface.offsetHeight / rect.height - surface.clientTop))
  liquid.style.setProperty('--bing-liquid-x', `${x}px`)
  liquid.style.setProperty('--bing-liquid-y', `${y}px`)
  liquid.style.transformOrigin = `${x}px ${y}px`
}
