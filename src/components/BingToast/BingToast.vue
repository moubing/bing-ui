<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import BingButton from '../BingButton/BingButton.vue'
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, onUpdated, ref, watch } from 'vue'
import type { Component, CSSProperties } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  Sparkles,
  X,
  XCircle,
} from '../../icons'
import { gsap } from 'gsap'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import {
  compactSmoothScrollOptions,
  resolveComponentSmoothScroll,
} from '../../motion/smoothScroll'
import {
  activeBingToastViewportId,
  bingToast,
  bingToastItems,
  createBingToastViewportId,
  pauseAllBingToastTimers,
  registerBingToastViewport,
  restartAllBingToastTimers,
  runBingToastAction,
  unregisterBingToastViewport,
} from './BingToast.service'
import { BING_TOAST_POSITIONS, normalizeBingToastPosition } from './BingToast.types'
import type {
  BingToastEmits,
  BingToastItem,
  BingToastPosition,
  BingToastProps,
  BingToastRenderPosition,
  BingToastType,
} from './BingToast.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

interface ToastGroup {
  position: BingToastRenderPosition
  toasts: BingToastItem[]
}

const props = withDefaults(defineProps<BingToastProps>(), {
  viewportPosition: 'all',
  offset: 18,
  gap: 10,
  width: 360,
  max: 5,
  smoothScroll: true,
})

const emit = defineEmits<BingToastEmits>()
const resolvedZIndex = useConfigZIndex('toast', () => props.zIndex)
const clientReady = useClientReady()

const rootRef = ref<HTMLElement | null>(null)
const toastScrollRefs: Partial<Record<BingToastRenderPosition, BingScrollbarExpose>> = {}
const viewportId = createBingToastViewportId()
const animatedToasts = new Set<HTMLElement>()
let toastPositions: Map<HTMLElement, DOMRect> | undefined
let isUnmounting = false

const iconMap: Record<BingToastType, Component> = {
  default: Sparkles,
  success: CheckCircle2,
  error: XCircle,
  loading: LoaderCircle,
  warning: AlertTriangle,
  info: Info,
}

const normalizedMax = computed(() => Math.max(1, Math.floor(props.max)))
const visiblePositions = computed(() =>
  props.viewportPosition === 'all'
    ? BING_TOAST_POSITIONS
    : [normalizeBingToastPosition(props.viewportPosition)],
)
const isActiveViewport = computed(() => activeBingToastViewportId.value === viewportId)
const resolvedSmoothScroll = computed(() =>
  resolveComponentSmoothScroll(props.smoothScroll, compactSmoothScrollOptions, {
    respectReducedMotion: true,
    smoothTouchpad: false,
  }),
)

const rootStyle = computed(
  () =>
    ({
      zIndex: resolvedZIndex.value,
      '--bing-toast-offset': normalizeCssSize(props.offset, 18),
      '--bing-toast-gap': normalizeCssSize(props.gap, 10),
      '--bing-toast-width': normalizeCssSize(props.width, 360),
    }) as CSSProperties,
)

const toastGroups = computed<ToastGroup[]>(() =>
  isActiveViewport.value
    ? visiblePositions.value
        .map((position) => ({
          position,
          toasts: bingToastItems.value
            .filter((toast) => toast.position === position)
            .sort((first, second) => second.order - first.order),
        }))
    : [],
)

function setToastScrollRef(position: BingToastRenderPosition, instance: unknown) {
  if (instance) {
    toastScrollRefs[position] = instance as BingScrollbarExpose
    return
  }

  delete toastScrollRefs[position]
}

function stopToastScrollbars() {
  Object.values(toastScrollRefs).forEach((scrollbar) => scrollbar?.stop())
}

function clampToastScrollbars() {
  Object.values(toastScrollRefs).forEach((scrollbar) => {
    if (!scrollbar) {
      return
    }

    scrollbar.stop()

    const viewport = scrollbar.viewport
    if (!viewport) {
      return
    }

    const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    const nextScrollTop = Math.min(maximum, Math.max(0, viewport.scrollTop))

    if (nextScrollTop !== viewport.scrollTop) {
      scrollbar.scrollTo(nextScrollTop)
    }

    scrollbar.update()
  })
}

watch(
  () => [
    bingToastItems.value,
    isActiveViewport.value,
    props.viewportPosition,
    props.width,
    props.gap,
  ] as const,
  () => {
    stopToastScrollbars()
    void nextTick(clampToastScrollbars)
  },
  { flush: 'sync' },
)

