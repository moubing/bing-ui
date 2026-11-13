<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ArrowRight, Check, ChevronRight, Combine, Copy, Download, Layers, LocateFixed, MoreHorizontal, Pentagon, Search, Settings2, Spline, SquareDashed, Trash2 } from '@lucide/vue'
import BingButton from '../src/components/BingButton/BingButton.vue'
import BingInput from '../src/components/BingInput/BingInput.vue'
import BingSelect from '../src/components/BingSelect/BingSelect.vue'
import BingCard from '../src/components/BingCard/BingCard.vue'
import BingDropDown from '../src/components/BingDropDown/BingDropDown.vue'
import BingDropDownItem from '../src/components/BingDropDown/BingDropDownItem.vue'

const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; glass?: boolean; background?: 'content' | 'plain' }>(), {
  size: 'md', glass: true, background: 'content',
})
const query = ref('')
const name = ref('城市道路')
const selected = ref('roads')
const geometry = ref<string | number | null>('line')
const menuOpen = ref(false)
const saving = ref(false)
const result = ref('所有更改已保存')
const tool = ref('缓冲区')
let saveTimer: ReturnType<typeof setTimeout> | undefined
const layers = ref([
  { value: 'roads', name: '城市道路', type: '线图层', count: '1,681' },
  { value: 'districts', name: '行政边界', type: '面图层', count: '24' },
  { value: 'places', name: '兴趣点', type: '点图层', count: '4,021' },
])
const visibleLayers = computed(() => layers.value.filter(layer => layer.name.includes(query.value)))
const geometryOptions = [{ label: '线图层', value: 'line' }, { label: '面图层', value: 'polygon' }, { label: '点图层', value: 'point' }]
const datasets = Array.from({ length: 160 }, (_, index) => ({ label: `城市数据集 ${String(index + 1).padStart(3, '0')}`, value: index }))
const dataset = ref<string | number | null>(0)
function selectLayer(value: string) {
  selected.value = value
  const layer = layers.value.find(item => item.value === value)!
  name.value = layer.name
  geometry.value = { 线图层: 'line', 面图层: 'polygon', 点图层: 'point' }[layer.type] ?? 'line'
  result.value = '所有更改已保存'
}
function save() {
  if (!name.value.trim()) { result.value = '请输入图层名称'; return }
  saving.value = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const layer = layers.value.find(item => item.value === selected.value)
    if (layer) layer.name = name.value.trim()
    saving.value = false
    result.value = '图层设置已保存'
  }, 850)
}
function chooseTool(value: string) { tool.value = value; result.value = `已选择${value}工具` }
onBeforeUnmount(() => clearTimeout(saveTimer))
</script>

