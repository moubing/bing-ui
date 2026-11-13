<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { useFormControl, isolateFormControls } from '../BingForm/useFormControl'
import { useOverlay } from '../../utils/overlay'
import { computeFloatingPosition, useFloatingAutoUpdate } from '../../utils/floating'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { gsap } from 'gsap'
import { getPanelHiddenTransform, panelEnterMotion, panelLeaveMotion } from '../../motion/panelMotion'
import { CalendarDays, Check, ChevronDown, Clock3, X } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import {
  compactSmoothScrollOptions,
  resolveComponentSmoothScroll,
} from '../../motion/smoothScroll'
import {
  createGlassCssVariables,
  defaultGlassEffect,
} from '../../utils/glass'
import type {
  BingDatePickerChangePayload,
  BingDatePickerEmits,
  BingDatePickerExpose,
  BingDatePickerModelValue,
  BingDatePickerProps,
  BingDatePickerRangeRole,
  BingDatePickerTimeUnit,
} from './BingDatePicker.types'
import BingDatePickerCalendar from './BingDatePickerCalendar.vue'
import BingDatePickerTimePanel from './BingDatePickerTimePanel.vue'
import {
  compareTypedValue,
  createShortcuts,
  defaultValueFormats,
  normalizeForType as normalizeValueForType,
  parseDateValue,
} from './BingDatePicker.utils'
import type { DatePeriodUnit, DatePickerShortcut } from './BingDatePicker.utils'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const { vClickFeedback, playClickFeedback } = useClickFeedback()
const props = withDefaults(defineProps<BingDatePickerProps>(), {
  id: undefined,
  modelValue: null,
  type: 'date',
  range: false,
  placeholder: undefined,
  startPlaceholder: '开始',
  endPlaceholder: '结束',
  disabled: undefined,
  clearable: true,
  size: undefined,
  block: false,
  minWidth: 220,
  format: undefined,
  valueFormat: undefined,
  locale: 'zh-CN',
  firstDayOfWeek: 1,
  min: undefined,
  max: undefined,
  disabledDate: undefined,
  disabledTime: undefined,
  hourStep: 1,
  minuteStep: 1,
  secondStep: 1,
  smoothScroll: true,
  showShortcuts: true,
  panelMaxHeight: 420,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
  glass: defaultGlassEffect.glass,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
})

const emit = defineEmits<BingDatePickerEmits>()
const clientReady = useClientReady()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)
isolateFormControls()

const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const mainScrollRef = ref<BingScrollbarExpose | null>(null)
const shortcutRailRef = ref<HTMLElement | null>(null)
const timePanelRef = ref<InstanceType<typeof BingDatePickerTimePanel> | null>(null)
const isOpen = ref(false)
const shouldRenderPanel = ref(false)
const isClosing = ref(false)
const activeMonth = ref(dayjs().startOf('month'))
const activeYear = ref(dayjs().year())
const panelView = ref<'calendar' | 'year'>('calendar')
const rangeFocus = ref<BingDatePickerRangeRole>('start')
const hoverValue = ref<Dayjs | null>(null)
const pendingSingle = ref<Dayjs | null>(null)
const pendingStart = ref<Dayjs | null>(null)
const pendingEnd = ref<Dayjs | null>(null)
const panelPosition = ref({
  left: 0,
  placement: 'bottom' as 'bottom' | 'top',
  top: 0,
  width: 0,
})

let isListeningForOutside = false
let panelViewTransition: gsap.core.Timeline | undefined
let panelOpenTransition: gsap.core.Timeline | undefined
let panelCloseTransition: gsap.core.Timeline | undefined

