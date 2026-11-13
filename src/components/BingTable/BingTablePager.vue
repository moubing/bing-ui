<script setup lang="ts">
import { ref, type CSSProperties } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import type { BingSelectModelValue, BingSelectOption } from '../BingSelect/BingSelect.types'
import type { BingTablePagerSnapshot } from './BingTable.internal'

defineProps<{
  pagination: boolean
  isBusy: boolean
  initialLoading?: boolean
  isPaginationLayoutFloating: boolean
  paginationMotionStyle?: CSSProperties
  pageRangeText: string
  effectivePage: number
  effectivePageSize: number
  pageCount: number
  displayedPagerSnapshot: BingTablePagerSnapshot
  pageSizeSelectOptions: BingSelectOption[]
}>()
const emit = defineEmits<{
  page: [page: number]
  'page-size': [value: BingSelectModelValue]
}>()
const element = ref<HTMLElement | null>(null)
defineExpose({ element })
</script>

<template>
  <footer
    ref="element"
    class="bing-table__pagination"
    :class="{ 'is-layout-floating': isPaginationLayoutFloating }"
    :style="paginationMotionStyle"
  >
    <slot name="column-controls" />

    <span v-if="pagination" class="bing-table__page-summary"><span v-if="initialLoading" class="bing-table__summary-skeleton" aria-hidden="true" /><template v-else>{{ pageRangeText }}</template></span>

    <label v-if="pagination" class="bing-table__page-size">
      <span>每页条数</span>
      <BingSelect
        class="bing-table__page-size-select"
        :model-value="effectivePageSize"
        :options="pageSizeSelectOptions"
        :clearable="false"
        :show-select-all="false"
        :searchable="false"
        :width="88"
        :min-width="0"
        :disabled="isBusy"
        size="sm"
        aria-label="每页条数"
        @update:model-value="emit('page-size', $event)"
      />
    </label>

    <TransitionGroup
      v-if="pagination"
      name="bing-table-page"
      tag="div"
      class="bing-table__pager"
      aria-label="分页"
    >
      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        key="first"
        class="bing-table__page-button bing-table__page-boundary"
        :disabled="isBusy || displayedPagerSnapshot.page <= 1"
        aria-label="首页"
        @click="emit('page', 1)"
      >
        <template #prefix>
          <BingIcon :icon="ChevronsLeft" size="xs" :stroke-width="1.75" />
        </template>
      </BingButton>
      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        key="previous"
        class="bing-table__page-button"
        :disabled="isBusy || displayedPagerSnapshot.page <= 1"
        aria-label="上一页"
        @click="emit('page', effectivePage - 1)"
      >
        <template #prefix>
          <BingIcon :icon="ChevronLeft" size="xs" :stroke-width="1.75" />
        </template>
      </BingButton>
      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        v-for="pageNumber in displayedPagerSnapshot.pageNumbers"
        :key="`page-${pageNumber}`"
        class="bing-table__page-button"
        :class="{ 'is-active': pageNumber === displayedPagerSnapshot.page }"
        :aria-current="pageNumber === displayedPagerSnapshot.page ? 'page' : undefined"
        :disabled="isBusy"
        @click="emit('page', pageNumber)"
      >
        {{ pageNumber }}
      </BingButton>
      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        key="next"
        class="bing-table__page-button"
        :disabled="isBusy || displayedPagerSnapshot.page >= displayedPagerSnapshot.pageCount"
        aria-label="下一页"
        @click="emit('page', effectivePage + 1)"
      >
        <template #prefix>
          <BingIcon :icon="ChevronRight" size="xs" :stroke-width="1.75" />
        </template>
      </BingButton>
      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        key="last"
        class="bing-table__page-button bing-table__page-boundary"
        :disabled="isBusy || displayedPagerSnapshot.page >= displayedPagerSnapshot.pageCount"
        aria-label="末页"
        @click="emit('page', pageCount)"
      >
        <template #prefix>
          <BingIcon :icon="ChevronsRight" size="xs" :stroke-width="1.75" />
        </template>
      </BingButton>
    </TransitionGroup>
  </footer>
</template>

<style scoped>
.bing-table__page-button {
  color: inherit;
  font: inherit;
}

