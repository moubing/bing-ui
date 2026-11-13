import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import BingCarouselTransition from './BingCarouselTransition.vue'
import type { BingCarouselTransitionItem } from './BingCarouselTransition.types'

enableAutoUnmount(afterEach)

const items: BingCarouselTransitionItem[] = [
  { value: 'overview', label: 'Overview', title: 'Overview panel' },
  { value: 'details', label: 'Details', title: 'Details panel' },
  { value: 'metrics', label: 'Metrics', title: 'Metrics panel' },
]

describe('BingCarouselTransition', () => {
  it('renders slot content for every item', () => {
    const wrapper = mount(BingCarouselTransition, {
      props: {
        items,
        modelValue: 'overview',
      },
      slots: {
        default: '<template #default="{ item, active }"><div class="panel">{{ item.title }} {{ active }}</div></template>',
      },
    })

    expect(wrapper.findAll('.panel')).toHaveLength(3)
    expect(wrapper.findAll('.bing-carousel-transition__panel')[0].classes()).toContain('is-active')
    expect(wrapper.text()).toContain('Overview panel true')
    expect(wrapper.classes()).toContain('bing-carousel-transition')
  })

  it('emits v-model and change payload when a tab is selected', async () => {
    const wrapper = mount(BingCarouselTransition, {
      props: {
        items,
        modelValue: 'overview',
        respectReducedMotion: false,
      },
    })

    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['details']])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: 'details',
      previousValue: 'overview',
      item: items[1],
      previousItem: items[0],
    })
  })
})
