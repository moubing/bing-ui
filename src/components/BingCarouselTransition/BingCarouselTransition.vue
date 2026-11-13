<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useReducedMotion } from '../../motion/reducedMotion'
import BingTabs from '../BingTabs/BingTabs.vue'
import type { BingTabItem, BingTabValue } from '../BingTabs'
import type {
  BingCarouselTransitionEmits,
  BingCarouselTransitionProps,
  BingCarouselTransitionSlotProps,
} from './BingCarouselTransition.types'

defineSlots<{
  default?: (props: BingCarouselTransitionSlotProps) => unknown
}>()

const prefersReducedMotion = useReducedMotion()
const props = withDefaults(defineProps<BingCarouselTransitionProps>(), {
  modelValue: undefined,
  items: () => [],
  disabled: false,
  respectReducedMotion: true,
  loop: true,
  showTabs: true,
  ariaLabel: '轮播切换面板',
})

const emit = defineEmits<BingCarouselTransitionEmits>()

const trackRef = ref<HTMLDivElement | null>(null)
const isAnimating = ref(false)
const internalValue = ref<BingTabValue | undefined>(undefined)

let activeTween: gsap.core.Tween | undefined
let wheelOffset = 0
let releaseTimer: number | undefined
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeIndex(index: number) {
  const itemCount = props.items.length

  if (itemCount === 0) {
    return 0
  }

  if (props.loop) {
    return (index + itemCount) % itemCount
  }

  return clamp(index, 0, itemCount - 1)
}

function setTrackPosition(index: number) {
  if (!trackRef.value) {
    return
  }

  gsap.set(trackRef.value, {
    xPercent: normalizeIndex(index) * -100,
    force3D: true,
  })
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

function animateToIndex(index: number, duration = 0.52) {
  const nextIndex = normalizeIndex(index)
  activeTween?.kill()

  if (!trackRef.value || shouldReduceMotion()) {
    setTrackPosition(nextIndex)
    isAnimating.value = false
    return
  }

  isAnimating.value = true
  activeTween = gsap.to(trackRef.value, {
    xPercent: nextIndex * -100,
    duration,
    ease: 'power3.out',
    overwrite: 'auto',
    force3D: true,
    onComplete: () => {
      isAnimating.value = false
      activeTween = undefined
    },
    onInterrupt: () => {
      isAnimating.value = false
    },
  })
}

function selectIndex(index: number) {
  const nextIndex = normalizeIndex(index)

  if (nextIndex === activeIndex.value || !commitValue(nextIndex)) {
    return
  }

  animateToIndex(nextIndex)
}

function previewWheelOffset() {
  if (!trackRef.value || shouldReduceMotion()) {
    return
  }

  const previewOffset = clamp(wheelOffset / 7, -32, 32)

  gsap.to(trackRef.value, {
    xPercent: activeIndex.value * -100 - previewOffset,
    duration: 0.16,
    ease: 'power2.out',
    overwrite: 'auto',
    force3D: true,
  })
}

function settleWheelOffset() {
  const direction = wheelOffset > 0 ? 1 : -1
  const shouldMove = Math.abs(wheelOffset) > 42
  const nextIndex = shouldMove ? activeIndex.value + direction : activeIndex.value

  wheelOffset = 0

  if (shouldMove) {
    const normalizedIndex = normalizeIndex(nextIndex)
    commitValue(normalizedIndex)
    animateToIndex(normalizedIndex, 0.5)
  } else {
    animateToIndex(activeIndex.value, 0.32)
  }
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
  previewWheelOffset()

  if (releaseTimer) {
    window.clearTimeout(releaseTimer)
  }

  releaseTimer = window.setTimeout(() => {
    releaseTimer = undefined
    settleWheelOffset()
  }, 72)
}

function handleTabsUpdate(value: BingTabValue) {
  selectIndex(props.items.findIndex((item) => Object.is(item.value, value)))
}

onMounted(() => {
  void nextTick().then(() => {
    setTrackPosition(activeIndex.value)
  })
})

onBeforeUnmount(() => {
  activeTween?.kill()

  if (trackRef.value) {
    gsap.killTweensOf(trackRef.value)
  }

  if (releaseTimer && isBrowser()) {
    window.clearTimeout(releaseTimer)
  }
})

watch(activeValue, (value) => {
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

  void nextTick().then(() => {
    animateToIndex(index, 0.32)
  })
})
</script>

<template>
  <section
    class="bing-carousel-transition"
    :class="{ 'is-disabled': disabled }"
    @wheel="handleWheel"
  >
    <BingTabs
      v-if="showTabs"
      :items="tabItems"
      :model-value="activeValue"
      variant="glass"
      size="md"
      :disabled="disabled"
      :loop="loop"
      :respect-reduced-motion="respectReducedMotion"
      :aria-label="ariaLabel"
      @update:model-value="handleTabsUpdate"
    />

    <div class="bing-carousel-transition__viewport">
      <div ref="trackRef" class="bing-carousel-transition__track">
        <article
          v-for="(item, index) in items"
          :key="String(item.value)"
          class="bing-carousel-transition__panel"
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
    </div>
  </section>
</template>

<style scoped>
.bing-carousel-transition {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  box-sizing: border-box;
  width: min(720px, calc(100vw - 48px));
  max-width: 100%;
  min-width: 0;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--bing-border);
  border-radius: var(--bing-radius-card);
  background: var(--bing-surface-solid);
  box-shadow: var(--bing-shadow-xs);
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.bing-carousel-transition.is-disabled {
  cursor: not-allowed;
}

.bing-carousel-transition__viewport {
  min-width: 0;
  overflow: hidden;
  border-radius: var(--bing-radius-md);
  contain: paint;
  touch-action: pan-y;
}

.bing-carousel-transition__track {
  display: flex;
  width: 100%;
  will-change: transform;
}

.bing-carousel-transition__panel {
  box-sizing: border-box;
  flex: 0 0 100%;
  min-width: 0;
  min-height: 176px;
}
</style>