const valueFormat = computed(() => props.valueFormat ?? defaultValueFormats[props.type])
const displayFormat = computed(() => props.format ?? valueFormat.value)
const isDateLike = computed(() => props.type === 'date' || props.type === 'datetime')
const usesTimePanel = computed(() => props.type === 'datetime' || props.type === 'time')
const requiresConfirm = computed(() => props.range || props.type === 'datetime' || props.type === 'time')
const resolvedSmoothScroll = computed(() =>
  resolveComponentSmoothScroll(props.smoothScroll, compactSmoothScrollOptions, {
    keyboard: false,
    respectReducedMotion: true,
    smoothTouchpad: false,
  }),
)
const minValue = computed(() => parseValue(props.min))
const maxValue = computed(() => parseValue(props.max))
const glassStyle = computed(() =>
  createGlassCssVariables('bing-date-picker', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
)
const rootStyle = computed<CSSProperties>(() => ({
  '--bing-date-picker-min-width': normalizeCssLength(props.minWidth),
  ...glassStyle.value,
}) as CSSProperties)
const panelAutoUpdate = useFloatingAutoUpdate(updatePanelPosition, {
  enabled: () => isOpen.value,
})

const overlayZIndex = useConfigZIndex('datePicker')
const overlay = useOverlay({
  open: () => shouldRenderPanel.value,
  elements: () => [triggerRef.value, panelRef.value, shortcutRailRef.value],
  zIndex: () => overlayZIndex.value,
  onEscape: () => cancelSelection(),
})

const inlineShortcuts = computed(() => {
  if (typeof window === 'undefined' || !panelPosition.value.width) return false
  const { left, width } = panelPosition.value
  return left - 124 < 8 && left + width + 124 > window.innerWidth - 8
})

const panelStyle = computed<CSSProperties>(() => ({
  zIndex: overlay.zIndex.value,
  left: `${panelPosition.value.left}px`,
  top: `${panelPosition.value.top}px`,
  width: `${panelPosition.value.width}px`,
  maxHeight: `min(${normalizeCssLength(props.panelMaxHeight)}, calc(100vh - 24px))`,
  ...glassStyle.value,
}) as CSSProperties)
const shortcutRailStyle = computed<CSSProperties>(() => {
  const railWidth = 116
  const railGap = 8
  const viewportPadding = 8
  const preferredLeft = panelPosition.value.left - railWidth - railGap
  const fallbackLeft = panelPosition.value.left + panelPosition.value.width + railGap
  const left =
    preferredLeft >= viewportPadding || typeof window === 'undefined'
      ? preferredLeft
      : clampNumber(
          fallbackLeft,
          viewportPadding,
          Math.max(viewportPadding, window.innerWidth - railWidth - viewportPadding),
        )

  return {
    left: `${left}px`,
    position: 'fixed',
    top: `${panelPosition.value.top}px`,
    zIndex: overlay.zIndex.value,
    ...glassStyle.value,
  }
})

const rootClasses = computed(() => [
  'bing-date-picker',
  `bing-date-picker--${resolvedSize.value}`,
  `bing-date-picker--${props.type}`,
  `bing-date-picker--status-${resolvedStatus.value}`,
  {
    'is-open': isOpen.value,
    'is-closing': isClosing.value,
    'is-range': props.range,
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
    'is-block': props.block || Boolean(formItem),
    'has-value': hasValue.value,
    'has-clear-action': props.clearable && hasValue.value && !resolvedDisabled.value,
  },
])

const panelClasses = computed(() => [
  'bing-date-picker__panel',
  `bing-date-picker__panel--${props.type}`,
  `is-placement-${panelPosition.value.placement}`,
  {
    'is-range': props.range,
    'is-closing': isClosing.value,
  },
])

const hasValue = computed(() => {
  if (props.range) {
    return Array.isArray(props.modelValue) && props.modelValue.filter(Boolean).length > 0
  }

  return typeof props.modelValue === 'string' && props.modelValue.length > 0
})

const displayValue = computed(() => {
  if (props.range) {
    if (!Array.isArray(props.modelValue)) {
      return ''
    }

    return props.modelValue
      .map((value) => parseValue(value)?.format(displayFormat.value) ?? '')
      .filter(Boolean)
      .join(' - ')
  }

  return typeof props.modelValue === 'string'
    ? parseValue(props.modelValue)?.format(displayFormat.value) ?? props.modelValue
    : ''
})

const rangeStartDisplay = computed(() =>
  Array.isArray(props.modelValue)
    ? parseValue(props.modelValue[0])?.format(displayFormat.value) ?? props.modelValue[0]
    : '',
)

const rangeEndDisplay = computed(() =>
  Array.isArray(props.modelValue)
    ? parseValue(props.modelValue[1])?.format(displayFormat.value) ?? props.modelValue[1]
    : '',
)

function stopPanelScrollbars() {
  mainScrollRef.value?.stop()
  timePanelRef.value?.stop()
}

function scrollCurrentTimeOptionsIntoView() {
  timePanelRef.value?.scrollToCurrent()
}

const activeTimeTarget = computed(() => {
  if (props.range) {
    return (rangeFocus.value === 'start' ? pendingStart.value : pendingEnd.value) ?? defaultTimeValue()
  }

  return pendingSingle.value ?? defaultTimeValue()
})

const canConfirm = computed(() => {
  if (!requiresConfirm.value) {
    return true
  }

  if (props.range) {
    return Boolean(
      pendingStart.value &&
        pendingEnd.value &&
        !isValueDisabled(pendingStart.value, 'start') &&
        !isValueDisabled(pendingEnd.value, 'end') &&
        (props.type !== 'time' || !isAfterTyped(pendingStart.value, pendingEnd.value)),
    )
  }

  return Boolean(pendingSingle.value && !isValueDisabled(pendingSingle.value, 'start'))
})

const shortcuts = computed(() => createShortcuts(props.type, props.range))
const activePanel = computed<'date' | 'month' | 'year'>(() => {
  if (props.type === 'year' || panelView.value === 'year') {
    return 'year'
  }

  if (props.type === 'month') {
    return 'month'
  }

  return 'date'
})
const canSwitchYearPanel = computed(() => props.type !== 'year' && props.type !== 'time')

function getDefinedElements(elements: Array<HTMLElement | null | undefined>) {
  return elements.filter((element): element is HTMLElement => element !== null && element !== undefined)
}

function killPanelViewTransition() {
  panelViewTransition?.kill()
  panelViewTransition = undefined
}

function getPanelAnimationTargets() {
  return getDefinedElements([panelRef.value, shortcutRailRef.value])
}

function killPanelOpenTransition(clearProps = false) {
  const targets = getPanelAnimationTargets()

  panelOpenTransition?.kill()
  panelOpenTransition = undefined

  if (clearProps && targets.length) {
    gsap.set(targets, {
      clearProps: 'opacity,visibility,transform,transformOrigin',
    })
  }
}

function killPanelCloseTransition(clearProps = false) {
  const targets = getPanelAnimationTargets()

  panelCloseTransition?.kill()
  panelCloseTransition = undefined

  if (clearProps && targets.length) {
    gsap.set(targets, {
      clearProps: 'opacity,visibility,transform,transformOrigin',
    })
  }
}

function animatePanelOpen() {
  const targets = getPanelAnimationTargets().filter(target => target === panelRef.value || !inlineShortcuts.value)

  if (!targets.length) {
    return
  }

  killPanelOpenTransition()
  gsap.killTweensOf(targets)

  if (prefersReducedMotion()) {
    gsap.set(targets, {
      clearProps: 'opacity,visibility,transform,transformOrigin',
    })
    return
  }

  gsap.set(targets, {
    opacity: 0,
    ...getPanelHiddenTransform(panelPosition.value.placement),
  })

  panelOpenTransition = gsap.timeline({
    defaults: {
      ...panelEnterMotion,
      overwrite: true,
    },
    onComplete: () => {
      panelOpenTransition = undefined
      gsap.set(targets, {
        clearProps: 'opacity,visibility,transform,transformOrigin',
      })
    },
  })

  panelOpenTransition.to(targets, {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
  })
}

function finishPanelClose(restoreFocus: boolean) {
  killPanelCloseTransition(true)
  shouldRenderPanel.value = false
  isClosing.value = false
  hoverValue.value = null

  if (restoreFocus) {
    void nextTick(() => triggerRef.value?.focus())
  }
}

function animatePanelClose(restoreFocus: boolean) {
  const targets = getPanelAnimationTargets().filter(target => target === panelRef.value || !inlineShortcuts.value)

  if (!targets.length || prefersReducedMotion()) {
    finishPanelClose(restoreFocus)
    return
  }

  const hiddenTransform = getPanelHiddenTransform(panelPosition.value.placement)

  killPanelCloseTransition()
  gsap.killTweensOf(targets)
  gsap.set(targets, {
    transformOrigin: hiddenTransform.transformOrigin,
  })

  panelCloseTransition = gsap.timeline({
    defaults: {
      ...panelLeaveMotion,
      overwrite: true,
    },
    onComplete: () => finishPanelClose(restoreFocus),
  })

  panelCloseTransition.to(targets, {
    autoAlpha: 0,
    ...hiddenTransform,
  })
}

async function animatePanelViewTransition(previousHeight: number) {
  await nextTick()

  const panel = panelRef.value

  if (!panel || !isOpen.value || isClosing.value || previousHeight <= 0) {
    return
  }

  const view = panel.querySelector<HTMLElement>('.bing-date-picker__view')
  const targets = getDefinedElements([panel, view])

  killPanelViewTransition()
  gsap.killTweensOf(targets)
  gsap.set(panel, { clearProps: 'height,overflow' })

  const nextHeight = panel.getBoundingClientRect().height

  if (nextHeight <= 0) {
    return
  }

  if (prefersReducedMotion()) {
    gsap.set(targets, {
      clearProps: 'height,overflow,opacity,visibility,transform,transformOrigin',
    })
    return
  }

  gsap.set(panel, {
    height: previousHeight,
    overflow: 'hidden',
  })

  if (view) {
    gsap.set(view, {
      autoAlpha: 0,
      scale: 0.985,
      transformOrigin: '50% 0%',
      y: 8,
    })
  }

  panelViewTransition = gsap.timeline({
    defaults: {
      ease: 'power3.out',
      overwrite: true,
    },
    onComplete: () => {
      panelViewTransition = undefined
      gsap.set(panel, { clearProps: 'height,overflow' })

      if (view) {
        gsap.set(view, {
          clearProps: 'opacity,visibility,transform,transformOrigin',
        })
      }
    },
  })

  panelViewTransition.to(
    panel,
    {
      duration: Math.abs(nextHeight - previousHeight) > 1 ? 0.22 : 0.01,
      height: nextHeight,
    },
    0,
  )

  if (view) {
    panelViewTransition.to(
      view,
      {
        autoAlpha: 1,
        duration: 0.2,
        scale: 1,
        y: 0,
      },
      0.03,
    )
  }
}

watch(
  () => [props.type, props.modelValue] as const,
  () => {
    if (!isOpen.value) {
      syncPendingFromModel()
    }
  },
  { immediate: true },
)

watch(activePanel, (_panel, previousPanel) => {
  if (!previousPanel || !isOpen.value || !panelRef.value) {
    return
  }

  const previousHeight = panelRef.value.getBoundingClientRect().height

  void animatePanelViewTransition(previousHeight)
})

watch(rangeFocus, () => {
  if (!isOpen.value || !usesTimePanel.value) {
    return
  }

  stopPanelScrollbars()
  void nextTick(scrollCurrentTimeOptionsIntoView)
})

function normalizeCssLength(value: string | number) {
  return typeof value === 'number' ? `${value}px` : value
}

function clampNumber(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

function defaultTimeValue() {
  return normalizeForType(dayjs())
}

function parseValue(value: string | null | undefined) {
  return parseDateValue(value, props.type, valueFormat.value)
}

function normalizeForType(value: Dayjs) {
  return normalizeValueForType(value, props.type)
}

function formatValue(value: Dayjs) {
  return normalizeForType(value).format(valueFormat.value)
}

function formatPayloadValue(value: BingDatePickerModelValue): BingDatePickerChangePayload {
  let parsedValue: Dayjs | [Dayjs, Dayjs] | null = null

  if (Array.isArray(value)) {
    const start = parseValue(value[0])
    const end = parseValue(value[1])

    parsedValue = start && end ? [start, end] : null
  } else if (typeof value === 'string') {
    parsedValue = parseValue(value)
  }

  return {
    value,
    parsedValue,
    type: props.type,
    range: props.range,
  }
}

function compareValue(value: Dayjs, target: Dayjs, mode: 'start' | 'end' = 'start') {
  return compareTypedValue(value, target, props.type, mode)
}

function isBeforeTyped(value: Dayjs, target: Dayjs) {
  return compareValue(value, target) < 0
}

function isAfterTyped(value: Dayjs, target: Dayjs) {
  return compareValue(value, target) > 0
}

function isOutOfRange(value: Dayjs) {
  const min = minValue.value
  const max = maxValue.value

  return Boolean(
    (min && compareValue(value, min) < 0) ||
      (max && compareValue(value, max) > 0),
  )
}

function isPeriodOutsideRange(value: Dayjs, unit: DatePeriodUnit) {
  const min = minValue.value
  const max = maxValue.value

  return Boolean(
    (min && value.endOf(unit).isBefore(min)) ||
      (max && value.startOf(unit).isAfter(max)),
  )
}

function isValueDisabled(value: Dayjs | null, role: BingDatePickerRangeRole = rangeFocus.value) {
  if (!value) {
    return true
  }

  if (isOutOfRange(value)) {
    return true
  }

  if (props.type !== 'time' && props.disabledDate?.(value, { type: props.type, range: props.range, role })) {
    return true
  }

  if (usesTimePanel.value && isAnyTimePartDisabled(value, role)) {
    return true
  }

  return false
}

function isAnyTimePartDisabled(value: Dayjs, role: BingDatePickerRangeRole) {
  return (['hour', 'minute', 'second'] as const).some((unit) =>
    isTimeOptionDisabled(unit, value[unit](), role, value),
  )
}

function isDateCellDisabled(value: Dayjs) {
  if (props.type === 'datetime') {
    if (isPeriodOutsideRange(value, 'day')) {
      return true
    }
  } else if (isOutOfRange(value)) {
    return true
  }

  return Boolean(props.disabledDate?.(value, { type: props.type, range: props.range, role: rangeFocus.value }))
}

function isMonthCellDisabled(value: Dayjs) {
  return Boolean(
    isPeriodOutsideRange(value, 'month') ||
      props.disabledDate?.(value, { type: props.type, range: props.range, role: rangeFocus.value }),
  )
}

function isYearCellDisabled(value: Dayjs) {
  return Boolean(
    isPeriodOutsideRange(value, 'year') ||
      props.disabledDate?.(value, { type: props.type, range: props.range, role: rangeFocus.value }),
  )
}

function isTimeOptionDisabled(
  unit: BingDatePickerTimeUnit,
  value: number,
  role: BingDatePickerRangeRole = rangeFocus.value,
  base = activeTimeTarget.value,
) {
  const candidate = base[unit](value)

  if (isOutOfRange(candidate)) {
    return true
  }

  return Boolean(
    props.disabledTime?.(candidate, {
      type: props.type,
      range: props.range,
      role,
      unit,
      value,
    }),
  )
}

function withCurrentTime(value: Dayjs) {
  const source = props.range
    ? rangeFocus.value === 'start'
      ? pendingStart.value
      : pendingEnd.value
    : pendingSingle.value

  if (props.type !== 'datetime' || !source) {
    return normalizeForType(value)
  }

  return normalizeForType(
    value.hour(source.hour()).minute(source.minute()).second(source.second()),
  )
}

function syncPendingFromModel() {
  panelView.value = 'calendar'

  if (props.range) {
    const values = Array.isArray(props.modelValue) ? props.modelValue : null
    pendingStart.value = values ? parseValue(values[0]) : null
    pendingEnd.value = values ? parseValue(values[1]) : null
    pendingSingle.value = null
    rangeFocus.value = pendingStart.value && !pendingEnd.value ? 'end' : 'start'
    syncActiveView(pendingStart.value ?? pendingEnd.value ?? dayjs())
    return
  }

  pendingSingle.value = typeof props.modelValue === 'string' ? parseValue(props.modelValue) : null
  pendingStart.value = null
  pendingEnd.value = null
  syncActiveView(pendingSingle.value ?? dayjs())
}

function syncActiveView(value: Dayjs) {
  activeMonth.value = value.startOf('month')
  activeYear.value = value.year()
}

function getSelectedValues() {
  return props.range
    ? [pendingStart.value, pendingEnd.value]
    : [pendingSingle.value]
}

function compareVisibleValue(value: Dayjs, target: Dayjs, unit?: DatePeriodUnit) {
  if (!unit) {
    return compareValue(value, target)
  }

  return value.startOf(unit).valueOf() - target.startOf(unit).valueOf()
}

function isSelected(value: Dayjs, unit?: DatePeriodUnit) {
  return getSelectedValues().some(
    (selected) => selected && compareVisibleValue(selected, value, unit) === 0,
  )
}

function isInRange(value: Dayjs, unit?: DatePeriodUnit) {
  const start = pendingStart.value
  const end = pendingEnd.value ?? hoverValue.value

  if (!props.range || !start || !end) {
    return false
  }

  const rangeStart = isBeforeTyped(start, end) ? start : end
  const rangeEnd = isBeforeTyped(start, end) ? end : start

  if (unit) {
    return !value.endOf(unit).isBefore(rangeStart) && !value.startOf(unit).isAfter(rangeEnd)
  }

  return !isBeforeTyped(value, rangeStart) && !isAfterTyped(value, rangeEnd)
}

function commitValue(value: BingDatePickerModelValue, emitConfirm = false) {
  const payload = formatPayloadValue(value)

  emit('update:modelValue', value)
  emit('change', payload)
  formItem?.handleControlChange()

  if (emitConfirm) {
    emit('confirm', payload)
  }
}

function commitSingle(value: Dayjs) {
  commitValue(formatValue(value))
  closePanel(true)
}

function selectCandidate(value: Dayjs) {
  const candidate = withCurrentTime(value)

  if (isDateLike.value && isDateCellDisabled(candidate)) {
    return
  }

  if (props.type === 'month' && isMonthCellDisabled(candidate)) {
    return
  }

  if (props.type === 'year' && isYearCellDisabled(candidate)) {
    return
  }

  if (!props.range) {
    pendingSingle.value = candidate

    if (!requiresConfirm.value) {
      commitSingle(candidate)
    }

    return
  }

  if (!pendingStart.value || pendingEnd.value) {
    pendingStart.value = candidate
    pendingEnd.value = null
    rangeFocus.value = 'end'
    return
  }

  if (isBeforeTyped(candidate, pendingStart.value)) {
    pendingEnd.value = pendingStart.value
    pendingStart.value = candidate
  } else {
    pendingEnd.value = candidate
  }

  rangeFocus.value = 'end'
}

function selectYearCell(value: Dayjs) {
  if (isYearPanelCellDisabled(value)) {
    return
  }

  if (props.type === 'year') {
    selectCandidate(value)
    return
  }

  activeYear.value = value.year()
  activeMonth.value = activeMonth.value.year(value.year())
  panelView.value = 'calendar'
}

function selectTimePart(unit: BingDatePickerTimeUnit, value: number) {
  if (isTimeOptionDisabled(unit, value)) {
    return
  }

  stopPanelScrollbars()

  const base = activeTimeTarget.value[unit](value)

  if (props.range) {
    if (rangeFocus.value === 'start') {
      pendingStart.value = normalizeForType(base)
      return
    }

    pendingEnd.value = normalizeForType(base)
    return
  }

  pendingSingle.value = normalizeForType(base)
}

function confirmSelection() {
  if (!canConfirm.value) {
    return
  }

  if (props.range && pendingStart.value && pendingEnd.value) {
    const start = isBeforeTyped(pendingStart.value, pendingEnd.value) ? pendingStart.value : pendingEnd.value
    const end = isBeforeTyped(pendingStart.value, pendingEnd.value) ? pendingEnd.value : pendingStart.value
    const value: [string, string] = [formatValue(start), formatValue(end)]

    commitValue(value, true)
    closePanel(true)
    return
  }

  if (!props.range && pendingSingle.value) {
    commitValue(formatValue(pendingSingle.value), true)
    closePanel(true)
  }
}

function cancelSelection() {
  emit('cancel')
  syncPendingFromModel()
  closePanel(true)
}

function clear() {
  if (!props.clearable || resolvedDisabled.value || !hasValue.value) {
    return
  }

  emit('clear')
  commitValue(null)
  syncPendingFromModel()
}

function focus() {
  triggerRef.value?.focus()
}

function blur() {
  triggerRef.value?.blur()
}

function getEstimatedPanelWidth(anchorWidth: number) {
  if (props.type === 'time') {
    return 260
  }

  if (props.type === 'datetime') {
    return Math.max(anchorWidth, props.range ? 560 : 536)
  }

  return Math.max(anchorWidth, props.range ? 320 : 280)
}

function getEstimatedPanelHeight() {
  // Position against the layout height, independent of the entrance transform.
  if (panelRef.value?.offsetHeight) {
    return panelRef.value.offsetHeight
  }

  if (props.type === 'time') {
    return props.range ? 370 : 320
  }

  if (props.type === 'month' || props.type === 'year') {
    return props.range ? 360 : 300
  }

  if (props.type === 'datetime') {
    return props.range ? 460 : 410
  }

  return props.range ? 430 : 382
}

function updatePanelPosition() {
  const trigger = triggerRef.value

  if (!trigger || typeof window === 'undefined') {
    return
  }

  const viewportPadding = 12
  const panelGap = 8
  const rect = trigger.getBoundingClientRect()
  const panelWidth = Math.min(
    getEstimatedPanelWidth(rect.width),
    Math.max(1, window.innerWidth - viewportPadding * 2),
  )
  const panelHeight = getEstimatedPanelHeight()
  const { side, left, top } = computeFloatingPosition({
    anchor: rect,
    floating: { width: panelWidth, height: panelHeight },
    side: 'bottom',
    gap: panelGap,
    padding: viewportPadding,
  })

  panelPosition.value = {
    left,
    placement: side as 'bottom' | 'top',
    top,
    width: panelWidth,
  }
}

watch(inlineShortcuts, () => {
  if (shouldRenderPanel.value) void nextTick(panelAutoUpdate.schedule)
})

function openPanel() {
  if (resolvedDisabled.value || isOpen.value) {
    return
  }

  killPanelCloseTransition(true)
  isClosing.value = false
  syncPendingFromModel()
  shouldRenderPanel.value = true
  isOpen.value = true
  addOutsideListener()
  panelAutoUpdate.start()
  emit('open')

  void nextTick(async () => {
    updatePanelPosition()
    await nextTick()
    updatePanelPosition()
    scrollCurrentTimeOptionsIntoView()
    animatePanelOpen()
    panelRef.value?.focus()
  })
}

function closePanel(restoreFocus = false) {
  if (!isOpen.value) {
    return
  }

  killPanelViewTransition()
  killPanelOpenTransition()
  stopPanelScrollbars()
  isOpen.value = false
  isClosing.value = true
  hoverValue.value = null
  removeOutsideListener()
  panelAutoUpdate.dispose()
  emit('close')
  animatePanelClose(restoreFocus)
}

function togglePanel() {
  if (isOpen.value) {
    closePanel(true)
    return
  }

  openPanel()
}

function handleChevronClick(event: MouseEvent) {
  event.stopPropagation()
  triggerRef.value?.focus()
  togglePanel()
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (resolvedDisabled.value) return
  if (event.key === 'Escape' && (event.defaultPrevented || !overlay.isTop(event))) return
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
    event.preventDefault()
    playClickFeedback(event, triggerRef.value)
    openPanel()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    cancelSelection()
  }
}

function handlePanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (event.defaultPrevented || !overlay.isTop(event))) return
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelSelection()
    return
  }

  if (event.key === 'Enter' && requiresConfirm.value) {
    event.preventDefault()
    if (canConfirm.value) playClickFeedback(event, panelRef.value?.querySelector<HTMLElement>('.bing-date-picker__footer .bing-button:last-child'))
    confirmSelection()
  }
}

