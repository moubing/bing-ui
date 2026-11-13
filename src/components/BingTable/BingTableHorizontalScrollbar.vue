<script setup lang="ts">
import { ref, type CSSProperties } from 'vue'
defineProps<{
  hasHorizontalOverflow: boolean
  isDraggingHorizontalScrollbar: boolean
  horizontalScrollbarThumbStyle: CSSProperties
  gutter?: 'auto' | 'stable'
}>()
const emit = defineEmits<{
  'rail-pointerdown': [event: PointerEvent]
  'thumb-pointerdown': [event: PointerEvent]
}>()
const horizontalRailRef = ref<HTMLElement | null>(null)
defineExpose({ rail: horizontalRailRef })
</script>

<template>
  <div
    class="bing-table__horizontal-scrollbar"
    :class="{ 'is-visible': hasHorizontalOverflow, 'is-dragging': isDraggingHorizontalScrollbar, 'is-collapsed': gutter === 'auto' && !hasHorizontalOverflow }"
    aria-hidden="true"
  >
    <div
      ref="horizontalRailRef"
      class="bing-table__horizontal-rail"
      @pointerdown="emit('rail-pointerdown', $event)"
    >
      <div
        class="bing-table__horizontal-thumb"
        :style="horizontalScrollbarThumbStyle"
        @pointerdown="emit('thumb-pointerdown', $event)"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.bing-table__horizontal-scrollbar {
  transition: height var(--bing-duration-fast) var(--bing-ease-smooth);
  position: relative;
  z-index: 32;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  height: var(--bing-table-horizontal-scrollbar-height);
  padding: 7px 10px 9px;
  border: 0;
  background: var(--bing-table-row-bg);
  visibility: hidden;
}

.bing-table__horizontal-scrollbar.is-collapsed { height: 0; padding-block: 0; border-top-width: 0; overflow: hidden; }

.bing-table__horizontal-scrollbar.is-visible {
  visibility: visible;
}

.bing-table__horizontal-rail {
  position: relative;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}

.bing-table__horizontal-thumb {
  position: absolute;
  top: 0.5px;
  left: 0;
  height: 4px;
  border-radius: 999px;
  background: rgb(var(--bing-heading-rgb) / 0.3);
  box-shadow: none;
  cursor: grab;
  transition:
    height var(--bing-duration-fast) var(--bing-ease-smooth),
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth);
  will-change: transform;
}

.bing-table__horizontal-thumb:hover,
.bing-table__horizontal-scrollbar.is-dragging .bing-table__horizontal-thumb {
  height: 4px;
  background: rgb(var(--bing-heading-rgb) / 0.4);
}

.bing-table__horizontal-scrollbar.is-dragging,
.bing-table__horizontal-scrollbar.is-dragging * {
  cursor: grabbing;
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  .bing-table,
  .bing-table *,
  .bing-table *::before {
    animation: none !important;
    transition: none !important;
  }
}
</style>
