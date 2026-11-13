import { ref, watch } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BingAppSwitcherTransition from '../components/BingAppSwitcherTransition/BingAppSwitcherTransition.vue'
import BingCarouselTransition from '../components/BingCarouselTransition/BingCarouselTransition.vue'
import BingDeckTransition from '../components/BingDeckTransition/BingDeckTransition.vue'

type PanelKey = 'overview' | 'details' | 'metrics'

type StoryArgs = {
  initialPanel: PanelKey
  disabled: boolean
  respectReducedMotion: boolean
}

const panels = [
  {
    value: 'overview',
    label: '概览',
    title: '自然衔接不同状态',
    summary: '面板离开与进入时保持连贯的过渡。',
    accent: '#f472b6',
    stats: '状态一',
  },
  {
    value: 'details',
    label: '详情',
    title: '层次分明的切换动效',
    summary: '卡片、内容和操作区按顺序切换，清晰呈现状态变化。',
    accent: '#0ea5e9',
    stats: '状态二',
  },
  {
    value: 'metrics',
    label: '统计',
    title: '可复用的切换效果',
    summary: '通过轮播、卡组和应用切换，体验连贯的状态变化。',
    accent: '#10b981',
    stats: '状态三',
  },
] satisfies Array<{
  value: PanelKey
  label: string
  title: string
  summary: string
  accent: string
  stats: string
}>

const meta = {
  title: 'Motion/GSAP Transitions',
  parameters: {
    docs: {
      description: {
        component:
          '可复用的 GSAP 状态切换组件。可从 @moubing/bing-ui 导入轮播、卡组或应用切换组件，通过插槽渲染自定义内容。',
      },
    },
  },
  argTypes: {
    disabled: {
      description: '更新状态时关闭 GSAP 动画。',
      control: 'boolean',
    },
    respectReducedMotion: {
      description: '开启减少动态效果时跳过 GSAP 动画。',
      control: 'boolean',
    },
    initialPanel: {
      description: '示例初始显示的面板。',
      control: 'inline-radio',
      options: ['overview', 'details', 'metrics'],
    },
  },
  args: {
    disabled: false,
    respectReducedMotion: true,
    initialPanel: 'overview',
  },
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<StoryArgs>

function useStoryState(args: StoryArgs) {
  const active = ref<PanelKey>(args.initialPanel)

  watch(
    () => args.initialPanel,
    (value) => {
      active.value = value
    },
  )

  return {
    active,
  }
}

const previewStyles = {
  card: {
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'center',
    gap: '18px',
    minHeight: '176px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.78)',
    borderRadius: '18px',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.76), rgba(255,255,255,0.36))',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.86)',
  },
  deckCard: {
    display: 'grid',
    gap: '18px',
    alignContent: 'center',
    minWidth: '0',
  },
  appCard: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    gap: '16px',
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
  },
  appName: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--bing-heading)',
    fontWeight: '820',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'center',
    gap: '20px',
    minWidth: '0',
  },
  content: {
    display: 'grid',
    gap: '8px',
    minWidth: '0',
  },
  title: {
    margin: '0',
    color: 'var(--bing-heading)',
    fontSize: '1.45rem',
    lineHeight: '1.12',
  },
  summary: {
    margin: '0',
    color: 'var(--bing-text)',
    lineHeight: '1.6',
  },
  note: {
    color: 'var(--bing-muted)',
    fontWeight: '700',
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  footerPill: {
    height: '10px',
    borderRadius: '999px',
    background:
      'linear-gradient(90deg, rgba(148,163,184,0.22), rgba(255,255,255,0.66))',
  },
}

function getOrbStyle(accent: string, size = 108) {
  return {
    display: 'grid',
    placeItems: 'center',
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${Math.round(size * 0.26)}px`,
    background: `linear-gradient(135deg, ${accent}, rgba(17, 24, 39, 0.88))`,
    color: '#ffffff',
    fontSize: '0.82rem',
    fontWeight: '820',
    boxShadow: `0 18px 42px ${accent}44`,
  }
}

export const Carousel: Story = {
  name: '轮播切换',
  render: (args) => ({
    components: {
      BingCarouselTransition,
    },
    setup() {
      return {
        ...useStoryState(args),
        args,
        panels,
        previewStyles,
        getOrbStyle,
      }
    },
    template: `
      <BingCarouselTransition
        v-model="active"
        :items="panels"
        :disabled="args.disabled"
        :respect-reduced-motion="args.respectReducedMotion"
      >
        <template #default="{ item }">
          <div :style="previewStyles.card">
            <div :style="getOrbStyle(item.accent)">
              {{ item.stats }}
            </div>

            <div :style="previewStyles.content">
              <h3 :style="previewStyles.title">
                {{ item.title }}
              </h3>
              <p :style="previewStyles.summary">{{ item.summary }}</p>
              <small :style="previewStyles.note">
                BingCarouselTransition
              </small>
            </div>
          </div>
        </template>
      </BingCarouselTransition>
    `,
  }),
}

export const Deck: Story = {
  name: '卡组切换',
  render: (args) => ({
    components: {
      BingDeckTransition,
    },
    setup() {
      return {
        ...useStoryState(args),
        args,
        panels,
        previewStyles,
        getOrbStyle,
      }
    },
    template: `
      <BingDeckTransition
        v-model="active"
        :items="panels"
        :disabled="args.disabled"
        :respect-reduced-motion="args.respectReducedMotion"
      >
        <template #default="{ item }">
          <div :style="previewStyles.deckCard">
            <div :style="getOrbStyle(item.accent, 76)" />
            <h3 :style="previewStyles.title">{{ item.title }}</h3>
            <p :style="previewStyles.summary">{{ item.summary }}</p>
          </div>
        </template>
      </BingDeckTransition>
    `,
  }),
}

export const AppSwitcher: Story = {
  name: '应用切换',
  render: (args) => ({
    components: {
      BingAppSwitcherTransition,
    },
    setup() {
      return {
        ...useStoryState(args),
        args,
        panels,
        previewStyles,
        getOrbStyle,
      }
    },
    template: `
      <BingAppSwitcherTransition
        v-model="active"
        :items="panels"
        :disabled="args.disabled"
        :respect-reduced-motion="args.respectReducedMotion"
      >
        <template #default="{ item }">
          <div :style="previewStyles.appCard">
            <header :style="previewStyles.header">
              <span :style="previewStyles.appName">
                <span
                  :style="{
                    width: '9px',
                    height: '9px',
                    borderRadius: '999px',
                    background: item.accent,
                    opacity: 0.42,
                  }"
                />
                {{ item.label }}
              </span>
              <span style="color: var(--bing-muted); font-weight: 760;">
                {{ item.stats }}
              </span>
            </header>

            <div :style="previewStyles.body">
              <div :style="getOrbStyle(item.accent, 112)">
                {{ item.stats }}
              </div>

              <div :style="previewStyles.content">
                <h3 :style="previewStyles.title">{{ item.title }}</h3>
                <p :style="previewStyles.summary">{{ item.summary }}</p>
              </div>
            </div>

            <footer :style="previewStyles.footer" aria-hidden="true">
              <span
                v-for="footerItem in 3"
                :key="footerItem"
                :style="previewStyles.footerPill"
              />
            </footer>
          </div>
        </template>
      </BingAppSwitcherTransition>
    `,
  }),
}
