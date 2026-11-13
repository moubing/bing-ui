import { describe, expect, it } from 'vitest'
import { getMatchRanges, normalizeSearchText, searchQueryMatches } from './search'

describe('getMatchRanges', () => {
  it('映射大小写、变音符号、分隔符和重复文字的原文位置', () => {
    expect(getMatchRanges('Café Café', 'cafe')).toEqual([{ start: 0, end: 4 }, { start: 5, end: 9 }])
    expect(getMatchRanges('foo-bar', 'foobar')).toEqual([{ start: 0, end: 3 }, { start: 4, end: 7 }])
    expect(getMatchRanges('Cafe\u0301', 'cafe')).toEqual([{ start: 0, end: 5 }])
    expect(getMatchRanges('😀动画', '动画')).toEqual([{ start: 2, end: 4 }])
  })

  it('中文拼音与英文缩写只标记实际命中的字符', () => {
    expect(getMatchRanges('重庆动效', 'cq')).toEqual([{ start: 0, end: 2 }])
    expect(getMatchRanges('Blue Sky', 'bs')).toEqual([{ start: 0, end: 1 }, { start: 5, end: 6 }])
    expect(getMatchRanges('borderRadius', 'br')).toEqual([{ start: 0, end: 1 }, { start: 6, end: 7 }])
    expect(getMatchRanges('动效预设 12', 'dx 12')).toEqual([{ start: 0, end: 2 }, { start: 5, end: 7 }])
  })

  it('不做散字模糊匹配；已有使用方须显式启用中文匹配', () => {
    expect(getMatchRanges('Aurora', 'ar')).toEqual([])
    expect(getMatchRanges('图层 12', '1 12')).toEqual([{ start: 3, end: 5 }])
    expect(getMatchRanges('图层', '')).toEqual([])
    const text = normalizeSearchText('重庆动效')
    expect(searchQueryMatches(text, 'cq')).toBe(false)
    expect(searchQueryMatches(text, 'cq', true)).toBe(true)
  })
})
