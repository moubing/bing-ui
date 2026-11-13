<script setup lang="ts">
import { computed, useId } from 'vue'
import { ArrowUp, ArrowUpDown, CircleHelp, GripVertical } from '../../icons'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingButton from '../BingButton/BingButton.vue'
import BingTooltip from '../BingTooltip/BingTooltip.vue'
import type { BingTableColumn, BingTableSortOrder } from './BingTable.types'
import { getSortDirections } from './BingTable.utils'

const props = defineProps<{
  column: BingTableColumn
  reorderable?: boolean
  resizable?: boolean
  sortOrder?: BingTableSortOrder
  preview?: boolean
  disabled?: boolean
  width?: number
  maximumWidth?: number
}>()

const emit = defineEmits<{
  sort: []
  resizeStart: [event: PointerEvent]
  resizeKeydown: [event: KeyboardEvent]
  autoFit: []
}>()

const sortDescriptionId = `bing-table-sort-${useId()}`
const sortDescription = computed(() => {
  const directions = getSortDirections(props.column)
  const order = props.sortOrder ?? null
  const next = directions[(directions.indexOf(order) + 1) % directions.length]
  const label = (value: BingTableSortOrder | undefined) => value === 'asc' ? '升序' : value === 'desc' ? '降序' : '未排序'
  return `${props.column.title || props.column.key}，当前${label(order)}，激活后${next ? `改为${label(next)}` : '取消排序'}`
})

const sortIcon = computed(() =>
  props.sortOrder ? ArrowUp : ArrowUpDown,
)
</script>

<template>
  <div class="bing-table__header-content" :class="{ 'is-sorting': sortOrder, 'is-disabled': disabled }">
    <button v-if="reorderable && !preview" type="button" class="bing-table__drag-mark"
      :aria-label="`移动列 ${column.title || column.key}，按 Ctrl 或 Command 加 Shift 加左右方向键`">
      <BingIcon :icon="GripVertical" size="xs" :stroke-width="1.75" />
    </button>

    <span v-if="column.sortable && preview" class="bing-table__sort-button">
      <span class="bing-table__header-label">
        <slot :column="column">{{ column.title || column.key }}</slot>
      </span>
      <BingIcon :icon="sortIcon" class="bing-table__sort-icon" :class="{ 'is-descending': sortOrder === 'desc' }" size="xs" :stroke-width="1.75" />
    </span>
    <BingButton
      v-else-if="column.sortable"
      variant="ghost"
      size="xs"
      :throttle="false"
      class="bing-table__sort-button"
      :disabled="disabled"
      :aria-describedby="sortDescriptionId"
      @click="emit('sort')"
    >
      <span class="bing-table__header-label">
        <slot :column="column">{{ column.title || column.key }}</slot>
      </span>
      <template #suffix>
        <BingIcon :icon="sortIcon" class="bing-table__sort-icon" :class="{ 'is-descending': sortOrder === 'desc' }" size="xs" :stroke-width="1.75" />
      </template>
    </BingButton>
    <span v-else class="bing-table__header-label">
      <slot :column="column">{{ column.title || column.key }}</slot>
    </span>
    <span v-if="column.sortable && !preview" :id="sortDescriptionId" class="bing-table__sr-only">{{ sortDescription }}</span>

    <span v-if="column.description && preview" class="bing-table__header-help">
      <BingIcon :icon="CircleHelp" size="xs" :stroke-width="1.75" />
    </span>
    <BingTooltip
      v-else-if="column.description"
      :content="column.description"
      trigger="click"
      placement="top"
      align="center"
      :open-delay="0"
      :close-delay="80"
      :max-width="260"
      :aria-label="`列说明： ${column.title || column.key}`"
    >
      <BingButton
        variant="ghost"
        size="xs"
        rounded="full"
        :throttle="false"
        class="bing-table__header-help"
        :aria-label="`查看列说明： ${column.title || column.key}`"
        data-bing-table-dnd-ignore
      >
        <template #prefix>
          <BingIcon :icon="CircleHelp" size="xs" :stroke-width="1.75" />
        </template>
      </BingButton>
    </BingTooltip>

    <button
      v-if="resizable && !preview"
      type="button"
      class="bing-table__resize-handle"
      :aria-label="`调整列宽： ${column.title || column.key}`"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="width"
      :aria-valuemin="Math.max(48, column.minWidth ?? 96)"
      :aria-valuemax="maximumWidth"
      :aria-valuetext="`${width ?? 0}px`"
      :data-width="`${width ?? 0}px`"
      data-bing-table-dnd-ignore
      @pointerdown="emit('resizeStart', $event)"
      @keydown="emit('resizeKeydown', $event)"
      @dblclick.stop="emit('autoFit')"
    ></button>
  </div>
