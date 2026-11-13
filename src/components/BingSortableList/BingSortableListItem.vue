<script setup lang="ts">
import { computed, ref, type ComponentPublicInstance } from 'vue'
import { useSortable } from '@dnd-kit/vue/sortable'
import type {
  BingSortableListAxis,
  BingSortableListHandleProps,
  BingSortableListKey,
  BingSortableListSlotProps,
} from './BingSortableList.types'

type ListItem = any

const props = withDefaults(
  defineProps<{
    item: ListItem
    itemKey: BingSortableListKey
    index: number
    activeKey: BingSortableListKey | null
    disabled?: boolean
    axis?: BingSortableListAxis
    flip?: boolean
    duration?: number
    handleLabel: string
  }>(),
  {
    disabled: false,
    axis: 'vertical',
    flip: true,
    duration: 0.26,
  },
)

const emit = defineEmits<{
  'keyboard-move': [event: KeyboardEvent]
}>()

defineSlots<{
  default?(props: BingSortableListSlotProps<ListItem>): unknown
}>()

const elementRef = ref<HTMLElement | null>(null)
const handleRef = ref<HTMLElement | null>(null)

const transition = computed(() =>
  props.flip
    ? {
        duration: Math.max(0, props.duration * 1000),
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        idle: false,
      }
    : null,
)

const { isDragging, isDropping, isDragSource } = useSortable({
  id: computed(() => props.itemKey),
  index: computed(() => props.index),
  element: elementRef,
  handle: handleRef,
  disabled: computed(() => props.disabled),
  transition,
})

const dragging = computed(() => isDragging.value || isDropping.value || isDragSource.value)
const active = computed(() => props.activeKey === props.itemKey)

const itemClasses = computed(() => ({
  'is-active': active.value,
  'is-dragging': dragging.value,
  'is-disabled': props.disabled,
}))

function setHandleElement(element: Element | ComponentPublicInstance | null) {
  if (element && '$el' in element) {
    handleRef.value = element.$el as HTMLElement
    return
  }

  handleRef.value = element as HTMLElement | null
}

const handleProps = computed<BingSortableListHandleProps>(() => ({
  ref: setHandleElement,
  class: [
    'bing-sortable-list__handle',
    {
      'is-disabled': props.disabled,
    },
  ],
  role: 'button',
  tabindex: props.disabled ? -1 : 0,
  'aria-label': props.handleLabel,
  'aria-disabled': props.disabled ? 'true' : 'false',
  onKeydown: (event: KeyboardEvent) => emit('keyboard-move', event),
}))
</script>

<template>
  <div
    ref="elementRef"
    class="bing-sortable-list__item"
    :class="itemClasses"
    role="listitem"
    :aria-grabbed="active ? 'true' : 'false'"
    :data-bing-sortable-key="String(itemKey)"
  >
    <slot
      :item="item"
      :key="itemKey"
      :index="index"
      :active="active"
      :dragging="dragging"
      :disabled="disabled"
      :handle-props="handleProps"
    />
  </div>
</template>

<style scoped>
.bing-sortable-list__item {
  position: relative;
  min-width: 0;
  will-change: transform;
}

.bing-sortable-list__item.is-disabled {
  opacity: 0.52;
}

.bing-sortable-list__item :deep(.bing-sortable-list__handle) {
  cursor: grab;
  touch-action: none;
}

.bing-sortable-list__item :deep(.bing-sortable-list__handle:active) {
  cursor: grabbing;
}

.bing-sortable-list__item :deep(.bing-sortable-list__handle.is-disabled) {
  cursor: not-allowed;
}

.bing-sortable-list__item :deep(.bing-sortable-list__handle:focus-visible) {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .bing-sortable-list__item {
    transition: none;
  }
}
</style>
