<script setup lang="ts">
import BingButton from '../BingButton/BingButton.vue'
import { computed } from 'vue'
import { X } from '../../icons'
import BingIcon from '../BingIcon/BingIcon.vue'
import type { BingTagEmits, BingTagProps } from './BingTag.types'
import { useConfigSize } from '../../utils/config'

const props = withDefaults(defineProps<BingTagProps>(), {
  label: undefined,
  tone: 'primary',
  variant: 'glass',
  closable: false,
  disabled: false,
  closeAriaLabel: undefined,
})

const emit = defineEmits<BingTagEmits>()
const resolvedSize = useConfigSize(() => props.size)

const rootClasses = computed(() => [
  'bing-tag',
  `bing-tag--${resolvedSize.value}`,
  `bing-tag--${props.tone}`,
  `bing-tag--${props.variant}`,
  {
    'is-closable': props.closable,
    'is-disabled': props.disabled,
  },
])

const resolvedCloseAriaLabel = computed(
  () => props.closeAriaLabel ?? (props.label ? `移除 ${props.label}` : '移除标签'),
)

function handleClose(event: MouseEvent) {
  event.stopPropagation()

  if (props.disabled) {
    event.preventDefault()
    return
  }

  emit('close', event)
}
</script>

<template>
  <span :class="rootClasses">
    <span class="bing-tag__label">
      <slot>{{ label }}</slot>
    </span>

    <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
      v-if="closable"
      class="bing-tag__close"
      :disabled="disabled"
      :aria-label="resolvedCloseAriaLabel"
      @mousedown.prevent.stop
      @click="handleClose"
    >
      <template #prefix>
        <BingIcon :icon="X" :size="12" :stroke-width="1.75" />
      </template>
    </BingButton>
  </span>
</template>

<style scoped>
.bing-tag {
  --bing-tag-border: var(--bing-border);
  --bing-tag-background: var(--bing-accent-soft);
  --bing-tag-color: var(--bing-heading);
  --bing-tag-accent: var(--bing-accent-strong);
  --bing-tag-hover-border: var(--bing-border-strong);
  --bing-tag-shadow: none;
  --bing-tag-close-size: 18px;

  display: inline-flex;
  flex: 0 1 auto;
  align-items: center;
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  height: 24px;
  gap: 4px;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid var(--bing-tag-border);
  border-radius: var(--bing-radius-md, 6px);
  background: var(--bing-tag-background);
  color: var(--bing-tag-color);
  box-shadow: var(--bing-tag-shadow);
  font: inherit;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  vertical-align: middle;
  transition:
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    background var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-tag--sm {
  --bing-tag-close-size: 16px;

  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
}

.bing-tag--lg {
  --bing-tag-close-size: 20px;

  height: 28px;
  padding: 0 10px;
  font-size: var(--bing-font-size-sm, 0.8125rem);
  line-height: 18px;
}

.bing-tag--secondary {
  --bing-tag-border: rgb(var(--bing-secondary-rgb) / 0.28);
  --bing-tag-background: var(--bing-secondary-soft);
  --bing-tag-color: var(--bing-secondary-strong);
  --bing-tag-accent: var(--bing-secondary-strong);
  --bing-tag-hover-border: rgb(var(--bing-secondary-rgb) / 0.44);
}

.bing-tag--neutral {
  --bing-tag-border: var(--bing-border);
  --bing-tag-background: var(--bing-surface-solid);
  --bing-tag-color: var(--bing-muted);
  --bing-tag-accent: var(--bing-text);
  --bing-tag-hover-border: var(--bing-border-strong);
}

.bing-tag--success {
  --bing-tag-border: rgb(var(--bing-success-rgb) / 0.28);
  --bing-tag-background: var(--bing-success-soft);
  --bing-tag-color: var(--bing-success-strong);
  --bing-tag-accent: var(--bing-success-strong);
  --bing-tag-hover-border: rgb(var(--bing-success-rgb) / 0.44);
}

.bing-tag--danger {
  --bing-tag-border: rgb(var(--bing-danger-rgb) / 0.28);
  --bing-tag-background: var(--bing-danger-soft);
  --bing-tag-color: var(--bing-danger-strong);
  --bing-tag-accent: var(--bing-danger-strong);
  --bing-tag-hover-border: rgb(var(--bing-danger-rgb) / 0.44);
}

.bing-tag--warning {
  --bing-tag-border: rgb(var(--bing-warning-rgb) / 0.3);
  --bing-tag-background: var(--bing-warning-soft);
  --bing-tag-color: var(--bing-warning-strong);
  --bing-tag-accent: var(--bing-warning-strong);
  --bing-tag-hover-border: rgb(var(--bing-warning-rgb) / 0.48);
}

.bing-tag--soft {
  --bing-tag-border: transparent;
  --bing-tag-hover-border: transparent;

  border-radius: 999px;
}

.bing-tag--soft.bing-tag--primary {
  --bing-tag-background: var(--bing-accent-soft);
  --bing-tag-color: var(--bing-accent-strong);
}

.bing-tag--soft.bing-tag--secondary {
  --bing-tag-background: var(--bing-secondary-soft);
  --bing-tag-color: var(--bing-secondary-strong);
}

.bing-tag--soft.bing-tag--neutral {
  --bing-tag-background: var(--bing-surface-muted);
  --bing-tag-color: var(--bing-muted);
}

.bing-tag--soft.bing-tag--success {
  --bing-tag-background: var(--bing-success-soft);
  --bing-tag-color: var(--bing-success-strong);
}

.bing-tag--soft.bing-tag--danger {
  --bing-tag-background: var(--bing-danger-soft);
  --bing-tag-color: var(--bing-danger-strong);
}

.bing-tag--soft.bing-tag--warning {
  --bing-tag-background: var(--bing-warning-soft);
  --bing-tag-color: var(--bing-warning-strong);
}

.bing-tag.is-closable:hover:not(.is-disabled) {
  border-color: var(--bing-tag-hover-border);
}

.bing-tag__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-tag__close {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: var(--bing-tag-close-size);
  height: var(--bing-tag-close-size);
  margin-right: -4px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-tag__close:hover:not(:disabled) {
  background: rgb(var(--bing-heading-rgb) / 0.08);
  color: var(--bing-tag-accent);
}

.bing-tag__close:active:not(:disabled) {
  transform: scale(0.86) rotate(8deg);
}

.bing-tag__close:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: -2px;
}

.bing-tag.is-disabled {
  border-color: var(--bing-control-disabled-border);
  background: var(--bing-control-disabled-bg);
  box-shadow: none;
  color: var(--bing-disabled-text);
}

.bing-tag.is-disabled .bing-tag__close {
  color: var(--bing-disabled-text);
}

.bing-tag__close:disabled {
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .bing-tag,
  .bing-tag__close {
    transition: none;
  }
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-tag__close.bing-button {
  --button-height: var(--bing-tag-close-size);
  --button-icon-size: 12px;
  min-height: var(--bing-tag-close-size);
  width: var(--button-height);
  padding: 0;
}
</style>
