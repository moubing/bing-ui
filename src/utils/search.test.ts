import { describe, expect, it } from 'vitest'
import { getMetaEntries, normalizeSearchText, searchQueryMatches } from './search'

describe('search', () => {
  it('normalizes camel case, diacritics and separators', () => {
    expect(normalizeSearchText('BingTreeSelect')).toBe('bing tree select')
    expect(normalizeSearchText('  Café_au-lait  ')).toBe('cafe au lait')
    expect(normalizeSearchText(undefined)).toBe('')
  })

  it('requires every token to match', () => {
    const haystack = normalizeSearchText('Bing Tree Select')

    expect(searchQueryMatches(haystack, 'tree')).toBe(true)
    expect(searchQueryMatches(haystack, 'tree sel')).toBe(true)
    expect(searchQueryMatches(haystack, 'tree input')).toBe(false)
    expect(searchQueryMatches(haystack, '')).toBe(true)
  })

  it('matches word initials and compact text, but not initials for numeric tokens', () => {
    const haystack = normalizeSearchText('Bing Tree Select 12')

    expect(searchQueryMatches(haystack, 'bts')).toBe(true)
    expect(searchQueryMatches(haystack, 'bingtree')).toBe(true)
    expect(searchQueryMatches(haystack, 'select12')).toBe(true)
    expect(searchQueryMatches(haystack, 'bts1')).toBe(false)
  })

  it('drops empty meta values', () => {
    expect(getMetaEntries({ a: 1, b: '', c: null, d: undefined, e: false })).toEqual([
      { key: 'a', value: '1' },
      { key: 'e', value: 'false' },
    ])
    expect(getMetaEntries(undefined)).toEqual([])
  })
})