function handleTriggerBlur(event: FocusEvent) {
  if (isOpen.value || panelRef.value?.contains(event.relatedTarget as Node | null)) {
    return
  }

  formItem?.handleControlBlur()
}

function handleWindowPointerDown(event: PointerEvent) {
  const target = event.target

  if (!(target instanceof Node) || overlay.contains(target)) {
    return
  }

  if (
    !triggerRef.value?.contains(target) &&
    !panelRef.value?.contains(target) &&
    !shortcutRailRef.value?.contains(target)
  ) {
    closePanel()
    formItem?.handleControlBlur()
  }
}

function addOutsideListener() {
  if (isListeningForOutside || typeof window === 'undefined') {
    return
  }

  window.addEventListener('pointerdown', handleWindowPointerDown, true)
  isListeningForOutside = true
}

function removeOutsideListener() {
  if (!isListeningForOutside || typeof window === 'undefined') {
    return
  }

  window.removeEventListener('pointerdown', handleWindowPointerDown, true)
  isListeningForOutside = false
}

function openYearPanel() {
  if (!canSwitchYearPanel.value) {
    return
  }

  panelView.value = 'year'
  activeYear.value = activePanel.value === 'month' ? activeYear.value : activeMonth.value.year()
}

function isYearPanelCellDisabled(value: Dayjs) {
  if (props.type === 'year') {
    return isYearCellDisabled(value)
  }

  return isPeriodOutsideRange(value, 'year')
}

