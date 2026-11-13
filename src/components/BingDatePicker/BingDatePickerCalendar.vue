<script setup lang="ts">
/**
 * BingDatePicker 内部使用的日历：导航栏与日、月、年三种网格。
 * 负责翻页（通过 `v-model:month` / `v-model:year` 回写），选中与禁用状态由父组件判定。
 */
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingTooltip from '../BingTooltip/BingTooltip.vue'
import type { BingDatePickerType } from './BingDatePicker.types'
import {
  getCalendarCells,
  getMonthCells,
  getWeekdayLabels,
  getYearBlockStart,
  getYearCells,
} from './BingDatePicker.utils'
import type { DatePeriodUnit } from './BingDatePicker.utils'

const props = defineProps<{
  type: BingDatePickerType
  panel: 'date' | 'month' | 'year'
  locale: string
  firstDayOfWeek: number
  canSwitchYear: boolean
  isSelected: (value: Dayjs, unit: DatePeriodUnit) => boolean
  isInRange: (value: Dayjs, unit: DatePeriodUnit) => boolean
  isDateDisabled: (value: Dayjs) => boolean
  isMonthDisabled: (value: Dayjs) => boolean
  isYearDisabled: (value: Dayjs) => boolean
}>()

const emit = defineEmits<{
  hover: [value: Dayjs]
  select: [value: Dayjs]
  'select-year': [value: Dayjs]
  'open-year': []
}>()

// 父组件传入 v-model 时，赋值后要等父组件重新渲染才会读到新值，所以下面都先算好再写回。
const month = defineModel<Dayjs>('month', { required: true })
const year = defineModel<number>('year', { required: true })

const { vClickFeedback } = useClickFeedback()

const weekdayLabels = computed(() => getWeekdayLabels(props.locale, props.firstDayOfWeek))
const monthFormatter = computed(() => new Intl.DateTimeFormat(props.locale, { month: 'short' }))
const calendarCells = computed(() => getCalendarCells(month.value, props.firstDayOfWeek))
const monthCells = computed(() => getMonthCells(year.value))
const yearBlockStart = computed(() => getYearBlockStart(year.value))
const yearCells = computed(() => getYearCells(year.value))

const navLabelText = computed(() => {
  if (props.panel === 'year') {
    return `${yearBlockStart.value} - ${yearBlockStart.value + 11}`
  }

  if (props.panel === 'month') {
    return String(year.value)
  }

  return new Intl.DateTimeFormat(props.locale, { year: 'numeric', month: 'long' }).format(month.value.toDate())
})

const previousLabel = computed(() => (props.panel === 'year' ? '前12年' : props.panel === 'month' ? '上一年' : '上个月'))
const nextLabel = computed(() => (props.panel === 'year' ? '后12年' : props.panel === 'month' ? '下一年' : '下个月'))

function shiftMonth(amount: number) {
  const next = month.value.add(amount, 'month')

  month.value = next
  year.value = next.year()
}

function goPrevious() {
  if (props.panel === 'year') {
    year.value -= 12
    return
  }

  if (props.panel === 'month') {
    year.value -= 1
    return
  }

  shiftMonth(-1)
}

function goNext() {
  if (props.panel === 'year') {
    year.value += 12
    return
  }

  if (props.panel === 'month') {
    year.value += 1
    return
  }

  shiftMonth(1)
}

function goPreviousYear() {
  if (props.panel === 'year') {
    year.value -= 12
    return
  }

  year.value -= 1
  month.value = month.value.subtract(1, 'year')
}

function goNextYear() {
  if (props.panel === 'year') {
    year.value += 12
    return
  }

  year.value += 1
  month.value = month.value.add(1, 'year')
}
</script>

