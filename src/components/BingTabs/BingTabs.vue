<script setup lang="ts">
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import { useClickFeedback } from '../../motion/useClickFeedback'
import {
  computed,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  ref,
  watch,
} from 'vue'
import { gsap } from 'gsap'
import { getLayoutScale } from '../../motion/layoutScale'
import { useReducedMotion } from '../../motion/reducedMotion'
import { useConfigSize } from '../../utils/config'
import {
  compactSmoothScrollOptions,
  resolveComponentSmoothScroll,
} from '../../motion/smoothScroll'
import type {
  BingTabItem,
  BingTabValue,
  BingTabsChangePayload,
  BingTabsEmits,
  BingTabsFocusPayload,
  BingTabsProps,
} from './BingTabs.types'

const { playClickFeedback } = useClickFeedback()
const prefersReducedMotion = useReducedMotion()
const props = withDefaults(defineProps<BingTabsProps>(), {
  modelValue: undefined,
  items: () => [],
  variant: 'pill',
  activation: 'auto',
  disabled: false,
  block: false,
  loop: true,
  animated: true,
  respectReducedMotion: true,
  smoothScroll: true,
  ariaLabel: '标签页',
})

const emit = defineEmits<BingTabsEmits>()
const resolvedSize = useConfigSize(() => props.size)
defineOptions({ inheritAttrs: false })

const rootRef = ref<HTMLElement | null>(null)
const scrollbarRef = ref<BingScrollbarExpose | null>(null)
const indicatorRef = ref<HTMLElement | null>(null)
const tabRefs = ref<HTMLButtonElement[]>([])
const internalValue = ref<BingTabValue | undefined>(undefined)
const focusedIndex = ref(-1)
const hasPositionedIndicator = ref(false)

let indicatorTween: gsap.core.Tween | undefined
let resizeObserver: ResizeObserver | undefined
let indicatorFrame = 0

const isControlled = computed(() => props.modelValue !== undefined)
const enabledItems = computed(() => props.items.filter((item) => !item.disabled))
const firstEnabledItem = computed(() => enabledItems.value[0])
const activeValue = computed(() => {
  if (isControlled.value) {
    return props.modelValue
  }

  return internalValue.value ?? firstEnabledItem.value?.value
})
const activeIndex = computed(() =>
  props.items.findIndex((item) => Object.is(item.value, activeValue.value)),
)

const rootClasses = computed(() => [
  'bing-tabs',
  `bing-tabs--${props.variant}`,
  `bing-tabs--${resolvedSize.value}`,
  {
    'is-block': props.block,
    'is-disabled': props.disabled,
    'is-indicator-ready': hasPositionedIndicator.value,
  },
])

const resolvedSmoothScroll = computed(() =>
  resolveComponentSmoothScroll(
    props.smoothScroll,
    compactSmoothScrollOptions,
    {
      keyboard: false,
      smoothTouchpad: false,
      respectReducedMotion: true,
    },
  ),
)

function isBrowser() {
  return typeof window !== 'undefined'
}

function shouldReduceMotion() {
  return (
    !props.animated ||
    (
      props.respectReducedMotion &&
      prefersReducedMotion()
    )
  )
}

function getBorderWidth(element: HTMLElement, side: 'left' | 'top') {
  const property = side === 'left' ? 'borderLeftWidth' : 'borderTopWidth'
  const parsedWidth = Number.parseFloat(window.getComputedStyle(element)[property])

  return Number.isFinite(parsedWidth)
    ? parsedWidth
    : (side === 'left' ? element.clientLeft : element.clientTop)
}

/**
 * 外层容器带 transform: scale 时，getBoundingClientRect 返回的是缩放后的视口尺寸，
 * 而写回指示器的是缩放前的布局尺寸。这里求出两者的比例，供测量值换算回布局坐标。
 */
function isItemDisabled(item: BingTabItem) {
  return props.disabled || Boolean(item.disabled)
}

function setTabRef(element: unknown, index: number) {
  if (element instanceof HTMLButtonElement) {
    tabRefs.value[index] = element
  }
}

function getTabSurfaceElement(tab: HTMLButtonElement) {
  return tab.querySelector<HTMLElement>('.bing-tabs__tab-surface') ?? tab
}

