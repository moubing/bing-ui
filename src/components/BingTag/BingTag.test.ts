import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import BingTag from './BingTag.vue'

enableAutoUnmount(afterEach)

describe('BingTag', () => {
  it('renders its label and visual variants', () => {
    const wrapper = mount(BingTag, {
      props: {
        label: 'Aurora',
        size: 'sm',
        tone: 'secondary',
        variant: 'soft',
      },
    })

    expect(wrapper.text()).toBe('Aurora')
    expect(wrapper.classes()).toContain('bing-tag--sm')
    expect(wrapper.classes()).toContain('bing-tag--secondary')
    expect(wrapper.classes()).toContain('bing-tag--soft')
  })

  it('supports semantic tones for status tags', () => {
    const wrapper = mount(BingTag, {
      props: {
        label: 'Shipped',
        tone: 'success',
        variant: 'soft',
      },
    })

    expect(wrapper.classes()).toContain('bing-tag--success')
    expect(wrapper.classes()).toContain('bing-tag--soft')
  })

  it('emits close without bubbling to the parent', async () => {
    const wrapper = mount(BingTag, {
      props: {
        label: 'Orbit',
        closable: true,
      },
    })

    await wrapper.get('.bing-tag__close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('blocks close when disabled', async () => {
    const wrapper = mount(BingTag, {
      props: {
        label: 'Pulse',
        closable: true,
        disabled: true,
      },
    })

    await wrapper.get('.bing-tag__close').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.get('.bing-tag__close').attributes()).toHaveProperty('disabled')
  })

  it('supports custom slot content', () => {
    const wrapper = mount(BingTag, {
      slots: {
        default: '<strong>Custom tag</strong>',
      },
    })

    expect(wrapper.get('strong').text()).toBe('Custom tag')
  })
})