<template>
  <div class="refresh-study">
    <header class="refresh-study__intro">
      <div><p class="refresh-study__eyebrow">Bing UI / 外观试做 01</p><h1>让内容成为主角。</h1><p class="refresh-study__description">中性底色、清晰边界和轻磨砂，搭配熟悉的交互。</p></div>
      <span class="refresh-study__version">第一批 · 5 个组件</span>
    </header>

    <section class="refresh-workspace" aria-label="图层工作区" :class="{ 'is-plain': background === 'plain' }">
      <header class="refresh-workspace__toolbar">
        <div class="refresh-workspace__breadcrumb"><Layers :size="18" :stroke-width="1.75" /><strong>图层工作区</strong><ChevronRight :size="14" /><span>城市数据</span></div>
        <div class="refresh-workspace__actions">
          <BingButton :size="size" variant="ghost" @click="result = '已准备导出城市数据'"><template #prefix><Download /></template>导出</BingButton>
          <BingDropDown v-model:open="menuOpen" :size="size" :glass="glass" placement="bottom-end" :width="224" aria-label="空间分析菜单">
            <template #trigger="{ triggerProps }"><BingButton v-bind="triggerProps" :size="size" variant="tertiary" :throttle="false"><template #prefix><Combine /></template>空间分析</BingButton></template>
            <template #header>单图层</template>
            <BingDropDownItem title="框选" :icon="SquareDashed" :active="tool === '框选'" @click="chooseTool('框选')" />
            <BingDropDownItem title="缓冲区" :icon="Copy" :active="tool === '缓冲区'" @click="chooseTool('缓冲区')" />
            <BingDropDownItem title="质心" :icon="LocateFixed" @click="chooseTool('质心')" />
            <BingDropDownItem title="融合" :icon="Combine" @click="chooseTool('融合')" />
            <BingDropDownItem title="简化" :icon="Spline" @click="chooseTool('简化')" />
            <BingDropDownItem title="更多操作" :icon="MoreHorizontal" :close-on-click="false"><template #submenu><BingDropDownItem title="相交" :icon="Layers" @click="chooseTool('相交')" /><BingDropDownItem title="差集" :icon="Pentagon" @click="chooseTool('差集')" /><BingDropDownItem title="移除图层" :icon="Trash2" tone="danger" disabled /></template></BingDropDownItem>
            <template #footer><span class="refresh-workspace__menu-note">当前工具 · {{ tool }}</span></template>
          </BingDropDown>
        </div>
      </header>
      <div class="refresh-workspace__canvas">
        <div class="refresh-workspace__shapes" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="refresh-workspace__panels">
          <BingCard class="refresh-workspace__layers" title="图层列表" :glass="glass" :interactive="false" :tilt="false" :glare="false" flip-trigger="none" entrance="none">
            <div class="refresh-layer-list">
              <BingInput v-model="query" :size="size" :icon="Search" block placeholder="搜索图层" aria-label="搜索图层" />
              <BingButton v-for="layer in visibleLayers" :key="layer.value" :size="size" variant="ghost" block :throttle="false" :class="{ 'is-current-layer': selected === layer.value }" :aria-pressed="selected === layer.value" @click="selectLayer(layer.value)"><template #prefix><Pentagon /></template>{{ layer.name }}</BingButton>
              <p v-if="!visibleLayers.length" class="refresh-layer-list__empty">没有匹配的图层</p>
              <div class="refresh-layer-list__meta"><span>{{ visibleLayers.length }} 个图层</span><span>GeoJSON</span></div>
            </div>
          </BingCard>

          <BingCard class="refresh-workspace__settings" title="图层属性" :glass="glass" :interactive="false" :tilt="false" :glare="false" flip-trigger="none" entrance="none">
            <div class="refresh-settings">
              <label for="refresh-layer-name">图层名称<BingInput id="refresh-layer-name" v-model="name" :size="size" block :status="!name.trim() ? 'error' : 'default'" @input="result = '有未保存的更改'" /></label>
              <label>几何类型<BingSelect v-model="geometry" :options="geometryOptions" :size="size" :glass="glass" :clearable="false" :searchable="false" block aria-label="几何类型" @change="result = '有未保存的更改'" /></label>
              <div class="refresh-settings__row"><span>坐标系</span><span>EPSG:4326</span></div>
              <div class="refresh-settings__row"><span>数据格式</span><span class="refresh-settings__format">GeoJSON</span></div>
            </div>
            <template #footer><BingButton :size="size" variant="tertiary" @click="selectLayer(selected)">还原</BingButton><BingButton :size="size" :loading="saving" @click="save"><template #prefix><Check /></template>保存设置</BingButton></template>
          </BingCard>
        </div>
        <div class="refresh-workspace__coordinate" aria-hidden="true">城市数据 / 工作画布</div>
      </div>
      <footer class="refresh-workspace__status"><span role="status"><span class="refresh-workspace__status-dot"></span>{{ result }}</span><span>{{ size.toUpperCase() }} · {{ glass ? '磨砂表面' : '实色表面' }}</span></footer>
    </section>

    <section class="refresh-specimens" aria-label="基础组件与交互">
      <div class="refresh-specimens__controls">
        <h2>基础控件</h2>
        <div class="refresh-specimens__buttons"><BingButton :size="size">主要操作</BingButton><BingButton :size="size" variant="secondary">次要操作</BingButton><BingButton :size="size" variant="tertiary">边框按钮</BingButton><BingButton :size="size" variant="ghost">轻量操作</BingButton><BingButton :size="size" disabled>不可用</BingButton><BingButton :size="size" variant="danger">删除</BingButton></div>
        <div class="refresh-specimens__fields"><label>只读字段<BingInput model-value="EPSG:4326" :size="size" readonly block /></label><label>虚拟列表 · 160 项<BingSelect v-model="dataset" :options="datasets" :size="size" :glass="glass" virtual block aria-label="城市数据集" /></label></div>
        <div class="refresh-specimens__motion"><BingButton :size="size" variant="tertiary" text-effect="jump" text-effect-trigger="hover"><template #suffix><ArrowRight /></template>悬停，文字轻跳</BingButton><span>悬停填充、文字反馈与加载过渡沿用现有交互。</span></div>
      </div>
      <div class="refresh-specimens__card">
        <h2>卡片交互</h2>
        <BingCard title="城市数据集" description="3 个图层 · 最后更新于今天" :glass="glass" entrance="none">
          <p>移动指针感受倾斜，按住卡片查看背面。</p>
          <template #back><Settings2 :size="24" :stroke-width="1.5" /><strong>数据已就绪</strong><p>松开后返回正面</p></template>
        </BingCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