<template>
  <div class="bing-date-picker__calendar-shell">
    <div class="bing-date-picker__nav">
      <div class="bing-date-picker__nav-group">
        <span
          class="bing-date-picker__nav-button-slot"
          :class="{ 'is-empty': panel !== 'date' }"
        >
          <BingTooltip
            v-if="panel === 'date'"
            content="上一年"
            placement="top"
            align="center"
          >
            <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
              class="bing-date-picker__nav-button"
              aria-label="上一年"
              @click="goPreviousYear"
            >
              <template #prefix>
                <BingIcon :icon="ChevronsLeft" size="sm" />
              </template>
            </BingButton>
          </BingTooltip>
        </span>

        <BingTooltip :content="previousLabel" placement="top" align="center">
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-date-picker__nav-button"
            :aria-label="previousLabel"
            @click="goPrevious"
          >
            <template #prefix>
              <BingIcon :icon="ChevronLeft" size="sm" />
            </template>
          </BingButton>
        </BingTooltip>
      </div>

      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        class="bing-date-picker__nav-label"
        :class="{ 'is-clickable': canSwitchYear }"
        :disabled="!canSwitchYear"
        :aria-label="canSwitchYear ? '选择年份' : undefined"
        @click="emit('open-year')"
      >
        {{ navLabelText }}
      </BingButton>

      <div class="bing-date-picker__nav-group">
        <BingTooltip :content="nextLabel" placement="top" align="center">
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-date-picker__nav-button"
            :aria-label="nextLabel"
            @click="goNext"
          >
            <template #prefix>
              <BingIcon :icon="ChevronRight" size="sm" />
            </template>
          </BingButton>
        </BingTooltip>

        <BingTooltip
          v-if="panel === 'date'"
          content="下一年"
          placement="top"
          align="center"
        >
          <span class="bing-date-picker__nav-button-slot">
            <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
              class="bing-date-picker__nav-button"
              aria-label="下一年"
              @click="goNextYear"
            >
              <template #prefix>
                <BingIcon :icon="ChevronsRight" size="sm" />
              </template>
            </BingButton>
          </span>
        </BingTooltip>
        <span
          v-else
          class="bing-date-picker__nav-button-slot is-empty"
          aria-hidden="true"
        />
      </div>
    </div>

    <div
      :key="panel"
      class="bing-date-picker__view"
      :class="`bing-date-picker__view--${panel}`"
    >
      <template v-if="panel === 'date'">
        <div class="bing-date-picker__weekdays">
          <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="bing-date-picker__date-grid">
          <button v-click-feedback
            v-for="day in calendarCells"
            :key="day.format('YYYY-MM-DD')"
            class="bing-date-picker__cell"
            :class="{
              'is-muted': day.month() !== month.month(),
              'is-today': day.isSame(dayjs(), 'day'),
              'is-selected': isSelected(day, 'day'),
              'is-in-range': isInRange(day, 'day'),
            }"
            type="button"
            :disabled="isDateDisabled(day)"
            @mouseenter="emit('hover', day)"
            @click="emit('select', day)"
          >
            <span class="bing-date-picker__cell-surface">
              {{ day.date() }}
            </span>
          </button>
        </div>
      </template>

      <div v-else-if="panel === 'month'" class="bing-date-picker__month-grid">
        <button v-click-feedback
          v-for="monthCell in monthCells"
          :key="monthCell.format('YYYY-MM')"
          class="bing-date-picker__cell bing-date-picker__cell--wide"
          :class="{ 'is-selected': isSelected(monthCell, 'month'), 'is-in-range': isInRange(monthCell, 'month') }"
          type="button"
          :disabled="isMonthDisabled(monthCell)"
          @mouseenter="emit('hover', monthCell)"
          @click="emit('select', monthCell)"
        >
          <span class="bing-date-picker__cell-surface">
            {{ monthFormatter.format(monthCell.toDate()) }}
          </span>
        </button>
      </div>

      <div v-else class="bing-date-picker__year-grid">
        <button v-click-feedback
          v-for="yearCell in yearCells"
          :key="yearCell.format('YYYY')"
          class="bing-date-picker__cell bing-date-picker__cell--wide"
          :class="{
            'is-selected': type === 'year' && isSelected(yearCell, 'year'),
            'is-view-active': type !== 'year' && yearCell.year() === year,
            'is-in-range': type === 'year' && isInRange(yearCell, 'year'),
          }"
          type="button"
          :disabled="isYearDisabled(yearCell)"
          @mouseenter="emit('hover', yearCell)"
          @click="emit('select-year', yearCell)"
        >
          <span class="bing-date-picker__cell-surface">
            {{ yearCell.format('YYYY') }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bing-date-picker__calendar-shell {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.bing-date-picker__nav {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 4px;
}

.bing-date-picker__nav-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.bing-date-picker__nav-button-slot {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  opacity: 1;
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.bing-date-picker__nav-button-slot.is-empty {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.92);
}

.bing-date-picker__nav-label {
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--bing-heading);
  cursor: default;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.2;
  overflow: hidden;
  padding: 4px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-date-picker__nav-label.is-clickable {
  cursor: pointer;
}

.bing-date-picker__nav-label.is-clickable:hover {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-date-picker__nav-label:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-date-picker__nav-label:disabled {
  opacity: 1;
}

.bing-date-picker__nav-button {
  display: inline-grid;
  width: 24px;
  height: 24px;
  padding: 0;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
}

.bing-date-picker__nav-button:hover {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-date-picker__view {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.bing-date-picker__weekdays,
.bing-date-picker__date-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0;
}

.bing-date-picker__weekdays {
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  text-align: center;
}

.bing-date-picker__month-grid,
.bing-date-picker__year-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
}

.bing-date-picker__cell {
  box-sizing: border-box;
  display: block;
  min-width: 0;
  height: 36px;
  padding: 3px;
  border: 0;
  background: transparent;
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 400;
}

.bing-date-picker__cell--wide {
  height: 44px;
  padding: 4px;
}

.bing-date-picker__cell-surface {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
}

.bing-date-picker__cell.is-muted > .bing-date-picker__cell-surface {
  color: var(--bing-muted);
}

.bing-date-picker__cell.is-today > .bing-date-picker__cell-surface {
  border-color: var(--bing-border-strong);
  color: var(--bing-heading);
}

.bing-date-picker__cell.is-in-range > .bing-date-picker__cell-surface {
  background: var(--bing-surface-active);
  color: var(--bing-heading);
}

.bing-date-picker__cell.is-selected > .bing-date-picker__cell-surface {
  background: var(--bing-accent);
  color: var(--bing-accent-contrast);
}

.bing-date-picker__cell.is-view-active > .bing-date-picker__cell-surface {
  border-color: var(--bing-border-strong);
  background: var(--bing-surface-active);
  color: var(--bing-heading);
}

.bing-date-picker__cell:hover:not(:disabled):not(.is-selected)
  > .bing-date-picker__cell-surface {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-date-picker__cell:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.bing-date-picker__cell:disabled > .bing-date-picker__cell-surface {
  color: var(--bing-disabled-text);
}

.bing-date-picker__nav-button:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: -2px;
}

.bing-date-picker__cell:focus-visible { outline: none; }

.bing-date-picker__cell:focus-visible > .bing-date-picker__cell-surface {
  outline: 2px solid var(--bing-focus);
  outline-offset: 0;
}

.bing-date-picker__nav-button.bing-button {
  --button-height: 24px;
  --button-icon-size: 16px;
  min-height: 24px;
  width: var(--button-height);
  padding: 0;
}

.bing-date-picker__nav-label.bing-button {
  --button-height: auto;
  min-height: 0;
}
</style>
