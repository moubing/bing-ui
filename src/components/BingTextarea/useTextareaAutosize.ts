import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { gsap } from 'gsap'
import type { BingTextareaAutosize } from './BingTextarea.types'

interface AutosizeOptions {
  field: Ref<HTMLTextAreaElement | null>
  root: Ref<HTMLElement | null>
  value: () => string
  autosize: () => BingTextareaAutosize
  rows: () => number
  transition: () => boolean
  reducedMotion: Ref<boolean>
  layout: () => unknown
  updateScrollbar: () => void
  resize: (height: number) => void
}

const positiveRows = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback

/** 每帧只测量一次；仅 textarea 本身参与 120ms 高度补间，不在 onUpdate 中测量布局。 */
export function useTextareaAutosize(options: AutosizeOptions) {
  const hasVerticalOverflow = ref(false)
  const verticalScrollbar = computed(() => !options.autosize() || hasVerticalOverflow.value)
  let frame: number | undefined
  let observer: ResizeObserver | undefined
  let tween: gsap.core.Tween | undefined
  let disposed = false
  let managed = false
  let measurementPending = false
  let animateNext = true
  let targetHeight: number | undefined
  let emittedHeight: number | undefined
  let savedHeight = ''
  let savedOverflow = ''

  function stopTween() { tween?.kill(); tween = undefined }
  function syncSettledOverflow() {
    const field = options.field.value
    if (!field || !options.autosize()) return
    hasVerticalOverflow.value = field.scrollHeight - field.clientHeight > 1
    field.style.overflowY = hasVerticalOverflow.value ? 'auto' : 'hidden'
  }
  function finish(height: number) {
    syncSettledOverflow()
    options.updateScrollbar()
    if (emittedHeight !== height) {
      emittedHeight = height
      options.resize(height)
    }
  }
  function measure(animate: boolean) {
    const field = options.field.value
    if (!field || disposed) return
    const autosize = options.autosize()
    if (!autosize) {
      stopTween()
      if (managed) {
        field.style.height = savedHeight
        field.style.overflowY = savedOverflow
      }
      managed = false
      targetHeight = emittedHeight = undefined
      options.updateScrollbar()
      return
    }
    const firstMeasure = !managed
    if (firstMeasure) {
      savedHeight = field.style.height
      savedOverflow = field.style.overflowY
      managed = true
    }
    const style = getComputedStyle(field)
    const currentHeight = parseFloat(style.height) || field.offsetHeight
    const lineHeight = parseFloat(style.lineHeight) || 20
    const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0)
    const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0) + border
    const minRows = positiveRows(typeof autosize === 'object' ? autosize.minRows : undefined, positiveRows(options.rows(), 3))
    const maxRows = typeof autosize === 'object' && autosize.maxRows !== undefined
      ? Math.max(minRows, positiveRows(autosize.maxRows, Infinity)) : Infinity
    const minHeight = Math.max(minRows * lineHeight + padding, parseFloat(style.minHeight) || 0)
    const maxHeight = Math.max(minHeight, maxRows * lineHeight + padding)
    const previousInlineHeight = field.style.height
    const scrollTop = field.scrollTop

    // 原生 rows / 已设置的 height 会撑住 scrollHeight；短暂收起只用于测量，同帧恢复。
    field.style.height = '0px'
    const naturalHeight = field.scrollHeight + border
    const nextHeight = Math.max(minHeight, Math.min(naturalHeight, maxHeight))
    field.style.height = previousInlineHeight
    field.scrollTop = scrollTop
    // 依据最终高度决定滚动条；换行后的内容暂时超出补间高度，不属于真实溢出。
    hasVerticalOverflow.value = naturalHeight - nextHeight > 1
    field.style.overflowY = hasVerticalOverflow.value ? 'auto' : 'hidden'

    const previousTarget = targetHeight ?? currentHeight
    const canAnimate = animate && options.transition() && !options.reducedMotion.value && !firstMeasure &&
      nextHeight < maxHeight && nextHeight - previousTarget <= lineHeight * 3 + 0.5
    if (nextHeight === targetHeight && tween && canAnimate) return
    if (nextHeight === targetHeight && !tween) { syncSettledOverflow(); options.updateScrollbar(); return }
    stopTween()
    targetHeight = nextHeight
    if (canAnimate && Math.abs(nextHeight - previousTarget) >= lineHeight - 0.5 && Math.abs(nextHeight - currentHeight) > 0.5) {
      tween = gsap.fromTo(field, { height: currentHeight }, {
        height: nextHeight, duration: 0.12, ease: 'power2.out',
        onComplete: () => { tween = undefined; finish(nextHeight) },
      })
    } else {
      field.style.height = `${nextHeight}px`
      finish(nextHeight)
    }
  }
  function schedule(animate = true) {
    measurementPending = true
    animateNext = animateNext && animate
    void nextTick(() => {
      if (disposed || frame !== undefined) return
      frame = requestAnimationFrame(() => {
        frame = undefined
        measurementPending = false
        const shouldAnimate = animateNext
        animateNext = true
        measure(shouldAnimate)
      })
    })
  }
  watch(options.value, () => schedule())
  const layout = computed(options.layout)
  const minRows = () => { const value = options.autosize(); return typeof value === 'object' ? value.minRows : undefined }
  const maxRows = () => { const value = options.autosize(); return typeof value === 'object' ? value.maxRows : undefined }
  // 模板里常用 :autosize="{ minRows: 1, maxRows: 6 }"；父级更新时对象重建不等于布局配置变化。
  watch([() => Boolean(options.autosize()), minRows, maxRows, options.rows, options.transition, layout, options.reducedMotion], () => schedule(false))
  onMounted(() => {
    measure(false)
    if (!options.root.value || typeof ResizeObserver === 'undefined') return
    // 记录首次测量的宽度，不能跳过首次 observer 通知：挂载后、首帧前也可能已收窄。
    let width = parseFloat(getComputedStyle(options.root.value).width)
    observer = new ResizeObserver(entries => {
      const rootEntry = entries.find(entry => entry.target === options.root.value)
      if (rootEntry) {
        const nextWidth = rootEntry.borderBoxSize[0]?.inlineSize ?? options.root.value?.offsetWidth ?? width
        if (Math.abs(nextWidth - width) > 0.5) schedule(false)
        width = nextWidth
      }
      // 原生手动缩放仍按实际高度判断；补间和待测量帧中不采纳临时溢出。
      if (!tween && !measurementPending && entries.some(entry => entry.target === options.field.value)) syncSettledOverflow()
    })
    observer.observe(options.root.value)
    if (options.field.value) observer.observe(options.field.value)
  })
  onBeforeUnmount(() => {
    disposed = true
    observer?.disconnect()
    if (frame !== undefined) cancelAnimationFrame(frame)
    stopTween()
  })
  return { schedule, verticalScrollbar }
}
