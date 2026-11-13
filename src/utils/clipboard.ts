/**
 * 通过 Clipboard API 写入文本。环境不支持时返回 false；写入被拒绝时抛出原始错误，
 * 由调用方决定是否回退。
 */
export async function writeTextWithClipboardApi(value: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false
  }

  await navigator.clipboard.writeText(value)
  return true
}

/**
 * 使用隐藏 textarea + execCommand('copy') 的兼容方案写入文本。
 */
export function writeTextWithTextareaFallback(value: string) {
  if (typeof document === 'undefined') {
    return false
  }

  const textarea = document.createElement('textarea')

  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto 0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    return document.execCommand?.('copy') === true
  } finally {
    textarea.remove()
  }
}
