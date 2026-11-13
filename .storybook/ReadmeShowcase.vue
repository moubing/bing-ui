<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, CheckCheck, FileCode2, Layers, Plus, Search, Settings2 } from '@lucide/vue'
// 示例按纯文本读取，避免依赖扫描把展示代码中的 import 当成真实依赖。
import exampleCodeSource from './ReadmeShowcase.example.vue.txt?raw'
import {
  BingButton, BingCard, BingCheckboxGroup, BingCodeBlock, BingColorPicker,
  BingDatePicker, BingIcon, BingInput, BingSelect, BingSlider, BingTable,
  BingTabs, BingTag, BingTooltip,
} from '../src/components'
import type {
  BingDatePickerModelValue, BingSelectModelValue, BingTableColumn,
  BingTableKey, BingTabValue,
} from '../src/components'

const query = ref<string | number | null>('')
const projectName = ref<string | number | null>('创意组件工作台')
const members = ref<BingSelectModelValue>(['design', 'frontend'])
const date = ref<BingDatePickerModelValue>('2026-10-24')
const color = ref('#0ea5e9')
const progress = ref(72)
const tab = ref<BingTabValue>('all')
const selected = ref<BingTableKey[]>(['table'])
const cardSide = ref<'front' | 'back'>('front')
const feedback = ref('点击按钮，查看操作反馈')
const interactionModes = ref<Array<string | number>>(['pointer', 'keyboard'])
const logoUrl = '/bing-ui-logo.png'

const tabs = [
  { value: 'all', label: '全部组件' },
  { value: 'ready', label: '已就绪' },
  { value: 'review', label: '待评审' },
]
const memberOptions = [
  { value: 'design', label: '设计', description: '视觉与交互', detail: '维护设计变量、组件外观与交互规范。', meta: { 成员: '林晓', 职责: '设计系统' } },
  { value: 'frontend', label: '前端', description: '组件与工程', detail: '把设计实现为可组合、可复用的 Vue 组件。', meta: { 成员: '周宁', 职责: '组件开发' } },
  { value: 'qa', label: '测试', description: '质量与体验', detail: '检查键盘交互、浏览器行为与组件组合。', meta: { 成员: '许言', 职责: '交互验证' } },
  { value: 'docs', label: '文档', description: '用法与示例', detail: '维护使用指南、API 说明和完整交互示例。', meta: { 成员: '沈川', 职责: '文档维护' } },
]
const presets = [
  { label: '天蓝', value: '#0ea5e9' },
  { label: '翡翠', value: '#10b981' },
  { label: '琥珀', value: '#f59e0b' },
  { label: '玫红', value: '#f43f5e' },
  { label: '紫罗兰', value: '#8b5cf6' },
  { label: '中性灰', value: '#52525b' },
]
const rows = [
  { id: 'button', name: 'Button / 操作反馈', owner: '林晓', status: '已就绪', progress: 100 },
  { id: 'table', name: 'Table / 数据工作台', owner: '周宁', status: '开发中', progress: 72 },
  { id: 'form', name: 'Form / 表单校验', owner: '许言', status: '待评审', progress: 88 },
  { id: 'card', name: 'Card / 内容与翻面', owner: '沈川', status: '已就绪', progress: 100 },
]
const filteredRows = computed(() => rows.filter(row => {
  const matchesQuery = row.name.toLowerCase().includes(String(query.value).toLowerCase())
  const matchesTab = tab.value === 'all' || row.status === (tab.value === 'ready' ? '已就绪' : '待评审')
  return matchesQuery && matchesTab
}))
const columns: BingTableColumn[] = [
  { key: 'name', title: '组件 / 场景', minWidth: 230, sortable: true },
  { key: 'owner', title: '负责人', width: 90 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'progress', title: '完成度', width: 150, sortable: true },
]
const exampleCode = exampleCodeSource.trimEnd()
</script>

