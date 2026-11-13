<script setup lang="ts">
import { useId } from 'vue'
import type { BingDropDownGroupProps } from './BingDropDown.types'
defineProps<BingDropDownGroupProps>()
const labelId = `bing-dropdown-group-${useId()}`
</script>

<template>
  <div class="bing-dropdown-group" role="group" :aria-labelledby="label || $slots.label ? labelId : undefined">
    <div v-if="label || $slots.label" :id="labelId" class="bing-dropdown-group__label" data-bing-dropdown-stagger>
      <slot name="label">{{ label }}</slot>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.bing-dropdown-group { position: relative; min-width: 0; }
.bing-dropdown-group__label { padding: 6px 8px 2px; color: var(--bing-muted); font-size: 0.6875rem; line-height: 18px; }
</style>
