import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

export function useDialogViewport(root: Ref<HTMLElement | null>) {
  const narrow = ref(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 560px)').matches)
  const viewportStyle = ref<Record<string, string>>({})
  const scrolled = ref(false)
  const moreBelow = ref(false)
  let frame = 0
  let observer: ResizeObserver | undefined
  function updateScroll() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const viewport = root.value?.querySelector<HTMLElement>('.bing-dialog__body-scroll > .bing-scrollbar__viewport')
      scrolled.value = Boolean(viewport && viewport.scrollTop > 0.5)
      moreBelow.value = Boolean(viewport && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop > 1)
    })
  }
  function updateViewport() {
    narrow.value = window.matchMedia('(max-width: 560px)').matches
    const viewport = window.visualViewport
    viewportStyle.value = narrow.value && viewport && viewport.scale === 1 ? {
      '--bing-dialog-keyboard-inset': `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`,
      '--bing-dialog-viewport-offset': `${viewport.offsetTop}px`,
      '--bing-dialog-viewport-height': `${viewport.height}px`,
    } : {}
  }
  watch(root, element => {
    observer?.disconnect()
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    if (!element) return
    observer = new ResizeObserver(updateScroll)
    for (const selector of ['.bing-scrollbar__viewport', '.bing-dialog__body']) {
      const target = element.querySelector(selector)
      if (target) observer.observe(target)
    }
    updateScroll()
  }, { flush: 'post' })
  onMounted(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('scroll', updateViewport)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    if (frame) cancelAnimationFrame(frame)
    window.removeEventListener('resize', updateViewport)
    window.visualViewport?.removeEventListener('resize', updateViewport)
    window.visualViewport?.removeEventListener('scroll', updateViewport)
  })
  return { narrow, viewportStyle, scrolled, moreBelow, updateScroll }
}