.bing-table__page-button:focus-visible {
  outline: 2px solid var(--_table-focus-ring);
  outline-offset: -2px;
}

.bing-table__pagination {
  container-type: inline-size;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 10px var(--_table-cell-padding-x);
  border-top: 1px solid var(--_table-line);
  border-radius: 0 0 var(--_table-radius) var(--_table-radius);
  color: var(--bing-muted);
  font-size: 13px;
  font-weight: 400;
}

.bing-table__pagination.is-layout-floating {
  z-index: 20;
  pointer-events: none;
  will-change: transform;
}

.bing-table__page-summary {
  margin-right: auto;
}

.bing-table__page-size {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.bing-table__page-size-select {
  --bing-control-height-sm: 32px;
  width: 88px;
}

.bing-table__page-size-select :deep(.bing-select__control) {
  min-height: 32px;
  border-color: var(--_table-line);
  border-radius: 6px;
  box-shadow: none;
}

.bing-table__page-size-select :deep(.bing-select__control:focus-within) {
  border-color: var(--bing-control-hover-border);
  box-shadow: 0 0 0 2px var(--_table-focus-ring);
}

.bing-table__page-size-select :deep(.bing-select__trigger) {
  font-size: 13px;
}

.bing-table__pager {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.bing-table__page-button {
  flex: 0 0 auto;
  display: inline-grid;
  min-width: 32px;
  height: 32px;
  place-items: center;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--bing-control-bg);
  color: var(--bing-heading);
  cursor: pointer;
  font-size: 13px;
  font-weight: 400;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-table__page-button:hover:not(:disabled) {
  border-color: rgb(var(--bing-accent-rgb) / 0.42);
  background: var(--bing-accent-soft);
  color: var(--bing-accent-strong);
  box-shadow: none;
}

.bing-table__page-button.is-active { background: var(--bing-accent); color: var(--bing-surface-solid); border-color: transparent; }
.bing-table__page-button.is-active:focus-visible { outline-color: var(--bing-surface-solid); }
.bing-table__summary-skeleton { display: inline-block; width: 144px; height: 12px; border-radius: 4px; background: var(--bing-surface-muted); }
@container (max-width: 540px) {
  .bing-table__page-boundary { display: none; }
  .bing-table__page-size > span { display: none; }
}
@media (forced-colors: active) {
  .bing-table__page-button:focus-visible, .bing-table__page-button.is-active:focus-visible { outline-color: Highlight; }
  .bing-table__page-size-select :deep(.bing-select__control:focus-within) { outline: 2px solid Highlight; outline-offset: -2px; }
  .bing-table__page-button.is-active { background: SelectedItem; color: SelectedItemText; forced-color-adjust: none; }
}
.bing-table__page-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.bing-table-page-move,
.bing-table-page-enter-active {
  transition:
    opacity var(--bing-duration-normal) var(--bing-ease-smooth),
    transform var(--bing-duration-normal) var(--bing-ease-smooth);
}

.bing-table-page-leave-active {
  transition: opacity 220ms var(--bing-ease-smooth);
}

.bing-table.is-page-size-transitioning .bing-table-page-move,
.bing-table.is-page-size-transitioning .bing-table-page-enter-active {
  transition:
    opacity 120ms var(--bing-ease-smooth) 120ms,
    transform 120ms var(--bing-ease-smooth) 120ms;
}

.bing-table.is-page-size-transitioning .bing-table-page-leave-active {
  transition: opacity 220ms var(--bing-ease-smooth);
}

.bing-table-page-enter-from {
  opacity: 0;
  transform: translateY(4px) scale(0.88);
}

.bing-table-page-leave-from,
.bing-table-page-leave-to {
  transform: none !important;
}

.bing-table-page-leave-to {
  opacity: 0;
}

.bing-table-page-leave-active {
  position: absolute;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .bing-table-page-move,
  .bing-table-page-enter-active,
  .bing-table-page-leave-active {
    transition: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-table,
  .bing-table *,
  .bing-table *::before {
    animation: none !important;
    transition: none !important;
  }
}

.bing-table__page-button.bing-button {
  --button-height: 32px;
  --button-icon-size: 14px;
  min-height: 32px;
}
</style>