function getShortcutAriaLabel(shortcut: DatePickerShortcut) {
  return `应用快捷选项： ${shortcut.label}`
}

function applyShortcut(shortcut: DatePickerShortcut) {
  if (Array.isArray(shortcut.value)) {
    const [start, end] = shortcut.value.map((value) => normalizeForType(value)) as [Dayjs, Dayjs]

    if (isValueDisabled(start, 'start') || isValueDisabled(end, 'end')) {
      return
    }

    commitValue([formatValue(start), formatValue(end)], true)
    closePanel(true)
    return
  }

  const value = normalizeForType(shortcut.value)

  if (isValueDisabled(value, 'start')) {
    return
  }

  commitValue(formatValue(value), true)
  closePanel(true)
}

onBeforeUnmount(() => {
  killPanelViewTransition()
  killPanelOpenTransition()
  killPanelCloseTransition()
  stopPanelScrollbars()
  removeOutsideListener()
  panelAutoUpdate.dispose()
})

defineExpose<BingDatePickerExpose>({
  focus,
  blur,
  openPanel,
  closePanel: () => closePanel(),
  clear,
})
</script>

<template>
  <div :class="rootClasses" :style="rootStyle">
    <button v-click-feedback
      :id="resolvedId"
      ref="triggerRef"
      class="bing-date-picker__trigger"
      type="button"
      :disabled="resolvedDisabled"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      :aria-invalid="resolvedStatus === 'error' || undefined"
      :aria-describedby="resolvedAriaDescribedby"
      @click="togglePanel"
      @keydown="handleTriggerKeydown"
      @blur="handleTriggerBlur"
    >
      <BingIcon class="bing-date-picker__leading-icon" :icon="type === 'time' ? Clock3 : CalendarDays" size="sm" />
      <span v-if="!range" class="bing-date-picker__value" :class="{ 'is-placeholder': !displayValue }">
        {{ displayValue || placeholder || '请选择日期' }}
      </span>
      <span v-else class="bing-date-picker__range-value">
        <span :class="{ 'is-placeholder': !rangeStartDisplay }">{{ rangeStartDisplay || startPlaceholder }}</span>
        <span class="bing-date-picker__range-separator">-</span>
        <span :class="{ 'is-placeholder': !rangeEndDisplay }">{{ rangeEndDisplay || endPlaceholder }}</span>
      </span>
    </button>

    <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
      v-if="clearable && hasValue && !resolvedDisabled"
      class="bing-date-picker__clear"
      aria-label="清空已选日期"
      @click.stop="clear"
      @keydown.stop
    >
      <template #prefix>
        <BingIcon :icon="X" size="sm" :stroke-width="1.75" />
      </template>
    </BingButton>

    <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
      class="bing-date-picker__chevron"
      tabindex="-1"
      aria-hidden="true"
      :disabled="resolvedDisabled"
      @click="handleChevronClick"
    >
      <template #prefix>
        <BingIcon :icon="ChevronDown" size="sm" :stroke-width="1.75" />
      </template>
    </BingButton>

    <Teleport v-if="clientReady" to="body">
      <div
        v-if="shouldRenderPanel"
        ref="panelRef"
        :class="panelClasses"
        :style="panelStyle"
        tabindex="-1"
        @keydown="handlePanelKeydown"
      >
        <Teleport to="body" :disabled="inlineShortcuts">
          <div
            v-if="showShortcuts && shortcuts.length"
            ref="shortcutRailRef"
            class="bing-date-picker__shortcut-rail"
            :class="{ 'is-closing': isClosing, 'is-inline': inlineShortcuts }"
            :style="inlineShortcuts ? undefined : shortcutRailStyle"
            aria-label="日期快捷选项"
            @pointerdown.stop
            @click.stop
          >
            <BingButton
              v-for="shortcut in shortcuts"
              :key="shortcut.label"
              class="bing-date-picker__shortcut"
              variant="tertiary"
              size="xs"
              rounded="md"
              text-effect="none"
              text-shine="none"
              :throttle="false"
              :aria-label="getShortcutAriaLabel(shortcut)"
              @click="applyShortcut(shortcut)"
            >
              <span class="bing-date-picker__shortcut-text">{{ shortcut.text }}</span>
            </BingButton>
          </div>
        </Teleport>
        <BingScrollbar ref="mainScrollRef" class="bing-date-picker__main-scroll" :smooth="resolvedSmoothScroll" :focusable="false" horizontal>
          <div class="bing-date-picker__main">
            <div v-if="range" class="bing-date-picker__range-tabs">
              <button v-click-feedback
                class="bing-date-picker__range-tab"
                :class="{ 'is-active': rangeFocus === 'start' }"
                type="button"
                @click="rangeFocus = 'start'"
              >
                {{ pendingStart?.format(displayFormat) || startPlaceholder }}
              </button>
              <button v-click-feedback
                class="bing-date-picker__range-tab"
                :class="{ 'is-active': rangeFocus === 'end' }"
                type="button"
                @click="rangeFocus = 'end'"
              >
                {{ pendingEnd?.format(displayFormat) || endPlaceholder }}
              </button>
            </div>

            <BingDatePickerCalendar
              v-if="type !== 'time'"
              v-model:month="activeMonth"
              v-model:year="activeYear"
              :type="type"
              :panel="activePanel"
              :locale="locale"
              :first-day-of-week="firstDayOfWeek"
              :can-switch-year="canSwitchYearPanel"
              :is-selected="isSelected"
              :is-in-range="isInRange"
              :is-date-disabled="isDateCellDisabled"
              :is-month-disabled="isMonthCellDisabled"
              :is-year-disabled="isYearPanelCellDisabled"
              @hover="hoverValue = $event"
              @select="selectCandidate"
              @select-year="selectYearCell"
              @open-year="openYearPanel"
            />

            <BingDatePickerTimePanel
              v-if="usesTimePanel"
              ref="timePanelRef"
              :value="activeTimeTarget"
              :compact="type === 'time'"
              :hour-step="hourStep"
              :minute-step="minuteStep"
              :second-step="secondStep"
              :smooth="resolvedSmoothScroll"
              :is-disabled="isTimeOptionDisabled"
              @select="selectTimePart"
            />
          </div>
        </BingScrollbar>
        <footer v-if="requiresConfirm" class="bing-date-picker__footer">
          <BingButton variant="ghost" size="sm" :throttle="false" @click="cancelSelection">取消</BingButton>
          <BingButton size="sm" :throttle="false" :disabled="!canConfirm" @click="confirmSelection">
            <template #prefix>
              <BingIcon :icon="Check" size="xs" />
            </template>
            确定
          </BingButton>
        </footer>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bing-date-picker {
  --bing-date-picker-height: var(--bing-control-height-md, 36px);
  --bing-date-picker-padding-x: 10px;
  --bing-date-picker-font-size: 14px;
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  width: 280px;
  min-width: min(100%, var(--bing-date-picker-min-width, 220px));
  max-width: 100%;
  color: var(--bing-text);
  font-size: var(--bing-date-picker-font-size);
  font-weight: 400;
}

