import { describe, expect, it } from 'vitest'
import { createScrollLock } from './scrollLock'

describe('共享文档滚动锁', () => {
  it('重复加锁幂等，乱序释放最后恢复原始样式', () => {
    const doc = document.implementation.createHTMLDocument()
    // 保存并恢复测试文档样式，不影响之后挂载的弹层。
    const first = createScrollLock()
    const second = createScrollLock()
    const oldBody = document.body.getAttribute('style')
    const oldHtml = document.documentElement.getAttribute('style')
    try {
      document.body.style.setProperty('overflow', 'auto', 'important')
      document.body.style.paddingRight = '7px'
      document.documentElement.style.overflow = 'scroll'
      first.lock()
      first.lock()
      second.lock()
      first.unlock()
      expect(document.body.style.overflow).toBe('hidden')
      second.unlock()
      expect(document.body.style.overflow).toBe('auto')
      expect(document.body.style.getPropertyPriority('overflow')).toBe('important')
      expect(document.body.style.paddingRight).toBe('7px')
      expect(document.documentElement.style.overflow).toBe('scroll')
      second.unlock()
      // 无 defaultView 的文档不应持有无法释放的锁。
      first.lock(doc)
      first.unlock()
    } finally {
      first.unlock()
      second.unlock()
      if (oldBody === null) document.body.removeAttribute('style')
      else document.body.setAttribute('style', oldBody)
      if (oldHtml === null) document.documentElement.removeAttribute('style')
      else document.documentElement.setAttribute('style', oldHtml)
    }
  })
})
