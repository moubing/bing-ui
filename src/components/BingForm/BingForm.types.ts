export type BingControlStatus = 'default' | 'error' | 'success' | 'warning'

export type BingFormSize = 'sm' | 'md' | 'lg'

export type BingFormLayout = 'grid' | 'stack' | 'inline'

export type BingFormLabelPosition = 'top' | 'left'

export type BingFormValidateTrigger = 'auto' | 'change' | 'blur' | 'submit' | 'manual'

export type BingFormBreakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl'

export type BingFormResponsiveNumber =
  | number
  | Partial<Record<BingFormBreakpoint, number>>

export type BingFormGap =
  | string
  | number
  | {
      row?: string | number
      column?: string | number
    }

export type BingFormModel = Record<string, unknown>

/** 表单实际使用的校验接口；兼容 Zod，公共类型无需依赖可选的 Zod 包。 */
export interface BingFormSchema {
  safeParseAsync: (data: unknown) => Promise<
    | { success: true; data: unknown }
    | {
        success: false
        error: {
          issues: Array<{ path: Array<string | number | symbol>; message: string }>
        }
      }
  >
}

export type BingFormErrors = Record<string, string[]>

export interface BingFormProps {
  model?: BingFormModel
  schema?: BingFormSchema
  layout?: BingFormLayout
  columns?: BingFormResponsiveNumber
  gap?: BingFormGap
  labelPosition?: BingFormLabelPosition
  labelWidth?: string | number
  size?: BingFormSize
  disabled?: boolean
  /** 默认 auto：离开字段或提交时校验，已有错误的字段在修改时重新检查。 */
  validateTrigger?: BingFormValidateTrigger | BingFormValidateTrigger[]
  scrollToError?: boolean
  /** 提交失败后聚焦第一个可用错误字段。默认 true；异步等待期间继续操作时不抢焦点。 */
  focusOnError?: boolean
  /** 实验性：显示实际下一 Tab 落点的轻提示，不改写键盘行为；默认关闭。业务提交成功后可设为 false。 */
  nextStepHint?: boolean
}

export interface BingFormValidationResult {
  valid: boolean
  errors: BingFormErrors
}

export interface BingFormSubmitPayload extends BingFormValidationResult {
  event: SubmitEvent
}

export interface BingFormEmits {
  submit: [payload: BingFormSubmitPayload]
  invalid: [payload: BingFormValidationResult]
}

export interface BingFormExpose {
  validate: () => Promise<boolean>
  validateField: (prop: string) => Promise<boolean>
  clearValidate: (prop?: string) => void
  resetFields: () => void
  getErrors: () => BingFormErrors
}