.bing-date-picker.is-block {
  display: flex;
  width: 100%;
}

.bing-date-picker__trigger {
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 8px;
  min-height: var(--bing-date-picker-height);
  padding: 0 34px 0 var(--bing-date-picker-padding-x);
  border: 1px solid var(--bing-control-border);
  border-radius: 6px;
  background: var(--bing-control-bg);
  box-shadow: var(--bing-control-shadow);
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  font-weight: 400;
  text-align: left;
  transition:
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth),
    background var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-date-picker.has-clear-action .bing-date-picker__trigger {
  padding-right: 60px;
}

.bing-date-picker--sm {
  --bing-date-picker-height: var(--bing-control-height-sm, 32px);
  --bing-date-picker-padding-x: 8px;
  --bing-date-picker-font-size: 13px;
}

.bing-date-picker--sm .bing-date-picker__trigger {
  font-size: var(--bing-date-picker-font-size);
}

.bing-date-picker--lg {
  --bing-date-picker-height: var(--bing-control-height-lg, 40px);
  --bing-date-picker-padding-x: 12px;
}

.bing-date-picker--lg .bing-date-picker__trigger {
  font-size: var(--bing-date-picker-font-size);
}

.bing-date-picker__trigger:hover:not(:disabled) {
  border-color: var(--bing-control-hover-border);
  background: var(--bing-control-hover-bg);
  box-shadow: var(--bing-control-shadow);
}

