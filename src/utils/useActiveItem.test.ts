import { describe, expect, it } from 'vitest'
import { useActiveItem } from './useActiveItem'

describe('useActiveItem', () => {
  it('键盘导航后忽略 enter 与 2px 内的静止指针，真正移动后恢复', () => {
    const active = useActiveItem()
    active.fromPointer(2, { clientX: 100, clientY: 100 })
    active.fromKeyboard(4)
    expect(active.fromPointer(6, { clientX: 100, clientY: 100 })).toBe(false)
    expect(active.fromPointer(6, { clientX: 102, clientY: 100 }, true)).toBe(false)
    expect(active.activeIndex.value).toBe(4)
    expect(active.fromPointer(6, { clientX: 103, clientY: 100 }, true)).toBe(true)
    expect(active.activeIndex.value).toBe(6)
    expect(active.inputMethod.value).toBe('pointer')
  })

  it('键盘滚动期间屏蔽指针更新，滚动结束后才恢复', () => {
    let scrolling = false
    const active = useActiveItem({ isPointerBlocked: () => scrolling })
    active.fromPointer(0, { clientX: 10, clientY: 10 })
    active.fromKeyboard(20)
    scrolling = true
    expect(active.fromPointer(3, { clientX: 40, clientY: 60 }, true)).toBe(false)
    expect(active.activeIndex.value).toBe(20)
    scrolling = false
    expect(active.fromPointer(3, { clientX: 40, clientY: 61 }, true)).toBe(true)
    active.reset()
    expect(active.activeIndex.value).toBe(-1)
    expect(active.isKeyboardNavigating.value).toBe(false)
  })
})
