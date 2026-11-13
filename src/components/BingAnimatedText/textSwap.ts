/** 文字切换时记录的单个字形：位置相对于组件根元素左上角。 */
export interface MeasuredChar {
  text: string
  x: number
  y: number
  /** 与组件根元素不同的字体样式，例如插槽里的 <strong>，用于还原退场的字。 */
  style?: GhostCharStyle
}

export type GhostCharStyle = Partial<Record<(typeof GHOST_STYLE_KEYS)[number], string>>

const GHOST_STYLE_KEYS = ['color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing'] as const

let segmenter: Intl.Segmenter | null | undefined

/** 按字素拆分，保证 emoji、组合字符不会被拆成两半。 */
export function splitGraphemes(text: string) {
  if (segmenter === undefined) {
    segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null
  }

  if (segmenter) {
    return Array.from(segmenter.segment(text), ({ segment, index }) => ({ segment, index }))
  }

  const result: Array<{ segment: string, index: number }> = []
  let index = 0
  for (const segment of Array.from(text)) {
    result.push({ segment, index })
    index += segment.length
  }
  return result
}

/** jsdom 等环境没有文字区域测量能力，此时直接跳过切换动画。 */
export function canMeasureText(doc: Document) {
  return typeof doc.createRange === 'function' &&
    typeof doc.defaultView?.Range?.prototype.getBoundingClientRect === 'function'
}

function createStyleReader(base: Element) {
  const view = base.ownerDocument.defaultView
  const baseStyle = view?.getComputedStyle(base)
  const cache = new Map<Element, GhostCharStyle | undefined>()

  return (element: Element | null) => {
    if (!element || !view || !baseStyle) return undefined
    if (cache.has(element)) return cache.get(element)

    const style = view.getComputedStyle(element)
    let diff: GhostCharStyle | undefined
    GHOST_STYLE_KEYS.forEach(key => {
      if (style[key] !== baseStyle[key]) {
        diff ??= {}
        diff[key] = style[key]
      }
    })
    cache.set(element, diff)
    return diff
  }
}

/**
 * 测量容器内每个非空白字形的位置；超过 limit 时返回 undefined，避免长文本做逐字动画。
 * 只读取布局，不改动 Vue 持有的节点。
 */
export function measureTextChars(container: Element, origin: DOMRect, limit: number) {
  const doc = container.ownerDocument
  const range = doc.createRange()
  const walker = doc.createTreeWalker(container, 4 /* NodeFilter.SHOW_TEXT */)
  const readStyle = createStyleReader(container)
  const chars: MeasuredChar[] = []

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? ''
    for (const { segment, index } of splitGraphemes(text)) {
      if (!segment.trim()) continue
      if (chars.length >= limit) return undefined

      range.setStart(node, index)
      range.setEnd(node, index + segment.length)
      const rect = range.getBoundingClientRect()
      chars.push({
        text: segment,
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        style: readStyle(node.parentElement),
      })
    }
  }

  return chars
}

/** 测量已拆分的字符元素，使用与 measureTextChars 相同的文字区域口径。 */
export function measureCharElements(elements: Element[], origin: DOMRect, styleBase?: Element) {
  const first = elements[0]
  if (!first) return []

  const range = first.ownerDocument.createRange()
  const readStyle = styleBase ? createStyleReader(styleBase) : undefined

  return elements.map<MeasuredChar>(element => {
    range.selectNodeContents(element)
    const rect = range.getBoundingClientRect()
    return {
      text: element.textContent ?? '',
      x: rect.left - origin.left,
      y: rect.top - origin.top,
      style: readStyle?.(element),
    }
  })
}

/** 拆字会逐个舍入行内盒子的宽度；按原文坐标校正，避免混排文字在收尾时挪动。 */
export function alignCharElements(container: Element, elements: HTMLElement[], origin: DOMRect) {
  const measured = measureCharElements(elements, origin)
  const original = measureTextChars(container, origin, elements.length)
  if (!original || original.length !== elements.length ||
    original.some((char, index) => char.text !== measured[index].text)) return measured

  // 位置校正与 GSAP 的 transform 分开，入场和保留字符的位移都以原文位置为终点。
  elements.forEach((element, index) => {
    element.style.position = 'relative'
    element.style.left = `${original[index].x - measured[index].x}px`
    element.style.top = `${original[index].y - measured[index].y}px`
  })
  return original
}

/**
 * 最长公共子序列配对，返回 [旧下标, 新下标]。
 * 「保存」→「已保存」会保留「保存」，只让「已」入场。
 */
export function matchChars(previous: readonly string[], next: readonly string[]) {
  const rows = previous.length
  const columns = next.length
  const table = Array.from({ length: rows + 1 }, () => new Uint16Array(columns + 1))

  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      table[i][j] = previous[i] === next[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const pairs: Array<[number, number]> = []
  let i = 0
  let j = 0
  while (i < rows && j < columns) {
    if (previous[i] === next[j]) {
      pairs.push([i, j])
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++
    } else {
      j++
    }
  }

  return pairs
}