.bing-date-picker.is-open .bing-date-picker__trigger {
  border-color: var(--bing-control-hover-border);
  background: var(--bing-control-hover-bg);
  box-shadow: var(--bing-control-focus-shadow);
}

.bing-date-picker__trigger:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 1px;
}

.bing-date-picker__trigger:disabled {
  cursor: not-allowed;
}

.bing-date-picker.bing-date-picker--status-error:not(.is-disabled) .bing-date-picker__trigger {
  border-color: var(--bing-danger);
}

.bing-date-picker.bing-date-picker--status-success:not(.is-disabled) .bing-date-picker__trigger {
  border-color: rgb(var(--bing-success-rgb) / 0.3);
}

.bing-date-picker.bing-date-picker--status-warning:not(.is-disabled) .bing-date-picker__trigger {
  border-color: rgb(var(--bing-warning-rgb) / 0.38);
}

.bing-date-picker__trigger:disabled {
  border-color: var(--bing-control-disabled-border);
  background: var(--bing-control-disabled-bg);
  box-shadow: none;
  color: var(--bing-disabled-text);
}

.bing-date-picker__leading-icon,
.bing-date-picker__chevron {
  flex: 0 0 auto;
  color: var(--bing-muted);
}

.bing-date-picker--status-error .bing-date-picker__leading-icon,
.bing-date-picker--status-error .bing-date-picker__chevron {
  color: var(--bing-danger-strong);
}

