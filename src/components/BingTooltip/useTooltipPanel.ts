import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { gsap } from 'gsap'
import { computeFloatingPosition, getAvailableSpace, resolveFloatingSide, snapToDevicePixel, useFloatingAutoUpdate } from '../../utils/floating'
import { lastTooltipCloseReason, sharedTooltipActiveOwner, sharedTooltipPanelElement, sharedTooltipRefresh, sharedTooltipShouldRender, sharedTooltipUpdatePosition } from './BingTooltip.shared'
import type { BingTooltipSharedOwner } from './BingTooltip.shared'
import type { BingTooltipPlacement } from './BingTooltip.types'

interface Position { left: number; top: number; originX: number; originY: number; placement: BingTooltipPlacement }
interface Snapshot extends Position { width: number; height: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** 共享 DOM 的测量与动效；文字始终独立于表面尺寸动画。 */
export function useTooltipPanel(isHost: Ref<boolean>) {
  const panelRef = ref<HTMLElement | null>(null)
  const surfaceRef = ref<HTMLElement | null>(null)
  const bodyRef = ref<HTMLElement | null>(null)
  const owner = shallowRef<BingTooltipSharedOwner>()
  const scrollable = ref(false)
  const position = ref<Position>({ left: 0, top: 0, originX: 0, originY: 0, placement: 'top' })
  let timeline: gsap.core.Timeline | undefined
  let generation = 0
  let settled = false
  let preparing = false
  let destroyed = false

  const autoUpdate = useFloatingAutoUpdate(() => {
    if (settled) void measure()
  }, { enabled: () => isHost.value && !!sharedTooltipActiveOwner.value })

  function snapshot(): Snapshot | undefined {
    const panel = panelRef.value
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    return { ...position.value, left: rect.left, top: rect.top, width: rect.width || panel.offsetWidth || 1,
      height: rect.height || panel.offsetHeight || 1, placement: position.value.placement }
  }

  function kill() {
    timeline?.kill()
    timeline = undefined
    gsap.killTweensOf([panelRef.value, bodyRef.value, surfaceRef.value].filter(Boolean))
  }

  function layout() {
    const panel = panelRef.value
    const current = owner.value
    const anchor = current?.rootRef.value
    if (!panel || !current || !anchor) return
    const padding = current.getViewportPadding()
    const gap = current.getOffset()
    const anchorRect = anchor.getBoundingClientRect()
    const viewportWidth = Math.max(1, window.innerWidth - 2 * padding)
    const viewportHeight = Math.max(1, window.innerHeight - 2 * padding)
    panel.style.setProperty('--bing-tooltip-available-width', `${viewportWidth}px`)
    panel.style.setProperty('--bing-tooltip-available-height', `${viewportHeight - 2}px`)
    const rect = panel.getBoundingClientRect()
    const content = panel.querySelector<HTMLElement>('.bing-tooltip__body-content')
    const natural = {
      width: Math.min(panel.offsetWidth || rect.width || 220, viewportWidth),
      height: Math.max(panel.offsetHeight || rect.height || 32, (content?.scrollHeight ?? 0) + 2),
    }
    const side = resolveFloatingSide({ anchor: anchorRect, floating: natural,
      side: current.getPlacement(), flip: 'best', gap, padding })
    const available = Math.max(1, getAvailableSpace(anchorRect, side, { gap, padding }))
    const vertical = side === 'top' || side === 'bottom'
    panel.style.setProperty('--bing-tooltip-available-height', `${Math.max(1, (vertical ? available : viewportHeight) - 2)}px`)
    panel.style.setProperty('--bing-tooltip-available-width', `${vertical ? viewportWidth : available}px`)
    const measured = panel.getBoundingClientRect()
    const size = {
      width: Math.min(panel.offsetWidth || measured.width || 220, vertical ? viewportWidth : available),
      height: Math.min(panel.offsetHeight || measured.height || 32, vertical ? available : viewportHeight),
    }
    const raw = computeFloatingPosition({ anchor: anchorRect, floating: size, side,
      flip: 'none', gap, padding, align: current.getAlign() })
    const left = snapToDevicePixel(raw.left)
    const top = snapToDevicePixel(raw.top)
    const x = clamp(anchorRect.left + anchorRect.width / 2 - left, Math.min(14, size.width / 2), Math.max(size.width / 2, size.width - 14))
    const y = clamp(anchorRect.top + anchorRect.height / 2 - top, Math.min(14, size.height / 2), Math.max(size.height / 2, size.height - 14))
    position.value = { left, top, placement: side,
      originX: snapToDevicePixel(vertical ? x : side === 'left' ? size.width : 0),
      originY: snapToDevicePixel(vertical ? side === 'top' ? size.height : 0 : y) }
    // 测量与动画在同一帧内使用最终坐标，不等待 Vue 再次提交样式。
    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
    return size
  }

  async function measure() {
    let size = layout()
    const body = bodyRef.value
    if (!scrollable.value && body && (body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1)) {
      scrollable.value = true
      await nextTick()
      if (!destroyed) size = layout()
    }
    return size
  }

  function finishMotion() {
    settled = true
    if (panelRef.value) gsap.set(panelRef.value, { willChange: 'auto', clearProps: 'transform' })
    if (surfaceRef.value) gsap.set(surfaceRef.value, { clearProps: 'transform,willChange' })
    if (bodyRef.value) gsap.set(bodyRef.value, { autoAlpha: 1, clearProps: 'willChange' })
  }

  function showDirectly() {
    kill()
    gsap.set(panelRef.value, { autoAlpha: 1, clearProps: 'transform' })
    finishMotion()
  }

  function fadeIn(duration: number, enter = false, sequence?: gsap.core.Timeline) {
    const panel = panelRef.value
    if (!panel) return
    const side = position.value.placement
    const offset = enter ? 4 : 0
    gsap.set(panel, { autoAlpha: 0, scale: enter ? 0.97 : 1,
      x: side === 'left' ? offset : side === 'right' ? -offset : 0,
      y: side === 'top' ? offset : side === 'bottom' ? -offset : 0, willChange: 'transform,opacity' })
    gsap.set(bodyRef.value, { autoAlpha: enter ? 1 : 0 })
    const start = sequence?.duration() ?? 0
    timeline = sequence ?? gsap.timeline()
    timeline.eventCallback('onComplete', finishMotion)
    timeline.to(panel, { autoAlpha: 1, scale: 1, x: 0, y: 0, duration, ease: 'power3.out' }, start)
    if (!enter) timeline.to(bodyRef.value, { autoAlpha: 1, duration: 0.12, ease: 'power2.out' }, start + 0.04)
    timeline.play()
  }

  function nearMove(previous: Snapshot, size: { width: number; height: number }, contentOnly: boolean) {
    const panel = panelRef.value!
    gsap.set(panel, { autoAlpha: 1, scale: 1, x: previous.left - position.value.left,
      y: previous.top - position.value.top, willChange: 'transform' })
    gsap.set(surfaceRef.value, { scaleX: previous.width / size.width, scaleY: previous.height / size.height,
      transformOrigin: '0 0', willChange: 'transform' })
    gsap.set(bodyRef.value, { autoAlpha: 0, willChange: 'opacity' })
    timeline = gsap.timeline({ onComplete: finishMotion })
      .to(panel, { x: 0, y: 0, duration: contentOnly ? 0.12 : 0.18, ease: 'power3.out' }, 0)
      .to(surfaceRef.value, { scaleX: 1, scaleY: 1, duration: contentOnly ? 0.12 : 0.18, ease: 'power3.out' }, 0)
      .to(bodyRef.value, { autoAlpha: 1, duration: 0.12, ease: 'power2.out' }, contentOnly ? 0 : 0.04)
  }

  function isNear(previous: Snapshot, size: { width: number; height: number }, next = position.value) {
    return previous.placement === next.placement && Math.hypot(
      previous.left + previous.width / 2 - next.left - size.width / 2,
      previous.top + previous.height / 2 - next.top - size.height / 2,
    ) <= 160
  }

  async function reveal(current: BingTooltipSharedOwner, previous: Snapshot | undefined, ticket: number, far: boolean, sequence?: gsap.core.Timeline) {
    if (ticket !== generation || destroyed) return
    owner.value = current
    scrollable.value = current.getScrollable()
    sharedTooltipShouldRender.value = true
    await nextTick()
    if (ticket !== generation || destroyed) return
    if (previous) gsap.set(bodyRef.value, { autoAlpha: 0 })
    const size = await measure()
    if (ticket !== generation || destroyed || !size || !panelRef.value) return
    preparing = false
    if (current.getReducedMotion()) { showDirectly(); return }
    if (!previous) { fadeIn(0.16, true); return }
    if (!far && isNear(previous, size)) { nearMove(previous, size, false); return }
    if (!far) {
      // 新内容的实际尺寸也可能迫使方向翻转。保留旧位置的表面淡出，
      // 新文字继续隐藏；到达透明状态后再提交新方向和位置。
      const destination = position.value
      position.value = previous
      panelRef.value.style.left = `${previous.left}px`
      panelRef.value.style.top = `${previous.top}px`
      gsap.set(surfaceRef.value, { scaleX: previous.width / size.width, scaleY: previous.height / size.height, transformOrigin: '0 0' })
      timeline = gsap.timeline().to(panelRef.value, { autoAlpha: 0, duration: 0.08, ease: 'power2.in' })
        .call(() => {
          const chain = timeline!
          chain.pause()
          position.value = destination
          panelRef.value!.style.left = `${destination.left}px`
          panelRef.value!.style.top = `${destination.top}px`
          gsap.set(surfaceRef.value, { clearProps: 'transform' })
          fadeIn(0.12, false, chain)
        })
      return
    }
    // 大距离或换边时，位置和箭头只在面板完全不可见时切换。
    fadeIn(0.12, false, sequence)
  }

  function sync(current: BingTooltipSharedOwner | undefined) {
    const ticket = ++generation
    const previous = snapshot()
    settled = false
    preparing = true
    kill()
    if (!current) {
      autoUpdate.stop()
      autoUpdate.cancel()
      const finish = () => {
        if (ticket !== generation) return
        sharedTooltipShouldRender.value = false
        owner.value = undefined
      }
      if (!panelRef.value || owner.value?.getReducedMotion()) { finish(); return }
      const duration = ['hover', 'focus'].includes(lastTooltipCloseReason) ? 0.14 : 0.1
      timeline = gsap.timeline({ onComplete: finish })
        .to(panelRef.value, { autoAlpha: 0, duration, ease: 'power2.in', willChange: 'opacity' })
      return
    }
    autoUpdate.start()
    if (previous && !current.getReducedMotion() && current.rootRef.value) {
      const predicted = computeFloatingPosition({ anchor: current.rootRef.value.getBoundingClientRect(),
        floating: previous, side: current.getPlacement(), flip: 'best', align: current.getAlign(),
        gap: current.getOffset(), padding: current.getViewportPadding() })
      const far = !isNear(previous, previous, { ...position.value, ...predicted, placement: predicted.side })
      if (far) {
        const chain = gsap.timeline().to(panelRef.value, { autoAlpha: 0, duration: 0.08, ease: 'power2.in' })
          .call(() => {
            chain.pause()
            void reveal(current, previous, ticket, true, chain)
          })
        timeline = chain
        return
      }
    }
    void reveal(current, previous, ticket, false)
  }

  // 在内容组件更新前记录旧尺寸，下一次 DOM 提交后仅缩放背景、淡入文字。
  function refresh(motionChanged = false) {
    if (!isHost.value) return
    if (motionChanged) { sync(sharedTooltipActiveOwner.value); return }
    if (preparing || !owner.value || owner.value.id !== sharedTooltipActiveOwner.value?.id) return
    const previous = snapshot()
    if (!previous) return
    const ticket = ++generation
    settled = false
    preparing = true
    kill()
    if (!owner.value.getReducedMotion()) gsap.set(bodyRef.value, { autoAlpha: 0 })
    scrollable.value = owner.value.getScrollable()
    void nextTick(async () => {
      const size = await measure()
      if (ticket !== generation || destroyed || !size) return
      preparing = false
      if (owner.value?.getReducedMotion()) showDirectly()
      else nearMove(previous, size, true)
    })
  }

  watch(sharedTooltipActiveOwner, current => { if (isHost.value) sync(current) })
  watch(isHost, host => {
    if (host) {
      sharedTooltipRefresh.value = refresh
      sharedTooltipUpdatePosition.value = autoUpdate.schedule
      if (sharedTooltipActiveOwner.value) sync(sharedTooltipActiveOwner.value)
    } else { ++generation; kill(); autoUpdate.dispose() }
  }, { immediate: true })
  watch(panelRef, panel => { if (isHost.value) sharedTooltipPanelElement.value = panel })
  watch(() => owner.value?.getReducedMotion(), reduced => {
    if (reduced && panelRef.value) {
      if (sharedTooltipActiveOwner.value) sync(sharedTooltipActiveOwner.value)
      else { kill(); sharedTooltipShouldRender.value = false; owner.value = undefined }
    }
  })
  onBeforeUnmount(() => {
    destroyed = true
    ++generation
    kill()
    autoUpdate.dispose()
    if (sharedTooltipRefresh.value === refresh) sharedTooltipRefresh.value = undefined
    if (sharedTooltipUpdatePosition.value === autoUpdate.schedule) sharedTooltipUpdatePosition.value = undefined
    if (sharedTooltipPanelElement.value === panelRef.value) sharedTooltipPanelElement.value = null
  })
  return { panelRef, bodyRef, surfaceRef, owner, scrollable, position, updatePosition: autoUpdate.schedule }
}
