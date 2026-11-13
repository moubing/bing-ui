import { onBeforeUnmount, shallowRef, ref } from 'vue'

export type MenuHighlightSource = 'pointer' | 'keyboard' | 'external'
export function getMenuItems(menu: HTMLElement | null | undefined, enabledOnly = true) {
  return Array.from(menu?.querySelectorAll<HTMLElement>('[data-bing-dropdown-item]') ?? [])
    .filter(item => item.closest('[role="menu"]') === menu
      && (!enabledOnly || (!item.matches(':disabled') && item.getAttribute('aria-disabled') !== 'true')))
}

export function useMenuNavigation(options: {
  panel: () => HTMLElement | undefined
  contains: (target: Node | null) => boolean
  loop: () => boolean
  typeahead: () => boolean
  close: () => void
  focusTrigger: () => void
  canEscape: (event: KeyboardEvent) => boolean
  openSubmenu: (item: HTMLElement) => boolean
  closeSubmenu: (menu: HTMLElement) => HTMLElement | undefined
  onHighlight: (item: HTMLElement, source: MenuHighlightSource) => void
}) {
  const highlighted = shallowRef(new Map<HTMLElement, HTMLElement>())
  const revision = ref(0)
  let query = ''
  let queryMenu: HTMLElement | undefined
  let queryTimer: ReturnType<typeof setTimeout> | undefined
  function clearTypeahead() { clearTimeout(queryTimer); queryTimer = undefined; query = ''; queryMenu = undefined }
  function refresh() { revision.value++ }
  function setHighlighted(item: HTMLElement, source: MenuHighlightSource) {
    const menu = item.closest<HTMLElement>('[role="menu"]')
    if (!menu || item.matches(':disabled') || item.getAttribute('aria-disabled') === 'true') return
    const changed = highlighted.value.get(menu) !== item
    if (changed) { highlighted.value = new Map(highlighted.value).set(menu, item); options.onHighlight(item, source) }
    if (source === 'keyboard' || (source === 'pointer' && options.contains(document.activeElement))) {
      item.focus({ preventScroll: true })
      if (source === 'keyboard') reveal(item)
    }
  }
  function clear(menu: HTMLElement | undefined) {
    if (!menu || !highlighted.value.has(menu)) return
    const next = new Map(highlighted.value); next.delete(menu); highlighted.value = next
  }
  function isHighlighted(item: HTMLElement | undefined) {
    return !!item && highlighted.value.get(item.closest<HTMLElement>('[role="menu"]')!) === item
  }
  function tabIndex(item: HTMLElement | undefined) {
    revision.value
    if (!item) return -1
    const menu = item.closest<HTMLElement>('[role="menu"]')
    if (!menu) return 0
    const items = getMenuItems(menu)
    const selected = highlighted.value.get(menu)
    return item === (selected && items.includes(selected) ? selected : items[0]) ? 0 : -1
  }
  function reveal(item: HTMLElement) {
    const viewport = item.closest<HTMLElement>('.bing-scrollbar__viewport')
    if (!viewport) return
    const bounds = viewport.getBoundingClientRect(), rect = item.getBoundingClientRect()
    if (rect.bottom > bounds.bottom) viewport.scrollTop += rect.bottom - bounds.bottom
    else if (rect.top < bounds.top) viewport.scrollTop -= bounds.top - rect.top
  }
  function focusBoundary(position: 'first' | 'last', menu = options.panel()) {
    const items = getMenuItems(menu)
    const item = position === 'first' ? items[0] : items.at(-1)
    if (item) setHighlighted(item, 'keyboard')
  }
  function currentMenu(event: KeyboardEvent) {
    const target = event.target instanceof HTMLElement && event.target.closest('[data-bing-dropdown-item]')
      ? event.target : document.activeElement
    return target instanceof HTMLElement && options.contains(target)
      ? target.closest<HTMLElement>('[role="menu"]') ?? options.panel() : options.panel()
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing) return
    const menu = currentMenu(event)
    if (!menu) return
    const items = getMenuItems(menu)
    const active = document.activeElement as HTMLElement
    // 自定义内容（例如链接设置表单）沿用原生输入与 Tab 顺序。
    if (event.key !== 'Escape' && (active?.closest('input,textarea,select,[contenteditable="true"]')
      || (!items.includes(active) && active !== menu && menu.contains(active)))) return
    if (event.key === 'Tab') {
      options.focusTrigger()
      options.close()
      return
    }
    if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      if (event.key === 'Escape' && !options.canEscape(event)) return
      const parent = options.closeSubmenu(menu)
      if (parent) {
        event.preventDefault(); event.stopPropagation(); clear(menu); setHighlighted(parent, 'keyboard')
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); options.focusTrigger(); options.close()
      }
      return
    }
    if (event.key === 'ArrowRight') {
      if (options.openSubmenu(active)) { event.preventDefault(); event.stopPropagation() }
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); clearTypeahead()
      if (event.key === 'Home' || event.key === 'End') { focusBoundary(event.key === 'Home' ? 'first' : 'last', menu); return }
      if (!items.length) return
      const offset = event.key === 'ArrowDown' ? 1 : -1
      const index = items.indexOf(active)
      const next = (index < 0 ? offset > 0 ? -1 : 0 : index) + offset
      const item = items[options.loop() ? (next + items.length) % items.length : Math.max(0, Math.min(items.length - 1, next))]
      if (item) setHighlighted(item, 'keyboard')
      return
    }
    if (!options.typeahead() || !items.includes(active) || event.key.length !== 1 || event.key === ' '
      || event.ctrlKey || event.altKey || event.metaKey) return
    event.preventDefault()
    if (queryMenu !== menu) clearTypeahead()
    queryMenu = menu
    query += event.key.toLocaleLowerCase()
    clearTimeout(queryTimer); queryTimer = setTimeout(clearTypeahead, 500)
    const search = [...query].every(char => char === query[0]) ? query[0]! : query
    const start = items.indexOf(active)
    // 多字符延续当前项，重复单字符从下一项开始循环。
    const first = search.length > 1 ? 0 : 1
    for (let offset = first; offset < items.length + first; offset++) {
      const item = items[(Math.max(0, start) + offset) % items.length]
      const text = item?.dataset.textValue ?? item?.querySelector('.bing-dropdown-item__title')?.textContent ?? ''
      if (item && text.trim().toLocaleLowerCase().startsWith(search)) { setHighlighted(item, 'keyboard'); break }
    }
  }
  function reset() { clearTypeahead(); highlighted.value = new Map(); refresh() }
  onBeforeUnmount(clearTypeahead)
  return { highlighted, refresh, setHighlighted, isHighlighted, tabIndex, clear, reveal, focusBoundary, onKeydown, reset, clearTypeahead }
}