<template>
  <main class="readme-overview">
    <header class="overview-heading">
      <div class="overview-brand">
        <img :src="logoUrl" width="44" height="44" alt="" />
        <div>
          <h1>Bing UI <span>组件总览</span></h1>
          <p>在 Storybook 操作组件；安装、API 与升级说明见
            <a href="https://101.35.217.21:6008/docs" target="_blank" rel="noopener noreferrer">使用文档 ↗</a>。
          </p>
        </div>
      </div>
      <BingTag label="真实组件 · 可交互" tone="success" size="sm" variant="soft" />
    </header>

    <div class="overview-grid">
      <section class="specimen specimen--actions" aria-labelledby="actions-title">
        <div class="specimen-heading"><h2 id="actions-title">操作与反馈</h2><span>Button · Tabs · Tag</span></div>
        <div class="button-grid">
          <BingButton @click="feedback = '新建组件操作已触发'"><template #prefix><Plus :size="15" /></template>新建组件</BingButton>
          <BingButton variant="secondary" @click="feedback = '保存操作已触发'"><template #prefix><Check :size="15" /></template>保存更改</BingButton>
          <BingButton variant="tertiary" @click="feedback = '预览操作已触发'">查看预览</BingButton>
          <BingButton variant="danger" @click="feedback = '移除操作已触发'">移除选项</BingButton>
          <BingButton loading>保存中</BingButton>
          <BingButton disabled>暂无权限</BingButton>
        </div>
        <p class="action-feedback" role="status">{{ feedback }}</p>
        <div class="specimen-divider" />
        <BingTabs v-model="tab" :items="tabs" size="sm" aria-label="按组件状态筛选表格" />
        <div class="tag-row">
          <BingTag label="已就绪" tone="success" size="sm" variant="soft" />
          <BingTag label="待评审" tone="warning" size="sm" variant="soft" />
          <BingTag label="Vue 3" tone="secondary" size="sm" variant="soft" />
          <BingTag label="TypeScript" tone="neutral" size="sm" variant="soft" />
        </div>
        <BingCheckboxGroup v-model="interactionModes" :options="[{ value: 'pointer', label: '指针交互' }, { value: 'keyboard', label: '键盘操作' }]" size="sm" aria-label="演示交互方式" />
        <p class="specimen-note">同一套组件，覆盖主次操作、加载与禁用状态。</p>
      </section>

      <section class="specimen specimen--fields" aria-labelledby="fields-title">
        <div class="specimen-heading"><h2 id="fields-title">输入与选择</h2><span>Input · Select · Slider</span></div>
        <div class="field-stack">
          <label class="field"><span>项目名称</span><BingInput id="overview-project" v-model="projectName" block /></label>
          <div class="field"><label for="overview-members">协作角色</label><BingSelect id="overview-members" v-model="members" :options="memberOptions" multiple searchable block search-placeholder="搜索协作角色" /></div>
          <div class="field-pair">
            <div class="field"><label for="overview-date">计划日期</label><BingDatePicker id="overview-date" v-model="date" block :show-shortcuts="false" :min-width="0" /></div>
            <div class="field"><label for="overview-color">标记颜色</label><BingColorPicker id="overview-color" v-model="color" :presets="presets" block :min-width="0" :panel-width="320" /></div>
          </div>
          <div class="field"><label for="overview-progress" class="value-label">完成进度 <span>{{ progress }}%</span></label><BingSlider id="overview-progress" v-model="progress" aria-label="项目完成进度" /></div>
          <p class="specimen-note">打开选择器，体验搜索、多选和选项详情。</p>
        </div>
      </section>

      <section class="specimen specimen--card" aria-labelledby="card-title">
        <div class="specimen-heading"><h2 id="card-title">内容与翻面</h2><span>Card · Icon</span></div>
        <BingCard class="resource-card" title="设计资源库" description="把规范、代码和交互组织在一起。" entrance="none" flip-trigger="click" @flip="cardSide = $event">
          <div class="resource-list">
            <div><BingIcon :icon="Layers" tone="secondary" :size="20" /><span><strong>组件规范</strong><small>尺寸、颜色与语义变量</small></span><Check :size="14" /></div>
            <div><BingIcon :icon="FileCode2" tone="success" :size="20" /><span><strong>完整示例</strong><small>可组合的 Vue 单文件组件</small></span><Check :size="14" /></div>
            <div><BingIcon :icon="Settings2" tone="muted" :size="20" /><span><strong>交互状态</strong><small>焦点、加载与禁用反馈</small></span><Check :size="14" /></div>
          </div>
          <template #footer><BingTag label="已同步" tone="success" variant="soft" size="sm" /><BingButton size="sm" variant="tertiary" @click="feedback = '资源打开操作已触发'">打开资源</BingButton></template>
          <template #back>
            <div class="resource-back">
              <BingIcon :icon="CheckCheck" :size="34" tone="success" />
              <strong>资源已就绪</strong><p>正面承载内容，背面补充详情。</p>
              <dl><div><dt>内容区</dt><dd>默认插槽</dd></div><div><dt>操作区</dt><dd>footer 插槽</dd></div><div><dt>扩展详情</dt><dd>back 插槽</dd></div></dl>
              <span>再次点击卡片，返回资源列表</span>
            </div>
          </template>
        </BingCard>
        <p class="card-state" role="status">{{ cardSide === 'front' ? '正面 · 点击卡片标题查看背面' : '背面 · 再次点击返回正面' }}</p>
      </section>

      <section class="specimen specimen--table" aria-labelledby="table-title">
        <div class="specimen-heading"><h2 id="table-title">数据与协作</h2><span>Table · 行选择 · 排序 · 列设置</span></div>
        <div class="table-toolbar">
          <span>组件开发清单 <small>已选 {{ selected.length }} 项</small></span>
          <BingInput v-model="query" type="search" :icon="Search" placeholder="搜索组件" size="sm" aria-label="搜索组件表格" />
        </div>
        <BingTable v-model:selected-row-keys="selected" :data="filteredRows" :columns="columns" selectable :pagination="false" striped size="sm" :max-height="280" aria-label="组件开发清单">
          <template #cell-status="{ value }"><BingTag :label="String(value)" :tone="value === '已就绪' ? 'success' : value === '待评审' ? 'warning' : 'secondary'" size="sm" variant="soft" /></template>
          <template #cell-progress="{ value }"><div class="progress-cell"><span><i :style="{ width: Number(value) + '%' }" /></span><small>{{ value }}%</small></div></template>
        </BingTable>
        <p class="specimen-note">上方标签与搜索可筛选数据，表头支持排序和列宽调整。</p>
      </section>

      <section class="specimen specimen--code" aria-labelledby="code-title">
        <div class="specimen-heading"><h2 id="code-title">代码与提示</h2><BingTooltip content="代码来自真实 Vue 用法，可直接复制。"><button class="hint-trigger" aria-label="代码示例说明">?</button></BingTooltip></div>
        <BingCodeBlock :code="exampleCode" language="vue" title="快速使用.vue" :max-height="310" wrap />
      </section>
    </div>
  </main>
