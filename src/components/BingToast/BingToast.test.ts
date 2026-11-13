import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import BingToast from './BingToast.vue'
import toastSource from './BingToast.vue?raw'
import { bingToast, runBingToastAction } from './BingToast.service'
import { BING_TOAST_POSITIONS } from './BingToast.types'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'

enableAutoUnmount(afterEach)

function getScrollbarExpose(scrollbar: { vm: unknown }) {
  const instance = scrollbar.vm as { $?: { exposed?: unknown } }
  return instance.$?.exposed as BingScrollbarExpose
}

describe('BingToast', () => {
  afterEach(() => {
    bingToast.clear()
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders a positioned success toast from the service', async () => {
    mount(BingToast, {
      attachTo: document.body,
      global: {
        stubs: {
          TransitionGroup: false,
          'transition-group': false,
        },
      },
    })

    const id = bingToast.success({
      title: 'Saved',
      message: 'Settings updated',
      duration: 0,
      position: 'top-right',
    })

    await nextTick()

    const toast = document.body.querySelector('.bing-toast')

    expect(id).toMatch(/^bing-toast-/)
    expect(document.body.querySelector('.bing-toast-region--top-right')).not.toBeNull()
    expect(toast?.classList).toContain('bing-toast--success')
    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.textContent).toContain('Saved')
    expect(toast?.textContent).toContain('Settings updated')
  })

  it('uses a solid themed card without glass filtering by default', async () => {
    mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.error({
      title: 'Submit failed',
      message: 'Validation did not pass.',
      duration: 0,
      position: 'top-right',
    })

    await nextTick()

    const toast = document.body.querySelector<HTMLElement>('.bing-toast')
    const card = document.body.querySelector<HTMLElement>('.bing-toast__card')
    const cardRule = toastSource.match(/\.bing-toast__card\s*{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(card).not.toBeNull()
    expect(document.body.querySelector('.bing-toast__glass')).toBeNull()
    expect(toast?.getAttribute('style')).not.toContain('--bing-toast-glass')
    expect(cardRule).toContain('background: var(--bing-surface-solid)')
    expect(cardRule).not.toContain('backdrop-filter')
    expect(cardRule).not.toContain('-webkit-backdrop-filter')
  })

  it('forwards smooth scrolling options and supports opting out', async () => {
    const wrapper = mount(BingToast, {
      props: {
        viewportPosition: 'top',
        smoothScroll: {
          duration: 340,
          smoothTouchpad: true,
        },
      },
      attachTo: document.body,
    })

    await nextTick()

    const scrollbar = wrapper.getComponent(BingScrollbar)

    expect(scrollbar.props('smooth')).toMatchObject({
      duration: 340,
      smoothTouchpad: false,
      respectReducedMotion: true,
    })

    await wrapper.setProps({ smoothScroll: false })

    expect(scrollbar.props('smooth')).toBe(false)
  })

  it('stops and clamps an overflowing stack when toast items change', async () => {
    const wrapper = mount(BingToast, {
      props: {
        viewportPosition: 'top',
      },
      attachTo: document.body,
    })

    bingToast.info({
      id: 'clamp-first',
      message: 'First item',
      duration: 0,
      position: 'top',
    })
    await nextTick()

    const scrollbar = wrapper.getComponent(BingScrollbar)
    const exposed = getScrollbarExpose(scrollbar)
    const viewport = exposed.viewport!

    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 100,
    })
    Object.defineProperty(viewport, 'scrollHeight', {
      configurable: true,
      value: 120,
    })
    viewport.scrollTop = 90

    const stop = vi.spyOn(exposed, 'stop')
    const update = vi.spyOn(exposed, 'update')

    bingToast.info({
      id: 'clamp-second',
      message: 'Second item',
      duration: 0,
      position: 'top',
    })
    await nextTick()

    expect(stop).toHaveBeenCalled()
    expect(viewport.scrollTop).toBe(20)
    expect(update).toHaveBeenCalled()
  })

  it('renders top, bottom, side and corner positions', async () => {
    mount(BingToast, {
      attachTo: document.body,
    })

    BING_TOAST_POSITIONS.forEach((position) => {
      bingToast.info({
        message: position,
        duration: 0,
        position,
      })
    })

    await nextTick()

    BING_TOAST_POSITIONS.forEach((position) => {
      expect(document.body.querySelector(`.bing-toast-region--${position}`)).not.toBeNull()
    })
  })

  it('uses toast option position while viewportPosition only filters mounted regions', async () => {
    mount(BingToast, {
      props: {
        viewportPosition: 'top',
      },
      attachTo: document.body,
    })

    bingToast.info({
      message: 'visible top',
      duration: 0,
      position: 'top',
    })
    bingToast.info({
      message: 'stored bottom',
      duration: 0,
      position: 'bottom',
    })

    await nextTick()

    expect(bingToast.getToasts().map((toast) => toast.position)).toEqual(['top', 'bottom'])
    expect(document.body.querySelector('.bing-toast-region--top')).not.toBeNull()
    expect(document.body.querySelector('.bing-toast-region--bottom')).toBeNull()
    expect(document.body.textContent).toContain('visible top')
    expect(document.body.textContent).not.toContain('stored bottom')
  })

  it('keeps multiple toast cards visually aligned without depth stacking', async () => {
    mount(BingToast, {
      attachTo: document.body,
    })

    Array.from({ length: 4 }, (_, index) => {
      bingToast.error({
        message: `stable ${index}`,
        duration: 0,
        position: 'top',
      })
    })

    await nextTick()

    const toasts = Array.from(document.body.querySelectorAll<HTMLElement>('.bing-toast'))

    toasts.forEach((toast) => {
      expect(toast.style.getPropertyValue('--bing-toast-stack-scale')).toBe('1')
      expect(toast.style.getPropertyValue('--bing-toast-stack-shift')).toBe('0px')
      expect(toast.style.getPropertyValue('--bing-toast-stack-opacity')).toBe('1')
      expect(toast.style.getPropertyValue('--bing-toast-stack-edge-shadow')).toBe('0.035')
    })

    expect(Number(toasts[0]?.style.getPropertyValue('--bing-toast-stack-z-index'))).toBeGreaterThan(
      Number(toasts[1]?.style.getPropertyValue('--bing-toast-stack-z-index')),
    )
  })

  it('normalizes top-center and bottom-center aliases', async () => {
    mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.info({
      message: 'top alias',
      duration: 0,
      position: 'top-center',
    })
    bingToast.info({
      message: 'bottom alias',
      duration: 0,
      position: 'bottom-center',
    })

    await nextTick()

    expect(document.body.querySelector('.bing-toast-region--top')).not.toBeNull()
    expect(document.body.querySelector('.bing-toast-region--bottom')).not.toBeNull()
    expect(document.body.querySelector('.bing-toast-region--top-center')).toBeNull()
    expect(document.body.querySelector('.bing-toast-region--bottom-center')).toBeNull()
  })

  it('closes a toast from the close button', async () => {
    const wrapper = mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.error({
      message: 'Submit failed',
      duration: 0,
    })

    await nextTick()

    document.body.querySelector<HTMLButtonElement>('.bing-toast__close')?.click()

    expect(bingToast.getToasts()).toHaveLength(0)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('auto dismisses a toast after its duration', async () => {
    vi.useFakeTimers()

    mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.info({
      message: 'Auto dismiss',
      duration: 600,
    })

    await nextTick()

    expect(bingToast.getToasts()).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(600)

    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('resets every dismiss timer when a new toast appears', async () => {
    vi.useFakeTimers()

    mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.success({
      id: 'first-toast',
      message: 'First',
      duration: 800,
    })

    await nextTick()
    await vi.advanceTimersByTimeAsync(700)

    bingToast.info({
      id: 'second-toast',
      message: 'Second',
      duration: 1200,
    })

    await nextTick()
    await vi.advanceTimersByTimeAsync(799)

    expect(bingToast.getToasts().map((toast) => toast.id)).toEqual([
      'first-toast',
      'second-toast',
    ])

    await vi.advanceTimersByTimeAsync(1)

    expect(bingToast.getToasts().map((toast) => toast.id)).toEqual(['second-toast'])

    await vi.advanceTimersByTimeAsync(520)

    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('auto dismisses older toasts first when a group closes with stagger', async () => {
    vi.useFakeTimers()

    mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.info({
      id: 'first-toast',
      message: 'First',
      duration: 800,
      position: 'top',
    })
    bingToast.info({
      id: 'second-toast',
      message: 'Second',
      duration: 800,
      position: 'top',
    })
    bingToast.info({
      id: 'third-toast',
      message: 'Third',
      duration: 800,
      position: 'top',
    })

    await nextTick()
    await vi.advanceTimersByTimeAsync(799)

    expect(bingToast.getToasts().map((toast) => toast.id)).toEqual([
      'first-toast',
      'second-toast',
      'third-toast',
    ])

    await vi.advanceTimersByTimeAsync(1)

    expect(bingToast.getToasts().map((toast) => toast.id)).toEqual([
      'second-toast',
      'third-toast',
    ])

    await vi.advanceTimersByTimeAsync(120)

    expect(bingToast.getToasts().map((toast) => toast.id)).toEqual(['third-toast'])

    await vi.advanceTimersByTimeAsync(120)

    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('keeps the region mounted after the last toast is removed so leave can animate', async () => {
    vi.useFakeTimers()

    mount(BingToast, {
      props: {
        viewportPosition: 'top',
      },
      attachTo: document.body,
    })

    bingToast.info({
      message: 'Animated leave',
      duration: 600,
      position: 'top',
    })

    await nextTick()

    expect(document.body.querySelector('.bing-toast-region--top')).not.toBeNull()
    expect(document.body.querySelector('.bing-toast')).not.toBeNull()

    await vi.advanceTimersByTimeAsync(600)
    await nextTick()

    expect(bingToast.getToasts()).toHaveLength(0)
    expect(document.body.querySelector('.bing-toast-region--top')).not.toBeNull()
  })

  it('restarts all dismiss timers when any toast is hovered', async () => {
    vi.useFakeTimers()

    mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.success({
      message: 'First',
      duration: 800,
    })
    bingToast.error({
      message: 'Second',
      duration: 1200,
    })

    await nextTick()

    const toast = document.body.querySelector<HTMLElement>('.bing-toast')

    await vi.advanceTimersByTimeAsync(700)

    toast?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))

    await vi.advanceTimersByTimeAsync(1200)

    expect(bingToast.getToasts()).toHaveLength(2)

    toast?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))

    await vi.advanceTimersByTimeAsync(799)

    expect(bingToast.getToasts()).toHaveLength(2)

    await vi.advanceTimersByTimeAsync(1)

    expect(bingToast.getToasts()).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(520)

    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('runs a synchronous action and closes the toast', async () => {
    mount(BingToast, { attachTo: document.body })
    const onClick = vi.fn()

    bingToast.success({ message: 'Moved to done', duration: 0, action: { label: 'Undo', onClick } })
    await nextTick()

    const button = document.body.querySelector<HTMLButtonElement>('.bing-toast__action')
    expect(button?.textContent?.trim()).toBe('Undo')
    expect(document.body.querySelector('.bing-toast')?.classList).toContain('has-action')

    button?.click()
    await nextTick()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0]?.[0]).toMatchObject({ message: 'Moved to done' })
    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('keeps a toast open when the action opts out of closing', async () => {
    mount(BingToast, { attachTo: document.body })

    bingToast.info({ message: 'Copied', duration: 0, action: { label: 'Again', onClick: () => {}, closeOnClick: false } })
    await nextTick()
    document.body.querySelector<HTMLButtonElement>('.bing-toast__action')?.click()
    await nextTick()

    expect(bingToast.getToasts()).toHaveLength(1)
  })

  it('gives action toasts a longer default duration', () => {
    bingToast.success({ message: 'Plain' })
    bingToast.success({ message: 'With action', action: { label: 'Undo', onClick: () => {} } })
    bingToast.loading({ message: 'Loading', action: { label: 'Cancel', onClick: () => {} } })
    bingToast.info({ message: 'Explicit', duration: 1500, action: { label: 'Undo', onClick: () => {} } })

    expect(bingToast.getToasts().map(toast => toast.duration)).toEqual([2600, 6000, 0, 1500])
  })

  it('shows a pending action, pauses dismissal and ignores repeated clicks', async () => {
    vi.useFakeTimers()
    mount(BingToast, { attachTo: document.body })
    let resolve!: () => void
    const onClick = vi.fn(() => new Promise<void>((done) => { resolve = done }))

    bingToast.success({ message: 'Moved', duration: 600, action: { label: 'Undo', onClick } })
    await nextTick()

    const button = () => document.body.querySelector<HTMLButtonElement>('.bing-toast__action')!
    button().click()
    await nextTick()

    expect(bingToast.getToasts()[0]?.actionPending).toBe(true)
    expect(button().disabled).toBe(true)
    expect(button().getAttribute('aria-busy')).toBe('true')

    document.body.querySelector<HTMLElement>('.bing-toast')?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(2000)
    expect(bingToast.getToasts()).toHaveLength(1)

    button().click()
    expect(onClick).toHaveBeenCalledTimes(1)

    resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('restores the action and keeps the toast when the promise rejects', async () => {
    vi.useFakeTimers()
    mount(BingToast, { attachTo: document.body })
    const failure = new Error('conflict')
    const id = bingToast.success({ message: 'Moved', duration: 600, action: { label: 'Undo', onClick: () => Promise.reject(failure) } })
    const { runBingToastAction } = await import('./BingToast.service')

    await expect(runBingToastAction(id)).resolves.toBeUndefined()
    expect(bingToast.getToasts()[0]?.actionPending).toBe(false)

    await vi.advanceTimersByTimeAsync(600)
    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('does not close a toast that was replaced while its action was pending', async () => {
    mount(BingToast, { attachTo: document.body })
    let resolve!: () => void
    const id = bingToast.success({ message: 'First', duration: 0, action: { label: 'Undo', onClick: () => new Promise<void>((done) => { resolve = done }) } })
    const { runBingToastAction } = await import('./BingToast.service')

    const running = runBingToastAction(id)
    const next = { label: 'Undo', onClick: () => {} }
    bingToast.success({ id, message: 'Second', duration: 0, action: next })
    expect(bingToast.getToasts()[0]?.actionPending).toBe(false)

    resolve()
    await running
    expect(bingToast.getToasts()[0]?.message).toBe('Second')
  })

  it.each(['raw', 'reactive'] as const)('preserves the pending action when updating with the same %s action', async (input) => {
    vi.useFakeTimers()
    mount(BingToast, { attachTo: document.body })
    let resolve!: () => void
    const action = { label: 'Undo', closeOnClick: false, onClick: vi.fn(() => new Promise<void>((done) => { resolve = done })) }
    const id = bingToast.success({ message: 'Moved', duration: 600, action })
    const running = runBingToastAction(id)

    bingToast.success({ id, message: 'Still working', duration: 600, action: input === 'reactive' ? reactive(action) : action })
    await nextTick()
    const button = document.body.querySelector<HTMLButtonElement>('.bing-toast__action')!
    expect(bingToast.getToasts()[0]?.actionPending).toBe(true)
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    await runBingToastAction(id)
    expect(action.onClick).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(bingToast.getToasts()).toHaveLength(1)

    resolve()
    await running
    await nextTick()
    expect(button.disabled).toBe(false)
    expect(bingToast.getToasts()[0]?.actionPending).toBe(false)
    await vi.advanceTimersByTimeAsync(600)
    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it.each(['resolve', 'reject'] as const)('isolates an action replaced synchronously inside its callback when the old promise %ss', async (outcome) => {
    mount(BingToast, { attachTo: document.body })
    let settle!: () => void, finishNext!: () => void
    const next = { label: 'Next', onClick: vi.fn(() => new Promise<void>((done) => { finishNext = done })) }
    const id = bingToast.success({ id: 'replace-in-callback', message: 'First', duration: 0, action: {
      label: 'Undo', onClick: () => {
        bingToast.success({ id: 'replace-in-callback', message: 'Second', duration: 0, action: next })
        return new Promise<void>((resolve, reject) => { settle = outcome === 'resolve' ? resolve : () => reject(new Error('old action failed')) })
      },
    } })
    const running = runBingToastAction(id)
    await nextTick()
    expect(bingToast.getToasts()[0]).toMatchObject({ message: 'Second', actionPending: false })
    expect(document.body.querySelector<HTMLButtonElement>('.bing-toast__action')!.disabled).toBe(false)

    const nextRunning = runBingToastAction(id)
    expect(next.onClick).toHaveBeenCalledTimes(1)
    settle()
    await running
    expect(bingToast.getToasts()[0]).toMatchObject({ message: 'Second', actionPending: true })
    finishNext()
    await nextRunning
    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('does not mark or close a recreated toast even when it reuses the same action', async () => {
    let resolve!: () => void
    const action = { label: 'Undo', onClick: () => {
      bingToast.close('recreated-action')
      bingToast.success({ id: 'recreated-action', message: 'New lifecycle', duration: 0, action })
      return new Promise<void>((done) => { resolve = done })
    } }
    const id = bingToast.success({ id: 'recreated-action', message: 'Original', duration: 0, action })
    const running = runBingToastAction(id)
    expect(bingToast.getToasts()[0]).toMatchObject({ message: 'New lifecycle', actionPending: false })
    resolve()
    await running
    expect(bingToast.getToasts()[0]).toMatchObject({ message: 'New lifecycle', actionPending: false })
  })

  it('keeps loading toasts until they are updated or closed', async () => {
    vi.useFakeTimers()

    mount(BingToast, {
      attachTo: document.body,
    })

    const id = bingToast.loading('Uploading')

    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    expect(bingToast.getToasts()).toHaveLength(1)
    expect(document.body.querySelector('.bing-toast')?.classList).toContain('bing-toast--loading')

    bingToast.success({
      id,
      message: 'Upload complete',
      duration: 400,
    })

    await nextTick()

    expect(bingToast.getToasts()[0]?.type).toBe('success')

    await vi.advanceTimersByTimeAsync(400)

    expect(bingToast.getToasts()).toHaveLength(0)
  })

  it('renders each toast only once when multiple viewports are mounted', async () => {
    mount(BingToast, {
      attachTo: document.body,
    })
    mount(BingToast, {
      attachTo: document.body,
    })

    bingToast.error({
      message: 'single render',
      duration: 0,
    })

    await nextTick()

    expect(document.body.querySelectorAll('.bing-toast')).toHaveLength(1)
    expect(document.body.textContent).toContain('single render')
  })

  it('keeps overflow toasts rendered inside the stack', async () => {
    mount(BingToast, {
      props: {
        max: 2,
      },
      attachTo: document.body,
    })

    bingToast.info({
      message: 'first',
      duration: 0,
      position: 'bottom-left',
    })
    bingToast.info({
      message: 'second',
      duration: 0,
      position: 'bottom-left',
    })
    bingToast.info({
      message: 'third',
      duration: 0,
      position: 'bottom-left',
    })

    await nextTick()

    const renderedToasts = document.body.querySelectorAll(
      '.bing-toast-region--bottom-left .bing-toast',
    )

    expect(
      document.body.querySelector('.bing-toast-region--bottom-left .bing-scrollbar'),
    ).not.toBeNull()
    expect(renderedToasts).toHaveLength(3)
    expect(document.body.textContent).toContain('first')
    expect(document.body.textContent).toContain('second')
    expect(document.body.textContent).toContain('third')
  })

  it('renders the custom scrollbar for right-side overflow stacks', async () => {
    mount(BingToast, {
      attachTo: document.body,
    })

    Array.from({ length: 4 }, (_, index) => {
      bingToast.error({
        message: `right ${index}`,
        duration: 0,
        position: 'right',
      })
    })

    await nextTick()

    expect(document.body.querySelector('.bing-toast-region--right .bing-scrollbar')).not.toBeNull()
    expect(
      document.body.querySelector('.bing-toast-region--right .bing-scrollbar__rail'),
    ).not.toBeNull()
  })
})
