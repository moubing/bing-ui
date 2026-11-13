import { expectTypeOf, it } from 'vitest'
import BingSlider from './BingSlider.vue'
import type { BingSliderEmits } from './BingSlider.types'

it('keeps scalar handlers typed as number and range handlers typed as a tuple', () => {
  expectTypeOf<Parameters<typeof BingSlider<false>>[0]['modelValue']>().toEqualTypeOf<number | undefined>()
  expectTypeOf<Parameters<typeof BingSlider<true>>[0]['modelValue']>().toEqualTypeOf<[number, number] | undefined>()
  expectTypeOf<Parameters<typeof BingSlider<false>>[0]['resetValue']>().toEqualTypeOf<number | undefined>()
  expectTypeOf<Parameters<typeof BingSlider<true>>[0]['resetValue']>().toEqualTypeOf<[number, number] | undefined>()
  expectTypeOf<BingSliderEmits<false>['change']>().toEqualTypeOf<[number]>()
  expectTypeOf<BingSliderEmits<true>['change']>().toEqualTypeOf<[[number, number]]>()
})
