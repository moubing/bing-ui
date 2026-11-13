import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

const initialProbeCount = 4

/** 测量独立的最终布局副本；离场节点和 transform 动画不会进入测量。 */
export function useOverflowTags<T>(options: {
  items: () => readonly T[]
  enabled: () => boolean
  paused?: () => boolean
  layoutKey?: () => unknown
}) {
  const tagsViewportRef = ref<HTMLElement | null>(null)
  const tagMeasureRef = ref<HTMLElement | null>(null)
  const probeCount = ref(initialProbeCount)
  // SSR / 尚未获得尺寸时也只渲染小批标签，不能先挂载整份选中列表再折叠。
  const visibleItems = shallowRef<readonly T[]>(options.enabled() ? options.items().slice(0, initialProbeCount) : [])
  const visibleTagCount = computed(() => visibleItems.value.length)
  const hiddenTagCount = ref(options.enabled() ? options.items().length - visibleTagCount.value : 0)
  const measurementItems = computed(() => options.enabled() ? options.items().slice(0, probeCount.value) : [])
  const overflowCounts = computed(() => {
    const count = options.items().length
    // 只测量本批前缀可能对应的 +N，保留跨位数和非等宽数字的精确宽度。
    return Array.from({ length: Math.min(count, measurementItems.value.length + 1) }, (_, index) => count - index)
  })
  let observer: ResizeObserver | undefined
  let frame = 0
  let disposed = false

  function commit(items: readonly T[], visible: number) {
    const next = items.slice(0, visible)
    if (next.length !== visibleItems.value.length || next.some((item, index) => item !== visibleItems.value[index])) {
      visibleItems.value = next
    }
    hiddenTagCount.value = items.length - visible
  }

  function measure() {
    if (disposed || options.paused?.()) return
    const items = options.items()
    const count = items.length
    const viewport = tagsViewportRef.value
    const container = tagMeasureRef.value
    if (!options.enabled() || !count || !viewport || !container || viewport.clientWidth <= 0) return
    const widths = Array.from(container.querySelectorAll<HTMLElement>('[data-picker-measure-tag]'), el => el.getBoundingClientRect().width)
    const overflowWidths = new Map(Array.from(container.querySelectorAll<HTMLElement>('[data-overflow-count]'), el =>
      [Number(el.dataset.overflowCount), el.getBoundingClientRect().width] as const))
    const style = getComputedStyle(viewport)
    const gap = Number.parseFloat(style.columnGap) || 0
    const available = viewport.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0)
    const prefixWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap
    if (prefixWidth <= available && widths.length < count) {
      // 当前批次全部放得下才扩展。窄触发器的测量 DOM 数量与选中总数无关。
      probeCount.value = Math.min(count, Math.max(initialProbeCount, probeCount.value * 2))
      return
    }
    if (prefixWidth <= available) {
      commit(items, count)
      return
    }
    let used = 0
    let visible = 0
    for (let index = 0; index < Math.min(widths.length, count - 1); index++) {
      used += (index ? gap : 0) + (widths[index] ?? 0)
      if (used + gap + (overflowWidths.get(count - index - 1) ?? 0) > available) break
      visible = index + 1
    }
    // 标签与 +N 一次提交，动画开始后不再先展开全部标签、再二次折叠。
    commit(items, visible)
    // 保留首个连标签本身也放不下的样本。只保留 visible + 1 时，该前缀可能
    // 不带 +N 又能放下，从而在两种探测数量间反复扩张/收缩，持续触发布局。
    let rawWidth = 0
    const firstOverflow = widths.findIndex((width, index) => {
      rawWidth += width + (index ? gap : 0)
      return rawWidth > available
    })
    probeCount.value = Math.max(initialProbeCount, firstOverflow + 1)
  }

  function refresh() {
    if (disposed || typeof window === 'undefined') return
    window.cancelAnimationFrame(frame)
    const items = options.items()
    if (!options.enabled() || !items.length) {
      commit([], 0)
      probeCount.value = initialProbeCount
      return
    }
    if (!tagsViewportRef.value?.clientWidth) {
      commit(items, Math.min(items.length, initialProbeCount))
      return
    }
    frame = window.requestAnimationFrame(() => { frame = 0; measure() })
  }

  watch(() => [options.items(), options.enabled(), options.layoutKey?.(), options.paused?.()], refresh, { flush: 'post' })
  // 只观察待测前缀的内容，兼顾标签原地改名与批量选中时的成本。
  watch(measurementItems, refresh, { deep: true, flush: 'post' })
  watch([tagsViewportRef, tagMeasureRef], () => {
    observer?.disconnect()
    if (tagsViewportRef.value) observer?.observe(tagsViewportRef.value)
    if (tagMeasureRef.value) observer?.observe(tagMeasureRef.value)
    refresh()
  }, { flush: 'post' })
  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') observer = new ResizeObserver(refresh)
    if (tagsViewportRef.value) observer?.observe(tagsViewportRef.value)
    if (tagMeasureRef.value) observer?.observe(tagMeasureRef.value)
    window.addEventListener('resize', refresh)
    void document.fonts?.ready.then(refresh)
    refresh()
  })
  onBeforeUnmount(() => {
    disposed = true
    observer?.disconnect()
    window.cancelAnimationFrame(frame)
    window.removeEventListener('resize', refresh)
  })
  return { tagsViewportRef, tagMeasureRef, visibleItems, visibleTagCount, hiddenTagCount, measurementItems, overflowCounts, refresh }
}
