<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, toRaw, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type {
  BingFormBreakpoint,
  BingFormEmits,
  BingFormErrors,
  BingFormExpose,
  BingFormGap,
  BingFormModel,
  BingFormProps,
  BingFormResponsiveNumber,
  BingFormValidateTrigger,
  BingFormValidationResult,
} from './BingForm.types'
import {
  bingFormContextKey,
  cloneErrors,
  type BingFormFieldRegistration,
} from './BingForm.context'
import { useFormNextHint } from './useFormNextHint'
import { isInActiveOverlayScope } from '../../utils/overlay'
import { useConfigSize } from '../../utils/config'

type SchemaIssue = {
  path: Array<string | number | symbol>
  message: string
}

const props = withDefaults(defineProps<BingFormProps>(), {
  model: undefined,
  schema: undefined,
  layout: 'grid',
  columns: () => ({
    base: 1,
    sm: 2,
    xl: 5,
  }),
  gap: () => ({
    row: 12,
    column: 16,
  }),
  labelPosition: 'top',
  labelWidth: 112,
  disabled: false,
  validateTrigger: 'auto',
  scrollToError: true,
  focusOnError: true,
  nextStepHint: false,
})

const emit = defineEmits<BingFormEmits>()
const resolvedSize = useConfigSize(() => props.size)
const rootRef = ref<HTMLFormElement | null>(null)
const nextHintRef = ref<HTMLElement | null>(null)
const { context: nextHintContext, hint: nextHint, style: nextHintStyle } =
  useFormNextHint(rootRef, nextHintRef, () => props.nextStepHint && !props.disabled)

const errors = reactive<BingFormErrors>({})
const fields = new Set<BingFormFieldRegistration>()
let initialModelSnapshot: BingFormModel | undefined
let validationRun = 0
let modelRevision = 0
let disposed = false
let submitRun = 0
let focusRevision = 0
const requests = new Set<{ id: number; prop?: string; cancelled: boolean }>()
const lastFieldRuns = new Map<string, number>()
let lastFormRun = 0

watch(() => [props.model, props.schema], () => { modelRevision += 1 }, { deep: true, flush: 'sync' })

const normalizedTriggers = computed(() =>
  Array.isArray(props.validateTrigger) ? props.validateTrigger : [props.validateTrigger],
)

const normalizedColumns = computed(() =>
  normalizeResponsiveNumber(props.columns, {
    base: 1,
    sm: 2,
    xl: 5,
  }),
)
const normalizedLabelWidth = computed(() => normalizeLength(props.labelWidth))

const rootClasses = computed(() => [
  'bing-form',
  `bing-form--${props.layout}`,
  `bing-form--label-${props.labelPosition}`,
  `bing-form--${resolvedSize.value}`,
  {
    'is-disabled': props.disabled,
  },
])

const rootStyle = computed<CSSProperties>(() => {
  const columns = normalizedColumns.value
  const gap = normalizeGap(props.gap)

  return {
    '--bing-form-columns-base': String(columns.base),
    '--bing-form-columns-sm': String(columns.sm),
    '--bing-form-columns-md': String(columns.md),
    '--bing-form-columns-lg': String(columns.lg),
    '--bing-form-columns-xl': String(columns.xl),
    '--bing-form-row-gap': gap.row,
    '--bing-form-column-gap': gap.column,
    '--bing-form-label-width': normalizedLabelWidth.value,
  } as CSSProperties
})

function normalizeLength(value: string | number) {
  return typeof value === 'number' ? `${value}px` : value
}

function normalizeGap(gap: BingFormGap) {
  if (typeof gap === 'string' || typeof gap === 'number') {
    const value = normalizeLength(gap)

    return {
      row: value,
      column: value,
    }
  }

  return {
    row: normalizeLength(gap.row ?? 12),
    column: normalizeLength(gap.column ?? 16),
  }
}