function getTabIndex(index: number) {
  if (isItemDisabled(props.items[index])) {
    return -1
  }

  if (focusedIndex.value >= 0) {
    return focusedIndex.value === index ? 0 : -1
  }

  return activeIndex.value === index ? 0 : -1
}

function getEnabledIndex(startIndex: number, direction: 1 | -1) {
  const itemCount = props.items.length

  if (itemCount === 0) {
    return -1
  }

  let nextIndex = startIndex

  for (let step = 0; step < itemCount; step += 1) {
    nextIndex += direction

    if (props.loop) {
      nextIndex = (nextIndex + itemCount) % itemCount
    } else if (nextIndex < 0 || nextIndex >= itemCount) {
      return -1
    }

    const item = props.items[nextIndex]

    if (item && !isItemDisabled(item)) {
      return nextIndex
    }
  }

  return -1
}

function getEdgeEnabledIndex(edge: 'first' | 'last') {
  const source = edge === 'first'
    ? props.items
    : [...props.items].reverse()
  const foundIndex = source.findIndex((item) => !isItemDisabled(item))

  if (foundIndex < 0) {
    return -1
  }

  return edge === 'first' ? foundIndex : props.items.length - 1 - foundIndex
}

function getItemByValue(value: BingTabValue | undefined) {
  return props.items.find((item) => Object.is(item.value, value))
}

function hasFocusInside() {
  return isBrowser() && Boolean(rootRef.value?.contains(document.activeElement))
}

function syncFocusToActive(moveDomFocus = false) {
  if (props.activation !== 'auto' || activeIndex.value < 0) {
    return
  }

  const item = props.items[activeIndex.value]

  if (!item || isItemDisabled(item)) {
    return
  }

  focusedIndex.value = activeIndex.value

  if (moveDomFocus && hasFocusInside()) {
    focusTab(activeIndex.value)
  }
}

function selectItem(item: BingTabItem, event: MouseEvent | KeyboardEvent) {
  if (isItemDisabled(item)) {
    event.preventDefault()
    return
  }

  playClickFeedback(event, tabRefs.value[props.items.indexOf(item)])
  const previousValue = activeValue.value

  if (Object.is(previousValue, item.value)) {
    return
  }

  if (!isControlled.value) {
    internalValue.value = item.value
  }

  const payload: BingTabsChangePayload = {
    value: item.value,
    previousValue,
    item,
    previousItem: getItemByValue(previousValue),
    event,
  }

  emit('update:modelValue', item.value)
  emit('change', payload)
}

function handleClick(item: BingTabItem, index: number, event: MouseEvent) {
  if (event.defaultPrevented) return
  focusedIndex.value = index
  selectItem(item, event)
}

function focusTab(index: number) {
  const tab = tabRefs.value[index]

  if (!tab) {
    return
  }

  scrollbarRef.value?.stop()
  focusedIndex.value = index
  tab.focus()
}

function moveFocus(index: number, event: KeyboardEvent) {
  const item = props.items[index]

  if (!item || isItemDisabled(item)) {
    return
  }

  event.preventDefault()
  focusTab(index)

  if (props.activation === 'auto') {
    selectItem(item, event)

    void nextTick().then(() => {
      if (!Object.is(activeValue.value, item.value)) {
        syncFocusToActive(true)
      }
    })
  }
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    moveFocus(getEnabledIndex(index, 1), event)
    return
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    moveFocus(getEnabledIndex(index, -1), event)
    return
  }

  if (event.key === 'Home') {
    moveFocus(getEdgeEnabledIndex('first'), event)
    return
  }

  if (event.key === 'End') {
    moveFocus(getEdgeEnabledIndex('last'), event)
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    const item = props.items[index]

    if (!item) {
      return
    }

    event.preventDefault()
    selectItem(item, event)
  }
}

function handleFocus(item: BingTabItem, index: number, event: FocusEvent) {
  scrollbarRef.value?.stop()
  focusedIndex.value = index

  const payload: BingTabsFocusPayload = {
    value: item.value,
    item,
    event,
  }

  emit('focus', payload)
}

function handleBlur(item: BingTabItem, event: FocusEvent) {
  if (!rootRef.value?.contains(event.relatedTarget as Node | null)) {
    focusedIndex.value = -1
  }

  const payload: BingTabsFocusPayload = {
    value: item.value,
    item,
    event,
  }

  emit('blur', payload)
}

