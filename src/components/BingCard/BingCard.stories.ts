import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ArrowRight, Sparkles } from '@lucide/vue'
import { fn } from 'storybook/test'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingCard from './BingCard.vue'
import type { BingCardProps } from './BingCard.types'

type StoryArgs = BingCardProps & {
  body: string
  footerText: string
  onEnter: () => void
  onLongPress: () => void
  onFlip: (side: 'front' | 'back') => void
}

const meta = {
  title: 'Components/BingCard',
  component: BingCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
BingCard 提供随指针变化的三维倾斜和进入视口时的入场动画。

- 通过 header、media、default 和 footer 插槽组织卡片内容。
- 使用 GSAP 实现倾斜复位、高光跟随、入场动画和翻面效果。
- 支持点击或长按切换背面，并可配置入场预设、旋转圈数和动画节奏。
        `,
      },
    },
  },
  argTypes: {
    title: {
      description: '默认标题区显示的卡片标题。',
      control: 'text',
    },
    description: {
      description: '显示在标题下方的卡片描述。',
      control: 'text',
    },
    body: {
      description: '仅用于 Storybook 默认插槽演示的正文。',
      control: 'text',
      table: {
        disable: true,
      },
    },
    footerText: {
      description: '仅用于 Storybook 演示的底部按钮文字。',
      control: 'text',
      table: {
        disable: true,
      },
    },
    variant: {
      description: '视觉风格预设。',
      control: 'inline-radio',
      options: ['plain', 'soft', 'accent', 'sky'],
    },
    padding: {
      description: '内部间距预设。',
      control: 'inline-radio',
      options: ['none', 'sm', 'md', 'lg'],
    },
    rounded: {
      description: '卡片圆角预设。',
      control: 'inline-radio',
      options: ['none', 'sm', 'md', 'lg', 'xl', 'full'],
    },
    glass: {
      description: '开启玻璃表面模糊。',
      control: 'boolean',
    },
    interactive: {
      description: '开启指针交互样式。',
      control: 'boolean',
    },
    tilt: {
      description: '开启随鼠标位置变化的三维倾斜。',
      control: 'boolean',
    },
    tiltMax: {
      description: '最大倾斜角度，单位为度。',
      control: {
        type: 'number',
        min: 0,
        max: 18,
        step: 1,
      },
    },
    tiltScale: {
      description: '指针倾斜生效时的缩放比例。',
      control: {
        type: 'number',
        min: 1,
        max: 1.08,
        step: 0.005,
      },
    },
    glare: {
      description: '显示跟随指针的柔和高光。',
      control: 'boolean',
    },
    entrance: {
      description: '进入视口时的动画预设。',
      control: 'inline-radio',
      options: ['none', 'fade-up', 'bubble', 'rotate-up', 'soft-pop'],
    },
    entranceOnce: {
      description: '进入视口动画仅播放一次。',
      control: 'boolean',
    },
    entranceDelay: {
      description: '入场动画延迟，单位为秒。',
      control: {
        type: 'number',
        min: 0,
        max: 3,
        step: 0.05,
      },
    },
    entranceDuration: {
      description: '入场动画时长，单位为秒。',
      control: {
        type: 'number',
        min: 0.1,
        max: 2,
        step: 0.05,
      },
    },
    flipTurns: {
      description: 'rotate-up 入场动画的旋转圈数。',
      control: {
        type: 'number',
        min: 1,
        max: 5,
        step: 0.5,
      },
    },
    flipAxis: {
      description: 'rotate-up 入场动画的旋转轴。长按翻面使用 x 或 y 轴，z 轴会回退为 y 轴。',
      control: 'inline-radio',
      options: ['x', 'y', 'z'],
    },
    flipEase: {
      description: 'rotate-up 入场动画使用的 GSAP 缓动。',
      control: 'text',
    },
    flipTrigger: {
      description: '翻面触发方式。press 为蓄力长按，click 为点击切换，none 关闭翻面。',
      control: 'inline-radio',
      options: ['none', 'click', 'press'],
    },
    longPressDelay: {
      description: '触发翻面的长按时长，单位为毫秒。',
      control: {
        type: 'number',
        min: 120,
        max: 1500,
        step: 20,
      },
    },
    longPressRelease: {
      description: '长按结束后，restore 在松开时返回正面，stay 保持当前面。',
      control: 'inline-radio',
      options: ['restore', 'stay'],
    },
    disabled: {
      description: '禁用指针倾斜和入场动画。',
      control: 'boolean',
    },
    onEnter: {
      description: '卡片进入视口时触发。',
      control: false,
      table: {
        category: '事件',
      },
    },
    onLongPress: {
      description: '长按手势触发时抛出。',
      control: false,
      table: {
        category: '事件',
      },
    },
    onFlip: {
      description: '卡片翻面后触发，参数为 front 或 back。',
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    title: '创意交互卡片',
    description: '将指针移到卡片上，体验三维倾斜。',
    body: '在简洁的卡片中体验指针交互和入场动画。',
    footerText: '开始探索',
    variant: 'soft',
    padding: 'md',
    rounded: 'md',
    glass: true,
    interactive: true,
    tilt: true,
    tiltMax: 8,
    tiltScale: 1.015,
    glare: true,
    entrance: 'fade-up',
    entranceOnce: true,
    entranceDelay: 0,
    entranceDuration: 0.72,
    flipAxis: 'x',
    flipTurns: 2.5,
    flipEase: 'power4.out',
    flipTrigger: 'press',
    longPressDelay: 560,
    longPressRelease: 'restore',
    disabled: false,
    onEnter: fn(),
    onLongPress: fn(),
    onFlip: fn(),
  },
  render: (args) => ({
    components: { ArrowRight, BingButton, BingCard, BingIcon },
    setup() {
      return {
        args,
        ArrowRight,
      }
    },
    template: `
      <div style="display: grid; place-items: center; min-height: 360px; padding: 24px;">
        <BingCard
          style="width: min(100%, 360px);"
          :title="args.title"
          :description="args.description"
          :variant="args.variant"
          :padding="args.padding"
          :rounded="args.rounded"
          :glass="args.glass"
          :interactive="args.interactive"
          :tilt="args.tilt"
          :tilt-max="args.tiltMax"
          :tilt-scale="args.tiltScale"
          :glare="args.glare"
          :entrance="args.entrance"
          :entrance-once="args.entranceOnce"
          :entrance-delay="args.entranceDelay"
          :entrance-duration="args.entranceDuration"
          :flip-axis="args.flipAxis"
          :flip-turns="args.flipTurns"
          :flip-ease="args.flipEase"
          :flip-trigger="args.flipTrigger"
          :long-press-delay="args.longPressDelay"
          :long-press-release="args.longPressRelease"
          :disabled="args.disabled"
          @enter="args.onEnter"
          @long-press="args.onLongPress"
          @flip="args.onFlip"
        >
          <p>{{ args.body }}</p>
          <template #footer>
            <BingButton size="sm" variant="ghost">
              {{ args.footerText }}
              <template #suffix>
                <BingIcon :icon="ArrowRight" size="sm" />
              </template>
            </BingButton>
          </template>
        </BingCard>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { name: '交互演示' }

export const BubbleEntrance: Story = {
  name: '气泡入场',
  args: {
    title: '气泡入场',
    description: '轻快弹出的气泡效果。',
    variant: 'accent',
    entrance: 'bubble',
    entranceDuration: 0.9,
  },
}

export const RotateUpEntrance: Story = {
  name: '翻转入场',
  args: {
    title: '翻转入场',
    description: '卡片绕水平轴翻转数圈后归位。',
    variant: 'sky',
    entrance: 'rotate-up',
    entranceDuration: 1.25,
    flipAxis: 'x',
    flipTurns: 2.5,
    flipEase: 'power4.out',
    tiltMax: 10,
  },
  render: (args) => ({
    components: { ArrowRight, BingButton, BingCard, BingIcon },
    setup() {
      return {
        args,
        ArrowRight,
      }
    },
    template: `
      <div style="display: grid; place-items: center; min-height: 420px; padding: 24px;">
        <BingCard
          style="width: min(100%, 380px);"
          :title="args.title"
          :description="args.description"
          :variant="args.variant"
          :padding="args.padding"
          :rounded="args.rounded"
          :glass="args.glass"
          :interactive="args.interactive"
          :tilt="args.tilt"
          :tilt-max="args.tiltMax"
          :tilt-scale="args.tiltScale"
          :glare="args.glare"
          :entrance="args.entrance"
          :entrance-once="args.entranceOnce"
          :entrance-delay="args.entranceDelay"
          :entrance-duration="args.entranceDuration"
          :flip-axis="args.flipAxis"
          :flip-turns="args.flipTurns"
          :flip-ease="args.flipEase"
          :flip-trigger="args.flipTrigger"
          :long-press-delay="args.longPressDelay"
          :long-press-release="args.longPressRelease"
          :disabled="args.disabled"
          @enter="args.onEnter"
          @long-press="args.onLongPress"
          @flip="args.onFlip"
        >
          <p>{{ args.body }}</p>
          <template #footer>
            <BingButton size="sm" variant="secondary">
              {{ args.footerText }}
              <template #suffix>
                <BingIcon :icon="ArrowRight" size="sm" />
              </template>
            </BingButton>
          </template>
          <template #back>
            <div style="display: grid; justify-items: center; gap: 8px;">
              <strong style="color: var(--bing-secondary-strong); font-size: 1.1rem;">卡片背面</strong>
              <span style="color: var(--bing-muted); font-size: 0.86rem;">松开指针即可返回。</span>
            </div>
          </template>
        </BingCard>
      </div>
    `,
  }),
}

export const SoftPopEntrance: Story = {
  name: '柔和弹出',
  args: {
    title: '柔和弹出',
    description: '从模糊到清晰，适合内容密集的页面。',
    variant: 'plain',
    entrance: 'soft-pop',
  },
}

export const GlassAndRounded: Story = {
  name: '玻璃与圆角',
  args: {
    title: '玻璃卡片',
    description: '使用玻璃模糊，让背景自然透出。',
    variant: 'accent',
    glass: true,
    rounded: 'xl',
    entrance: 'bubble',
  },
}

export const LongPressFlip: Story = {
  name: '长按翻面',
  args: {
    title: '长按翻面',
    description: '长按查看背面，松开返回正面。',
    variant: 'accent',
    entrance: 'bubble',
    flipAxis: 'y',
    flipTrigger: 'press',
    longPressDelay: 480,
    longPressRelease: 'restore',
  },
  render: (args) => ({
    components: { BingCard },
    setup() {
      return {
        args,
      }
    },
    template: `
      <div style="display: grid; place-items: center; min-height: 420px; padding: 24px;">
        <BingCard
          style="width: min(100%, 360px);"
          :title="args.title"
          :description="args.description"
          :variant="args.variant"
          :padding="args.padding"
          :rounded="args.rounded"
          :glass="args.glass"
          :interactive="args.interactive"
          :tilt="args.tilt"
          :tilt-max="args.tiltMax"
          :tilt-scale="args.tiltScale"
          :glare="args.glare"
          :entrance="args.entrance"
          :entrance-once="args.entranceOnce"
          :entrance-delay="args.entranceDelay"
          :entrance-duration="args.entranceDuration"
          :flip-axis="args.flipAxis"
          :flip-turns="args.flipTurns"
          :flip-ease="args.flipEase"
          :flip-trigger="args.flipTrigger"
          :long-press-delay="args.longPressDelay"
          :long-press-release="args.longPressRelease"
          :disabled="args.disabled"
          @enter="args.onEnter"
          @long-press="args.onLongPress"
          @flip="args.onFlip"
        >
          <p>{{ args.body }}</p>
          <template #back>
            <div style="display: grid; justify-items: center; gap: 8px;">
              <strong style="color: var(--bing-accent-strong); font-size: 1.1rem;">卡片背面</strong>
              <span style="color: var(--bing-muted); font-size: 0.86rem;">松开返回正面。</span>
            </div>
          </template>
        </BingCard>
      </div>
    `,
  }),
}

export const ClickFlip: Story = {
  name: '点击翻面',
  args: {
    title: '点击翻面',
    description: '点击卡片切换正反面。',
    variant: 'sky',
    entrance: 'fade-up',
    flipAxis: 'y',
    flipTrigger: 'click',
    longPressRelease: 'stay',
  },
  render: (args) => ({
    components: { BingCard },
    setup() {
      return {
        args,
      }
    },
    template: `
      <div style="display: grid; place-items: center; min-height: 420px; padding: 24px;">
        <BingCard
          style="width: min(100%, 360px);"
          :title="args.title"
          :description="args.description"
          :variant="args.variant"
          :padding="args.padding"
          :rounded="args.rounded"
          :glass="args.glass"
          :interactive="args.interactive"
          :tilt="args.tilt"
          :tilt-max="args.tiltMax"
          :tilt-scale="args.tiltScale"
          :glare="args.glare"
          :entrance="args.entrance"
          :entrance-once="args.entranceOnce"
          :entrance-delay="args.entranceDelay"
          :entrance-duration="args.entranceDuration"
          :flip-axis="args.flipAxis"
          :flip-turns="args.flipTurns"
          :flip-ease="args.flipEase"
          :flip-trigger="args.flipTrigger"
          :long-press-delay="args.longPressDelay"
          :long-press-release="args.longPressRelease"
          :disabled="args.disabled"
          @enter="args.onEnter"
          @long-press="args.onLongPress"
          @flip="args.onFlip"
        >
          <p>点击即可翻面，再次点击返回。</p>
          <template #back>
            <div style="display: grid; justify-items: center; gap: 8px;">
              <strong style="color: var(--bing-secondary-strong); font-size: 1.1rem;">已翻至背面</strong>
              <span style="color: var(--bing-muted); font-size: 0.86rem;">再次点击即可返回。</span>
            </div>
          </template>
        </BingCard>
      </div>
    `,
  }),
}

export const NoFlip: Story = {
  name: '关闭翻面',
  args: {
    title: '关闭翻面',
    description: '关闭翻面后，仍可体验倾斜和入场效果。',
    variant: 'plain',
    entrance: 'fade-up',
    flipTrigger: 'none',
  },
}

export const Variants: Story = {
  name: '风格对比',
  render: () => ({
    components: { BingCard },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; width: min(100%, 980px); padding: 24px;">
        <BingCard title="简洁" variant="plain" entrance="bubble" :glass="false">中性实色表面。</BingCard>
        <BingCard title="柔和" variant="soft" entrance="bubble" :entrance-delay="0.08">温润的玻璃质感。</BingCard>
        <BingCard title="强调" variant="accent" rounded="lg" entrance="bubble" :entrance-delay="0.16">更鲜明的高光。</BingCard>
        <BingCard title="天空" variant="sky" rounded="xl" entrance="bubble" :entrance-delay="0.24">清冷的辅助表面。</BingCard>
      </div>
    `,
  }),
}

export const EntranceShowcase: Story = {
  name: '入场效果对比',
  tags: ['!autodocs'],
  render: () => ({
    components: { BingCard, BingIcon, Sparkles },
    setup() {
      return {
        Sparkles,
      }
    },
    template: `
      <div style="display: grid; gap: 44px; width: min(100%, 720px); padding: 48px 24px 220px;">
        <BingCard title="上浮淡入" description="平稳自然，适合作为默认效果。" entrance="fade-up">
          <p>卡片轻轻上移并渐显归位。</p>
        </BingCard>
        <BingCard title="气泡" description="更活泼，适合创意功能卡片。" variant="accent" entrance="bubble">
          <template #header>
            <div style="display: flex; align-items: center; gap: 10px;">
              <BingIcon :icon="Sparkles" tone="primary" />
              <div>
                <h3 style="margin: 0; color: var(--bing-heading); font-size: 1rem; line-height: 1.3;">气泡</h3>
                <p style="margin: 6px 0 0; color: var(--bing-muted); font-size: 0.92rem; line-height: 1.55;">弹性展开后柔和落定。</p>
              </div>
            </div>
          </template>
          <p>体验更活泼的动态效果。</p>
        </BingCard>
        <BingCard title="翻转上浮" description="可配置旋转圈数，并支持真实背面内容。" variant="sky" entrance="rotate-up" flip-axis="x" :entrance-duration="1.25" :flip-turns="2.5" flip-ease="power4.out">
          <p>卡片从底边翻转上浮，随后平稳归位。</p>
          <template #back>
            <div style="display: grid; justify-items: center; gap: 8px;">
              <strong style="color: var(--bing-secondary-strong);">Bing UI</strong>
              <span style="color: var(--bing-muted); font-size: 0.86rem;">背面内容已就绪。</span>
            </div>
          </template>
        </BingCard>
        <BingCard title="柔和弹出" description="模糊渐清、安静舒缓。" variant="plain" entrance="soft-pop">
          <p>适合页面已有较多动效时使用。</p>
        </BingCard>
      </div>
    `,
  }),
}
