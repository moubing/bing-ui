import { computed, ref, type EmitFn, type Ref } from 'vue'
import type { BingSelectModelValue } from '../../BingSelect/BingSelect.types'
import type { BingTableColumn, BingTableEmits, BingTableKey, BingTableProps, BingTableRow, BingTableSortOrder } from '../BingTable.types'
import type { BingTableFlatRow } from '../BingTable.internal'
import { clamp, compareCellValues, getCellValue, getSortDirections } from '../BingTable.utils'

type DataDefaults = 'defaultPage' | 'defaultPageSize' | 'defaultSortKey' | 'defaultSortOrder' | 'remoteSort' | 'pagination' | 'remotePagination' | 'rowKey' | 'childrenKey'
type DataProps = Required<Pick<BingTableProps, DataDefaults>> & Pick<BingTableProps, 'page' | 'pageSize' | 'sortKey' | 'sortOrder' | 'total' | 'rowDisabled' | 'treeColumnKey' | 'error'>
type DataEmits = Pick<BingTableEmits, 'update:page' | 'update:pageSize' | 'page-change' | 'update:sortKey' | 'update:sortOrder' | 'sort-change'>
interface DataOptions {
  displayedData: Readonly<Ref<BingTableRow[]>>
  isBusy: Readonly<Ref<boolean>>
  settledTotal: Readonly<Ref<number | undefined>>
  allColumns: Readonly<Ref<BingTableColumn[]>>
  effectiveExpandedRowKeySet: Readonly<Ref<Set<BingTableKey>>>
  beginPageSizeTransition: (pageSize: number) => void
}

