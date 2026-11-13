import type { ComputedRef, InjectionKey } from 'vue'
import type {
  BingCheckboxGroupOption,
  BingCheckboxGroupSize,
  BingCheckboxGroupValue,
} from './BingCheckboxGroup.types'

export interface CheckboxOptionRegistration {
  value: () => BingCheckboxGroupValue | undefined
  disabled: () => boolean
  markDirect: () => void
  playSelection: (checked: boolean, event: Event) => void
}

export interface BingCheckboxGroupContext {
  modelValue: ComputedRef<BingCheckboxGroupValue[]>
  disabled: ComputedRef<boolean>
  size: ComputedRef<BingCheckboxGroupSize>
  name: ComputedRef<string>
  status: ComputedRef<'default' | 'error' | 'success' | 'warning'>
  updateValue: (value: BingCheckboxGroupValue, checked: boolean, event: Event, click?: MouseEvent) => void
  register: (element: HTMLElement, option: CheckboxOptionRegistration) => () => void
  handleCheckboxBlur: (event: FocusEvent) => void
  isOptionDisabled: (option: Pick<BingCheckboxGroupOption, 'disabled'>) => boolean
}

export const bingCheckboxGroupContextKey: InjectionKey<BingCheckboxGroupContext> =
  Symbol('BingCheckboxGroupContext')
