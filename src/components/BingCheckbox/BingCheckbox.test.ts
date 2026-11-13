import { enableAutoUnmount, mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingCheckbox from './BingCheckbox.vue'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import BingConfigProvider from '../BingConfigProvider/BingConfigProvider.vue'

const { feedback } = vi.hoisted(() => ({ feedback: vi.fn() }))
vi.mock('../../motion/useClickFeedback', () => ({ useClickFeedback: () => ({ playClickFeedback: feedback }) }))

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
  feedback.mockClear()
})

describe('BingCheckbox', () => {
  it('emits v-model and change values from the native checkbox', async () => {
    const wrapper = mount(BingCheckbox, {
      props: {
        modelValue: false,
        label: 'Enable motion',
      },
    })

    await wrapper.get('input').setValue(true)

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe(true)
  })

  it('renders checked and indeterminate states without changing control size', async () => {
    const wrapper = mount(BingCheckbox, {
      props: {
        modelValue: false,
        size: 26,
      },
    })

    expect(wrapper.attributes('style')).toContain('--bing-checkbox-size: 26px')

    await wrapper.setProps({ indeterminate: true })
    expect(wrapper.classes()).toContain('is-indeterminate')

    await wrapper.setProps({ indeterminate: false, modelValue: true })
    expect(wrapper.classes()).toContain('is-checked')
  })

  it.each([{ modelValue: false }, { modelValue: true }, { indeterminate: true }])('renders static SVG state during SSR: %j', async (props) => {
    const timeline = vi.spyOn(gsap, 'timeline')
    const html = await renderToString(createSSRApp({ render: () => h(BingCheckbox, props) }))
    expect(html).toContain('bing-checkbox__fill')
    expect(html).toContain('pathLength="1"')
    expect(html).toContain('d="M4 12l5 5L20 6"')
    expect(html.includes('is-checked')).toBe(Boolean(props.modelValue))
    expect(html.includes('is-indeterminate')).toBe(Boolean(props.indeterminate))
    expect(timeline).not.toHaveBeenCalled()
  })

  it('hydrates without a class mismatch when the browser prefers reduced motion', async () => {
    let reduced = false
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      matches: reduced, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }))
    const appOptions = { render: () => h(BingCheckbox, { modelValue: true, label: '选中项' }) }
    const container = document.createElement('div')
    container.innerHTML = await renderToString(createSSRApp(appOptions))
    document.body.append(container)
    reduced = true
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = createSSRApp(appOptions)
    try {
      app.mount(container)
      await nextTick()
      expect(warn.mock.calls.flat().join(' ')).not.toMatch(/hydration/i)
      expect(container.querySelector('.bing-checkbox')?.classList.contains('is-reduced-motion')).toBe(true)
      expect(container.querySelector('input')?.checked).toBe(true)
    } finally {
      app.unmount()
      container.remove()
    }
  })

  it('settles state immediately when the config requests reduced motion', async () => {
    const timeline = vi.spyOn(gsap, 'timeline')
    const wrapper = mount(BingConfigProvider, {
      props: { reducedMotion: 'always' },
      slots: { default: () => h(BingCheckbox, { label: '减少动态效果' }) },
    })
    await wrapper.get('input').setValue(true)
    expect(timeline).not.toHaveBeenCalled()
    expect(wrapper.get('.bing-checkbox').classes()).toContain('is-reduced-motion')
  })

  it('plays completion particles only when checking', async () => {
    const wrapper = mount(BingCheckbox)
    await wrapper.get('input').setValue(true)
    expect(feedback).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ modelValue: true })
    await wrapper.get('input').setValue(false)
    expect(feedback).toHaveBeenCalledTimes(1)
  })

  it('supports disabled native interaction', async () => {
    const wrapper = mount(BingCheckbox, {
      props: {
        disabled: true,
        label: 'Unavailable',
      },
    })

    expect(wrapper.get('input').attributes()).toHaveProperty('disabled')
    expect(wrapper.classes()).toContain('is-disabled')
  })

  it('renders a non-interactive decorative control for composite components', () => {
    const wrapper = mount(BingCheckbox, {
      props: {
        decorative: true,
        modelValue: true,
        size: 'sm',
      },
    })

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.classes()).toContain('is-decorative')
  })
})
