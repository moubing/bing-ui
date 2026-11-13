<script setup lang="ts">
/**
 * BingDatePicker 内部使用的时、分、秒滚动列。
 * 选中值和禁用判断由父组件提供；对外暴露停止滚动和把当前值滚入视口的方法。
 */
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { Dayjs } from 'dayjs'
import { useClickFeedback } from '../../motion/useClickFeedback'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose, BingScrollbarProps } from '../BingScrollbar/BingScrollbar.types'
import type { BingDatePickerTimeUnit } from './BingDatePicker.types'
import { createStepOptions } from './BingDatePicker.utils'

const props = defineProps<{
  /** 当前正在编辑的值，用来高亮各列的选中项。 */
  value: Dayjs
  compact: boolean
  hourStep: number
  minuteStep: number
  secondStep: number
  smooth: BingScrollbarProps['smooth']
  isDisabled: (unit: BingDatePickerTimeUnit, value: number) => boolean
}>()

const emit = defineEmits<{
  select: [unit: BingDatePickerTimeUnit, value: number]
}>()

const { vClickFeedback } = useClickFeedback()

const timeUnits: BingDatePickerTimeUnit[] = ['hour', 'minute', 'second']
const timeUnitLabels: Record<BingDatePickerTimeUnit, string> = {
  hour: '时',
  minute: '分',
  second: '秒',
}
const scrollRefs: Partial<Record<BingDatePickerTimeUnit, BingScrollbarExpose>> = {}

const unitOptions = computed<Record<BingDatePickerTimeUnit, number[]>>(() => ({
  hour: createStepOptions(24, props.hourStep),
  minute: createStepOptions(60, props.minuteStep),
  second: createStepOptions(60, props.secondStep),
}))
// 和日历并排时列表更高，和日历底部对齐。
const listHeight = computed(() => (props.compact ? 224 : 244))
const panelStyle = computed<CSSProperties>(() => ({
  '--bing-date-picker-time-list-height': `${listHeight.value}px`,
}) as CSSProperties)

function setScrollRef(unit: BingDatePickerTimeUnit, instance: unknown) {
  if (instance) {
    scrollRefs[unit] = instance as BingScrollbarExpose
    return
  }

  delete scrollRefs[unit]
}

function stop() {
  timeUnits.forEach((unit) => scrollRefs[unit]?.stop())
}

/** 把各列当前选中的值滚到可见范围内（已可见时不动）。 */
function scrollToCurrent() {
  timeUnits.forEach((unit) => {
    const scrollbar = scrollRefs[unit]
    const viewport = scrollbar?.viewport

    if (!scrollbar || !viewport) {
      return
    }

    const option = viewport.querySelector<HTMLElement>(
      `[data-time-unit="${unit}"][data-time-value="${props.value[unit]()}"]`,
    )

    if (!option) {
      return
    }

    const viewportRect = viewport.getBoundingClientRect()
    const optionRect = option.getBoundingClientRect()
    let nextScrollTop = viewport.scrollTop

    if (optionRect.top < viewportRect.top) {
      nextScrollTop -= viewportRect.top - optionRect.top
    } else if (optionRect.bottom > viewportRect.bottom) {
      nextScrollTop += optionRect.bottom - viewportRect.bottom
    } else {
      return
    }

    scrollbar.scrollTo(Math.max(0, nextScrollTop))
  })
}

defineExpose({ stop, scrollToCurrent })
</script>

<template>
  <div class="bing-date-picker__time-panel" :style="panelStyle">
    <div
      v-for="unit in timeUnits"
      :key="unit"
      class="bing-date-picker__time-column"
    >
      <span class="bing-date-picker__time-label">{{ timeUnitLabels[unit] }}</span>
      <BingScrollbar
        :ref="(instance) => setScrollRef(unit, instance)"
        class="bing-date-picker__time-list"
        :height="listHeight"
        :smooth="smooth"
        :focusable="false"
        always
        :aria-label="`${timeUnitLabels[unit]}选项`"
      >
        <div class="bing-date-picker__time-options">
          <button v-click-feedback
            v-for="option in unitOptions[unit]"
            :key="`${unit}-${option}`"
            class="bing-date-picker__time-option"
            :class="{ 'is-selected': value[unit]() === option }"
            :data-time-unit="unit"
            :data-time-value="option"
            type="button"
            :disabled="isDisabled(unit, option)"
            @click="emit('select', unit, option)"
          >
            <span class="bing-date-picker__time-option-surface">
              {{ String(option).padStart(2, '0') }}
            </span>
          </button>
        </div>
      </BingScrollbar>
    </div>
  </div>
</template>

<style scoped>
.bing-date-picker__time-panel {
  display: grid;
  grid-template-columns: repeat(3, 60px);
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.bing-date-picker__panel--datetime .bing-date-picker__time-panel {
  align-self: start;
}

.bing-date-picker__time-column {
  display: grid;
  grid-template-rows: 18px minmax(0, var(--bing-date-picker-time-list-height, 244px));
  gap: 6px;
  min-width: 0;
}

.bing-date-picker__time-label {
  display: block;
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  text-align: center;
  text-transform: uppercase;
}

.bing-date-picker__time-list {
  --bing-scrollbar-gutter: 13px;

  display: grid;
  height: var(--bing-date-picker-time-list-height, 244px);
}

.bing-date-picker__time-options {
  --bing-date-picker-time-option-gap: 4px;

  display: grid;
  gap: 0;
  padding-right: 4px;
}

.bing-date-picker__panel--datetime .bing-date-picker__time-options {
  --bing-date-picker-time-option-gap: 2px;
}

.bing-date-picker__time-option {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-width: 0;
  padding: calc(var(--bing-date-picker-time-option-gap) / 2) 0;
  border: 0;
  background: transparent;
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 400;
  text-align: center;
}

.bing-date-picker__time-option-surface {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: 100%;
  height: calc(32px - var(--bing-date-picker-time-option-gap));
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  line-height: 20px;
}

.bing-date-picker__time-option:hover:not(:disabled)
  > .bing-date-picker__time-option-surface {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-date-picker__time-option.is-selected > .bing-date-picker__time-option-surface {
  background: var(--bing-accent);
  color: var(--bing-accent-contrast);
}

.bing-date-picker__time-option:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.bing-date-picker__time-option:disabled > .bing-date-picker__time-option-surface {
  color: var(--bing-disabled-text);
}

.bing-date-picker__time-option.is-selected:disabled
  > .bing-date-picker__time-option-surface {
  background: var(--bing-control-disabled-bg);
  color: var(--bing-disabled-text);
}

.bing-date-picker__time-option:focus-visible { outline: none; }

.bing-date-picker__time-option:focus-visible > .bing-date-picker__time-option-surface {
  outline: 2px solid var(--bing-focus);
  outline-offset: 0;
}

@media (max-width: 680px) {
  .bing-date-picker__time-panel {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