function normalizeCssSize(value: string | number | undefined, fallback: number) {
  return typeof value === 'number' ? `${value}px` : (value ?? `${fallback}px`)
}

function getRegionClasses(position: BingToastRenderPosition) {
  return ['bing-toast-region', `bing-toast-region--${position}`]
}

function getToastStyle(index: number, _toast: BingToastItem) {
  const depth = Math.min(index, normalizedMax.value - 1, 5)

  return {
    '--bing-toast-depth': String(depth),
    '--bing-toast-stack-scale': '1',
    '--bing-toast-stack-shift': '0px',
    '--bing-toast-stack-opacity': '1',
    '--bing-toast-stack-edge-shadow': '0.035',
    '--bing-toast-stack-outline': '0.035',
    '--bing-toast-stack-z-index': String(20 - depth),
  } as CSSProperties
}

function getToastIcon(type: BingToastType) {
  return iconMap[type]
}

function getToastRole(toast: BingToastItem) {
  return toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'
}

function getToastLive(toast: BingToastItem) {
  return toast.type === 'error' || toast.type === 'warning' ? 'assertive' : 'polite'
}

function getMotionOffset(position: BingToastRenderPosition) {
  let x = 0
  let y = 0

  if (position === 'right' || position.endsWith('right')) {
    x = 28
  } else if (position === 'left' || position.endsWith('left')) {
    x = -28
  }

  if (position === 'top' || position.startsWith('top')) {
    y = -18
  } else if (position === 'bottom' || position.startsWith('bottom')) {
    y = 18
  }

  return { x, y }
}

function getElementPosition(element: HTMLElement): BingToastRenderPosition {
  return normalizeBingToastPosition(element.dataset.position as BingToastPosition | undefined)
}

function getToastCard(element: Element) {
  return element.querySelector<HTMLElement>('.bing-toast__card')!
}

// 外层只负责列表补位，卡片内层负责进出场，避免两种动画争用 transform。
function captureToastPositions() {
  if (isUnmounting || toastPositions || !rootRef.value) return

  const elements = Array.from(rootRef.value.querySelectorAll<HTMLElement>('.bing-toast'))
  elements.forEach(element => animatedToasts.add(element))
  toastPositions = new Map(elements.map(element => [element, element.getBoundingClientRect()]))

  // 先记录正在播放的视觉位置，再取消旧动画；连续关闭时从当前位置接续。
  if (elements.length) {
    gsap.getTweensOf(elements).forEach(tween => tween.kill())
    gsap.set(elements, { clearProps: 'transform' })
  }
}

function animateToastPositions() {
  const previous = toastPositions
  toastPositions = undefined
  if (isUnmounting || !previous || !rootRef.value) return

  clampToastScrollbars()
  if (prefersReducedMotion()) return

  const deltas = new Map<HTMLElement, { x: number; y: number }>()
  previous.forEach((rect, element) => {
    if (!element.isConnected) return
    const current = element.getBoundingClientRect()
    const x = rect.left - current.left
    const y = rect.top - current.top
    if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) deltas.set(element, { x, y })
  })

  if (!deltas.size) return
  gsap.fromTo(
    [...deltas.keys()],
    {
      x: (_index, element: HTMLElement) => deltas.get(element)!.x,
      y: (_index, element: HTMLElement) => deltas.get(element)!.y,
    },
    {
      x: 0,
      y: 0,
      duration: 0.34,
      ease: 'power3.out',
      overwrite: true,
      clearProps: 'transform',
      onComplete: clampToastScrollbars,
    },
  )
}

onBeforeUpdate(captureToastPositions)
onUpdated(animateToastPositions)

function handleBeforeEnter(element: Element) {
  if (isUnmounting) return
  const toastElement = element as HTMLElement
  const offset = getMotionOffset(getElementPosition(toastElement))
  animatedToasts.add(toastElement)

  gsap.set(getToastCard(toastElement), {
    autoAlpha: 0,
    x: offset.x,
    y: offset.y,
    scale: 0.96,
    force3D: true,
  })
}

function handleEnter(element: Element, done: () => void) {
  if (isUnmounting) {
    done()
    return
  }
  const card = getToastCard(element)

  gsap.killTweensOf(card)
  gsap.to(card, {
    autoAlpha: 1,
    x: 0,
    y: 0,
    scale: 1,
    duration: prefersReducedMotion() ? 0 : 0.34,
    ease: 'back.out(1.7)',
    overwrite: 'auto',
    clearProps: 'visibility,transform',
    onComplete: done,
  })
}

