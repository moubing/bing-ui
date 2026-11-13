import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import BingAppSwitcherTransition from './BingAppSwitcherTransition.vue'
import type { BingAppSwitcherTransitionItem } from './BingAppSwitcherTransition.types'

enableAutoUnmount(afterEach)

const items: BingAppSwitcherTransitionItem[] = [
  { value: 'overview', label: 'Overview', title: 'Overview panel' },
  { value: 'details', label: 'Details', title: 'Details panel' },
  { value: 'metrics', label: 'Metrics', title: 'Metrics panel' },
]

describe('BingAppSwitcherTransition', () => {
  it('renders app switcher cards with slot content', () => {
    const wrapper = mount(BingAppSwitcherTransition, {
      props: {
        items,
        modelValue: 'overview',
      },
      slots: {
        default: '<template #default="{ item, active }"><div class="app">{{ item.title }} {{ active }}</div></template>',
      },
    })

    expect(wrapper.findAll('.bing-app-switcher-transition__card')).toHaveLength(3)
    expect(wrapper.findAll('.bing-app-switcher-transition__card')[0].classes()).toContain('is-active')
    expect(wrapper.text()).toContain('Overview panel true')
  })

  it('emits v-model and change payload when a tab is selected', async () => {
    const wrapper = mount(BingAppSwitcherTransition, {
      props: {
        items,
        modelValue: 'overview',
        respectReducedMotion: false,
      },
    })

    await wrapper.findAll('[role="tab"]')[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['metrics']])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: 'metrics',
      previousValue: 'overview',
      item: items[2],
      previousItem: items[0],
    })
  })

  it('animates when the controlled model value changes externally', async () => {
    const wrapper = mount(BingAppSwitcherTransition, {
      props: {
        items,
        modelValue: 'overview',
        respectReducedMotion: false,
      },
      slots: {
        default: '<template #default="{ isAnimating }"><div class="animation-state" :data-animating="isAnimating" /></template>',
      },
    })

    await wrapper.setProps({ modelValue: 'metrics' })
    await nextTick()

    expect(wrapper.find('.animation-state').attributes('data-animating')).toBe('true')
  })
})
