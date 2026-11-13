<script setup lang="ts">
import { computed, inject, ref, type CSSProperties } from 'vue'
import { ChevronRight } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingTableCellValue from './BingTableCellValue.vue'
import { formatCellValue, getCellValue } from './BingTable.utils'
import type { BingTableColumnClasses, BingTableFlatRow } from './BingTable.internal'
import type { BingTableColumn, BingTableRowClass } from './BingTable.types'
import { tableKeyboardKey } from './composables/useTableKeyboard'
const vTableCell = inject(tableKeyboardKey)?.cellDirective ?? {}
const rangeSelection = ref(false)

const props = defineProps<{
  item?: BingTableFlatRow
  fillerStriped?: boolean
  selected?: boolean
  indeterminate?: boolean
  active?: boolean
  tree?: boolean
  treeGuides?: boolean
  keyboardNavigation?: boolean
  rowClass?: BingTableRowClass
  selectable: boolean
  shouldFixSelectionColumn: boolean
  visibleColumns: BingTableColumn[]
  normalizedIndentSize: number
  isBusy: boolean
  isTreeCell: (column: BingTableColumn) => boolean
  getSelectionCellStyle: () => CSSProperties
  getColumnClasses: (column: BingTableColumn, header?: boolean) => BingTableColumnClasses
  getColumnCellStyle: (column: BingTableColumn, header?: boolean) => CSSProperties
}>()
const emit = defineEmits<{
  'row-click': [event: MouseEvent]
  select: [selected: boolean, range: boolean]
  expand: []
}>()
const rowClasses = computed(() => {
  const item = props.item
  if (!item) return undefined
  const customClass = typeof props.rowClass === 'function'
    ? props.rowClass(item.row, item.index)
    : props.rowClass
  return [customClass, {
    'is-striped-row': item.index % 2 === 1,
    'is-selected': props.selected,
    'is-active': props.active,
    'is-disabled': item.disabled,
    'is-expanded': item.expanded,
    'has-children': item.hasChildren,
  }]
})
</script>

<template>
  <tr
    v-if="item"
    class="bing-table__row"
    :class="rowClasses"
    :aria-selected="selectable ? selected : undefined"
    :aria-current="active ? 'true' : undefined"
    :aria-rowindex="item.rowIndex"
    :aria-level="tree ? item.level + 1 : undefined"
    :aria-expanded="tree && item.hasChildren ? item.expanded : undefined"
    :aria-setsize="tree ? item.setSize : undefined"
    :aria-posinset="tree ? item.posInSet : undefined"
    :data-row-index="item.index"
    @click="emit('row-click', $event)"
  >
    <td
      v-if="selectable"
      v-table-cell="{ rowKey: item.key, columnKey: null }"
      :role="keyboardNavigation ? 'gridcell' : undefined"
      class="bing-table__selection-cell"
      :class="{ 'is-fixed-left': shouldFixSelectionColumn }"
      :style="getSelectionCellStyle()"
    >
      <span class="bing-table__selection-wrap" @click.capture="rangeSelection = $event.shiftKey" @click.stop>
        <BingCheckbox
          size="sm"
          :model-value="selected"
          :indeterminate="indeterminate"
          :disabled="item.disabled"
          :aria-label="`选择行 ${item.key}`"
          @change="emit('select', $event, rangeSelection)"
        />
      </span>
    </td>

    <td
      v-for="column in visibleColumns"
      :key="column.key"
      v-table-cell="{ rowKey: item.key, columnKey: column.key }"
      :role="keyboardNavigation ? 'gridcell' : undefined"
      :data-column-key="column.key"
      class="bing-table__cell"
      :class="getColumnClasses(column)"
      :style="getColumnCellStyle(column)"
    >
      <div
        class="bing-table__cell-content"
        :class="{ 'is-tree-cell': isTreeCell(column) }"
        :style="
          isTreeCell(column)
            ? {
                paddingLeft: `calc(var(--_table-cell-padding-x) + ${
                  item.level * normalizedIndentSize
                }px)`,
              }
            : undefined
        "
      >
        <span v-if="treeGuides && isTreeCell(column) && item.level > 0" class="bing-table__tree-guides" aria-hidden="true"
          :style="{ width: item.level * normalizedIndentSize + 'px', '--tree-indent': normalizedIndentSize + 'px' }" />
        <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
          v-if="isTreeCell(column) && item.hasChildren"
          class="bing-table__expander"
          :aria-expanded="item.expanded"
          :aria-label="item.expanded ? '收起行' : '展开行'"
          @click.stop="emit('expand')"
        >
          <template #prefix>
            <BingIcon
              :icon="ChevronRight"
              :class="{ 'is-expanded': item.expanded }"
              size="xs"
              :stroke-width="1.75"
            />
          </template>
        </BingButton>
        <span
          v-else-if="isTreeCell(column)"
          class="bing-table__expander-spacer"
          aria-hidden="true"
        ></span>

        <BingTableCellValue :ellipsis="column.ellipsis !== false" :disabled="isBusy">
          <slot
            :name="`cell-${column.key}`"
            :row="item.row"
            :column="column"
            :value="getCellValue(item.row, column)"
            :row-index="item.index"
            :level="item.level"
          >
            <slot
              name="cell"
              :row="item.row"
              :column="column"
              :value="getCellValue(item.row, column)"
              :row-index="item.index"
              :level="item.level"
            >
              {{ formatCellValue(getCellValue(item.row, column)) }}
            </slot>
          </slot>
        </BingTableCellValue>
      </div>
    </td>

  </tr>

  <tr
    v-else
    class="bing-table__row bing-table__row--filler"
    :class="{ 'is-striped-row': fillerStriped }"
    aria-hidden="true"
  >
    <td
      v-if="selectable"
      class="bing-table__selection-cell"
      :class="{ 'is-fixed-left': shouldFixSelectionColumn }"
      :style="getSelectionCellStyle()"
    >
      <span class="bing-table__selection-placeholder"></span>
    </td>

    <td
      v-for="column in visibleColumns"
      :key="column.key"
      class="bing-table__cell"
      :class="getColumnClasses(column)"
      :style="getColumnCellStyle(column)"
    >
      <div class="bing-table__cell-content" aria-hidden="true"></div>
    </td>

  </tr>
