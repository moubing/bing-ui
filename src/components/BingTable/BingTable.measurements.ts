import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import type { InjectionKey, Ref } from 'vue'

type CommitMeasurement = () => void
type ReadMeasurement = () => CommitMeasurement | undefined

export interface BingTableMeasurements {
  register: (element: HTMLElement, read: ReadMeasurement) => () => void
  invalidate: (element?: HTMLElement | null) => void
}

export const bingTableMeasurementsKey: InjectionKey<BingTableMeasurements> = Symbol('bing-table-measurements')

/** 同一张表共用监听器；一帧内先读完变化的单元格，再提交结果。 */
export function createTableMeasurements(
  root: Ref<HTMLElement | null>,
  readLayout?: (elements: HTMLElement[]) => CommitMeasurement | undefined,
): BingTableMeasurements {
  const cells = new Map<HTMLElement, ReadMeasurement>()
  const dirty = new Set<HTMLElement>()
  let resizeObserver: ResizeObserver | undefined
  let mutationObserver: MutationObserver | undefined
  let frame: number | undefined
  let disposed = false
  let fonts: FontFaceSet | undefined

  function flush() {
    frame = undefined
    if (disposed) return
    const elements = [...dirty].filter(element => cells.has(element))
    dirty.clear()
    const commits = elements.map(element => cells.get(element)!())
    const commitLayout = elements.length ? readLayout?.(elements) : undefined
    commits.forEach(commit => commit?.())
    commitLayout?.()
  }

  function schedule() {
    if (disposed || frame !== undefined || !dirty.size) return
    if (typeof window.requestAnimationFrame === 'function') {
      frame = window.requestAnimationFrame(flush)
    } else {
      frame = -1
      void nextTick(() => { if (frame === -1) flush() })
    }
  }

  function invalidate(element?: HTMLElement | null) {
    if (disposed) return
    if (element) {
      if (cells.has(element)) dirty.add(element)
    } else {
      cells.forEach((_, cell) => dirty.add(cell))
    }
    schedule()
  }

  function handleResize(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      const element = entry.target as HTMLElement
      if (cells.has(element)) dirty.add(element)
    }
    schedule()
  }

  function handleMutations(records: MutationRecord[]) {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      if (!target) continue
      if (record.type === 'attributes' && record.oldValue === target.getAttribute(record.attributeName!)) continue
      const cell = target.closest<HTMLElement>('.bing-table__cell-text')
      if (cell && cells.has(cell)) {
        dirty.add(cell)
      } else if (target.closest('.bing-table__row')) {
        // 行/单元格样式或插槽结构变化可能影响文字宽度；忽略表外滑块和阴影。
        target.querySelectorAll<HTMLElement>('.bing-table__cell-text').forEach(element => {
          if (cells.has(element)) dirty.add(element)
        })
      }
    }
    schedule()
  }

  function register(element: HTMLElement, read: ReadMeasurement) {
    if (disposed) return () => {}
    cells.set(element, read)
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver ??= new ResizeObserver(handleResize)
      resizeObserver.observe(element)
    }
    invalidate(element)
    return () => {
      resizeObserver?.unobserve(element)
      cells.delete(element)
      dirty.delete(element)
    }
  }

  const invalidateAll = () => invalidate()
  onMounted(() => {
    if (typeof MutationObserver !== 'undefined' && root.value) {
      mutationObserver = new MutationObserver(handleMutations)
      mutationObserver.observe(root.value, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['class', 'style', 'hidden', 'role', 'tabindex', 'contenteditable', 'href'],
      })
    }
    fonts = root.value?.ownerDocument.fonts
    fonts?.addEventListener('loadingdone', invalidateAll)
    void fonts?.ready.then(() => { if (!disposed) invalidateAll() })
    if (typeof ResizeObserver === 'undefined') window.addEventListener('resize', invalidateAll)
  })

  onBeforeUnmount(() => {
    disposed = true
    if (frame !== undefined && frame !== -1) window.cancelAnimationFrame(frame)
    frame = undefined
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    fonts?.removeEventListener('loadingdone', invalidateAll)
    window.removeEventListener('resize', invalidateAll)
    cells.clear()
    dirty.clear()
  })

  return { register, invalidate }
}
