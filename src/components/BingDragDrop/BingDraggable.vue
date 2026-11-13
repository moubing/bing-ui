<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDraggable } from '@dnd-kit/vue'
import { useOptionalBingDragDrop, type BingDragDropSourceData } from './context'
import type { BingDraggableProps, BingDraggableSlotProps } from './BingDragDrop.types'

const props = withDefaults(defineProps<BingDraggableProps<any>>(), {
  zone: undefined,
  data: undefined,
  disabled: false,
  tag: 'div',
  ignore: undefined,
})

defineSlots<{
  default?(props: BingDraggableSlotProps): unknown
}>()

const context = useOptionalBingDragDrop()

if (!context) {
  throw new Error('<BingDraggable> 必须放在 <BingDragDrop> 内部')
}

const elementRef = ref<HTMLElement | null>(null)
const resolvedDisabled = computed(() => props.disabled || context.disabled.value)
const sourceData = computed<BingDragDropSourceData>(() => ({
  zone: props.zone,
  data: props.data,
  ignore: props.ignore,
}))

const { isDragSource } = useDraggable({
  id: computed(() => props.id),
  element: elementRef,
  data: sourceData,
  disabled: resolvedDisabled,
})

// isDragSource 在归位动画结束前保持为真；浮层落到位时与浮层内容在同一帧收起占位样式。
const dragging = computed(() => Boolean(isDragSource.value) && context.settled.value !== props.id)
const active = computed(() => context.active.value !== null)
</script>

<template>
  <component
    :is="tag"
    ref="elementRef"
    class="bing-draggable"
    :class="{ 'is-drag-source': dragging, 'is-disabled': resolvedDisabled }"
    :data-bing-drag-source="dragging ? '' : undefined"
    @dragstart.prevent
  >
    <slot :dragging="dragging" :active="active" :disabled="resolvedDisabled" />
  </component>
</template>

<style scoped>
.bing-draggable:not(.is-disabled) {
  cursor: grab;
  /* 保留滚动与缩放，长按开始拖动后由传感器阻止滚动。 */
  touch-action: manipulation;
  -webkit-touch-callout: none;
}

.bing-draggable.is-drag-source {
  cursor: grabbing;
}
</style>
