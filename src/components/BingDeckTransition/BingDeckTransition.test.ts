import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import BingDeckTransition from './BingDeckTransition.vue'
import type { BingDeckTransitionItem } from './BingDeckTransition.types'

enableAutoUnmount(afterEach)

const items: BingDeckTransitionItem[] = [
  { value: 'overview', label: 'Overview', title: 'Overview panel' },
  { value: 'details', label: 'Details', title: 'Details panel' },
  { value: 'metrics', label: 'Metrics', title: 'Metrics panel' },
]

describe('BingDeckTransition', () => {
  it('renders deck cards with slot content', () => {
    const wrapper = mount(BingDeckTransition, {
      props: {
        items,
        modelValue: 'overview',
      },
      slots: {
        default: '<template #default="{ item, active }"><div class="card">{{ item.title }} {{ active }}</div></template>',
      },
    })

    expect(wrapper.findAll('.bing-deck-transition__card')).toHaveLength(3)
    expect(wrapper.findAll('.bing-deck-transition__card')[0].classes()).toContain('is-active')
    expect(wrapper.text()).toContain('Overview panel true')
    expect(wrapper.text()).toContain('切换下一张')
  })

  it('emits the next item from the default control', async () => {
    const wrapper = mount(BingDeckTransition, {
      props: {
        items,
        modelValue: 'overview',
        respectReducedMotion: false,
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['details']])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: 'details',
      previousValue: 'overview',
      item: items[1],
      previousItem: items[0],
    })
  })
})
