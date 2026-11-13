<script setup lang="ts">
import { computed } from 'vue'
import type { BingIconProps, BingIconSize } from './BingIcon.types'

const props = withDefaults(defineProps<BingIconProps>(), {
  size: 'md',
  tone: 'inherit',
  strokeWidth: 1.75,
  decorative: true,
  label: undefined,
})

const sizeMap = {
  xs: '14px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
} as const

function isSizeToken(size: BingIconSize): size is keyof typeof sizeMap {
  return typeof size === 'string' && size in sizeMap
}

const normalizedSize = computed(() => {
  if (typeof props.size === 'number') {
    return `${props.size}px`
  }

  return isSizeToken(props.size) ? sizeMap[props.size] : props.size
})

const iconClasses = computed(() => ['bing-icon', `bing-icon--${props.tone}`])
const isDecorative = computed(() => props.decorative || !props.label)
</script>

<template>
  <component
    :is="icon"
    :class="iconClasses"
    :style="{
      width: normalizedSize,
      height: normalizedSize,
      strokeWidth,
    }"
    :aria-hidden="isDecorative || undefined"
    :aria-label="isDecorative ? undefined : label"
    :role="isDecorative ? undefined : 'img'"
  />
</template>

<style scoped>
.bing-icon {
  display: inline-block;
  flex: 0 0 auto;
  color: currentColor;
  stroke: currentColor;
  vertical-align: -0.14em;
}

.bing-icon--inherit {
  color: currentColor;
}

.bing-icon--muted {
  color: var(--bing-muted);
}

.bing-icon--primary {
  color: var(--bing-accent);
}

.bing-icon--secondary {
  color: var(--bing-secondary);
}

.bing-icon--danger {
  color: var(--bing-danger);
}

.bing-icon--success {
  color: var(--bing-success);
}

.bing-icon--warning {
  color: var(--bing-warning);
}
</style>
