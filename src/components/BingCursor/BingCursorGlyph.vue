<script setup lang="ts">
import { cursorShapes } from './BingCursor.shapes'
import type { BingCursorType } from './BingCursor.types'

defineProps<{ type: BingCursorType }>()
const ink = 'var(--bing-cursor-color, #171717)'
const paper = 'var(--bing-cursor-outline, #ffffff)'
</script>

<template>
  <svg class="bing-cursor__glyph" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path
      v-for="(part, index) in cursorShapes[type]" :key="index"
      :d="part.d" :fill="part.ink ? ink : paper" :stroke="part.outline ? ink : paper"
      :stroke-width="part.strokeWidth"
      stroke-linejoin="round" paint-order="stroke fill"
    />
  </svg>
</template>

<style scoped>
.bing-cursor__glyph {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.2));
}
</style>
