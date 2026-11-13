import { getCurrentScope, onScopeDispose } from 'vue'
import { getSearchInitials, normalizeSearchText } from './search'

export interface TypeaheadItem {
  label: string
  disabled?: boolean
}

/** 返回列表内的位置；调用方负责更新 active、滚动，不改变选中值。 */
export function useTypeahead(options: {
  items: () => readonly TypeaheadItem[]
  activeIndex: () => number
  onMatch: (index: number) => void
  enabled?: () => boolean
  delay?: number
}) {
  let buffer = ''
  let timer: ReturnType<typeof setTimeout> | undefined

  function reset() {
    clearTimeout(timer)
    timer = undefined
    buffer = ''
  }

  function handleKeydown(event: KeyboardEvent) {
    if (options.enabled?.() === false || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
      Array.from(event.key).length !== 1 || !event.key.trim()) return false

    clearTimeout(timer)
    buffer += event.key
    timer = setTimeout(reset, options.delay ?? 500)
    const characters = Array.from(buffer.toLocaleLowerCase())
    const query = normalizeSearchText(characters.every(char => char === characters[0]) ? characters[0] : buffer)
    const items = options.items()
    const start = options.activeIndex()

    // 前缀优先于首字母；相同字符连按循环，连续不同字符在 500ms 内组成前缀。
    for (const initials of [false, true]) {
      for (let offset = 1; offset <= items.length; offset++) {
        const index = (start + offset + items.length) % items.length
        const item = items[index]!
        if (item.disabled) continue
        const label = normalizeSearchText(item.label)
        if ((initials ? getSearchInitials(label, true) : label).startsWith(query)) {
          options.onMatch(index)
          event.preventDefault()
          return true
        }
      }
    }
    event.preventDefault()
    return true
  }

  if (getCurrentScope()) onScopeDispose(reset)
  return { handleKeydown, reset }
}
