import { computed, type Ref } from 'vue'
import type { BingSelectOption } from '../../BingSelect/BingSelect.types'
import type { BingTableProps } from '../BingTable.types'
import type { BingTableFlatRow, BingTablePagerSnapshot } from '../BingTable.internal'
import { clamp } from '../BingTable.utils'

type PagerProps = Required<Pick<BingTableProps, 'pagination' | 'defaultPageSize' | 'pageSizeOptions'>> & Pick<BingTableProps, 'pageSize'>
interface PagerOptions {
  effectivePage: Readonly<Ref<number>>
  effectivePageSize: Readonly<Ref<number>>
  pageCount: Readonly<Ref<number>>
  totalItems: Readonly<Ref<number>>
  visibleFlatRows: Readonly<Ref<BingTableFlatRow[]>>
}

export function useTablePager(
  props: PagerProps,
  {
    effectivePage, effectivePageSize, pageCount, totalItems, visibleFlatRows,
  }: PagerOptions,
) {
  const visiblePageNumbers = computed(() => {
    const total = pageCount.value
    const current = clamp(effectivePage.value, 1, total)
    const start = clamp(current - 2, 1, Math.max(1, total - 4))
    const end = Math.min(total, start + 4)
    const pages: number[] = []

    for (let page = start; page <= end; page += 1) {
      pages.push(page)
    }

    return pages
  })

  const currentPagerSnapshot = computed<BingTablePagerSnapshot>(() => ({
    page: clamp(effectivePage.value, 1, pageCount.value),
    pageCount: pageCount.value,
    pageNumbers: visiblePageNumbers.value,
  }))

  const normalizedPageSizeOptions = computed(() => {
    const options = props.pageSizeOptions
      .map((option) => Math.round(option))
      .filter((option) => option > 0)
    const defaultPageSize = Math.max(1, Math.round(props.defaultPageSize))
    const controlledPageSize =
      props.pageSize === undefined ? undefined : Math.max(1, Math.round(props.pageSize))
    const uniqueOptions = [...new Set([...options, defaultPageSize, controlledPageSize])]
      .filter((option): option is number => typeof option === 'number')

    return uniqueOptions.sort((left, right) => left - right)
  })

  const pageSizeSelectOptions = computed<BingSelectOption[]>(() =>
    normalizedPageSizeOptions.value.map((option) => ({
      label: String(option),
      value: option,
    })),
  )

  const pageRangeText = computed(() => {
    if (!props.pagination || totalItems.value === 0) {
      return `共 ${visibleFlatRows.value.length} 条`
    }

    const start = Math.min(totalItems.value, (effectivePage.value - 1) * effectivePageSize.value + 1)
    const end = Math.min(totalItems.value, effectivePage.value * effectivePageSize.value)

    return `${start}-${end} / 共 ${totalItems.value} 条`
  })


  return {
    currentPagerSnapshot, pageSizeSelectOptions, pageRangeText,
  }
}
