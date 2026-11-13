import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import BingInput from '../BingInput/BingInput.vue'
import BingRadio from './BingRadio.vue'
import type { BingRadioProps } from './BingRadio.types'

const meta = {
  title: 'Components/BingRadio',
  component: BingRadio,
  tags: ['autodocs'],
  args: {
    modelValue: 'aurora',
    value: 'aurora',
    label: '道路底图',
    description: '显示道路与地名',
    disabled: false,
    size: 'md',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
  render: (args) => ({
    components: { BingRadio },
    setup() {
      const value = ref(args.modelValue)
      watch(() => args.modelValue, next => { value.value = next })

      return { args, value }
    },
    template: `
      <BingRadio
        v-model="value"
        :value="args.value"
        :label="args.label"
        :description="args.description"
        :disabled="args.disabled"
        :size="args.size"
        :status="args.status"
      />
    `,
  }),
} satisfies Meta<BingRadioProps>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const States: Story = {
  name: '状态与切换',
  render: () => ({
    components: { BingRadio },
    setup() { return { selected: ref('roads'), confirmation: ref(null) } },
    template: `
      <div style="display: grid; gap: 8px; width: min(360px, calc(100vw - 48px));">
        <BingRadio v-model="selected" value="roads" name="base-map" label="道路底图" description="显示道路与地名" />
        <BingRadio v-model="selected" value="satellite" name="base-map" label="卫星影像" description="查看地表细节" />
        <BingRadio model-value="locked" value="locked" disabled label="已锁定的底图" />
        <BingRadio value="unavailable" disabled label="暂不可用" />
        <BingRadio v-model="confirmation" value="confirmed" status="error" label="请确认数据使用范围" />
        <output style="font-size: 12px; color: var(--bing-muted);">当前底图：{{ selected === 'roads' ? '道路底图' : '卫星影像' }}</output>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  name: '尺寸与对齐',
  render: () => ({
    components: { BingRadio, BingInput },
    setup() { return { sizes: ['sm', 'md', 'lg'], selected: ref([null, null, null]) } },
    template: `
      <div style="display: grid; gap: 18px; width: min(420px, calc(100vw - 48px));">
        <div v-for="(size, index) in sizes" :key="size" style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 16px;">
          <BingRadio v-model="selected[index]" :size="size" value="map" :label="size.toUpperCase() + ' 底图'" />
          <BingInput :size="size" :clearable="false" placeholder="同档尺寸" block />
        </div>
        <BingRadio v-model="selected[0]" value="long" label="完整显示较长的地图名称，点击这段文字同样可以完成选择。" description="说明文字使用统一的小字号。" />
      </div>
    `,
  }),
}
