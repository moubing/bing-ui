<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useReducedMotion } from '../../motion/reducedMotion'
import BingTabs from '../BingTabs/BingTabs.vue'
import type { BingTabItem, BingTabValue } from '../BingTabs'
import type {
  BingAppSwitcherTransitionEmits,
  BingAppSwitcherTransitionProps,
  BingAppSwitcherTransitionSlotProps,
} from './BingAppSwitcherTransition.types'

defineSlots<{
  default?: (props: BingAppSwitcherTransitionSlotProps) => unknown
}>()

const prefersReducedMotion = useReducedMotion()
const props = withDefaults(defineProps<BingAppSwitcherTransitionProps>(), {
  modelValue: undefined,
  items: () => [],
  disabled: false,
  respectReducedMotion: true,
  loop: true,
  showTabs: true,
  ariaLabel: '应用切换面板',
})

const emit = defineEmits<BingAppSwitcherTransitionEmits>()

const cardRefs = ref<HTMLElement[]>([])
const stageRef = ref<HTMLElement | null>(null)
const isAnimating = ref(false)
const internalValue = ref<BingTabValue | undefined>(undefined)

let activeTimeline: gsap.core.Timeline | undefined
let wheelOffset = 0
let wheelTimer: number | undefined
let pendingModelValue: BingTabValue | undefined

const enabledItems = computed(() => props.items.filter((item) => !item.disabled))
const firstEnabledItem = computed(() => enabledItems.value[0])
const isControlled = computed(() => props.modelValue !== undefined)
const activeValue = computed(() =>
  isControlled.value
    ? props.modelValue
    : (internalValue.value ?? firstEnabledItem.value?.value),
)
const activeIndex = computed(() => {
  const index = props.items.findIndex((item) => Object.is(item.value, activeValue.value))
  return index >= 0 ? index : 0
})
const tabItems = computed<BingTabItem[]>(() =>
  props.items.map((item) => ({
    ...item,
    value: item.value,
    label: item.label,
    disabled: props.disabled || item.disabled,
  })),
)

function isBrowser() {
  return typeof window !== 'undefined'
}

function shouldReduceMotion() {
  return props.disabled || (props.respectReducedMotion && prefersReducedMotion())
}

function normalizeIndex(index: number) {
  const itemCount = props.items.length

  if (itemCount === 0) {
    return 0
  }

  if (props.loop) {
    return (index + itemCount) % itemCount
  }

  return Math.min(Math.max(index, 0), itemCount - 1)
}

function getShortestOffset(index: number, centerIndex: number) {
  let offset = index - centerIndex
  const itemCount = props.items.length

  if (itemCount === 0) {
    return 0
  }

  if (offset > itemCount / 2) {
    offset -= itemCount
  }

  if (offset < itemCount / -2) {
    offset += itemCount
  }

  return offset
}

function getOverviewState(index: number, centerIndex: number, highlightIndex = centerIndex) {
  const offset = getShortestOffset(index, centerIndex)
  const distance = Math.abs(offset)
  const isHighlighted = index === highlightIndex

  return {
    xPercent: offset * 58,
    y: 30 + distance * 3,
    scale: isHighlighted ? 0.68 : 0.6,
    rotation: offset * -1.4,
    opacity: isHighlighted ? 0.98 : Math.max(0.46, 0.66 - distance * 0.1),
    zIndex: isHighlighted ? 18 : 10 - distance,
    force3D: true,
  }
}

function getFocusedState(index: number, centerIndex: number) {
  const offset = getShortestOffset(index, centerIndex)
  const distance = Math.abs(offset)

  return {
    xPercent: offset * 116,
    y: distance === 0 ? 0 : 22,
    scale: distance === 0 ? 1 : 0.78,
    rotation: offset * -1.4,
    opacity: distance === 0 ? 1 : 0,
    zIndex: distance === 0 ? 24 : 5 - distance,
    force3D: true,
  }
}

function setCardRef(element: unknown, index: number) {
  if (element instanceof HTMLElement) {
    cardRefs.value[index] = element
  }
}