</template>

<style scoped>
.bing-table__header-content {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  min-width: 0;
  min-height: calc(var(--_table-head-height) - 1px);
  gap: 10px;
  padding: var(--_table-cell-padding-y) var(--_table-cell-padding-x);
}

.bing-table__drag-mark {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
  position: absolute;
  top: 50%;
  inset-inline-start: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 24px;
  color: var(--bing-muted);
  opacity: 0;
  pointer-events: auto;
  transform: translateY(-50%);
  transition: opacity 140ms ease;
}

.bing-table__drag-mark:focus-visible { opacity: 1; outline: 2px solid var(--_table-focus-ring); outline-offset: -2px; border-radius: 3px; }
.bing-table__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

:global(.bing-table__header-cell:hover) .bing-table__drag-mark,
:global(.bing-table__header-cell.is-dnd-dragging) .bing-table__drag-mark {
  opacity: 0.72;
}

.bing-table__header-label {
  display: inline-block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-kerning: auto;
  font-variant-ligatures: normal;
  text-rendering: auto;
}

/* 排序按钮与不可交互的拖拽预览共用字距、行高和图标间距。 */
.bing-table__sort-button :deep(.bing-button__label) {
  padding-block: 0;
  margin-block: 0;
  line-height: inherit;
}

.bing-table__sort-button :deep(.bing-button__resting-content) {
  gap: 6px;
}

.bing-table__sort-button :deep(.bing-animated-text__content) {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.bing-table__sort-button {
  /* 留出悬停背景，同时用外边距补偿，让文字继续与单元格内容对齐。 */
  --button-height: 28px;
  --button-icon-size: 14px;
  box-sizing: border-box;
  min-height: var(--button-height);
  display: inline-flex;
  align-items: center;
  justify-content: inherit;
  min-width: 0;
  flex-shrink: 1;
  gap: 6px;
  padding: 4px 8px;
  margin: -4px -8px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.bing-table__sort-button :deep(.bing-icon) {
  flex: 0 0 auto;
  color: var(--bing-muted);
}

.is-sorting .bing-table__sort-button :deep(.bing-icon) {
  color: var(--bing-heading);
}

.bing-table__header-help {
  --button-height: 18px;
  --button-icon-size: 14px;
  min-height: 18px;
  display: inline-grid;
  flex: 0 0 auto;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
  font: inherit;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-table__header-help:hover,
.bing-tooltip.is-open .bing-table__header-help {
  border-color: rgb(var(--bing-secondary-rgb) / 0.32);
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-table__sort-button:focus-visible,
.bing-table__header-help:focus-visible {
  outline: 2px solid var(--_table-focus-ring);
  outline-offset: -2px;
}

.bing-table__resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 8;
  width: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
}

.bing-table__resize-handle::before {
  position: absolute;
  top: 18%;
  bottom: 18%;
  right: 0;
  width: 2px;
  border-radius: 999px;
  background: var(--_table-line-strong);
  content: '';
  opacity: 0;
  transform: scaleY(0.6);
  transition:
    opacity var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth),
    background var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-table__resize-handle:hover::before,
:global(.bing-table__header-cell.is-resizing) .bing-table__resize-handle::before {
  background: var(--bing-accent-strong);
  opacity: 1;
  transform: scaleY(1);
}
.bing-table__header-content.is-disabled { opacity: 0.48; }
.bing-table__sort-button:disabled { opacity: 1; color: inherit; }
.bing-table__sort-icon { transition: transform var(--bing-duration-fast) var(--bing-ease-smooth); }
.bing-table__sort-icon.is-descending { transform: rotate(180deg); }
.bing-table__resize-handle:focus-visible { outline: none; }
.bing-table__resize-handle:focus-visible::before { top: 0; bottom: 0; right: 1px; width: 3px; background: var(--_table-focus-ring); opacity: 1; transform: none; }
.bing-table__resize-handle:focus-visible::after {
  content: attr(data-width); position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  padding: 2px 6px; border-radius: 4px; background: var(--bing-heading); color: var(--bing-surface-solid);
  font-size: 11px; line-height: 18px; font-family: inherit; white-space: nowrap; pointer-events: none;
}
@media (forced-colors: active) {
  .bing-table__drag-mark:focus-visible, .bing-table__sort-button:focus-visible, .bing-table__header-help:focus-visible { outline-color: Highlight; }
  .bing-table__resize-handle:focus-visible::before { background: Highlight; forced-color-adjust: none; }
}
@media (prefers-reduced-motion: reduce) { .bing-table__sort-icon { transition: none; } }
</style>
