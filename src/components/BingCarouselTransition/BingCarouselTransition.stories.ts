import { ref, watch } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BingCarouselTransition from './BingCarouselTransition.vue'
import type { BingCarouselTransitionItem } from './BingCarouselTransition.types'

type PanelKey = 'overview' | 'details' | 'metrics'

interface StoryArgs {
  initialPanel: PanelKey
  disabled: boolean
  respectReducedMotion: boolean
  showTabs: boolean
}

const panels: BingCarouselTransitionItem[] = [
  {
    value: 'overview',
    label: '概览',
    title: '创作空间概要',
    summary: '在不同内容之间平滑滑动，保持清晰的方向感。',
  },
  {
    value: 'details',
    label: '详细信息',
    title: '查看项目详情',
    summary: '选中的页面平移到视野中央，继续查看完整内容。',
  },
  {
    value: 'metrics',
    label: '指标',
    title: '跟进项目进度',
    summary: '在工作视图之间切换，保留原有内容和布局。',
  },
]

const panelStyle = {
  boxSizing: 'border-box',
  display: 'grid',
  alignContent: 'center',
  gap: '12px',
  minHeight: '200px',
  padding: '16px',
  borderRadius: '6px',
  background: 'var(--bing-surface-soft)',
}

const contentStyle = {
  display: 'grid',
  gap: '8px',
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
    background: 'var(--bing-surface-solid)',
    color: 'var(--bing-heading)',
    fontSize: '14px',
    fontWeight: '500',
  }
}

const meta = {
  title: 'Components/BingCarouselTransition',
  component: BingCarouselTransition,
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
    components: { BingCarouselTransition },
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
      <BingCarouselTransition
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
      </BingCarouselTransition>
    `,
  }),
  parameters: {
    docs: {
      source: {
        code: `
<BingCarouselTransition v-model="active" :items="items">
  <template #default="{ item, active, isAnimating }">
    <YourPanel :item="item" :active="active" :animating="isAnimating" />
  </template>
</BingCarouselTransition>
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

export const ManyTabs: Story = {
  name: '长标签滚动',
  render: () => ({
    components: { BingCarouselTransition },
    setup: () => ({
      panels: Array.from({ length: 18 }, (_, index) => ({
        value: index,
        label: `项目工作视图 ${index + 1}`,
      })),
    }),
    template: `
      <BingCarouselTransition :items="panels">
        <template #default="{ item }">
          <div style="padding: 16px;">{{ item.label }}</div>
        </template>
      </BingCarouselTransition>
    `,
  }),
}
