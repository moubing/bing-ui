import { computed, type CSSProperties, type Ref } from 'vue'
import type { BingTableColumn, BingTableFixed, BingTableProps, BingTableSortOrder } from '../BingTable.types'
import type { BingTableColumnClasses } from '../BingTable.internal'
import { clamp } from '../BingTable.utils'

type FixedProps = Required<Pick<BingTableProps, 'selectable' | 'selectionFixed' | 'selectionColumnWidth'>>
interface FixedOptions {
  gutter: () => number
  visibleColumns: Readonly<Ref<BingTableColumn[]>>
  getColumnFixed: (column: BingTableColumn) => BingTableFixed | null
  getColumnPixelWidth: (column: BingTableColumn) => number
  getColumnWidthStyle: (column: BingTableColumn) => string
  usesVirtualRows: Readonly<Ref<boolean>>
  hasRenderedBodyRows: Readonly<Ref<boolean>>
  hasHorizontalOverflow: Readonly<Ref<boolean>>
  horizontalScrollLeft: Readonly<Ref<number>>
  horizontalMaxScrollLeft: Readonly<Ref<number>>
  effectiveSortKey: Readonly<Ref<string | null>>
  effectiveSortOrder: Readonly<Ref<BingTableSortOrder>>
  draggedColumnKey: Readonly<Ref<string | null>>
  dragOverColumnKey: Readonly<Ref<string | null>>
  activeResizeColumnKey: Readonly<Ref<string | null>>
}