function handleWheel(event: WheelEvent) {
  const consumed = resolvedSmoothScroll.value !== false && (scrollbarRef.value?.handleWheel(event) ?? false)

  if (consumed || event.defaultPrevented || !rootRef.value) {
    return
  }

  const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0)
  const maximum = Math.max(0, rootRef.value.scrollWidth - rootRef.value.clientWidth)
  const canScroll =
    maximum > 0.5 &&
    (delta < 0 ? rootRef.value.scrollLeft > 0.5 : delta > 0 && rootRef.value.scrollLeft < maximum - 0.5)

  if (canScroll) {
    // Keep native touchpad/reduced-motion scrolling inside Tabs without letting a
    // parent carousel interpret the same wheel event as a navigation gesture.
    event.stopPropagation()
  }
}

function requestIndicatorUpdate(animate = true) {
  if (!isBrowser()) {
    return
  }

  if (indicatorFrame) {
    window.cancelAnimationFrame(indicatorFrame)
  }

  indicatorFrame = window.requestAnimationFrame(() => {
    indicatorFrame = 0
    moveIndicator(animate)
  })
}

function moveIndicator(animate = true) {
  const root = rootRef.value
  const indicator = indicatorRef.value
  const tab = tabRefs.value[activeIndex.value]

  if (!root || !indicator || !tab || activeIndex.value < 0) {
    if (indicator) {
      gsap.set(indicator, { autoAlpha: 0 })
    }

    hasPositionedIndicator.value = false
    return
  }

  const rootRect = root.getBoundingClientRect()
  const tabRect = getTabSurfaceElement(tab).getBoundingClientRect()
  const indicatorRect = indicator.getBoundingClientRect()
  const rootBorderLeft = getBorderWidth(root, 'left')
  const rootBorderTop = getBorderWidth(root, 'top')
  const scale = getLayoutScale(root, rootRect)
  const nextWidth = Math.max(1, tabRect.width / scale.x)
  const nextHeight = Math.max(1, tabRect.height / scale.y)
  // Convert viewport rectangles into the scrollable content coordinate space.
  const nextX = (tabRect.left - rootRect.left) / scale.x - rootBorderLeft + root.scrollLeft
  const nextY = (tabRect.top - rootRect.top) / scale.y - rootBorderTop
  const hasCurrentRect = hasPositionedIndicator.value && indicatorRect.width > 0 && indicatorRect.height > 0
  const previousX = hasCurrentRect ? (indicatorRect.left - rootRect.left) / scale.x - rootBorderLeft + root.scrollLeft : nextX
  const previousY = hasCurrentRect ? (indicatorRect.top - rootRect.top) / scale.y - rootBorderTop : nextY
  const previousScaleX = hasCurrentRect ? indicatorRect.width / scale.x / nextWidth : 1
  const previousScaleY = hasCurrentRect ? indicatorRect.height / scale.y / nextHeight : 1
  const shouldAnimate = animate && hasCurrentRect && !shouldReduceMotion()

  indicatorTween?.kill()
  gsap.set(indicator, {
    width: nextWidth,
    height: nextHeight,
    transformOrigin: '0 0',
    willChange: 'transform, opacity',
  })

  if (!shouldAnimate) {
    gsap.set(indicator, {
      x: nextX,
      y: nextY,
      scaleX: 1,
      scaleY: 1,
      autoAlpha: 1,
      force3D: true,
    })
  } else {
    indicatorTween = gsap.fromTo(
      indicator,
      {
        x: previousX,
        y: previousY,
        scaleX: previousScaleX,
        scaleY: previousScaleY,
        autoAlpha: 1,
      },
      {
        x: nextX,
        y: nextY,
        scaleX: 1,
        scaleY: 1,
        autoAlpha: 1,
        duration: 0.42,
        ease: 'power3.out',
        overwrite: 'auto',
        force3D: true,
        onComplete: () => {
          indicatorTween = undefined
        },
      },
    )
  }

  hasPositionedIndicator.value = true
}

onBeforeUpdate(() => {
  tabRefs.value = []
})

onMounted(() => {
  void nextTick().then(() => {
    moveIndicator(false)
  })

  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    resizeObserver = new ResizeObserver(() => {
      requestIndicatorUpdate(false)
    })
    resizeObserver.observe(rootRef.value)
  }
})

