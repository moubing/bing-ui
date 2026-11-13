<script setup lang="ts">
import { computed, onBeforeUnmount, provide, shallowRef } from 'vue'
import {
  DragDropProvider,
  type DragDropManager,
  type DragDropProviderProps,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/vue'
import {
  AutoScroller,
  Cursor,
  Feedback,
  PointerActivationConstraints,
  PointerSensor,
  PreventSelection,
} from '@dnd-kit/dom'
import { bingDragDropKey, type BingDragDropSourceData } from './context'
import type {
  BingDragDropActive,
  BingDragDropEmits,
  BingDragDropKey,
  BingDragDropProps,
  BingDragDropSlotProps,
} from './BingDragDrop.types'

type Data = any

const props = withDefaults(defineProps<BingDragDropProps>(), {
  disabled: false,
  dragThreshold: 6,
  touchDelay: 300,
  touchTolerance: 8,
  autoScroll: true,
  dropOnSource: false,
})

const emit = defineEmits<BingDragDropEmits<Data>>()

defineSlots<{
  default?(props: BingDragDropSlotProps<Data>): unknown
}>()

const DEFAULT_IGNORE = 'button, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-bing-drag-ignore]'

const active = shallowRef<BingDragDropActive<Data> | null>(null)
const settled = shallowRef<BingDragDropKey | null>(null)
const zones = new Map<BingDragDropKey, HTMLElement>()
let manager: DragDropManager | undefined

/** 条目内的按钮、输入框等交互元素保留原有行为；条目自身是链接或按钮时仍可拖动。 */
function shouldPreventActivation(event: PointerEvent, element: Element | undefined, selector: string) {
  const target = event.target

  if (!(target instanceof Element) || !element) {
    return false
  }

  const ignored = target.closest(selector)

  return Boolean(ignored && ignored !== element && element.contains(ignored))
}

const sensors = computed<NonNullable<DragDropProviderProps['sensors']>>(() => [
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === 'touch') {
        return [
          new PointerActivationConstraints.Delay({
            value: Math.max(0, props.touchDelay),
            tolerance: Math.max(0, props.touchTolerance),
          }),
        ]
      }

      return [new PointerActivationConstraints.Distance({ value: Math.max(0, props.dragThreshold) })]
    },
    preventActivation(event, source) {
      const data = source.data as BingDragDropSourceData | undefined
      return shouldPreventActivation(event, source.element, data?.ignore ?? DEFAULT_IGNORE)
    },
  }),
])

// 只用指针交互：dnd-kit 的键盘传感器与无障碍插件会给条目加 role=button 和英文说明，
// 与卡片内的链接冲突。跨区移动需要另外提供菜单等非拖动入口。
const plugins = computed<NonNullable<DragDropProviderProps['plugins']>>(() => [
  ...(props.autoScroll ? [AutoScroller] : []),
  Cursor,
  Feedback,
  PreventSelection,
])

function readSource(source: { id: unknown; data?: unknown } | null) {
  if (!source) {
    return null
  }

  const data = (source.data ?? {}) as BingDragDropSourceData

  return {
    id: source.id as BingDragDropKey,
    zone: data.zone,
    data: data.data,
  }
}

function getPointerType(event?: Event) {
  return event && 'pointerType' in event ? String((event as PointerEvent).pointerType) : undefined
}

function handleDragStart(event: DragStartEvent, dragManager: DragDropManager) {
  manager = dragManager
  const item = readSource(event.operation.source)

  if (!item) {
    return
  }

  settled.value = null
  active.value = { ...item, over: null, pointerType: getPointerType(event.nativeEvent) }

  if (getPointerType(event.nativeEvent) === 'touch') {
    navigator.vibrate?.(8)
  }

  emit('drag-start', { ...item, event: event.nativeEvent })
}

function handleDragOver(event: DragOverEvent) {
  const current = active.value
  const over = (event.operation.target?.id ?? null) as BingDragDropKey | null

  if (!current || current.over === over) {
    return
  }

  active.value = { ...current, over }
  emit('drag-over', { id: current.id, zone: current.zone, data: current.data, over })
}

function handleDragEnd(event: DragEndEvent) {
  const current = active.value
  const item = readSource(event.operation.source) ?? current
  active.value = null

  if (!item) {
    return
  }

  const to = event.canceled ? null : ((event.operation.target?.id ?? null) as BingDragDropKey | null)

  if (to !== null && (props.dropOnSource || to !== item.zone)) {
    emit('drop', { id: item.id, data: item.data, from: item.zone, to, event: event.nativeEvent })
  }

  emit('drag-end', {
    id: item.id,
    data: item.data,
    from: item.zone,
    to,
    canceled: event.canceled,
    event: event.nativeEvent,
  })
}

function cancel() {
  if (!active.value || !manager || manager.dragOperation.status.idle) {
    return
  }

  manager.actions.stop({ canceled: true })
}

provide(bingDragDropKey, {
  active,
  disabled: computed(() => props.disabled),
  cancel,
  settled,
  settle: (id) => { settled.value = id },
  registerZone: (id, element) => {
    zones.set(id, element)
    return () => { if (zones.get(id) === element) zones.delete(id) }
  },
  zoneElement: id => zones.get(id),
})

onBeforeUnmount(() => {
  cancel()
  manager = undefined
})

defineExpose({ cancel, active })
</script>

<template>
  <DragDropProvider
    :sensors="sensors"
    :plugins="plugins"
    @drag-start="handleDragStart"
    @drag-over="handleDragOver"
    @drag-end="handleDragEnd"
  >
    <slot :active="active" :cancel="cancel" />
  </DragDropProvider>
</template>
