import { pinyin } from 'pinyin-pro'

/**
 * 选项类组件共用的本地搜索匹配。
 *
 * 文本先做归一化：拆分驼峰、去除变音符号、下划线与连字符视作空格、统一小写。
 * 查询按空白拆成多个关键词，每个关键词都需命中；不含数字的关键词还可以匹配单词首字母。
 */

export function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function getSearchInitials(value: string, includePinyin = false) {
  if (includePinyin) return getSearchIndex(value).initials.text
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
}

export function searchTokenMatches(token: string, haystack: string) {
  if (!token) {
    return true
  }

  const compactToken = token.replace(/\s+/g, '')
  const compactHaystack = haystack.replace(/\s+/g, '')

  if (/\d/.test(compactToken)) {
    return haystack.includes(compactToken) || compactHaystack.includes(compactToken)
  }

  return (
    haystack.includes(compactToken) ||
    compactHaystack.includes(compactToken) ||
    getSearchInitials(haystack).includes(compactToken)
  )
}

/** `haystack` 需已归一化；`query` 为归一化后的查询。 */
export function searchQueryMatches(haystack: string, query: string, includePinyin = false) {
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => searchTokenMatches(token, haystack) ||
      (includePinyin && !/\d/.test(token) && getSearchInitials(haystack, true).includes(token)))
}

/** UTF-16 偏移，end 不包含在区间内，可直接用于 String.slice。 */
export interface MatchRange { start: number; end: number }

interface IndexedText { text: string; ranges: MatchRange[] }
const searchIndexes = new Map<string, { compact: IndexedText; initials: IndexedText }>()

function getSearchIndex(text: string) {
  const cached = searchIndexes.get(text)
  if (cached) return cached
  const compact: IndexedText = { text: '', ranges: [] }
  const initials: IndexedText = { text: '', ranges: [] }
  const chars = Array.from(text)
  const readings = /\p{Script=Han}/u.test(text)
    ? pinyin(text, { pattern: 'first', toneType: 'none', type: 'array', nonZh: 'spaced' })
    : []
  let offset = 0
  let wordStart = true
  let previous = ''
  chars.forEach((char, index) => {
    const range = { start: offset, end: offset + char.length }
    offset = range.end
    const normalized = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    if (!normalized) {
      const last = compact.ranges.at(-1)
      if (last) last.end = range.end
      return
    }
    if (/^[\s_-]+$/.test(char)) { wordStart = true; previous = char; return }
    const han = /\p{Script=Han}/u.test(char)
    if (han || wordStart || (/[a-z0-9]/.test(previous) && /[A-Z]/.test(char))) {
      const initial = han ? readings[index] ?? char : normalized[0]!
      initials.text += initial
      initials.ranges.push(...Array.from({ length: initial.length }, () => range))
    }
    compact.text += normalized
    compact.ranges.push(...Array.from({ length: normalized.length }, () => range))
    wordStart = han
    previous = char
  })
  const result = { compact, initials }
  // 避免远程/长列表持续替换选项时永久保留所有文本。
  if (searchIndexes.size >= 512) searchIndexes.delete(searchIndexes.keys().next().value!)
  searchIndexes.set(text, result)
  return result
}

/** 返回文字或拼音/英文首字母命中的原文区间；不做任意散字模糊匹配。 */
export function getMatchRanges(text: string, query: string): MatchRange[] {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return []
  const { compact, initials } = getSearchIndex(text)
  const ranges: MatchRange[] = []
  for (const token of tokens) {
    const source = compact.text.includes(token) ? compact : /\d/.test(token) ? undefined : initials
    if (!source) continue
    for (let from = 0; from < source.text.length;) {
      const start = source.text.indexOf(token, from)
      if (start < 0) break
      // 首字母可能来自不相邻的汉字或英文单词，只标记实际贡献的字符。
      ranges.push(...source.ranges.slice(start, start + token.length).map(range => ({ ...range })))
      from = start + token.length
    }
  }
  ranges.sort((a, b) => a.start - b.start)
  return ranges.reduce<MatchRange[]>((merged, range) => {
    const previous = merged.at(-1)
    if (previous && previous.end >= range.start) previous.end = Math.max(previous.end, range.end)
    else merged.push(range)
    return merged
  }, [])
}

/** 过滤空值后的元信息键值对，用于详情展示和搜索。 */
export function getMetaEntries(meta: Record<string, unknown> | undefined) {
  if (!meta) {
    return []
  }

  return Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      key,
      value: String(value),
    }))
}
