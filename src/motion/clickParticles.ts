import './clickParticles.css'
import { prefersReducedMotion } from './reducedMotion'

const particleCount = 12
const maxBursts = 3
const duration = 540
// 预采样原来的 power3.out 位移和延迟 200ms 的 power2.in 淡出，保留原有节奏。
// 每粒只有一个 transform/opacity 动画；提交后由浏览器合成线程推进，不再逐帧执行 JS。
const steps = [...new Set([...Array.from({ length: 33 }, (_, index) => index * duration / 32), 200, 500])]
  .sort((a, b) => a - b)
  .map(time => ({ offset: time / duration, move: 1 - (1 - time / duration) ** 4,
    fade: Math.max(0, Math.min(1, (time - 200) / 300)) ** 3 }))

// 每个应用在对应文档中共享短生命周期的装饰层，不改变控件 DOM、尺寸或命中区域。
export function createClickParticles() {
  const active = new Set<() => void>()

  function clear() {
    for (const dispose of active) dispose()
  }

  function play(surface: HTMLElement, event: Event, reducedMotion?: boolean) {
    const doc = surface.ownerDocument
    const view = doc.defaultView
    if (!view || !surface.isConnected || typeof surface.animate !== 'function') return
    if (reducedMotion ?? prefersReducedMotion(view)) return
    const media = view.matchMedia?.('(prefers-reduced-motion: reduce)')

    const rect = surface.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const style = view.getComputedStyle(surface)
    const particleColor = style.getPropertyValue('--bing-click-particle-color').trim()
    const color = !particleColor || particleColor.toLowerCase() === 'currentcolor' ? style.color : particleColor
    const pointer = event as MouseEvent & Partial<PointerEvent>
    const hasPointer = Number.isFinite(pointer.clientX) && (pointer.detail > 0 || Boolean(pointer.pointerType))
    const x = hasPointer ? Math.max(rect.left, Math.min(rect.right, pointer.clientX)) : rect.left + rect.width / 2
    const y = hasPointer ? Math.max(rect.top, Math.min(rect.bottom, pointer.clientY)) : rect.top + rect.height / 2
    // scroll 事件可能晚于实际位移送达（菜单入场结束、焦点校正等）。以点击时的
    // 位置为基准，只响应来源祖先或页面的新位移，避免旧事件截断刚生成的反馈。
    const pageScroll = { x: view.scrollX, y: view.scrollY }
    const ancestorScroll = new Map<Element, { left: number; top: number }>()
    for (let ancestor = surface.parentElement; ancestor; ancestor = ancestor.parentElement) {
      ancestorScroll.set(ancestor, { left: ancestor.scrollLeft, top: ancestor.scrollTop })
    }

    // 关闭节流后快速连点也只保留少量批次，防止 DOM 和动画无限累积。
    if (active.size >= maxBursts) active.values().next().value?.()
    const layer = doc.createElement('span')
    layer.className = 'bing-click-particles'
    layer.setAttribute('aria-hidden', 'true')
    layer.inert = true
    layer.style.color = color
    const particles = Array.from({ length: particleCount }, (_, index) => {
      const particle = doc.createElement('span')
      particle.className = 'bing-click-particles__shard'
      particle.style.left = `${x}px`
      particle.style.top = `${y}px`
      particle.style.width = `${3 + index % 3}px`
      particle.style.height = `${index % 3 === 0 ? 6 : 3}px`
      layer.append(particle)
      return particle
    })
    // 独立挂在 body 上，碎屑可以越过按钮和卡片边界；只在视口边缘裁切。
    doc.body.append(layer)

    const animations: Animation[] = []
    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      for (const animation of animations) animation.cancel()
      layer.remove()
      active.delete(dispose)
      doc.removeEventListener('scroll', handleScroll, true)
      ancestorScroll.clear()
      view.removeEventListener('resize', dispose)
      view.removeEventListener('pagehide', dispose)
      doc.removeEventListener('visibilitychange', dispose)
      media?.removeEventListener('change', dispose)
    }
    function handleScroll(event: Event) {
      if (event.target === doc) {
        if (view!.scrollX !== pageScroll.x || view!.scrollY !== pageScroll.y) dispose()
        return
      }
      const target = event.target as Element
      const previous = ancestorScroll.get(target)
      if (previous && (target.scrollLeft !== previous.left || target.scrollTop !== previous.top)) dispose()
    }
    active.add(dispose)
    doc.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    view.addEventListener('resize', dispose, { passive: true })
    view.addEventListener('pagehide', dispose)
    doc.addEventListener('visibilitychange', dispose)
    media?.addEventListener('change', dispose)

    for (const [index, particle] of particles.entries()) {
      const angle = (index + (Math.random() - 0.5) * 0.45) / particleCount * Math.PI * 2
      const distance = 28 + Math.random() * 30
      const x = Math.cos(angle) * distance, y = Math.sin(angle) * distance
      const startRotation = index * 37, endRotation = (Math.random() - 0.5) * 240
      animations.push(particle.animate(steps.map(({ offset, move, fade }) => ({
        offset,
        transform: `translate(-50%, -50%) translate3d(${x * move}px, ${y * move}px, 0) rotate(${startRotation + (endRotation - startRotation) * move}deg) scale(${1 - 0.65 * fade})`,
        opacity: 0.95 * (1 - fade),
      })), { duration, easing: 'linear', fill: 'both' }))
    }
    // 淡出终帧在合成线程生效，主线程忙时也不会停留在屏幕上；DOM 清理随后补做。
    void Promise.all(animations.map(animation => animation.finished)).then(dispose, dispose)
  }

  return { play, clear }
}
