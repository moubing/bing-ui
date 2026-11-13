<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useSortable } from '@dnd-kit/vue/sortable'

const props = withDefaults(
  defineProps<{
    columnKey: string
    index: number
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const elementRef = ref<HTMLElement | null>(null)
const handleRef = ref<HTMLElement | null>(null)
function syncHandle() { handleRef.value = elementRef.value?.querySelector('.bing-table__drag-mark') ?? null }
onMounted(syncHandle)
onUpdated(syncHandle)
const transition = {
  duration: 210,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  idle: false,
}

const { isDragging, isDropping, isDragSource, isDropTarget } = useSortable({
  id: computed(() => props.columnKey),
  index: computed(() => props.index),
  element: elementRef,
  handle: handleRef,
  disabled: computed(() => props.disabled),
  // 列宽变化时按左上角计算归位，避免默认中心对齐额外偏移半个宽度差。
  alignment: { x: 'start', y: 'start' },
  transition,
})

const dragging = computed(
  () => isDragging.value || isDropping.value || isDragSource.value,
)

const sortableClasses = computed(() => ({
  'is-dnd-sortable': !props.disabled,
  'is-dnd-dragging': dragging.value,
  'is-dnd-drop-target': isDropTarget.value,
}))
</script>

<template>
  <th
    ref="elementRef"
    :class="sortableClasses"
    :data-bing-table-sortable-key="columnKey"
  >
    <slot />
  </th>
</template>
