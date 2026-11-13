interface ScrollLockState {
  owners: Set<symbol>
  restore: () => void
}

const locks = new WeakMap<Document, ScrollLockState>()

/** 同一个文档的所有弹层共享锁，最后一个持有者负责恢复原样式。 */
export function createScrollLock() {
  const owner = Symbol('scroll-lock')
  let lockedDocument: Document | undefined

  function unlock() {
    if (!lockedDocument) return
    const state = locks.get(lockedDocument)
    state?.owners.delete(owner)
    if (state && state.owners.size === 0) {
      state.restore()
      locks.delete(lockedDocument)
    }
    lockedDocument = undefined
  }

  function lock(doc: Document = document) {
    if (lockedDocument === doc) return
    unlock()
    const { body, documentElement: html, defaultView: view } = doc
    if (!body || !view) return
    let state = locks.get(doc)
    if (!state) {
      const elements = [body, html]
      const properties = ['overflow', 'overscroll-behavior', 'padding-right']
      const saved = elements.map(element => properties.map(property => ({
        property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      })))
      state = {
        owners: new Set(),
        restore: () => elements.forEach((element, index) => saved[index]?.forEach(({ property, value, priority }) => {
          if (value) element.style.setProperty(property, value, priority)
          else element.style.removeProperty(property)
        })),
      }
      locks.set(doc, state)
      const width = Math.max(0, view.innerWidth - html.clientWidth)
      const padding = Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0
      if (width > 0) body.style.paddingRight = `${padding + width}px`
      for (const element of elements) {
        element.style.overflow = 'hidden'
        element.style.overscrollBehavior = 'contain'
      }
    }
    state.owners.add(owner)
    lockedDocument = doc
  }

  return { lock, unlock }
}
