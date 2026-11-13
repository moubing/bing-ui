import { computed, ref, watch, type EmitFn, type Ref } from 'vue'
import { useClickFeedback } from '../../../motion/useClickFeedback'
import type { BingTableEmits, BingTableKey, BingTableProps, BingTableRow } from '../BingTable.types'
import type { BingTableFlatRow } from '../BingTable.internal'
import { tableRowClickIgnoreSelector } from '../BingTable.utils'

type SelectionProps = Required<Pick<BingTableProps,
  'defaultSelectedRowKeys' | 'selectionMode' | 'selectable' | 'selectOnRowClick'>> &
  Pick<BingTableProps, 'selectedRowKeys' | 'selectionStrategy' | 'remotePagination' | 'allPagesSelected' | 'excludedRowKeys'>
type SelectionEmits = Pick<BingTableEmits,
  'update:selectedRowKeys' | 'selection-change' | 'row-click' | 'update:allPagesSelected' | 'update:excludedRowKeys'>
interface SelectionOptions {
  visibleFlatRows: Readonly<Ref<BingTableFlatRow[]>>
  allKnownFlatRows: Readonly<Ref<BingTableFlatRow[]>>
  itemsByKey?: Readonly<Ref<Map<BingTableKey, BingTableFlatRow>>>
  resetKey?: Readonly<Ref<unknown>>
  activateRow?: (item: BingTableFlatRow, event: MouseEvent) => void
}

