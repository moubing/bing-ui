<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useReducedMotion } from '../../motion/reducedMotion'
import { bingDropDownContextKey } from './BingDropDown.context'

const dropdown = inject(bingDropDownContextKey, null)
const layer = ref<HTMLElement>()
const reduced = useReducedMotion()
let frame = 0
let tween: gsap.core.Tween | undefined
let observer: ResizeObserver | undefined
let previous: HTMLElement | undefined
function update() {
  frame = 0
  const el = layer.value, body = el?.parentElement, menu = el?.closest<HTMLElement>('[role="menu"]')
  if (!el || !body || !menu || !dropdown) return
  const item = dropdown.navigation.highlighted.value.get(menu)
  tween?.kill()
  if (!item || dropdown.getHighlightMotion() !== 'slide') { el.style.opacity = '0'; previous = undefined; return }
  const rect = item.getBoundingClientRect(), container = body.getBoundingClientRect()
  const scaleX = body.offsetWidth / (container.width || 1), scaleY = body.offsetHeight / (container.height || 1)
  el.style.width = `${item.offsetWidth}px`
  el.classList.toggle('is-danger', item.classList.contains('bing-dropdown-item--danger'))
  const target = { x: (rect.left - container.left) * scaleX, y: (rect.top - container.top) * scaleY,
    scaleY: rect.height * scaleY / 32, opacity: 1, duration: reduced() || !previous ? 0 : 0.18, ease: 'power3.out' }
  tween = gsap.to(el, target)
  previous = item
}
function schedule() { if (!frame) frame = requestAnimationFrame(update) }
watch(() => [dropdown?.navigation.highlighted.value, dropdown?.getHighlightMotion()], schedule, { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(schedule)
  if (layer.value?.parentElement) observer.observe(layer.value.parentElement)
  schedule()
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect(); tween?.kill() })
</script>

<template><span ref="layer" class="bing-dropdown__highlight" aria-hidden="true"></span></template>

<style scoped>
.bing-dropdown__highlight {
  position: absolute;
  top: 0;
  left: 0;
  height: 32px;
  z-index: 0;
  border-radius: var(--bing-radius-sm, 4px);
  background: var(--bing-surface-hover);
  transform-origin: top left;
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
}
.bing-dropdown__highlight.is-danger { background: color-mix(in srgb, var(--bing-danger-strong) 10%, transparent); }
</style>
