import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTableData } from './useTableData'
import { useTableSelection } from './useTableSelection'
import { TableHeightIndex } from './tableHeightIndex'
import type { BingTableColumn, BingTableKey, BingTableRow } from '../BingTable.types'

enableAutoUnmount(afterEach)
function setupTable(options: { data?: BingTableRow[]; selection?: Partial<Parameters<typeof useTableSelection>[0]>; dataProps?: Partial<Parameters<typeof useTableData>[0]>; columns?: BingTableColumn[] } = {}) {
  const data = ref(options.data ?? [{ id: 'a', score: 30 }, { id: 'b', score: 20, disabled: true }, { id: 'c', score: 10 }, { id: 'd', score: 40 }])
  const columns = ref(options.columns ?? [{ key: 'score', sortable: true }])
  const expanded = ref(new Set<BingTableKey>())
  const props = reactive({
    defaultPage: 1, defaultPageSize: 2, defaultSortKey: null, defaultSortOrder: null,
    remoteSort: false, pagination: false, remotePagination: false, rowKey: 'id', childrenKey: 'children', rowDisabled: 'disabled',
    defaultSelectedRowKeys: [], selectionMode: 'multiple' as const, selectable: true, selectOnRowClick: true,
    ...options.dataProps, ...options.selection,
  })
  const emit = vi.fn()
  let table!: ReturnType<typeof useTableData>
  let selection!: ReturnType<typeof useTableSelection>
  mount(defineComponent({ setup() {
    table = useTableData(props, emit, {
      displayedData: data, isBusy: ref(false), settledTotal: ref(undefined), allColumns: columns,
      effectiveExpandedRowKeySet: expanded, beginPageSizeTransition: vi.fn(),
    })
    selection = useTableSelection(props, emit, { ...table, resetKey: table.selectionEpoch })
    return () => h('div')
  } }))
  const payload = () => emit.mock.calls.filter(call => call[0] === 'selection-change').at(-1)?.[1]
  return { data, columns, expanded, props, emit, table, selection, payload }
}