onBeforeUnmount(() => {
  indicatorTween?.kill()
  scrollbarRef.value?.stop()

  if (indicatorFrame && isBrowser()) {
    window.cancelAnimationFrame(indicatorFrame)
  }

  resizeObserver?.disconnect()
})

watch(
  () => props.smoothScroll,
  () => scrollbarRef.value?.stop(),
  { deep: true },
)

watch(
  () => [
    activeValue.value,
    props.items.length,
    resolvedSize.value,
    props.variant,
    props.block,
  ],
  () => {
    void nextTick().then(() => {
      moveIndicator(true)
    })
  },
)

watch(
  activeIndex,
  () => {
    if (focusedIndex.value < 0 || !hasFocusInside()) {
      return
    }

    void nextTick().then(() => {
      syncFocusToActive(true)
    })
  },
)
</script>

<template>
  <BingScrollbar
    ref="scrollbarRef"
    class="bing-tabs__scroll"
    :class="{ 'is-block': block }"
    :vertical="false"
    horizontal
    :focusable="false"
    :smooth="resolvedSmoothScroll"
  >
    <template #viewport="{ viewportRef, viewportAttrs }">
      <div
        v-bind="mergeProps($attrs, { ...viewportAttrs, onWheel: handleWheel })"
        :ref="element => { rootRef = element as HTMLElement | null; viewportRef(element) }"
        :class="rootClasses"
        role="tablist"
        aria-orientation="horizontal"
        :aria-label="ariaLabel"
      >
        <span ref="indicatorRef" class="bing-tabs__indicator" aria-hidden="true"></span>

        <button
          v-for="(item, index) in items"
          :key="String(item.value)"
          :ref="(element) => setTabRef(element, index)"
          class="bing-tabs__tab"
          :class="{
            'is-active': Object.is(item.value, activeValue),
            'is-disabled': isItemDisabled(item),
          }"
          type="button"
          role="tab"
          :aria-selected="Object.is(item.value, activeValue)"
          :aria-disabled="isItemDisabled(item) || undefined"
          :aria-label="item.ariaLabel"
          :disabled="isItemDisabled(item)"
          :tabindex="getTabIndex(index)"
          @click="handleClick(item, index, $event)"
          @keydown="handleKeydown(index, $event)"
          @focus="handleFocus(item, index, $event)"
          @blur="handleBlur(item, $event)"
        >
          <span class="bing-tabs__tab-surface">
            <span class="bing-tabs__tab-content">
              <slot
                name="item"
                :item="item"
                :active="Object.is(item.value, activeValue)"
                :disabled="isItemDisabled(item)"
              >
                {{ item.label }}
              </slot>
            </span>
          </span>
        </button>
      </div>
    </template>
  </BingScrollbar>
</template>

<style scoped>
.bing-tabs__scroll {
  --bing-scrollbar-horizontal-bottom: 0px;
  display: inline-grid;
  grid-template-columns: minmax(0, 1fr);
  width: max-content;
  max-width: 100%;
  vertical-align: middle;
  /* 对称保留轨道空间，让可见标签与外层容器共用垂直中心。 */
  padding-block: 4px;
}

.bing-tabs__scroll.is-block {
  display: grid;
  width: 100%;
}

.bing-tabs {
  --tabs-padding: 3px;
  --tabs-gap: 4px;
  --tabs-hit-inset: 2px;
  --tabs-min-height: 28px;
  --tabs-tab-padding: 0 12px;
  --tabs-font-size: 14px;
  --tabs-radius: 6px;
  --tabs-bg: var(--bing-surface-muted);
  --tabs-border: transparent;
  --tabs-color: var(--bing-muted);
  --tabs-hover-color: var(--bing-heading);
  --tabs-active-color: var(--bing-heading);
  --tabs-indicator-bg: var(--bing-surface-solid);
  --tabs-indicator-border: var(--bing-border);
  --tabs-indicator-shadow: var(--bing-shadow-sm);

  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  align-items: center;
  width: max-content;
  min-width: 0;
  max-width: 100%;
  gap: 0;
  padding-block: var(--tabs-padding);
  padding-inline: calc(var(--tabs-padding) - var(--tabs-hit-inset));
  overflow-x: auto;
  border: 1px solid var(--tabs-border);
  border-radius: var(--tabs-radius);
  background: var(--tabs-bg);
  isolation: isolate;
}

