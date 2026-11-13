import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import BingCheckboxGroup from './BingCheckboxGroup.vue'
import type { BingCheckboxGroupProps } from './BingCheckboxGroup.types'

const options = [
  { label: '道路图层', value: 'hover', description: '道路与交通网络' },
  { label: '行政边界', value: 'focus', description: '地区边界与名称' },
  { label: '兴趣点', value: 'press' },
  { label: '归档数据', value: 'archived', description: '当前不可选择', disabled: true },
]

const meta = {
  title: 'Components/BingCheckboxGroup',
  component: BingCheckboxGroup,
  tags: ['autodocs'],
  args: {
    modelValue: ['hover'],
    options,
    direction: 'wrap',
    dragSelect: false,
    rangeSelect: false,
    disabled: false,
    size: 'md',
    status: 'default',
  },
  argTypes: {
    direction: {
      control: 'inline-radio',
      options: ['row', 'column', 'wrap'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    status: {
      control: 'inline-radio',
      options: ['default', 'success', 'warning', 'error'],
    },
  },
  render: (args) => ({
    components: { BingCheckboxGroup },
    setup() {
      const value = ref(args.modelValue)

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue ?? []
        },
      )

      return { args, value }
    },
    template: `
      <div style="width: min(540px, calc(100vw - 48px));">
      <BingCheckboxGroup
        v-model="value"
        :options="args.options"
        :direction="args.direction"
        :drag-select="args.dragSelect"
        :range-select="args.rangeSelect"
        :disabled="args.disabled"
        :size="args.size"
        :status="args.status"
        aria-label="显示的图层"
      />
      </div>
    `,
  }),
} satisfies Meta<BingCheckboxGroupProps>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const Success: Story = {
  name: '成功状态',
  args: {
    status: 'success',
  },
}

export const Column: Story = {
  name: '纵向说明',
  args: { direction: 'column' },
}

export const Disabled: Story = {
  name: '禁用',
  args: { disabled: true },
}

export const Sizes: Story = {
  name: '三档尺寸',
  render: () => ({
    components: { BingCheckboxGroup },
    setup() { return { options, sizes: ['sm', 'md', 'lg'], selected: ref([['hover'], ['hover'], ['hover']]) } },
    template: `
      <div style="display: grid; gap: 24px; width: min(540px, calc(100vw - 48px));">
        <section v-for="(size, index) in sizes" :key="size" style="display: grid; gap: 8px;">
          <span style="font-size: 12px; color: var(--bing-muted);">{{ { xs: '超小', sm: '小', md: '中', lg: '大', xl: '超大' }[size] }}</span>
          <BingCheckboxGroup v-model="selected[index]" :options="options" :size="size" :aria-label="size + ' 图层'" />
        </section>
      </div>
    `,
  }),
}
