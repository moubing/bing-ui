import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingAnimatedText from '../BingAnimatedText/BingAnimatedText.vue'
import BingButton from './BingButton.vue'

describe('BingButton', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders slot content with default classes', () => {
    const wrapper = mount(BingButton, {
      slots: {
        default: 'Primary action',
      },
    })

    const button = wrapper.get('button')

    expect(button.text()).toContain('Primary action')
    expect(button.classes()).toContain('bing-button--primary')
    expect(button.classes()).toContain('bing-button--md')
    expect(button.classes()).toContain('bing-button--rounded-md')
    expect(button.classes()).toContain('bing-button--shine-always')
    expect(wrapper.getComponent(BingAnimatedText).props('effect')).toBe('shine')
  })

  it('keeps shiny text off by default for non-primary variants', () => {
    const wrapper = mount(BingButton, {
      props: {
        variant: 'secondary',
      },
      slots: {
        default: 'Secondary action',
      },
    })

    expect(wrapper.get('button').classes()).not.toContain('bing-button--shine-always')
  })

  it('applies variant, size, rounded, and block options', () => {
    const wrapper = mount(BingButton, {
      props: {
        variant: 'secondary',
        size: 'lg',
        rounded: 'md',
        block: true,
      },
      slots: {
        default: 'Secondary',
      },
    })

    const classes = wrapper.get('button').classes()

    expect(classes).toContain('bing-button--secondary')
    expect(classes).toContain('bing-button--lg')
    expect(classes).toContain('bing-button--rounded-md')
    expect(classes).toContain('is-block')
  })

  it('supports configurable shiny text classes and variables', () => {
    const wrapper = mount(BingButton, {
      props: {
        textShine: 'always',
        shineColor: '#ffffff',
        shineBaseColor: '#f472b6',
        shineSpeed: 1.8,
        shineDelay: 0.3,
        shineInterval: 1.7,
        shineDirection: 'right',
        shineAngle: 135,
      },
      slots: {
        default: 'Shiny',
      },
    })

    const button = wrapper.get('button')

    expect(button.classes()).toContain('bing-button--shine-always')
    expect(button.classes()).toContain('bing-button--shine-direction-right')
    expect(button.attributes('style')).toContain('--animated-text-shine-color: #ffffff')
    expect(button.attributes('style')).toContain('--animated-text-shine-base-color: #f472b6')
    expect(button.attributes('style')).toContain('--animated-text-shine-angle: 135deg')
    expect(wrapper.getComponent(BingAnimatedText).props()).toMatchObject({
      shineSpeed: 1.8,
      shineDelay: 0.3,
      shineInterval: 1.7,
    })
  })

  it('passes jump text effect settings to the animated text layer', () => {
    const wrapper = mount(BingButton, {
      props: {
        textEffect: 'jump',
        textEffectTrigger: 'hover',
        textJumpY: -8,
        textJumpStagger: 0.05,
        textJumpDuration: 0.42,
      },
      slots: {
        default: 'Jump',
      },
    })

    const button = wrapper.get('button')
    const animatedText = wrapper.getComponent(BingAnimatedText)

    expect(button.classes()).toContain('bing-button--text-jump')
    expect(button.classes()).toContain('bing-button--text-trigger-hover')
    expect(animatedText.props()).toMatchObject({
      effect: 'jump',
      trigger: 'hover',
      jumpY: -8,
      jumpStagger: 0.05,
      jumpDuration: 0.42,
    })
  })

  it('renders prefix and suffix icon slots', () => {
    const wrapper = mount(BingButton, {
      slots: {
        prefix: '<svg data-test="prefix"></svg>',
        default: 'With icons',
        suffix: '<svg data-test="suffix"></svg>',
      },
    })

    expect(wrapper.find('[data-test="prefix"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="suffix"]').exists()).toBe(true)
  })

  it('supports icon-only usage with aria label', () => {
    const wrapper = mount(BingButton, {
      props: {
        ariaLabel: 'Open menu',
      },
      slots: {
        prefix: '<svg data-test="icon"></svg>',
      },
    })

    const button = wrapper.get('button')

    expect(button.attributes('aria-label')).toBe('Open menu')
    expect(button.classes()).toContain('is-icon-only')
  })

  it('emits click when available', async () => {
    const wrapper = mount(BingButton, {
      slots: {
        default: 'Click',
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('blocks click while loading', async () => {
    const wrapper = mount(BingButton, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Loading',
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').classes()).toContain('is-loading')
    expect(wrapper.find('.bing-button__loading-indicator').exists()).toBe(false)
    expect(wrapper.find('.bing-button__resting-content').exists()).toBe(true)
    expect(wrapper.getComponent(BingAnimatedText).props()).toMatchObject({
      effect: 'jump', trigger: 'always', disabled: false,
    })
    wrapper.unmount()
  })

  it('preserves the label across loading changes and restores the configured effect', async () => {
    const wrapper = mount(BingButton, {
      props: { textEffect: 'shine', textEffectTrigger: 'hover' },
      slots: {
        default: 'Save',
      },
    })

    const restingContent = wrapper.get('.bing-button__resting-content').element
    const textContent = wrapper.get('.bing-animated-text__content').element

    await wrapper.setProps({ loading: true })
    expect(wrapper.getComponent(BingAnimatedText).props()).toMatchObject({ effect: 'jump', trigger: 'always' })
    await wrapper.setProps({ loading: false })

    expect(wrapper.get('.bing-button__resting-content').element).toBe(restingContent)
    expect(wrapper.get('.bing-animated-text__content').element).toBe(textContent)
    expect(wrapper.get('.bing-animated-text__content').text()).toBe('Save')
    expect(wrapper.getComponent(BingAnimatedText).props()).toMatchObject({ effect: 'shine', trigger: 'hover' })
    expect(wrapper.get('button').classes()).not.toContain('is-loading')
    expect(wrapper.attributes('aria-busy')).toBeUndefined()
    expect(wrapper.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps a spinner fallback for icon-only loading buttons', () => {
    const wrapper = mount(BingButton, {
      props: { loading: true, ariaLabel: '保存' },
      slots: { prefix: '<svg></svg>' },
    })
    expect(wrapper.find('.bing-button__loading-indicator').exists()).toBe(true)
    expect(wrapper.findComponent(BingAnimatedText).exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('保存')
    wrapper.unmount()
  })

  it('throttles rapid clicks when explicitly enabled', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)

    const wrapper = mount(BingButton, {
      props: {
        throttle: true,
        throttleDelay: 600,
      },
      slots: {
        default: 'Throttled',
      },
    })

    await wrapper.get('button').trigger('click')

    vi.setSystemTime(1_200)
    await wrapper.get('button').trigger('click')

    vi.setSystemTime(1_600)
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(2)
    expect(wrapper.emitted('throttled')).toHaveLength(1)
    expect(wrapper.emitted('throttled')?.[0]?.[0]).toMatchObject({ remaining: 400 })
  })

  it('accepts rapid clicks by default', async () => {
    const wrapper = mount(BingButton, {
      slots: {
        default: 'No throttle',
      },
    })

    await wrapper.get('button').trigger('click')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(2)
    expect(wrapper.emitted('throttled')).toBeUndefined()
  })

  it('emits focus and blur events', async () => {
    const wrapper = mount(BingButton, {
      slots: {
        default: 'Focusable',
      },
    })

    await wrapper.get('button').trigger('focus')
    await wrapper.get('button').trigger('blur')

    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })
})
