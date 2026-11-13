<script setup lang="ts">
import { ref } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingCursor from './BingCursor.vue'
import BingCursorGlyph from './BingCursorGlyph.vue'
import type { BingCursorProps, BingCursorType } from './BingCursor.types'

withDefaults(defineProps<{ cursorProps: BingCursorProps; variant?: 'presets' | 'global' }>(), { variant: 'presets' })
const currentType = ref<BingCursorType>('default')
const text = ref('光标跟随你的意图。')
const count = ref(0)
const dragging = ref(false)
const position = ref(0)
let dragStart = 0
let dragOffset = 0
const presets: { type: BingCursorType; label: string }[] = [
  { type: 'default', label: '普通' }, { type: 'pointer', label: '链接' },
  { type: 'not-allowed', label: '禁用' }, { type: 'text', label: '文本' },
  { type: 'grab', label: '可抓取' }, { type: 'grabbing', label: '抓取中' },
  { type: 'move', label: '移动' }, { type: 'crosshair', label: '十字' },
  { type: 'col-resize', label: '调整列宽' }, { type: 'row-resize', label: '调整行高' },
  { type: 'ew-resize', label: '水平缩放' }, { type: 'ns-resize', label: '垂直缩放' },
  { type: 'nwse-resize', label: '对角缩放 ↘' }, { type: 'nesw-resize', label: '对角缩放 ↗' },
  { type: 'zoom-in', label: '放大' }, { type: 'zoom-out', label: '缩小' },
]

function startDrag(event: PointerEvent) {
  if (event.button !== 0) return
  const element = event.currentTarget as HTMLElement
  element.setPointerCapture(event.pointerId)
  dragging.value = true
  dragStart = event.clientX
  dragOffset = position.value
}

function moveDrag(event: PointerEvent) {
  if (!dragging.value) return
  const element = event.currentTarget as HTMLElement
  const limit = (element.parentElement?.clientWidth ?? 200) - element.offsetWidth - 32
  position.value = Math.max(0, Math.min(limit, dragOffset + event.clientX - dragStart))
}

function stopDrag() {
  dragging.value = false
}
</script>

<template>
  <main class="cursor-demo">
    <header class="cursor-demo__header">
      <div>
        <div class="cursor-demo__eyebrow"><span /> BING UI / INTERACTION</div>
        <h1>每一次指向，都恰到好处。</h1>
        <p>熟悉的黑白轮廓，即时响应每一次移动。在工作台中移动，或按住拖动。</p>
      </div>
      <span class="cursor-demo__badge"><span /> mac 风格</span>
    </header>

    <BingCursor v-bind="cursorProps" @change="currentType = $event">
      <section class="cursor-demo__workbench" data-testid="cursor-workbench">
        <div class="cursor-demo__toolbar">
          <div class="cursor-demo__traffic" aria-hidden="true"><i /><i /><i /></div>
          <span>光标工作台</span>
          <code data-testid="current-type">{{ currentType }}</code>
        </div>

        <div class="cursor-demo__section-label">基础光标 <span>16 种内置状态</span></div>
        <div class="cursor-demo__presets">
          <div v-for="preset in presets" :key="preset.type" class="cursor-demo__preset" :data-bing-cursor="preset.type" :data-testid="`preset-${preset.type}`">
            <div class="cursor-demo__preview"><BingCursorGlyph :type="preset.type" /></div>
            <span>{{ preset.label }}</span>
            <code>{{ preset.type }}</code>
          </div>
        </div>

        <div class="cursor-demo__section-label">真实交互 <span>自动适配现有组件</span></div>
        <div class="cursor-demo__interactions">
          <div class="cursor-demo__interaction">
            <span class="cursor-demo__caption">01 / 点击与禁用</span>
            <div class="cursor-demo__buttons">
              <BingButton size="sm" text-shine="none" @click="count++">点击 {{ count }}</BingButton>
              <BingButton size="sm" variant="secondary" disabled>暂不可用</BingButton>
            </div>
            <a href="#cursor-native" class="cursor-demo__link">也适用于普通链接 ↗</a>
          </div>
          <div class="cursor-demo__interaction">
            <label for="cursor-demo-input" class="cursor-demo__caption">02 / 文本输入</label>
            <BingInput id="cursor-demo-input" v-model="text" size="sm" aria-label="光标演示输入框" />
            <span class="cursor-demo__hint">点击编辑，试试文本选择。</span>
          </div>
          <div class="cursor-demo__interaction">
            <span class="cursor-demo__caption">03 / 按住拖动</span>
            <div class="cursor-demo__track">
              <button
                class="cursor-demo__drag"
                :style="{ transform: `translateX(${position}px)`, cursor: dragging ? 'grabbing' : 'grab' }"
                aria-label="拖动光标示例"
                @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="stopDrag" @pointercancel="stopDrag" @lostpointercapture="stopDrag"
                @keydown.left.prevent="position = Math.max(0, position - 10)" @keydown.right.prevent="position = Math.min(120, position + 10)"
              ><span aria-hidden="true">⠿</span> {{ dragging ? '抓住了' : '拖动我' }}</button>
            </div>
            <span class="cursor-demo__hint">松开恢复；也支持左右方向键。</span>
          </div>
        </div>

        <div v-if="variant === 'global'" class="cursor-demo__nested">
          <BingCursor color="#2563eb" :size="36">
            <div class="cursor-demo__local" data-testid="nested-scope"><strong>局部光标</strong><span>移入此处，使用更大的蓝色光标；移出恢复全局配置。</span></div>
          </BingCursor>
        </div>
        <footer id="cursor-native" class="cursor-demo__footer" data-bing-cursor="native" data-testid="native-zone">
          <span>↖ 原生光标区域</span><span>触摸设备自然回退 · 尊重减少动态效果设置</span>
        </footer>
      </section>
    </BingCursor>
    <p class="cursor-demo__outside" data-testid="outside-scope">{{ cursorProps.global ? '当前已启用全局光标，工作台之外同样生效。' : '工作台之外，保留原来的鼠标。' }}</p>
  </main>