function handleLeave(element: Element, done: () => void) {
  if (isUnmounting) {
    done()
    return
  }
  const toastElement = element as HTMLElement
  const offset = getMotionOffset(getElementPosition(toastElement))
  const card = getToastCard(element)
  animatedToasts.add(toastElement)

  gsap.killTweensOf(card)
  gsap.to(card, {
    autoAlpha: 0,
    x: offset.x * 0.55,
    y: offset.y,
    scale: 0.93,
    duration: prefersReducedMotion() ? 0 : 0.38,
    ease: 'power3.inOut',
    overwrite: 'auto',
    onComplete: () => {
      // Vue 的退场回调移除 DOM 时不会再次触发列表更新，需要单独捕获这次布局变化。
      captureToastPositions()
      gsap.killTweensOf(toastElement)
      done()
      animatedToasts.delete(toastElement)
      void nextTick(animateToastPositions)
    },
  })
}

function handleAfterToastTransition() {
  if (isUnmounting) return
  void nextTick(clampToastScrollbars)
}

function handleClose(toast: BingToastItem) {
  emit('close', toast)
  bingToast.close(toast.id)
  restartAllBingToastTimers()
}

function handleAction(toast: BingToastItem) {
  // 返回 Promise，让 Vue 把操作回调的同步异常交给应用的 errorHandler。
  return runBingToastAction(toast.id)
}

function handleToastEnter() {
  pauseAllBingToastTimers()
}

function handleToastLeave() {
  restartAllBingToastTimers()
}

function handleToastFocusOut(event: FocusEvent) {
  const currentTarget = event.currentTarget as HTMLElement | null
  const nextTarget = event.relatedTarget

  if (currentTarget && nextTarget instanceof Node && currentTarget.contains(nextTarget)) {
    return
  }

  restartAllBingToastTimers()
}

onMounted(() => {
  registerBingToastViewport(viewportId)
})

onBeforeUnmount(() => {
  isUnmounting = true
  toastPositions = undefined
  stopToastScrollbars()
  unregisterBingToastViewport(viewportId)

  // 退场节点可能已脱离根容器，按实例记录清理，不能只依赖 DOM 查询。
  const targets = [...animatedToasts].flatMap(element => [element, getToastCard(element)])
  gsap.getTweensOf(targets).forEach(tween => tween.kill())
  animatedToasts.clear()
})
</script>

<template>
  <Teleport v-if="clientReady" to="body">
    <div ref="rootRef" class="bing-toast-root" :style="rootStyle">
      <div
        v-for="group in toastGroups"
        :key="group.position"
        :class="[getRegionClasses(group.position), { 'is-empty': group.toasts.length === 0 }]"
      >
        <BingScrollbar
          :ref="(instance) => setToastScrollRef(group.position, instance)"
          class="bing-toast-scroll"
          max-height="calc(100vh - var(--bing-toast-offset) - var(--bing-toast-offset))"
          :smooth="resolvedSmoothScroll"
          always
          :aria-label="group.toasts.length > 0 ? '消息通知' : undefined"
          @pointerenter="handleToastEnter"
          @pointerleave="handleToastLeave"
        >
          <TransitionGroup
            tag="div"
            class="bing-toast-stack"
            :css="false"
            @before-enter="handleBeforeEnter"
            @enter="handleEnter"
            @leave="handleLeave"
            @after-enter="handleAfterToastTransition"
            @after-leave="handleAfterToastTransition"
          >
            <article
              v-for="(toast, index) in group.toasts"
              :key="toast.id"
              class="bing-toast"
              :class="[`bing-toast--${toast.type}`, { 'has-title': Boolean(toast.title), 'has-action': Boolean(toast.action) }]"
              :style="getToastStyle(index, toast)"
              :data-position="group.position"
              :data-depth="Math.min(index, normalizedMax - 1, 5)"
              :role="getToastRole(toast)"
              :aria-live="getToastLive(toast)"
              :aria-label="toast.ariaLabel"
              @pointerenter="handleToastEnter"
              @pointerleave="handleToastLeave"
              @focusin="handleToastEnter"
              @focusout="handleToastFocusOut"
            >
              <div class="bing-toast__card">
                <span class="bing-toast__icon" aria-hidden="true">
                  <BingIcon :icon="getToastIcon(toast.type)" size="md" :stroke-width="1.75" />
                </span>

                <span class="bing-toast__content">
                  <strong v-if="toast.title" class="bing-toast__title">{{ toast.title }}</strong>
                  <span class="bing-toast__message">{{ toast.message }}</span>
                </span>

                <BingButton
                  v-if="toast.action"
                  variant="ghost"
                  size="xs"
                  rounded="sm"
                  :throttle="false"
                  class="bing-toast__action"
                  :loading="toast.actionPending"
                  :disabled="toast.actionPending"
                  :aria-label="toast.action.ariaLabel"
                  :aria-busy="toast.actionPending ? 'true' : undefined"
                  @click="handleAction(toast)"
                >
                  {{ toast.action.label }}
                </BingButton>

                <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
                  v-if="toast.closable"
                  class="bing-toast__close"
                  :aria-label="toast.closeAriaLabel"
                  @click="handleClose(toast)"
                >
                  <template #prefix>
                    <BingIcon :icon="X" size="sm" :stroke-width="1.75" />
                  </template>
                </BingButton>
              </div>
            </article>
          </TransitionGroup>
        </BingScrollbar>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.bing-toast-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.bing-toast-region {
  position: fixed;
  display: flex;
  pointer-events: none;
}

