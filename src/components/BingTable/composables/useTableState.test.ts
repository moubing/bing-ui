import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BingTableFlatRow } from '../BingTable.internal'
import type { BingTableKey, BingTableRow } from '../BingTable.types'
import { useTableLoading } from './useTableLoading'
import { useTableSelection } from './useTableSelection'

enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())

function mountComposable<T>(setup: () => T) {
  let state!: T
  const wrapper = mount(defineComponent({ setup() { state = setup(); return () => h('div') } }))
  return { state, wrapper }
}

function item(key: BingTableKey, disabled = false): BingTableFlatRow {
  return { key, row: { id: key }, disabled, index: 0, level: 0, path: [0], parentKey: null, hasChildren: false, expanded: false }
}

describe('useTableSelection', () => {
  function selection(overrides: Partial<Parameters<typeof useTableSelection>[0]> = {}) {
    const props = reactive<Parameters<typeof useTableSelection>[0]>({
      defaultSelectedRowKeys: [], selectionMode: 'multiple', selectable: true, selectOnRowClick: true, ...overrides,
    })
    const visibleFlatRows = ref([item('a'), item('disabled', true)])
    const allKnownFlatRows = ref([...visibleFlatRows.value, item('other-page')])
    const emit = vi.fn()
    const { state } = mountComposable(() => useTableSelection(props, emit, { visibleFlatRows, allKnownFlatRows }))
    return { props, emit, state, visibleFlatRows }
  }

  it('当前页全选跳过禁用行，保留其他页选择，并按已知行顺序返回 rows', () => {
    const { state, emit } = selection({ defaultSelectedRowKeys: ['other-page'] })
    state.toggleAllVisibleRows(true)
    expect(state.effectiveSelectedRowKeys.value).toEqual(['other-page', 'a'])
    expect(state.allVisibleRowsSelected.value).toBe(true)
    expect(emit).toHaveBeenLastCalledWith('selection-change', { keys: ['other-page', 'a'], rows: [{ id: 'a' }, { id: 'other-page' }] })
    state.toggleAllVisibleRows(false)
    expect(state.effectiveSelectedRowKeys.value).toEqual(['other-page'])
  })

  it('受控选择以父级值为准，清除也只发事件', () => {
    const { state, props, emit } = selection({ selectedRowKeys: ['a'] })
    state.clearSelection()
    expect(state.effectiveSelectedRowKeys.value).toEqual(['a'])
    expect(emit).toHaveBeenLastCalledWith('selection-change', { keys: [], rows: [] })
    props.selectedRowKeys = []
    expect(state.allVisibleRowsSelected.value).toBe(false)
    state.toggleRowSelection('disabled')
    state.toggleRowSelection('missing')
    expect(emit).toHaveBeenCalledTimes(2)
  })

  it('单选替换旧值，忽略全选，重复指定选中不会增加重复 key', () => {
    const { state, emit } = selection({ selectionMode: 'single', defaultSelectedRowKeys: ['other-page'] })
    state.toggleAllVisibleRows(true)
    expect(emit).not.toHaveBeenCalled()
    state.toggleRowSelection('a', true)
    state.toggleRowSelection('a', true)
    expect(state.effectiveSelectedRowKeys.value).toEqual(['a'])
    expect(state.allVisibleRowsSelected.value).toBe(false)
  })

  it('业务取消行点击时仍收到原生事件，但不切换选择', () => {
    const { state, emit } = selection()
    const event = new MouseEvent('click', { cancelable: true })
    emit.mockImplementation((name: string) => { if (name === 'row-click') event.preventDefault() })
    state.handleRowClick(item('a'), event)
    expect(emit.mock.calls).toEqual([['row-click', { id: 'a' }, event]])
    expect(state.effectiveSelectedRowKeys.value).toEqual([])
  })
})

describe('useTableLoading', () => {
  it('短请求保持 settled 行，结束后更新数据且不闪出指示器', async () => {
    vi.useFakeTimers()
    const initial = [{ id: 'old' }]
    const props = reactive({ data: initial as BingTableRow[], loading: false, total: 10 })
    const { state } = mountComposable(() => useTableLoading(props))
    props.loading = true
    props.data = []
    props.total = 0
    await nextTick()
    expect(state.displayedData.value).toEqual(initial)
    expect(state.settledTotal.value).toBe(10)
    await vi.advanceTimersByTimeAsync(100)
    props.data = [{ id: 'new' }]
    props.loading = false
    await nextTick()
    expect(state.displayedData.value).toEqual([{ id: 'new' }])
    expect(state.isLoadingVisible.value).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('显示后至少停留 250ms，再提交新数据；卸载取消未显示的计时器', async () => {
    vi.useFakeTimers()
    const props = reactive({ data: [{ id: 'old' }] as BingTableRow[], loading: true, total: 10 })
    const { state, wrapper } = mountComposable(() => useTableLoading(props))
    await vi.advanceTimersByTimeAsync(150)
    expect(state.isLoadingVisible.value).toBe(true)
    props.data = [{ id: 'new' }]
    props.loading = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(249)
    expect(state.isBusy.value).toBe(true)
    expect(state.displayedData.value).toEqual([{ id: 'old' }])
    await vi.advanceTimersByTimeAsync(1)
    expect(state.isBusy.value).toBe(false)
    expect(state.displayedData.value).toEqual([{ id: 'new' }])
    props.loading = true
    await nextTick()
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
