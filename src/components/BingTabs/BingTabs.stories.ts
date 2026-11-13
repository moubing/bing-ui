import { computed, ref } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import BingTabs from './BingTabs.vue'
import BingButton from '../BingButton/BingButton.vue'
import type { BingTabItem, BingTabValue, BingTabsChangePayload, BingTabsProps } from './BingTabs.types'

type StoryArgs = BingTabsProps & {
  onChange: (payload: BingTabsChangePayload) => void
}

const items: BingTabItem[] = [
  {
    value: 'overview',
    label: '概览',
    tone: '#f472b6',
  },
  {
    value: 'details',
    label: '详情',
    tone: '#0ea5e9',
  },
  {
    value: 'metrics',
    label: '统计',
    tone: '#10b981',
  },
]

const meta = {
  title: 'Components/BingTabs',
  component: BingTabs,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'inline-radio',
      options: ['pill', 'glass', 'soft'],
    },
    activation: {
      control: 'inline-radio',
      options: ['auto', 'manual'],
    },
    disabled: {
      control: 'boolean',
    },
    block: {
      control: 'boolean',
    },
    loop: {
      control: 'boolean',
    },
    animated: {
      control: 'boolean',
    },
    respectReducedMotion: {
      control: 'boolean',
    },
    smoothScroll: {
      control: 'boolean',
      description: '标签溢出时启用横向平滑滚动。',
    },
    onChange: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    items,
    modelValue: 'overview',
    size: 'md',
    variant: 'glass',
    activation: 'auto',
    disabled: false,
    block: false,
    loop: true,
    animated: true,
    respectReducedMotion: true,
    smoothScroll: true,
    ariaLabel: '工作区视图',
    onChange: fn(),
  },
  render: (args) => ({
    components: { BingTabs },
    setup() {
      const value = ref<BingTabValue>(args.modelValue ?? 'overview')
      const activeItem = computed(() =>
        args.items?.find((item) => item.value === value.value) ?? args.items?.[0],
      )

      function handleUpdate(nextValue: BingTabValue) {
        value.value = nextValue
      }

      function handleChange(payload: BingTabsChangePayload) {
        args.onChange(payload)
      }

      const panelStyle = computed(() => ({
        display: 'grid',
        gap: '8px',
        boxSizing: 'border-box',
        width: '100%',
        padding: '16px',
        border: '1px solid var(--bing-border-strong)',
        borderRadius: '8px',
        background: 'var(--bing-surface-solid)',
        boxShadow: 'var(--bing-shadow-sm)',
      }))

      return {
        args,
        value,
        activeItem,
        handleUpdate,
        handleChange,
        panelStyle,
      }
    },
    template: `
      <div style="display: grid; gap: 12px; width: min(520px, calc(100vw - 48px));">
        <BingTabs
          :items="args.items"
          :model-value="value"
          :size="args.size"
          :variant="args.variant"
          :activation="args.activation"
          :disabled="args.disabled"
          :block="args.block"
          :loop="args.loop"
          :animated="args.animated"
          :respect-reduced-motion="args.respectReducedMotion"
          :smooth-scroll="args.smoothScroll"
          :aria-label="args.ariaLabel"
          @update:model-value="handleUpdate"
          @change="handleChange"
        />

        <section :style="panelStyle">
          <strong style="font-size: 14px; font-weight: 500; color: var(--bing-heading);">
            {{ activeItem?.label }}
          </strong>
          <span style="color: var(--bing-text); font-size: 14px; line-height: 1.5;">
            查看当前工作区的内容、配置与使用情况。
          </span>
        </section>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const Toolbar: Story = {
  name: '工具栏垂直对齐',
  render: () => ({
    components: { BingTabs, BingButton },
    setup: () => ({
      value: ref<BingTabValue>('edit'),
      documentItems: [{ value: 'edit', label: '正文' }, { value: 'diff', label: '版本比较' }],
    }),
    template: `<div style="display:grid;gap:16px;width:min(640px, calc(100vw - 48px));">
      <div v-for="size in ['sm', 'md', 'lg']" :key="size" style="display:flex;align-items:center;gap:12px;min-width:0;padding:8px;border-bottom:1px solid var(--bing-border);">
        <span style="flex-shrink:0;font-size:12px;">REQ-11</span>
        <BingTabs v-model="value" :items="documentItems" :size="size" variant="soft" :aria-label="'文档视图 ' + size" />
        <BingButton size="sm" style="flex-shrink:0;margin-left:auto;">保存版本</BingButton>
      </div>
    </div>`,
  }),
}

export const Variants: Story = {
  name: '风格对比',
  render: () => ({
    components: { BingTabs },
    setup() {
      const pillValue = ref<BingTabValue>('overview')
      const glassValue = ref<BingTabValue>('details')
      const softValue = ref<BingTabValue>('metrics')

      return {
        items,
        pillValue,
        glassValue,
        softValue,
      }
    },
    template: `
      <div style="display: grid; gap: 16px; width: min(520px, calc(100vw - 48px));">
        <BingTabs v-model="pillValue" :items="items" variant="pill" />
        <BingTabs v-model="glassValue" :items="items" variant="glass" />
        <BingTabs v-model="softValue" :items="items" variant="soft" />
      </div>
    `,
  }),
}

export const RichItems: Story = {
  name: '丰富选项',
  render: () => ({
    components: { BingTabs },
    setup() {
      const value = ref<BingTabValue>('overview')
      const richItems: BingTabItem[] = [
        { value: 'overview', label: '概览', tone: '#f472b6', count: 12 },
        { value: 'details', label: '详情', tone: '#0ea5e9', count: 4 },
        { value: 'metrics', label: '统计', tone: '#10b981', count: 8 },
        { value: 'locked', label: '已锁定', tone: '#94a3b8', count: 0, disabled: true },
      ]

      return {
        value,
        richItems,
      }
    },
    template: `
      <div style="display: grid; gap: 12px; width: min(520px, calc(100vw - 48px));">
        <BingTabs v-model="value" :items="richItems" variant="glass">
          <template #item="{ item }">
            <span
              style="width: 8px; height: 8px; border-radius: 999px;"
              :style="{ background: item.tone }"
            />
            <span>{{ item.label }}</span>
            <small
              style="display: inline-grid; min-width: 20px; height: 20px; place-items: center; border-radius: 999px; background: rgb(var(--bing-highlight-rgb) / 0.24); font-size: 0.72rem;"
            >
              {{ item.count }}
            </small>
          </template>
        </BingTabs>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  name: '尺寸与状态',
  render: () => ({
    components: { BingTabs },
    setup: () => ({ items }),
    template: `<div style="display: grid; gap: 16px; width: min(520px, calc(100vw - 48px));">
      <BingTabs v-for="size in ['sm', 'md', 'lg']" :key="size" :items="items" :size="size" variant="soft" />
      <BingTabs :items="items" disabled variant="glass" />
    </div>`,
  }),
}

export const Overflow: Story = {
  name: '溢出与键盘切换',
  args: {
    activation: 'manual',
    block: true,
    items: Array.from({ length: 12 }, (_, i) => ({ value: i, label: '工作区 ' + (i + 1), disabled: i === 1 })),
    modelValue: 0,
  },
}