.bing-toast-region.is-empty .bing-toast-scroll {
  pointer-events: none;
}

.bing-toast-region--top,
.bing-toast-region--top-left {
  top: var(--bing-toast-offset);
  left: var(--bing-toast-offset);
  align-items: flex-start;
}

.bing-toast-region--top {
  left: 50%;
  transform: translateX(-50%);
}

.bing-toast-region--top-center {
  top: var(--bing-toast-offset);
  left: 50%;
  transform: translateX(-50%);
}

.bing-toast-region--top-right {
  top: var(--bing-toast-offset);
  right: var(--bing-toast-offset);
  align-items: flex-end;
}

.bing-toast-region--left {
  top: 50%;
  left: var(--bing-toast-offset);
  align-items: flex-start;
  transform: translateY(-50%);
}

.bing-toast-region--right {
  top: 50%;
  right: var(--bing-toast-offset);
  align-items: flex-end;
  transform: translateY(-50%);
}

.bing-toast-region--bottom,
.bing-toast-region--bottom-left {
  bottom: var(--bing-toast-offset);
  left: var(--bing-toast-offset);
  align-items: flex-start;
}

.bing-toast-region--bottom {
  left: 50%;
  transform: translateX(-50%);
}

.bing-toast-region--bottom-center {
  bottom: var(--bing-toast-offset);
  left: 50%;
  transform: translateX(-50%);
}

.bing-toast-region--bottom-right {
  right: var(--bing-toast-offset);
  bottom: var(--bing-toast-offset);
  align-items: flex-end;
}

.bing-toast-scroll {
  --bing-toast-motion-buffer: 34px;
  --bing-toast-scrollbar-offset: calc(var(--bing-toast-motion-buffer) - 12px);
  --bing-scrollbar-gutter: 0px;

  box-sizing: border-box;
  width: calc(var(--bing-toast-width) + var(--bing-toast-motion-buffer) + var(--bing-toast-motion-buffer));
  max-width: calc(
    100vw - var(--bing-toast-offset) - var(--bing-toast-offset) + var(--bing-toast-motion-buffer) +
      var(--bing-toast-motion-buffer)
  );
  margin-inline: calc(var(--bing-toast-motion-buffer) * -1);
  pointer-events: auto;
}

.bing-toast-scroll :deep(.bing-scrollbar__viewport) {
  overflow-x: hidden;
}

.bing-toast-scroll :deep(.bing-scrollbar__rail) {
  right: var(--bing-toast-scrollbar-offset);
  border-color: transparent;
  background: transparent;
}

.bing-toast-stack {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  /* 限定补位动画的溢出边界，避免位移结束后留下虚假的滚动高度。 */
  overflow: clip;
  gap: var(--bing-toast-gap);
  padding: 3px var(--bing-toast-motion-buffer);
  pointer-events: none;
}

.bing-toast-region--bottom .bing-toast-stack,
.bing-toast-region--bottom-left .bing-toast-stack,
.bing-toast-region--bottom-center .bing-toast-stack,
.bing-toast-region--bottom-right .bing-toast-stack {
  flex-direction: column-reverse;
}

