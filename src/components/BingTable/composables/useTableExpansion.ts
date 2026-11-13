import { computed, ref, type EmitFn } from 'vue'
import type { BingTableEmits, BingTableKey, BingTableProps } from '../BingTable.types'
import type { BingTableFlatRow } from '../BingTable.internal'

type ExpansionProps = Required<Pick<BingTableProps, 'defaultExpandedRowKeys'>> & Pick<BingTableProps, 'expandedRowKeys'>
type ExpansionEmits = Pick<BingTableEmits, 'update:expandedRowKeys' | 'expand-change'>

export function useTableExpansion(
  props: ExpansionProps,
  emit: EmitFn<ExpansionEmits>,
  getRows: () => BingTableFlatRow[],
) {
  const localExpandedRowKeys = ref<BingTableKey[]>([...props.defaultExpandedRowKeys])

  const effectiveExpandedRowKeys = computed(() => props.expandedRowKeys ?? localExpandedRowKeys.value)

  const effectiveExpandedRowKeySet = computed(() => new Set(effectiveExpandedRowKeys.value))
  const rowsByKey = computed(() => new Map(getRows().map(item => [item.key, item])))

  function updateExpandedKeys(keys: BingTableKey[], changedItem?: BingTableFlatRow, expanded = false) {
    const uniqueKeys = [...new Set(keys)]

    if (props.expandedRowKeys === undefined) {
      localExpandedRowKeys.value = uniqueKeys
    }

    emit('update:expandedRowKeys', uniqueKeys)

    if (changedItem) {
      emit('expand-change', {
        key: changedItem.key,
        row: changedItem.row,
        expanded,
        expandedRowKeys: uniqueKeys,
      })
    }
  }

  function toggleRowExpansion(key: BingTableKey, expanded?: boolean) {
    const item = rowsByKey.value.get(key)

    if (!item || !item.hasChildren) {
      return
    }

    const isExpanded = effectiveExpandedRowKeySet.value.has(key)
    const nextExpanded = expanded ?? !isExpanded
    const nextKeys = nextExpanded
      ? [...effectiveExpandedRowKeys.value, key]
      : effectiveExpandedRowKeys.value.filter((expandedKey) => expandedKey !== key)

    updateExpandedKeys(nextKeys, item, nextExpanded)
  }


  return {
    localExpandedRowKeys, effectiveExpandedRowKeys, effectiveExpandedRowKeySet, toggleRowExpansion,
  }
}