</template>

<style scoped>
.cursor-demo {
  width: min(1120px, 100%);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 48px 36px 24px;
  color: var(--bing-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.cursor-demo__header { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 30px; }
.cursor-demo__eyebrow { display: flex; align-items: center; gap: 8px; color: var(--bing-muted); font-size: 10px; letter-spacing: 1.7px; font-weight: 600; }
.cursor-demo__eyebrow > span { width: 6px; height: 6px; border-radius: 50%; background: var(--bing-heading); }
.cursor-demo h1 { margin: 14px 0 10px; color: var(--bing-heading); font-size: clamp(24px, 3vw, 34px); letter-spacing: -1px; font-weight: 600; }
.cursor-demo__header p { margin: 0; font-size: 13px; color: var(--bing-muted); line-height: 1.8; }
.cursor-demo__badge { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 8px 12px; border: 1px solid var(--bing-border); border-radius: 20px; background: var(--bing-surface-solid); font-size: 11px; }
.cursor-demo__badge > span { width: 6px; height: 6px; border-radius: 50%; background: #8ca575; }
.cursor-demo__workbench { overflow: hidden; border: 1px solid var(--bing-border-strong); border-radius: 14px; background: var(--bing-surface-solid); box-shadow: 0 12px 44px rgb(var(--bing-shadow-rgb) / 0.06); }
.cursor-demo__toolbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; height: 49px; padding: 0 20px; border-bottom: 1px solid var(--bing-border); background: var(--bing-surface-muted); color: var(--bing-muted); font-size: 11px; }
.cursor-demo__toolbar > code { justify-self: end; font: 10px ui-monospace, monospace; }
.cursor-demo__traffic { display: flex; gap: 7px; }
.cursor-demo__traffic i { width: 9px; height: 9px; border-radius: 50%; background: #ff6058; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08); }
.cursor-demo__traffic i:nth-child(2) { background: #febc2e; }
.cursor-demo__traffic i:nth-child(3) { background: #28c840; }
.cursor-demo__section-label { display: flex; align-items: center; gap: 12px; margin: 25px 24px 14px; font-size: 12px; font-weight: 600; color: var(--bing-heading); }
.cursor-demo__section-label > span { font-size: 10px; font-weight: 400; color: var(--bing-muted); }
.cursor-demo__presets { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 1px; margin: 0 24px; overflow: hidden; border: 1px solid var(--bing-border); border-radius: 9px; background: var(--bing-border); }
.cursor-demo__preset { min-width: 0; padding: 17px 4px 14px; display: flex; flex-direction: column; align-items: center; background: var(--bing-surface-solid); transition: background-color 150ms; }
.cursor-demo__preset:hover { background: var(--bing-surface-hover); }
.cursor-demo__preview { width: 34px; height: 34px; margin-bottom: 11px; }
.cursor-demo__preset > span { font-size: 10px; color: var(--bing-text); }
.cursor-demo__preset > code { margin-top: 5px; color: var(--bing-muted); font: 9px ui-monospace, monospace; }
.cursor-demo__interactions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0 24px 24px; }
.cursor-demo__interaction { display: flex; flex-direction: column; gap: 13px; min-width: 0; padding: 17px; border: 1px solid var(--bing-border); border-radius: 9px; }
.cursor-demo__caption { font-size: 10px; color: var(--bing-muted); letter-spacing: 0.3px; }
.cursor-demo__buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.cursor-demo__link { font-size: 10px; color: var(--bing-muted); text-decoration-color: var(--bing-border-strong); text-underline-offset: 3px; }
.cursor-demo__hint { font-size: 10px; color: var(--bing-muted); }
.cursor-demo__track { padding: 0 0 0 0; border-radius: 7px; background: var(--bing-surface-muted); }
.cursor-demo__drag { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid var(--bing-border-strong); border-radius: 6px; background: var(--bing-surface-solid); color: var(--bing-text); font: inherit; font-size: 11px; user-select: none; touch-action: none; }
.cursor-demo__drag:focus-visible { outline: 2px solid var(--bing-focus); outline-offset: 3px; }
.cursor-demo__footer { display: flex; justify-content: space-between; gap: 16px; padding: 14px 24px; border-top: 1px solid var(--bing-border); color: var(--bing-muted); background: var(--bing-surface-muted); font-size: 10px; line-height: 1.6; }
.cursor-demo__outside { margin: 18px 0 0; text-align: center; font-size: 10px; color: var(--bing-muted); }
.cursor-demo__nested { margin: 0 24px 24px; }
.cursor-demo__local { display: flex; flex-direction: column; gap: 8px; padding: 22px; border: 1px dashed var(--bing-border-strong); border-radius: 9px; font-size: 12px; }
.cursor-demo__local > span { color: var(--bing-muted); font-size: 11px; }
@media (max-width: 800px) {
  .cursor-demo { padding: 28px 18px 20px; }
  .cursor-demo__presets { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .cursor-demo__interactions { grid-template-columns: 1fr; }
  .cursor-demo__header { align-items: flex-start; }
  .cursor-demo__badge { display: none; }
}
@media (max-width: 520px) {
  .cursor-demo__footer { flex-direction: column; gap: 4px; }
  .cursor-demo__presets { margin: 0 14px; }
  .cursor-demo__section-label { margin-left: 14px; }
  .cursor-demo__interactions { margin: 0 14px 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .cursor-demo__preset { transition: none; }
}
</style>
