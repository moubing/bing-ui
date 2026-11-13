<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue'
import {
  DragDropProvider,
  DragOverlay,
  type DragDropProviderProps,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/vue'
import { Feedback, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { isSortable } from '@dnd-kit/vue/sortable'
import { gsap } from 'gsap'
import BingSortableListItem from './BingSortableListItem.vue'
import type {
  BingSortableListDragPayload,
  BingSortableListEmits,
  BingSortableListKey,
  BingSortableListPayload,
  BingSortableListProps,
  BingSortableListSlotProps,
} from './BingSortableList.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

type ListItem = any
type ItemRectMap = Map<string, DOMRect>

defineOptions({
  inheritAttrs: false,
})

interface ResolvedItem {
  item: ListItem
  key: BingSortableListKey
  sourceIndex: number
  disabled: boolean
}

const props = withDefaults(defineProps<BingSortableListProps<ListItem>>(), {
  items: () => [],
  order: undefined,
  itemKey: 'id' as any,
  itemDisabled: undefined,
  disabledKeys: () => [],
  axis: 'vertical',
  disabled: false,
  keyboard: true,
  flip: true,
  reorderMode: 'drop',
  duration: 0.26,
  settleDuration: 0.16,
  dragThreshold: 4,
  dragOverlay: false,
  ariaLabel: '可排序列表',
  handleAriaLabel: '调整顺序',
})

const emit = defineEmits<BingSortableListEmits<ListItem>>()
const attrs = useAttrs()
const rootRef = ref<HTMLElement | null>(null)

defineSlots<{
  default?(props: {
    item: ListItem
    key: BingSortableListKey
    index: number
    active: boolean
    dragging: boolean
    disabled: boolean
    handleProps: any
  }): unknown
}>()

const localOrder = ref<BingSortableListKey[]>([])
const activeKey = ref<BingSortableListKey | null>(null)
const activeFrom = ref<number | null>(null)
const projectedOrder = ref<BingSortableListKey[] | null>(null)
let skippedOrderFlipSignature: string | null = null
let orderFlipTargets: HTMLElement[] = []

const dndSensors = computed(() => {
  const threshold = Math.max(0, props.dragThreshold)

  return threshold > 0
    ? [
        PointerSensor.configure({
          activationConstraints: [
            new PointerActivationConstraints.Distance({
              value: threshold,
            }),
          ],
        }),
      ]
    : [PointerSensor]
})

const dropAnimation = computed(() =>
  props.settleDuration > 0 && !prefersReducedMotion()
    ? {
        duration: Math.max(0, props.settleDuration * 1000),
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    : null,
)

const dndPlugins = computed<NonNullable<DragDropProviderProps['plugins']>>(() => {
  return (defaults) =>
    defaults.map((plugin) =>
      plugin === Feedback
        ? Feedback.configure({
            dropAnimation: dropAnimation.value,
          })
        : plugin,
    )
})

const rootClasses = computed(() => [
  'bing-sortable-list',
  `bing-sortable-list--${props.axis}`,
  {
    'is-disabled': props.disabled,
    'is-dragging': activeKey.value !== null,
  },
])

const rootAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs

  return rest
})

const sourceKeys = computed(() =>
  props.items.map((item, index) => getItemKey(item, index)),
)

const baseOrder = computed(() => normalizeOrder(props.order ?? localOrder.value))

const effectiveOrder = computed(() => projectedOrder.value ?? baseOrder.value)

const resolvedItems = computed<ResolvedItem[]>(() => {
  const itemMap = new Map<BingSortableListKey, ResolvedItem>()

  props.items.forEach((item, sourceIndex) => {
    const key = getItemKey(item, sourceIndex)

    itemMap.set(key, {
      item,
      key,
      sourceIndex,
      disabled: isItemDisabled(item, sourceIndex, key),
    })
  })

  return effectiveOrder.value
    .map((key) => itemMap.get(key))
    .filter((item): item is ResolvedItem => Boolean(item))
})

watch(
  sourceKeys,
  () => {
    localOrder.value = normalizeOrder(props.order ?? localOrder.value)
  },
  { immediate: true },
)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isSameOrder(first: BingSortableListKey[], second: BingSortableListKey[]) {
  return first.length === second.length && first.every((key, index) => key === second[index])
}

function getOrderSignature(order: BingSortableListKey[]) {
  return JSON.stringify(order)
}

function getSortableItemElements() {
  const root = rootRef.value

  if (!root) {
    return []
  }

  return Array.from(root.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && Boolean(element.dataset.bingSortableKey),
  )
}

function captureItemRects() {
  const rects: ItemRectMap = new Map()

  getSortableItemElements().forEach((element) => {
    const key = element.dataset.bingSortableKey

    if (key) {
      rects.set(key, element.getBoundingClientRect())
    }
  })

  return rects
}

function killOrderFlipAnimations(clearTransform = true) {
  if (!orderFlipTargets.length) {
    return
  }

  gsap.killTweensOf(orderFlipTargets)

  if (clearTransform) {
    gsap.set(orderFlipTargets, { clearProps: 'transform' })
  }

  orderFlipTargets = []
}

async function animateBaseOrderChange(firstRects: ItemRectMap) {
  if (!props.flip || props.duration <= 0 || prefersReducedMotion()) {
    return
  }

  await nextTick()

  const deltas = new WeakMap<HTMLElement, { x: number; y: number }>()
  const movedElements = getSortableItemElements().filter((element) => {
    const key = element.dataset.bingSortableKey
    const firstRect = key ? firstRects.get(key) : undefined

    if (!firstRect) {
      return false
    }

    const lastRect = element.getBoundingClientRect()
    const deltaX = firstRect.left - lastRect.left
    const deltaY = firstRect.top - lastRect.top
    const moved = Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5

    if (moved) {
      deltas.set(element, { x: deltaX, y: deltaY })
    }

    return moved
  })

  if (!movedElements.length) {
    return
  }

  killOrderFlipAnimations()
  orderFlipTargets = movedElements

  gsap.fromTo(
    movedElements,
    {
      x: (_index, target: HTMLElement) => deltas.get(target)?.x ?? 0,
      y: (_index, target: HTMLElement) => deltas.get(target)?.y ?? 0,
    },
    {
      x: 0,
      y: 0,
      duration: Math.max(0, props.duration),
      ease: 'power3.out',
      stagger: {
        each: 0.012,
        from: 'start',
      },
      overwrite: true,
      clearProps: 'transform',
      onComplete: () => {
        orderFlipTargets = []
      },
    },
  )
}

function isUsableKey(value: unknown): value is BingSortableListKey {
  return typeof value === 'string' || typeof value === 'number'
}

function getItemKey(item: ListItem, index: number): BingSortableListKey {
  if (typeof props.itemKey === 'function') {
    return props.itemKey(item, index)
  }

  const value = item?.[props.itemKey as keyof ListItem]

  return isUsableKey(value) ? value : index
}

function isItemDisabled(item: ListItem, index: number, key: BingSortableListKey) {
  if (props.disabledKeys.includes(key)) {
    return true
  }

  if (!props.itemDisabled) {
    return false
  }

  if (typeof props.itemDisabled === 'function') {
    return props.itemDisabled(item, index)
  }

  return Boolean(item?.[props.itemDisabled as keyof ListItem])
}

function normalizeOrder(order: BingSortableListKey[]) {
  const keys = sourceKeys.value
  const knownKeys = new Set(keys)
  const normalized = order.filter(
    (key, index) => knownKeys.has(key) && order.indexOf(key) === index,
  )
  const missing = keys.filter((key) => !normalized.includes(key))

  return [...normalized, ...missing]
}

function getHandleLabel(item: ListItem, index: number) {
  if (typeof props.handleAriaLabel === 'function') {
    return props.handleAriaLabel(item, index)
  }

  return props.handleAriaLabel
}

function getEntryByKey(key: BingSortableListKey) {
  return resolvedItems.value.find((entry) => entry.key === key)
}

function getOverlaySlotProps(key: BingSortableListKey): BingSortableListSlotProps<ListItem> {
  const entry = getEntryByKey(key)
  const index = effectiveOrder.value.indexOf(key)

  return {
    item: entry?.item,
    key,
    index,
    active: true,
    dragging: true,
    disabled: entry?.disabled ?? false,
    // 预览不得覆盖原拖拽手柄的 ref，也不能进入键盘焦点顺序。
    handleProps: {
      ref: () => {},
      role: 'button',
      tabindex: -1,
      'aria-label': getHandleLabel(entry?.item, index),
      'aria-disabled': 'true',
      onKeydown: () => {},
    },
  }
}

function getNativePointerEvent(event: DragStartEvent | DragMoveEvent | DragEndEvent) {
  return event.nativeEvent instanceof PointerEvent ? event.nativeEvent : undefined
}

function moveOrder(
  order: BingSortableListKey[],
  from: number,
  to: number,
) {
  const nextOrder = [...order]
  const [movedKey] = nextOrder.splice(from, 1)

  if (movedKey === undefined) {
    return nextOrder
  }

  nextOrder.splice(clamp(to, 0, nextOrder.length), 0, movedKey)

  return nextOrder
}

function getProjectedOrder(
  key: BingSortableListKey,
  from: number,
  to: number,
  order = baseOrder.value,
) {
  const currentIndex = order.indexOf(key)
  const safeFrom = currentIndex >= 0 ? currentIndex : from

  return normalizeOrder(moveOrder(order, safeFrom, to))
}

function commitOrder(
  nextOrder: BingSortableListKey[],
  payload: Omit<BingSortableListPayload<ListItem>, 'order'>,
  compareOrder: BingSortableListKey[] = baseOrder.value,
  options: { skipFlip?: boolean } = {},
) {
  const normalizedOrder = normalizeOrder(nextOrder)

  if (isSameOrder(compareOrder, normalizedOrder)) {
    return false
  }

  if (options.skipFlip) {
    skippedOrderFlipSignature = getOrderSignature(normalizedOrder)
  }

  if (props.order === undefined) {
    localOrder.value = normalizedOrder
  }

  emit('update:order', normalizedOrder)
  emit('reorder', {
    ...payload,
    order: normalizedOrder,
  })

  return true
}

function createDragPayload(
  key: BingSortableListKey,
  index: number,
  order: BingSortableListKey[],
  event: PointerEvent,
): BingSortableListDragPayload<ListItem> | null {
  const entry = getEntryByKey(key)

  if (!entry) {
    return null
  }

  return {
    key,
    item: entry.item,
    index,
    order,
    event,
  }
}

function handleDndDragStart(event: DragStartEvent) {
  const { source } = event.operation
  const nativeEvent = getNativePointerEvent(event)

  if (!nativeEvent || !isSortable(source) || !isUsableKey(source.id)) {
    return
  }

  const entry = getEntryByKey(source.id)

  if (!entry) {
    return
  }

  activeKey.value = source.id
  activeFrom.value = source.index

  emit('drag-start', {
    key: source.id,
    item: entry.item,
    index: source.index,
    order: effectiveOrder.value,
    event: nativeEvent,
  })
}

function handleDndDragMove(event: DragMoveEvent) {
  const { source } = event.operation
  const nativeEvent = getNativePointerEvent(event)

  if (!nativeEvent || !isSortable(source) || !isUsableKey(source.id)) {
    return
  }

  const from = activeFrom.value ?? source.initialIndex
  const nextOrder = getProjectedOrder(source.id, from, source.index)

  projectedOrder.value = nextOrder

  const payload = createDragPayload(source.id, source.index, nextOrder, nativeEvent)

  if (payload) {
    emit('drag', payload)
  }

  if (props.reorderMode === 'live') {
    const entry = getEntryByKey(source.id)

    if (entry) {
      commitOrder(
        nextOrder,
        {
          key: source.id,
          item: entry.item,
          from,
          to: source.index,
          event: nativeEvent,
        },
        baseOrder.value,
        {
          skipFlip: true,
        },
      )
    }
  }
}

function handleDndDragEnd(event: DragEndEvent) {
  const { source } = event.operation
  const nativeEvent = getNativePointerEvent(event)
  const wasActiveKey = activeKey.value
  const from = activeFrom.value

  activeKey.value = null
  activeFrom.value = null
  projectedOrder.value = null

  if (!nativeEvent || !isSortable(source) || !isUsableKey(source.id)) {
    return
  }

  const entry = getEntryByKey(source.id)

  if (!entry) {
    return
  }

  const initialIndex = from ?? source.initialIndex
  const finalIndex = event.canceled ? baseOrder.value.indexOf(source.id) : source.index
  const nextOrder = getProjectedOrder(source.id, initialIndex, finalIndex)

  if (!event.canceled && props.reorderMode === 'drop') {
    commitOrder(
      nextOrder,
      {
        key: source.id,
        item: entry.item,
        from: initialIndex,
        to: finalIndex,
        event: nativeEvent,
      },
      baseOrder.value,
      {
        skipFlip: true,
      },
    )
  }

  const endPayload = createDragPayload(
    source.id,
    finalIndex,
    !event.canceled && props.reorderMode === 'drop' ? normalizeOrder(nextOrder) : baseOrder.value,
    nativeEvent,
  )

  if (endPayload && wasActiveKey === source.id) {
    emit('drag-end', endPayload)
  }
}

function handleKeyboardMove(entry: ResolvedItem, event: KeyboardEvent) {
  if (props.disabled || entry.disabled || !props.keyboard) {
    return
  }

  const key = event.key
  let targetIndex: number | null = null
  const currentIndex = effectiveOrder.value.indexOf(entry.key)

  if (props.axis === 'vertical') {
    if (key === 'ArrowUp') {
      targetIndex = currentIndex - 1
    } else if (key === 'ArrowDown') {
      targetIndex = currentIndex + 1
    }
  } else if (key === 'ArrowLeft') {
    targetIndex = currentIndex - 1
  } else if (key === 'ArrowRight') {
    targetIndex = currentIndex + 1
  }

  if (key === 'Home') {
    targetIndex = 0
  } else if (key === 'End') {
    targetIndex = effectiveOrder.value.length - 1
  }

  if (targetIndex === null || currentIndex < 0) {
    return
  }

  event.preventDefault()

  const nextOrder = moveOrder(
    effectiveOrder.value,
    currentIndex,
    clamp(targetIndex, 0, effectiveOrder.value.length - 1),
  )

  commitOrder(nextOrder, {
    key: entry.key,
    item: entry.item,
    from: currentIndex,
    to: clamp(targetIndex, 0, effectiveOrder.value.length - 1),
    event,
  })
}

watch(
  baseOrder,
  (nextOrder, previousOrder) => {
    if (!previousOrder.length || isSameOrder(nextOrder, previousOrder)) {
      return
    }

    const nextSignature = getOrderSignature(nextOrder)

    if (skippedOrderFlipSignature === nextSignature) {
      skippedOrderFlipSignature = null
      return
    }

    skippedOrderFlipSignature = null
    const firstRects = captureItemRects()

    void animateBaseOrderChange(firstRects)
  },
  { flush: 'pre' },
)

onBeforeUnmount(() => {
  killOrderFlipAnimations(false)
})
</script>

<template>
  <DragDropProvider
    :sensors="dndSensors"
    :plugins="dndPlugins"
    @drag-start="handleDndDragStart"
    @drag-move="handleDndDragMove"
    @drag-end="handleDndDragEnd"
  >
    <div
      ref="rootRef"
      v-bind="rootAttrs"
      :class="[rootClasses, attrs.class]"
      :style="attrs.style"
      role="list"
      :aria-label="ariaLabel"
    >
      <BingSortableListItem
        v-for="(entry, index) in resolvedItems"
        :key="entry.key"
        :item="entry.item"
        :item-key="entry.key"
        :index="index"
        :active-key="activeKey"
        :disabled="disabled || entry.disabled"
        :axis="axis"
        :flip="flip"
        :duration="duration"
        :handle-label="getHandleLabel(entry.item, index)"
        @keyboard-move="handleKeyboardMove(entry, $event)"
      >
        <template #default="slotProps">
          <slot v-bind="slotProps" />
        </template>
      </BingSortableListItem>

      <DragOverlay
        v-if="dragOverlay"
        v-slot="{ source }"
        class="bing-sortable-list__overlay"
        :drop-animation="dropAnimation"
        aria-hidden="true"
        inert
      >
        <!-- source 在归位动画完成后才清空，保持预览一直可见。 -->
        <slot v-if="source && getEntryByKey(source.id)" v-bind="getOverlaySlotProps(source.id)" />
      </DragOverlay>
    </div>
  </DragDropProvider>
</template>

<style scoped>
.bing-sortable-list {
  --bing-sortable-gap: 8px;

  position: relative;
  display: grid;
  gap: var(--bing-sortable-gap);
  min-width: 0;
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.bing-sortable-list--horizontal {
  display: flex;
  flex-wrap: wrap;
}

.bing-sortable-list.is-dragging,
.bing-sortable-list.is-dragging * {
  user-select: none;
}

.bing-sortable-list__overlay {
  position: fixed;
  z-index: 10000;
  box-sizing: border-box;
  color: var(--bing-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  pointer-events: none;
}

.bing-sortable-list__overlay:not(:empty) {
  border-radius: 6px;
  outline: 1px solid var(--bing-popover-border);
  outline-offset: -1px;
  background: var(--bing-surface-solid);
  box-shadow: var(--bing-popover-shadow);
}
</style>