</template>

<style scoped>
:global(#storybook-root:has(.readme-overview)) { max-width: none; }
.readme-overview { box-sizing: border-box; width: 100%; max-width: 1240px; margin: auto; padding: 24px; color: var(--bing-text); }
.overview-heading, .overview-brand, .specimen-heading, .table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.overview-heading { margin-bottom: 22px; }
.overview-brand { justify-content: flex-start; gap: 12px; }
.overview-brand img { object-fit: contain; }
.overview-brand h1 { margin: 0; font-size: 25px; font-weight: 650; letter-spacing: -.6px; color: var(--bing-heading); }
.overview-brand h1 span { margin-left: 10px; font-size: 17px; font-weight: 450; letter-spacing: 0; color: var(--bing-muted); }
.overview-brand p { margin: 5px 0 0; font-size: 12px; color: var(--bing-muted); }
.overview-grid { display: grid; grid-template-columns: 1fr 1.12fr 1fr; gap: 16px; align-items: stretch; }
.specimen { min-width: 0; padding: 18px; border: 1px solid var(--bing-border); border-radius: 12px; background: var(--bing-surface-solid); }
.specimen-heading { margin-bottom: 18px; align-items: baseline; flex-wrap: wrap; gap: 5px; }
.specimen-heading h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--bing-heading); }
.specimen-heading > span { color: var(--bing-muted); font-size: 11px; }
.button-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.action-feedback { min-height: 18px; margin: 12px 0 0; font-size: 12px; color: var(--bing-muted); }
.specimen-divider { height: 1px; margin: 16px 0; background: var(--bing-border); }
.tag-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 16px 0; }
.specimen-note { margin: 15px 0 0; color: var(--bing-muted); font-size: 11px; line-height: 1.6; }
.field-stack { display: grid; gap: 15px; }
.field { display: grid; min-width: 0; gap: 7px; font-size: 12px; color: var(--bing-heading); }
.field-pair { display: grid; grid-template-columns: 1.15fr 1fr; gap: 12px; }
.value-label { display: flex; justify-content: space-between; }
.value-label span { color: var(--bing-muted); font-variant-numeric: tabular-nums; }
.field-stack .specimen-note { margin-top: 0; }
.resource-card { width: 100%; }
.resource-list { display: grid; gap: 15px; }
.resource-list > div { display: flex; align-items: center; gap: 10px; }
.resource-list > div > span { display: grid; flex: 1; gap: 3px; }
.resource-list strong { font-size: 12px; font-weight: 500; color: var(--bing-heading); }
.resource-list small { font-size: 10px; color: var(--bing-muted); }
.resource-list > div > svg { color: var(--bing-muted); }
.resource-card :deep(.bing-card__footer) { justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--bing-border); }
.card-state { margin: 13px 0 0; text-align: center; color: var(--bing-muted); font-size: 11px; }
.resource-back { display: grid; width: 100%; justify-items: center; gap: 8px; }
.resource-back > strong { color: var(--bing-heading); font-size: 18px; }
.resource-back p { margin: 0; font-size: 11px; color: var(--bing-muted); }
.resource-back dl { width: 100%; margin: 8px 0; font-size: 12px; }
.resource-back dl div { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--bing-border); }
.resource-back dt { color: var(--bing-muted); }
.resource-back dd { margin: 0; }
.resource-back > span { color: var(--bing-muted); font-size: 10px; }
.specimen--table { grid-column: span 2; }
.table-toolbar { margin-bottom: 12px; font-size: 12px; }
.table-toolbar > span { white-space: nowrap; }
.table-toolbar small { padding-left: 10px; color: var(--bing-muted); font-size: 11px; }
.table-toolbar :deep(.bing-input) { width: 190px; }
.progress-cell { display: flex; align-items: center; gap: 9px; }
.progress-cell > span { width: 66px; height: 5px; overflow: hidden; border-radius: 4px; background: var(--bing-surface-muted); }
.progress-cell i { display: block; height: 100%; border-radius: inherit; background: var(--bing-accent); }
.progress-cell small { color: var(--bing-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.hint-trigger { display: grid; place-items: center; width: 18px; height: 18px; padding: 0; border: 1px solid var(--bing-border-strong); border-radius: 50%; background: transparent; color: var(--bing-muted); cursor: help; }
.hint-trigger:focus-visible { outline: 2px solid var(--bing-focus); outline-offset: 3px; }
.specimen--code :deep(.bing-code-block) { font-size: 11px; }
@media (max-width: 980px) {
  .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .specimen--card { grid-column: 2; grid-row: 2; }
  .specimen--code { grid-column: 1; grid-row: 2; }
  .specimen--table { grid-column: span 2; }
}
@media (max-width: 600px) {
  .readme-overview { padding: 14px; }
  .overview-heading { align-items: flex-start; flex-direction: column; }
  .overview-brand h1 { font-size: 23px; }
  .overview-brand p { max-width: 260px; line-height: 1.6; }
  .overview-grid { grid-template-columns: minmax(0, 1fr); }
  .specimen { padding: 16px; }
  .specimen--card, .specimen--table, .specimen--code { grid-column: auto; grid-row: auto; }
  .table-toolbar { align-items: stretch; flex-direction: column; }
  .table-toolbar :deep(.bing-input) { width: 100%; }
}
</style>
