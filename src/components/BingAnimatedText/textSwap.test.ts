import { describe, expect, it } from 'vitest'
import { matchChars, splitGraphemes } from './textSwap'

const chars = (text: string) => splitGraphemes(text).map(({ segment }) => segment)

describe('textSwap', () => {
  it('keeps shared characters when a prefix is added', () => {
    expect(matchChars(chars('关注'), chars('已关注'))).toEqual([[0, 1], [1, 2]])
  })

  it('keeps the unchanged part when a suffix is removed and a prefix is added', () => {
    expect(matchChars(chars('复制链接'), chars('已复制'))).toEqual([[0, 1], [1, 2]])
  })

  it('only replaces the changed digit in a counter', () => {
    const previous = chars('12条未读')
    const next = chars('13条未读')

    expect(matchChars(previous, next)).toEqual([[0, 0], [2, 2], [3, 3], [4, 4]])
  })

  it('returns no pairs for completely different text', () => {
    expect(matchChars(chars('保存'), chars('完成'))).toEqual([])
  })

  it('splits emoji and combined characters as single graphemes', () => {
    expect(chars('好👍🏽é')).toEqual(['好', '👍🏽', 'é'])
    expect(splitGraphemes('a👍b').map(({ index }) => index)).toEqual([0, 1, 3])
  })
})
