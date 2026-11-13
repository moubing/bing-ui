import { mount } from '@vue/test-utils'
import { Star } from '@lucide/vue'
import { describe, expect, it } from 'vitest'
import BingIcon from './BingIcon.vue'

describe('BingIcon', () => {
  it('renders decorative icons by default', () => {
    const wrapper = mount(BingIcon, {
      props: {
        icon: Star,
      },
    })

    const icon = wrapper.get('.bing-icon')

    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.attributes('role')).toBeUndefined()
  })

  it('supports accessible labelled icons', () => {
    const wrapper = mount(BingIcon, {
      props: {
        icon: Star,
        decorative: false,
        label: 'Featured',
      },
    })

    const icon = wrapper.get('.bing-icon')

    expect(icon.attributes('role')).toBe('img')
    expect(icon.attributes('aria-label')).toBe('Featured')
    expect(icon.attributes('aria-hidden')).toBeUndefined()
  })

  it('normalizes token size and tone classes', () => {
    const wrapper = mount(BingIcon, {
      props: {
        icon: Star,
        size: 'lg',
        tone: 'primary',
        strokeWidth: 1.5,
      },
    })

    const icon = wrapper.get('.bing-icon')

    expect(icon.classes()).toContain('bing-icon--primary')
    expect(icon.attributes('style')).toContain('width: 24px')
    expect(icon.attributes('style')).toContain('height: 24px')
    expect(icon.attributes('style')).toContain('stroke-width: 1.5')
  })

  it('accepts numeric size', () => {
    const wrapper = mount(BingIcon, {
      props: {
        icon: Star,
        size: 28,
      },
    })

    expect(wrapper.get('.bing-icon').attributes('style')).toContain('width: 28px')
  })
})
