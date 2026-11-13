import { nextTick, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { gsap } from 'gsap'
import { useReducedMotion } from './reducedMotion'

/** 树展开只测量面板高度；行不做 FLIP，也不逐节点读取布局。 */
export function useTreeExpansionMotion(options: {
  panel: Ref<HTMLElement | null>
  virtual: () => boolean
  open: () => boolean
  clearRetained: () => void
  afterLeave: (index: number) => void
  updateLayout: () => void
}) {
  const reducedMotion = useReducedMotion({ onChange: () => {
    if (reducedMotion()) { stop(); options.updateLayout() }
  } })
  const pending = new Map<HTMLElement, () => void>()
  let entering = new Map<number, number>()
  let leaving = new Set<number>()
  let heightTween: gsap.core.Tween | undefined
  let previousHeight = 0
  let generation = 0
  let disposed = false
  let virtualChange = false

  function clean(element: HTMLElement) {
    gsap.killTweensOf(element)
    gsap.set(element, { clearProps: 'opacity,transform,position,top,pointerEvents' })
    element.removeAttribute('aria-hidden')
    element.inert = false
  }

  function finishRows() {
    for (const [element, done] of [...pending]) {
      pending.delete(element)
      clean(element)
      done()
    }
  }

  function stop() {
    generation++
    heightTween?.kill()
    heightTween = undefined
    finishRows()
    options.clearRetained()
    entering.clear()
    leaving.clear()
    previousHeight = 0
    options.panel.value?.style.removeProperty('height')
  }

  function prepare() {
    const currentHeight = options.open() && !options.virtual() && !reducedMotion() ? options.panel.value?.offsetHeight ?? 0 : 0
    // 连续操作先结束上一批节点动画，旧 leave 不会误删重新插入的同键节点。
    stop()
    virtualChange = options.virtual()
    if (options.open() && !virtualChange && !reducedMotion()) {
      previousHeight = currentHeight
    }
  }

  function mark(before: number[], after: number[]) {
    if (!options.open() || reducedMotion()) return
    const old = new Set(before)
    const current = new Set(after)
    entering = new Map(after.filter(index => !old.has(index)).map((index, order) => [index, order]))
    leaving = new Set(before.filter(index => !current.has(index)))
    virtualChange ||= options.virtual()
  }

  async function settleLayout() {
    const current = generation
    await nextTick()
    if (disposed || current !== generation || !options.open()) return
    options.updateLayout()
    // 普通树离场行暂留布局，等淡出删除后再测量最终高度。
    if (leaving.size) return
    await nextTick()
    if (disposed || current !== generation || !options.open()) return
    entering.clear()
    const panel = options.panel.value
    if (!panel || virtualChange || options.virtual() || reducedMotion() || !previousHeight) return
    const height = panel.offsetHeight
    heightTween?.kill()
    if (Math.abs(height - previousHeight) < 1) return
    heightTween = gsap.fromTo(panel, { height: previousHeight }, {
      height, duration: 0.16, ease: 'power3.out', overwrite: 'auto',
      onComplete: () => {
        panel.style.removeProperty('height')
        heightTween = undefined
      },
    })
    previousHeight = 0
  }

  function enter(element: Element, done: () => void) {
    const node = element as HTMLElement
    const order = entering.get(Number(node.dataset.nodeIndex))
    if (order === undefined || reducedMotion()) { done(); return }
    const stagger = Math.min(0.012, 0.04 / Math.max(1, entering.size - 1))
    pending.set(node, done)
    gsap.fromTo(node, { y: -4, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.12, delay: order * stagger, ease: 'power3.out', overwrite: 'auto',
      onComplete: () => { pending.delete(node); clean(node); done() },
    })
  }

  function leave(element: Element, done: () => void) {
    const node = element as HTMLElement
    const index = Number(node.dataset.nodeIndex)
    if (!leaving.has(index) || reducedMotion()) { leaving.delete(index); done(); return }
    node.inert = true
    node.setAttribute('aria-hidden', 'true')
    node.style.pointerEvents = 'none'
    if (virtualChange) {
      node.style.position = 'absolute'
      node.style.top = `calc(${Number(node.dataset.windowIndex)} * var(--bing-tree-select-virtual-item-height))`
    }
    pending.set(node, done)
    gsap.to(node, {
      opacity: 0, duration: 0.12, ease: 'power3.out', overwrite: 'auto',
      onComplete: () => {
        pending.delete(node)
        leaving.delete(index)
        clean(node)
        done()
        if (!leaving.size) void settleLayout()
      },
    })
  }

  function cancel(element: Element) {
    const node = element as HTMLElement
    pending.delete(node)
    leaving.delete(Number(node.dataset.nodeIndex))
    clean(node)
  }

  onBeforeUnmount(() => { disposed = true; stop() })
  return { prepare, mark, settleLayout, stop, hooks: {
    onEnter: enter, onLeave: leave, onEnterCancelled: cancel, onLeaveCancelled: cancel,
    onAfterLeave: (element: Element) => options.afterLeave(Number((element as HTMLElement).dataset.nodeIndex)),
  } }
}