export function useTableSelection(
  props: SelectionProps,
  emit: EmitFn<SelectionEmits>,
  { visibleFlatRows, allKnownFlatRows, itemsByKey, resetKey, activateRow }: SelectionOptions,
) {
  const localSelectedRowKeys = ref<BingTableKey[]>([...props.defaultSelectedRowKeys])
  const localAllPages = ref(false)
  const localExcludedKeys = ref<BingTableKey[]>([])
  const effectiveSelectedRowKeys = computed(() => props.selectedRowKeys ?? localSelectedRowKeys.value)
  const effectiveSelectedRowKeySet = computed(() => new Set(effectiveSelectedRowKeys.value))
  const allPages = computed(() => props.allPagesSelected ?? localAllPages.value)
  const excludedKeys = computed(() => props.excludedRowKeys ?? localExcludedKeys.value)
  const excludedSet = computed(() => new Set(excludedKeys.value))
  const byKey = itemsByKey ?? computed(() => new Map(allKnownFlatRows.value.map(item => [item.key, item])))
  const cascade = computed(() => props.selectionStrategy === 'cascade' && props.selectionMode !== 'single')
  const rowCache = new Map<BingTableKey, BingTableRow>()
  let anchor: BingTableKey | null = null
  const { playClickFeedback } = useClickFeedback()

  if (resetKey) watch(resetKey, () => { anchor = null }, { flush: 'sync' })

  function selectedKey(key: BingTableKey) {
    return allPages.value && props.remotePagination ? !excludedSet.value.has(key) : effectiveSelectedRowKeySet.value.has(key)
  }

  // 后序聚合一次，避免每个单元格重新扫描整棵子树。
  const selectionStates = computed(() => {
    const result = new Map<BingTableKey, { checked: boolean; mixed: boolean; total: number; count: number }>()
    const rows = allKnownFlatRows.value
    for (let i = rows.length - 1; i >= 0; i--) {
      const item = rows[i]!
      let total = 0
      let count = 0
      if (cascade.value && item.hasChildren) {
        for (const key of item.childrenKeys ?? []) {
          const state = result.get(key)
          if (state) { total += state.total; count += state.count }
        }
      } else if (!item.disabled) {
        total = 1
        count = selectedKey(item.key) ? 1 : 0
      }
      result.set(item.key, { total, count, checked: !item.disabled && total > 0 && count === total, mixed: !item.disabled && count > 0 && count < total })
    }
    return result
  })
  const isRowSelected = (key: BingTableKey) => selectionStates.value.get(key)?.checked ?? selectedKey(key)
  const isRowIndeterminate = (key: BingTableKey) => selectionStates.value.get(key)?.mixed ?? false
  const selectableVisibleRows = computed(() => visibleFlatRows.value.filter(item => !item.disabled))
  const allVisibleRowsSelected = computed(() => props.selectable && props.selectionMode !== 'single' &&
    selectableVisibleRows.value.length > 0 && selectableVisibleRows.value.every(item => isRowSelected(item.key)))
  const someVisibleRowsSelected = computed(() => props.selectable && props.selectionMode !== 'single' &&
    !allVisibleRowsSelected.value && selectableVisibleRows.value.some(item => isRowSelected(item.key) || isRowIndeterminate(item.key)))

  function pruneRowCache() {
    const keys = effectiveSelectedRowKeySet.value
    for (const key of rowCache.keys()) {
      if (allPages.value && props.remotePagination ? excludedSet.value.has(key) : !keys.has(key)) rowCache.delete(key)
    }
  }
  // 父组件可能在一次渲染中依次更新 keys / allPages / excludedKeys；接受整批值后再回收，
  // 避免进入全选的中间状态误删已经加载过的其他页数据。
  watch([effectiveSelectedRowKeySet, allPages, excludedSet], pruneRowCache, { flush: 'post' })
  watch([allKnownFlatRows, effectiveSelectedRowKeySet, allPages, excludedSet], () => {
    for (const item of allKnownFlatRows.value) {
      if (!item.disabled && selectedKey(item.key)) rowCache.set(item.key, item.row)
    }
  }, { immediate: true, flush: 'sync' })

  function publish(keys: Iterable<BingTableKey>, mode = allPages.value, excluded = excludedKeys.value) {
    const uniqueKeys = [...new Set(keys)]
    const keySet = new Set(uniqueKeys)
    const exclusion = new Set(excluded)
    const rows: BingTableRow[] = []
    const seen = new Set<BingTableKey>()
    for (const item of allKnownFlatRows.value) {
      if (!item.disabled && (mode && props.remotePagination ? !exclusion.has(item.key) : keySet.has(item.key))) {
        rows.push(item.row)
        seen.add(item.key)
      }
    }
    for (const [key, row] of rowCache) {
      if (!seen.has(key) && (mode && props.remotePagination ? !exclusion.has(key) : keySet.has(key))) rows.push(row)
    }
    const previousMode = allPages.value
    const modeChanged = previousMode !== mode
    const exclusionChanged = excluded !== excludedKeys.value
    if (props.allPagesSelected === undefined) localAllPages.value = mode
    if (props.excludedRowKeys === undefined) localExcludedKeys.value = [...exclusion]
    if (props.selectedRowKeys === undefined) localSelectedRowKeys.value = uniqueKeys
    emit('update:selectedRowKeys', uniqueKeys)
    if (modeChanged) emit('update:allPagesSelected', mode)
    if (exclusionChanged) emit('update:excludedRowKeys', [...exclusion])
    emit('selection-change', {
      keys: uniqueKeys, rows,
      ...(mode || previousMode ? { allPages: mode, excludedKeys: [...exclusion] } : {}),
    })
  }

  function collectKeys(items: BingTableFlatRow[]) {
    const keys = new Set<BingTableKey>()
    const visited = new Set<BingTableKey>()
    const pending = [...items].reverse()
    while (pending.length) {
      const item = pending.pop()!
      if (visited.has(item.key)) continue
      visited.add(item.key)
      const children = cascade.value
        ? (item.childrenKeys ?? []).map(key => byKey.value.get(key)).filter((child): child is BingTableFlatRow => Boolean(child))
        : []
      if (children.length) pending.push(...children.reverse())
      else if (!item.disabled) keys.add(item.key)
    }
    return keys
  }

  function applySelection(items: BingTableFlatRow[], selected: boolean) {
    const keys = collectKeys(items)
    if (allPages.value && props.remotePagination) {
      const next = new Set(excludedKeys.value)
      for (const key of keys) { if (selected) next.delete(key); else next.add(key) }
      publish([], true, [...next])
      return
    }
    const next = new Set(effectiveSelectedRowKeys.value)
    for (const key of keys) { if (selected) next.add(key); else next.delete(key) }
    publish(next)
  }

  function toggleRowSelection(key: BingTableKey, selected?: boolean, range = false) {
    const item = byKey.value.get(key)
    if (!item || item.disabled) return
    const nextSelected = selected ?? !isRowSelected(key)
    if (props.selectionMode === 'single') {
      anchor = key
      publish(nextSelected ? [key] : [], false)
      return
    }
    const visible = visibleFlatRows.value
    const first = range && anchor !== null ? visible.findIndex(row => row.key === anchor) : -1
    const last = range ? visible.findIndex(row => row.key === key) : -1
    if (first >= 0 && last >= 0) applySelection(visible.slice(Math.min(first, last), Math.max(first, last) + 1), nextSelected)
    else { anchor = key; applySelection([item], nextSelected) }
  }

  function toggleAllVisibleRows(selected: boolean) {
    if (props.selectionMode === 'single') return
    applySelection(selectableVisibleRows.value, selected)
  }
  function selectAllPages() {
    if (!props.selectable || props.selectionMode === 'single') return
    if (props.remotePagination) publish([], true, [])
    else publish(collectKeys(allKnownFlatRows.value), false)
  }
  function clearSelection() { anchor = null; publish([], false, excludedKeys.value.length ? [] : excludedKeys.value) }
  function handleRowClick(item: BingTableFlatRow, event: MouseEvent) {
    emit('row-click', item.row, event)
    if (event.defaultPrevented) return
    const control = event.target instanceof Element ? event.target.closest(tableRowClickIgnoreSelector) : null
    // 只隔离本行内的控件；表格外的可聚焦滚动容器不属于行操作。
    if (control && event.currentTarget instanceof Element && event.currentTarget.contains(control)) return
    if (!item.disabled) activateRow?.(item, event)
    if (props.selectable && props.selectOnRowClick && !item.disabled) {
      playClickFeedback(event)
      toggleRowSelection(item.key, undefined, event.shiftKey)
    }
  }

  return {
    effectiveSelectedRowKeys, effectiveSelectedRowKeySet, allPages, excludedKeys,
    allVisibleRowsSelected, someVisibleRowsSelected, selectableVisibleRows,
    isRowSelected, isRowIndeterminate, toggleRowSelection, toggleAllVisibleRows,
    clearSelection, selectAllPages, handleRowClick,
  }
}