function normalizeResponsiveNumber(
  value: BingFormResponsiveNumber,
  fallback: Partial<Record<BingFormBreakpoint, number>>,
) {
  const breakpoints: BingFormBreakpoint[] = ['base', 'sm', 'md', 'lg', 'xl']
  const normalized: Record<BingFormBreakpoint, number> = {
    base: fallback.base ?? 1,
    sm: fallback.sm ?? fallback.base ?? 1,
    md: fallback.md ?? fallback.sm ?? fallback.base ?? 1,
    lg: fallback.lg ?? fallback.md ?? fallback.sm ?? fallback.base ?? 1,
    xl: fallback.xl ?? fallback.lg ?? fallback.md ?? fallback.sm ?? fallback.base ?? 1,
  }

  if (typeof value === 'number') {
    breakpoints.forEach((breakpoint) => {
      normalized[breakpoint] = Math.max(1, Math.floor(value))
    })

    return normalized
  }

  let last = normalized.base
  breakpoints.forEach((breakpoint) => {
    const next = value[breakpoint]

    if (typeof next === 'number') {
      last = Math.max(1, Math.floor(next))
    }

    normalized[breakpoint] = last
  })

  return normalized
}

function cloneModelValue<T>(value: T): T {
  const rawValue = toRaw(value)

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(rawValue)
    } catch {
      return JSON.parse(JSON.stringify(rawValue)) as T
    }
  }

  return JSON.parse(JSON.stringify(rawValue)) as T
}

function applyModelSnapshot(target: BingFormModel, snapshot: BingFormModel) {
  Object.keys(target).forEach((key) => {
    if (!(key in snapshot)) {
      delete target[key]
    }
  })

  Object.entries(cloneModelValue(snapshot)).forEach(([key, value]) => {
    target[key] = value
  })
}

function issuePathToProp(path: SchemaIssue['path']) {
  return path.length > 0 ? path.map(String).join('.') : '_form'
}

function groupIssues(issues: SchemaIssue[]) {
  const nextErrors: BingFormErrors = {}

  issues.forEach((issue) => {
    const prop = issuePathToProp(issue.path)
    nextErrors[prop] ??= []
    nextErrors[prop].push(issue.message)
  })

  return nextErrors
}

function isPathRelated(path: string, prop: string) {
  return path === prop || path.startsWith(`${prop}.`) || prop.startsWith(`${path}.`)
}

function replaceErrors(nextErrors: BingFormErrors) {
  Object.keys(errors).forEach((prop) => {
    delete errors[prop]
  })

  Object.entries(nextErrors).forEach(([prop, messages]) => {
    errors[prop] = [...messages]
  })
}

function replaceRelatedErrors(prop: string, nextErrors: BingFormErrors) {
  Object.keys(errors).forEach((path) => {
    if (isPathRelated(path, prop)) {
      delete errors[path]
    }
  })

  Object.entries(nextErrors).forEach(([path, messages]) => {
    if (isPathRelated(path, prop)) {
      errors[path] = [...messages]
    }
  })
}

async function runValidation(prop?: string) {
  const request = { id: ++validationRun, prop, cancelled: false }
  for (const pending of requests) {
    if (pending.prop === prop) pending.cancelled = true
  }
  requests.add(request)
  if (prop) lastFieldRuns.set(prop, request.id)
  else lastFormRun = request.id

  try {
    while (!disposed && !request.cancelled) {
      const revision = modelRevision
      const schema = props.schema
      const parsed = schema ? await schema.safeParseAsync(cloneModelValue(props.model ?? {})) : undefined
      if (disposed || request.cancelled) return false
      // 异步校验期间模型可能继续编辑，只提交当前模型快照的结果。
      if (revision !== modelRevision) continue
      const nextErrors = parsed && !parsed.success ? groupIssues(parsed.error.issues) : {}
      const relatedErrors = Object.entries(nextErrors).filter(([path]) => !prop || isPathRelated(path, prop))
      const valid = relatedErrors.length === 0

      if (prop) {
        if (request.id >= lastFormRun) replaceRelatedErrors(prop, nextErrors)
      } else {
        // 后启动的字段校验保留自己负责的错误状态，整表校验不覆盖它。
        const paths = new Set([...Object.keys(errors), ...Object.keys(nextErrors)])
        for (const path of paths) {
          if ([...lastFieldRuns].some(([field, id]) => id > request.id && isPathRelated(path, field))) continue
          if (nextErrors[path]) errors[path] = [...nextErrors[path]]
          else delete errors[path]
        }
      }
      return valid
    }
    return false
  } finally {
    requests.delete(request)
  }
}

