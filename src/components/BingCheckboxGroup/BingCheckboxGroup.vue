<script setup lang="ts">
import { useFormControl, isolateFormControls } from '../BingForm/useFormControl'
import { computed, provide, ref, useId } from 'vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import { bingCheckboxGroupContextKey } from './BingCheckboxGroup.context'
import { useCheckboxSelection } from './useCheckboxSelection'
import type {
  BingCheckboxGroupEmits,
  BingCheckboxGroupOption,
  BingCheckboxGroupProps,
} from './BingCheckboxGroup.types'

const props = withDefaults(defineProps<BingCheckboxGroupProps>(), {
  id: undefined,
  modelValue: () => [],
  options: () => [],
  disabled: undefined,
  size: undefined,
  direction: 'wrap',
  dragSelect: false,
  rangeSelect: false,
  name: undefined,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
})

const emit = defineEmits<BingCheckboxGroupEmits>()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby, resolvedAriaLabelledby } = useFormControl(props, { group: true })
isolateFormControls()

const groupId = `bing-checkbox-group-${useId()}`
const rootRef = ref<HTMLElement | null>(null)
const isFocusInside = ref(false)

const resolvedName = computed(() => props.name ?? groupId)

const normalizedModelValue = computed(() => props.modelValue ?? [])
const { isDragging, register, updateValue, handlePointerDown, handleClick } = useCheckboxSelection({
  root: rootRef,
  values: () => normalizedModelValue.value,
  disabled: () => resolvedDisabled.value,
  dragSelect: () => props.dragSelect,
  rangeSelect: () => props.rangeSelect,
  update: value => emit('update:modelValue', value),
  commit: (value, event) => {
    emit('change', value, event)
    formItem?.handleControlChange()
  },
})
const rootClasses = computed(() => [
  'bing-checkbox-group',
  `bing-checkbox-group--${resolvedSize.value}`,
  `bing-checkbox-group--${props.direction}`,
  `bing-checkbox-group--status-${resolvedStatus.value}`,
  {
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
    'is-drag-selecting': isDragging.value,
  },
])

function isOptionDisabled(option: Pick<BingCheckboxGroupOption, 'disabled'>) {
  return resolvedDisabled.value || Boolean(option.disabled)
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

function handleCheckboxBlur(event: FocusEvent) {
  handleBlur(event)
}

provide(bingCheckboxGroupContextKey, {
  modelValue: normalizedModelValue,
  disabled: resolvedDisabled,
  size: resolvedSize,
  name: resolvedName,
  status: resolvedStatus,
  updateValue,
  register,
  handleCheckboxBlur,
  isOptionDisabled,
})
</script>

<template>
  <div
    :id="resolvedId"
    ref="rootRef"
    :class="rootClasses"
    role="group"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="ariaLabel ? undefined : resolvedAriaLabelledby"
    :aria-describedby="resolvedAriaDescribedby"
    :aria-invalid="resolvedStatus === 'error' || undefined"
    @focusin="handleFocus"
    @pointerdown="handlePointerDown"
    @click.capture="handleClick"
  >
    <slot>
      <BingCheckbox
        v-for="option in options"
        :key="String(option.value)"
        :value="option.value"
        :label="option.label"
        :disabled="isOptionDisabled(option)"
      >
        <span class="bing-checkbox-group__option">
          <span class="bing-checkbox-group__option-label">{{ option.label }}</span>
          <span v-if="option.description" class="bing-checkbox-group__option-description">
            {{ option.description }}
          </span>
        </span>
      </BingCheckbox>
    </slot>
  </div>
</template>

<style scoped>
.bing-checkbox-group {
  display: flex;
  min-width: 0;
  gap: 4px 16px;
}

.bing-checkbox-group--row {
  flex-direction: row;
  align-items: center;
}

.bing-checkbox-group.is-drag-selecting {
  user-select: none;
}

.bing-checkbox-group--column {
  flex-direction: column;
}

.bing-checkbox-group--wrap {
  flex-wrap: wrap;
  align-items: center;
}

.bing-checkbox-group--sm {
  gap: 4px 12px;
}

.bing-checkbox-group--lg {
  gap: 8px 20px;
}

.bing-checkbox-group__option {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.bing-checkbox-group__option-label {
  color: var(--bing-heading);
  font-weight: 400;
  line-height: 20px;
}

.bing-checkbox-group__option-description {
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}

.bing-checkbox-group:has(.bing-checkbox-group__option-description):not(.bing-checkbox-group--column) {
  align-items: flex-start;
}

.bing-checkbox-group:has(.bing-checkbox-group__option-description) :deep(.bing-checkbox) {
  align-items: flex-start;
  padding-block: 2px;
}

.bing-checkbox-group:has(.bing-checkbox-group__option-description) :deep(.bing-checkbox__control) {
  margin-top: max(0px, calc((20px - var(--bing-checkbox-size)) / 2));
}

.bing-checkbox-group :deep(.bing-checkbox.is-disabled .bing-checkbox-group__option-label),
.bing-checkbox-group :deep(.bing-checkbox.is-disabled .bing-checkbox-group__option-description) {
  color: var(--bing-disabled-text);
}

.bing-checkbox-group.is-disabled {
  cursor: not-allowed;
}
</style>
