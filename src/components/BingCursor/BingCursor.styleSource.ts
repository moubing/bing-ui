const sourceProperty = '--bing-cursor-source'

interface SourceRecord {
  value: string
  priority: string
  appliedValue: string
  appliedPriority: string
}

/** 将原 cursor 声明映射到私有变量，让浏览器继续处理选择器、优先级和继承。 */
export function createCursorStyleSource(doc: Document) {
  const ruleSources = new Map<CSSStyleDeclaration, SourceRecord>()
  const inlineSources = new Map<CSSStyleDeclaration, SourceRecord>()
  const palettes = new Map<string, { render: (value: string) => string; records: Map<CSSStyleDeclaration, SourceRecord> }>()
  const defaults = doc.createElement('style')
  defaults.dataset.bingCursorSource = ''
  // 最低优先级的原生控件默认值；元素自身的 UA cursor 优先于祖先继承值。
  defaults.textContent = `@layer bing-cursor-defaults {
    :where(:root) { ${sourceProperty}: auto; }
    :where(a:any-link) { ${sourceProperty}: pointer; }
    :where(button, input) { ${sourceProperty}: default; }
    :where(textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], input[type="number"]) { ${sourceProperty}: text; }
  }`
  doc.head.prepend(defaults)

  function restore(style: CSSStyleDeclaration, record: SourceRecord, property = sourceProperty) {
    if (style.getPropertyValue(property) !== record.appliedValue ||
      style.getPropertyPriority(property) !== record.appliedPriority) return
    if (record.value) style.setProperty(property, record.value, record.priority)
    else style.removeProperty(property)
  }

  function sync(style: CSSStyleDeclaration, records: Map<CSSStyleDeclaration, SourceRecord>, property = sourceProperty,
    value = style.cursor, priority = style.getPropertyPriority('cursor')) {
    let record = records.get(style)
    if (!value) {
      if (record) restore(style, record, property)
      records.delete(style)
      return
    }
    if (!record) {
      record = {
        value: style.getPropertyValue(property),
        priority: style.getPropertyPriority(property),
        appliedValue: value,
        appliedPriority: priority,
      }
      records.set(style, record)
    }
    if (style.getPropertyValue(property) !== value || style.getPropertyPriority(property) !== priority) {
      style.setProperty(property, value, priority)
    }
    record.appliedValue = style.getPropertyValue(property)
    record.appliedPriority = style.getPropertyPriority(property)
  }

  function syncRules() {
    const seenStyles = new Set<CSSStyleDeclaration>()
    const seenSheets = new Set<CSSStyleSheet>()
    function visitSheet(sheet: CSSStyleSheet) {
      if (seenSheets.has(sheet)) return
      seenSheets.add(sheet)
      const node = sheet.ownerNode
      if (node instanceof Element && node.hasAttribute('data-bing-cursor-style')) return
      try { visitRules(sheet.cssRules) } catch {
        // 跨源样式表可能不允许访问 CSSOM；保留语义识别和显式状态声明。
      }
    }
    function visitRules(rules: CSSRuleList) {
      for (const rule of rules) {
        if ('style' in rule) {
          const style = (rule as CSSStyleRule).style
          // 只为 cursor 声明维护镜像；其他规则不需要读取优先级和分配集合项。
          // 仍遍历实时 CSSOM，以支持在已有规则中动态新增或删除 cursor。
          if (style.cursor || ruleSources.has(style)) {
            seenStyles.add(style)
            sync(style, ruleSources)
          }
          const original = style.cursor || (style.parentRule?.parentStyleSheet?.ownerNode === defaults ? style.getPropertyValue(sourceProperty) : '')
          for (const [property, palette] of palettes) {
            if (original || palette.records.has(style)) {
              seenStyles.add(style)
              sync(style, palette.records, property, original ? palette.render(original) : '', style.getPropertyPriority('cursor'))
            }
          }
        }
        if ('styleSheet' in rule && (rule as CSSImportRule).styleSheet) {
          visitSheet((rule as CSSImportRule).styleSheet!)
        } else if ('cssRules' in rule) {
          visitRules((rule as CSSGroupingRule).cssRules)
        }
      }
    }
    for (const sheet of [...doc.styleSheets, ...(doc.adoptedStyleSheets ?? [])]) visitSheet(sheet)
    for (const [style, record] of ruleSources) {
      if (!seenStyles.has(style)) {
        restore(style, record)
        ruleSources.delete(style)
      }
    }
    for (const [property, palette] of palettes) for (const [style, record] of palette.records) {
      if (!seenStyles.has(style)) { restore(style, record, property); palette.records.delete(style) }
    }
  }

  return {
    palette(property: string, render: (value: string) => string) {
      const palette = { render, records: new Map<CSSStyleDeclaration, SourceRecord>() }
      palettes.set(property, palette)
      syncRules()
      return () => {
        for (const [style, record] of palette.records) restore(style, record, property)
        palettes.delete(property)
      }
    },
    read(target: Element, scanRules = true, editableRoot?: Element | null) {
      if (scanRules) syncRules()
      const seen = new Set<CSSStyleDeclaration>()
      for (let element: Element | null = target; element; element = element.parentElement) {
        if (!('style' in element)) continue
        // 编辑器会监听正文属性；即使只有 cursor 行内样式，也不能写入镜像变量。
        if (editableRoot?.contains(element)) continue
        const style = (element as HTMLElement | SVGElement).style
        seen.add(style)
        sync(style, inlineSources)
      }
      for (const [style, record] of inlineSources) {
        if (!seen.has(style)) {
          restore(style, record)
          inlineSources.delete(style)
        }
      }
      const value = doc.defaultView!.getComputedStyle(target).getPropertyValue(sourceProperty).trim()
      return value || 'auto'
    },
    destroy() {
      for (const [property, palette] of palettes) for (const [style, record] of palette.records) restore(style, record, property)
      palettes.clear()
      for (const [style, record] of [...ruleSources, ...inlineSources]) restore(style, record)
      ruleSources.clear()
      inlineSources.clear()
      defaults.remove()
    },
  }
}
