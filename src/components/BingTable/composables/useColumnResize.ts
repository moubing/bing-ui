import { onBeforeUnmount, ref, type EmitFn, type Ref } from 'vue'
import type { BingTableColumn, BingTableEmits, BingTableProps } from '../BingTable.types'
import type { BingTableInteractionStyle } from '../BingTable.internal'
import { clamp, hasOwn, isBrowser, toFiniteNumber } from '../BingTable.utils'

interface ColumnResizeSnapshot {
  key: string
  startClientX: number
  startWidth: number
}

type ResizeProps = Required<Pick<BingTableProps, 'resizableColumns'>> & Pick<BingTableProps, 'columnWidths'>
interface ResizeOptions {
  allColumns: Readonly<Ref<BingTableColumn[]>>
  localColumnWidths: Ref<Record<string, number>>
  interactionStyle: BingTableInteractionStyle
  rootRef?: Readonly<Ref<HTMLElement | null>>
}

export function useColumnResize(
  props: ResizeProps,
  emit: EmitFn<Pick<BingTableEmits, 'update:columnWidths' | 'column-resize'>>,
  {
    allColumns, localColumnWidths, interactionStyle, rootRef,
  }: ResizeOptions,
) {
  const activeResizeColumnKey = ref<string | null>(null)

  let columnResizeFrame: number | undefined

  let pendingColumnResizeWidth: number | undefined

  let resizeSnapshot: ColumnResizeSnapshot | undefined

  function getColumnPixelWidth(column: BingTableColumn) {
    const fallback = toFiniteNumber(column.width, column.minWidth ?? 160)

    if (hasOwn(props.columnWidths, column.key)) {
      return clampColumnWidth(column, props.columnWidths?.[column.key] ?? fallback)
    }

    if (hasOwn(localColumnWidths.value, column.key)) {
      return clampColumnWidth(column, localColumnWidths.value[column.key] ?? fallback)
    }

    return clampColumnWidth(column, fallback)
  }

  function getColumnWidthStyle(column: BingTableColumn) {
    return `${getColumnPixelWidth(column)}px`
  }

  function getColumnMaximumWidth(column: BingTableColumn) {
    return column.maxWidth ?? Math.max(getColumnPixelWidth(column), rootRef?.value?.clientWidth || 1024)
  }

  function clampColumnWidth(column: BingTableColumn, width: number) {
    const minWidth = Math.max(48, column.minWidth ?? 96)
    const maxWidth = column.maxWidth ?? Number.POSITIVE_INFINITY

    return Math.round(clamp(width, minWidth, maxWidth))
  }

  function updateColumnWidths(widths: Record<string, number>, key: string, width: number) {
    if (props.columnWidths === undefined) {
      localColumnWidths.value = widths
    }

    emit('update:columnWidths', widths)
    emit('column-resize', {
      key,
      width,
      widths,
    })
  }

  function setColumnWidth(key: string, width: number) {
    const column = allColumns.value.find((item) => item.key === key)

    if (!column) {
      return
    }

    const nextWidth = clampColumnWidth(column, width)
    if (nextWidth === getColumnPixelWidth(column)) return
    const baseWidths = props.columnWidths ?? localColumnWidths.value
    const nextWidths = {
      ...baseWidths,
      [key]: nextWidth,
    }

    updateColumnWidths(nextWidths, key, nextWidth)
  }

  function canResizeColumn(column: BingTableColumn) {
    return props.resizableColumns && column.resizable !== false
  }

  function beginColumnResize(column: BingTableColumn, event: PointerEvent) {
    if (!canResizeColumn(column) || event.button !== 0) {
      return
    }

    event.preventDefault()
    resizeSnapshot = {
      key: column.key,
      startClientX: event.clientX,
      startWidth: getColumnPixelWidth(column),
    }
    activeResizeColumnKey.value = column.key
    lockColumnResizeInteraction()
    addColumnResizeListeners()
  }

  function handleColumnResizeMove(event: PointerEvent) {
    if (!resizeSnapshot) {
      return
    }

    event.preventDefault()
    pendingColumnResizeWidth = resizeSnapshot.startWidth + event.clientX - resizeSnapshot.startClientX
    if (columnResizeFrame !== undefined) return
    if (isBrowser() && typeof window.requestAnimationFrame === 'function') {
      columnResizeFrame = window.requestAnimationFrame(flushColumnResize)
    } else {
      flushColumnResize()
    }
  }

  function clearColumnResizeFrame() {
    if (columnResizeFrame !== undefined && isBrowser()) window.cancelAnimationFrame(columnResizeFrame)
    columnResizeFrame = undefined
  }

  function flushColumnResize() {
    clearColumnResizeFrame()
    const width = pendingColumnResizeWidth
    pendingColumnResizeWidth = undefined
    if (resizeSnapshot && width !== undefined) setColumnWidth(resizeSnapshot.key, width)
  }

  function finishColumnResize() {
    if (!resizeSnapshot) {
      return
    }

    // 松手时补交尚未绘制的最后一次位移，保持实时预览与最终宽度一致。
    flushColumnResize()
    resizeSnapshot = undefined
    activeResizeColumnKey.value = null
    removeColumnResizeListeners()
    unlockColumnResizeInteraction()
  }

  function handleResizeKeydown(column: BingTableColumn, event: KeyboardEvent) {
    if (!canResizeColumn(column) || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Home') { setColumnWidth(column.key, column.minWidth ?? 96); return }
    if (event.key === 'End') {
      setColumnWidth(column.key, getColumnMaximumWidth(column))
      return
    }
    const delta = (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 48 : 12)

    setColumnWidth(column.key, getColumnPixelWidth(column) + delta)
  }

  function autoFitColumn(key: string) {
    const root = rootRef?.value
    const column = allColumns.value.find(column => column.key === key)
    if (!root || !column || !isBrowser()) return
    finishColumnResize()
    const cells = [...root.querySelectorAll<HTMLElement>('[data-column-key]')]
      .filter(cell => cell.dataset.columnKey === key && cell.closest('.bing-table') === root)
    if (!cells.length) return
    let width = column.minWidth ?? 96
    for (const cell of cells) {
      const content = cell.querySelector<HTMLElement>('.bing-table__header-content,.bing-table__cell-content')
      if (!content) continue
      const clone = content.cloneNode(true) as HTMLElement
      const styles = getComputedStyle(content)
      Object.assign(clone.style, {
        position: 'fixed', left: '0', top: '0', visibility: 'hidden', pointerEvents: 'none',
        width: 'max-content', minWidth: '0', maxWidth: 'none', flexWrap: 'nowrap',
        font: styles.font, paddingLeft: styles.paddingLeft, paddingRight: styles.paddingRight,
      })
      clone.setAttribute('aria-hidden', 'true')
      clone.inert = true
      for (const text of clone.querySelectorAll<HTMLElement>('.bing-table__cell-value,.bing-table__cell-text,.bing-table__header-label')) {
        Object.assign(text.style, { width: 'max-content', maxWidth: 'none', whiteSpace: 'nowrap' })
      }
      root.appendChild(clone)
      width = Math.max(width, Math.ceil(clone.getBoundingClientRect().width) + 2)
      clone.remove()
    }
    setColumnWidth(key, width)
  }
  function autoFitColumns() { for (const column of allColumns.value) autoFitColumn(column.key) }

  function addColumnResizeListeners() {
    if (!isBrowser()) {
      return
    }

    window.addEventListener('pointermove', handleColumnResizeMove)
    window.addEventListener('pointerup', finishColumnResize)
    window.addEventListener('pointercancel', finishColumnResize)
  }

  function removeColumnResizeListeners() {
    if (!isBrowser()) {
      return
    }

    window.removeEventListener('pointermove', handleColumnResizeMove)
    window.removeEventListener('pointerup', finishColumnResize)
    window.removeEventListener('pointercancel', finishColumnResize)
  }

  function lockColumnResizeInteraction() {
    if (!isBrowser()) {
      return
    }

    interactionStyle.previousCursor = document.documentElement.style.cursor
    interactionStyle.previousUserSelect = document.documentElement.style.userSelect
    document.documentElement.style.cursor = 'col-resize'
    document.documentElement.style.userSelect = 'none'
  }

  function unlockColumnResizeInteraction() {
    if (!isBrowser()) {
      return
    }

    document.documentElement.style.cursor = interactionStyle.previousCursor
    document.documentElement.style.userSelect = interactionStyle.previousUserSelect
  }

  onBeforeUnmount(() => {
    clearColumnResizeFrame()
    pendingColumnResizeWidth = undefined
    removeColumnResizeListeners()
    unlockColumnResizeInteraction()
  })
  return {
    activeResizeColumnKey, getColumnPixelWidth, getColumnWidthStyle, getColumnMaximumWidth, canResizeColumn,
    beginColumnResize, handleResizeKeydown, autoFitColumn, autoFitColumns,
  }
}
