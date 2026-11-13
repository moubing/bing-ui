import type { ComputedRef, InjectionKey } from 'vue'
import type {
  BingControlStatus,
  BingFormBreakpoint,
  BingFormErrors,
  BingFormLabelPosition,
  BingFormSize,
  BingFormValidateTrigger,
} from './BingForm.types'

export interface BingFormFieldRegistration {
  prop: string
  scrollToField: () => void
  element: () => HTMLElement | null
  target: () => HTMLElement | null
}

export interface BingFormNextHintField {
  element: () => HTMLElement | null
  target: () => HTMLElement | null
  label: () => string
}

export interface BingFormNextHintContext {
  register: (field: BingFormNextHintField) => () => void
}

export interface BingFormContext {
  size: ComputedRef<BingFormSize>
  disabled: ComputedRef<boolean>
  columns: ComputedRef<Record<BingFormBreakpoint, number>>
  labelPosition: ComputedRef<BingFormLabelPosition>
  labelWidth: ComputedRef<string>
  validateField: (prop: string, trigger?: BingFormValidateTrigger) => Promise<boolean>
  clearValidate: (prop?: string) => void
  getFieldErrors: (prop: string) => string[]
  registerField: (field: BingFormFieldRegistration) => void
  unregisterField: (field: BingFormFieldRegistration) => void
  nextHint?: BingFormNextHintContext
}

export interface BingFormItemContext {
  controlId: ComputedRef<string>
  ariaDescribedby: ComputedRef<string | undefined>
  isInvalid: ComputedRef<boolean>
  status: ComputedRef<BingControlStatus>
  size: ComputedRef<BingFormSize>
  disabled: ComputedRef<boolean>
  handleControlChange: () => void
  handleControlBlur: () => void
  labelId?: ComputedRef<string | undefined>
  nextControlId?: (fallbackId: string) => string
  registerControl?: (control: { id: ComputedRef<string>; group: boolean }) => () => void
}

export const bingFormContextKey: InjectionKey<BingFormContext | null> = Symbol('BingFormContext')

export const bingFormItemContextKey: InjectionKey<BingFormItemContext | null> =
  Symbol('BingFormItemContext')

export function cloneErrors(errors: BingFormErrors): BingFormErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([prop, messages]) => [prop, [...messages]]),
  )
}
