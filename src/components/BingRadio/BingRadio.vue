<script setup lang="ts">
import { useClickFeedback } from '../../motion/useClickFeedback'
import { useFormControl } from '../BingForm/useFormControl'
import { computed, inject, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import { gsap } from 'gsap'
import { bingRadioGroupContextKey } from '../BingRadioGroup/BingRadioGroup.context'
import type { BingRadioEmits, BingRadioProps } from './BingRadio.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const props = withDefaults(defineProps<BingRadioProps>(), {
  id: undefined,
  modelValue: null,
  value: true,
  disabled: undefined,
  size: undefined,
  label: undefined,
  description: undefined,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
  name: undefined,
})

const emit = defineEmits<BingRadioEmits>()
const { playClickFeedback } = useClickFeedback()
const slots = useSlots()
const group = inject(bingRadioGroupContextKey, null)
const { formItem, resolvedSize, resolvedDisabled, resolvedStatus, resolvedId, resolvedAriaDescribedby } = useFormControl({
  get id() { return props.id },
  get size() { return props.size ?? group?.size.value },
  get disabled() { return group?.disabled.value || props.disabled },
  get status() { return props.status ?? group?.status.value },
  get ariaDescribedby() { return props.ariaDescribedby },
}, { register: !group })

const dotRef = ref<HTMLElement | null>(null)

const resolvedValue = computed(() => props.value)

const resolvedName = computed(() => props.name ?? group?.name.value)

const isChecked = computed(() => {
  const modelValue = group ? group.modelValue.value : props.modelValue

  return modelValue === resolvedValue.value
})
const hasLabel = computed(() => Boolean(props.label || slots.default))
const hasDescription = computed(() => Boolean(props.description || slots.description))
const rootClasses = computed(() => [
  'bing-radio',
  `bing-radio--${resolvedSize.value}`,
  `bing-radio--status-${resolvedStatus.value}`,
  {
    'is-checked': isChecked.value,
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
    'has-description': hasDescription.value,
    'has-content': hasLabel.value || hasDescription.value,
  },
])

function animateDot(checked: boolean) {
  const dot = dotRef.value

  if (!dot || prefersReducedMotion()) {
    return
  }

  gsap.killTweensOf(dot)

  if (checked) {
    gsap.fromTo(
      dot,
      { autoAlpha: 0, scale: 0.18 },
      {
        autoAlpha: 1,
        scale: 1,
        duration: 0.24,
        ease: 'back.out(3)',
        clearProps: 'transform,opacity,visibility',
        overwrite: true,
      },
    )
    return
  }

  gsap.to(dot, {
    autoAlpha: 0,
    scale: 0.3,
    duration: 0.14,
    ease: 'power2.in',
    clearProps: 'transform,opacity,visibility',
    overwrite: true,
  })
}