function shouldValidateForTrigger(trigger: BingFormValidateTrigger | undefined, prop?: string) {
  if (!trigger || trigger === 'manual') {
    return true
  }

  if (normalizedTriggers.value.includes(trigger)) return true
  if (!normalizedTriggers.value.includes('auto')) return false
  return trigger === 'blur' || trigger === 'submit' ||
    (trigger === 'change' && Boolean(prop && getFieldErrors(prop).length))
}

function getFieldErrors(prop: string) {
  return Object.entries(errors)
    .filter(([path]) => isPathRelated(path, prop))
    .flatMap(([, messages]) => messages)
}

function getErrors() {
  return cloneErrors(errors)
}

function clearValidate(prop?: string) {
  submitRun += 1
  for (const request of requests) {
    if (!prop || !request.prop || isPathRelated(request.prop, prop)) request.cancelled = true
  }
  if (prop) lastFieldRuns.set(prop, ++validationRun)
  else { lastFieldRuns.clear(); lastFormRun = ++validationRun }
  if (!prop) {
    replaceErrors({})
    return
  }

  Object.keys(errors).forEach((path) => {
    if (isPathRelated(path, prop)) {
      delete errors[path]
    }
  })
}

function registerField(field: BingFormFieldRegistration) {
  fields.add(field)
}

function unregisterField(field: BingFormFieldRegistration) {
  fields.delete(field)
}

function getInvalidFields() {
  return [...fields].filter(field => getFieldErrors(field.prop).length > 0).sort((a, b) => {
    const first = a.element()
    const second = b.element()
    if (!first || !second) return 0
    const position = first.compareDocumentPosition(second)
    return position & 4 ? -1 : position & 2 ? 1 : 0
  })
}

function locateFirstError(focus = false) {
  const form = rootRef.value
  if (!form || !isInActiveOverlayScope(form)) return
  for (const field of getInvalidFields()) {
    const target = field.target()
    if (!target) continue
    if (focus) target.focus({ preventScroll: true })
    if (props.scrollToError) field.scrollToField()
    break
  }
}

async function validate() {
  const run = validationRun + 1
  const resetVersion = submitRun
  const valid = await runValidation()
  if (!valid && !disposed && lastFormRun === run && resetVersion === submitRun) {
    await nextTick()
    if (!disposed && lastFormRun === run && resetVersion === submitRun) locateFirstError()
  }
  return valid
}

async function validateField(prop: string, trigger?: BingFormValidateTrigger) {
  if (!shouldValidateForTrigger(trigger, prop)) {
    return getFieldErrors(prop).length === 0
  }

  return runValidation(prop)
}

function resetFields() {
  if (props.model && initialModelSnapshot) {
    applyModelSnapshot(props.model, initialModelSnapshot)
  }

  clearValidate()
}

async function handleSubmit(event: Event) {
  if (props.disabled) return
  const run = ++submitRun
  const focusAtSubmit = rootRef.value?.ownerDocument.activeElement
  const focusVersion = focusRevision
  const modelVersion = modelRevision
  const submitEvent = event as SubmitEvent
  const shouldRunSubmitValidation = shouldValidateForTrigger('submit')
  const valid = shouldRunSubmitValidation ? await runValidation() : true
  if (disposed || props.disabled || run !== submitRun) return
  const payload = {
    valid,
    errors: getErrors(),
    event: submitEvent,
  }

  emit('submit', payload)

  if (!valid) {
    const invalidPayload: BingFormValidationResult = {
      valid,
      errors: payload.errors,
    }

    emit('invalid', invalidPayload)
    await nextTick()
    if (!disposed && !props.disabled && run === submitRun && focusVersion === focusRevision &&
      modelVersion === modelRevision && rootRef.value?.ownerDocument.activeElement === focusAtSubmit) {
      locateFirstError(props.focusOnError)
    }
  }
}

