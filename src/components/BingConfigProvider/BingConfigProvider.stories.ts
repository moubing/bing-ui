import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BingAnimatedText from '../BingAnimatedText/BingAnimatedText.vue'
import BingButton from '../BingButton/BingButton.vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingTabs from '../BingTabs/BingTabs.vue'
import BingTag from '../BingTag/BingTag.vue'
import BingTooltip from '../BingTooltip/BingTooltip.vue'
import BingConfigProvider from './BingConfigProvider.vue'
import type { BingConfigProviderProps } from './BingConfigProvider.types'

const meta = {
  title: 'Components/BingConfigProvider',
  component: BingConfigProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '为子树提供默认尺寸、浮层层级基准和动效策略。组件显式传入的 props 始终优先；嵌套 Provider 只覆盖自己设置的字段。',
      },
    },
  },
  argTypes: {
    size: {
      description: '未显式传入 `size` 的组件使用的默认尺寸。',
      control: 'inline-radio',
      options: [undefined, 'sm', 'md', 'lg'],
    },
    zIndex: {
      description: '浮层层级基准，默认 2000。弹窗、消息、预览、下拉、提示按固定偏移叠加。',
      control: { type: 'number', step: 100 },
    },
    reducedMotion: {
      description: '`user` 跟随系统设置，`always` 始终减少动效，`never` 始终完整播放。',
      control: 'inline-radio',
      options: ['user', 'always', 'never'],
    },
  },
  args: {
    size: 'lg',
    zIndex: 2000,
    reducedMotion: 'user',
  },
  render: (args) => ({
    components: {
      BingAnimatedText,
      BingButton,
      BingCheckbox,
      BingConfigProvider,
      BingInput,
      BingSelect,
      BingTabs,
      BingTag,
      BingTooltip,
    },
    setup() {
      const text = ref('')
      const fruit = ref<string | number | null>('apple')
      const checked = ref(true)
      const tab = ref('overview')
      const options = [
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana' },
        { label: '樱桃', value: 'cherry' },
      ]
      const tabs = [
        { value: 'overview', label: '概览' },
        { value: 'details', label: '详情' },
        { value: 'activity', label: '动态' },
      ]
      return { args, text, fruit, checked, tab, options, tabs }
    },
    template: `
      <BingConfigProvider :size="args.size" :z-index="args.zIndex" :reduced-motion="args.reducedMotion">
        <div style="display: grid; gap: 18px; max-width: 520px;">
          <BingAnimatedText effect="shine" trigger="always">跟随全局动效策略的流光文字</BingAnimatedText>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
            <BingButton>继承尺寸</BingButton>
            <BingButton size="sm" variant="secondary">显式 sm</BingButton>
            <BingTag label="标签" />
            <BingCheckbox v-model="checked" label="复选框" />
          </div>
          <BingInput v-model="text" placeholder="输入框继承全局尺寸" />
          <BingSelect v-model="fruit" :options="options" placeholder="选择水果" />
          <BingTabs v-model="tab" :items="tabs" />
          <div>
            <BingTooltip content="提示层级 = 基准 + 1200">
              <BingButton variant="ghost">悬停查看提示</BingButton>
            </BingTooltip>
          </div>
        </div>
      </BingConfigProvider>
    `,
  }),
} satisfies Meta<BingConfigProviderProps>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const Nested: Story = {
  name: '嵌套覆盖',
  render: () => ({
    components: { BingButton, BingConfigProvider, BingInput },
    template: `
      <BingConfigProvider size="lg">
        <div style="display: grid; gap: 14px; max-width: 420px;">
          <BingInput placeholder="外层 lg" />
          <BingConfigProvider size="sm">
            <div style="display: flex; gap: 10px;">
              <BingInput placeholder="内层 sm" />
              <BingButton>内层 sm</BingButton>
            </div>
          </BingConfigProvider>
        </div>
      </BingConfigProvider>
    `,
  }),
}
