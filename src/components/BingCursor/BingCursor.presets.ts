import type { BingCursorType } from './BingCursor.types'

export const cursorHotspots: Record<BingCursorType, readonly [number, number]> = {
  default: [4, 3],
  pointer: [12, 3],
  'not-allowed': [16, 16],
  text: [16, 16],
  grab: [16, 16],
  grabbing: [16, 16],
  move: [16, 16],
  crosshair: [16, 16],
  'col-resize': [16, 16],
  'row-resize': [16, 16],
  'ew-resize': [16, 16],
  'ns-resize': [16, 16],
  'nwse-resize': [16, 16],
  'nesw-resize': [16, 16],
  'zoom-in': [13, 13],
  'zoom-out': [13, 13],
}

export function isCursorType(value: string): value is BingCursorType {
  return Object.prototype.hasOwnProperty.call(cursorHotspots, value)
}

const aliases: Record<string, BingCursorType> = {
  'n-resize': 'ns-resize',
  's-resize': 'ns-resize',
  'e-resize': 'ew-resize',
  'w-resize': 'ew-resize',
  'ne-resize': 'nesw-resize',
  'sw-resize': 'nesw-resize',
  'nw-resize': 'nwse-resize',
  'se-resize': 'nwse-resize',
  'all-scroll': 'move',
  'no-drop': 'not-allowed',
}

/** null 表示保留原生光标（例如 busy、外部图片、自定义原生控件）。 */
export function resolveCursorType(
  target: Element,
  cssCursor: string,
  requested: BingCursorType | 'auto' = 'auto',
  pressed = false,
): BingCursorType | null {
  const declaration = target.closest('[data-bing-cursor]')?.getAttribute('data-bing-cursor')
  if (declaration === 'native' || target.closest('iframe, select, video, audio, dialog[open], [popover]')) {
    return null
  }
  // 保留 busy / 隐藏 / 图片等原生语义，例如 loading 按钮虽然 disabled，仍使用 progress。
  if (cssCursor === 'none' || (requested === 'auto' && (!declaration || !isCursorType(declaration)) &&
    cssCursor && cssCursor !== 'auto' && !isCursorType(cssCursor) && !aliases[cssCursor])) return null

  const control = target.closest('button, input, textarea, select, option, fieldset')
  if (control?.matches(':disabled') || target.closest('[aria-disabled="true"], [inert]')) {
    return 'not-allowed'
  }

  let type: BingCursorType
  if (declaration && isCursorType(declaration)) {
    type = declaration
  } else if (requested !== 'auto') {
    type = requested
  } else if (isCursorType(cssCursor)) {
    type = cssCursor
  } else if (aliases[cssCursor]) {
    type = aliases[cssCursor]!
  } else if (cssCursor && cssCursor !== 'auto') {
    return null
  } else {
    const input = target.closest('input')
    const inputType = input?.getAttribute('type')?.toLowerCase() ?? 'text'
    const editable = target.closest('[contenteditable]')
    if (
      target.closest('textarea') ||
      (input && ['text', 'search', 'email', 'password', 'tel', 'url', 'number'].includes(inputType)) ||
      (editable && editable.getAttribute('contenteditable') !== 'false')
    ) {
      type = 'text'
    } else if (target.closest('a[href], button, summary, [role="button"], [role="link"], [role="tab"]')) {
      type = 'pointer'
    } else {
      type = 'default'
    }
  }

  return type === 'grab' && pressed ? 'grabbing' : type
}
