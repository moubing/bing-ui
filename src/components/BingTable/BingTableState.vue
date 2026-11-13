<script setup lang="ts">
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import { AlertTriangle, FileSpreadsheet } from '../../icons'
defineProps<{
  colspan: number
  busy: boolean
  skeleton: boolean
  error: boolean | string
  emptyText: string
  selectable?: boolean
}>()
const emit = defineEmits<{ retry: [] }>()
const retry = () => emit('retry')
</script>

<template>
  <tbody class="bing-table__body">
    <template v-if="skeleton">
      <tr v-for="row in 5" :key="row" class="bing-table__skeleton-row" aria-hidden="true">
        <td v-for="column in colspan" :key="column">
          <span class="bing-table__skeleton" :class="{ 'is-checkbox': selectable && column === 1 }"
            :style="{ width: selectable && column === 1 ? '16px' : `${45 + ((column * 13 + row * 7) % 41)}%` }" />
        </td>
      </tr>
    </template>
    <tr v-else>
      <td class="bing-table__state-cell" :colspan="colspan">
        <slot v-if="error" name="error" :error="error" :retry="retry">
          <div class="bing-table__state bing-table__error">
            <BingIcon class="bing-table__state-icon is-danger" :icon="AlertTriangle" :size="24" />
            <strong class="bing-table__state-title">数据加载失败</strong>
            <p class="bing-table__state-description">{{ typeof error === 'string' ? error : '请检查网络连接后重试。' }}</p>
            <div class="bing-table__state-actions"><BingButton size="sm" variant="secondary" :disabled="busy" @click="retry">重试</BingButton></div>
          </div>
        </slot>
        <slot v-else-if="!busy" name="empty">
          <div class="bing-table__state">
            <BingIcon class="bing-table__state-icon" :icon="FileSpreadsheet" :size="24" />
            <strong class="bing-table__state-title">{{ emptyText }}</strong>
            <p class="bing-table__state-description">数据加载后将显示在这里。</p>
          </div>
        </slot>
      </td>
    </tr>
  </tbody>
</template>

<style scoped>
.bing-table__state-cell { box-sizing: border-box; height: 200px; padding: 28px; color: var(--bing-muted); font-weight: 400; text-align: center; }
.bing-table__state { display: grid; justify-items: center; gap: 8px; }
.bing-table__state-icon { margin-bottom: 4px; color: var(--bing-muted); }
.bing-table__state-icon.is-danger { color: var(--bing-danger-strong); }
.bing-table__state-title { color: var(--bing-heading); font-size: 14px; font-weight: 500; }
.bing-table__state-description { margin: 0; font-size: 13px; }
.bing-table__state-actions { margin-top: 8px; }
.bing-table__state-actions :deep(button:focus-visible) { outline: 2px solid var(--_table-focus-ring); outline-offset: -2px; }
.bing-table__skeleton-row td { height: var(--_table-row-height); padding: 0 var(--_table-cell-padding-x); border-bottom: 1px solid var(--_table-line); }
.bing-table__skeleton { position: relative; display: block; height: 12px; overflow: hidden; border-radius: 4px; background: var(--bing-surface-muted); }
.bing-table__skeleton.is-checkbox { margin: auto; height: 16px; }
.bing-table__skeleton::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgb(var(--bing-heading-rgb) / 0.06), transparent); animation: bing-table-shimmer 1.6s ease-in-out infinite; }
@keyframes bing-table-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .bing-table__skeleton::after { animation: none; } }
@media (forced-colors: active) { .bing-table__state-actions :deep(button:focus-visible) { outline-color: Highlight; } }
</style>