function recordFocusChange() {
  focusRevision += 1
}

onMounted(() => {
  initialModelSnapshot = props.model ? cloneModelValue(props.model) : undefined
})

onBeforeUnmount(() => {
  disposed = true
  requests.forEach(request => { request.cancelled = true })
})

provide(bingFormContextKey, {
  size: resolvedSize,
  disabled: computed(() => props.disabled),
  columns: normalizedColumns,
  labelPosition: computed(() => props.labelPosition),
  labelWidth: normalizedLabelWidth,
  validateField,
  clearValidate,
  getFieldErrors,
  registerField,
  unregisterField,
  nextHint: nextHintContext,
})

defineExpose<BingFormExpose>({
  validate,
  validateField: (prop: string) => validateField(prop),
  clearValidate,
  resetFields,
  getErrors,
})
</script>

<template>
  <form
    ref="rootRef"
    :class="rootClasses"
    :style="rootStyle"
    novalidate
    @submit.prevent="handleSubmit"
    @focusin.capture="recordFocusChange"
    @focusout.capture="recordFocusChange"
  >
    <div class="bing-form__layout">
      <slot />
    </div>
    <span v-if="nextHint" ref="nextHintRef" class="bing-form__next-hint" :style="nextHintStyle"
      :data-target="nextHint.target.id || undefined" :data-offscreen="nextHint.offscreen || undefined" aria-hidden="true">
      <span class="bing-form__next-hint-text">{{ nextHint.text }}</span>
      <kbd>Tab</kbd>
    </span>
  </form>
</template>

<style scoped>
.bing-form {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  color: var(--bing-text);
  font-size: var(--bing-font-size-md, 0.875rem);
  font-weight: 400;
  line-height: 1.5;
  container-type: inline-size;
}

.bing-form--sm {
  font-size: var(--bing-font-size-sm, 0.8125rem);
}

.bing-form__next-hint {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 20px;
  color: var(--bing-muted);
  font-size: 12px;
  line-height: 18px;
  font-weight: 400;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

.bing-form__next-hint-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.bing-form__next-hint kbd {
  flex: none;
  padding: 0 4px;
  border: 1px solid var(--bing-border);
  border-radius: 4px;
  background: var(--bing-surface-solid);
  color: var(--bing-text);
  font: inherit;
  line-height: 16px;
}

.bing-form__layout {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
}

.bing-form--grid > .bing-form__layout {
  display: grid;
  grid-template-columns: repeat(var(--bing-form-columns-base), minmax(0, 1fr));
  gap: var(--bing-form-row-gap) var(--bing-form-column-gap);
  align-items: start;
}

.bing-form--stack > .bing-form__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--bing-form-row-gap);
}

.bing-form--stack > .bing-form__layout > :deep(.bing-form-item) {
  grid-column: 1 / -1;
}

.bing-form--inline > .bing-form__layout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--bing-form-row-gap) var(--bing-form-column-gap);
  align-items: flex-start;
}

.bing-form.is-disabled {
  cursor: not-allowed;
}

@container (min-width: 640px) {
  .bing-form--grid > .bing-form__layout {
    grid-template-columns: repeat(var(--bing-form-columns-sm), minmax(0, 1fr));
  }
}

@container (min-width: 768px) {
  .bing-form--grid > .bing-form__layout {
    grid-template-columns: repeat(var(--bing-form-columns-md), minmax(0, 1fr));
  }
}

@container (min-width: 1024px) {
  .bing-form--grid > .bing-form__layout {
    grid-template-columns: repeat(var(--bing-form-columns-lg), minmax(0, 1fr));
  }
}

@container (min-width: 1280px) {
  .bing-form--grid > .bing-form__layout {
    grid-template-columns: repeat(var(--bing-form-columns-xl), minmax(0, 1fr));
  }
}
</style>
