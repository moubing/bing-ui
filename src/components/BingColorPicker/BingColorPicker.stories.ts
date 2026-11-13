import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import { fn } from 'storybook/test'
import BingColorPicker from './BingColorPicker.vue'
import type {
  BingColorPickerChangePayload,
  BingColorPickerCopyPayload,
  BingColorPickerPresetInput,
  BingColorPickerProps,
} from './BingColorPicker.types'

type StoryArgs = BingColorPickerProps & {
  onChange: (payload: BingColorPickerChangePayload) => void
  onCopy: (payload: BingColorPickerCopyPayload) => void
  onCopyError: (error: Error) => void
  onOpen: () => void
  onClose: () => void
}

const productPresets: BingColorPickerPresetInput[] = [
  { label: '冰粉', value: '#ec4899' },
  { label: '信号玫红', value: '#f43f5e' },
  { label: '舞台琥珀', value: '#f59e0b' },
  { label: '柔金', value: '#eab308' },
  { label: '活力青柠', value: '#84cc16' },
  { label: '玻璃翡翠', value: '#10b981' },
  { label: '青色', value: '#06b6d4' },
  { label: '天蓝', value: '#0ea5e9' },
  { label: '亮蓝', value: '#3b82f6' },
  { label: '靛蓝轨迹', value: '#6366f1' },
  { label: '紫罗兰印记', value: '#8b5cf6' },
  { label: '品红', value: '#d946ef' },
  { label: '面板蓝灰', value: '#334155' },
  { label: '墨黑', value: '#111827' },
  { label: '瓷白', value: '#f8fafc' },
  { label: '浅粉', value: '#fdf2f8' },
]

const meta = {
  title: 'Components/BingColorPicker',
  component: BingColorPicker,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'color',
    },
    presets: {
      control: false,
    },
    disabled: {
      control: 'boolean',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    block: {
      control: 'boolean',
    },
    width: {
      control: 'text',
    },
    minWidth: {
      control: 'text',
    },
    panelWidth: {
      control: {
        type: 'number',
        min: 300,
        max: 520,
        step: 4,
      },
    },
    copyLabel: {
      control: 'text',
    },
    copiedLabel: {
      control: 'text',
    },
    copyResetDelay: {
      control: {
        type: 'number',
        min: 300,
        max: 3000,
        step: 100,
      },
    },
    ariaLabel: {
      control: 'text',
    },
    onChange: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onCopy: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onCopyError: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onOpen: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onClose: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    modelValue: '#ec4899',
    presets: productPresets,
    disabled: false,
    size: 'md',
    block: false,
    width: undefined,
    minWidth: 180,
    panelWidth: 320,
    copyLabel: '复制',
    copiedLabel: '已复制',
    copyResetDelay: 1400,
    ariaLabel: undefined,
    onChange: fn(),
    onCopy: fn(),
    onCopyError: fn(),
    onOpen: fn(),
    onClose: fn(),
  },
  render: (args) => ({
    components: { BingColorPicker },
    setup() {
      const value = ref(args.modelValue ?? '#ec4899')

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue ?? '#ec4899'
        },
      )

      return {
        args,
        value,
      }
    },
    template: `
      <div style="width: min(280px, calc(100vw - 48px));">
      <BingColorPicker
        v-model="value"
        :presets="args.presets"
        :disabled="args.disabled"
        :size="args.size"
        :block="args.block"
        :width="args.width"
        :min-width="args.minWidth"
        :panel-width="args.panelWidth"
        :copy-label="args.copyLabel"
        :copied-label="args.copiedLabel"
        :copy-reset-delay="args.copyResetDelay"
        :aria-label="args.ariaLabel"
        :status="args.status"
        :glass="args.glass"
        :glass-blur="args.glassBlur"
        :glass-opacity="args.glassOpacity"
        :glass-saturation="args.glassSaturation"
        @change="args.onChange"
        @copy="args.onCopy"
        @copy-error="args.onCopyError"
        @open="args.onOpen"
        @close="args.onClose"
      />
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const CustomPresets: Story = {
  name: '自定义色板',
  args: {
    modelValue: '#0ea5e9',
    presets: [
      '#0f172a',
      '#1e293b',
      '#0ea5e9',
      '#06b6d4',
      '#22c55e',
      '#eab308',
      '#f97316',
      '#f43f5e',
      '#ec4899',
      '#d946ef',
      '#a855f7',
      '#6366f1',
      '#3b82f6',
      '#334155',
      '#f8fafc',
      '#ffffff',
    ],
  },
}

export const Sizes: Story = {
  name: '三档尺寸',
  render: () => ({
    components: { BingColorPicker },
    setup() {
      const small = ref('#f43f5e')
      const medium = ref('#10b981')
      const large = ref('#6366f1')

      return {
        large,
        medium,
        productPresets,
        small,
      }
    },
    template: `
      <div style="display: grid; width: min(280px, calc(100vw - 48px)); gap: 14px;">
        <BingColorPicker v-model="small" :presets="productPresets" size="sm" />
        <BingColorPicker v-model="medium" :presets="productPresets" size="md" />
        <BingColorPicker v-model="large" :presets="productPresets" size="lg" />
      </div>
    `,
  }),
}

export const Block: Story = {
  name: '填满容器',
  args: {
    modelValue: '#8b5cf6',
    block: true,
  },
  render: (args) => ({
    components: { BingColorPicker },
    setup() {
      const value = ref(args.modelValue ?? '#8b5cf6')

      return {
        args,
        value,
      }
    },
    template: `
      <div style="width: min(520px, calc(100vw - 48px));">
        <BingColorPicker
          v-model="value"
          :presets="args.presets"
          :block="args.block"
          :panel-width="args.panelWidth"
          @change="args.onChange"
        />
      </div>
    `,
  }),
}

export const States: Story = {
  name: '状态与透明度',
  render: () => ({
    components: { BingColorPicker },
    setup() {
      const colors = ref(['#0ea5e9', '#10b981', '#f59e0b', '#ec489980', '#0ea5e9'])
      return { colors }
    },
    template: `
      <div style="display: grid; width: min(280px, calc(100vw - 48px)); gap: 14px;">
        <BingColorPicker v-model="colors[0]" status="error" aria-label="错误颜色" />
        <BingColorPicker v-model="colors[1]" status="success" aria-label="成功颜色" />
        <BingColorPicker v-model="colors[2]" status="warning" aria-label="警告颜色" />
        <BingColorPicker v-model="colors[3]" aria-label="半透明颜色" />
        <BingColorPicker v-model="colors[4]" disabled aria-label="禁用颜色" />
      </div>
    `,
  }),
}
