export { shortcutKeys, keyShortcuts } from '../../utils/shortcut'

export function menuMotionItems(panel: HTMLElement, viewport: HTMLElement | null | undefined) {
  const all = Array.from(panel.querySelectorAll<HTMLElement>('[data-bing-dropdown-item],[data-bing-dropdown-stagger]'))
    .filter(item => item.closest('[role="menu"]') === panel)
  const bounds = viewport?.getBoundingClientRect()
  const visible = bounds && bounds.height > 0 ? all.filter(item => {
    const rect = item.getBoundingClientRect()
    return rect.bottom > bounds.top && rect.top < bounds.bottom
  }) : all
  return { all, visible, hidden: all.filter(item => !visible.includes(item)) }
}