export function useTableData(
  props: DataProps,
  emit: EmitFn<DataEmits>,
  {
    displayedData, isBusy, settledTotal, allColumns, effectiveExpandedRowKeySet,
    beginPageSizeTransition,
  }: DataOptions,
) {
  const localPage = ref(Math.max(1, props.defaultPage))

  const localPageSize = ref(Math.max(1, props.defaultPageSize))

  const localSortKey = ref<string | null>(props.defaultSortKey)

  const localSortOrder = ref<BingTableSortOrder>(props.defaultSortOrder)

  const effectivePage = computed(() => Math.max(1, props.page ?? localPage.value))

  const effectivePageSize = computed(() => Math.max(1, props.pageSize ?? localPageSize.value))

  const effectiveSortKey = computed(() => props.sortKey === undefined ? localSortKey.value : props.sortKey)

  const effectiveSortOrder = computed(() => props.sortOrder === undefined ? localSortOrder.value : props.sortOrder)

  // 与展开和排序解耦：key / path 始终来自原始数据的同级位置。
  const rowIndex = computed(() => {
    const byKey = new Map<BingTableKey, BingTableFlatRow>()
    const all: BingTableFlatRow[] = []
    function visit(rows: BingTableRow[], parentKey: BingTableKey | null, path: number[]) {
      return rows.map((row, siblingIndex) => {
        const currentPath = [...path, siblingIndex]
        const value = typeof props.rowKey === 'function'
          ? props.rowKey(row, siblingIndex, currentPath)
          : row[props.rowKey]
        const key = typeof value === 'string' || typeof value === 'number' ? value : currentPath.join('-')
        const rawChildren = row[props.childrenKey]
        const children = Array.isArray(rawChildren) ? rawChildren as BingTableRow[] : []
        const index = all.length
        const item: BingTableFlatRow = {
          row, key, level: path.length, parentKey, index, path: currentPath,
          disabled: typeof props.rowDisabled === 'function'
            ? props.rowDisabled(row, index)
            : props.rowDisabled ? Boolean(row[props.rowDisabled]) : false,
          hasChildren: children.length > 0, expanded: false,
          posInSet: siblingIndex + 1, setSize: rows.length,
        }
        byKey.set(key, item)
        all.push(item)
        item.childrenKeys = visit(children, key, currentPath).map(child => child.key)
        return item
      })
    }
    const roots = visit(displayedData.value, null, [])
    return { byKey, all, roots }
  })
  const itemsByKey = computed(() => rowIndex.value.byKey)
  const allKnownFlatRows = computed(() => rowIndex.value.all)
  const sortedRootRows = computed(() => {
    const roots = rowIndex.value.roots
    const key = effectiveSortKey.value
    const order = effectiveSortOrder.value
    const column = key ? allColumns.value.find(item => item.key === key) : undefined
    if (props.remoteSort || !order || !column) return roots
    // 每行仅读取一次响应式字段；比较器复用 Collator，避免 O(n log n) 次重复代理读取和实例创建。
    const values = column.sorter ? undefined : new Map(roots.map(item => [item.key, getCellValue(item.row, column)]))
    return [...roots].sort((a, b) => {
      const result = column.sorter
        ? column.sorter(a.row, b.row)
        : compareCellValues(values!.get(a.key), values!.get(b.key))
      return order === 'asc' ? result : -result
    })
  })
  const totalItems = computed(() =>
    (isBusy.value ? settledTotal.value : props.total) ?? sortedRootRows.value.length,
  )
  const pageCount = computed(() => props.pagination
    ? Math.max(1, Math.ceil(totalItems.value / effectivePageSize.value)) : 1,
  )
  const allVisibleFlatRows = computed(() => {
    const result: BingTableFlatRow[] = []
    const expanded = effectiveExpandedRowKeySet.value
    const byKey = itemsByKey.value
    const offset = props.pagination && props.remotePagination
      ? (effectivePage.value - 1) * effectivePageSize.value : 0
    function visit(item: BingTableFlatRow, rootPosition?: number) {
      const isExpanded = expanded.has(item.key)
      result.push({
        ...item, expanded: isExpanded, index: result.length, rowIndex: offset + result.length + 2,
        posInSet: rootPosition ?? item.posInSet,
        setSize: item.level === 0 && props.remotePagination ? totalItems.value : item.setSize,
      })
      if (isExpanded) for (const key of item.childrenKeys ?? []) {
        const child = byKey.get(key)
        if (child) visit(child)
      }
    }
    sortedRootRows.value.forEach((item, index) => visit(item, offset + index + 1))
    return result
  })
  const visibleFlatRows = computed(() => {
    const rows = allVisibleFlatRows.value
    if (!props.pagination || props.remotePagination) return rows
    const roots = sortedRootRows.value
    const start = (effectivePage.value - 1) * effectivePageSize.value
    const first = roots[start]
    if (!first) return []
    const end = roots[start + effectivePageSize.value]
    const from = rows.findIndex(item => item.key === first.key)
    const to = end ? rows.findIndex(item => item.key === end.key) : rows.length
    return rows.slice(from, to).map((item, index) => ({ ...item, index }))
  })
  const hasTreeData = computed(() => Boolean(props.treeColumnKey) ||
    allKnownFlatRows.value.some(item => item.hasChildren))
  const ariaRowCount = computed(() => (props.remotePagination ? totalItems.value : allVisibleFlatRows.value.length) + 1)
  const selectionEpoch = computed(() => [rowIndex.value, effectiveSortKey.value, effectiveSortOrder.value, effectivePage.value, effectivePageSize.value])

  function toggleSort(column: BingTableColumn) {
    if (!column.sortable || props.error || !displayedData.value.length || isBusy.value) return
    const directions = getSortDirections(column)
    const current = effectiveSortKey.value === column.key ? directions.indexOf(effectiveSortOrder.value) : -1
    const nextOrder: BingTableSortOrder = directions[(current + 1) % directions.length] ?? null
    const nextKey = nextOrder ? column.key : null

    if (props.sortKey === undefined) {
      localSortKey.value = nextKey
    }

    if (props.sortOrder === undefined) {
      localSortOrder.value = nextOrder
    }

    emit('update:sortKey', nextKey)
    emit('update:sortOrder', nextOrder)
    emit('sort-change', {
      key: nextKey,
      order: nextOrder,
      column: nextKey ? column : undefined,
    })
  }

  function setPage(page: number) {
    const nextPage = clamp(Math.round(page), 1, pageCount.value)

    if (props.page === undefined) {
      localPage.value = nextPage
    }

    emit('update:page', nextPage)
    emit('page-change', {
      page: nextPage,
      pageSize: effectivePageSize.value,
    })
  }

  function setPageSize(pageSize: number) {
    const nextPageSize = Math.max(1, Math.round(pageSize))
    const nextPage = 1
    const shouldTransitionPageSize =
      nextPageSize !== effectivePageSize.value || nextPage !== effectivePage.value

    if (shouldTransitionPageSize) {
      beginPageSizeTransition(nextPageSize)
    }

    if (props.pageSize === undefined) {
      localPageSize.value = nextPageSize
    }

    if (props.page === undefined) {
      localPage.value = nextPage
    }

    emit('update:pageSize', nextPageSize)
    emit('update:page', nextPage)
    emit('page-change', {
      page: nextPage,
      pageSize: nextPageSize,
    })
  }

  function handlePageSizeSelectChange(value: BingSelectModelValue) {
    if (Array.isArray(value) || value === null) {
      return
    }

    setPageSize(Number(value))
  }


  return {
    effectivePage, effectivePageSize, effectiveSortKey, effectiveSortOrder, totalItems, pageCount,
    visibleFlatRows, allKnownFlatRows, itemsByKey, allVisibleFlatRows, ariaRowCount, selectionEpoch, hasTreeData, toggleSort, setPage, setPageSize,
    handlePageSizeSelectChange,
  }
}