:global(#storybook-root:has(.refresh-study)) { max-width: none; }
.refresh-study { max-width: 1180px; margin: 0 auto; padding: 32px; color: var(--bing-text); font-size: 14px; }
.refresh-study__intro { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 24px; }
.refresh-study__eyebrow { margin: 0 0 8px; font-size: 10px; font-weight: 600; letter-spacing: 1.4px; color: var(--bing-muted); }
.refresh-study h1 { margin: 0; color: var(--bing-heading); font-size: 25px; letter-spacing: -.7px; font-weight: 600; }
.refresh-study__description { margin: 8px 0 0; color: var(--bing-muted); font-size: 13px; }
.refresh-study__version { color: var(--bing-muted); font-size: 12px; white-space: nowrap; }
.refresh-workspace { overflow: clip; border: 1px solid var(--bing-border-strong); border-radius: 10px; background: var(--bing-surface-solid); box-shadow: var(--bing-shadow-sm); }
.refresh-workspace__toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--bing-border); }
.refresh-workspace__breadcrumb, .refresh-workspace__actions { display: flex; align-items: center; gap: 10px; }
.refresh-workspace__breadcrumb strong { color: var(--bing-heading); font-size: 14px; font-weight: 500; }
.refresh-workspace__breadcrumb > span { color: var(--bing-muted); font-size: 13px; }
.refresh-workspace__canvas { position: relative; overflow: hidden; background: var(--bing-surface-muted); padding: 28px; }
.refresh-workspace__shapes { position: absolute; inset: 0; background-image: linear-gradient(rgb(var(--bing-heading-rgb) / .035) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--bing-heading-rgb) / .035) 1px, transparent 1px); background-size: 36px 36px; pointer-events: none; }
.refresh-workspace__shapes > span { display: block; position: absolute; }
.refresh-workspace__shapes > span:nth-child(1) { top: 14%; left: -4%; width: 58%; height: 62%; transform: rotate(-14deg); background: rgb(var(--bing-secondary-rgb) / .15); }
.refresh-workspace__shapes > span:nth-child(2) { bottom: -20%; right: 12%; width: 24%; height: 88%; transform: rotate(23deg); background: rgb(var(--bing-success-rgb) / .12); }
.refresh-workspace__shapes > span:nth-child(3) { top: 30%; right: 10%; width: 80%; height: 10px; transform: rotate(-26deg); background: rgb(var(--bing-warning-rgb) / .17); }
.refresh-workspace.is-plain .refresh-workspace__shapes { display: none; }
.refresh-workspace__panels { position: relative; display: grid; grid-template-columns: 248px minmax(0, 350px); justify-content: space-between; align-items: start; gap: 32px; }
.refresh-layer-list { display: grid; gap: 6px; }
.refresh-layer-list > :first-child { margin-bottom: 6px; }
.refresh-layer-list :deep(.bing-button) { justify-content: flex-start; font-weight: 400; }
.refresh-layer-list :deep(.is-current-layer) { background: var(--bing-surface-active); color: var(--bing-heading); }
.refresh-layer-list__meta { display: flex; justify-content: space-between; padding-top: 14px; margin-top: 8px; border-top: 1px solid var(--bing-border); color: var(--bing-muted); font-size: 12px; }
.refresh-layer-list__empty { color: var(--bing-muted); padding-block: 8px; font-size: 13px; }
.refresh-settings { display: grid; gap: 16px; }
.refresh-settings label, .refresh-specimens__fields label { display: grid; min-width: 0; gap: 6px; font-size: 13px; color: var(--bing-heading); }
.refresh-settings__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--bing-muted); }
.refresh-settings__row span:last-child { color: var(--bing-text); }
.refresh-settings__format { border: 1px solid var(--bing-border); border-radius: 4px; padding: 1px 6px; font-size: 11px; background: var(--bing-surface-muted); }
.refresh-workspace__settings :deep(.bing-card__footer) { padding-top: 12px; border-top: 1px solid var(--bing-border); }
.refresh-workspace__coordinate { position: relative; margin-top: 28px; font-size: 11px; color: var(--bing-muted); }
.refresh-workspace__status { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 9px 16px; border-top: 1px solid var(--bing-border); color: var(--bing-muted); font-size: 11px; }
.refresh-workspace__status > span:first-child { display: flex; align-items: center; gap: 7px; }
.refresh-workspace__status-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--bing-muted); }
.refresh-workspace__menu-note { font-size: 12px; color: var(--bing-muted); }
.refresh-specimens { display: grid; grid-template-columns: minmax(0, 1fr) 300px; align-items: start; gap: 32px; margin-top: 28px; }
.refresh-specimens h2 { margin: 0 0 16px; color: var(--bing-heading); font-size: 13px; font-weight: 500; }
.refresh-specimens__buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.refresh-specimens__fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; margin-top: 20px; }
.refresh-specimens__motion { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 20px; }
.refresh-specimens__motion > span { font-size: 12px; color: var(--bing-muted); }
@media (max-width: 800px) {
  .refresh-study { padding: 20px; }
  .refresh-workspace__canvas { padding: 20px; }
  .refresh-workspace__panels { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 20px; }
  .refresh-specimens { grid-template-columns: 1fr; }
}
@media (max-width: 540px) {
  .refresh-study { padding: 16px; }
  .refresh-study__intro { align-items: flex-start; }
  .refresh-study__version { display: none; }
  .refresh-study h1 { font-size: 22px; }
  .refresh-workspace__panels, .refresh-specimens__fields { grid-template-columns: minmax(0, 1fr); }
  .refresh-workspace__canvas { padding: 14px; }
  .refresh-workspace__breadcrumb > span, .refresh-workspace__breadcrumb > svg:nth-of-type(2) { display: none; }
}
</style>