.bing-toast {
  position: relative;
  z-index: var(--bing-toast-stack-z-index);
  display: block;
  margin-block-start: 0;
  pointer-events: auto;
  will-change: transform, opacity;
  transition: opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-toast__card {
  --bing-toast-accent: var(--bing-accent);
  --bing-toast-accent-strong: var(--bing-accent-strong);

  box-sizing: border-box;
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 48px;
  gap: 10px;
  padding: 10px 12px;
  overflow: hidden;
  border: 1px solid var(--bing-popover-border);
  border-radius: 8px;
  background: var(--bing-surface-solid);
  background-clip: padding-box;
  color: var(--bing-text);
  box-shadow: var(--bing-shadow-sm);
  opacity: var(--bing-toast-stack-opacity);
  transform: translateX(0) scale(var(--bing-toast-stack-scale));
  transform-origin: center right;
  transition: box-shadow var(--bing-duration-fast) var(--bing-ease-smooth);
}


.bing-toast-region--left .bing-toast__card,
.bing-toast-region--top-left .bing-toast__card,
.bing-toast-region--bottom-left .bing-toast__card {
  transform-origin: center left;
}

.bing-toast-region--right .bing-toast__card,
.bing-toast-region--top-right .bing-toast__card,
.bing-toast-region--bottom-right .bing-toast__card {
  transform-origin: center right;
}

.bing-toast-region--top .bing-toast__card,
.bing-toast-region--top-center .bing-toast__card {
  transform-origin: center;
}

.bing-toast-region--bottom .bing-toast__card,
.bing-toast-region--bottom-center .bing-toast__card {
  transform-origin: center;
}

.bing-toast:hover .bing-toast__card {
  opacity: 1;
  box-shadow: var(--bing-shadow-sm);
}

.bing-toast__icon {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--bing-toast-accent-strong);
}

.bing-toast__content {
  position: relative;
  z-index: 3;
  display: grid;
  min-width: 0;
  gap: 2px;
}

.bing-toast.has-title .bing-toast__card {
  align-items: start;
}

.bing-toast__title {
  overflow-wrap: anywhere;
  color: var(--bing-heading);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.bing-toast__message {
  overflow-wrap: anywhere;
  color: var(--bing-text);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
}

.bing-toast__close {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-toast__close:hover {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-toast__close:active {
  transform: scale(0.86) rotate(8deg);
}

.bing-toast__close:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-toast--success .bing-toast__card {
  --bing-toast-accent: var(--bing-success);
  --bing-toast-accent-strong: var(--bing-success-strong);
}

.bing-toast--error .bing-toast__card {
  --bing-toast-accent: var(--bing-danger);
  --bing-toast-accent-strong: var(--bing-danger-strong);
}

.bing-toast--loading .bing-toast__card {
  --bing-toast-accent: var(--bing-secondary);
  --bing-toast-accent-strong: var(--bing-secondary-strong);
}

.bing-toast--warning .bing-toast__card {
  --bing-toast-accent: var(--bing-warning);
  --bing-toast-accent-strong: var(--bing-warning-strong);
}

.bing-toast--info .bing-toast__card {
  --bing-toast-accent: var(--bing-secondary);
  --bing-toast-accent-strong: var(--bing-secondary-strong);
}

.bing-toast--loading .bing-toast__icon :deep(.bing-icon) {
  animation: bing-toast-spin 900ms linear infinite;
}

@keyframes bing-toast-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (max-width: 560px) {
  .bing-toast-region {
    right: 12px;
    left: 12px;
    transform: none;
  }

  .bing-toast-region--top,
  .bing-toast-region--top-left,
  .bing-toast-region--top-center,
  .bing-toast-region--top-right,
  .bing-toast-region--left,
  .bing-toast-region--right {
    top: 12px;
  }

  .bing-toast-region--bottom,
  .bing-toast-region--bottom-left,
  .bing-toast-region--bottom-center,
  .bing-toast-region--bottom-right {
    bottom: 12px;
  }

  .bing-toast-stack {
    width: 100%;
  }

  .bing-toast-scroll {
    width: calc(100% + var(--bing-toast-motion-buffer) + var(--bing-toast-motion-buffer));
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-toast,
  .bing-toast__card,
  .bing-toast__close {
    transition: none;
    animation: none;
  }

  .bing-toast--loading .bing-toast__icon :deep(.bing-icon) {
    animation: none;
  }
}

.bing-toast.has-action .bing-toast__card {
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  column-gap: 8px;
}

.bing-toast.has-title.has-action .bing-toast__card {
  align-items: center;
}

.bing-toast__action.bing-button {
  --button-height: 28px;
  position: relative;
  z-index: 3;
  min-height: 28px;
  padding-inline: 8px;
  color: var(--bing-accent-strong);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-toast__close.bing-button {
  --button-height: 24px;
  --button-icon-size: 16px;
  min-height: 24px;
  width: var(--button-height);
  padding: 0;
}
</style>
