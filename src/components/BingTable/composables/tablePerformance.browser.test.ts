import { afterEach, expect, it } from 'vitest'
import { createApp, h, nextTick, reactive, ref, type App } from 'vue'
import { useTableData } from './useTableData'
import { useTableSelection } from './useTableSelection'
import type { BingTableKey } from '../BingTable.types'

let app: App | undefined
let host: HTMLElement | undefined
afterEach(() => { app?.unmount(); host?.remove() })

it.each([10000, 50000])('%i 行数据的选择、排序和展开复用索引（无头 Chromium 计算基准）', async count => {
  const props = reactive({
    defaultPage: 1, defaultPageSize: 20, defaultSortKey: null, defaultSortOrder: null,
    remoteSort: false, pagination: false, remotePagination: false, rowKey: 'id', childrenKey: 'children',
    defaultSelectedRowKeys: [] as BingTableKey[], selectionMode: 'multiple' as const, selectable: true, selectOnRowClick: false,
  })
  const data = ref(Array.from({ length: count }, (_, index) => ({ id: index, name: `项目 ${(index * 7919) % count}`, children: index === 0 ? [{ id: 'child', name: '子项' }] : [] })))
  const expanded = ref(new Set<BingTableKey>())
  let table!: ReturnType<typeof useTableData>
  let selection!: ReturnType<typeof useTableSelection>
  const column = { key: 'name', sortable: true }
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({ setup() {
    table = useTableData(props, () => {}, { displayedData: data, isBusy: ref(false), settledTotal: ref(undefined), allColumns: ref([column]), effectiveExpandedRowKeySet: expanded, beginPageSizeTransition: () => {} })
    selection = useTableSelection(props, () => {}, { ...table, resetKey: table.selectionEpoch })
    return () => h('div')
  } })
  app.mount(host)
  const originalIndex = table.itemsByKey.value
  void table.visibleFlatRows.value
  const samples = { selection: [] as number[], sort: [] as number[], expansion: [] as number[] }
  const measure = (name: keyof typeof samples, action: () => void) => {
    const start = performance.now()
    action()
    samples[name].push(performance.now() - start)
  }
  for (let run = 0; run < 4; run++) {
    measure('selection', () => { selection.toggleAllVisibleRows(run % 2 === 0); void selection.allVisibleRowsSelected.value })
    measure('sort', () => { table.toggleSort(column); void table.visibleFlatRows.value })
    measure('expansion', () => { expanded.value = new Set(run % 2 ? [] : [0]); void table.visibleFlatRows.value })
    await nextTick()
  }
  expect(table.itemsByKey.value).toBe(originalIndex)
  expect(table.allKnownFlatRows.value).toHaveLength(count + 1)
  console.info('TABLE_COMPUTE_MS', JSON.stringify({ count, ...Object.fromEntries(Object.entries(samples).map(([key, values]) => [key, { median: +[...values].sort((a, b) => a - b)[2]!.toFixed(1), max: +Math.max(...values).toFixed(1) }])) }))
}, 30000)
