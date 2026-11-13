import { computed, inject, onBeforeUnmount, provide, useId } from 'vue'
import { bingFormContextKey, bingFormItemContextKey } from './BingForm.context'
import type { BingControlStatus } from './BingForm.types'
import { useBingConfig } from '../../utils/config'

export function useFormControl<Size extends string | number>(props: {
  id?: string
  size?: Size
  disabled?: boolean
  status?: BingControlStatus
  ariaDescribedby?: string
}, options: { group?: boolean; register?: boolean } = {}) {
  const formItem = inject(bingFormItemContextKey, null)
  const form = inject(bingFormContextKey, null)
  const config = useBingConfig()
  const fallbackId = `bing-control-${useId()}`
  const fieldControlId = options.register === false ? undefined : formItem?.nextControlId?.(fallbackId) ?? formItem?.controlId.value
  const resolvedId = computed(() => props.id ?? fieldControlId ?? fallbackId)
  const resolvedSize = computed(() => props.size ?? formItem?.size.value ?? form?.size.value ?? config.size.value ?? 'md')
  const resolvedDisabled = computed(() => props.disabled ?? formItem?.disabled.value ?? form?.disabled.value ?? false)
  const resolvedStatus = computed(() => props.status ?? formItem?.status.value ?? 'default')
  const resolvedAriaDescribedby = computed(() =>
    [...new Set([props.ariaDescribedby, formItem?.ariaDescribedby.value].filter(Boolean))].join(' ') || undefined,
  )
  const resolvedAriaLabelledby = computed(() => options.group ? formItem?.labelId?.value : undefined)
  if (options.register !== false && formItem?.registerControl) {
    const unregister = formItem.registerControl({ id: resolvedId, group: options.group ?? false })
    onBeforeUnmount(unregister)
  }
  return { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby, resolvedAriaLabelledby }
}

/** 复合控件内部的搜索框、选项等不再注册为外部表单字段。 */
export function isolateFormControls() {
  provide(bingFormItemContextKey, null)
  provide(bingFormContextKey, null)
}
