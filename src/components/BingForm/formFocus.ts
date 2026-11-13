const focusable = 'input:not([type="hidden"]),textarea,select,button,[tabindex],[contenteditable="true"]'

export function isAvailableFormControl(element: HTMLElement | null): element is HTMLElement {
  return Boolean(element?.isConnected && !element.matches(':disabled,[aria-disabled="true"]') &&
    !element.closest('[inert],[hidden]') && element.getClientRects().length > 0 &&
    !['hidden', 'collapse'].includes(element.ownerDocument.defaultView!.getComputedStyle(element).visibility))
}

/** 优先使用控件主入口；组内保留当前焦点或选中项，聚焦不改变值。 */
export function findFormControlTarget(element: HTMLElement | null) {
  if (!element) return null
  if (element.matches(focusable) && isAvailableFormControl(element)) return element
  const candidates = Array.from(element.querySelectorAll<HTMLElement>(focusable)).filter(isAvailableFormControl)
  return candidates.find(candidate => candidate === element.ownerDocument.activeElement) ??
    candidates.find(candidate => candidate.matches('input[type="radio"]:checked')) ?? candidates[0] ?? null
}
