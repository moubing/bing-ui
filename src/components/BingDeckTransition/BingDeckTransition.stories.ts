import { ref, watch } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BingDeckTransition from './BingDeckTransition.vue'
import type { BingDeckTransitionItem } from './BingDeckTransition.types'

type PanelKey = 'overview' | 'details' | 'metrics'

interface StoryArgs {
  initialPanel: PanelKey
  disabled: boolean
  respectReducedMotion: boolean
  showControls: boolean
}

const panels: BingDeckTransitionItem[] = [
  {
    value: 'overview',
    label: '概览',
    title: '创作空间概要',
    summary: '当前卡片轻轻移出，下一张卡片来到面前。',
  },
  {
    value: 'details',
    label: '详细信息',
    title: '查看项目详情',
    summary: '内容依次展开，卡片之间保留清晰的层次。',
  },
  {
    value: 'metrics',
    label: '指标',
    title: '跟进项目进度',
    summary: '查看下一项内容，随时回到熟悉的工作视图。',
  },
]

const panelStyle = {
  display: 'grid',
  alignContent: 'center',
  gap: '12px',
  minWidth: '0',
}

const headingStyle = {
  margin: '0',
  color: 'var(--bing-heading)',
  fontSize: '18px',
  fontWeight: '500',
  lineHeight: '26px',
}

const summaryStyle = {
  margin: '0',
  color: 'var(--bing-muted)',
  fontSize: '14px',
  lineHeight: '1.6',
}

function getIconStyle() {
  return {
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    border: '1px solid var(--bing-border)',
    background: 'var(--bing-surface-soft)',
    color: 'var(--bing-heading)',
    fontSize: '14px',
    fontWeight: '500',
  }
}

const meta = {
  title: 'Components/BingDeckTransition',
  component: BingDeckTransition,
  args: {
    initialPanel: 'overview',
    disabled: false,
    respectReducedMotion: true,
    showControls: true,
  },
  argTypes: {
    initialPanel: {
      control: 'inline-radio',
      options: ['overview', 'details', 'metrics'],
    },
  },
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<StoryArgs>

export const Basic: Story = {
  name: '基础示例',
  render: (args) => ({
    components: { BingDeckTransition },
    setup() {
      const active = ref<PanelKey>(args.initialPanel)

      watch(
        () => args.initialPanel,
        (value) => {
          active.value = value
        },
      )

      return {
        active,
        args,
        panels,
        panelStyle,
        headingStyle,
        summaryStyle,
        getIconStyle,
      }
    },
    template: `
      <BingDeckTransition
        v-model="active"
        :items="panels"
        :disabled="args.disabled"
        :respect-reduced-motion="args.respectReducedMotion"
        :show-controls="args.showControls"
        control-label="下一张"
      >
        <template #default="{ item }">
          <div :style="panelStyle">
            <span :style="getIconStyle()">
              {{ item.label.slice(0, 1) }}
            </span>
            <h3 :style="headingStyle">{{ item.title }}</h3>
            <p :style="summaryStyle">{{ item.summary }}</p>
          </div>
        </template>
      </BingDeckTransition>
    `,
  }),
  parameters: {
    docs: {
      source: {
        code: `
<BingDeckTransition v-model="active" :items="items">
  <template #default="{ item, active }">
    <YourCard :item="item" :active="active" />
  </template>
</BingDeckTransition>
        `.trim(),
      },
    },
  },
}

export const Disabled: Story = {
  ...Basic,
  name: '禁用切换',
  args: { disabled: true },
}

export const WithoutControls: Story = {
  ...Basic,
  name: '横向滚动切换',
  args: { showControls: false },
}
