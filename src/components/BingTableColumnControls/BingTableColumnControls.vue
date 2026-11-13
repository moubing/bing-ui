<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Columns3, GripVertical, Pin } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingDropDown from '../BingDropDown/BingDropDown.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import BingSortableList from '../BingSortableList/BingSortableList.vue'
import type { BingSortableListDragPayload, BingSortableListPayload } from '../BingSortableList/BingSortableList.types'
import { compactSmoothScrollOptions, resolveComponentSmoothScroll } from '../../motion/smoothScroll'
import { useTableColumns } from '../BingTable/useTableColumns'
import type { BingTableColumnControlsProps, BingTableColumnControlsEmits, BingTableColumnControlsExpose } from './BingTableColumnControls.types'

const props = withDefaults(defineProps<BingTableColumnControlsProps>(), {
  columns: () => [], columnWidths: undefined, defaultColumnWidths: () => ({}),
  columnOrder: undefined, defaultColumnOrder: () => [], hiddenColumnKeys: undefined,
  defaultHiddenColumnKeys: () => [], columnFixed: undefined, defaultColumnFixed: () => ({}),
  reorderableColumns: true, smoothScroll: true, open: undefined, defaultOpen: false,
  disabled: false, placement: 'bottom-start', ariaLabel: '列设置',
})
const emit = defineEmits<BingTableColumnControlsEmits>()
const { orderedColumns, visibleColumns, effectiveColumnOrder, getColumnFixed, isColumnHidden,
  applyColumnOrder, toggleColumnVisibility, setColumnFixed, resetColumns } = useTableColumns(props, emit)
const localOpen = ref(props.defaultOpen)
const dragging = ref(false)
const isColumnPanelOpen = computed({
  get: () => props.open !== undefined ? props.open : localOpen.value,
  set: value => {
    if (props.disabled && value) return
    if (props.open === undefined) localOpen.value = value
    emit('update:open', value)
  },
})
const columnListScrollRef = ref<BingScrollbarExpose | null>(null)
const resolvedColumnListSmooth = computed(() =>
  resolveComponentSmoothScroll(props.smoothScroll, compactSmoothScrollOptions, {
    keyboard: false, smoothTouchpad: false, respectReducedMotion: true,
  }),
)
function handleColumnPanelReorder(payload: BingSortableListPayload) {
  applyColumnOrder(payload.order, payload.key, payload.from, payload.to)
}
function handleColumnPanelDragStart(payload: BingSortableListDragPayload) {
  columnListScrollRef.value?.stop()
  dragging.value = true
  emit('drag-start', payload)
}
function handleColumnPanelDragEnd(payload: BingSortableListDragPayload) {
  dragging.value = false
  emit('drag-end', payload)
}
watch(isColumnPanelOpen, open => { if (!open) columnListScrollRef.value?.stop() })
watch(() => props.disabled, disabled => { if (disabled) isColumnPanelOpen.value = false })
defineExpose<BingTableColumnControlsExpose>({ resetColumns })
</script>

<template>
  <div class="bing-table__column-controls">
    <BingDropDown
      v-model:open="isColumnPanelOpen"
      class="bing-table__column-dropdown"
      :placement="placement"
      :width="360"
      max-width="calc(100vw - 24px)"
      panel-class="bing-table__column-panel-shell"
      :aria-label="ariaLabel"
    >
      <template #trigger="{ triggerProps }">
        <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
          v-bind="triggerProps"
          class="bing-table__icon-button"
          :disabled="disabled"
          :class="{ 'is-active': isColumnPanelOpen }"
          :aria-label="ariaLabel"
        >
          <template #prefix>
            <BingIcon :icon="Columns3" size="sm" :stroke-width="1.75" />
          </template>
        </BingButton>
      </template>

      <template #header>
        <div class="bing-table__column-panel-head">
          <span>{{ ariaLabel }}</span>
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false" class="bing-table__text-button" :disabled="disabled" @click="resetColumns">
            重置
          </BingButton>
        </div>
      </template>

      <div
        class="bing-table__column-panel"
        :class="{ 'is-reordering': dragging }"
        role="group"
        :aria-label="ariaLabel"
      >
        <BingScrollbar
          ref="columnListScrollRef"
          class="bing-table__column-list-scroll"
          :max-height="330"
          :smooth="resolvedColumnListSmooth"
          :focusable="false"
          aria-label="列设置列表"
        >
          <BingSortableList
            class="bing-table__column-list"
            :items="orderedColumns"
            :order="effectiveColumnOrder"
            item-key="key"
            :disabled="disabled || !reorderableColumns"
            axis="vertical"
            drag-overlay
            aria-label="列顺序"
            handle-aria-label="调整列顺序"
            @reorder="handleColumnPanelReorder"
            @drag-start="handleColumnPanelDragStart"
            @drag-end="handleColumnPanelDragEnd"
          >
            <template #default="{ item: column, handleProps }">
              <div
                class="bing-table__column-option"
                :class="{
                  'is-hidden': isColumnHidden(column.key),
                  'is-fixed-left': getColumnFixed(column) === 'left',
                  'is-fixed-right': getColumnFixed(column) === 'right',
                }"
                data-bing-dropdown-stagger
              >
                <span v-bind="handleProps" class="bing-table__column-grip">
                  <BingIcon :icon="GripVertical" size="xs" :stroke-width="1.75" />
                </span>

                <BingCheckbox
                  class="bing-table__column-check"
                  size="sm"
                  :model-value="!isColumnHidden(column.key)"
                  :disabled="disabled || (!isColumnHidden(column.key) && visibleColumns.length === 1)"
                  :aria-label="`显示列：${column.title || column.key}`"
                  @change="(checked) => toggleColumnVisibility(column.key, checked)"
                />

                <div class="bing-table__column-meta">
                  <span class="bing-table__column-name">{{ column.title || column.key }}</span>
                  <span v-if="column.description" class="bing-table__column-desc">
                    {{ column.description }}
                  </span>
                </div>

                <div class="bing-table__pin-actions" aria-label="固定列设置">
                  <BingButton
                    size="xs"
                    rounded="sm"
                    :variant="getColumnFixed(column) === 'left' ? 'secondary' : 'ghost'"
                    :throttle="false"
                    :disabled="disabled"
                    class="bing-table__pin-button bing-table__pin-button--left"
                    :class="{ 'is-active': getColumnFixed(column) === 'left' }"
                    :aria-pressed="getColumnFixed(column) === 'left'"
                    aria-label="固定到左侧"
                    @click="setColumnFixed(column.key, getColumnFixed(column) === 'left' ? null : 'left')"
                  >
                    <template #prefix>
                      <BingIcon :icon="Pin" size="xs" :stroke-width="1.75" />
                    </template>
                  </BingButton>
                  <BingButton
                    size="xs"
                    rounded="sm"
                    :variant="getColumnFixed(column) === 'right' ? 'secondary' : 'ghost'"
                    :throttle="false"
                    :disabled="disabled"
                    class="bing-table__pin-button bing-table__pin-button--right"
                    :class="{ 'is-active': getColumnFixed(column) === 'right' }"
                    :aria-pressed="getColumnFixed(column) === 'right'"
                    aria-label="固定到右侧"
                    @click="setColumnFixed(column.key, getColumnFixed(column) === 'right' ? null : 'right')"
                  >
                    <template #prefix>
                      <BingIcon :icon="Pin" size="xs" :stroke-width="1.75" />
                    </template>
                  </BingButton>
                </div>
              </div>
            </template>
          </BingSortableList>
        </BingScrollbar>
      </div>
    </BingDropDown>
  </div>
