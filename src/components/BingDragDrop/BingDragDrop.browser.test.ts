import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { createApp, defineComponent, h, nextTick, reactive } from 'vue'
import type { App } from 'vue'
import BingDragDrop from './BingDragDrop.vue'
import BingDraggable from './BingDraggable.vue'
import BingDropZone from './BingDropZone.vue'
import BingDragOverlay from './BingDragOverlay.vue'
import type { BingDragDropDropPayload, BingDragDropEndPayload, BingDragDropItem } from './BingDragDrop.types'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined

interface Card { id: string; zone: string; title: string }

function mountBoard(options: {
  accept?: (item: BingDragDropItem) => boolean
  dropOnSource?: boolean
  /** 落到该区域的条目不再渲染（移出列表）或被隐藏，模拟「已完成」「回收站」之类的落点。 */
  leaveOn?: { zone: string; mode: 'remove' | 'hide' }
  onDrop?: (payload: BingDragDropDropPayload) => void
  onEnd?: (payload: BingDragDropEndPayload) => void
  onOpen?: (id: string) => void
  onMenu?: (id: string) => void
} = {}) {
  const cards = reactive<Card[]>([
    { id: 'a', zone: 'todo', title: 'Alpha' },
    { id: 'b', zone: 'todo', title: 'Beta' },
    { id: 'c', zone: 'doing', title: 'Gamma' },
  ])
  const zones = ['todo', 'doing', 'done']

  const Board = defineComponent(() => () =>
    h(BingDragDrop, {
      dropOnSource: options.dropOnSource,
      onDrop: (payload: BingDragDropDropPayload) => {
        options.onDrop?.(payload)
        const index = cards.findIndex(item => item.id === payload.id)
        if (index < 0) return
        if (options.leaveOn?.mode === 'remove' && payload.to === options.leaveOn.zone) cards.splice(index, 1)
        else cards[index]!.zone = String(payload.to)
      },
      onDragEnd: options.onEnd,
    }, {
      default: () => [
        h('div', { style: 'display:flex;gap:16px;padding:16px' }, zones.map(zone =>
          h(BingDropZone, {
            id: zone,
            accept: zone === 'done' ? options.accept : undefined,
            class: `zone zone-${zone}`,
            style: 'width:200px;min-height:240px;padding:8px;border:1px solid #ccc',
          }, {
            default: ({ state }: { state: string }) => [
              h('p', { class: 'state' }, state),
              ...cards.filter(card => card.zone === zone).map(card =>
                h(BingDraggable, { key: card.id, id: card.id, zone, data: card, class: `card card-${card.id}`, style: `height:48px;margin-top:8px;background:#eee${options.leaveOn?.mode === 'hide' && zone === options.leaveOn.zone ? ';display:none' : ''}` }, {
                  default: ({ dragging }: { dragging: boolean }) => [
                    h('a', { href: '#', class: 'open', onClick: (event: Event) => { event.preventDefault(); options.onOpen?.(card.id) } }, card.title),
                    h('button', { type: 'button', class: 'menu', onClick: () => options.onMenu?.(card.id) }, '⋯'),
                    dragging ? h('span', { class: 'placeholder-flag' }, 'dragging') : null,
                  ],
                })),
            ],
          }))),
        h(BingDragOverlay, null, {
          default: ({ data }: { data: Card }) => h('div', { class: 'overlay-card' }, data.title),
        }),
      ],
    }))

  host = document.createElement('div')
  document.body.append(host)
  app = createApp(Board)
  app.mount(host)
  return { cards, host }
}

function center(element: Element) {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function pointer(target: EventTarget, type: string, point: { x: number; y: number }, pointerType = 'mouse') {
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: point.x,
    clientY: point.y,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    pointerId: 1,
    pointerType,
    isPrimary: true,
  }))
}

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
async function settle() {
  await nextTick()
  await frame()
  await frame()
}

/** 模拟一次拖动：按下、越过阈值、移到目标中心、松手。 */
async function drag(from: Element, to: Element | { x: number; y: number }, options: { release?: boolean } = {}) {
  const start = center(from)
  const end = to instanceof Element ? center(to) : to
  pointer(from, 'pointerdown', start)
  pointer(document, 'pointermove', { x: start.x + 12, y: start.y + 4 })
  await settle()
  pointer(document, 'pointermove', { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 })
  await settle()
  pointer(document, 'pointermove', end)
  await settle()
  if (options.release === false) return end
  pointer(document, 'pointerup', end)
  await settle()
  return end
}

beforeEach(async () => {
  await page.viewport(900, 600)
  // 合成事件没有真实的活动指针，setPointerCapture 会抛错；这里只验证组件逻辑。
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => {})
})

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
  vi.restoreAllMocks()
})

