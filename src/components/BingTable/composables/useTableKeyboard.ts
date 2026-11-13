import { nextTick, onBeforeUnmount, onMounted, ref, watch, type InjectionKey, type ObjectDirective, type Ref } from 'vue'
import type { BingTableColumn, BingTableKey } from '../BingTable.types'
import type { BingTableFlatRow } from '../BingTable.internal'
import { tableInteractiveSelector } from '../BingTable.utils'

export interface TableCellAddress {
  rowKey: BingTableKey | null
  columnKey: string | null
}
interface CellRecord {
  element: HTMLElement
  address: TableCellAddress
  originalTabindex: string | null
  controls: Map<HTMLElement, { original: string | null; written: string | null }>
}
interface KeyboardOptions {
  enabled: Readonly<Ref<boolean>>
  rootRef: Readonly<Ref<HTMLElement | null>>
  rows: Readonly<Ref<BingTableFlatRow[]>>
  columns: Readonly<Ref<BingTableColumn[]>>
  selectable: Readonly<Ref<boolean>>
  allSelected: Readonly<Ref<boolean>>
  focusedRowKey: Ref<BingTableKey | null>
  isTreeCell: (column: BingTableColumn) => boolean
  sort: (column: BingTableColumn) => void
  resize: (column: BingTableColumn, event: KeyboardEvent) => void
  moveColumn: (key: string, direction: number) => void
  toggleSelection: (key: BingTableKey, selected?: boolean, range?: boolean) => void
  toggleAll: (selected: boolean) => void
  toggleExpansion: (key: BingTableKey, expanded?: boolean) => void
  activate: (item: BingTableFlatRow, event: KeyboardEvent) => void
  scrollToRow: (key: BingTableKey, nearest?: boolean) => void
  pageTarget: (key: BingTableKey, direction: number) => number
  reveal: (element: HTMLElement) => void
}

