import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { ref } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingTag from './BingTag.vue'
import type { BingTagProps } from './BingTag.types'

type StoryArgs = BingTagProps & {
  onClose: (event: MouseEvent) => void
}

const meta = {
  title: 'Components/BingTag',
  component: BingTag,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    tone: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'neutral', 'success', 'danger', 'warning'],
    },
    variant: {
      control: 'inline-radio',
      options: ['glass', 'soft'],
    },
    closable: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    onClose: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    label: '道路图层',
    size: 'md',
    tone: 'primary',
    variant: 'glass',
    closable: true,
    disabled: false,
    onClose: fn(),
  },
  render: (args) => ({
    components: { BingTag },
    setup() {
      return { args }
    },
    template: `
      <BingTag
        :label="args.label"
        :size="args.size"
        :tone="args.tone"
        :variant="args.variant"
        :closable="args.closable"
        :disabled="args.disabled"
        :close-aria-label="args.closeAriaLabel"
        @close="args.onClose"
      />
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const States: Story = {
  name: '颜色与状态',
  render: () => ({
    components: { BingTag },
    setup() {
      return { tones: [
        { tone: 'primary', label: '道路图层' },
        { tone: 'secondary', label: '协作中' },
        { tone: 'neutral', label: '草稿' },
        { tone: 'success', label: '已发布' },
        { tone: 'danger', label: '已阻止' },
        { tone: 'warning', label: '待审核' },
      ] }
    },
    template: `
      <div style="display: grid; gap: 20px; width: min(540px, calc(100vw - 48px));">
        <div v-for="variant in ['glass', 'soft']" :key="variant" style="display: grid; gap: 8px;">
          <span style="font-size: 12px; color: var(--bing-muted);">{{ variant === 'glass' ? '细边框' : '柔和填充' }}</span>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <BingTag v-for="item in tones" :key="item.tone" :label="item.label" :tone="item.tone" :variant="variant" />
          </div>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <BingTag label="可移除" closable />
          <BingTag label="已锁定" closable disabled />
          <BingTag label="已归档" tone="success" variant="soft" disabled />
        </div>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  name: '尺寸与长文本',
  render: () => ({
    components: { BingTag },
    template: `
      <div style="display: grid; gap: 20px; width: min(380px, calc(100vw - 48px));">
        <div v-for="size in ['sm', 'md', 'lg']" :key="size" style="display: grid; gap: 8px; min-width: 0;">
          <span style="font-size: 12px; color: var(--bing-muted);">{{ { xs: '超小', sm: '小', md: '中', lg: '大', xl: '超大' }[size] }}</span>
          <div style="display: flex; gap: 8px; align-items: center; min-width: 0;">
            <BingTag label="道路" :size="size" closable />
            <BingTag label="城市道路与公共交通设施完整数据图层" :size="size" closable style="max-width: 220px;" />
          </div>
        </div>
      </div>
    `,
  }),
}

export const Removable: Story = {
  name: '移除标签',
  render: () => ({
    components: { BingTag, BingButton },
    setup() {
      const initial = ['道路', '建筑', '水系']
      const labels = ref([...initial])
      return { labels, remove: (label: string) => { labels.value = labels.value.filter(item => item !== label) }, reset: () => { labels.value = [...initial] } }
    },
    template: `
      <div style="display: grid; gap: 16px; width: min(380px, calc(100vw - 48px));">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 24px;">
          <BingTag v-for="label in labels" :key="label" :label="label" closable :close-aria-label="'移除' + label" @close="remove(label)" />
          <BingTag label="边界（锁定）" closable disabled close-aria-label="移除边界" />
        </div>
        <BingButton variant="outline" size="sm" style="justify-self: start;" @click="reset">恢复标签</BingButton>
      </div>
    `,
  }),
}