describe('BingDragDrop', () => {
  it('moves an item into another zone and reports from/to', async () => {
    const onDrop = vi.fn()
    const onEnd = vi.fn()
    const { cards, host } = mountBoard({ onDrop, onEnd })
    await settle()

    await drag(host.querySelector('.card-a')!, host.querySelector('.zone-doing')!)

    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop.mock.calls[0]![0]).toMatchObject({ id: 'a', from: 'todo', to: 'doing' })
    expect(onDrop.mock.calls[0]![0].data).toMatchObject({ title: 'Alpha' })
    expect(onEnd.mock.calls[0]![0]).toMatchObject({ id: 'a', from: 'todo', to: 'doing', canceled: false })
    expect(cards.find(card => card.id === 'a')!.zone).toBe('doing')
    await vi.waitFor(() => expect(host.querySelector('.zone-doing .card-a')).not.toBeNull())
  })

  it('exposes zone states and the overlay while dragging', async () => {
    const { host } = mountBoard({ accept: item => item.id !== 'a' })
    await settle()

    await drag(host.querySelector('.card-a')!, host.querySelector('.zone-doing')!, { release: false })

    const state = (zone: string) => host.querySelector(`.zone-${zone}`)!.getAttribute('data-bing-drop-state')
    expect(state('todo')).toBe('source')
    expect(state('doing')).toBe('over')
    expect(state('done')).toBe('disabled')
    expect(host.querySelector('.card-a')!.classList).toContain('is-drag-source')
    expect(host.querySelector('.card-a .placeholder-flag')).not.toBeNull()
    expect(document.querySelector('.bing-drag-overlay .overlay-card')?.textContent).toBe('Alpha')

    pointer(document, 'pointerup', center(host.querySelector('.zone-doing')!))
    await settle()
  })

  it('hands the overlay back to the item in the same frame after the drop animation', async () => {
    const { host } = mountBoard()
    await settle()

    await drag(host.querySelector('.card-a')!, host.querySelector('.zone-doing')!, { release: false })
    const frames: { content: boolean; positioned: boolean; placeholder: boolean }[] = []
    let recording = true
    const record = () => {
      const overlay = document.querySelector('.bing-drag-overlay')
      frames.push({
        content: Boolean(overlay?.querySelector('.overlay-card')),
        positioned: Boolean(overlay?.hasAttribute('data-dnd-dragging')),
        placeholder: Boolean(host.querySelector('.card-a.is-drag-source')),
      })
      if (recording) requestAnimationFrame(record)
    }
    pointer(document, 'pointerup', center(host.querySelector('.zone-doing')!))
    requestAnimationFrame(record)
    await vi.waitFor(() => expect(frames.at(-1)).toEqual({ content: false, positioned: false, placeholder: false }), { timeout: 2000 })
    recording = false

    // 浮层内容只在有定位时出现；浮层收起的那一帧源条目已经恢复。
    expect(frames.some(item => item.content && item.positioned)).toBe(true)
    expect(frames.filter(item => item.content && !item.positioned)).toEqual([])
    expect(frames.filter(item => !item.content && item.placeholder)).toEqual([])
    expect(host.querySelector('.zone-doing .card-a')).not.toBeNull()
  })

  for (const mode of ['remove', 'hide'] as const) {
    it(`shrinks the overlay into the zone when the dropped item is no longer visible (${mode})`, async () => {
      const { host } = mountBoard({ leaveOn: { zone: 'done', mode } })
      await settle()

      const zone = host.querySelector('.zone-done')!
      const target = center(zone)
      await drag(host.querySelector('.card-a')!, target, { release: false })
      const frames: { x: number; y: number; width: number; scale: number; opacity: number }[] = []
      let recording = true
      const record = () => {
        const overlay = document.querySelector<HTMLElement>('.bing-drag-overlay')
        if (overlay?.querySelector('.overlay-card')) {
          const rect = overlay.getBoundingClientRect()
          const style = getComputedStyle(overlay)
          frames.push({ ...center(overlay), width: rect.width, scale: rect.width / overlay.offsetWidth, opacity: Number(style.opacity) })
        }
        if (recording) requestAnimationFrame(record)
      }
      pointer(document, 'pointerup', target)
      requestAnimationFrame(record)
      await vi.waitFor(() => expect(document.querySelector('.bing-drag-overlay .overlay-card')).toBeNull(), { timeout: 2000 })
      await frame()
      recording = false

      // 浮层不再飞向视口左上角：始终停在落点区域内，边缩小边淡出。
      const box = zone.getBoundingClientRect()
      expect(frames.length).toBeGreaterThan(2)
      for (const item of frames) {
        expect(item.x).toBeGreaterThan(box.left)
        expect(item.x).toBeLessThan(box.right)
        expect(item.y).toBeGreaterThan(box.top)
        expect(item.y).toBeLessThan(box.bottom)
      }
      // 源条目隐藏后浮层仍保持拖动时的尺寸收拢，不先塌成 0×0。
      expect(frames[0]!.width).toBeGreaterThan(150)
      const last = frames.at(-1)!
      expect(last.scale).toBeLessThan(0.9)
      expect(last.opacity).toBeLessThan(0.9)
      expect(Math.hypot(last.x - target.x, last.y - target.y)).toBeLessThan(40)
      expect(host.querySelector('.is-drag-source')).toBeNull()
    })
  }

  it('does not drop into a zone that rejects the item', async () => {
    const onDrop = vi.fn()
    const onEnd = vi.fn()
    const { cards, host } = mountBoard({ accept: () => false, onDrop, onEnd })
    await settle()

    await drag(host.querySelector('.card-a')!, host.querySelector('.zone-done')!)

    expect(onDrop).not.toHaveBeenCalled()
    expect(onEnd.mock.calls[0]![0]).toMatchObject({ id: 'a', to: null })
    expect(cards.find(card => card.id === 'a')!.zone).toBe('todo')
  })

  it('returns the item when released outside every zone or back on its source', async () => {
    const onDrop = vi.fn()
    const onEnd = vi.fn()
    const { host } = mountBoard({ onDrop, onEnd })
    await settle()

    await drag(host.querySelector('.card-a')!, { x: 880, y: 580 })
    // 归位动画结束前不会开始下一次拖动。
    await new Promise(resolve => setTimeout(resolve, 260))
    await drag(host.querySelector('.card-b')!, host.querySelector('.zone-todo .state')!)

    expect(onDrop).not.toHaveBeenCalled()
    expect(onEnd.mock.calls[0]![0]).toMatchObject({ id: 'a', to: null, canceled: false })
    expect(onEnd.mock.calls[1]![0]).toMatchObject({ id: 'b', to: 'todo' })
  })

  it('can report drops on the source zone', async () => {
    const onDrop = vi.fn()
    const { host } = mountBoard({ onDrop, dropOnSource: true })
    await settle()

    await drag(host.querySelector('.card-b')!, host.querySelector('.zone-todo .state')!)

    expect(onDrop.mock.calls[0]![0]).toMatchObject({ id: 'b', from: 'todo', to: 'todo' })
  })

  it('cancels with Escape', async () => {
    const onDrop = vi.fn()
    const onEnd = vi.fn()
    const { host } = mountBoard({ onDrop, onEnd })
    await settle()

    const card = host.querySelector('.card-a')!
    await drag(card, host.querySelector('.zone-doing')!, { release: false })
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await settle()
    pointer(document, 'pointerup', center(host.querySelector('.zone-doing')!))
    await settle()

    expect(onDrop).not.toHaveBeenCalled()
    expect(onEnd.mock.calls[0]![0]).toMatchObject({ id: 'a', canceled: true, to: null })
  })

  it('keeps clicks working and ignores drags that start on inner buttons', async () => {
    const onOpen = vi.fn()
    const onMenu = vi.fn()
    const onEnd = vi.fn()
    const { host } = mountBoard({ onOpen, onMenu, onEnd })
    await settle()

    const link = host.querySelector<HTMLAnchorElement>('.card-a .open')!
    pointer(link, 'pointerdown', center(link))
    pointer(document, 'pointermove', { x: center(link).x + 2, y: center(link).y })
    pointer(document, 'pointerup', center(link))
    link.click()
    await settle()
    expect(onOpen).toHaveBeenCalledWith('a')

    await drag(host.querySelector('.card-a .menu')!, host.querySelector('.zone-doing')!)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('waits for a long press before dragging on touch', async () => {
    const onDrop = vi.fn()
    const { host } = mountBoard({ onDrop })
    await settle()

    const card = host.querySelector('.card-a')!
    const start = center(card)
    const target = center(host.querySelector('.zone-doing')!)

    // 长按前移动视为滚动，不开始拖动。
    pointer(card, 'pointerdown', start, 'touch')
    pointer(document, 'pointermove', { x: start.x, y: start.y + 20 }, 'touch')
    await new Promise(resolve => setTimeout(resolve, 350))
    pointer(document, 'pointerup', start, 'touch')
    await settle()
    expect(host.querySelector('.card-a')!.classList).not.toContain('is-drag-source')

    pointer(card, 'pointerdown', start, 'touch')
    await new Promise(resolve => setTimeout(resolve, 350))
    pointer(document, 'pointermove', { x: start.x + 20, y: start.y }, 'touch')
    await settle()
    pointer(document, 'pointermove', target, 'touch')
    await settle()
    pointer(document, 'pointerup', target, 'touch')
    await settle()

    expect(onDrop.mock.calls[0]![0]).toMatchObject({ id: 'a', to: 'doing' })
  })
})