export function useTableKeyboard(options: KeyboardOptions) {
  const { enabled, rootRef, rows, columns, selectable, focusedRowKey } = options
  const focusedColumn = ref<string | null>(selectable.value ? null : columns.value[0]?.key ?? null)
  const cells = new Map<HTMLElement, CellRecord>()
  let editing: CellRecord | undefined
  let observer: MutationObserver | undefined
  let scheduled = false
  let disposed = false
  const same = (a: TableCellAddress, b: TableCellAddress) => a.rowKey === b.rowKey && a.columnKey === b.columnKey
  const address = () => ({ rowKey: focusedRowKey.value, columnKey: focusedColumn.value })
  const columnKeys = () => [...(selectable.value ? [null] : []), ...columns.value.map(column => column.key)]
  const setTabindex = (element: HTMLElement, value: string | null) => {
    if (element.getAttribute('tabindex') === value) return
    if (value === null) element.removeAttribute('tabindex'); else element.setAttribute('tabindex', value)
  }

  function sync(record: CellRecord) {
    const { element, controls } = record
    setTabindex(element, enabled.value ? (same(record.address, address()) ? '0' : '-1') : record.originalTabindex)
    for (const [control, state] of controls) {
      if (!element.contains(control)) { setTabindex(control, state.original); controls.delete(control) }
    }
    for (const control of element.querySelectorAll<HTMLElement>(tableInteractiveSelector)) {
      if (control.closest('[data-bing-table-cell]') !== element || control.closest('.bing-table') !== rootRef.value) continue
      let state = controls.get(control)
      const current = control.getAttribute('tabindex')
      if (!state) { state = { original: current, written: current }; controls.set(control, state) }
      else if (current !== state.written) state.original = current
      const value = enabled.value && editing !== record ? '-1' : state.original
      setTabindex(control, value)
      state.written = value
    }
  }
  function refresh() { for (const record of cells.values()) sync(record) }
  function schedule() {
    if (scheduled || disposed) return
    scheduled = true
    queueMicrotask(() => { scheduled = false; if (!disposed) refresh() })
  }
  function restore(record: CellRecord) {
    setTabindex(record.element, record.originalTabindex)
    for (const [element, state] of record.controls) setTabindex(element, state.original)
  }
  const cellDirective: ObjectDirective<HTMLElement, TableCellAddress> = {
    mounted(element, binding) {
      const record = { element, address: binding.value, originalTabindex: element.getAttribute('tabindex'), controls: new Map() }
      cells.set(element, record)
      element.dataset.bingTableCell = ''
      sync(record)
    },
    updated(element, binding) {
      const record = cells.get(element)
      if (record) { record.address = binding.value; sync(record) }
    },
    beforeUnmount(element) {
      const record = cells.get(element)
      if (record) { restore(record); if (editing === record) editing = undefined }
      cells.delete(element)
    },
  }
  function fromTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return undefined
    const element = target.closest<HTMLElement>('[data-bing-table-cell]')
    return element ? cells.get(element) : undefined
  }
  function availableControls(record: CellRecord) {
    sync(record)
    return [...record.controls].filter(([element, state]) => {
      if (state.original !== null && Number(state.original) < 0) return false
      return !element.matches(':disabled,[disabled],[aria-disabled="true"]') &&
        !element.closest('[hidden],[inert]') && element.getClientRects().length > 0
    }).map(([element]) => element)
  }
  async function focusCell(rowKey: BingTableKey | null, column: string | number = focusedColumn.value ?? 0) {
    const keys = columnKeys()
    const key = typeof column === 'number' ? keys[Math.max(0, Math.min(keys.length - 1, column))] : column
    if (!enabled.value || key === undefined) return
    if (rowKey !== null && !rows.value.some(item => item.key === rowKey)) return
    editing = undefined
    focusedRowKey.value = rowKey
    focusedColumn.value = keys.includes(key) ? key : keys[0] ?? null
    if (rowKey !== null) options.scrollToRow(rowKey, true)
    await nextTick()
    if (disposed) return
    refresh()
    const record = [...cells.values()].find(record => same(record.address, address()))
    record?.element.focus({ preventScroll: true })
    if (record) options.reveal(record.element)
  }
  function handleFocusin(event: FocusEvent) {
    const record = fromTarget(event.target)
    if (!record) return
    options.reveal(record.element)
    if (event.target instanceof HTMLElement && event.target !== record.element) options.reveal(event.target)
    if (!enabled.value) return
    focusedRowKey.value = record.address.rowKey
    focusedColumn.value = record.address.columnKey
    editing = event.target !== record.element ? record : undefined
    refresh()
  }
  function handleFocusout() {
    queueMicrotask(() => {
      if (disposed) return
      if (!fromTarget(rootRef.value?.ownerDocument.activeElement ?? null)) { editing = undefined; refresh() }
    })
  }
  function enter(record: CellRecord) {
    editing = record
    const controls = availableControls(record)
    if (!controls.length) { editing = undefined; sync(record); return false }
    controls[0]!.focus({ preventScroll: true })
    return true
  }
  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing) return
    const record = fromTarget(event.target)
    if (!record) return
    const column = columns.value.find(column => column.key === record.address.columnKey)
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    const modifier = event.ctrlKey || event.metaKey
    if (record.address.rowKey === null && column && direction && (event.altKey || (modifier && event.shiftKey))) {
      event.preventDefault(); event.stopPropagation()
      if (event.altKey) options.resize(column, event)
      else options.moveColumn(column.key, direction)
      return
    }
    if (!enabled.value) return
    if (editing === record && event.target !== record.element) {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation()
        editing = undefined; sync(record); record.element.focus({ preventScroll: true })
      } else if (event.key === 'Tab') {
        const controls = availableControls(record)
        if (!controls.length) return
        event.preventDefault(); event.stopPropagation()
        const index = controls.indexOf(record.element.ownerDocument.activeElement as HTMLElement)
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]!.focus({ preventScroll: true })
      }
      return
    }
    const rowIndex = record.address.rowKey === null ? -1 : rows.value.findIndex(item => item.key === record.address.rowKey)
    const item = rows.value[rowIndex]
    const keys = columnKeys()
    const columnIndex = keys.indexOf(record.address.columnKey)
    const consume = () => { event.preventDefault(); event.stopPropagation() }
    if (modifier && event.key.toLowerCase() === 'a' && selectable.value) {
      consume(); options.toggleAll(true); return
    }
    if (event.key === 'F2') { consume(); enter(record); return }
    if (event.key === 'Enter' || event.key === ' ') {
      consume()
      if (!item) {
        if (column?.sortable) options.sort(column)
        else if (column || event.key === 'Enter') enter(record)
        else if (selectable.value) options.toggleAll(!options.allSelected.value)
      } else if (event.key === ' ' && selectable.value) options.toggleSelection(item.key, undefined, event.shiftKey)
      else if (!enter(record)) options.activate(item, event)
      return
    }
    if (item && column && options.isTreeCell(column) && !modifier && !event.altKey && direction) {
      if (direction > 0 && item.hasChildren) {
        consume()
        if (!item.expanded) options.toggleExpansion(item.key, true)
        else if (rows.value[rowIndex + 1]?.parentKey === item.key) void focusCell(rows.value[rowIndex + 1]!.key, column.key)
        return
      }
      if (direction < 0 && (item.expanded || item.parentKey !== null)) {
        consume()
        if (item.expanded) options.toggleExpansion(item.key, false)
        else void focusCell(item.parentKey, column.key)
        return
      }
    }
    let nextRow = rowIndex
    let nextColumn = columnIndex
    if (event.key === 'ArrowUp') nextRow--
    else if (event.key === 'ArrowDown') nextRow++
    else if (direction) nextColumn += direction
    else if (event.key === 'Home') { nextColumn = 0; if (modifier) nextRow = -1 }
    else if (event.key === 'End') { nextColumn = keys.length - 1; if (modifier) nextRow = rows.value.length - 1 }
    else if (event.key === 'PageUp' || event.key === 'PageDown') nextRow = item
      ? options.pageTarget(item.key, event.key === 'PageUp' ? -1 : 1) : 0
    else return
    consume()
    nextRow = Math.max(-1, Math.min(rows.value.length - 1, nextRow))
    void focusCell(nextRow < 0 ? null : rows.value[nextRow]!.key, Math.max(0, Math.min(keys.length - 1, nextColumn)))
  }
  watch([enabled, focusedRowKey, focusedColumn], refresh, { flush: 'post' })
  watch([columns, selectable], () => {
    if (!columnKeys().includes(focusedColumn.value)) focusedColumn.value = columnKeys()[0] ?? null
    schedule()
  })
  watch(rows, (current, previous) => {
    const key = focusedRowKey.value
    if (key === null) return
    const wasFocused = Boolean(fromTarget(rootRef.value?.ownerDocument.activeElement ?? null))
    if (!current.some(item => item.key === key)) {
      const index = Math.max(0, previous.findIndex(item => item.key === key))
      focusedRowKey.value = current[Math.min(index, current.length - 1)]?.key ?? null
    }
    if (wasFocused) void focusCell(focusedRowKey.value, focusedColumn.value ?? 0)
  }, { flush: 'pre' })
  onMounted(() => {
    if (rootRef.value && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(schedule)
      observer.observe(rootRef.value, { childList: true, subtree: true, attributes: true, attributeFilter: ['tabindex', 'disabled', 'hidden'] })
    }
    refresh()
  })
  onBeforeUnmount(() => {
    disposed = true
    observer?.disconnect()
    for (const record of cells.values()) restore(record)
    cells.clear()
  })
  return { cellDirective, focusCell, handleKeydown, handleFocusin, handleFocusout }
}

export const tableKeyboardKey: InjectionKey<ReturnType<typeof useTableKeyboard>> = Symbol('bing-table-keyboard')
