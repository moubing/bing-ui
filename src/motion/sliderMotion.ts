import { gsap } from 'gsap'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { useReducedMotion } from './reducedMotion'

/** 同一份百分比驱动滑块、填充和气泡；拖动直接写入，跳跃复用 quickTo。 */
export function useSliderMotion(root: Ref<HTMLElement | null>, initial: number[]) {
  const proxies = [0, 1].map(index => ({ p: initial[index] ?? initial[0] ?? 0 }))
  const edges = [0, 1].map(() => ({ offset: 0 }))
  const targets = proxies.map(proxy => proxy.p)
  let setters: gsap.QuickToFunc[] = []
  let edgeSetters: gsap.QuickToFunc[] = []
  let disposed = false
  const checkReduced = useReducedMotion({ onChange: () => {
    reduced.value = checkReduced()
    if (reduced.value) { move([...targets], false); releaseEdges(false) }
  } })
  const reduced = ref(checkReduced())
  // SSR 首帧不需要测量；同步保留当前值，避免 Vue 的后续样式补丁覆盖动画帧。
  const initialStyle: Record<string, string | number> = Object.fromEntries(proxies.map((proxy, index) => [`--bing-slider-p${index}`, proxy.p]))
  const paint = (index: number) => {
    initialStyle[`--bing-slider-p${index}`] = proxies[index]!.p
    root.value?.style.setProperty(`--bing-slider-p${index}`, String(proxies[index]!.p))
  }

  function move(positions: number[], animate: boolean) {
    if (disposed) return
    proxies.forEach((proxy, index) => {
      const next = positions[index] ?? positions[0] ?? 0
      if (animate && !reduced.value && setters[index]) {
        if (targets[index] !== next) setters[index]!(next, proxy.p)
      } else {
        setters[index]?.tween.pause()
        proxy.p = next
        paint(index)
      }
      targets[index] = next
    })
  }

  function paintEdge(index: number) {
    const offset = edges[index]!.offset
    const styles = { [`--bing-slider-edge${index}`]: `${offset}px`, [`--bing-slider-squeeze${index}`]: 1 - Math.min(1, Math.abs(offset) / 6) * 0.1 }
    Object.assign(initialStyle, styles)
    for (const [name, value] of Object.entries(styles)) root.value?.style.setProperty(name, String(value))
  }

  /** 越界距离经过阻尼压缩到 6px 内；拖动中直接更新，不启动回弹计时。 */
  function stretch(index: number, overshoot: number) {
    if (disposed) return
    edgeSetters[index]?.tween.pause()
    edges[index]!.offset = reduced.value ? 0 : Math.sign(overshoot) * 6 * (1 - Math.exp(-Math.abs(overshoot) / 24))
    paintEdge(index)
  }

  function releaseEdges(animate = true) {
    if (disposed) return
    edges.forEach((edge, index) => {
      if (animate && !reduced.value && edgeSetters[index] && edge.offset !== 0) edgeSetters[index]!(0, edge.offset)
      else {
        edgeSetters[index]?.tween.pause()
        edge.offset = 0
        paintEdge(index)
      }
    })
  }

  function stop() {
    proxies.forEach((proxy, index) => {
      setters[index]?.tween.pause()
      targets[index] = proxy.p
    })
  }

  onMounted(() => {
    setters = proxies.map((proxy, index) => gsap.quickTo(proxy, 'p', {
      duration: 0.2, ease: 'power3.out', onUpdate: () => paint(index),
    }))
    edgeSetters = edges.map((edge, index) => gsap.quickTo(edge, 'offset', {
      duration: 0.24, ease: 'back.out(1.4)', onUpdate: () => paintEdge(index),
    }))
    proxies.forEach((_, index) => paint(index))
  })
  onBeforeUnmount(() => {
    disposed = true
    for (const setter of [...setters, ...edgeSetters]) setter.tween.kill()
  })
  return { move, stop, stretch, releaseEdges, reduced, initialStyle, fraction: (index: number) => proxies[index]!.p }
}
