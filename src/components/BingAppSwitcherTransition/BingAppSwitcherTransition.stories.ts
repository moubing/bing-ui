import { ref, watch } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BingAppSwitcherTransition from './BingAppSwitcherTransition.vue'
import type { BingAppSwitcherTransitionItem } from './BingAppSwitcherTransition.types'

type PanelKey = 'overview' | 'details' | 'metrics'

interface StoryArgs {
  initialPanel: PanelKey
  disabled: boolean
  respectReducedMotion: boolean
  showTabs: boolean
}

const panels: BingAppSwitcherTransitionItem[] = [
  {
    value: 'overview',
    label: '概览',
    title: '创作空间概要',
    summary: '在项目内容之间切换，保持清晰的方向感。',
  },
  {
    value: 'details',
    label: '详细信息',
    title: '查看项目详情',
    summary: '收拢当前页面，再将选中的内容展开。',
  },
  {
    value: 'metrics',
    label: '指标',
    title: '跟进项目进度',
    summary: '复用现有页面内容，在多个工作视图之间切换。',
  },
]

const panelStyle = {
  boxSizing: 'border-box',
  display: 'grid',
  alignContent: 'center',
  gap: '16px',
  minHeight: '100%',
  padding: '0',
}

const contentStyle = {
  display: 'grid',
  gap: '8px',
}

const headingStyle = {
  margin: '0',
  color: 'var(--bing-heading)',
  fontSize: '20px',
  fontWeight: '500',
  lineHeight: '28px',
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
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    border: '1px solid var(--bing-border)',
    background: 'var(--bing-surface-soft)',
    color: 'var(--bing-heading)',
    fontSize: '16px',
    fontWeight: '500',
  }
}

const meta = {
  title: 'Components/BingAppSwitcherTransition',
  component: BingAppSwitcherTransition,
  args: {
    initialPanel: 'overview',
    disabled: false,
    respectReducedMotion: true,
    showTabs: true,
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
    components: { BingAppSwitcherTransition },
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
        contentStyle,
        headingStyle,
        summaryStyle,
        getIconStyle,
      }
    },
    template: `
      <BingAppSwitcherTransition
        v-model="active"
        :items="panels"
        :disabled="args.disabled"
        :respect-reduced-motion="args.respectReducedMotion"
        :show-tabs="args.showTabs"
      >
        <template #default="{ item }">
          <div :style="panelStyle">
            <span :style="getIconStyle()">
              {{ item.label.slice(0, 1) }}
            </span>
            <div :style="contentStyle">
              <h3 :style="headingStyle">{{ item.title }}</h3>
              <p :style="summaryStyle">{{ item.summary }}</p>
            </div>
          </div>
        </template>
      </BingAppSwitcherTransition>
    `,
  }),
  parameters: {
    docs: {
      source: {
        code: `
<BingAppSwitcherTransition v-model="active" :items="items">
  <template #default="{ item, isAnimating }">
    <YourScreen :item="item" :animating="isAnimating" />
  </template>
</BingAppSwitcherTransition>
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

export const WithoutTabs: Story = {
  ...Basic,
  name: '横向滚动切换',
  args: { showTabs: false },
}
