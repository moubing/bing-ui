import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingButton from '../BingButton/BingButton.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingForm from '../BingForm/BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingSlider from './BingSlider.vue'
import type { BingSliderProps } from './BingSlider.types'

const meta: Meta<BingSliderProps> = {
  title: 'Components/BingSlider',
  component: BingSlider as unknown as NonNullable<Meta<BingSliderProps>['component']>,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<BingSliderProps>

export const DocumentWidth: Story = {
  name: '基础与提交时机',
  render: () => ({
    components: { BingSlider, BingCheckbox },
    setup() {
      const value = ref(880)
      const saved = ref(880)
      const commits = ref(0)
      const disabled = ref(false)
      const save = (next: number) => { saved.value = next; commits.value++ }
      return { value, saved, commits, disabled, save, valueText: (next: number) => `正文宽度 ${next} 像素` }
    },
    template: `
      <div style="display: grid; gap: 16px; width: min(480px, calc(100vw - 48px));">
        <label for="document-width">正文宽度：{{ value }}px</label>
        <BingSlider id="document-width" v-model="value" :min="640" :max="1800" :step="20"
          :disabled="disabled" :format-value-text="valueText" @change="save" />
        <BingCheckbox v-model="disabled" label="禁用滑块" />
        <p role="status">已提交：{{ saved }}px；提交次数：{{ commits }}</p>
      </div>
    `,
  }),
}

export const SizesAndStates: Story = {
  name: '尺寸与状态',
  render: () => ({
    components: { BingSlider, BingForm, BingFormItem },
    template: `
      <div style="display: grid; gap: 22px; width: min(480px, calc(100vw - 48px));">
        <BingForm v-for="size in ['sm', 'md', 'lg']" :key="size" :size="size">
          <BingFormItem :label="size + ' · 继承表单尺寸'"><BingSlider :default-value="42" /></BingFormItem>
        </BingForm>
        <div v-for="status in ['success', 'warning', 'error']" :key="status">
          <label :for="'slider-' + status">{{ { success: '成功', warning: '注意', error: '错误' }[status] }}</label>
          <BingSlider :id="'slider-' + status" :status="status" :default-value="64" />
        </div>
        <div><label for="disabled-slider">禁用</label><BingSlider id="disabled-slider" disabled :default-value="35" /></div>
      </div>`,
  }),
}

export const Tooltips: Story = {
  name: '数值气泡',
  render: () => ({
    components: { BingSlider },
    setup: () => ({ format: (value: number) => value + ' 像素' }),
    template: `
      <div style="display: grid; gap: 52px; padding-top: 40px; width: min(480px, calc(100vw - 48px));">
        <div><label for="tooltip-auto">操作时显示 · 拖动或使用键盘</label>
          <BingSlider id="tooltip-auto" tooltip="auto" :default-value="36" style="margin-top: 32px" /></div>
        <div><label for="tooltip-always">始终显示 · 独立格式化</label>
          <BingSlider id="tooltip-always" tooltip="always" :default-value="880" :min="640" :max="1800" :step="20" :format-tooltip="format" style="margin-top: 32px" /></div>
        <BingSlider aria-label="左端气泡" tooltip="always" :default-value="0" :format-tooltip="format" />
        <BingSlider aria-label="右端气泡" tooltip="always" :default-value="100" :format-tooltip="format" />
      </div>`,
  }),
}

export const Marks: Story = {
  name: '刻度与离散档位',
  render: () => ({
    components: { BingSlider },
    setup: () => ({
      marks: [{ value: 0, label: '紧凑' }, { value: 35, label: '标准' }, { value: 100, label: '宽松' }],
    }),
    template: `
      <div style="display: grid; gap: 52px; width: min(480px, calc(100vw - 48px));">
        <div><label for="marks-continuous">连续数值 · 点击文字定位</label>
          <BingSlider id="marks-continuous" :default-value="35" :marks="[0, 25, 50, 75, 100]" tooltip="auto" /></div>
        <div><label for="marks-snap">离散档位 · 方向键逐档切换</label>
          <BingSlider id="marks-snap" :default-value="35" :marks="marks" snap-to-marks tooltip="auto" /></div>
      </div>`,
  }),
}

export const RangeSelection: Story = {
  name: '范围选择',
  render: () => ({
    components: { BingSlider },
    setup: () => ({ value: ref<[number, number]>([20, 70]), committed: ref<[number, number]>([20, 70]) }),
    template: `
      <div style="display: grid; gap: 42px; padding-top: 40px; width: min(480px, calc(100vw - 48px));">
        <div><p>价格区间：{{ value[0] }}–{{ value[1] }}；最小间隔 10</p>
          <BingSlider v-model="value" range :min-distance="10" aria-label="价格区间" tooltip="auto" @change="committed = $event" />
          <p role="status">已提交：{{ committed[0] }}–{{ committed[1] }}</p></div>
        <div><p>重合时向两侧拖动分别调整对应端点</p>
          <BingSlider range :default-value="[50, 50]" aria-label="重合区间" tooltip="auto" /></div>
        <div><p>两端均在最大值时仍可向左拖动</p>
          <BingSlider range :default-value="[100, 100]" aria-label="最大区间" tooltip="auto" /></div>
      </div>`,
  }),
}

export const Controlled: Story = {
  name: '受控回弹与恢复默认',
  render: () => ({
    components: { BingSlider, BingButton, BingInput },
    setup: () => ({ width: ref(880), request: ref(30) }),
    template: `
      <div style="display: grid; grid-template-columns: minmax(0, 1fr); gap: 36px; width: min(480px, calc(100vw - 48px));">
        <div><label for="controlled-width">正文最大宽度：{{ width }}px</label>
          <BingSlider id="controlled-width" v-model="width" :min="640" :max="1800" :step="20" tooltip="auto"
            style="--bing-slider-color: var(--bing-success)" />
          <div style="display: flex; gap: 12px; margin-top: 12px;">
            <BingInput aria-label="输入正文宽度" v-model="width" type="number" :min="640" :max="1800" :step="20" style="flex: 1; min-width: 0;" />
            <BingButton @click="width = 880" style="flex-shrink: 0;">恢复默认</BingButton>
          </div>
        </div>
        <div><label for="controlled-reject">父级固定为 30，松手后回弹</label>
          <BingSlider id="controlled-reject" :model-value="30" tooltip="auto" @update:model-value="request = $event" />
          <p role="status">最近请求：{{ request }}</p></div>
        <div dir="rtl"><label for="rtl-slider">从右到左 · 键盘方向随布局翻转</label>
          <BingSlider id="rtl-slider" :default-value="30" tooltip="auto" /></div>
      </div>`,
  }),
}

export const Vertical: Story = {
  name: '竖向',
  render: () => ({
    components: { BingSlider },
    setup: () => ({ value: ref(55), range: ref<[number, number]>([20, 75]) }),
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 32px; width: min(480px, calc(100vw - 48px)); padding: 20px 0;">
        <div style="display: grid; gap: 20px; justify-items: center; width: 120px;">
          <label for="vertical-level">音量：{{ value }}%</label>
          <BingSlider id="vertical-level" v-model="value" orientation="vertical" tooltip="always"
            :reset-value="55" :marks="[{ value: 0, label: '静音' }, { value: 50, label: '适中' }, { value: 100, label: '最大' }]"
            style="height: 240px;" />
        </div>
        <div style="display: grid; gap: 20px; justify-items: center; width: 120px;">
          <label for="vertical-range">区间：{{ range[0] }}–{{ range[1] }}</label>
          <BingSlider id="vertical-range" v-model="range" range orientation="vertical" :min-distance="10"
            tooltip="auto" :reset-value="[20, 75]" style="height: 240px;" />
        </div>
        <div dir="rtl" style="display: grid; gap: 20px; justify-items: center; width: 120px;">
          <label for="vertical-rtl">RTL · 下小上大</label>
          <BingSlider id="vertical-rtl" orientation="vertical" :default-value="40" tooltip="auto" size="lg"
            style="height: 240px; --bing-slider-color: var(--bing-success);" />
        </div>
        <p style="margin: 0; line-height: 1.6; color: var(--bing-muted);">上下键调整数值，双击音量或区间滑块恢复默认。竖向轨道支持纵向拖动。</p>
      </div>`,
  }),
}

export const BoundaryAndReset: Story = {
  name: '边缘弹性与双击恢复',
  render: () => ({
    components: { BingSlider, BingButton },
    setup: () => ({ value: ref(60), range: ref<[number, number]>([20, 75]), committed: ref(60), commits: ref(0) }),
    template: `
      <div style="display: grid; gap: 36px; width: min(480px, calc(100vw - 48px)); padding: 20px 0;">
        <div><label for="elastic-slider">拖至两端继续拉动 · 当前值 {{ value }}</label>
          <BingSlider id="elastic-slider" v-model="value" :reset-value="40" tooltip="auto"
            @change="committed = $event; commits++" />
          <p role="status">已提交：{{ committed }}；提交次数：{{ commits }}</p>
          <p style="color: var(--bing-muted);">按住时保持轻微挤压，松手后回弹；双击滑块恢复到 40。</p>
          <BingButton size="sm" variant="secondary" @click="value = 40">恢复到 40</BingButton>
        </div>
        <div><label for="reset-range">区间：{{ range[0] }}–{{ range[1] }}</label>
          <BingSlider id="reset-range" v-model="range" range :min-distance="10" :reset-value="[20, 75]" tooltip="auto" />
          <p style="color: var(--bing-muted);">双击任一滑块，整个区间恢复到 20–75。</p>
        </div>
        <div><label for="reset-disabled">禁用时不响应双击</label>
          <BingSlider id="reset-disabled" :default-value="60" :reset-value="40" disabled /></div>
      </div>`,
  }),
}