.bing-date-picker--status-success .bing-date-picker__leading-icon,
.bing-date-picker--status-success .bing-date-picker__chevron {
  color: var(--bing-success-strong);
}

.bing-date-picker--status-warning .bing-date-picker__leading-icon,
.bing-date-picker--status-warning .bing-date-picker__chevron {
  color: var(--bing-warning-strong);
}

.bing-date-picker.is-disabled .bing-date-picker__leading-icon,
.bing-date-picker.is-disabled .bing-date-picker__clear,
.bing-date-picker.is-disabled .bing-date-picker__chevron {
  color: var(--bing-disabled-text);
}

.bing-date-picker__value,
.bing-date-picker__range-value {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-date-picker__range-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.bing-date-picker__range-separator {
  color: var(--bing-muted);
}

.is-placeholder {
  color: var(--bing-placeholder);
}

.bing-date-picker__clear,
.bing-date-picker__chevron {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  transform: translateY(-50%);
}

.bing-date-picker__clear {
  right: 30px;
  color: var(--bing-muted);
  cursor: pointer;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-date-picker__clear:hover {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-date-picker__clear:active {
  transform: translateY(-50%) scale(0.94);
}

.bing-date-picker__clear:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 0;
}

.bing-date-picker__chevron {
  right: 4px;
  cursor: pointer;
  transition: transform var(--bing-duration-normal) var(--bing-ease-smooth);
}

.bing-date-picker__chevron:focus-visible {
  outline: none;
}

.bing-date-picker__chevron:disabled {
  cursor: not-allowed;
}

.bing-date-picker.is-open .bing-date-picker__chevron {
  transform: translateY(-50%) rotate(180deg);
}

.bing-date-picker__panel {
  box-sizing: border-box;
  position: fixed;
  z-index: 3100;
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 24px);
  overflow: hidden;
  border: 1px solid var(--bing-popover-border);
  border-radius: 8px;
  background: rgb(var(--bing-surface-rgb) / var(--bing-date-picker-glass-opacity, 0.86));
  background-clip: padding-box;
  box-shadow: var(--bing-popover-shadow);
  backdrop-filter: blur(var(--bing-date-picker-glass-blur, 16px)) saturate(var(--bing-date-picker-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-date-picker-glass-blur, 16px)) saturate(var(--bing-date-picker-glass-saturation, 1.05));
  color: var(--bing-text);
}

.bing-date-picker__shortcut-rail {
  display: grid;
  width: 116px;
  align-content: start;
  gap: 8px;
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  will-change: opacity, transform;
}

.bing-date-picker__panel.is-closing,
.bing-date-picker__shortcut-rail.is-closing {
  pointer-events: none;
}

.bing-date-picker__shortcut {
  --button-bg: rgb(var(--bing-surface-rgb) / var(--bing-date-picker-glass-opacity, 0.86));
  --button-border: var(--bing-popover-border);
  --button-color: var(--bing-heading);
  --button-shadow: var(--bing-shadow-sm);
  display: inline-flex;
  width: 116px;
  height: 32px;
  min-height: 32px;
  min-width: 0;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
}

.bing-date-picker__shortcut:hover {
  --button-bg: var(--bing-surface-hover);
  --button-border: var(--bing-control-hover-border);
}

.bing-date-picker__shortcut-text {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-date-picker__shortcut:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 0;
}

.bing-date-picker__main-scroll {
  --bing-scrollbar-gutter: 0px;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

.bing-date-picker__main-scroll > :deep(.bing-scrollbar__viewport) {
  min-height: 0;
  height: auto;
  overscroll-behavior: contain;
}

.bing-date-picker__main {
  display: grid;
  flex: 1 1 auto;
  align-content: start;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  padding: 12px;
}

.bing-date-picker__panel--datetime .bing-date-picker__main {
  grid-template-columns: minmax(248px, 1fr) auto;
  column-gap: 16px;
}

.bing-date-picker__range-tabs {
  display: flex;
  grid-column: 1 / -1;
  gap: 8px;
}

.bing-date-picker__range-tab {
  min-width: 0;
  min-height: 32px;
  flex: 1 1 0;
  border: 1px solid var(--bing-border);
  border-radius: 6px;
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 400;
  padding: 5px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-date-picker__range-tab.is-active {
  border-color: var(--bing-control-hover-border);
  background: var(--bing-surface-active);
  color: var(--bing-heading);
}

.bing-date-picker__footer {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--bing-border);
}

.bing-date-picker__range-value > :not(.bing-date-picker__range-separator) {
  min-width: 0;
  flex: 1 1 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bing-date-picker__range-separator { flex: 0 0 auto; }
.bing-date-picker__shortcut-rail.is-inline {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: auto;
  margin: 8px 8px 0;
  gap: 4px;
}
.bing-date-picker__shortcut-rail.is-inline .bing-date-picker__shortcut { width: 100%; }
.bing-date-picker__range-tab:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: -2px;
}

@media (max-width: 680px) {
  .bing-date-picker__panel--datetime .bing-date-picker__main {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-date-picker__clear,
  .bing-date-picker__chevron {
    transition: none;
  }
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-date-picker__clear.bing-button {
  --button-height: 24px;
  --button-icon-size: 16px;
  min-height: 24px;
  width: var(--button-height);
  padding: 0;
}

.bing-date-picker__chevron.bing-button {
  --button-height: 24px;
  --button-icon-size: 16px;
  min-height: 24px;
  width: var(--button-height);
  padding: 0;
}

</style>