describe('表格选择与数据契约', () => {
  it('范围选择和取消使用当前排序且跳过禁用行，排序/分页/替换数据清除锚点', () => {
    const { table, selection, data } = setupTable()
    selection.toggleRowSelection('a', true)
    selection.toggleRowSelection('c', true, true)
    expect(selection.effectiveSelectedRowKeys.value).toEqual(['a', 'c'])
    selection.toggleRowSelection('d', false, true)
    expect(selection.effectiveSelectedRowKeys.value).toEqual([])
    table.toggleSort({ key: 'score', sortable: true })
    selection.toggleRowSelection('d', true, true)
    expect(selection.effectiveSelectedRowKeys.value).toEqual(['d'])
    data.value = [...data.value]
    selection.toggleRowSelection('c', true, true)
    expect(selection.effectiveSelectedRowKeys.value).toEqual(['d', 'c'])
  })

  it('级联选择包含折叠子树，父项由叶子推导全选/半选，禁用节点不阻断可选后代', () => {
    const { selection } = setupTable({
      selection: { selectionStrategy: 'cascade' },
      data: [{ id: 'parent', children: [{ id: 'one' }, { id: 'group', children: [{ id: 'two' }] }, { id: 'off', disabled: true, children: [{ id: 'reachable' }] }] }],
    })
    selection.toggleRowSelection('one', true)
    expect(selection.isRowIndeterminate('parent')).toBe(true)
    selection.toggleRowSelection('parent', true)
    expect(selection.effectiveSelectedRowKeys.value).toEqual(['one', 'two', 'reachable'])
    expect(selection.isRowSelected('parent')).toBe(true)
    expect(selection.isRowSelected('group')).toBe(true)
    expect(selection.isRowSelected('off')).toBe(false)
    selection.toggleRowSelection('two', false)
    expect(selection.isRowIndeterminate('parent')).toBe(true)
    selection.toggleRowSelection('parent', false)
    expect(selection.effectiveSelectedRowKeys.value).toEqual([])
  })

  it('独立选择和单选不会引入级联副作用', () => {
    const data = [{ id: 'p', children: [{ id: 'c' }] }]
    const independent = setupTable({ data })
    independent.selection.toggleRowSelection('p')
    expect(independent.selection.effectiveSelectedRowKeys.value).toEqual(['p'])
    const single = setupTable({ data, selection: { selectionMode: 'single', selectionStrategy: 'cascade' } })
    single.selection.toggleRowSelection('p')
    single.selection.toggleRowSelection('c')
    expect(single.selection.effectiveSelectedRowKeys.value).toEqual(['c'])
  })

  it('远程换页保留所选行对象，取消选择后不再返回旧缓存', () => {
    const { selection, data, payload } = setupTable({ data: [{ id: 'a', label: 'A' }], dataProps: { remotePagination: true } })
    selection.toggleRowSelection('a')
    data.value = [{ id: 'b', label: 'B' }]
    selection.toggleRowSelection('b')
    expect(payload()).toEqual({ keys: ['a', 'b'], rows: [{ id: 'b', label: 'B' }, { id: 'a', label: 'A' }] })
    data.value = [{ id: 'a', label: '新版 A' }]
    selection.toggleRowSelection('a', false)
    expect(payload()).toEqual({ keys: ['b'], rows: [{ id: 'b', label: 'B' }] })
    selection.clearSelection()
    expect(payload().rows).toEqual([])
  })

  it('远程全选用 allPages 和排除集表达，翻页仍选中，清除时明确退出', () => {
    const { selection, data, payload } = setupTable({ dataProps: { remotePagination: true } })
    selection.selectAllPages()
    expect(payload()).toMatchObject({ keys: [], allPages: true, excludedKeys: [] })
    selection.toggleRowSelection('a', false)
    expect(payload()).toMatchObject({ keys: [], allPages: true, excludedKeys: ['a'] })
    data.value = [{ id: 'next' }]
    expect(selection.isRowSelected('next')).toBe(true)
    selection.toggleAllVisibleRows(false)
    expect(payload().excludedKeys).toEqual(['a', 'next'])
    selection.clearSelection()
    expect(payload()).toEqual({ keys: [], rows: [], allPages: false, excludedKeys: [] })
  })

  it('远程全选受控模型只提议，不越过父级状态', () => {
    const { selection, props, emit, payload } = setupTable({ dataProps: { remotePagination: true }, selection: { allPagesSelected: false, excludedRowKeys: [], selectedRowKeys: [] } })
    selection.selectAllPages()
    expect(selection.allPages.value).toBe(false)
    expect(emit).toHaveBeenCalledWith('update:allPagesSelected', true)
    props.allPagesSelected = true
    selection.toggleRowSelection('a', false)
    expect(selection.isRowSelected('a')).toBe(true)
    expect(payload().excludedKeys).toEqual(['a'])
    props.excludedRowKeys = ['a']
    expect(selection.isRowSelected('a')).toBe(false)
  })

  it('受控模型在同一批次进入全选时，不误删之前页的已加载行', async () => {
    const { selection, props, data, payload } = setupTable({ data: [{ id: 'a' }], dataProps: { remotePagination: true }, selection: { selectedRowKeys: ['a'], allPagesSelected: false, excludedRowKeys: [] } })
    data.value = [{ id: 'b' }]
    props.selectedRowKeys = []
    props.allPagesSelected = true
    await nextTick()
    selection.toggleRowSelection('b', false)
    expect(payload()).toEqual({ keys: [], rows: [{ id: 'a' }], allPages: true, excludedKeys: ['b'] })
  })

  it('本地跨页全选覆盖全部数据但跳过禁用行', () => {
    const { selection } = setupTable({ dataProps: { pagination: true } })
    selection.selectAllPages()
    expect(selection.effectiveSelectedRowKeys.value).toEqual(['a', 'c', 'd'])
  })

  it('排序循环支持降序优先和不可取消，远程排序也清除范围锚点', () => {
    const { table, columns, selection } = setupTable({ columns: [{ key: 'score', sortable: true, sortDirections: ['desc', 'asc'] }], dataProps: { remoteSort: true } })
    selection.toggleRowSelection('a', true)
    table.toggleSort(columns.value[0]!)
    expect(table.effectiveSortOrder.value).toBe('desc')
    selection.toggleRowSelection('d', true, true)
    expect(selection.effectiveSelectedRowKeys.value).toEqual(['a', 'd'])
    table.toggleSort(columns.value[0]!)
    expect(table.effectiveSortOrder.value).toBe('asc')
    table.toggleSort(columns.value[0]!)
    expect(table.effectiveSortOrder.value).toBe('desc')
  })

  it('分页和展开后的 ARIA 索引反映完整数据位置', () => {
    const { table, expanded } = setupTable({ data: [{ id: 'p', children: [{ id: 'child' }] }, { id: 'b' }, { id: 'c' }], dataProps: { pagination: true } })
    expanded.value = new Set(['p'])
    expect(table.ariaRowCount.value).toBe(5)
    expect(table.visibleFlatRows.value.map(item => item.rowIndex)).toEqual([2, 3, 4])
    table.setPage(2)
    expect(table.visibleFlatRows.value[0]).toMatchObject({ rowIndex: 5, index: 0 })
    const remote = setupTable({ dataProps: { pagination: true, remotePagination: true, page: 3, pageSize: 10, total: 100 } })
    expect(remote.table.ariaRowCount.value).toBe(101)
    expect(remote.table.visibleFlatRows.value[0]).toMatchObject({ rowIndex: 22, posInSet: 21 })
  })
})

describe('可变行高前缀索引', () => {
  it('均高、增高、缩短、恢复均高均与线性参考结果一致', () => {
    const heights = Array.from({ length: 137 }, () => 40)
    const index = new TableHeightIndex(heights)
    for (let turn = 0; turn < 180; turn++) {
      const row = (turn * 37) % heights.length
      const height = turn % 3 ? 32 + (turn * 19) % 145 : 40
      heights[row] = height
      index.update(row, height)
      let sum = 0
      heights.forEach((value, position) => {
        expect(index.offset(position)).toBe(sum)
        expect(index.indexAt(sum)).toBe(position)
        expect(index.indexAt(sum + value - 0.5)).toBe(position)
        sum += value
      })
      expect(index.offset(heights.length)).toBe(sum)
      expect(index.indexAt(sum + 1)).toBe(heights.length - 1)
    }
    heights.forEach((_, row) => index.update(row, 40))
    expect(index.uniformHeight).toBe(40)
    expect(index.offset(100)).toBe(4000)
  })
})
