import { cursorHotspots, resolveCursorType } from './BingCursor.presets'
import { createCursorStyleSource } from './BingCursor.styleSource'
import type { BingCursorProps, BingCursorType } from './BingCursor.types'

interface CursorOwner {
  root: HTMLElement
  options: () => BingCursorProps
  show: (type: BingCursorType) => void
  hide: () => void
  nativeCursor: (type: BingCursorType) => string | undefined
}

const controllers = new WeakMap<Document, ReturnType<typeof createController>>()
const nativeAttribute = 'data-bing-cursor-native'
const editableSelector = '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'
// CSSOM 的直接编辑没有 MutationObserver 通知；仅在鼠标移动时低频校验，不创建空闲轮询。
const styleCheckInterval = 100

function editorRoot(element: Element) {
  const editable = element.closest(editableSelector)
  if (editable) return editable
  // 编辑器切到只读后仍会管理正文 DOM；嵌套的不可编辑 NodeView 也归属于外层根。
  let root = element.closest('[contenteditable]')
  for (let parent = root?.parentElement?.closest('[contenteditable]'); parent; parent = parent.parentElement?.closest('[contenteditable]')) root = parent
  return root
}

function createController(doc: Document) {
  const view = doc.defaultView!
  const owners = new Set<CursorOwner>()
  const cleanup: (() => void)[] = []
  const fine = view.matchMedia?.('(any-pointer: fine)')
  const hover = view.matchMedia?.('(any-hover: hover)')
  const forced = view.matchMedia?.('(forced-colors: active)')
  let active: CursorOwner | undefined
  const masks = new Map<Element, string | null>()
  const nativeStyles = new Map<CursorOwner, Map<BingCursorType, { value: string; token: string }>>()
  const editablePalettes = new Map<CursorOwner, { token: string; property: string; auto: string; declared: string; disabled: string; dispose: () => void }>()
  let styleVersion = 0
  let target: Element | null = null
  let eventTarget: Element | null = null
  let pointerHitTarget: Element | null = null
  let pointerId = 0
  let x = 0
  let y = 0
  let pressed = false
  let mouseInside = false
  let dragging = false
  let frame = 0
  let rulesDirty = true
  let lastValidation = -Infinity
  let lastRuleScan = -Infinity
  let scrollbar: { left: number; right: number; top: number; bottom: number; vertical: boolean; horizontal: boolean } | undefined
  let overScrollbar = false

  // 每种外观的 16 个状态一次生成。切换状态只更新命中元素的标记，
  // 避免编辑共享 CSS 规则或覆盖整个作用域，导致长文档反复全页重算样式。
  const style = doc.createElement('style')
  style.dataset.bingCursorStyle = ''
  doc.head.append(style)
  const source = createCursorStyleSource(doc)
  const hasEnabledOwner = () => [...owners].some(owner => !owner.options().disabled && owner.root.isConnected)

  function updateStyles() {
    const rules = [...nativeStyles.values()].flatMap(states => [...states.values()].map(({ value, token }) => {
      const selector = `[${nativeAttribute}="${token}"]`
      // 编辑器会观察并重建正文节点，因此只标记编辑根节点；由 :hover 命中正文，
      // 不在段落、链接或 NodeView 内写入属性，也不覆盖未悬停的正文后代。
      const editableHover = `${selector}[contenteditable] :hover`
      return `${selector}, ${selector}::before, ${selector}::after, ${editableHover}, ${editableHover}::before, ${editableHover}::after { cursor: ${value} !important; }`
    }))
    for (const [owner, palette] of editablePalettes) {
      const states = nativeStyles.get(owner)!
      const root = `[${nativeAttribute}="${palette.token}"]`
      const value = (type: BingCursorType) => states.get(type)!.value
      // 根标记只表示外观/作用域，不携带当前状态。原 cursor 的 CSS 级联由镜像变量保留。
      // 根光标固定为其自身语义，后代只在悬停路径上解析各自状态。
      // 不用 :has(:hover) 查询后代，避免长正文在每次命中变化时重新匹配整个子树。
      const hovered = `${root}, ${root} :hover`
      const resolved = `var(${palette.disabled}, var(${palette.declared}, var(${palette.property}, var(${palette.auto}))))`
      rules.push(`${root} { ${palette.auto}: ${value('default')}; }`,
        `${root}:is(${editableSelector}) { ${palette.auto}: ${value('text')}; }`,
        `${root} :where([contenteditable="false"]) { ${palette.auto}: ${value('default')}; }`,
        `${root} :where(a[href], button, summary, [role="button"], [role="link"], [role="tab"]) { ${palette.auto}: ${value('pointer')}; }`,
        `${root} :where(textarea, input, ${editableSelector}) { ${palette.auto}: ${value('text')}; }`,
        `${root}:where(:disabled, [aria-disabled="true"], [inert]), ${root} :where(:disabled, [aria-disabled="true"], [inert]) { ${palette.disabled}: ${value('not-allowed')}; }`,
        `${hovered} { cursor: ${resolved} !important; }`,
        `${hovered.split(', ').map(selector => `${selector}::before, ${selector}::after`).join(', ')} { cursor: ${resolved} !important; }`)
      for (const type of Object.keys(cursorHotspots) as BingCursorType[]) {
        rules.push(`${root}:where([data-bing-cursor="${type}"]), ${root} :where([data-bing-cursor="${type}"]) { ${palette.declared}: ${value(type)}; }`)
      }
    }
    style.textContent = rules.join('\n')
  }

  function nativeToken(owner: CursorOwner, type: BingCursorType) {
    const value = owner.nativeCursor(type)
    if (!value) return undefined
    const cached = nativeStyles.get(owner)?.get(type)
    if (cached?.value === value) return cached.token
    const states = new Map<BingCursorType, { value: string; token: string }>()
    const version = ++styleVersion
    for (const state of Object.keys(cursorHotspots) as BingCursorType[]) {
      const cursor = state === type ? value : owner.nativeCursor(state)
      if (cursor) states.set(state, { value: cursor, token: `${version}-${state}` })
    }
    nativeStyles.set(owner, states)
    editablePalettes.get(owner)?.dispose()
    const property = `--bing-cursor-rendered-${version}`
    editablePalettes.set(owner, { token: `${version}-editable`, property, auto: `--bing-cursor-auto-${version}`,
      declared: `--bing-cursor-declared-${version}`, disabled: `--bing-cursor-disabled-${version}`,
      dispose: source.palette(property, cursor => {
        if (cursor === 'auto') return 'initial'
        const mapped = resolveCursorType(doc.documentElement, cursor)
        return mapped ? states.get(mapped)?.value ?? cursor : cursor
      }) })
    updateStyles()
    return states.get(type)?.token
  }

  function restoreMask(element: Element, attribute: string | null) {
    if (attribute === null) element.removeAttribute(nativeAttribute)
    else element.setAttribute(nativeAttribute, attribute)
  }

  function unmask() {
    for (const [element, attribute] of masks) restoreMask(element, attribute)
    masks.clear()
  }

  function hide() {
    unmask()
    active?.hide()
    active = undefined
  }

  function mask(elements: Element[], token: string, editableToken?: string) {
    // 捕获期间可能需要同时标记捕获控件和实际命中元素。
    // 先启用新的命中元素，再释放旧元素，始终使用浏览器原生绘制。
    const next = new Set(elements.map(element => editorRoot(element) ?? element))
    for (const element of next) {
      if (!masks.has(element)) masks.set(element, element.getAttribute(nativeAttribute))
      const value = editableToken && element.hasAttribute('contenteditable') ? editableToken : token
      if (element.getAttribute(nativeAttribute) !== value) element.setAttribute(nativeAttribute, value)
    }
    for (const [element, attribute] of masks) {
      if (next.has(element)) continue
      restoreMask(element, attribute)
      masks.delete(element)
    }
  }

  function suspend() {
    pointerHitTarget = null
    mouseInside = false
    pressed = false
    eventTarget = null
    scrollbar = undefined
    rulesDirty = true
    if (frame) view.cancelAnimationFrame(frame)
    frame = 0
    hide()
  }

  function isNativeScrollbar(element: Element) {
    // 浏览器绘制的滚动条没有可供光标层接管的 DOM，使用原生鼠标。
    if (x >= doc.documentElement.clientWidth || y >= doc.documentElement.clientHeight) return true
    const computed = view.getComputedStyle(element)
    const vertical = ['auto', 'scroll'].includes(computed.overflowY) && element.scrollHeight > element.clientHeight
    const horizontal = ['auto', 'scroll'].includes(computed.overflowX) && element.scrollWidth > element.clientWidth
    scrollbar = undefined
    if (!vertical && !horizontal) return false
    const bounds = element.getBoundingClientRect()
    const contentLeft = bounds.left + element.clientLeft
    const contentTop = bounds.top + element.clientTop
    scrollbar = { left: contentLeft, right: contentLeft + element.clientWidth, top: contentTop, bottom: contentTop + element.clientHeight, vertical, horizontal }
    return inScrollbar()
  }

  function inScrollbar() {
    return Boolean(scrollbar && ((scrollbar.vertical && (x < scrollbar.left || x >= scrollbar.right)) ||
      (scrollbar.horizontal && (y < scrollbar.top || y >= scrollbar.bottom))))
  }

  function refresh() {
    const pointerTarget = pointerHitTarget
    pointerHitTarget = null
    const now = view.performance.now()
    lastValidation = now
    if (!hasEnabledOwner() || !mouseInside || dragging || doc.hidden || forced?.matches || !fine?.matches || !hover?.matches) {
      hide()
      return
    }
    // 普通指针事件已经完成浏览器命中检测，避免移动时重复查询大型页面。
    // 指针捕获会重定向事件目标；滚动、DOM 变化和实例更新也会清除此缓存。
    const hitTarget = pointerTarget?.isConnected && !pointerTarget.hasPointerCapture?.(pointerId)
      ? pointerTarget
      : doc.elementFromPoint(x, y)
    // 跨文档和 Shadow DOM 使用原生光标，避免覆盖层与事件作用域不一致。
    overScrollbar = Boolean(hitTarget && isNativeScrollbar(hitTarget))
    if (!hitTarget || hitTarget.getRootNode() !== doc || hitTarget.shadowRoot || overScrollbar) {
      hide()
      return
    }
    // pointer capture 期间沿用被拖动控件的语义，移过其他元素时保持抓取/缩放光标。
    target = pressed && eventTarget?.hasPointerCapture?.(pointerId) ? eventTarget : hitTarget

    let owner: CursorOwner | undefined
    for (const candidate of owners) {
      const options = candidate.options()
      if (options.disabled || !candidate.root.isConnected) continue
      if (!options.global && !candidate.root.contains(target)) continue
      if (!owner || (!options.global && (owner.options().global || owner.root.contains(candidate.root))) ||
        (options.global && owner.options().global)) owner = candidate
    }
    if (!owner) {
      hide()
      return
    }

    // 原始 cursor 由独立变量读取，整个过程无需撤掉当前光标图片。
    const scanRules = rulesDirty || now - lastRuleScan >= styleCheckInterval
    const editableRoot = editorRoot(target)
    let inlineCursor = false
    for (let element: Element | null = target; editableRoot && element; element = element.parentElement) {
      if ('style' in element && (element as HTMLElement).style.cursor) { inlineCursor = true; break }
    }
    // 行内 cursor 的级联保持浏览器原值；不修改 ProseMirror 管理的 style 属性。
    if (inlineCursor) unmask()
    const cssSource = source.read(target, scanRules, editableRoot)
    const original = inlineCursor ? view.getComputedStyle(target).cursor : cssSource
    if (scanRules) {
      rulesDirty = false
      lastRuleScan = now
    }
    const type = resolveCursorType(target, original, owner.options().type, pressed)
    if (!type) {
      hide()
      return
    }
    const token = nativeToken(owner, type)
    if (!token) {
      hide()
      return
    }
    if (active !== owner) active?.hide()
    active = owner
    const palette = editablePalettes.get(owner)
    const rendered = editableRoot && palette ? view.getComputedStyle(target).getPropertyValue(palette.property).trim() : ''
    const staticEditable = !pressed && !inlineCursor && owner.options().type === 'auto'
      && (!rendered || rendered.startsWith('url('))
    mask([hitTarget, target], token, staticEditable ? palette?.token : undefined)
    owner.show(type)
  }

  function requestFrame() {
    if (!hasEnabledOwner()) { if (frame) view.cancelAnimationFrame(frame); frame = 0; hide(); return }
    if (!frame && mouseInside) frame = view.requestAnimationFrame(() => {
      frame = 0
      refresh()
    })
  }

  function schedule() {
    pointerHitTarget = null
    requestFrame()
  }

  function pointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse') {
      suspend()
      return
    }
    const nextTarget = event.target instanceof Element ? event.target : null
    const nextPressed = (event.buttons & 1) === 1
    const changed = !mouseInside || eventTarget !== nextTarget || pressed !== nextPressed ||
      Boolean(nextPressed && nextTarget?.hasPointerCapture?.(event.pointerId)) ||
      view.performance.now() - lastValidation >= styleCheckInterval
    mouseInside = true
    x = event.clientX
    y = event.clientY
    pressed = nextPressed
    pointerId = event.pointerId
    eventTarget = nextTarget
    if (!pressed) dragging = false
    pointerHitTarget = eventTarget
    // 坐标仅用于必要的命中与滚动条判断；同一目标内移动不调度位置帧。
    if (changed || inScrollbar() !== overScrollbar) requestFrame()
  }

  function listen(surface: EventTarget, name: string, handler: EventListener) {
    surface.addEventListener(name, handler, { capture: true, passive: true })
    cleanup.push(() => surface.removeEventListener(name, handler, true))
  }

  for (const name of ['pointermove', 'pointerover', 'pointerdown', 'pointerup']) {
    listen(doc, name, pointer as EventListener)
  }
  listen(doc, 'pointerout', ((event: PointerEvent) => { if (!event.relatedTarget) suspend() }) as EventListener)
  listen(doc, 'pointercancel', suspend)
  listen(doc, 'gotpointercapture', schedule)
  listen(doc, 'lostpointercapture', schedule)
  // 捕获阶段也会收到输入框等子元素的 blur，仅窗口失焦才暂停光标。
  listen(view, 'blur', event => { if (event.target === view) suspend() })
  listen(view, 'resize', suspend)
  listen(doc, 'visibilitychange', () => { if (doc.hidden) suspend() })
  listen(doc, 'keydown', ((event: KeyboardEvent) => {
    if (event.key === 'Tab' || event.key === 'Escape') suspend()
  }) as EventListener)
  listen(doc, 'scroll', schedule)
  listen(doc, 'load', event => {
    if ((event.target as Element | null)?.matches?.('link[rel="stylesheet"]')) {
      rulesDirty = true
      schedule()
    }
  })
  listen(doc, 'dragstart', () => { dragging = true; suspend() })
  listen(doc, 'dragend', () => { dragging = false; suspend() })
  for (const media of [fine, hover, forced]) {
    media?.addEventListener?.('change', schedule)
    cleanup.push(() => media?.removeEventListener?.('change', schedule))
  }

  const observer = new MutationObserver((mutations) => {
    if (!hasEnabledOwner()) { rulesDirty = true; return }
    if (!mouseInside) return
    let changed = false
    for (const mutation of mutations) {
      const element = mutation.target.nodeType === 1 ? mutation.target as Element : mutation.target.parentElement
      if (element?.closest('[data-bing-cursor-palette], [data-bing-cursor-style], [data-bing-cursor-source]')) continue
      const stylesheet = element?.matches('style, link') || [...mutation.addedNodes, ...mutation.removedNodes].some(node =>
        node.nodeType === 1 && ((node as Element).matches('style, link') || (node as Element).querySelector('style, link')),
      )
      if (stylesheet) rulesDirty = true
      if (stylesheet || mutation.type === 'childList' || (target && element?.contains(target))) changed = true
    }
    if (changed) schedule()
  })
  observer.observe(doc.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'disabled', 'aria-disabled', 'inert', 'contenteditable', 'type', 'href', 'media', 'data-bing-cursor'],
  })

  return {
    add(owner: CursorOwner) {
      owners.add(owner)
      schedule()
      return {
        refresh() { rulesDirty = true; schedule() },
        destroy() {
          if (active === owner) hide()
          owners.delete(owner)
          nativeStyles.delete(owner)
          editablePalettes.get(owner)?.dispose()
          editablePalettes.delete(owner)
          if (owners.size) {
            updateStyles()
            schedule()
          }
          else {
            suspend()
            observer.disconnect()
            cleanup.forEach(remove => remove())
            source.destroy()
            style.remove()
            controllers.delete(doc)
          }
        },
      }
    },
  }
}

export function registerCursor(owner: CursorOwner) {
  const doc = owner.root.ownerDocument
  let controller = controllers.get(doc)
  if (!controller) {
    controller = createController(doc)
    controllers.set(doc, controller)
  }
  return controller.add(owner)
}
