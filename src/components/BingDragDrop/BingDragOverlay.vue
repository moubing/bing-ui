<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch, type ComponentPublicInstance } from 'vue'
import { DragOverlay } from '@dnd-kit/vue'
import type { DropAnimationFunction } from '@dnd-kit/dom'
import { useOptionalBingDragDrop } from './context'
import type { BingDragOverlayProps, BingDragOverlaySlotProps } from './BingDragDrop.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const props = withDefaults(defineProps<BingDragOverlayProps>(), {
  tilt: 1.5,
  dropDuration: 180,
})

defineSlots<{
  default?(props: BingDragOverlaySlotProps<any>): unknown
}>()

const context = useOptionalBingDragDrop()

if (!context) {
  throw new Error('<BingDragOverlay> 必须放在 <BingDragDrop> 内部')
}

const prefersReducedMotion = useReducedMotion()

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
const DROPPING = 'data-dnd-dropping'

function isRendered(element: Element | null | undefined): element is Element {
  if (!element?.isConnected) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function translateOf(element: Element, fallback: { x: number; y: number }) {
  const [x, y] = getComputedStyle(element).translate.split(' ').map(part => Number.parseFloat(part))
  return Number.isFinite(x) ? { x: x!, y: Number.isFinite(y) ? y! : 0 } : fallback
}

/**
 * 与 dnd-kit 默认的归位动画相同（中心对齐、尺寸不同时同时过渡宽高），只多一个分支：
 * 条目放下后不再显示（移出列表或落到隐藏的列）时，默认实现会飞向空矩形所在的视口左上角；
 * 这里改为缩小淡出地收进它落下的区域，区域也不在时就地收拢。
 * dnd-kit 只在浮层带 data-dnd-dropping 时放开 translate 的 !important，transform 始终被占用，
 * 所以只动 translate、scale、opacity 和尺寸。
 */
function createDropAnimation(duration: number): DropAnimationFunction {
  return ({ element, feedbackElement, placeholder, translate }) => {
    // 每次松手时再读减少动效设置：matchMedia 不是响应式的，放在 computed 里会一直沿用挂载时的结果。
    if (prefersReducedMotion()) return
    const overlay = feedbackElement as HTMLElement
    const target = placeholder ?? element
    const zone = dropZoneElement
    const from = translateOf(overlay, translate)
    const landing = isRendered(target)
    // dnd-kit 让浮层尺寸跟随源条目，源条目被隐藏后会缩成 0×0；收进区域时沿用拖动中的尺寸。
    const size = landing || overlay.offsetWidth > 0 ? { width: overlay.offsetWidth, height: overlay.offsetHeight } : overlaySize
    const box = overlay.getBoundingClientRect()
    const current = { left: box.left, top: box.top, width: Math.max(box.width, size.width), height: Math.max(box.height, size.height) }
    const destination = landing ? target.getBoundingClientRect() : isRendered(zone) ? zone.getBoundingClientRect() : current
    const to = {
      x: from.x + destination.left + destination.width / 2 - (current.left + current.width / 2),
      y: from.y + destination.top + destination.height / 2 - (current.top + current.height / 2),
    }
    const keyframes: Record<string, string[]> = { translate: [`${from.x}px ${from.y}px 0`, `${to.x}px ${to.y}px 0`] }

    if (landing) {
      const width = (target as HTMLElement).offsetWidth ?? destination.width
      const height = (target as HTMLElement).offsetHeight ?? destination.height
      if (Math.round(width) !== Math.round(overlay.offsetWidth)) {
        keyframes.minWidth = keyframes.maxWidth = [`${overlay.offsetWidth}px`, `${width}px`]
      }
      if (Math.round(height) !== Math.round(overlay.offsetHeight)) {
        keyframes.minHeight = keyframes.maxHeight = [`${overlay.offsetHeight}px`, `${height}px`]
      }
    } else {
      keyframes.scale = ['1', '0.4']
      keyframes.opacity = ['1', '0']
      if (size.width > 0) {
        keyframes.width = keyframes.minWidth = keyframes.maxWidth = [`${size.width}px`, `${size.width}px`]
        keyframes.height = keyframes.minHeight = keyframes.maxHeight = [`${size.height}px`, `${size.height}px`]
      }
    }

    overlay.setAttribute(DROPPING, '')
    const animation = overlay.animate(keyframes, {
      duration: landing ? duration : Math.round(duration * 1.3),
      easing: landing ? EASE_OUT : 'cubic-bezier(0.4, 0, 0.6, 1)',
      // 收进区域时停在消失的状态，等 dnd-kit 收尾、浮层内容收起后再去掉动画。
      fill: landing ? 'none' : 'forwards',
    })

    return animation.finished.then(
      () => {
        overlay.removeAttribute(DROPPING)
        if (!landing) requestAnimationFrame(() => animation.cancel())
      },
      () => overlay.removeAttribute(DROPPING),
    )
  }
}

const dropAnimation = computed(() => props.dropDuration > 0 ? createDropAnimation(props.dropDuration) : null)

const tiltStyle = computed(() => ({
  '--bing-drag-overlay-tilt': `${prefersReducedMotion() ? 0 : props.tilt}deg`,
}))

// 放下后 active 立即清空，归位动画期间沿用最后一次的内容。
let lastSlotProps: BingDragOverlaySlotProps<any> | null = null
// 拖动中记下指针所在区域的元素：松手后区域可能已卸载、正在离场动画中，登记表里查不到。
let dropZoneElement: HTMLElement | undefined
let overlaySize = { width: 0, height: 0 }

const slotProps = computed<BingDragOverlaySlotProps<any> | null>(() => {
  const current = context.active.value

  if (current) {
    lastSlotProps = { id: current.id, zone: current.zone, data: current.data, over: current.over }
    dropZoneElement = current.over === null ? undefined : context.zoneElement(current.over)
  }

  return lastSlotProps
})

// dnd-kit 收尾时同步移除 data-dnd-dragging 并重置浮层定位，源条目却要等下一个任务才恢复。
// MutationObserver 在同一个微任务检查点里通知，浮层内容和占位样式因此在绘制前一起收起。
const overlayRef = shallowRef<ComponentPublicInstance | null>(null)
let observer: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined

watch(overlayRef, (instance) => {
  observer?.disconnect()
  resizeObserver?.disconnect()
  const element = instance?.$el

  if (!(element instanceof HTMLElement) || typeof MutationObserver === 'undefined') {
    return
  }

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (element.hasAttribute('data-dnd-dragging') && element.offsetWidth > 0 && element.offsetHeight > 0) {
        overlaySize = { width: element.offsetWidth, height: element.offsetHeight }
      }
    })
    resizeObserver.observe(element)
  }

  observer = new MutationObserver((records) => {
    const released = records.some(record => record.oldValue !== null && !element.hasAttribute('data-dnd-dragging'))

    if (released && lastSlotProps) {
      context.settle(lastSlotProps.id)
    }
  })
  observer.observe(element, { attributes: true, attributeFilter: ['data-dnd-dragging'], attributeOldValue: true })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
})

const visible = computed(() => slotProps.value !== null && context.settled.value !== slotProps.value.id)
</script>

<template>
  <DragOverlay
    ref="overlayRef"
    v-slot="{ source }"
    class="bing-drag-overlay"
    :drop-animation="dropAnimation"
    aria-hidden="true"
    inert
  >
    <div v-if="source && slotProps && visible" class="bing-drag-overlay__body" :style="tiltStyle">
      <slot v-bind="slotProps" />
    </div>
  </DragOverlay>
</template>

<style scoped>
/* 浮层不一定渲染在条目的容器内，文字基准与 BingSortableList 的拖拽预览一致。 */
.bing-drag-overlay {
  box-sizing: border-box;
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  pointer-events: none;
}

.bing-drag-overlay__body {
  height: 100%;
  transform: rotate(var(--bing-drag-overlay-tilt, 0deg));
  transform-origin: 30% 50%;
  transition: transform var(--bing-duration-fast, 180ms) var(--bing-ease-smooth, ease);
}

.bing-drag-overlay[data-dnd-dropping] .bing-drag-overlay__body {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .bing-drag-overlay__body {
    transition: none;
  }
}
</style>
