<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDroppable } from '@dnd-kit/vue'
import type { DroppableInput } from '@dnd-kit/dom'
import { useOptionalBingDragDrop, type BingDragDropSourceData } from './context'
import type {
  BingDragDropItem,
  BingDropZoneProps,
  BingDropZoneSlotProps,
  BingDropZoneState,
} from './BingDragDrop.types'

type Detector = NonNullable<DroppableInput['collisionDetector']>
type Collision = NonNullable<ReturnType<Detector>>

const props = withDefaults(defineProps<BingDropZoneProps<any>>(), {
  accept: undefined,
  disabled: false,
  tag: 'div',
  ariaLabel: undefined,
})

defineSlots<{
  default?(props: BingDropZoneSlotProps<any>): unknown
}>()

const context = useOptionalBingDragDrop()

if (!context) {
  throw new Error('<BingDropZone> 必须放在 <BingDragDrop> 内部')
}

const elementRef = ref<HTMLElement | null>(null)

// 登记区域元素，供浮层在条目放下后不再显示时收进这里。
watch([elementRef, () => props.id], ([element, id], _previous, onCleanup) => {
  if (element) onCleanup(context.registerZone(id, element))
}, { immediate: true, flush: 'post' })

/**
 * 只认指针所在的区域：松手不在任何区域时条目回到原处，不按浮层重叠面积猜目标。
 * 嵌套区域取面积更小（更内层）的那个。
 */
const pointerOnly: Detector = ({ dragOperation, droppable }) => {
  const point = dragOperation.position.current
  const shape = droppable.shape

  if (!point || !shape || !shape.containsPoint(point)) {
    return null
  }

  const { width, height } = shape.boundingRectangle

  return {
    id: droppable.id,
    value: 1 / Math.max(1, width * height),
    // 与 @dnd-kit/collision 的 pointerIntersection 相同：PointerIntersection / High。
    type: 2 as Collision['type'],
    priority: 3,
  }
}

function accepts(item: BingDragDropItem) {
  if (props.disabled) return false
  // 源区域总是可以放回，作为“取消”的落点。
  if (item.zone !== undefined && item.zone === props.id) return true
  return props.accept ? props.accept(item) : true
}

const { isDropTarget } = useDroppable({
  id: computed(() => props.id),
  element: elementRef,
  disabled: computed(() => props.disabled),
  // dnd-kit 用 toValue 读取参数，函数本身会被当成 getter 调用，需包一层 computed。
  collisionDetector: computed(() => pointerOnly),
  accept: computed(() => (draggable: { id: unknown; data?: unknown }) => {
    const data = (draggable.data ?? {}) as BingDragDropSourceData
    return accepts({ id: draggable.id as BingDragDropItem['id'], zone: data.zone, data: data.data })
  }),
})

const over = computed(() => {
  const current = context.active.value
  return Boolean(current && (current.over === props.id || isDropTarget.value))
})

const state = computed<BingDropZoneState>(() => {
  const current = context.active.value

  if (!current) return 'idle'
  if (current.zone !== undefined && current.zone === props.id) return 'source'
  if (!accepts(current)) return 'disabled'
  return over.value ? 'over' : 'target'
})
</script>

<template>
  <component
    :is="tag"
    ref="elementRef"
    class="bing-drop-zone"
    :class="`is-${state}`"
    :aria-label="ariaLabel"
    :data-bing-drop-state="state"
    :data-bing-drop-over="over ? '' : undefined"
  >
    <slot :state="state" :over="over" :active="context.active.value" />
  </component>
</template>
