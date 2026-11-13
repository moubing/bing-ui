import { onBeforeUnmount, ref } from 'vue'
import { gsap } from 'gsap'
import { useReducedMotion } from './reducedMotion'

/** TransitionGroup/Transition 的 JS hooks。所有标签共用一个可打断的 timeline。 */
export function useSelectTagMotion() {
  const isAnimating = ref(false)
  let timeline: gsap.core.Timeline | undefined
  const pending = new Map<Element, { tween: gsap.core.Tween; done: () => void }>()
  const accessibility = new WeakMap<HTMLElement, { ariaHidden: string | null; inert: boolean }>()
  const leaveLayouts = new Map<Element, { left: number; top: number; width: number }>()
  let clearLayoutsQueued = false
  const reducedMotion = useReducedMotion({ onChange: () => { if (reducedMotion()) finishAll() } })

  function cleanup(element: HTMLElement) {
    element.classList.remove('is-leaving')
    const previous = accessibility.get(element)
    if (previous) {
      if (previous.ariaHidden === null) element.removeAttribute('aria-hidden')
      else element.setAttribute('aria-hidden', previous.ariaHidden)
      element.inert = previous.inert
      accessibility.delete(element)
    }
    gsap.set(element, { clearProps: 'transform,opacity,position,left,top,width,pointerEvents' })
  }

  function cancel(element: Element) {
    pending.get(element)?.tween.kill()
    pending.delete(element)
    cleanup(element as HTMLElement)
    isAnimating.value = pending.size > 0
  }

  function finishAll() {
    for (const [element, entry] of [...pending]) {
      entry.tween.kill()
      pending.delete(element)
      cleanup(element as HTMLElement)
      entry.done()
    }
    timeline?.pause().clear()
    isAnimating.value = false
  }

  function animate(element: Element, done: () => void, leaving: boolean, counter = false) {
    const target = element as HTMLElement
    if (reducedMotion()) { cleanup(target); done(); return }
    timeline ??= gsap.timeline({ paused: true, autoRemoveChildren: true })
    if (!pending.size) timeline.pause().clear().time(0)
    pending.get(element)?.tween.kill()
    const vars = counter ? { yPercent: leaving ? -65 : 0 } : { scale: leaving ? 0.9 : 1 }
    const tween = gsap.to(target, {
      ...vars, opacity: leaving ? 0 : 1,
      duration: leaving ? 0.12 : 0.18, ease: 'power3.out', overwrite: 'auto',
      paused: true,
      onComplete: () => {
        pending.delete(element)
        cleanup(target)
        done()
        isAnimating.value = pending.size > 0
      },
    })
    pending.set(element, { tween, done })
    isAnimating.value = true
    timeline.add(tween, timeline.time())
    tween.paused(false)
    timeline.play()
  }

  function beforeLeave(element: Element) {
    const target = element as HTMLElement
    if (!leaveLayouts.has(target)) {
      // 同一批离场先读完所有兄弟的位置。逐个转为 absolute 后再读会让后续标签向前挤。
      for (const sibling of target.parentElement?.children ?? [target]) {
        if (sibling instanceof HTMLElement) leaveLayouts.set(sibling, {
          left: sibling.offsetLeft, top: sibling.offsetTop, width: sibling.offsetWidth,
        })
      }
      if (!clearLayoutsQueued) {
        clearLayoutsQueued = true
        queueMicrotask(() => { leaveLayouts.clear(); clearLayoutsQueued = false })
      }
    }
    const { left, top, width } = leaveLayouts.get(target)!
    cancel(element)
    accessibility.set(target, { ariaHidden: target.getAttribute('aria-hidden'), inert: target.inert })
    target.classList.add('is-leaving')
    target.inert = true
    target.setAttribute('aria-hidden', 'true')
    // 一次性固定离场布局；随后只动画 transform/opacity，不参与最终标签的宽度计算。
    Object.assign(target.style, { position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${width}px`, pointerEvents: 'none' })
  }

  const tagHooks = {
    onBeforeEnter: (element: Element) => {
      leaveLayouts.delete(element)
      cancel(element)
      if (!reducedMotion()) gsap.set(element, { scale: 0.9, opacity: 0 })
    },
    onEnter: (element: Element, done: () => void) => animate(element, done, false),
    onBeforeLeave: beforeLeave,
    onLeave: (element: Element, done: () => void) => animate(element, done, true),
    onEnterCancelled: cancel,
    onLeaveCancelled: cancel,
  }
  const counterHooks = {
    ...tagHooks,
    onBeforeEnter: (element: Element) => {
      leaveLayouts.delete(element)
      cancel(element)
      if (!reducedMotion()) gsap.set(element, { yPercent: 65, opacity: 0 })
    },
    onEnter: (element: Element, done: () => void) => animate(element, done, false, true),
    onLeave: (element: Element, done: () => void) => animate(element, done, true, true),
  }
  onBeforeUnmount(() => { finishAll(); timeline?.kill(); timeline = undefined; leaveLayouts.clear() })
  return { isAnimating, tagHooks, counterHooks }
}
