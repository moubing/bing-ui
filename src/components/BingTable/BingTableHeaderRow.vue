<script setup lang="ts">
import { inject } from 'vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingTableHeaderCell from './BingTableHeaderCell.vue'
import BingTableHeaderContent from './BingTableHeaderContent.vue'
import type { BingTableSortOrder } from './BingTable.types'
import type { CSSProperties } from 'vue'
import type { BingTableColumn } from './BingTable.types'
import type { BingTableColumnClasses } from './BingTable.internal'
import { tableKeyboardKey } from './composables/useTableKeyboard'
const vTableCell = inject(tableKeyboardKey)?.cellDirective ?? {}

defineProps<{
  selectable: boolean
  selectionMode: 'multiple' | 'single'
  shouldFixSelectionColumn: boolean
  allVisibleRowsSelected: boolean
  someVisibleRowsSelected: boolean
  reorderableColumns: boolean
  visibleColumns: BingTableColumn[]
  effectiveSortKey: string | null
  effectiveSortOrder: BingTableSortOrder
  getSelectionCellStyle: () => CSSProperties
  getColumnClasses: (column: BingTableColumn, header?: boolean) => BingTableColumnClasses
  getColumnCellStyle: (column: BingTableColumn, header?: boolean) => CSSProperties
  canResizeColumn: (column: BingTableColumn) => boolean
  getColumnPixelWidth: (column: BingTableColumn) => number
  getColumnMaximumWidth: (column: BingTableColumn) => number
  disabled?: boolean
  selectionDisabled?: boolean
}>()
const emit = defineEmits<{
  'select-all': [selected: boolean]
  sort: [column: BingTableColumn]
  'resize-start': [column: BingTableColumn, event: PointerEvent]
  'resize-keydown': [column: BingTableColumn, event: KeyboardEvent]
  'auto-fit': [key: string]
}>()
</script>

<template>
  <thead class="bing-table__head" :class="{ 'is-disabled': disabled }">
    <tr aria-rowindex="1">
      <th
        v-if="selectable"
        class="bing-table__selection-cell bing-table__selection-cell--head"
        :class="{ 'is-fixed-left': shouldFixSelectionColumn }"
        :style="getSelectionCellStyle()"
        scope="col"
      >
        <div v-table-cell="{ rowKey: null, columnKey: null }" class="bing-table__selection-heading">
        <BingCheckbox
          v-if="selectionMode === 'multiple'"
          size="sm"
          :model-value="allVisibleRowsSelected"
          :indeterminate="someVisibleRowsSelected"
          :disabled="disabled || selectionDisabled"
          aria-label="选择当前页的所有行"
          @change="emit('select-all', $event)"
        />
        </div>
      </th>

      <component
        :is="reorderableColumns ? BingTableHeaderCell : 'th'"
        v-for="(column, columnIndex) in visibleColumns"
        :key="column.key"
        v-bind="reorderableColumns ? { columnKey: column.key, index: columnIndex } : {}"
        :data-bing-table-sortable-key="column.key"
        :data-column-key="column.key"
        :aria-sort="column.sortable ? (effectiveSortKey === column.key && effectiveSortOrder ? (effectiveSortOrder === 'asc' ? 'ascending' : 'descending') : 'none') : undefined"
        class="bing-table__header-cell"
        :class="getColumnClasses(column, true)"
        :style="getColumnCellStyle(column, true)"
        scope="col"
      >
        <BingTableHeaderContent
          v-table-cell="{ rowKey: null, columnKey: column.key }"
          :column="column"
          :reorderable="reorderableColumns"
          :resizable="canResizeColumn(column)"
          :disabled="disabled"
          :width="getColumnPixelWidth(column)"
          :maximum-width="getColumnMaximumWidth(column)"
          :sort-order="effectiveSortKey === column.key ? effectiveSortOrder : null"
          @sort="emit('sort', column)"
          @resize-start="emit('resize-start', column, $event)"
          @resize-keydown="emit('resize-keydown', column, $event)"
          @auto-fit="emit('auto-fit', column.key)"
        >
          <slot :name="`header-${column.key}`" :column="column">
            {{ column.title || column.key }}
          </slot>
        </BingTableHeaderContent>
      </component>

    </tr>
  </thead>
</template>

<style scoped src="./BingTable.cells.css"></style>
<style scoped>
.bing-table__head.is-disabled .bing-table__selection-heading { opacity: 0.48; }
.bing-table__selection-heading { display: flex; align-items: center; justify-content: center; min-height: calc(var(--_table-head-height) - 1px); }
.bing-table__head {
  position: sticky;
  top: 0;
  z-index: var(--bing-table-head-z);
}

@media (prefers-reduced-motion: reduce) {
  .bing-table,
  .bing-table *,
  .bing-table *::before {
    animation: none !important;
    transition: none !important;
  }
}
</style>