</template>

<style scoped>
.bing-table__column-controls {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.bing-table__icon-button,
.bing-table__text-button {
  color: inherit;
  font: inherit;
}

.bing-table__icon-button {
  display: inline-grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
  transition:
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-table__icon-button:hover,
.bing-table__icon-button.is-active {
  border-color: rgb(var(--bing-accent-rgb) / 0.48);
  background: var(--bing-accent-soft);
  color: var(--bing-accent-strong);
}

.bing-table__icon-button:focus-visible,
.bing-table__column-grip:focus-visible,
.bing-table__text-button:focus-visible {
  outline: 2px solid var(--bing-table-focus-ring, var(--bing-focus-ring));
  outline-offset: -2px;
}

.bing-table__column-dropdown {
  display: inline-flex;
}

:global(.bing-dropdown__panel.bing-table__column-panel-shell) {
  overflow: hidden;
}

.bing-table__column-panel {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

:global(.bing-table__column-panel-shell .bing-dropdown__header) {
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.bing-table__column-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--bing-heading);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}

.bing-table__text-button {
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: var(--bing-heading);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.bing-table__column-list-scroll {
  max-height: 330px;
}

.bing-table__column-list {
  display: grid;
  gap: 5px;
  padding: 0;
}

.bing-table__column-panel :deep(.bing-sortable-list__item.is-dragging) {
  border-radius: 6px;
  outline: 1px dashed rgb(var(--bing-slate-rgb) / 0.4);
  outline-offset: -1px;
  background: var(--bing-slate-soft);
  opacity: 0.3;
}

.bing-table__column-option {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 8px;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-table__column-option:hover {
  border-color: rgb(var(--bing-accent-rgb) / 0.22);
  background: var(--bing-surface-hover);
}

.bing-table__column-option.is-hidden {
  opacity: 0.62;
}

.bing-table__column-panel.is-reordering,
.bing-table__column-panel.is-reordering * {
  cursor: grabbing !important;
}

.bing-table__column-panel.is-reordering .bing-table__column-option * {
  pointer-events: none;
}

.bing-table__column-grip {
  display: inline-grid;
  width: 18px;
  height: 24px;
  place-items: center;
  color: var(--bing-muted);
  cursor: grab;
}

.bing-table__column-check {
  flex: 0 0 auto;
}

.bing-table__column-meta {
  display: grid;
  min-width: 0;
  gap: 3px;
  padding-block: 1px;
}

.bing-table__column-name {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-heading);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-table__column-desc {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-table__pin-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.bing-table__pin-button.bing-button {
  --button-color: var(--bing-muted);
}

.bing-table__pin-button.bing-button.is-active {
  --button-bg: var(--bing-slate-soft);
  --button-border: rgb(var(--bing-slate-rgb) / 0.28);
  --button-color: var(--bing-slate-strong);
}

.bing-table__pin-button--left :deep(svg) {
  transform: rotate(-45deg);
  transform-origin: 50% 50%;
}

.bing-table__pin-button--right :deep(svg) {
  transform: rotate(45deg);
  transform-origin: 50% 50%;
}

.bing-table__icon-button.bing-button {
  --button-height: 32px;
  --button-icon-size: 16px;
  min-height: 32px;
  width: var(--button-height);
  padding: 0;
}

.bing-table__text-button.bing-button {
  --button-height: 28px;
  min-height: var(--button-height);
  line-height: 18px;
}
</style>
