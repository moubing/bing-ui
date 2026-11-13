import type {
  BingFormLabelPosition,
  BingFormResponsiveNumber,
} from '../BingForm/BingForm.types'

export interface BingFormItemProps {
  prop?: string
  label?: string
  required?: boolean
  span?: BingFormResponsiveNumber
  help?: string
  showMessage?: boolean
  labelPosition?: BingFormLabelPosition
}
