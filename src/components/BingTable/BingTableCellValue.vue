<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BingTooltip from '../BingTooltip/BingTooltip.vue'
import { bingTableMeasurementsKey, createTableMeasurements } from './BingTable.measurements'
import { tableInteractiveSelector } from './BingTable.utils'

const props = withDefaults(defineProps<{
  ellipsis?: boolean
  disabled?: boolean
}>(), {
  ellipsis: true,
  disabled: false,
})

const contentRef = ref<HTMLElement | null>(null)
const overflowText = ref('')
const hasControls = ref(false)
const measurements = inject(bingTableMeasurementsKey, null) ?? createTableMeasurements(contentRef)
let unregister: (() => void) | undefined

function readOverflow() {
  const content = contentRef.value
  if (!content) return
  const nextHasControls = Boolean(content.querySelector(tableInteractiveSelector))

  // 控件保留自己的交互、提示和外侧焦点框，只有文字内容参与裁剪。
  function isClipped(element: HTMLElement) {
    if (element.clientWidth === 0 || element.scrollWidth <= element.clientWidth + 1) {
      return false
    }

    const style = window.getComputedStyle(element)
    return style.overflowX === 'hidden' || style.overflowX === 'clip'
  }

  const overflowing = props.ellipsis && !nextHasControls && (
    isClipped(content) || (content.childElementCount > 0 &&
      [...content.querySelectorAll<HTMLElement>('*')].some(isClipped))
  )

  // 从实际插槽内容读取全文，兼容显示值与 row[column.key] 不一致的情况。
  const nextText = overflowing ? (content.innerText || content.textContent || '').trim() : ''
  return () => {
    hasControls.value = nextHasControls
    overflowText.value = nextText
  }
}

function updateOverflow() {
  readOverflow()?.()
}

onMounted(() => {
  if (contentRef.value) unregister = measurements.register(contentRef.value, readOverflow)
})

watch(() => props.ellipsis, () => {
  if (contentRef.value) measurements.invalidate(contentRef.value)
})
onBeforeUnmount(() => unregister?.())
</script>

<template>
  <BingTooltip
    class="bing-table__cell-value"
    :content="overflowText"
    :disabled="disabled || !overflowText"
    :tabindex="!disabled && overflowText ? 0 : undefined"
    :max-width="420"
    :open-delay="180"
    placement="top"
  >
    <span
      ref="contentRef"
      class="bing-table__cell-text"
      :class="{ 'is-ellipsis': ellipsis, 'has-controls': hasControls }"
      @pointerenter="updateOverflow"
      @focusin="updateOverflow"
    ><slot /></span>
  </BingTooltip>
</template>

<style scoped>
.bing-table__cell-value {
  display: block;
  min-width: 0;
  max-width: 100%;
}

.bing-table__cell-value.is-disabled {
  cursor: inherit;
  opacity: 1;
}

.bing-table__cell-value:focus-visible {
  border-radius: 3px;
  outline: 2px solid var(--_table-focus-ring);
  outline-offset: -2px;
}

.bing-table__cell-value :deep(.bing-tooltip__anchor) {
  display: block;
  min-width: 0;
}

.bing-table__cell-text {
  display: block;
  min-width: 0;
}

.bing-table__cell-text.is-ellipsis {
  white-space: nowrap;
}

.bing-table__cell-text.is-ellipsis:not(.has-controls) {
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (forced-colors: active) { .bing-table__cell-value:focus-visible { outline-color: Highlight; } }
</style>
