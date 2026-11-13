import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { gsap } from 'gsap'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import BingDialog from './BingDialog.vue'
import dialogSource from './BingDialog.vue?raw'
import type { BingDialogProps } from './BingDialog.types'

function finishDialogMotion() {
  const panel = document.querySelector('.bing-dialog')
  if (panel) gsap.getTweensOf(panel).find(tween => tween.parent !== gsap.globalTimeline)?.parent?.progress(1)
}

describe('BingDialog', () => {
  let current: VueWrapper | undefined
  afterEach(() => {
    current?.unmount()
    current = undefined
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.body.innerHTML = ''
    document.body.removeAttribute('style')
    document.documentElement.removeAttribute('style')
  })

  async function openDialog(props: Partial<BingDialogProps> = {}, content = '<input aria-label="内容输入" />') {
    current = mount(BingDialog, { props: { modelValue: true, ...props }, slots: { default: content }, attachTo: document.body })
    await nextTick()
    await nextTick()
    return current
  }

  it.each([
    ['<input id="first" /><input id="preferred" data-autofocus />', 'preferred'],
    ['<input id="first" /><input id="second" />', 'first'],
    ['<p>没有表单控件</p>', null],
  ])('prioritizes content focus without selecting a header action: %s', async (content, id) => {
    await openDialog({}, content!)
    expect(document.activeElement).toBe(id ? document.getElementById(id) : document.querySelector('.bing-dialog'))
  })

  it('resolves an explicit initial focus selector', async () => {
    await openDialog({ initialFocus: '#chosen' }, '<input /><button id="chosen">指定位置</button>')
    expect(document.activeElement).toBe(document.getElementById('chosen'))
  })

  it.each([{ busy: true }, { confirmLoading: true }])('blocks closing while busy, keeps controls in place and emits each reason: %j', async props => {
    const wrapper = await openDialog({ ...props, closeOnConfirm: true })
    const panel = document.querySelector('.bing-dialog')!
    const close = document.querySelector<HTMLButtonElement>('.bing-dialog__close')!
    const cancel = document.querySelector<HTMLButtonElement>('.bing-dialog__cancel')!
    expect(panel.getAttribute('aria-busy')).toBe('true')
    expect(close.disabled).toBe(true)
    expect(cancel.disabled).toBe(true)
    document.querySelector<HTMLElement>('.bing-dialog__overlay')!.click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    close.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    cancel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('close-prevented')).toEqual([['overlay'], ['escape'], ['close'], ['cancel']])
  })

  it('allows explicit busy=false to override confirmLoading', async () => {
    const wrapper = await openDialog({ confirmLoading: true, busy: false })
    document.querySelector<HTMLButtonElement>('.bing-dialog__close')!.click()
    expect(wrapper.emitted('close')).toEqual([['close']])
  })

  it('can disable rejection motion without silencing close-prevented', async () => {
    const wrapper = await openDialog({ closeOnOverlay: false, closeOnEsc: false, rejectFeedback: false })
    const timeline = vi.spyOn(gsap, 'timeline')
    document.querySelector<HTMLElement>('.bing-dialog__overlay')!.click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(wrapper.emitted('close-prevented')).toEqual([['overlay'], ['escape']])
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(timeline).not.toHaveBeenCalled()
  })

  it('keeps rapid reopen continuous, clears animation styles and kills motion on unmount', async () => {
    const wrapper = await openDialog()
    const panel = document.querySelector<HTMLElement>('.bing-dialog')!
    const opening = gsap.getTweensOf(panel)[0]!.parent!
    opening.progress(0.4)
    const opacity = panel.style.opacity
    await wrapper.setProps({ modelValue: false })
    expect(panel.style.opacity).toBe(opacity)
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    finishDialogMotion()
    await nextTick()
    expect(panel.closest('.bing-dialog-root')!.classList.contains('is-active')).toBe(true)
    expect(panel.style.opacity).toBe('')
    expect(panel.style.getPropertyValue('--dialog-motion-scale')).toBe('')
    await wrapper.setProps({ modelValue: false })
    wrapper.unmount()
    current = undefined
    expect(gsap.getTweensOf(panel)).toHaveLength(0)
    expect(document.body.style.overflow).toBe('')
  })

  it('uses only opacity for reduced motion and still completes closing', async () => {
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => query.includes('prefers-reduced-motion')
      ? { ...matchMedia(query), matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } : matchMedia(query))
    const wrapper = await openDialog()
    const panel = document.querySelector('.bing-dialog')!
    expect(gsap.getTweensOf(panel).every(tween => !('--dialog-motion-scale' in tween.vars))).toBe(true)
    await wrapper.setProps({ modelValue: false })
    finishDialogMotion()
    await nextTick()
    expect(document.querySelector('.bing-dialog')).toBeNull()
  })

  it.each([() => false, () => { throw new Error('guard failure') }, () => Promise.resolve(false), () => Promise.reject(new Error('guard failure'))])('retains the dialog when beforeClose declines or fails', async guard => {
    const wrapper = await openDialog({ beforeClose: guard })
    document.querySelector<HTMLElement>('.bing-dialog__overlay')!.click()
    await flushPromises()
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('close-prevented')).toEqual([['overlay']])
  })

  it('calls an async guard once while pending and ignores an old result after programmatic reopen', async () => {
    let resolve!: (value: boolean) => void
    const guard = vi.fn(() => new Promise<boolean>(done => { resolve = done }))
    const wrapper = await openDialog({ beforeClose: guard })
    document.querySelector<HTMLElement>('.bing-dialog__overlay')!.click()
    document.querySelector<HTMLElement>('.bing-dialog__overlay')!.click()
    expect(guard).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('close')).toBeUndefined()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    resolve(true)
    await flushPromises()
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(document.querySelector('.bing-dialog')!.hasAttribute('aria-busy')).toBe(false)
  })

  it('times out a pending guard without closing', async () => {
    vi.useFakeTimers()
    const wrapper = await openDialog({ beforeClose: () => new Promise(() => {}) })
    document.querySelector<HTMLElement>('.bing-dialog__overlay')!.click()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('close-prevented')).toEqual([['overlay']])
  })

  it('routes closeOnConfirm through the guard and preserves emit order', async () => {
    const guard = vi.fn(() => true)
    const wrapper = await openDialog({ closeOnConfirm: true, beforeClose: guard })
    document.querySelector<HTMLButtonElement>('.bing-dialog__footer .bing-button--primary')!.click()
    expect(guard).toHaveBeenCalledWith('confirm')
    expect(Object.keys(wrapper.emitted()).filter(name => ['confirm', 'update:modelValue', 'close'].includes(name)))
      .toEqual(['confirm', 'update:modelValue', 'close'])
  })

  it('teleports visible dialog content to body', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        title: 'Dialog title',
      },
      slots: {
        default: 'Dialog content',
      },
      attachTo: document.body,
    })
    await nextTick()

    const dialog = document.body.querySelector('.bing-dialog')

    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('Dialog title')
    expect(dialog?.textContent).toContain('Dialog content')
    expect(wrapper.find('.bing-dialog').exists()).toBe(false)
    expect(document.body.querySelectorAll('.bing-dialog__orb')).toHaveLength(0)

    wrapper.unmount()
  })

  it('does not render when modelValue is false', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: false,
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.querySelector('.bing-dialog')).toBeNull()

    wrapper.unmount()
  })

  it('emits close events from the close button', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    await document.body.querySelector<HTMLButtonElement>('.bing-dialog__close')?.click()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['close'])

    wrapper.unmount()
  })

  it('emits cancel and close from the default cancel button', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    const buttons = document.body.querySelectorAll<HTMLButtonElement>('.bing-dialog__footer button')

    await buttons[0]?.click()

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['cancel'])

    wrapper.unmount()
  })

  it('emits confirm and can close on confirm', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        closeOnConfirm: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    const buttons = document.body.querySelectorAll<HTMLButtonElement>('.bing-dialog__footer button')

    expect(buttons[1]?.classList).toContain('bing-button--primary')
    expect(buttons[1]?.classList).toContain('bing-button--shine-always')

    await buttons[1]?.click()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['confirm'])

    wrapper.unmount()
  })

  it('closes on overlay click when enabled', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    await document.body.querySelector<HTMLElement>('.bing-dialog__overlay')?.click()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['overlay'])

    wrapper.unmount()
  })

  it('can disable overlay backdrop blur', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        overlayBlur: false,
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.querySelector('.bing-dialog-root')?.classList).not.toContain(
      'has-overlay-blur',
    )
    expect(document.body.querySelector('.bing-dialog__ambience')).toBeNull()
    expect(document.body.querySelectorAll('.bing-dialog__orb')).toHaveLength(0)

    wrapper.unmount()
  })

  it('keeps backdrop blur on the overlay but not on the dialog surface', () => {
    const overlayBlurRule = dialogSource.match(
      /\.bing-dialog-root\.has-overlay-blur \.bing-dialog__overlay-blur \{[\s\S]*?\n\}/,
    )?.[0]
    const surfaceRule = dialogSource.match(
      /\.bing-dialog__surface \{[\s\S]*?\n\}/,
    )?.[0]

    expect(overlayBlurRule).toContain('backdrop-filter')
    expect(surfaceRule).not.toContain('backdrop-filter')
  })

  it('uses themed panel layers so overlay blur does not read as panel glass', () => {
    const surfaceRule = dialogSource.match(
      /\.bing-dialog__surface \{[\s\S]*?\n\}/,
    )?.[0] ?? ''
    const footerRule = dialogSource.match(/\.bing-dialog__footer \{[\s\S]*?\n\}/)?.[0] ?? ''
    const surfaceBackground = (surfaceRule.match(/background:[^\n]+/)?.[0] ?? '').trimEnd()
    const footerBackground = (footerRule.match(/background:[^\n]+/)?.[0] ?? '').trimEnd()

    expect(surfaceBackground).toBe('background: var(--bing-surface-solid);')
    expect(surfaceRule).not.toContain('var(--bing-surface-strong)')
    expect(surfaceBackground).not.toContain('rgba(')
    expect(footerBackground).toBe('background: transparent;')
    expect(footerBackground).not.toContain('rgba(')
  })

  it('draws the visible panel border on the dialog shell', () => {
    const dialogRule = dialogSource.match(/\.bing-dialog \{[\s\S]*?\n\}/)?.[0] ?? ''
    const surfaceRule = dialogSource.match(
      /\.bing-dialog__surface \{[\s\S]*?\n\}/,
    )?.[0] ?? ''

    expect(dialogRule).toContain('border: 1px solid var(--bing-popover-border);')
    expect(dialogRule).toContain('box-shadow:')
    expect(surfaceRule).not.toMatch(/\n\s*border:/)
  })

  it('does not expose panel glass variables on the dialog root or surface', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        glassBlur: 18,
        glassOpacity: 0.5,
        glassSaturation: 1.6,
      },
      attachTo: document.body,
    })
    await nextTick()
    const rootStyle = document.body.querySelector<HTMLElement>('.bing-dialog-root')?.getAttribute(
      'style',
    )
    const dialog = document.body.querySelector<HTMLElement>('.bing-dialog')

    expect(rootStyle).not.toContain('--bing-dialog-glass-blur')
    expect(rootStyle).not.toContain('--bing-dialog-glass-opacity')
    expect(rootStyle).not.toContain('--bing-dialog-glass-saturation')
    expect(rootStyle).toContain('--bing-dialog-overlay-glass-blur')
    expect(rootStyle).toContain('--bing-dialog-overlay-glass-saturation')
    expect(dialog?.classList).not.toContain('is-glass')
    expect(dialogSource).not.toContain('.bing-dialog.is-glass')
    expect(dialogSource).not.toContain('--bing-dialog-glass')

    wrapper.unmount()
  })

  it('renders configurable overlay orbs only with backdrop blur enabled', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        overlayBlur: true,
        overlayOrbs: [
          {
            id: 'rose',
            color: '#fb7185',
            x: 18,
            y: 24,
            size: 280,
            opacity: 0.16,
            blur: 48,
          },
          {
            id: 'cyan',
            color: '#06b6d4',
            x: 82,
            y: 20,
            size: '22rem',
          },
        ],
      },
      attachTo: document.body,
    })
    await nextTick()

    const anchors = document.body.querySelectorAll<HTMLElement>('.bing-dialog__orb-anchor')

    expect(anchors).toHaveLength(2)
    expect(anchors[0]?.style.getPropertyValue('--bing-dialog-orb-color')).toBe('#fb7185')
    expect(anchors[0]?.style.width).toBe('280px')
    expect(anchors[1]?.style.getPropertyValue('--bing-dialog-orb-color')).toBe('#06b6d4')
    expect(anchors[1]?.style.width).toBe('22rem')

    wrapper.unmount()
  })

  it('marks overlay orbs for GSAP motion when animation is enabled', async () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline')
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        overlayBlur: true,
        overlayOrbsAnimated: true,
        overlayOrbs: [
          { color: '#f472b6' },
          { color: '#0ea5e9' },
          { color: '#a78bfa' },
        ],
      },
      attachTo: document.body,
    })
    await nextTick()

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.bing-dialog-root')?.classList).toContain(
      'has-animated-orbs',
    )
    expect(document.body.querySelectorAll('.bing-dialog__orb')).toHaveLength(3)
    expect(timelineSpy.mock.calls.filter(([options]) => options?.repeat === -1)).toHaveLength(3)

    wrapper.unmount()
  })

  it('restores the peek state on pointer release without requiring pointer leave', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    const peekButton = document.body.querySelector<HTMLButtonElement>('.bing-dialog__peek')

    expect(peekButton).not.toBeNull()
    expect(peekButton?.getAttribute('aria-label')).toBe('按住查看背景')

    await wrapper.vm.$nextTick()
    finishDialogMotion()
    const timelineSpy = vi.spyOn(gsap, 'timeline')

    peekButton?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    )
    await wrapper.vm.$nextTick()

    peekButton?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      }),
    )
    await wrapper.vm.$nextTick()

    expect(timelineSpy).toHaveBeenCalledTimes(1)
    const peekTimeline = timelineSpy.mock.results[0]?.value
    const peekAnchor = document.body.querySelector('.bing-dialog__peek-anchor')
    const peekAnchorTweens = peekTimeline
      ?.getChildren(false, true, false)
      .filter((animation: gsap.core.Tween) => animation.targets().includes(peekAnchor))

    expect(peekAnchorTweens).toHaveLength(1)
    expect(peekAnchorTweens?.[0]?.vars.scale).toBeUndefined()
    expect(document.body.querySelector('.bing-dialog__peek')?.getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(document.body.querySelector('.bing-dialog-root')?.classList).toContain('is-peeking')
    expect(document.body.querySelector('.bing-dialog__peek svg')?.classList).toContain(
      'bing-svg-icon--eye-off',
    )
    expect(document.body.querySelector('.bing-dialog__peek-anchor')).not.toBeNull()
    expect(document.body.querySelector<HTMLElement>('.bing-dialog')?.style.opacity).toBe('')

    peekButton?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.bing-dialog__peek')?.getAttribute('aria-pressed')).toBe(
      'true',
    )

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'mouse',
      }),
    )
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.bing-dialog__peek')?.getAttribute('aria-pressed')).toBeNull()
    expect(document.body.querySelector('.bing-dialog-root')?.classList).not.toContain('is-peeking')
    expect(document.body.querySelector<HTMLElement>('.bing-dialog-root')?.style.opacity).toBe('')

    wrapper.unmount()
  })

  it('can hide the peek button', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        showPeek: false,
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.querySelector('.bing-dialog__peek')).toBeNull()

    wrapper.unmount()
  })

  it('uses a focusable smooth scrollbar for the dialog body by default and supports opt-out', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      slots: {
        default: 'Scrollable dialog content',
      },
      attachTo: document.body,
    })
    await nextTick()

    const scrollbar = wrapper.findComponent(BingScrollbar)

    expect(scrollbar.exists()).toBe(true)
    expect(scrollbar.props('smooth')).toBe(true)
    expect(scrollbar.props('focusable')).toBe(true)
    expect(
      document.body.querySelector('.bing-dialog__body-scroll .bing-dialog__body'),
    ).not.toBeNull()

    await wrapper.setProps({ smoothScroll: false })

    expect(scrollbar.props('smooth')).toBe(false)

    wrapper.unmount()
  })

  it('stops pending body scroll motion when closing and unmounting', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      attachTo: document.body,
    })
    await nextTick()
    const bodyScroll = wrapper.vm.$refs.bodyScrollRef as { stop: () => void }
    const stopSpy = vi.spyOn(bodyScroll, 'stop')

    await document.body.querySelector<HTMLButtonElement>('.bing-dialog__close')?.click()

    expect(stopSpy).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ modelValue: false })

    expect(stopSpy).toHaveBeenCalledTimes(2)

    wrapper.unmount()

    expect(stopSpy).toHaveBeenCalledTimes(3)
  })

  it('lets the body scrollbar consume wheel input before the dialog boundary lock', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        smoothScroll: {
          duration: 0,
          smoothTouchpad: true,
        },
      },
      slots: {
        default: '<div class="wheel-target">Scrollable dialog content</div>',
      },
      attachTo: document.body,
    })
    await nextTick()

    await wrapper.vm.$nextTick()

    const viewport = document.body.querySelector<HTMLElement>(
      '.bing-dialog__body-scroll .bing-scrollbar__viewport',
    )
    const target = document.body.querySelector<HTMLElement>('.wheel-target')

    expect(viewport).not.toBeNull()
    expect(target).not.toBeNull()

    Object.defineProperties(viewport as HTMLElement, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, value: 0, writable: true },
    })

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })

    target?.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(viewport?.scrollTop).toBeGreaterThan(0)

    wrapper.unmount()
  })

  it('allows nested scrolling until its boundary, then blocks the page behind the dialog', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      slots: {
        default:
          '<div class="nested-scroll" style="overflow-y: auto"><div style="height: 400px">Nested content</div></div>',
      },
      attachTo: document.body,
    })
    await nextTick()

    await wrapper.vm.$nextTick()

    const nestedScroller = document.body.querySelector<HTMLElement>('.nested-scroll')

    expect(nestedScroller).not.toBeNull()

    Object.defineProperties(nestedScroller as HTMLElement, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, value: 0, writable: true },
    })

    const scrollingEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })

    nestedScroller?.dispatchEvent(scrollingEvent)

    expect(scrollingEvent.defaultPrevented).toBe(false)

    if (nestedScroller) {
      nestedScroller.scrollTop = 200
    }

    const boundaryEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })

    nestedScroller?.dispatchEvent(boundaryEvent)

    expect(boundaryEvent.defaultPrevented).toBe(true)

    wrapper.unmount()
  })

  it('prevents wheel events from scrolling the page behind the dialog', async () => {
    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    await wrapper.vm.$nextTick()

    const root = document.body.querySelector('.bing-dialog-root')
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })

    root?.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)

    wrapper.unmount()
  })

  it('locks body scroll while open when lockScroll is true', async () => {
    vi.useFakeTimers()

    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        lockScroll: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.overscrollBehavior).toBe('contain')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overscrollBehavior).toBe('contain')

    await wrapper.setProps({ modelValue: false })

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')

    finishDialogMotion()
    await nextTick()

    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.overscrollBehavior).toBe('')
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.documentElement.style.overscrollBehavior).toBe('')

    wrapper.unmount()
  })

  it('compensates for scrollbar width while locking scroll', async () => {
    vi.useFakeTimers()

    const originalInnerWidth = window.innerWidth
    const originalClientWidth = document.documentElement.clientWidth

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000,
    })

    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 983,
    })

    document.body.style.paddingRight = '5px'

    const wrapper = mount(BingDialog, {
      props: {
        modelValue: true,
        lockScroll: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.style.paddingRight).toBe('22px')

    await wrapper.setProps({ modelValue: false })

    expect(document.body.style.paddingRight).toBe('22px')

    finishDialogMotion()
    await nextTick()

    expect(document.body.style.paddingRight).toBe('5px')

    wrapper.unmount()

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })

    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: originalClientWidth,
    })
  })
})
