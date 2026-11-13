<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { useReducedMotion } from '../../motion/reducedMotion'
import BingButton from '../BingButton/BingButton.vue'
import type { BingTabValue } from '../BingTabs'
import type {
  BingDeckTransitionControlsSlotProps,
  BingDeckTransitionEmits,
  BingDeckTransitionProps,
  BingDeckTransitionSlotProps,
} from './BingDeckTransition.types'

defineSlots<{
  default?: (props: BingDeckTransitionSlotProps) => unknown
  controls?: (props: BingDeckTransitionControlsSlotProps) => unknown
}>()

const prefersReducedMotion = useReducedMotion()
const props = withDefaults(defineProps<BingDeckTransitionProps>(), {
  modelValue: undefined,
  items: () => [],
  disabled: false,
  respectReducedMotion: true,
  loop: true,
  showControls: true,
  controlLabel: '切换下一张',
})

const emit = defineEmits<BingDeckTransitionEmits>()

const cardRefs = ref<HTMLElement[]>([])
const isAnimating = ref(false)
const internalValue = ref<BingTabValue | undefined>(undefined)

let activeTimeline: gsap.core.Timeline | undefined
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
const activeItem = computed(() => props.items[activeIndex.value])

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

function getDeckOffset(index: number, centerIndex = activeIndex.value) {
  return normalizeIndex(index - centerIndex)
}

function getDeckState(index: number, centerIndex = activeIndex.value) {
  const offset = getDeckOffset(index, centerIndex)

  return {
    x: 0,
    // 堆叠间距随卡宽变化，窄屏仍保留完整的卡片层次。
    xPercent: offset * 7,
    y: offset * 36,
    rotation: offset === 0 ? 0 : offset * 9 - 5,
    scale: 1 - offset * 0.09,
    opacity: 1 - offset * 0.16,
    zIndex: 10 - offset,
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

function layoutDeck(centerIndex = activeIndex.value, immediate = false) {
  const duration = immediate || shouldReduceMotion() ? 0 : 0.58
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
    activeTimeline?.to(card, getDeckState(index, centerIndex), 0)
  })
}

function next() {
  if (props.disabled || isAnimating.value || props.items.length === 0) {
    return
  }

  const outgoingIndex = activeIndex.value
  const nextIndex = normalizeIndex(activeIndex.value + 1)

  if (!commitValue(nextIndex)) {
    return
  }

  if (shouldReduceMotion()) {
    layoutDeck(nextIndex, true)
    return
  }

  activeTimeline?.kill()
  activeTimeline = gsap.timeline({
    defaults: {
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

  const outgoingCard = cardRefs.value[outgoingIndex]

  if (outgoingCard) {
    activeTimeline.to(outgoingCard, {
      x: -260,
      y: 82,
      rotation: -24,
      scale: 0.82,
      opacity: 0.18,
      duration: 0.24,
      ease: 'power2.in',
      force3D: true,
    }, 0)
  }

  cardRefs.value.forEach((card, index) => {
    activeTimeline?.to(card, {
      ...getDeckState(index, nextIndex),
      duration: 0.46,
      ease: 'power3.out',
    }, 0.24)
  })
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

  if (Math.abs(event.deltaX) > 24) {
    next()
  }
}

onBeforeUpdate(() => {
  cardRefs.value = []
})

onMounted(() => {
  void nextTick().then(() => {
    layoutDeck(activeIndex.value, true)
  })
})

onBeforeUnmount(() => {
  activeTimeline?.kill()
  gsap.killTweensOf(cardRefs.value)
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
    layoutDeck(index, true)
  })
})
</script>

<template>
  <section
    class="bing-deck-transition"
    :class="{ 'is-disabled': disabled }"
    @wheel="handleWheel"
  >
    <div class="bing-deck-transition__stage">
      <article
        v-for="(item, index) in items"
        :key="String(item.value)"
        :ref="(element) => setCardRef(element, index)"
        class="bing-deck-transition__card"
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

    <slot
      v-if="showControls"
      name="controls"
      :next="next"
      :active-item="activeItem"
      :active-index="activeIndex"
      :is-animating="isAnimating"
    >
      <BingButton
        class="bing-deck-transition__button"
        variant="primary"
        size="sm"
        text-effect="none"
        :disabled="disabled"
        :throttle="false"
        @click="next"
      >
        {{ controlLabel }}
      </BingButton>
    </slot>
  </section>
</template>

<style scoped>
.bing-deck-transition {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: min(840px, calc(100vw - 48px));
  max-width: 100%;
  min-width: 0;
  gap: 12px;
  padding: 16px clamp(12px, 5vw, 48px) 24px;
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  overflow: hidden;
  background: transparent;
  isolation: isolate;
}

.bing-deck-transition.is-disabled {
  cursor: not-allowed;
}

.bing-deck-transition__stage {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 320px;
  overflow: visible;
  isolation: isolate;
}

.bing-deck-transition__card {
  position: absolute;
  inset: 16px 32px 56px 0;
  box-sizing: border-box;
  display: grid;
  gap: 12px;
  align-content: center;
  padding: 16px;
  border: 1px solid var(--bing-border-strong);
  border-radius: var(--bing-radius-card);
  background: var(--bing-popover-bg);
  box-shadow: var(--bing-shadow-sm);
  transform-origin: 50% 80%;
  backdrop-filter: blur(var(--bing-glass-blur)) saturate(var(--bing-glass-saturation));
  -webkit-backdrop-filter: blur(var(--bing-glass-blur)) saturate(var(--bing-glass-saturation));
  will-change: transform, opacity;
}

.bing-deck-transition__button {
  position: relative;
  z-index: 30;
  justify-self: start;
}
</style>