.bing-tabs.is-block {
  display: flex;
  width: 100%;
}

.bing-tabs.is-disabled {
  --tabs-bg: var(--bing-control-disabled-bg);
  --tabs-border: var(--bing-control-disabled-border);
  --tabs-color: var(--bing-disabled-text);
  --tabs-hover-color: var(--bing-disabled-text);
  --tabs-active-color: var(--bing-disabled-text);
  --tabs-indicator-bg: var(--bing-surface-muted);
  --tabs-indicator-border: var(--bing-control-disabled-border);
  --tabs-indicator-shadow: none;
  cursor: not-allowed;
}

.bing-tabs--sm {
  --tabs-min-height: 24px;
  --tabs-tab-padding: 0 10px;
  --tabs-font-size: 13px;
}

.bing-tabs--md {
  --tabs-min-height: 28px;
  --tabs-tab-padding: 0 12px;
  --tabs-font-size: 14px;
}

.bing-tabs--lg {
  --tabs-min-height: 32px;
  --tabs-tab-padding: 0 14px;
  --tabs-font-size: 14px;
}

.bing-tabs--pill {
  --tabs-radius: 999px;
}

.bing-tabs--glass {
  --tabs-bg: rgb(var(--bing-surface-rgb) / var(--bing-glass-opacity));
  --tabs-border: var(--bing-popover-border);
  backdrop-filter: blur(var(--bing-glass-blur)) saturate(var(--bing-glass-saturation));
  -webkit-backdrop-filter: blur(var(--bing-glass-blur)) saturate(var(--bing-glass-saturation));
}

.bing-tabs--soft {
  --tabs-bg: var(--bing-surface-muted);
  --tabs-indicator-border: transparent;
}

.bing-tabs__indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  box-sizing: border-box;
  border: 1px solid var(--tabs-indicator-border);
  border-radius: max(4px, calc(var(--tabs-radius) - var(--tabs-padding)));
  background: var(--tabs-indicator-bg);
  box-shadow: var(--tabs-indicator-shadow);
  content: '';
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

.bing-tabs__indicator::after {
  content: none;
}

.bing-tabs__tab {
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: var(--tabs-min-height);
  min-width: calc(48px + var(--tabs-gap));
  padding: 0 var(--tabs-hit-inset);
  border: 0;
  background: transparent;
  color: var(--tabs-color);
  cursor: pointer;
  font-size: var(--tabs-font-size);
  font-weight: 400;
  line-height: 20px;
  text-align: center;
  white-space: nowrap;
  transition:
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    filter var(--bing-duration-fast) var(--bing-ease-smooth),
    opacity var(--bing-duration-fast) var(--bing-ease-smooth);
  user-select: none;
}

.bing-tabs.is-block .bing-tabs__tab {
  flex: 1 0 calc(48px + var(--tabs-gap));
  min-width: max-content;
}

.bing-tabs__tab-surface {
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  min-height: var(--tabs-min-height);
  padding: var(--tabs-tab-padding);
  border-radius: max(4px, calc(var(--tabs-radius) - var(--tabs-padding)));
  color: inherit;
}

.bing-tabs__tab-surface::before {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 2px solid var(--bing-focus);
  border-radius: inherit;
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms var(--bing-ease-smooth);
}

.bing-tabs__tab:hover:not(:disabled) {
  color: var(--tabs-hover-color);
}

.bing-tabs__tab.is-active {
  color: var(--tabs-active-color);
  cursor: default;
}

.bing-tabs__tab.is-active:hover:not(:disabled) {
  color: var(--tabs-active-color);
}

.bing-tabs__tab:disabled {
  cursor: not-allowed;
  color: var(--bing-disabled-text);
}

.bing-tabs:not(.is-disabled) .bing-tabs__tab:disabled > .bing-tabs__tab-surface {
  background: transparent;
}

.bing-tabs__tab:focus-visible {
  outline: none;
}

.bing-tabs__tab:focus-visible > .bing-tabs__tab-surface::before {
  opacity: 1;
}

.bing-tabs__tab-content {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: 0.42em;
}

@media (prefers-reduced-motion: reduce) {
  .bing-tabs,
  .bing-tabs__tab,
  .bing-tabs__tab-surface::before {
    transition: none;
  }
}
</style>
