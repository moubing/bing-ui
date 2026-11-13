import type { Component, VNode } from 'vue'
import type { BingSelectOption } from '../BingSelect/BingSelect.types'

export interface BingAutocompleteOption extends BingSelectOption {}

export interface BingAutocompleteProps {
  id?: string
  modelValue?: string
  options?: BingAutocompleteOption[]
  /** false 时由调用方筛选、排序或远程加载候选。 */
  filter?: boolean
  /** 是否允许空输入（含纯空白）展开候选，默认 true。 */
  openOnEmpty?: boolean
  loading?: boolean
  error?: string
  disabled?: boolean
  clearable?: boolean
  placeholder?: string
  emptyText?: string
  ariaLabel?: string
  ariaDescribedby?: string
  size?: 'sm' | 'md' | 'lg'
  status?: 'default' | 'error' | 'success' | 'warning'
  icon?: Component
  block?: boolean
  panelWidth?: number
  panelMaxHeight?: number
  completeOnSelect?: boolean
  closeOnSelect?: boolean
  /** 非空时在每条候选右侧显示独立操作按钮；不触发 select 或自动关闭。 */
  optionActionLabel?: string
}

export interface BingAutocompleteEmits {
  'update:modelValue': [value: string]
  select: [option: BingAutocompleteOption]
  'option-action': [option: BingAutocompleteOption, event: MouseEvent]
  open: []
  close: []
  clear: []
}

export interface BingAutocompleteExpose {
  focus: () => void
  close: () => void
  input: HTMLInputElement | null
}

export interface BingAutocompleteSlots {
  icon?: () => VNode[]
  option?: (props: { option: BingAutocompleteOption; active: boolean }) => VNode[]
  /** 行尾按钮的非交互内容，例如图标；按钮名称由 optionActionLabel 和候选 label 组成。 */
  'option-action'?: (props: { option: BingAutocompleteOption; active: boolean }) => VNode[]
  'option-detail'?: (props: { option: BingAutocompleteOption }) => VNode[]
  header?: () => VNode[]
  footer?: () => VNode[]
  empty?: () => VNode[]
  loading?: () => VNode[]
  error?: (props: { error: string }) => VNode[]
}
