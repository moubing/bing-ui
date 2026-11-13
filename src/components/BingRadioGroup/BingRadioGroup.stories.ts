import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import BingRadioGroup from './BingRadioGroup.vue'
import type { BingRadioGroupProps } from './BingRadioGroup.types'

const options = [
  { label: '道路底图', value: 'aurora', description: '显示道路与地名' },
  { label: '卫星影像', value: 'orbit', description: '查看地表细节' },
  { label: '空白底图', value: 'blank' },
  { label: '归档底图', value: 'static', disabled: true },
]

const meta = {
  title: 'Components/BingRadioGroup',
  component: BingRadioGroup,
  tags: ['autodocs'],
  args: {
    modelValue: 'aurora',
    options,
    direction: 'wrap',
    disabled: false,
    size: 'md',
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
  },
  render: (args) => ({
    components: { BingRadioGroup },
    setup() {
      const value = ref(args.modelValue)

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue
        },
      )

      return { args, value }
    },
    template: `
      <div style="width: min(540px, calc(100vw - 48px));">
      <BingRadioGroup
        v-model="value"
        :options="args.options"
        :direction="args.direction"
        :disabled="args.disabled"
        :size="args.size"
        :status="args.status"
        aria-label="地图底图"
      />
      </div>
    `,
  }),
} satisfies Meta<BingRadioGroupProps>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const Column: Story = {
  name: '纵向说明',
  args: { direction: 'column' },
}

export const Disabled: Story = {
  name: '禁用',
  args: { disabled: true },
}

export const Simple: Story = {
  name: '单行选项',
  args: { options: options.map(({ description, ...option }) => option) },
}

export const Sizes: Story = {
  name: '三档尺寸',
  render: () => ({
    components: { BingRadioGroup },
    setup() { return { sizes: ['sm', 'md', 'lg'], options, selected: ref(['aurora', 'aurora', 'aurora']) } },
    template: `
      <div style="display: grid; gap: 24px; width: min(540px, calc(100vw - 48px));">
        <section v-for="(size, index) in sizes" :key="size" style="display: grid; gap: 8px;">
          <span style="font-size: 12px; color: var(--bing-muted);">{{ { xs: '超小', sm: '小', md: '中', lg: '大', xl: '超大' }[size] }}</span>
          <BingRadioGroup v-model="selected[index]" :size="size" :options="options" :aria-label="size + ' 底图'" />
        </section>
      </div>
    `,
  }),
}
