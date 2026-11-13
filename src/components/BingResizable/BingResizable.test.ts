import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingResizable from './BingResizable.vue'
import resizableSource from './BingResizable.vue?raw'
import type { BingResizableDirection, BingResizableResolvedSize } from './BingResizable.types'

enableAutoUnmount(afterEach)

function createPointerEvent(type: string, options: Record<string, unknown> = {}) {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  })
  const defaults = {
    button: 0,
    clientX: 0,
    clientY: 0,
    pointerId: 1,
  }

  Object.entries({ ...defaults, ...options }).forEach(([key, value]) => {
    Object.defineProperty(event, key, {
      configurable: true,
      value,
    })
  })

  return event as PointerEvent
}

function dispatchPointer(target: EventTarget, type: string, options: Record<string, unknown> = {}) {
  target.dispatchEvent(createPointerEvent(type, options))
}

describe('BingResizable', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.style.cursor = ''
    document.documentElement.style.userSelect = ''
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  it('renders slot content with default size and handles', () => {
    const wrapper = mount(BingResizable, {
      slots: {
        default: '<div>Resizable content</div>',
      },
    })

    expect(wrapper.text()).toContain('Resizable content')
    expect(wrapper.attributes('style')).toContain('width: 320px')
    expect(wrapper.attributes('style')).toContain('height: 220px')
    expect(wrapper.findAll('.bing-resizable__handle')).toHaveLength(3)
    expect(wrapper.find('.bing-resizable__handle--right').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--bottom').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--bottom-right').exists()).toBe(true)
  })

  it('keeps local style hooks while deriving chrome from semantic theme tokens', () => {
    expect(resizableSource).toContain('--bing-resizable-border: var(--bing-border)')
    expect(resizableSource).toContain(
      '--bing-resizable-handle-hover-bg: var(--bing-control-hover-bg)',
    )
    expect(resizableSource).not.toContain('rgba(255, 255, 255')
    expect(resizableSource).not.toContain('rgba(15, 23, 42')
  })

  it('keeps requested corner handles available while aspect ratio is locked', () => {
    const wrapper = mount(BingResizable, {
      props: {
        lockAspectRatio: true,
        directions: [
          'top',
          'right',
          'bottom',
          'left',
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ],
      },
    })

    expect(wrapper.find('.bing-resizable__handle--top').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--right').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--bottom').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--left').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--top-left').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--top-right').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--bottom-left').exists()).toBe(true)
    expect(wrapper.find('.bing-resizable__handle--bottom-right').exists()).toBe(true)
  })

  it('resizes proportionally from the bottom-right handle while aspect ratio is locked', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        lockAspectRatio: true,
        defaultSize: {
          width: 200,
          height: 100,
        },
        directions: ['bottom-right'],
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--bottom-right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 40, clientY: 20 })
    dispatchPointer(window, 'pointerup', { clientX: 40, clientY: 20 })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 240,
      height: 120,
    })
  })

  it('preserves the ratio when a proportional resize reaches max width', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        lockAspectRatio: true,
        defaultSize: {
          width: 200,
          height: 100,
        },
        directions: ['bottom-right'],
        maxWidth: 220,
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--bottom-right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 80, clientY: 40 })
    dispatchPointer(window, 'pointerup', { clientX: 80, clientY: 40 })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 220,
      height: 110,
    })
  })

  for (const mode of ['fixed', 'mirror'] as const) {
    for (const direction of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      it.each([
        { width: 500, height: 250 },
        { width: 600, height: 100 },
        { width: 250, height: 500 },
        { width: 300, height: 300 },
      ])(`keeps ${mode} ${direction} ratio dragging continuous for $width x $height`, async (startSize) => {
        const wrapper = mount(BingResizable, { props: {
          mode, directions: [direction], defaultSize: startSize,
          defaultPosition: { x: 200, y: 200 }, lockAspectRatio: true,
          minWidth: 1, minHeight: 1,
        } })
        dispatchPointer(wrapper.get(`.bing-resizable__handle--${direction}`).element, 'pointerdown')
        const readSize = () => (wrapper.vm as unknown as { getSize(): BingResizableResolvedSize }).getSize()
        const xSign = direction.includes('left') ? -1 : 1
        const ySign = direction.includes('top') ? -1 : 1
        const move = async (x: number, y: number) => {
          dispatchPointer(window, 'pointermove', { clientX: x * xSign, clientY: y * ySign })
          await wrapper.vm.$nextTick()
          const size = readSize()
          expect(size.width / size.height).toBeCloseTo(startSize.width / startSize.height, 4)
          const position = wrapper.emitted('update:position')?.at(-1)?.[0] as { x: number; y: number }
          if (mode === 'mirror') {
            expect(position.x + size.width / 2).toBeCloseTo(200 + startSize.width / 2, 2)
            expect(position.y + size.height / 2).toBeCloseTo(200 + startSize.height / 2, 2)
          } else {
            expect(position.x + (xSign < 0 ? size.width : 0)).toBeCloseTo(200 + (xSign < 0 ? startSize.width : 0), 2)
            expect(position.y + (ySign < 0 ? size.height : 0)).toBeCloseTo(200 + (ySign < 0 ? startSize.height : 0), 2)
          }
          return size
        }
        // 同一次拖拽反复跨过原来的主轴分界，覆盖放大、缩小和两轴反向。
        for (const [x, y] of [[100, 100], [-40, -40], [40, -40], [-40, 40]]) {
          const before = await move(x!, y!)
          for (const jitter of [1, -1, 0, 1, 0]) {
            const after = await move(x!, y! + jitter)
            expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(2.001)
            expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2.001)
          }
          expect(readSize()).toEqual(before)
        }
        const beforeRelease = readSize()
        dispatchPointer(window, 'pointerup')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('resize-end')?.at(-1)?.[0]).toMatchObject({ size: beforeRelease })
      })
    }
  }

  it.each(['live', 'end'] as const)('keeps corner snapping and constraints consistent in %s mode', async (snapMode) => {
    const wrapper = mount(BingResizable, { props: {
      defaultSize: { width: 500, height: 250 }, directions: ['bottom-right'],
      lockAspectRatio: true, step: { x: 8, y: 13 }, snapMode,
      minWidth: 200, minHeight: 120, maxWidth: 650, maxHeight: 320,
    } })
    const handle = wrapper.get('.bing-resizable__handle--bottom-right').element
    dispatchPointer(handle, 'pointerdown')
    for (const y of [100, 101, 99, 100]) {
      dispatchPointer(window, 'pointermove', { clientX: 100, clientY: y })
      await wrapper.vm.$nextTick()
      const size = wrapper.emitted('update:size')?.at(-1)?.[0] as BingResizableResolvedSize
      expect(size.width).toBeCloseTo(snapMode === 'live' ? (y < 100 ? 616 : 624) : 620 + (y - 100) * 0.4, 3)
      expect(size.height).toBeCloseTo(size.width / 2, 3)
    }
    dispatchPointer(window, 'pointerup')
    expect(wrapper.emitted('resize-end')?.at(-1)?.[0]).toMatchObject({ size: { width: 624, height: 312 } })
    for (const [delta, expected] of [[1000, 640], [-1000, 240]]) {
      dispatchPointer(handle, 'pointerdown')
      dispatchPointer(window, 'pointermove', { clientX: delta, clientY: delta })
      dispatchPointer(window, 'pointerup')
      expect(wrapper.emitted('resize-end')?.at(-1)?.[0]).toMatchObject({ size: { width: expected, height: expected! / 2 } })
    }
  })

  it.each([
    ['right', 'ArrowRight', 512, 256],
    ['bottom', 'ArrowDown', 512, 256],
    ['bottom-right', 'ArrowRight', 512, 256],
    ['bottom-right', 'ArrowDown', 520, 260],
    ['top-left', 'ArrowLeft', 512, 256],
    ['top-left', 'ArrowUp', 520, 260],
  ] as const)('preserves proportional keyboard resizing for %s / %s', async (direction, key, width, height) => {
    const wrapper = mount(BingResizable, { props: {
      defaultSize: { width: 500, height: 250 }, lockAspectRatio: true,
      directions: [direction as BingResizableDirection], step: 8,
    } })
    await wrapper.get(`.bing-resizable__handle--${direction}`).trigger('keydown', { key })
    expect(wrapper.emitted('resize-end')?.at(-1)?.[0]).toMatchObject({ size: { width, height } })
  })

  it('resizes from the right edge and emits updates', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 40, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: 40, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('width: 240px')
    expect(wrapper.attributes('style')).toContain('left: 0px')
    expect(wrapper.emitted('resize-start')).toHaveLength(1)
    expect(wrapper.emitted('resize')).toHaveLength(1)
    expect(wrapper.emitted('resize-end')).toHaveLength(1)
    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 240,
      height: 120,
    })
  })

  it('keeps the opposite edge stable when resizing from the left', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
        defaultPosition: {
          x: 30,
          y: 0,
        },
        directions: ['left'],
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--left').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: -20, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: -20, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('width: 220px')
    expect(wrapper.attributes('style')).toContain('left: 10px')
    expect(wrapper.attributes('style')).toContain('top: 0px')
    expect(wrapper.emitted('update:position')?.at(-1)?.[0]).toMatchObject({
      x: 10,
      y: 0,
    })
  })

  it('keeps the top edge stable when resizing from the bottom in fixed mode', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
        defaultPosition: {
          x: 0,
          y: 40,
        },
        directions: ['bottom'],
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--bottom').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 0, clientY: 30 })
    dispatchPointer(window, 'pointerup', { clientX: 0, clientY: 30 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('height: 150px')
    expect(wrapper.attributes('style')).toContain('top: 40px')
    expect(wrapper.emitted('update:position')?.at(-1)?.[0]).toMatchObject({
      x: 0,
      y: 40,
    })
  })

  it('resizes symmetrically around the center in mirror mode', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        mode: 'mirror',
        defaultSize: {
          width: 200,
          height: 120,
        },
        defaultPosition: {
          x: 100,
          y: 50,
        },
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 20, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: 20, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('width: 240px')
    expect(wrapper.attributes('style')).toContain('left: 80px')
    expect(wrapper.emitted('update:position')?.at(-1)?.[0]).toMatchObject({
      x: 80,
      y: 50,
    })
  })

  it('mirrors corner resizing across both axes', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        mode: 'mirror',
        defaultSize: {
          width: 200,
          height: 120,
        },
        defaultPosition: {
          x: 100,
          y: 50,
        },
        directions: ['bottom-right'],
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--bottom-right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 20, clientY: 10 })
    dispatchPointer(window, 'pointerup', { clientX: 20, clientY: 10 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('width: 240px')
    expect(wrapper.attributes('style')).toContain('height: 140px')
    expect(wrapper.emitted('update:position')?.at(-1)?.[0]).toMatchObject({
      x: 80,
      y: 40,
    })
  })

  it('keeps the center stable in mirror mode when aspect ratio changes the secondary axis', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        mode: 'mirror',
        lockAspectRatio: true,
        defaultSize: {
          width: 200,
          height: 100,
        },
        defaultPosition: {
          x: 100,
          y: 50,
        },
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 20, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: 20, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 240,
      height: 120,
    })
    expect(wrapper.emitted('update:position')?.at(-1)?.[0]).toMatchObject({
      x: 80,
      y: 40,
    })
  })

  it('applies step and max constraints during drag', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
        step: 10,
        maxWidth: 220,
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 17, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: 17, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 220,
      height: 120,
    })
  })

  it('does not emit repeated resize updates while the stepped size is unchanged', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
        step: 10,
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 1, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 2, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 6, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 7, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: 7, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('resize')).toHaveLength(1)
    expect(wrapper.emitted('update:size')).toHaveLength(2)
    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 210,
      height: 120,
    })
  })

  it('keeps pointer dragging fluid and snaps on release when snapMode is end', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
        snapMode: 'end',
        step: 10,
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 7, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('width: 207px')
    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 207,
      height: 120,
    })

    dispatchPointer(window, 'pointerup', { clientX: 7, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('width: 210px')
    expect(wrapper.emitted('resize-end')?.at(-1)?.[0]).toMatchObject({
      size: {
        width: 210,
        height: 120,
      },
    })
  })

  it('contains resizing inside the parent content box when the parent has padding', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(BingResizable, {
      attachTo: host,
      props: {
        contain: true,
        defaultSize: {
          width: 200,
          height: 120,
        },
        directions: ['bottom-right'],
        maxWidth: 600,
        maxHeight: 600,
      },
    })
    const parent = wrapper.element.parentElement as HTMLElement
    parent.style.padding = '20px 30px'
    Object.defineProperty(parent, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 460,
        height: 260,
        top: 0,
        right: 460,
        bottom: 260,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })
    const handle = wrapper.get('.bing-resizable__handle--bottom-right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 400, clientY: 200 })
    dispatchPointer(window, 'pointerup', { clientX: 400, clientY: 200 })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 400,
      height: 220,
    })

    host.remove()
  })

  it('snaps only the primary axis when aspect ratio is locked', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        lockAspectRatio: true,
        defaultSize: {
          width: 360,
          height: 202,
        },
        directions: ['right'],
        step: 8,
      },
    })
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })
    dispatchPointer(window, 'pointermove', { clientX: 5, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: 5, clientY: 0 })
    await wrapper.vm.$nextTick()

    const lastSize = wrapper.emitted('update:size')?.at(-1)?.[0] as
      | { width: number; height: number }
      | undefined

    expect(lastSize?.width).toBe(368)
    expect(lastSize?.height).toBeCloseTo(206.489, 3)
  })

  it('does not resize while disabled', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
        disabled: true,
      },
    })

    await wrapper.get('.bing-resizable__handle--right').trigger('pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
    })
    dispatchPointer(window, 'pointermove', { clientX: 40, clientY: 0 })
    dispatchPointer(window, 'pointerup', { clientX: 40, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('style')).toContain('width: 200px')
    expect(wrapper.emitted('update:size')).toBeUndefined()
  })

  it('supports keyboard resizing on handles', async () => {
    const wrapper = mount(BingResizable, {
      props: {
        defaultSize: {
          width: 200,
          height: 120,
        },
        step: 10,
      },
    })

    await wrapper.get('.bing-resizable__handle--right').trigger('keydown', {
      key: 'ArrowRight',
    })

    expect(wrapper.emitted('update:size')?.at(-1)?.[0]).toMatchObject({
      width: 210,
      height: 120,
    })
    expect(wrapper.emitted('resize-end')).toHaveLength(1)
  })

  it('restores document cursor after pointer resize ends', async () => {
    document.documentElement.style.cursor = 'wait'
    document.documentElement.style.userSelect = 'text'
    document.body.style.cursor = 'grab'
    document.body.style.userSelect = 'auto'

    const wrapper = mount(BingResizable)
    const handle = wrapper.get('.bing-resizable__handle--right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })

    expect(document.documentElement.style.cursor).toBe('ew-resize')
    expect(document.body.style.cursor).toBe('ew-resize')

    dispatchPointer(window, 'pointerup', { clientX: 0, clientY: 0 })
    await wrapper.vm.$nextTick()

    expect(document.documentElement.style.cursor).toBe('wait')
    expect(document.documentElement.style.userSelect).toBe('text')
    expect(document.body.style.cursor).toBe('grab')
    expect(document.body.style.userSelect).toBe('auto')
  })

  it('cleans up resize cursor when the window loses focus', async () => {
    const wrapper = mount(BingResizable)
    const handle = wrapper.get('.bing-resizable__handle--bottom-right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })

    expect(document.documentElement.style.cursor).toBe('nwse-resize')

    window.dispatchEvent(new Event('blur'))
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).not.toContain('is-resizing')
    expect(document.documentElement.style.cursor).toBe('')
    expect(document.body.style.cursor).toBe('')
  })

  it('cleans up resize cursor when the pointer leaves the window', async () => {
    const wrapper = mount(BingResizable)
    const handle = wrapper.get('.bing-resizable__handle--bottom-right').element

    dispatchPointer(handle, 'pointerdown', { clientX: 0, clientY: 0 })

    expect(document.documentElement.style.cursor).toBe('nwse-resize')

    dispatchPointer(window, 'pointerout', { clientX: -1, clientY: 10 })
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).not.toContain('is-resizing')
    expect(document.documentElement.style.cursor).toBe('')
    expect(document.body.style.cursor).toBe('')
  })
})
