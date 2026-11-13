import { onBeforeUnmount, ref, type Ref } from 'vue'
import type { DragDropProviderProps, DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/vue'
import { Accessibility, AutoScroller, Feedback, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { isSortable } from '@dnd-kit/vue/sortable'
import type { BingScrollbarExpose } from '../../BingScrollbar/BingScrollbar.types'
import type { BingTableColumn, BingTableProps } from '../BingTable.types'

interface DndOptions {
  rootRef: Readonly<Ref<HTMLElement | null>>
  scrollRef: Readonly<Ref<BingScrollbarExpose | null>>
  visibleColumns: Readonly<Ref<BingTableColumn[]>>
  reorderColumns: (fromKey: string, toKey: string) => void
}

interface ColumnDndState {
  draggedColumnKey: Ref<string | null>
  dragOverColumnKey: Ref<string | null>
  columnDropAnimation: { duration: number; easing: string }
  columnDndSensors: NonNullable<DragDropProviderProps['sensors']>
  columnDndPlugins: NonNullable<DragDropProviderProps['plugins']>
  finishColumnDrag: () => void
  handleColumnDndDragStart: (event: DragStartEvent) => void
  handleColumnDndDragMove: (event: DragMoveEvent) => void
  handleColumnDndDragEnd: (event: DragEndEvent) => void
}

export function useColumnDnd(
  props: Pick<BingTableProps, 'reorderableColumns'>,
  {
    rootRef, scrollRef, visibleColumns, reorderColumns,
  }: DndOptions,
): ColumnDndState {
  const draggedColumnKey = ref<string | null>(null)

  const dragOverColumnKey = ref<string | null>(null)

  const columnDropAnimation = {
    duration: 190,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }

  const columnDndSensors = [
    PointerSensor.configure({
      activatorElements: (source) => [source.element],
      activationConstraints: [
        new PointerActivationConstraints.Distance({
          value: 6,
          tolerance: {
            x: 2,
            y: 4,
          },
        }),
      ],
      preventActivation: (event) => {
        const target = event.target

        return (
          target instanceof Element &&
          Boolean(target.closest('[data-bing-table-dnd-ignore]'))
        )
      },
    }),
  ]

  const columnDndPlugins: NonNullable<DragDropProviderProps['plugins']> = (defaults) =>
    defaults.filter((plugin) => plugin !== AutoScroller && plugin !== Accessibility).map((plugin) =>
      plugin === Feedback
        ? Feedback.configure({
            dropAnimation: columnDropAnimation,
          })
        : plugin,
    )

  let releaseColumnDragScroll: (() => void) | undefined

  function lockColumnDragScroll() {
    releaseColumnDragScroll?.()
    scrollRef.value?.stop()
    const doc = rootRef.value?.ownerDocument
    if (!doc) return

    // 浮动拖拽卡片可能离开表格，在所属文档拦截滚动输入，保持表格与页面位置稳定。
    const preventScroll = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    const preventScrollKey = (event: KeyboardEvent) => {
      // 空格在 keyup、Enter 在 keydown 可能激活表头排序按钮，间接触发回顶。
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Enter'].includes(event.key)) {
        preventScroll(event)
      }
    }
    doc.addEventListener('wheel', preventScroll, { capture: true, passive: false })
    doc.addEventListener('touchmove', preventScroll, { capture: true, passive: false })
    doc.addEventListener('keydown', preventScrollKey, true)
    doc.addEventListener('keyup', preventScrollKey, true)
    releaseColumnDragScroll = () => {
      doc.removeEventListener('wheel', preventScroll, true)
      doc.removeEventListener('touchmove', preventScroll, true)
      doc.removeEventListener('keydown', preventScrollKey, true)
      doc.removeEventListener('keyup', preventScrollKey, true)
      releaseColumnDragScroll = undefined
    }
  }

  function finishColumnDrag() {
    releaseColumnDragScroll?.()
    draggedColumnKey.value = null
    dragOverColumnKey.value = null
  }

  function getColumnDragTargetKey(index: number) {
    const lastIndex = visibleColumns.value.length - 1

    if (lastIndex < 0) {
      return null
    }

    return visibleColumns.value[Math.min(lastIndex, Math.max(0, index))]?.key ?? null
  }

  function handleColumnDndDragStart(event: DragStartEvent) {
    const { source } = event.operation

    if (!props.reorderableColumns || !isSortable(source)) {
      return
    }

    lockColumnDragScroll()
    draggedColumnKey.value = String(source.id)
    dragOverColumnKey.value = getColumnDragTargetKey(source.index)
  }

  function handleColumnDndDragMove(event: DragMoveEvent) {
    const { source } = event.operation

    if (!props.reorderableColumns || !draggedColumnKey.value || !isSortable(source)) {
      return
    }

    dragOverColumnKey.value = getColumnDragTargetKey(source.index)
  }

  function handleColumnDndDragEnd(event: DragEndEvent) {
    const { source } = event.operation
    const fromKey = draggedColumnKey.value

    if (
      props.reorderableColumns &&
      fromKey &&
      !event.canceled &&
      isSortable(source)
    ) {
      const toKey = getColumnDragTargetKey(source.index)

      if (toKey) {
        reorderColumns(fromKey, toKey)
      }
    }

    finishColumnDrag()
  }

  onBeforeUnmount(finishColumnDrag)
  return {
    draggedColumnKey, dragOverColumnKey, columnDropAnimation, columnDndSensors, columnDndPlugins,
    finishColumnDrag, handleColumnDndDragStart, handleColumnDndDragMove, handleColumnDndDragEnd,
  }
}
