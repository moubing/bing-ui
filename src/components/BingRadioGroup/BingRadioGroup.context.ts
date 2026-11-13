import type { ComputedRef, InjectionKey } from 'vue'
import type {
  BingRadioGroupOption,
  BingRadioGroupSize,
  BingRadioValue,
} from './BingRadioGroup.types'

export interface BingRadioGroupContext {
  modelValue: ComputedRef<BingRadioValue | null>
  disabled: ComputedRef<boolean>
  size: ComputedRef<BingRadioGroupSize>
  name: ComputedRef<string>
  status: ComputedRef<'default' | 'error' | 'success' | 'warning'>
  updateValue: (value: BingRadioValue, event: Event) => void
  handleRadioBlur: (event: FocusEvent) => void
  isOptionDisabled: (option: Pick<BingRadioGroupOption, 'disabled'>) => boolean
}

export const bingRadioGroupContextKey: InjectionKey<BingRadioGroupContext> =
  Symbol('BingRadioGroupContext')
