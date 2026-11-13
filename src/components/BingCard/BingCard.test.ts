import { mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingCard from './BingCard.vue'

function rect(width = 240, height = 160): DOMRect {
  return {
    bottom: height,
    height,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }
}

function mockVisibleIntersectionObserver() {
  class MockIntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []
    private readonly callback: IntersectionObserverCallback

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }

    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
    unobserve = vi.fn()

    observe = vi.fn((target: Element) => {
      this.callback(
        [
          {
            isIntersecting: true,
            target,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      )
    })
  }

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
}

describe('BingCard', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders title, description, default slot, and footer slot', () => {
    const wrapper = mount(BingCard, {
      props: {
        title: 'Interactive card',
        description: 'Pointer tilt surface',
        variant: 'accent',
        padding: 'lg',
        rounded: 'xl',
        entrance: 'none',
      },
      slots: {
        default: '<p>Card body</p>',
        footer: '<button>Action</button>',
      },
    })

    expect(wrapper.text()).toContain('Interactive card')
    expect(wrapper.text()).toContain('Pointer tilt surface')
    expect(wrapper.text()).toContain('Card body')
    expect(wrapper.text()).toContain('Action')
    expect(wrapper.classes()).toContain('bing-card--accent')
    expect(wrapper.classes()).toContain('bing-card--padding-lg')
    expect(wrapper.classes()).toContain('bing-card--rounded-xl')
    expect(wrapper.classes()).toContain('is-glass')
    expect(wrapper.find('.bing-card__back').text()).toContain('Bing UI')
  })

  it('plays the configured entrance when the card enters the viewport', async () => {
    mockVisibleIntersectionObserver()
    const fromToSpy = vi.spyOn(gsap, 'fromTo')

    const wrapper = mount(BingCard, {
      props: {
        entrance: 'bubble',
        entranceDuration: 0.9,
      },
      slots: {
        default: 'Animated card',
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('enter')).toHaveLength(1)
    expect(fromToSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        autoAlpha: 0,
        scale: 0.78,
      }),
      expect.objectContaining({
        autoAlpha: 1,
        duration: 0.9,
        ease: 'elastic.out(1, 0.64)',
      }),
    )
  })

  it('does not let pointer tilt interrupt an active entrance animation', async () => {
    mockVisibleIntersectionObserver()
    const fromToSpy = vi.spyOn(gsap, 'fromTo')
    const toSpy = vi.spyOn(gsap, 'to')

    const wrapper = mount(BingCard, {
      props: {
        entrance: 'fade-up',
        tilt: true,
      },
      slots: {
        default: 'Animated card',
      },
    })

    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue(rect())
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const surface = wrapper.get('.bing-card__surface').element
    const entranceCall = fromToSpy.mock.calls.find(
      ([target, , vars]) => target === surface && vars.autoAlpha === 1,
    )

    expect(entranceCall).toBeDefined()

    await wrapper.trigger('pointermove', {
      clientX: 180,
      clientY: 40,
    })

    expect(
      toSpy.mock.calls.some(
        ([target, vars]) => target === surface && vars.overwrite === true,
      ),
    ).toBe(false)

    entranceCall?.[2].onComplete?.()
    await wrapper.trigger('pointermove', {
      clientX: 180,
      clientY: 40,
    })

    expect(
      toSpy.mock.calls.some(
        ([target, vars]) => target === surface && vars.overwrite === true,
      ),
    ).toBe(true)
  })

  it('uses an X-axis multi-turn flip for rotate-up entrance', async () => {
    mockVisibleIntersectionObserver()
    const fromToSpy = vi.spyOn(gsap, 'fromTo')

    const wrapper = mount(BingCard, {
      props: {
        entrance: 'rotate-up',
        entranceDuration: 1.25,
        flipTurns: 3,
      },
      slots: {
        default: 'Flip card',
        back: 'Back face',
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.bing-card__back').text()).toContain('Back face')
    expect(fromToSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotationX: -1080,
        z: -120,
      }),
      expect.objectContaining({
        rotationX: 0,
        z: 0,
        duration: 1.25,
      }),
    )
  })

  it('supports configurable axis and ease for rotate-up entrance', async () => {
    mockVisibleIntersectionObserver()
    const fromToSpy = vi.spyOn(gsap, 'fromTo')

    const wrapper = mount(BingCard, {
      props: {
        entrance: 'rotate-up',
        entranceDuration: 1.4,
        flipAxis: 'y',
        flipTurns: 2,
        flipEase: 'back.out(1.7)',
      },
      slots: {
        default: 'Y flip card',
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(fromToSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotationY: -720,
      }),
      expect.objectContaining({
        rotationX: 0,
        rotationY: 0,
        rotation: 0,
        ease: 'back.out(1.7)',
        duration: 1.4,
      }),
    )
  })

  it('shows hold progress, flips to the back, and restores on release by default', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingCard, {
      props: {
        entrance: 'none',
        flipAxis: 'y',
        longPressDelay: 420,
      },
      slots: {
        default: 'Front face',
        back: 'Back face',
      },
    })

    await wrapper.trigger('pointerdown', {
      button: 0,
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    })

    const progressElement = wrapper.get('.bing-card__press-feedback').element
    const progressCall = toSpy.mock.calls.find(
      ([target, vars]) =>
        target === progressElement &&
        vars.duration === 0.42 &&
        vars['--bing-card-press-progress'] === 1,
    )

    expect(wrapper.classes()).toContain('is-pressing')
    expect(progressCall).toBeDefined()

    progressCall?.[1].onComplete?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('long-press')).toHaveLength(1)
    expect(wrapper.emitted('flip')?.[0]).toEqual(['back'])
    expect(wrapper.classes()).toContain('is-flipped')
    expect(toSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotationX: 0,
        rotationY: 180,
        rotation: 0,
      }),
    )

    await wrapper.trigger('pointerup', {
      pointerId: 1,
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('flip')?.[1]).toEqual(['front'])
    expect(wrapper.classes()).not.toContain('is-flipped')
    expect(wrapper.classes()).not.toContain('is-pressing')
    expect(toSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotationX: 0,
        rotationY: 0,
        rotation: 0,
        scale: 1,
      }),
    )
  })

  it('can keep the back face visible after release', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingCard, {
      props: {
        entrance: 'none',
        flipAxis: 'x',
        longPressDelay: 360,
        longPressRelease: 'stay',
      },
      slots: {
        default: 'Front face',
        back: 'Back face',
      },
    })

    await wrapper.trigger('pointerdown', {
      button: 0,
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    })

    const progressElement = wrapper.get('.bing-card__press-feedback').element
    const progressCall = toSpy.mock.calls.find(
      ([target, vars]) =>
        target === progressElement &&
        vars.duration === 0.36 &&
        vars['--bing-card-press-progress'] === 1,
    )

    progressCall?.[1].onComplete?.()
    await wrapper.vm.$nextTick()
    await wrapper.trigger('pointerup', {
      pointerId: 1,
    })

    expect(wrapper.emitted('flip')).toEqual([['back']])
    expect(wrapper.classes()).toContain('is-flipped')
    expect(wrapper.classes()).not.toContain('is-pressing')
  })

  it('does not replace the return flip tween when pointerleave follows an outside release', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingCard, {
      props: {
        entrance: 'none',
        flipAxis: 'y',
        longPressDelay: 360,
      },
      slots: {
        default: 'Front face',
        back: 'Back face',
      },
    })

    await wrapper.trigger('pointerdown', {
      button: 0,
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    })

    const progressElement = wrapper.get('.bing-card__press-feedback').element
    const progressCall = toSpy.mock.calls.find(
      ([target, vars]) =>
        target === progressElement &&
        vars.duration === 0.36 &&
        vars['--bing-card-press-progress'] === 1,
    )

    progressCall?.[1].onComplete?.()
    await wrapper.vm.$nextTick()
    await wrapper.trigger('pointerup', {
      pointerId: 1,
    })

    const returnTweenCount = toSpy.mock.calls.filter(
      ([, vars]) =>
        vars.duration === 0.68 &&
        vars.ease === 'power3.inOut' &&
        vars.rotationY === 0,
    ).length

    await wrapper.trigger('pointerleave')

    expect(returnTweenCount).toBe(1)
    expect(
      toSpy.mock.calls.filter(
        ([, vars]) =>
          vars.duration === 0.48 &&
          vars.ease === 'elastic.out(1, 0.72)' &&
          vars.rotationY === 0,
      ),
    ).toHaveLength(0)
  })

  it('flips on click when flipTrigger is click', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingCard, {
      props: {
        entrance: 'none',
        flipAxis: 'y',
        flipTrigger: 'click',
      },
      slots: {
        default: 'Front face',
        back: 'Back face',
      },
    })

    expect(wrapper.find('.bing-card__press-feedback').exists()).toBe(false)

    await wrapper.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('flip')?.[0]).toEqual(['back'])
    expect(wrapper.classes()).toContain('is-flipped')
    expect(toSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotationX: 0,
        rotationY: 180,
        rotation: 0,
      }),
    )

    await wrapper.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('flip')?.[1]).toEqual(['front'])
    expect(wrapper.classes()).not.toContain('is-flipped')
  })

  it('does not flip when flipTrigger is none', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingCard, {
      props: {
        entrance: 'none',
        flipTrigger: 'none',
      },
      slots: {
        default: 'Front face',
        back: 'Back face',
      },
    })

    expect(wrapper.find('.bing-card__press-feedback').exists()).toBe(false)

    await wrapper.trigger('pointerdown', {
      button: 0,
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    })
    await wrapper.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('long-press')).toBeUndefined()
    expect(wrapper.emitted('flip')).toBeUndefined()
    expect(wrapper.classes()).not.toContain('is-flipped')
    expect(toSpy).not.toHaveBeenCalled()
  })

  it('tilts toward the pointer and resets on leave', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingCard, {
      props: {
        entrance: 'none',
        tiltMax: 10,
        tiltScale: 1.03,
      },
      slots: {
        default: 'Tilt card',
      },
    })

    vi.spyOn(wrapper.get('.bing-card').element, 'getBoundingClientRect').mockReturnValue(
      rect(200, 100),
    )

    await wrapper.trigger('pointermove', {
      clientX: 200,
      clientY: 0,
    })

    expect(toSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotationX: 10,
        rotationY: 10,
        scale: 1.03,
      }),
    )

    await wrapper.trigger('pointerleave')

    expect(toSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        rotationX: 0,
        rotationY: 0,
        scale: 1,
      }),
    )
  })

  it('does not tilt when disabled', async () => {
    const toSpy = vi.spyOn(gsap, 'to')
    const wrapper = mount(BingCard, {
      props: {
        disabled: true,
        entrance: 'none',
      },
      slots: {
        default: 'Disabled card',
      },
    })

    vi.spyOn(wrapper.get('.bing-card').element, 'getBoundingClientRect').mockReturnValue(
      rect(200, 100),
    )

    await wrapper.trigger('pointermove', {
      clientX: 200,
      clientY: 0,
    })

    expect(toSpy).not.toHaveBeenCalled()
  })
})