function commitValue(nextIndex: number) {
  const nextItem = props.items[nextIndex]

  if (!nextItem || props.disabled || nextItem.disabled || Object.is(nextItem.value, activeValue.value)) {
    return false
  }

  const previousValue = activeValue.value
  const previousItem = props.items.find((item) => Object.is(item.value, previousValue))
  pendingModelValue = nextItem.value

  if (!isControlled.value) {
    internalValue.value = nextItem.value
  }

  emit('update:modelValue', nextItem.value)
  emit('change', {
    value: nextItem.value,
    previousValue,
    item: nextItem,
    previousItem,
  })

  return true
}

function layoutCards(centerIndex = activeIndex.value, immediate = false) {
  const duration = immediate || shouldReduceMotion() ? 0 : 0.32

  activeTimeline?.kill()
  activeTimeline = gsap.timeline({
    defaults: {
      duration,
      ease: 'power3.out',
      overwrite: 'auto',
    },
    onStart: () => {
      isAnimating.value = true
    },
    onComplete: () => {
      isAnimating.value = false
      activeTimeline = undefined
    },
    onInterrupt: () => {
      isAnimating.value = false
    },
  })

  cardRefs.value.forEach((card, index) => {
    activeTimeline?.to(card, getFocusedState(index, centerIndex), 0)
  })
}

function animateToIndex(nextIndex: number, currentIndex: number) {
  const travelDirection = getShortestOffset(nextIndex, currentIndex) >= 0 ? 1 : -1

  if (shouldReduceMotion()) {
    layoutCards(nextIndex, true)
    return
  }

  activeTimeline?.kill()
  isAnimating.value = true

  activeTimeline = gsap.timeline({
    defaults: {
      overwrite: 'auto',
    },
    onComplete: () => {
      isAnimating.value = false
      activeTimeline = undefined
    },
    onInterrupt: () => {
      isAnimating.value = false
    },
  })

  if (stageRef.value) {
    activeTimeline
      .to(stageRef.value, {
        x: travelDirection * -10,
        scale: 0.996,
        duration: 0.16,
        ease: 'power2.out',
        force3D: true,
      }, 0)
      .to(stageRef.value, {
        x: 0,
        scale: 1,
        duration: 0.5,
        ease: 'expo.out',
        force3D: true,
      }, 0.18)
  }

  cardRefs.value.forEach((card, cardIndex) => {
    activeTimeline?.to(card, {
      ...getOverviewState(cardIndex, currentIndex, currentIndex),
      duration: 0.2,
      ease: 'power3.out',
    }, 0)
  })

  cardRefs.value.forEach((card, cardIndex) => {
    activeTimeline?.to(card, {
      ...getOverviewState(cardIndex, nextIndex, nextIndex),
      duration: 0.34,
      ease: 'power3.inOut',
    }, 0.1)
  })

  cardRefs.value.forEach((card, cardIndex) => {
    const focusedState = getFocusedState(cardIndex, nextIndex)
    const isNext = cardIndex === nextIndex

    activeTimeline?.to(card, {
      ...focusedState,
      duration: isNext ? 0.48 : 0.32,
      ease: isNext ? 'expo.out' : 'power3.out',
    }, isNext ? 0.3 : 0.34)
  })
}

function selectIndex(index: number) {
  const nextIndex = normalizeIndex(index)
  const currentIndex = activeIndex.value

  if (nextIndex === activeIndex.value || isAnimating.value || !commitValue(nextIndex)) {
    return
  }

  animateToIndex(nextIndex, currentIndex)
}

function handleTabsUpdate(value: BingTabValue) {
  selectIndex(props.items.findIndex((item) => Object.is(item.value, value)))
}

function handleWheel(event: WheelEvent) {
  if (
    event.defaultPrevented ||
    props.disabled ||
    Math.abs(event.deltaX) <= Math.abs(event.deltaY)
  ) {
    return
  }

  event.preventDefault()

  if (isAnimating.value || !isBrowser()) {
    return
  }

  wheelOffset += event.deltaX

  if (wheelTimer) {
    window.clearTimeout(wheelTimer)
  }

  wheelTimer = window.setTimeout(() => {
    const direction = wheelOffset > 0 ? 1 : -1
    const shouldMove = Math.abs(wheelOffset) > 34

    wheelOffset = 0
    wheelTimer = undefined

    if (shouldMove) {
      selectIndex(activeIndex.value + direction)
    }
  }, 58)
}

