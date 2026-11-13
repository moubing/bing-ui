import { reactive, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { BingTableColumn, BingTableKey, BingTableRow } from '../BingTable.types'
import { useTableData } from './useTableData'
import { useTableExpansion } from './useTableExpansion'

const columns: BingTableColumn[] = [{ key: 'score', sortable: true }]
const rows: BingTableRow[] = [
  { id: 'a', score: 20, children: [{ id: 'a-1', score: 7 }, { id: 'a-2', score: 3 }] },
  { id: 'b', score: 10 },
  { id: 'c', score: 30 },
]

function createData(overrides: Partial<Parameters<typeof useTableData>[0]> = {}) {
  const props = reactive<Parameters<typeof useTableData>[0]>({
    defaultPage: 1, defaultPageSize: 2, defaultSortKey: null, defaultSortOrder: null,
    remoteSort: false, pagination: true, remotePagination: false,
    rowKey: 'id', childrenKey: 'children', ...overrides,
  })
  const emit = vi.fn()
  const expanded = ref(new Set<BingTableKey>())
  const data = ref(rows)
  const busy = ref(false)
  const settledTotal = ref<number | undefined>(undefined)
  const beginPageSizeTransition = vi.fn()
  const table = useTableData(props, emit, {
    displayedData: data, isBusy: busy, settledTotal, allColumns: ref(columns),
    effectiveExpandedRowKeySet: expanded, beginPageSizeTransition,
  })
  return { props, emit, expanded, data, busy, settledTotal, beginPageSizeTransition, table }
}

describe('useTableData — 数据索引与排序分页', () => {
  it('先分页根行，再展开子行；全量结果保留折叠子树', () => {
    const { table, expanded } = createData()
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['a', 'b'])
    expect(table.allKnownFlatRows.value.map(item => item.key)).toEqual(['a', 'a-1', 'a-2', 'b', 'c'])
    expanded.value = new Set(['a'])
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['a', 'a-1', 'a-2', 'b'])
    expect(table.visibleFlatRows.value[2]).toMatchObject({ parentKey: 'a', level: 1, index: 2, path: [0, 1] })
    table.setPage(2)
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['c'])
    expect(table.totalItems.value).toBe(3)
  })

  it('rowKey 使用原始同级序号和路径，展开、排序、分页不重建索引', () => {
    const rowKey = vi.fn((row: BingTableRow, index: number, path: number[]) => `${row.id}:${index}:${path.join('.')}`)
    const { table, expanded } = createData({ rowKey, pagination: false })
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['a:0:0', 'b:1:1', 'c:2:2'])
    expanded.value = new Set(['a:0:0'])
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['a:0:0', 'a-1:0:0.0', 'a-2:1:0.1', 'b:1:1', 'c:2:2'])
    const index = table.itemsByKey.value
    table.toggleSort(columns[0])
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['b:1:1', 'a:0:0', 'a-1:0:0.0', 'a-2:1:0.1', 'c:2:2'])
    table.setPage(2)
    expect(table.itemsByKey.value).toBe(index)
    expect(rowKey).toHaveBeenCalledTimes(5)
  })

  it('排序只影响根行，保持子行顺序并按升序、降序、取消循环', () => {
    const { table, expanded, data } = createData({ pagination: false })
    expanded.value = new Set(['a'])
    table.toggleSort(columns[0])
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['b', 'a', 'a-1', 'a-2', 'c'])
    table.toggleSort(columns[0])
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['c', 'a', 'a-1', 'a-2', 'b'])
    table.toggleSort(columns[0])
    expect(table.effectiveSortKey.value).toBeNull()
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['a', 'a-1', 'a-2', 'b', 'c'])
    expect(data.value.map(row => row.id)).toEqual(['a', 'b', 'c'])
  })

  it('远程排序和远程分页独立，忙碌期间使用 settled 总数', () => {
    const { table, props, busy, settledTotal } = createData({ remoteSort: true, total: 50 })
    table.toggleSort(columns[0])
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['a', 'b'])
    props.remotePagination = true
    expect(table.visibleFlatRows.value.map(item => item.key)).toEqual(['a', 'b', 'c'])
    settledTotal.value = 30
    busy.value = true
    expect(table.pageCount.value).toBe(15)
    busy.value = false
    expect(table.pageCount.value).toBe(25)
  })

  it('受控页码、页大小和排序只发出提议，不改写父级接受值', () => {
    const { table, emit, beginPageSizeTransition } = createData({ page: 2, pageSize: 2, sortKey: null, sortOrder: null })
    table.setPageSize(10)
    expect(beginPageSizeTransition).toHaveBeenCalledWith(10)
    expect(table.effectivePage.value).toBe(2)
    expect(table.effectivePageSize.value).toBe(2)
    expect(emit.mock.calls).toEqual([
      ['update:pageSize', 10], ['update:page', 1], ['page-change', { page: 1, pageSize: 10 }],
    ])
    table.toggleSort(columns[0])
    expect(table.effectiveSortKey.value).toBeNull()
    expect(emit).toHaveBeenLastCalledWith('sort-change', { key: 'score', order: 'asc', column: columns[0] })
  })

  it('页大小过渡先读取旧页，再发出更新；无效的 Select 值不触发变化', () => {
    const { table, emit, beginPageSizeTransition } = createData()
    beginPageSizeTransition.mockImplementation(() => expect(table.effectivePageSize.value).toBe(2))
    table.handlePageSizeSelectChange(null)
    table.handlePageSizeSelectChange([10])
    expect(emit).not.toHaveBeenCalled()
    table.handlePageSizeSelectChange('10')
    expect(table.effectivePageSize.value).toBe(10)
    expect(beginPageSizeTransition).toHaveBeenCalledOnce()
  })
})

describe('useTableExpansion', () => {
  it('默认值不修改原数组，忽略未知 key 和叶子，响应受控值切换', () => {
    const { table } = createData()
    const defaults: BingTableKey[] = []
    const props = reactive({ defaultExpandedRowKeys: defaults, expandedRowKeys: undefined as BingTableKey[] | undefined })
    const emit = vi.fn()
    const expansion = useTableExpansion(props, emit, () => table.allKnownFlatRows.value)
    expansion.toggleRowExpansion('missing')
    expansion.toggleRowExpansion('b')
    expect(emit).not.toHaveBeenCalled()
    expansion.toggleRowExpansion('a')
    expect(defaults).toEqual([])
    expect(expansion.effectiveExpandedRowKeys.value).toEqual(['a'])
    expect(emit).toHaveBeenLastCalledWith('expand-change', expect.objectContaining({ key: 'a', expanded: true }))
    props.expandedRowKeys = []
    expansion.toggleRowExpansion('a', true)
    expect(expansion.effectiveExpandedRowKeys.value).toEqual([])
    props.expandedRowKeys = ['a']
    expect(expansion.effectiveExpandedRowKeySet.value.has('a')).toBe(true)
  })
})
