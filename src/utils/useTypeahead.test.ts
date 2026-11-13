import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTypeahead } from './useTypeahead'

afterEach(() => vi.useRealTimers())

describe('useTypeahead', () => {
  const items = [{ label: 'Apple' }, { label: 'Apricot', disabled: true }, { label: 'Alpine' }, { label: 'Apple Pie' }, { label: '重庆' }]
  function setup() {
    vi.useFakeTimers()
    let index = 0
    const scope = effectScope()
    const typeahead = scope.run(() => useTypeahead({ items: () => items, activeIndex: () => index, onMatch: next => { index = next } }))!
    return { typeahead, scope, current: () => index, press: (key: string, init: KeyboardEventInit = {}) => typeahead.handleKeydown(new KeyboardEvent('keydown', { key, cancelable: true, ...init })) }
  }

  it('500ms 内累积字符，重复字符循环并跳过禁用项，超时后清空', () => {
    const test = setup()
    test.press('a')
    expect(test.current()).toBe(2)
    test.press('a')
    expect(test.current()).toBe(3)
    vi.advanceTimersByTime(501)
    test.press('a')
    test.press('l')
    expect(test.current()).toBe(2)
    test.scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('先找标签前缀再找拼音首字母，不吞掉输入法和组合键', () => {
    const test = setup()
    expect(test.press('c', { ctrlKey: true })).toBe(false)
    expect(test.press('c', { isComposing: true })).toBe(false)
    expect(test.press('Enter')).toBe(false)
    test.press('c')
    test.press('q')
    expect(test.current()).toBe(4)
    test.scope.stop()
  })

  it('禁用后不改 active，前缀优先于更靠近的英文缩写', () => {
    const onMatch = vi.fn()
    let enabled = false
    const typeahead = useTypeahead({
      items: () => [{ label: 'Blue Sky' }, { label: 'BSpline' }], activeIndex: () => -1,
      enabled: () => enabled, onMatch,
    })
    typeahead.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))
    expect(onMatch).not.toHaveBeenCalled()
    enabled = true
    typeahead.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))
    typeahead.handleKeydown(new KeyboardEvent('keydown', { key: 's' }))
    expect(onMatch).toHaveBeenLastCalledWith(1)
    typeahead.reset()
  })
})