function handleClick(event: MouseEvent) {
  if (event.defaultPrevented || resolvedDisabled.value) return
  const control = (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>('.bing-radio__control')
  playClickFeedback(event, control)
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement

  if (!target.checked) {
    return
  }

  if (group) {
    group.updateValue(resolvedValue.value, event)
    return
  }

  emit('update:modelValue', resolvedValue.value)
  emit('change', resolvedValue.value, event)
  formItem?.handleControlChange()
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
  group?.handleRadioBlur(event)

  if (!group) {
    formItem?.handleControlBlur()
  }
}

watch(isChecked, animateDot)

onBeforeUnmount(() => {
  if (dotRef.value) {
    gsap.killTweensOf(dotRef.value)
  }
})
</script>

<template>
  <label :class="rootClasses">
    <input
      class="bing-radio__input"
      type="radio"
      :id="resolvedId"
      :checked="isChecked"
      :disabled="resolvedDisabled"
      :name="resolvedName"
      :value="String(resolvedValue)"
      :aria-label="ariaLabel || undefined"
      :aria-describedby="resolvedAriaDescribedby"
      :aria-invalid="resolvedStatus === 'error' || undefined"
      @change="handleChange"
      @click="handleClick"
      @focus="emit('focus', $event)"
      @blur="handleBlur"
    />

    <span class="bing-radio__control" aria-hidden="true">
      <span ref="dotRef" class="bing-radio__dot"></span>
    </span>

    <span v-if="hasLabel || hasDescription" class="bing-radio__content">
      <span v-if="hasLabel" class="bing-radio__label">
        <slot>{{ label }}</slot>
      </span>
      <span v-if="hasDescription" class="bing-radio__description">
        <slot name="description">{{ description }}</slot>
      </span>
    </span>
  </label>
</template>

<style scoped>
.bing-radio {
  --bing-click-particle-color: var(--bing-muted);
  --bing-radio-size: 18px;
  --bing-radio-dot-size: 8px;
  --bing-radio-hit-height: var(--bing-control-height-md, 36px);
  --bing-radio-font-size: var(--bing-font-size-md, 0.875rem);
  --bing-radio-border: var(--bing-border-strong);
  --bing-radio-hover-border: var(--bing-control-hover-border);
  --bing-radio-color: var(--bing-accent);
  --bing-radio-color-strong: var(--bing-accent-strong);

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  font-size: var(--bing-radio-font-size);
  user-select: none;
}

.bing-radio.has-content {
  min-height: var(--bing-radio-hit-height);
}

.bing-radio--sm {
  --bing-radio-size: 16px;
  --bing-radio-dot-size: 6px;
  --bing-radio-hit-height: var(--bing-control-height-sm, 32px);
  --bing-radio-font-size: var(--bing-font-size-sm, 0.8125rem);
}

.bing-radio--lg {
  --bing-radio-size: 20px;
  --bing-radio-dot-size: 10px;
  --bing-radio-hit-height: var(--bing-control-height-lg, 40px);
}

.bing-radio.has-description {
  align-items: flex-start;
  padding-block: 2px;
}

.bing-radio.has-description .bing-radio__control {
  margin-top: max(0px, calc((20px - var(--bing-radio-size)) / 2));
}

.bing-radio__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.bing-radio__control {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--bing-radio-size);
  height: var(--bing-radio-size);
  border: 1px solid var(--bing-radio-border);
  border-radius: 999px;
  background: var(--bing-control-bg);
  box-shadow: var(--bing-control-shadow);
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-radio:hover:not(.is-disabled) .bing-radio__control {
  border-color: var(--bing-radio-hover-border);
}

.bing-radio__input:focus-visible + .bing-radio__control {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-radio.is-checked .bing-radio__control {
  border-color: var(--bing-radio-color-strong);
  box-shadow: none;
}

.bing-radio--status-error {
  --bing-radio-border: var(--bing-danger);
  --bing-radio-hover-border: var(--bing-danger-strong);
  --bing-radio-color: var(--bing-danger);
  --bing-radio-color-strong: var(--bing-danger-strong);
}

.bing-radio--status-success {
  --bing-radio-border: var(--bing-success);
  --bing-radio-hover-border: var(--bing-success-strong);
  --bing-radio-color: var(--bing-success);
  --bing-radio-color-strong: var(--bing-success-strong);
}

.bing-radio--status-warning {
  --bing-radio-border: var(--bing-warning);
  --bing-radio-hover-border: var(--bing-warning-strong);
  --bing-radio-color: var(--bing-warning);
  --bing-radio-color-strong: var(--bing-warning-strong);
}

.bing-radio__dot {
  width: var(--bing-radio-dot-size);
  height: var(--bing-radio-dot-size);
  border-radius: 999px;
  background: var(--bing-radio-color-strong);
  opacity: 0;
  transform: scale(0.3);
  pointer-events: none;
}

.bing-radio.is-checked .bing-radio__dot {
  opacity: 1;
  transform: scale(1);
}

.bing-radio__content {
  display: grid;
  align-content: center;
  min-width: 0;
  gap: 2px;
}

.bing-radio__label {
  min-width: 0;
  color: var(--bing-heading);
  font-weight: 400;
  line-height: 20px;
}

.bing-radio__description {
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}

.bing-radio.is-disabled {
  cursor: not-allowed;
  color: var(--bing-disabled-text);
}

.bing-radio.is-disabled .bing-radio__label,
.bing-radio.is-disabled .bing-radio__description {
  color: var(--bing-disabled-text);
}

.bing-radio.is-disabled .bing-radio__control {
  border-color: var(--bing-control-disabled-border);
  background: var(--bing-control-disabled-bg);
  box-shadow: none;
}

.bing-radio.is-disabled.is-checked .bing-radio__control {
  border-color:
    color-mix(
      in srgb,
      var(--bing-radio-color) 42%,
      var(--bing-control-disabled-border)
    );
  background:
    color-mix(
      in srgb,
      var(--bing-radio-color) 24%,
      var(--bing-control-disabled-bg)
    );
}

.bing-radio.is-disabled.is-checked .bing-radio__dot {
  background: var(--bing-disabled-text);
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .bing-radio__control {
    transition: none;
  }
}
</style>
