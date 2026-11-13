import { computed, ref, type EmitFn } from 'vue'
import type { BingTableColumn, BingTableEmits, BingTableFixed, BingTableProps } from './BingTable.types'

type ColumnDefaults = 'columns' | 'defaultColumnWidths' | 'defaultColumnOrder' | 'defaultHiddenColumnKeys' | 'defaultColumnFixed'
type ColumnModels = 'columnWidths' | 'columnOrder' | 'hiddenColumnKeys' | 'columnFixed'
type ColumnStateProps = Required<Pick<BingTableProps, ColumnDefaults>> & Pick<BingTableProps, ColumnModels>
type ColumnStateEmits = Pick<BingTableEmits,
  'update:columnWidths' | 'update:columnOrder' | 'update:hiddenColumnKeys' | 'update:columnFixed' |
  'column-reorder' | 'column-visibility-change' | 'column-fixed-change'>
export interface BingTableResolvedColumn extends BingTableColumn { dataKey: string }

function hasOwn(object: object | undefined, key: string) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, key))
}
function isSameOrder(first: string[], second: string[]) {
  return first.length === second.length && first.every((key, index) => key === second[index])
}

/** 表头和独立列面板使用同一套列顺序、固定分组、可见性与重置规则。 */
export function useTableColumns(props: ColumnStateProps, emit: EmitFn<ColumnStateEmits>) {
  const localColumnWidths = ref<Record<string, number>>({ ...props.defaultColumnWidths })
  const localColumnOrder = ref<string[]>(
    props.defaultColumnOrder.length
      ? [...props.defaultColumnOrder]
      : props.columns.map((column) => column.key),
  )
  const localHiddenColumnKeys = ref<string[]>([
    ...new Set([
      ...props.defaultHiddenColumnKeys,
      ...props.columns.filter((column) => column.hidden).map((column) => column.key),
    ]),
  ])
  const localColumnFixed = ref<Record<string, BingTableFixed | null>>({
    ...props.defaultColumnFixed,
  })
  const allColumns = computed<BingTableResolvedColumn[]>(() =>
    props.columns.map((column) => ({
      ...column,
      dataKey: column.dataKey ?? column.key,
    })),
  )

  const effectiveColumnOrder = computed(() => {
    const configuredOrder = props.columnOrder ?? localColumnOrder.value

    return normalizeColumnOrderForFixed(configuredOrder)
  })

  const orderedColumns = computed<BingTableResolvedColumn[]>(() => {
    const columnMap = new Map(allColumns.value.map((column) => [column.key, column]))

    return effectiveColumnOrder.value
      .map((key) => columnMap.get(key))
      .filter((column): column is BingTableResolvedColumn => Boolean(column))
  })

  const effectiveHiddenColumnKeySet = computed(() => {
    const hiddenKeys = props.hiddenColumnKeys ?? localHiddenColumnKeys.value

    return new Set(hiddenKeys)
  })

  const visibleColumns = computed(() =>
    orderedColumns.value.filter((column) => !effectiveHiddenColumnKeySet.value.has(column.key)),
  )

  function getColumnFixed(column: BingTableColumn): BingTableFixed | null {
    if (hasOwn(props.columnFixed, column.key)) {
      return props.columnFixed?.[column.key] ?? null
    }

    if (hasOwn(localColumnFixed.value, column.key)) {
      return localColumnFixed.value[column.key] ?? null
    }

    return column.fixed ?? null
  }

  function getColumnByKey(key: string) {
    return allColumns.value.find((column) => column.key === key)
  }

  function getColumnFixedFromMap(
    key: string,
    fixedMap: Record<string, BingTableFixed | null> = props.columnFixed ?? localColumnFixed.value,
  ) {
    if (hasOwn(fixedMap, key)) {
      return fixedMap[key] ?? null
    }

    return getColumnByKey(key)?.fixed ?? null
  }

  function applyColumnFixed(nextFixed: Record<string, BingTableFixed | null>) {
    if (props.columnFixed === undefined) {
      localColumnFixed.value = nextFixed
    }

    emit('update:columnFixed', nextFixed)
  }

  function normalizeColumnOrder(order: string[]) {
    const knownKeys = new Set(allColumns.value.map((column) => column.key))
    const orderedKeys = order.filter(
      (key, index, keys) => knownKeys.has(key) && keys.indexOf(key) === index,
    )
    const missingKeys = allColumns.value
      .map((column) => column.key)
      .filter((key) => !orderedKeys.includes(key))

    return [...orderedKeys, ...missingKeys]
  }

  function normalizeColumnOrderForFixed(
    order: string[],
    fixedMap: Record<string, BingTableFixed | null> = props.columnFixed ?? localColumnFixed.value,
  ) {
    const normalizedOrder = normalizeColumnOrder(order)
    const leftFixedKeys = normalizedOrder.filter(
      (key) => getColumnFixedFromMap(key, fixedMap) === 'left',
    )
    const looseKeys = normalizedOrder.filter((key) => !getColumnFixedFromMap(key, fixedMap))
    const rightFixedKeys = normalizedOrder.filter(
      (key) => getColumnFixedFromMap(key, fixedMap) === 'right',
    )

    return [...leftFixedKeys, ...looseKeys, ...rightFixedKeys]
  }

  function applyColumnOrderValue(nextOrder: string[]) {
    if (props.columnOrder === undefined) {
      localColumnOrder.value = nextOrder
    }

    emit('update:columnOrder', nextOrder)
  }

  function reorderColumns(fromKey: string, toKey: string) {
    if (fromKey === toKey) {
      return
    }

    const currentOrder = effectiveColumnOrder.value
    const from = currentOrder.indexOf(fromKey)
    const to = currentOrder.indexOf(toKey)

    if (from < 0 || to < 0) {
      return
    }

    const nextOrder = [...currentOrder]
    const [movedKey] = nextOrder.splice(from, 1)

    if (!movedKey) {
      return
    }

    nextOrder.splice(to, 0, movedKey)
    const normalizedOrder = normalizeColumnOrderForFixed(nextOrder)
    const finalTo = normalizedOrder.indexOf(fromKey)

    applyColumnOrderValue(normalizedOrder)
    emit('column-reorder', {
      key: fromKey,
      from,
      to: finalTo,
      order: normalizedOrder,
    })
  }

  function applyColumnOrder(
    order: (string | number)[],
    movedKey: string | number,
    from: number,
    to: number,
  ) {
    const normalizedOrder = normalizeColumnOrderForFixed(order.map((key) => String(key)))
    const finalTo = normalizedOrder.indexOf(String(movedKey))

    applyColumnOrderValue(normalizedOrder)
    emit('column-reorder', {
      key: String(movedKey),
      from,
      to: finalTo === -1 ? to : finalTo,
      order: normalizedOrder,
    })
  }

  function toggleColumnVisibility(key: string, visible: boolean) {
    const currentKeys = props.hiddenColumnKeys ?? localHiddenColumnKeys.value
    const nextKeys = visible
      ? currentKeys.filter((hiddenKey) => hiddenKey !== key)
      : [...currentKeys, key].filter((hiddenKey, index, keys) => keys.indexOf(hiddenKey) === index)
    const nextVisibleCount = orderedColumns.value.filter((column) => !nextKeys.includes(column.key)).length

    if (nextVisibleCount === 0) {
      return
    }

    if (props.hiddenColumnKeys === undefined) {
      localHiddenColumnKeys.value = nextKeys
    }

    emit('update:hiddenColumnKeys', nextKeys)
    emit('column-visibility-change', {
      key,
      hidden: !visible,
      hiddenColumnKeys: nextKeys,
    })
  }

  function setColumnFixed(key: string, fixed: BingTableFixed | null) {
    const baseFixed = props.columnFixed ?? localColumnFixed.value
    const currentOrder = effectiveColumnOrder.value
    const nextFixed = {
      ...baseFixed,
      [key]: fixed,
    }
    const nextOrder = normalizeColumnOrderForFixed(currentOrder, nextFixed)

    applyColumnFixed(nextFixed)

    if (!isSameOrder(currentOrder, nextOrder)) {
      applyColumnOrderValue(nextOrder)
    }

    emit('column-fixed-change', {
      key,
      fixed,
      columnFixed: nextFixed,
    })
  }

  function resetColumns() {
    const nextWidths = { ...props.defaultColumnWidths }
    const nextOrder = props.defaultColumnOrder.length
      ? [...props.defaultColumnOrder]
      : props.columns.map((column) => column.key)
    const nextHiddenKeys = [
      ...new Set([
        ...props.defaultHiddenColumnKeys,
        ...props.columns.filter((column) => column.hidden).map((column) => column.key),
      ]),
    ]
    const nextFixed = { ...props.defaultColumnFixed }

    localColumnWidths.value = nextWidths
    localColumnOrder.value = nextOrder
    localHiddenColumnKeys.value = nextHiddenKeys
    localColumnFixed.value = nextFixed

    emit('update:columnWidths', nextWidths)
    emit('update:columnOrder', nextOrder)
    emit('update:hiddenColumnKeys', nextHiddenKeys)
    emit('update:columnFixed', nextFixed)
  }


  function applyColumnWidthsValue(widths: Record<string, number>) {
    if (props.columnWidths === undefined) localColumnWidths.value = widths
    emit('update:columnWidths', widths)
  }
  function applyHiddenColumnKeys(keys: string[]) {
    if (props.hiddenColumnKeys === undefined) localHiddenColumnKeys.value = keys
    emit('update:hiddenColumnKeys', keys)
  }
  function isColumnHidden(key: string) {
    return effectiveHiddenColumnKeySet.value.has(key)
  }
  return { localColumnWidths, localColumnFixed, allColumns, getColumnByKey, effectiveColumnOrder, orderedColumns,
    effectiveHiddenColumnKeySet, visibleColumns, getColumnFixed, isColumnHidden, applyColumnFixed,
    applyColumnOrderValue, applyColumnWidthsValue, applyHiddenColumnKeys, reorderColumns, applyColumnOrder,
    toggleColumnVisibility, setColumnFixed, resetColumns }
}
