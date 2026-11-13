import type { BingSliderMark, BingSliderValue } from './BingSlider.types'

const precise = (value: number) => Number(value.toPrecision(14))
export const sliderValues = (value: BingSliderValue): number[] => Array.isArray(value) ? [...value] : [value]
export const sameSliderValue = (a: BingSliderValue, b: BingSliderValue) =>
  Array.isArray(a) && Array.isArray(b) ? a[0] === b[0] && a[1] === b[1] : a === b

/** 所有入口（原生读屏事件、键盘、指针、外部模型）共用同一组约束。 */
export function createSliderScale(options: {
  min?: number; max?: number; step?: number; marks?: BingSliderMark[]
  snapToMarks?: boolean; minDistance?: number
}) {
  const min = Number.isFinite(options.min) ? options.min! : 0
  const max = Math.max(min, Number.isFinite(options.max) ? options.max! : 100)
  const step = Number.isFinite(options.step) && options.step! > 0 ? options.step! : 1
  const marks = [...new Map((options.marks ?? [])
    .map(mark => typeof mark === 'number' ? { value: mark } : mark)
    .filter(mark => Number.isFinite(mark.value) && mark.value >= min && mark.value <= max)
    .map(mark => [mark.value, mark])).values()].sort((a, b) => a.value - b.value)
  const stops = options.snapToMarks && marks.length ? marks.map(mark => mark.value) : undefined
  const first = stops?.[0] ?? min
  const last = stops?.[stops.length - 1] ?? precise(min + Math.floor((max - min) / step + 1e-9) * step)
  const distance = Math.min(last - first, Math.max(0, Number.isFinite(options.minDistance) ? options.minDistance! : 0))

  function align(raw: number, mode: 'round' | 'floor' | 'ceil' = 'round', low = first, high = last) {
    const value = Math.max(low, Math.min(high, Number.isFinite(raw) ? raw : low))
    if (stops) {
      const available = stops.filter(stop => stop >= low - 1e-9 && stop <= high + 1e-9)
      if (mode === 'ceil') return available.find(stop => stop >= value - 1e-9) ?? available.at(-1) ?? first
      if (mode === 'floor') return [...available].reverse().find(stop => stop <= value + 1e-9) ?? available[0] ?? first
      return available.reduce((nearest, stop) => Math.abs(stop - value) < Math.abs(nearest - value) ? stop : nearest, available[0] ?? first)
    }
    const lowIndex = Math.ceil((low - min) / step - 1e-9)
    const highIndex = Math.floor((high - min) / step + 1e-9)
    const quotient = (value - min) / step
    const index = Math[mode](quotient + (mode === 'floor' ? 1e-9 : mode === 'ceil' ? -1e-9 : 0))
    return precise(min + Math.max(lowIndex, Math.min(highIndex, index)) * step)
  }

  function normalize(raw: BingSliderValue | undefined, range: boolean): BingSliderValue {
    if (!range) return align(Array.isArray(raw) ? raw[0] : raw ?? first)
    const source = Array.isArray(raw) ? raw : [raw ?? first, last]
    let [low, high] = source.map(value => align(value)).sort((a, b) => a - b) as [number, number]
    if (high - low < distance - 1e-9) {
      high = align(low + distance, 'ceil')
      if (high - low < distance - 1e-9) low = align(high - distance, 'floor')
    }
    return [low, high]
  }

  function bounds(index: number, value: BingSliderValue): [number, number] {
    if (!Array.isArray(value)) return [first, last]
    return index === 0 ? [first, precise(value[1] - distance)] : [precise(value[0] + distance), last]
  }

  function update(value: BingSliderValue, index: number, raw: number): BingSliderValue {
    const [low, high] = bounds(index, value)
    const next = align(raw, 'round', low, high)
    if (!Array.isArray(value)) return next
    return index === 0 ? [next, value[1]] : [value[0], next]
  }

  function nudge(value: BingSliderValue, index: number, direction: number, multiplier: number) {
    const current = sliderValues(value)[index]!
    if (!stops) return update(value, index, current + direction * step * multiplier)
    const [low, high] = bounds(index, value)
    const available = stops.filter(stop => stop >= low - 1e-9 && stop <= high + 1e-9)
    const position = available.indexOf(current)
    return update(value, index, available[Math.max(0, Math.min(available.length - 1, position + direction * multiplier))]!)
  }

  return {
    min, max, step, first, last, distance, marks, stops, normalize, update, bounds, nudge,
    inputBounds: (index: number, value: BingSliderValue) => {
      const [low, high] = bounds(index, value)
      return { min: align(low, 'ceil'), max: align(high, 'floor') }
    },
    fraction: (value: number) => max === min ? 0 : (value - min) / (max - min),
    fromFraction: (fraction: number) => min + fraction * (max - min),
  }
}

/** 可同时存在多个实例；只在最后一次拖动结束时恢复文档原有内联样式。 */
const documentLocks = new WeakMap<Document, { count: number; restore: () => void }>()
export function lockSliderDocument(document: Document) {
  let lock = documentLocks.get(document)
  if (!lock) {
    const style = document.documentElement.style
    const previous = ['cursor', 'user-select'].map(name => [name, style.getPropertyValue(name), style.getPropertyPriority(name)] as const)
    style.setProperty('cursor', 'grabbing', 'important')
    style.setProperty('user-select', 'none', 'important')
    lock = { count: 0, restore: () => previous.forEach(([name, value, priority]) => {
      if (value) style.setProperty(name, value, priority)
      else style.removeProperty(name)
    }) }
    documentLocks.set(document, lock)
  }
  lock.count++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--lock.count === 0) { lock.restore(); documentLocks.delete(document) }
  }
}
