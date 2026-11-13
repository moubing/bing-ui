<script setup lang="ts">
import type { CSSProperties } from 'vue'
defineProps<{
  showLeftFixedMask: boolean
  showRightFixedMask: boolean
  hasLeftFixedShadow: boolean
  hasRightFixedShadow: boolean
  leftFixedMaskStyle: CSSProperties
  rightFixedMaskStyle: CSSProperties
  leftFixedShadowStyle: CSSProperties
  rightFixedShadowStyle: CSSProperties
}>()
</script>

<template>
  <div
    v-if="showLeftFixedMask"
    class="bing-table__fixed-mask bing-table__fixed-mask--left"
    :style="leftFixedMaskStyle"
    aria-hidden="true"
  ></div>
  <div
    v-if="showRightFixedMask"
    class="bing-table__fixed-mask bing-table__fixed-mask--right"
    :style="rightFixedMaskStyle"
    aria-hidden="true"
  ></div>
  <div
    v-if="hasLeftFixedShadow"
    class="bing-table__fixed-shadow bing-table__fixed-shadow--left"
    :style="leftFixedShadowStyle"
    aria-hidden="true"
  ></div>
  <div
    v-if="hasRightFixedShadow"
    class="bing-table__fixed-shadow bing-table__fixed-shadow--right"
    :style="rightFixedShadowStyle"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.bing-table__fixed-mask {
  position: absolute;
  top: 0;
  bottom: var(--bing-table-horizontal-scrollbar-height);
  z-index: var(--bing-table-fixed-mask-z);
  pointer-events: none;
}

.bing-table__fixed-mask--left {
  left: 0;
  background: var(--bing-table-row-bg);
}

.bing-table__fixed-mask--right {
  right: 0;
  background: var(--bing-table-row-bg);
}

.bing-table__fixed-shadow {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: var(--bing-table-fixed-shadow-z);
  width: 14px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 160ms var(--bing-ease-smooth);
  will-change: opacity;
}

.bing-table.has-horizontal-scrollbar .bing-table__fixed-shadow {
  bottom: var(--bing-table-horizontal-scrollbar-height);
}

.bing-table__fixed-shadow--left {
  background: linear-gradient(
    90deg,
    var(--bing-shadow-color),
    color-mix(in srgb, var(--bing-shadow-color) 50%, transparent) 38%,
    transparent
  );
}

.bing-table__fixed-shadow--right {
  background: linear-gradient(
    270deg,
    var(--bing-shadow-color),
    color-mix(in srgb, var(--bing-shadow-color) 50%, transparent) 38%,
    transparent
  );
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
