import { mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import { h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingAnimatedText from './BingAnimatedText.vue'

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void

/** 用可控的 IntersectionObserver 模拟文字进出视口。 */
function mockViewport() {
  const observers: ObserverCallback[] = []
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: ObserverCallback) {
      observers.push(callback)
    }

    observe() {}
    disconnect() {}
  })

  return (visible: boolean) => observers.forEach(callback => callback([{
    isIntersecting: visible,
    intersectionRatio: visible ? 1 : 0,
    rootBounds: null,
  }]))
}

async function settle(wrapper: { vm: { $nextTick: () => Promise<void> } }) {
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

describe('BingAnimatedText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('renders slot content without an effect by default', () => {
    const wrapper = mount(BingAnimatedText, {
      slots: {
        default: 'Plain text',
      },
    })

    expect(wrapper.text()).toContain('Plain text')
    expect(wrapper.classes()).toContain('bing-animated-text--none')
  })

  it('applies configurable shine classes and variables', () => {
    const wrapper = mount(BingAnimatedText, {
      props: {
        effect: 'shine',
        trigger: 'hover',
        shineColor: '#ffffff',
        shineBaseColor: '#ec4899',
        shineSpeed: 1.6,
        shineDelay: 0.2,
        shineInterval: 1.8,
        shineDirection: 'right',
        shineAngle: 145,
      },
      slots: {
        default: 'Shiny',
      },
    })

    expect(wrapper.classes()).toContain('bing-animated-text--shine-hover')
    expect(wrapper.classes()).toContain('bing-animated-text--shine-direction-right')
    expect(wrapper.attributes('style')).toContain('--animated-text-shine-color: #ffffff')
    expect(wrapper.attributes('style')).toContain('--animated-text-shine-base-color: #ec4899')
    expect(wrapper.attributes('style')).toContain('--animated-text-shine-angle: 145deg')
  })

  it('uses a repeat interval for always shine animations', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const delayedCallSpy = vi.spyOn(gsap, 'delayedCall')
    const wrapper = mount(BingAnimatedText, {
      props: {
        effect: 'shine',
        trigger: 'always',
        shineSpeed: 1.1,
        shineDelay: 0.2,
        shineInterval: 1.9,
      },
      slots: {
        default: 'Shiny',
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(toSpy).toHaveBeenCalledTimes(1)
    expect(toSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: 1.1,
        delay: 0.2,
      }),
    )

    const tweenVars = toSpy.mock.calls[0][1]

    expect(tweenVars.repeat).toBeUndefined()
    expect(tweenVars.repeatDelay).toBeUndefined()

    tweenVars.onComplete?.()

    expect(delayedCallSpy).toHaveBeenCalledWith(1.9, expect.any(Function))

    wrapper.unmount()
  })

  it('does not restart a hover shine before the current sweep completes', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingAnimatedText, {
      props: {
        effect: 'shine',
        trigger: 'hover',
      },
      slots: {
        default: 'Hover shine',
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.trigger('pointerenter')
    await wrapper.trigger('pointerleave')
    await wrapper.trigger('pointerenter')

    expect(toSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.attributes('data-shine-playing')).toBe('true')

    wrapper.unmount()
  })

  it('keeps a hover jump running until its current timeline completes', async () => {
    const wrapper = mount(BingAnimatedText, {
      props: {
        effect: 'jump',
        trigger: 'hover',
      },
      slots: {
        default: 'Jump',
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.bing-animated-text__char').length).toBeGreaterThan(0)

    await wrapper.trigger('pointerenter')

    expect(wrapper.classes()).toContain('bing-animated-text--jump-hover')
    expect(wrapper.attributes('data-jump-playing')).toBe('true')

    await wrapper.trigger('pointerleave')
    await wrapper.trigger('pointerenter')

    expect(wrapper.attributes('data-jump-playing')).toBe('true')
    expect(wrapper.attributes('style')).toContain('--animated-text-jump-room: 8px')
  })

  it('uses the closest hover target so the whole area triggers the effect', async () => {
    const wrapper = mount({
      render: () => h('div', { class: 'card' }, [
        h('span', { class: 'card__padding' }),
        h(BingAnimatedText, { effect: 'jump', trigger: 'hover', hoverTarget: '.card' }, () => '整块感应'),
      ]),
    }, { attachTo: document.body })
    const text = wrapper.getComponent(BingAnimatedText)
    await settle(wrapper)

    await wrapper.get('.card').trigger('pointerenter')

    expect(text.attributes('data-jump-playing')).toBe('true')
    wrapper.unmount()
  })

  it('stops listening to the hover target after unmount', async () => {
    const card = document.createElement('div')
    card.className = 'card'
    document.body.appendChild(card)
    const wrapper = mount(BingAnimatedText, {
      props: { effect: 'shine', trigger: 'hover', hoverTarget: card },
      slots: { default: 'Shine' },
      attachTo: card,
    })
    await settle(wrapper)
    const toSpy = vi.spyOn(gsap, 'to')

    wrapper.unmount()
    card.dispatchEvent(new Event('pointerenter'))

    expect(toSpy).not.toHaveBeenCalled()
  })

  it('plays once only after the text has entered the viewport', async () => {
    const setVisible = mockViewport()
    const wrapper = mount(BingAnimatedText, {
      props: { effect: 'jump', trigger: 'once' },
      slots: { default: 'Later' },
    })
    await settle(wrapper)

    expect(wrapper.attributes('data-jump-ready')).toBe('true')
    expect(wrapper.attributes('data-jump-playing')).toBeUndefined()

    setVisible(true)

    expect(wrapper.attributes('data-jump-playing')).toBe('true')
    wrapper.unmount()
  })

  it('pauses looping animations while the text is out of view', async () => {
    const setVisible = mockViewport()
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingAnimatedText, {
      props: { effect: 'shimmer', trigger: 'always' },
      slots: { default: '正在思考' },
    })
    await settle(wrapper)
    const tween = toSpy.mock.results[0].value as gsap.core.Tween

    setVisible(false)
    expect(tween.paused()).toBe(true)

    setVisible(true)
    expect(tween.paused()).toBe(false)
    wrapper.unmount()
  })

  it('treats shimmer as a sweep effect with its own class', () => {
    const wrapper = mount(BingAnimatedText, {
      props: { effect: 'shimmer' },
      slots: { default: '正在思考' },
    })

    expect(wrapper.classes()).toEqual(expect.arrayContaining([
      'bing-animated-text--shimmer',
      'is-shine-active',
      'bing-animated-text--shine-always',
    ]))
  })

  it('exposes play for manual triggers', async () => {
    const wrapper = mount(BingAnimatedText, {
      props: { effect: 'jump', trigger: 'hover' },
      slots: { default: 'Manual' },
    })
    await settle(wrapper)

    ;(wrapper.vm as unknown as { play: () => void }).play()

    expect(wrapper.attributes('data-jump-playing')).toBe('true')
    wrapper.unmount()
  })

  it('does not animate when the effect is disabled', async () => {
    const wrapper = mount(BingAnimatedText, {
      props: { effect: 'jump', trigger: 'hover', disabled: true },
      slots: { default: 'Still' },
    })
    await settle(wrapper)

    await wrapper.trigger('pointerenter')

    expect(wrapper.attributes('data-jump-playing')).toBeUndefined()
    expect(wrapper.find('.bing-animated-text__char').exists()).toBe(false)
  })
})
