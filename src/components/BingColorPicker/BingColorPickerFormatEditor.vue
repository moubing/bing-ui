<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Copy } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import type { BingSelectOption } from '../BingSelect/BingSelect.types'
import type { BingColorPickerFormat } from './BingColorPicker.types'
import { getColorFormatValue, getFormatLabel, parseColorInput } from './BingColorPicker.utils'
import type { ColorValue, FormatEntry, ParsedColor } from './BingColorPicker.utils'

const formatOptions: BingSelectOption[] = [
  { label: 'HEX', value: 'hex' },
  { label: 'RGBA', value: 'rgba' },
  { label: 'HSL', value: 'hsl' },
]

const format = defineModel<BingColorPickerFormat>('format', { required: true })

const props = defineProps<{
  idPrefix: string
  color: ColorValue
  disabled: boolean
  copied: boolean
  copyLabel: string
  copiedLabel: string
}>()

const emit = defineEmits<{
  commit: [parsed: ParsedColor, immediate: boolean]
  blur: []
  copy: [format: BingColorPickerFormat, value: string]
}>()

const formatSelectId = computed(() => `${props.idPrefix}-format`)
const formatInputId = computed(() => `${props.idPrefix}-format-input`)
const formatInputValue = ref('')
const isFormatInputFocused = ref(false)
const isFormatInputInvalid = ref(false)

const currentFormatEntry = computed<FormatEntry>(() => ({
  format: format.value,
  label: getFormatLabel(format.value),
  value: getColorFormatValue(props.color, format.value),
}))
const copyButtonLabel = computed(
  () => `${props.copied ? props.copiedLabel : props.copyLabel} ${currentFormatEntry.value.label}`,
)

watch(
  currentFormatEntry,
  (entry) => {
    if (!isFormatInputFocused.value) {
      formatInputValue.value = entry.value
      isFormatInputInvalid.value = false
    }
  },
  { immediate: true },
)

function syncFormatInputValue() {
  formatInputValue.value = currentFormatEntry.value.value
  isFormatInputInvalid.value = false
}

function commitFormatInputValue(immediate = false) {
  const parsed = parseColorInput(formatInputValue.value)

  if (!parsed) {
    isFormatInputInvalid.value = formatInputValue.value.trim().length > 0
    return false
  }

  isFormatInputInvalid.value = false
  emit('commit', parsed, immediate)

  if (immediate) {
    syncFormatInputValue()
  }

  return true
}

function handleFormatInputFocus() {
  isFormatInputFocused.value = true
}

function handleFormatInputInput(event: Event) {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  formatInputValue.value = target.value
  commitFormatInputValue()
}

function handleFormatInputBlur() {
  isFormatInputFocused.value = false

  if (!commitFormatInputValue(true)) {
    syncFormatInputValue()
  }

  emit('blur')
}

function handleFormatInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    isFormatInputFocused.value = false
    commitFormatInputValue(true)
    ;(event.currentTarget as HTMLInputElement | null)?.blur()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    isFormatInputFocused.value = false
    syncFormatInputValue()
    ;(event.currentTarget as HTMLInputElement | null)?.blur()
  }
}
</script>

<template>
  <div
    class="bing-color-picker__format-editor"
    :class="{ 'is-invalid': isFormatInputInvalid }"
  >
    <BingSelect
      :id="formatSelectId"
      v-model="format"
      class="bing-color-picker__format-select"
      :options="formatOptions"
      size="sm"
      width="86px"
      :min-width="86"
      :clearable="false"
      :searchable="false"
      :show-select-all="false"
      :virtual="false"
      panel-placement="left"
      panel-align="middle"
      :panel-gap="18"
      :panel-max-height="180"
      aria-label="颜色格式"
      :disabled="disabled"
    />

    <label class="bing-color-picker__sr-only" :for="formatInputId">
      颜色值
    </label>
    <input
      :id="formatInputId"
      class="bing-color-picker__format-input"
      type="text"
      :value="formatInputValue"
      :aria-invalid="isFormatInputInvalid || undefined"
      :disabled="disabled"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      @focus="handleFormatInputFocus"
      @input="handleFormatInputInput"
      @blur="handleFormatInputBlur"
      @keydown="handleFormatInputKeydown"
    />

    <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
      class="bing-color-picker__copy"
      :aria-label="copyButtonLabel"
      :disabled="disabled"
      @click="emit('copy', currentFormatEntry.format, currentFormatEntry.value)"
    >
      <template #prefix>
        <BingIcon
          :icon="copied ? Check : Copy"
          size="xs"
          :stroke-width="1.75"
        />
      </template>
    </BingButton>
  </div>
</template>

<style scoped>
.bing-color-picker__format-editor {
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 0;
  grid-template-columns: 86px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 6px;
  min-height: 32px;
}

.bing-color-picker__format-select {
  min-width: 0;
}

.bing-color-picker__format-input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--bing-control-border);
  border-radius: 6px;
  background: var(--bing-control-bg);
  box-shadow: var(--bing-control-shadow);
  color: var(--bing-text);
  font: 400 12px / 20px ui-monospace, SFMono-Regular, Consolas, monospace;
  text-overflow: ellipsis;
  transition: border-color var(--bing-duration-fast) var(--bing-ease-smooth), box-shadow var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-color-picker__format-input:focus {
  border-color: var(--bing-control-hover-border);
  outline: 2px solid var(--bing-focus);
  outline-offset: 1px;
}

.bing-color-picker__format-editor.is-invalid .bing-color-picker__format-input {
  border-color: var(--bing-danger);
}

.bing-color-picker__format-input::selection {
  background: rgb(var(--bing-accent-rgb) / 0.2);
}

.bing-color-picker__format-input:disabled {
  border-color: var(--bing-control-disabled-border);
  background: var(--bing-control-disabled-bg);
  color: var(--bing-disabled-text);
  cursor: not-allowed;
}

.bing-color-picker__copy {
  box-sizing: border-box;
  display: inline-grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
  transition: background var(--bing-duration-fast) var(--bing-ease-smooth), color var(--bing-duration-fast) var(--bing-ease-smooth), transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-color-picker__copy:hover:not(:disabled) {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-color-picker__copy:active:not(:disabled) {
  transform: scale(0.94);
}

.bing-color-picker__copy:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-color-picker__copy:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.bing-color-picker__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
  margin: -1px;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .bing-color-picker__copy {
    transition: none;
  }

  .bing-color-picker__format-editor {
    transform: none !important;
  }
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-color-picker__copy.bing-button {
  --button-height: 32px;
  --button-icon-size: 14px;
  min-height: 32px;
  width: var(--button-height);
  padding: 0;
}
</style>