export function useFixedColumns(
  props: FixedProps,
  {
    visibleColumns, getColumnFixed, getColumnPixelWidth, getColumnWidthStyle, usesVirtualRows,
    hasRenderedBodyRows, hasHorizontalOverflow, horizontalScrollLeft, horizontalMaxScrollLeft,
    effectiveSortKey, effectiveSortOrder, draggedColumnKey, dragOverColumnKey,
    activeResizeColumnKey, gutter,
  }: FixedOptions,
) {
  const normalizedSelectionColumnWidth = computed(() =>
    Math.max(42, Math.floor(props.selectionColumnWidth)),
  )

  const columnStyles = computed(() => new Map(visibleColumns.value.map(column => [column.key, {
    body: resolveColumnCellStyle(column),
    header: resolveColumnCellStyle(column, true),
  }])))

  const columnClasses = computed(() => new Map(visibleColumns.value.map(column => [column.key, {
    body: resolveColumnClasses(column),
    header: resolveColumnClasses(column, true),
  }])))

  const tableMinWidth = computed(() => {
    const selectionWidth = props.selectable ? normalizedSelectionColumnWidth.value : 0
    const columnWidth = visibleColumns.value.reduce(
      (total, column) => total + getColumnPixelWidth(column),
      0,
    )

    return Math.max(selectionWidth + columnWidth, 320)
  })

  const leftColumnOffsets = computed(() => {
    const offsets: Record<string, number> = {}
    let left = props.selectable && props.selectionFixed ? normalizedSelectionColumnWidth.value : 0

    visibleColumns.value.forEach((column) => {
      if (getColumnFixed(column) === 'left') {
        offsets[column.key] = left
        left += getColumnPixelWidth(column)
      }
    })

    return offsets
  })

  const rightColumnOffsets = computed(() => {
    const offsets: Record<string, number> = {}
    let right = 0

    visibleColumns.value.slice().reverse().forEach((column) => {
      if (getColumnFixed(column) === 'right') {
        offsets[column.key] = right
        right += getColumnPixelWidth(column)
      }
    })

    return offsets
  })

  const leftFixedWidth = computed(() => {
    let width = props.selectable && props.selectionFixed ? normalizedSelectionColumnWidth.value : 0

    visibleColumns.value.forEach((column) => {
      if (getColumnFixed(column) === 'left') {
        width += getColumnPixelWidth(column)
      }
    })

    return width
  })

  const rightFixedWidth = computed(() =>
    visibleColumns.value.reduce(
      (width, column) =>
        getColumnFixed(column) === 'right' ? width + getColumnPixelWidth(column) : width,
      0,
    ),
  )

  const fixedShadowFadeDistance = 36

  const fixedShadowMaxOpacity = 0.78

  const leftFixedShadowOpacity = computed(() =>
    fixedShadowMaxOpacity * clamp(horizontalScrollLeft.value / fixedShadowFadeDistance, 0, 1),
  )

  const rightFixedShadowOpacity = computed(() =>
    fixedShadowMaxOpacity *
    clamp(
      (horizontalMaxScrollLeft.value - horizontalScrollLeft.value) / fixedShadowFadeDistance,
      0,
      1,
    ),
  )

  const leftFixedShadowStyle = computed<CSSProperties>(() => ({
    left: `${leftFixedWidth.value}px`,
    opacity: leftFixedShadowOpacity.value,
  }))

  const rightFixedShadowStyle = computed<CSSProperties>(() => ({
    right: `${rightFixedWidth.value + gutter()}px`,
    opacity: rightFixedShadowOpacity.value,
  }))

  const leftFixedMaskStyle = computed<CSSProperties>(() => ({
    width: props.selectable && shouldFixSelectionColumn.value
      ? `${normalizedSelectionColumnWidth.value}px`
      : '0px',
  }))

  const rightFixedMaskStyle = computed<CSSProperties>(() => ({
    right: `${gutter()}px`,
    width: `${rightFixedWidth.value}px`,
  }))

  const showLeftFixedMask = computed(
    () => hasRenderedBodyRows.value && props.selectable && shouldFixSelectionColumn.value,
  )

  const showRightFixedMask = computed(() => hasRenderedBodyRows.value && rightFixedWidth.value > 0)

  const hasLeftFixedShadow = computed(
    () => hasRenderedBodyRows.value && leftFixedWidth.value > 0 && horizontalMaxScrollLeft.value > 1,
  )

  const hasRightFixedShadow = computed(
    () => hasRenderedBodyRows.value && rightFixedWidth.value > 0 && horizontalMaxScrollLeft.value > 1,
  )

  const shouldFixSelectionColumn = computed(
    () => props.selectionFixed && (!usesVirtualRows.value || hasHorizontalOverflow.value),
  )

  function getColumnCellStyle(column: BingTableColumn, header = false): CSSProperties {
    return columnStyles.value.get(column.key)?.[header ? 'header' : 'body'] ?? resolveColumnCellStyle(column, header)
  }

  function resolveColumnCellStyle(column: BingTableColumn, header = false): CSSProperties {
    const fixed = getColumnFixed(column)
    const style: CSSProperties = {
      width: getColumnWidthStyle(column),
      minWidth: getColumnWidthStyle(column),
      maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
      textAlign: header ? (column.headerAlign ?? column.align ?? 'left') : (column.align ?? 'left'),
    }

    if (fixed === 'left') {
      style.left = `${leftColumnOffsets.value[column.key] ?? 0}px`
    }

    if (fixed === 'right') {
      style.right = `${(rightColumnOffsets.value[column.key] ?? 0) + gutter()}px`
    }

    return style
  }

  function getSelectionCellStyle(): CSSProperties {
    if (!shouldFixSelectionColumn.value) {
      return {
        width: `${normalizedSelectionColumnWidth.value}px`,
        minWidth: `${normalizedSelectionColumnWidth.value}px`,
      }
    }

    return {
      left: '0px',
      width: `${normalizedSelectionColumnWidth.value}px`,
      minWidth: `${normalizedSelectionColumnWidth.value}px`,
    }
  }

  function getColumnClasses(column: BingTableColumn, header = false): BingTableColumnClasses {
    return columnClasses.value.get(column.key)?.[header ? 'header' : 'body'] ?? resolveColumnClasses(column, header)
  }

  function resolveColumnClasses(column: BingTableColumn, header = false) {
    const fixed = getColumnFixed(column)

    return [
      header ? column.headerClass : column.class,
      `is-align-${header ? (column.headerAlign ?? column.align ?? 'left') : (column.align ?? 'left')}`,
      {
        'is-fixed-left': fixed === 'left',
        'is-fixed-right': fixed === 'right',
        'is-last-left-fixed': fixed === 'left' && isLastLeftFixedColumn(column.key),
        'is-first-right-fixed': fixed === 'right' && isFirstRightFixedColumn(column.key),
        'is-last-right-fixed': fixed === 'right' && isLastRightFixedColumn(column.key),
        'is-before-right-fixed': fixed !== 'right' && isBeforeRightFixedColumn(column.key),
        'is-sorting': effectiveSortKey.value === column.key && Boolean(effectiveSortOrder.value),
        'is-dragging': draggedColumnKey.value === column.key,
        'is-drag-over': dragOverColumnKey.value === column.key,
        'is-resizing': activeResizeColumnKey.value === column.key,
        'is-ellipsis': column.ellipsis !== false,
      },
    ]
  }

  function isLastLeftFixedColumn(key: string) {
    const index = visibleColumns.value.findIndex((column) => column.key === key)

    return !visibleColumns.value.slice(index + 1).some((column) => getColumnFixed(column) === 'left')
  }

  function isFirstRightFixedColumn(key: string) {
    const index = visibleColumns.value.findIndex((column) => column.key === key)

    return !visibleColumns.value.slice(0, index).some((column) => getColumnFixed(column) === 'right')
  }

  function isLastRightFixedColumn(key: string) {
    const index = visibleColumns.value.findIndex((column) => column.key === key)

    return !visibleColumns.value.slice(index + 1).some((column) => getColumnFixed(column) === 'right')
  }

  function isBeforeRightFixedColumn(key: string) {
    const firstRightIndex = visibleColumns.value.findIndex(
      (column) => getColumnFixed(column) === 'right',
    )

    return firstRightIndex > 0 && visibleColumns.value[firstRightIndex - 1]?.key === key
  }


  return {
    normalizedSelectionColumnWidth, tableMinWidth, leftFixedShadowStyle, rightFixedShadowStyle,
    leftFixedMaskStyle, rightFixedMaskStyle, showLeftFixedMask, showRightFixedMask,
    hasLeftFixedShadow, hasRightFixedShadow, shouldFixSelectionColumn, getColumnCellStyle,
    getSelectionCellStyle, getColumnClasses, leftFixedWidth, rightFixedWidth,
  }
}