</template>

<style scoped src="./BingTable.cells.css"></style>
<style scoped>
.bing-table__expander {
  color: inherit;
  font: inherit;
}

.bing-table__expander:focus-visible {
  outline: 2px solid var(--_table-focus-ring);
  outline-offset: -2px;
}

.bing-table.is-page-size-transitioning .bing-table__row,
.bing-table.is-page-size-transitioning .bing-table__cell,
.bing-table.is-page-size-transitioning .bing-table__selection-cell {
  transition: none;
}

.bing-table__selection-wrap {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 状态优先级集中于此：disabled > active > selected > hover > striped > base。 */
.bing-table__row { --bing-table-current-row-bg: var(--bing-table-row-bg); }
:where(.bing-table.is-striped) .bing-table__row.is-striped-row { --bing-table-current-row-bg: var(--bing-table-row-striped-bg); }
.bing-table .bing-table__row:not(.is-disabled):not(.is-active):not(.is-selected):hover { --bing-table-current-row-bg: var(--_table-row-hover-bg); }
.bing-table .bing-table__row.is-selected { --bing-table-current-row-bg: var(--_table-row-selected-bg); }
.bing-table .bing-table__row.is-active { --bing-table-current-row-bg: var(--_table-row-active-bg); }
.bing-table__row.is-active:not(.is-disabled) > td:first-child::before {
  content: ''; position: absolute; left: 2px; top: 8px; bottom: 8px; width: 2px;
  border-radius: 999px; background: var(--_table-row-active-accent); pointer-events: none; z-index: 2;
}
.bing-table .bing-table__row.is-disabled { --bing-table-current-row-bg: var(--bing-control-disabled-bg); cursor: not-allowed; }
.bing-table__row.is-disabled > td { color: var(--bing-disabled-text); }
.bing-table__row.is-disabled .bing-table__selection-wrap :deep(.bing-checkbox.is-disabled) { opacity: 1; }
.bing-table__row--filler { pointer-events: none; }
.bing-table__row--filler .bing-table__cell-content { color: transparent; }
.bing-table__selection-placeholder { display: inline-flex; width: 24px; height: 24px; }
.bing-table__tree-guides {
  position: absolute; left: var(--_table-cell-padding-x); top: 0; bottom: 0; pointer-events: none;
  background: repeating-linear-gradient(to right, transparent 0, transparent 9px, var(--_table-line) 9px, var(--_table-line) 10px, transparent 10px, transparent var(--tree-indent));
}
.bing-table__tree-guides::after { content: ''; position: absolute; right: -10px; top: 50%; width: calc(var(--tree-indent) - 10px); border-top: 1px solid var(--_table-line); }
.bing-table__expander :deep(.bing-icon) {
  /* 旋转前后保留合成层，避免图标重新栅格化时边缘抖动。 */
  will-change: transform;
  transition: transform var(--bing-duration-fast) var(--bing-ease-smooth);
}
.bing-table__expander :deep(.bing-icon.is-expanded) { transform: rotate(90deg); }
@media (forced-colors: active) {
  .bing-table__expander:focus-visible { outline-color: Highlight; }
  .bing-table__row.is-active:not(.is-disabled) > td:first-child::before { background: Highlight; forced-color-adjust: none; }
}

.bing-table__expander,
.bing-table__expander-spacer {
  display: inline-grid;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  place-items: center;
}

.bing-table__expander {
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
  will-change: transform;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-table__expander:hover {
  border-color: rgb(var(--bing-accent-rgb) / 0.3);
  background: var(--bing-accent-soft);
  color: var(--bing-accent-strong);
}

.bing-table__expander:active {
  transform: scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .bing-table__expander,
  .bing-table__expander :deep(.bing-icon) {
    will-change: auto;
  }

  .bing-table,
  .bing-table *,
  .bing-table *::before {
    animation: none !important;
    transition: none !important;
  }
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-table__expander.bing-button {
  --button-height: 20px;
  --button-icon-size: 14px;
  min-height: 20px;
  width: var(--button-height);
  padding: 0;
}
</style>
