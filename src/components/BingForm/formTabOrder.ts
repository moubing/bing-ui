// 这里只预测普通 DOM 的顺序，不设置 tabindex、不拦截 Tab。
// 自定义元素 / Shadow DOM、媒体原生内部操作等作为不可预测的边界。
const candidates = 'input,textarea,select,button,a[href],area[href],summary,iframe,object,embed,audio[controls],video[controls],[tabindex],[contenteditable]'
const opaque = 'iframe,object,embed,audio[controls],video[controls],select,input[type="file"],input[type="color"],input[type="date"],input[type="time"],input[type="month"],input[type="week"],input[type="datetime-local"],[contenteditable]:not([contenteditable="false"])'

function visible(element: HTMLElement) {
  return !element.closest('[hidden],[inert]') && element.getClientRects().length > 0 &&
    !['hidden', 'collapse'].includes(element.ownerDocument.defaultView!.getComputedStyle(element).visibility)
}

function radio(element: HTMLElement): element is HTMLInputElement {
  return element.matches('input[type="radio"]') && Boolean((element as HTMLInputElement).name)
}

function sameRadioGroup(a: HTMLInputElement, b: HTMLInputElement) {
  return a.name === b.name && a.form === b.form && a.getRootNode() === b.getRootNode()
}

/** 返回确定的下一个原生 Tab 入口；不确定、即将离开表单时返回 null。 */
export function nextFormTabStop(form: HTMLFormElement, active: HTMLElement): HTMLElement | null {
  if (active.closest('form') !== form || active.shadowRoot || active.matches(opaque)) return null
  const elements = Array.from(form.ownerDocument.body.querySelectorAll<HTMLElement>('*'))
  // 正 tabindex 会改变整个文档的导航顺序，第一版不猜测这类自定义表单。
  if (elements.some(element => element.hasAttribute('tabindex') && element.tabIndex > 0)) return null
  const stops = elements.filter(element => {
    const boundary = element.shadowRoot || element.localName.includes('-') || element.matches(opaque)
    if (!boundary && !(element.matches(candidates) && element.tabIndex >= 0 && !element.matches(':disabled,input[type="hidden"]'))) return false
    // 先过滤候选项，避免每次输入都对文档中的所有元素读取布局。
    return visible(element) || Boolean(boundary && !element.closest('[hidden],[inert]') &&
      element.ownerDocument.defaultView!.getComputedStyle(element).display === 'contents')
  })
  const ordered = stops.filter(element => {
    if (!radio(element)) return true
    const group = stops.filter((other): other is HTMLInputElement => radio(other) && sameRadioGroup(element, other))
    return element === (group.find(other => other === active) ?? group.find(other => other.checked) ?? group[0])
  })
  const index = ordered.indexOf(active)
  const next = index < 0 ? undefined : ordered[index + 1]
  if (!next || next.closest('form') !== form || next.shadowRoot || next.localName.includes('-') || next.matches(opaque)) return null
  return next
}