onBeforeUpdate(() => {
  cardRefs.value = []
})

onMounted(() => {
  void nextTick().then(() => {
    cardRefs.value.forEach((card) => {
      gsap.set(card, {
        transformOrigin: '50% 50%',
        willChange: 'transform, opacity',
        force3D: true,
      })
    })

    layoutCards(activeIndex.value, true)
  })
})

onBeforeUnmount(() => {
  activeTimeline?.kill()
  gsap.killTweensOf(cardRefs.value)

  if (stageRef.value) {
    gsap.killTweensOf(stageRef.value)
  }

  if (wheelTimer && isBrowser()) {
    window.clearTimeout(wheelTimer)
  }
})

watch(activeValue, (value, previousValue) => {
  if (value === undefined) {
    return
  }

  if (Object.is(value, pendingModelValue)) {
    pendingModelValue = undefined
    return
  }

  const index = props.items.findIndex((item) => Object.is(item.value, value))

  if (index < 0) {
    return
  }

  const previousIndex = props.items.findIndex((item) => Object.is(item.value, previousValue))

  void nextTick().then(() => {
    if (previousIndex < 0) {
      layoutCards(index, true)
      return
    }

    animateToIndex(index, previousIndex)
  })
})
</script>

<template>
  <section
    class="bing-app-switcher-transition"
    :class="{ 'is-disabled': disabled }"
    @wheel="handleWheel"
  >
    <div ref="stageRef" class="bing-app-switcher-transition__stage">
      <article
        v-for="(item, index) in items"
        :key="String(item.value)"
        :ref="(element) => setCardRef(element, index)"
        class="bing-app-switcher-transition__card"
        :class="{ 'is-active': Object.is(activeValue, item.value) }"
        :aria-hidden="!Object.is(activeValue, item.value)"
      >
        <slot
          :item="item"
          :index="index"
          :active="Object.is(activeValue, item.value)"
          :is-animating="isAnimating"
        >
          {{ item.label }}
        </slot>
      </article>
    </div>

    <BingTabs
      v-if="showTabs"
      :items="tabItems"
      :model-value="activeValue"
      variant="glass"
      size="md"
      block
      :disabled="disabled"
      :loop="loop"
      :respect-reduced-motion="respectReducedMotion"
      :aria-label="ariaLabel"
      @update:model-value="handleTabsUpdate"
    />
  </section>
</template>

<style scoped>
.bing-app-switcher-transition {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: min(920px, calc(100vw - 48px));
  max-width: 100%;
  min-width: 0;
  gap: 12px;
  justify-items: stretch;
  padding: 16px clamp(12px, 6vw, 64px) 20px;
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  overflow: hidden;
  background: transparent;
  contain: paint;
}

.bing-app-switcher-transition.is-disabled {
  cursor: not-allowed;
}

.bing-app-switcher-transition__stage {
  position: relative;
  min-width: 0;
  min-height: 320px;
  overflow: visible;
  border-radius: var(--bing-radius-card);
  /* 卡片只做平面内的位移、缩放和旋转，这里不设 perspective：它不改变画面，却会让浏览器把卡片按近似精度栅格化，文字发虚。 */
  touch-action: pan-y;
  transform-style: preserve-3d;
  will-change: transform;
}

.bing-app-switcher-transition__card {
  position: absolute;
  inset: 0;
  display: grid;
  box-sizing: border-box;
  padding: 16px;
  overflow: hidden;
  border: 1px solid var(--bing-border-strong);
  border-radius: var(--bing-radius-card);
  background: var(--bing-surface-solid);
  box-shadow: var(--bing-shadow-sm);
  transform-style: preserve-3d;
  will-change: transform, opacity;
}
</style>
