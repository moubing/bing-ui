<script setup lang="ts">
import { useFormControl, isolateFormControls } from '../BingForm/useFormControl'
import { computed, provide, ref, useId } from 'vue'
import BingRadio from '../BingRadio/BingRadio.vue'
import { bingRadioGroupContextKey } from './BingRadioGroup.context'
import type {
  BingRadioGroupEmits,
  BingRadioGroupOption,
  BingRadioGroupProps,
  BingRadioValue,
} from './BingRadioGroup.types'

const props = withDefaults(defineProps<BingRadioGroupProps>(), {
  id: undefined,
  modelValue: null,
  options: () => [],
  disabled: undefined,
  size: undefined,
  direction: 'wrap',
  name: undefined,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
})

const emit = defineEmits<BingRadioGroupEmits>()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby, resolvedAriaLabelledby } = useFormControl(props, { group: true })
isolateFormControls()

const groupId = `bing-radio-group-${useId()}`
const rootRef = ref<HTMLElement | null>(null)
const isFocusInside = ref(false)

const resolvedName = computed(() => props.name ?? groupId)

const rootClasses = computed(() => [
  'bing-radio-group',
  `bing-radio-group--${resolvedSize.value}`,
  `bing-radio-group--${props.direction}`,
  `bing-radio-group--status-${resolvedStatus.value}`,
  {
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
  },
])

function isOptionDisabled(option: Pick<BingRadioGroupOption, 'disabled'>) {
  return resolvedDisabled.value || Boolean(option.disabled)
}

function updateValue(value: BingRadioValue, event: Event) {
  if (resolvedDisabled.value) {
    return
  }

  emit('update:modelValue', value)
  emit('change', value, event)
  formItem?.handleControlChange()
}

function handleFocus(event: FocusEvent) {
  if (isFocusInside.value) {
    return
  }

  isFocusInside.value = true
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  const root = rootRef.value
  const nextTarget = event.relatedTarget

  if (root && nextTarget instanceof Node && root.contains(nextTarget)) {
    return
  }

  isFocusInside.value = false
  emit('blur', event)
  formItem?.handleControlBlur()
}

function handleRadioBlur(event: FocusEvent) {
  handleBlur(event)
}

function getEnabledInputs() {
  return Array.from(
    rootRef.value?.querySelectorAll<HTMLInputElement>('input[type="radio"]:not(:disabled)') ?? [],
  )
}

function moveFocus(step: number) {
  const inputs = getEnabledInputs()

  if (inputs.length === 0) {
    return
  }

  const activeElement = document.activeElement
  const activeIndex = inputs.findIndex((input) => input === activeElement)
  const checkedIndex = inputs.findIndex((input) => input.checked)
  const startIndex = activeIndex >= 0 ? activeIndex : checkedIndex >= 0 ? checkedIndex : 0
  const nextIndex = (startIndex + step + inputs.length) % inputs.length
  const nextInput = inputs[nextIndex]

  nextInput?.focus()
  nextInput?.click()
}

function handleKeydown(event: KeyboardEvent) {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
    return
  }

  event.preventDefault()
  moveFocus(event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1)
}

provide(bingRadioGroupContextKey, {
  modelValue: computed(() => props.modelValue ?? null),
  disabled: resolvedDisabled,
  size: resolvedSize,
  name: resolvedName,
  status: resolvedStatus,
  updateValue,
  handleRadioBlur,
  isOptionDisabled,
})
</script>

<template>
  <div
    :id="resolvedId"
    ref="rootRef"
    :class="rootClasses"
    role="radiogroup"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="ariaLabel ? undefined : resolvedAriaLabelledby"
    :aria-describedby="resolvedAriaDescribedby"
    :aria-invalid="resolvedStatus === 'error' || undefined"
    @focusin="handleFocus"
    @keydown="handleKeydown"
  >
    <slot>
      <BingRadio
        v-for="option in options"
        :key="String(option.value)"
        :value="option.value"
        :label="option.label"
        :description="option.description"
        :disabled="isOptionDisabled(option)"
      />
    </slot>
  </div>
</template>

<style scoped>
.bing-radio-group {
  display: flex;
  min-width: 0;
  gap: 4px 16px;
}

.bing-radio-group--row {
  flex-direction: row;
  align-items: center;
}

.bing-radio-group--column {
  flex-direction: column;
}

.bing-radio-group--wrap {
  flex-wrap: wrap;
  align-items: center;
}

.bing-radio-group--sm {
  gap: 4px 12px;
}

.bing-radio-group--lg {
  gap: 8px 20px;
}

.bing-radio-group:has(.bing-radio.has-description):not(.bing-radio-group--column) {
  align-items: flex-start;
}

.bing-radio-group:has(.bing-radio.has-description) :deep(.bing-radio) {
  align-items: flex-start;
  padding-block: 2px;
}

.bing-radio-group:has(.bing-radio.has-description) :deep(.bing-radio__control) {
  margin-top: max(0px, calc((20px - var(--bing-radio-size)) / 2));
}

.bing-radio-group.is-disabled {
  cursor: not-allowed;
}
</style>
