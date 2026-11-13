import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ArrowRight, Menu, Star } from '@lucide/vue'
import { fn } from 'storybook/test'
import { onBeforeUnmount, ref } from 'vue'
import BingButton from './BingButton.vue'
import { BingIcon } from '../BingIcon'
import type { BingButtonProps, BingButtonThrottledPayload } from './BingButton.types'

type StoryArgs = BingButtonProps & {
  prefix?: unknown
  default?: unknown
  suffix?: unknown
  label: string
  showPrefix: boolean
  showSuffix: boolean
  onClick: (event: MouseEvent) => void
  onThrottled: (payload: BingButtonThrottledPayload) => void
  onFocus: (event: FocusEvent) => void
  onBlur: (event: FocusEvent) => void
}

export const FlexRow: StoryObj = {
  name: 'Flex 操作与长文本省略',
  render: () => ({
    components: { BingButton },
    template: `
      <div style="width: min(420px, calc(100vw - 48px)); display: grid; gap: 24px; color: var(--bing-text);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <input aria-label="备注" value="输入宽度占满剩余空间" style="width: 100%; min-width: 0; padding: 8px; background: var(--bing-surface-solid); color: var(--bing-text); border: 1px solid var(--bing-border); border-radius: 4px;" />
          <BingButton size="xs" variant="ghost">清空</BingButton>
        </div>
        <BingButton style="max-width: 140px;" text-effect="none">这是一段在有限宽度中显示省略号的操作文本</BingButton>
        <p>按钮默认保留自身宽度。业务需要主动压缩时，可设置 flex-shrink: 1 和 min-width: 0。</p>
      </div>
    `,
  }),
}

const meta = {
  title: 'Components/BingButton',
  component: BingButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
BingButton 是 bing-ui 的基础操作按钮，提供从指针位置铺开的悬停波纹、点击碎屑和可配置的文字动效。

设计原则：

- 图标通过 \`prefix\` / \`suffix\` slot 注入，按钮本身不绑定任何图标库。
- 按钮使用稳定的实体表面，不使用毛玻璃，避免背景干扰文字和状态辨识。
- 非 Primary 按钮的悬停波纹与 Select 共用动画节奏，随按钮类型配色；禁用、加载、触摸操作和减少动态效果模式下不播放波纹。
- Primary 使用中性实底，默认自动播放文字扫光，不使用悬停波纹；可通过 \`textEffect="none"\` 或 \`textShine="none"\` 关闭扫光。
- 点击时按钮本体保持稳定，碎屑从鼠标或触摸位置向外散开，键盘触发时从中心播放。减少动态效果时不播放粒子，禁用、加载及被节流拦截的点击也不会触发。
- 默认关闭 \`throttle\`，支持连续操作；需要防止重复提交时可显式开启。
- \`loading\` 和 \`disabled\` 状态会阻止 click emit。
- \`loading\` 保留文字并自动循环逐字 jump，结束后恢复配置的文字效果；显式禁用或减少动态效果时保留静态文字。纯图标按钮使用加载图标。
- hover 文字动效以整个按钮为感应区，键盘聚焦同样会触发；jump 从离指针最近的字起跳，shine 从指针进入的一侧扫入。
- \`textSwap\` 让文案变化时逐字过渡，按钮宽度同步伸缩，适合「复制 → 已复制」「关注 → 已关注」。

事件说明：

- \`click\`：只有按钮可用且未被节流拦截时触发。
- \`throttled\`：连续点击被节流拦截时触发，payload 包含 \`remaining\`。
- \`focus\` / \`blur\`：透传原生焦点事件。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      description: '按钮视觉类型。',
      control: 'inline-radio',
      options: ['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'success', 'warning'],
    },
    size: {
      description: '按钮尺寸。',
      control: 'inline-radio',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    rounded: {
      description: '按钮圆角等级。',
      control: 'inline-radio',
      options: ['none', 'sm', 'md', 'lg', 'full'],
    },
    htmlType: {
      description: '原生 button type。',
      control: 'inline-radio',
      options: ['button', 'submit', 'reset'],
    },
    disabled: {
      description: '禁用按钮并阻止 click emit。',
      control: 'boolean',
    },
    loading: {
      description: '保留文字并循环逐字 jump，按钮不可点击；纯图标按钮使用加载图标。',
      control: 'boolean',
    },
    block: {
      description: '按钮宽度撑满父容器。',
      control: 'boolean',
    },
    throttle: {
      description: '是否启用点击节流。默认关闭，可按需开启。',
      control: 'boolean',
    },
    throttleDelay: {
      description: '点击节流间隔，单位毫秒。',
      control: {
        type: 'number',
        min: 0,
        step: 50,
      },
    },
    textEffect: {
      description: '空闲时的文字动效。Primary 默认 shine，其他类型默认 none；loading 期间临时使用 jump。',
      control: 'inline-radio',
      options: ['none', 'shine', 'jump'],
    },
    textEffectTrigger: {
      description: '文字动效触发方式。显式开启 jump 时默认 hover，shine 默认 always。',
      control: 'inline-radio',
      options: ['always', 'hover'],
    },
    textSwap: {
      description: '文案变化时逐字过渡，按钮宽度同步伸缩。',
      control: 'boolean',
    },
    textShine: {
      description: '文字闪光效果模式：none 关闭，hover 悬停时播放，always 持续播放。',
      control: 'inline-radio',
      options: ['none', 'hover', 'always'],
      table: {
        defaultValue: {
          summary: 'Primary: always；其他: none',
        },
      },
    },
    shineColor: {
      description: '文字闪光高亮颜色。',
      control: 'color',
    },
    shineBaseColor: {
      description: '文字闪光基础颜色。留空时使用当前 variant 的默认文字颜色。',
      control: 'color',
    },
    shineSpeed: {
      description: '光带穿过文字的时长，单位秒。',
      control: {
        type: 'number',
        min: 0.1,
        step: 0.1,
      },
    },
    shineDelay: {
      description: '文字首次开始闪光前的延迟，单位秒。',
      control: {
        type: 'number',
        min: 0,
        step: 0.1,
      },
    },
    shineInterval: {
      description: 'always 模式下每次完整扫光之间的静止间隔，单位秒。',
      control: {
        type: 'number',
        min: 0,
        max: 8,
        step: 0.1,
      },
    },
    shineDirection: {
      description: '文字闪光移动方向。',
      control: 'inline-radio',
      options: ['left', 'right'],
    },
    shineAngle: {
      description: '文字闪光渐变角度。',
      control: {
        type: 'number',
        min: 0,
        max: 360,
        step: 5,
      },
    },
    textJumpY: {
      description: '逐字跳动的垂直位移，单位 px。',
      control: {
        type: 'number',
        min: -20,
        max: 20,
        step: 1,
      },
    },
    textJumpStagger: {
      description: '每个字符依次跳动的间隔，单位秒。',
      control: {
        type: 'number',
        min: 0,
        max: 0.2,
        step: 0.005,
      },
    },
    textJumpDuration: {
      description: '单个字符完成跳动的时长，单位秒。',
      control: {
        type: 'number',
        min: 0.1,
        max: 1,
        step: 0.02,
      },
    },
    textJumpEase: {
      description: '字符上跳阶段使用的 GSAP ease。',
      control: 'text',
    },
    textJumpReturnEase: {
      description: '字符回落阶段使用的 GSAP ease。',
      control: 'text',
    },
    textJumpRepeatDelay: {
      description: 'always 模式下每轮跳动之间的间隔，单位秒。',
      control: {
        type: 'number',
        min: 0,
        max: 5,
        step: 0.1,
      },
    },
    ariaLabel: {
      description: '图标按钮或无可见文本按钮的可访问名称。',
      control: 'text',
    },
    label: {
      description: 'Storybook 中用于演示 default slot 的文本。',
      control: 'text',
      table: {
        category: '插槽',
      },
    },
    showPrefix: {
      description: 'Storybook 演示开关：是否展示 prefix slot。',
      control: 'boolean',
      table: {
        category: '插槽',
      },
    },
    showSuffix: {
      description: 'Storybook 演示开关：是否展示 suffix slot。',
      control: 'boolean',
      table: {
        category: '插槽',
      },
    },
    prefix: {
      description: '按钮左侧内容，通常放 BingIcon 或本地 SVG/Vue 图标组件。',
      control: false,
      table: {
        category: '插槽',
        type: {
          summary: 'slot',
        },
      },
    },
    default: {
      description: '按钮主内容。',
      control: false,
      table: {
        category: '插槽',
        type: {
          summary: 'slot',
        },
      },
    },
    suffix: {
      description: '按钮右侧内容，通常放 BingIcon 或本地 SVG/Vue 图标组件。',
      control: false,
      table: {
        category: '插槽',
        type: {
          summary: 'slot',
        },
      },
    },
    onClick: {
      description: '按钮可用且未被节流拦截时触发。',
      control: false,
      table: {
        category: '事件',
      },
    },
    onThrottled: {
      description: '点击被节流拦截时触发，payload: { event, remaining }。',
      control: false,
      table: {
        category: '事件',
      },
    },
    onFocus: {
      description: '按钮获得焦点时触发。',
      control: false,
      table: {
        category: '事件',
      },
    },
    onBlur: {
      description: '按钮失去焦点时触发。',
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    label: '主要操作',
    showPrefix: false,
    showSuffix: false,
    variant: 'primary',
    size: 'md',
    rounded: 'md',
    htmlType: 'button',
    disabled: false,
    loading: false,
    block: false,
    throttle: false,
    throttleDelay: 600,
    textEffect: undefined,
    textEffectTrigger: undefined,
    textShine: undefined,
    textSwap: false,
    shineColor: undefined,
    shineBaseColor: undefined,
    shineSpeed: 1.6,
    shineDelay: 0,
    shineInterval: 2.4,
    shineDirection: 'left',
    shineAngle: 120,
    textJumpY: -6,
    textJumpStagger: 0.035,
    textJumpDuration: 0.34,
    textJumpEase: 'power2.out',
    textJumpReturnEase: 'back.out(2.4)',
    textJumpRepeatDelay: 1.2,
    onClick: fn(),
    onThrottled: fn(),
    onFocus: fn(),
    onBlur: fn(),
  },
  render: (args) => ({
    components: { BingButton, BingIcon },
    setup() {
      return {
        args,
        ArrowRight,
        Star,
      }
    },
    template: `
      <BingButton
        :key="\`\${args.showPrefix}-\${args.showSuffix}\`"
        :variant="args.variant"
        :size="args.size"
        :rounded="args.rounded"
        :html-type="args.htmlType"
        :disabled="args.disabled"
        :loading="args.loading"
        :block="args.block"
        :throttle="args.throttle"
        :throttle-delay="args.throttleDelay"
        :text-effect="args.textEffect"
        :text-effect-trigger="args.textEffectTrigger"
        :text-shine="args.textShine"
        :text-swap="args.textSwap"
        :shine-color="args.shineColor"
        :shine-base-color="args.shineBaseColor"
        :shine-speed="args.shineSpeed"
        :shine-delay="args.shineDelay"
        :shine-interval="args.shineInterval"
        :shine-direction="args.shineDirection"
        :shine-angle="args.shineAngle"
        :text-jump-y="args.textJumpY"
        :text-jump-stagger="args.textJumpStagger"
        :text-jump-duration="args.textJumpDuration"
        :text-jump-ease="args.textJumpEase"
        :text-jump-return-ease="args.textJumpReturnEase"
        :text-jump-repeat-delay="args.textJumpRepeatDelay"
        :aria-label="args.ariaLabel"
        @click="args.onClick"
        @throttled="args.onThrottled"
        @focus="args.onFocus"
        @blur="args.onBlur"
      >
        <template v-if="args.showPrefix" #prefix>
          <BingIcon :icon="Star" size="sm" />
        </template>
        {{ args.label }}
        <template v-if="args.showSuffix" #suffix>
          <BingIcon :icon="ArrowRight" size="sm" />
        </template>
      </BingButton>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  name: '主要按钮',
  args: { label: '开始创作' },
  parameters: {
    docs: {
      description: {
        story: '主按钮使用中性实底和柔和阴影，点击时从操作位置散开碎屑，按钮本体保持稳定。默认自动播放文字扫光，不叠加悬停波纹；可通过 textEffect="none" 或 textShine="none" 关闭文字扫光。',
      },
    },
  },
}

export const Secondary: Story = {
  name: '次要按钮',
  args: {
    label: '次要按钮',
    variant: 'secondary',
  },
}

export const HoverRipple: Story = {
  name: '悬停波纹',
  parameters: {
    docs: {
      description: {
        story: '从非 Primary 按钮的不同边缘移入，观察波纹由指针位置铺开；在按钮间快速移动，也能自然收起。支持文字、图标和不同圆角，禁用与加载状态保持静止。Primary 使用中性实底和默认文字扫光。',
      },
    },
  },
  render: () => ({
    components: { BingButton, BingIcon },
    setup() {
      return { ArrowRight, Star }
    },
    template: `
      <div style="display: grid; gap: 24px; max-width: 620px;">
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <BingButton>开始创作</BingButton>
          <BingButton variant="secondary">探索灵感</BingButton>
          <BingButton variant="tertiary">保存草稿</BingButton>
          <BingButton variant="ghost">了解更多</BingButton>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <BingButton variant="danger">删除</BingButton>
          <BingButton variant="success">完成</BingButton>
          <BingButton variant="warning">稍后处理</BingButton>
          <BingButton variant="secondary" rounded="full">
            下一步
            <template #suffix><BingIcon :icon="ArrowRight" size="sm" /></template>
          </BingButton>
          <BingButton variant="tertiary" rounded="full" aria-label="收藏">
            <template #prefix><BingIcon :icon="Star" size="sm" /></template>
          </BingButton>
        </div>
        <BingButton variant="tertiary" block>从这里开启新的创作</BingButton>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <BingButton disabled>暂不可用</BingButton>
          <BingButton variant="secondary" loading>保存中</BingButton>
        </div>
      </div>
    `,
  }),
}

export const ClickParticles: Story = {
  name: '点击碎屑',
  parameters: {
    docs: {
      description: {
        story: '点击不同位置，观察碎屑由点击点向四周散开；碎屑使用浏览器原生 transform / opacity 动画，提交首帧后无需主线程逐帧更新。业务 click 事件仍同步发出；若操作会立即渲染大量内容，业务侧应先给反馈一次绘制机会。长按时按钮不再缩放或下沉，使用 Tab 聚焦后按 Enter / 空格可从中心触发。此示例关闭节流，方便体验连续点击。',
      },
    },
  },
  render: () => ({
    components: { BingButton, BingIcon },
    setup() { return { Star } },
    template: `
      <div style="display: grid; gap: 32px; padding: 48px; max-width: 640px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 20px;">
          <BingButton :throttle="false" text-effect="none">开始创作</BingButton>
          <BingButton variant="secondary" :throttle="false">探索灵感</BingButton>
          <BingButton variant="tertiary" :throttle="false">保存草稿</BingButton>
          <BingButton variant="ghost" :throttle="false">了解更多</BingButton>
        </div>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 20px;">
          <BingButton variant="danger" :throttle="false">删除</BingButton>
          <BingButton variant="success" :throttle="false">完成</BingButton>
          <BingButton variant="warning" :throttle="false">稍后处理</BingButton>
          <BingButton variant="tertiary" rounded="full" :throttle="false" aria-label="收藏">
            <template #prefix><BingIcon :icon="Star" size="sm" /></template>
          </BingButton>
        </div>
        <BingButton variant="secondary" block :throttle="false">试着点击按钮的边缘</BingButton>
        <div style="display: flex; flex-wrap: wrap; gap: 20px;">
          <BingButton disabled text-effect="none">暂不可用</BingButton>
          <BingButton variant="secondary" loading>保存中</BingButton>
        </div>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  name: '尺寸',
  render: () => ({
    components: { BingButton },
    template: `
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
        <BingButton size="xs">超小</BingButton>
        <BingButton size="sm">小</BingButton>
        <BingButton size="md">中</BingButton>
        <BingButton size="lg">大</BingButton>
        <BingButton size="xl">超大</BingButton>
      </div>
    `,
  }),
}

export const Rounded: Story = {
  name: '圆角',
  render: () => ({
    components: { BingButton },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <BingButton rounded="none">无</BingButton>
        <BingButton rounded="sm">小</BingButton>
        <BingButton rounded="md">中</BingButton>
        <BingButton rounded="lg">大</BingButton>
        <BingButton rounded="full">全圆角</BingButton>
      </div>
    `,
  }),
}

export const Variants: Story = {
  name: '风格对比',
  render: () => ({
    components: { BingButton },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <BingButton variant="primary">主要按钮</BingButton>
        <BingButton variant="secondary">次要按钮</BingButton>
        <BingButton variant="tertiary">三级按钮</BingButton>
        <BingButton variant="ghost">幽灵按钮</BingButton>
        <BingButton variant="danger">危险</BingButton>
        <BingButton variant="success">成功</BingButton>
        <BingButton variant="warning">警告</BingButton>
      </div>
    `,
  }),
}

export const ShinyText: Story = {
  name: '文字扫光',
  args: {
    label: '扫光、停顿、循环',
    textShine: 'always',
    shineDirection: 'left',
  },
}

export const ShinyOnHover: Story = {
  name: '悬停扫光',
  args: {
    label: '从任意一侧移入',
    variant: 'secondary',
    textShine: 'hover',
  },
  parameters: {
    docs: { description: { story: '整个按钮都是感应区，光带从指针进入的一侧扫入；Tab 聚焦时按 shineDirection 播放。' } },
  },
}

export const JumpText: Story = {
  name: '逐字跳动',
  args: {
    label: '逐字跳动',
    variant: 'primary',
    textEffect: 'jump',
    textEffectTrigger: 'hover',
    textJumpY: -7,
    textJumpStagger: 0.04,
    textJumpDuration: 0.36,
  },
  parameters: {
    docs: { description: { story: '从按钮不同位置移入，跳动从离指针最近的字向两侧扩散。' } },
  },
}

export const TextSwap: Story = {
  name: '文字切换',
  parameters: {
    docs: { description: { story: '点击后文案变化：共同的字滑到新位置，删除的字上移淡出，新字从下方翻入，按钮宽度同步伸缩。' } },
  },
  render: () => ({
    components: { BingButton },
    setup() {
      const copied = ref(false)
      const following = ref(false)
      let timer: ReturnType<typeof setTimeout> | undefined

      function copy() {
        copied.value = true
        clearTimeout(timer)
        timer = setTimeout(() => { copied.value = false }, 1800)
      }

      onBeforeUnmount(() => clearTimeout(timer))
      return { copied, following, copy }
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
        <BingButton variant="tertiary" text-swap @click="copy">{{ copied ? '已复制' : '复制链接' }}</BingButton>
        <BingButton :variant="following ? 'secondary' : 'primary'" text-swap @click="following = !following">
          {{ following ? '已关注' : '关注' }}
        </BingButton>
      </div>
    `,
  }),
}

export const WithIcons: Story = {
  name: '搭配图标',
  render: () => ({
    components: { BingButton, BingIcon },
    setup() {
      return { Menu, Star }
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <BingButton>
          <template #prefix>
            <BingIcon :icon="Star" size="sm" />
          </template>
          带图标按钮
        </BingButton>
        <BingButton aria-label="打开菜单" variant="secondary">
          <template #prefix>
            <BingIcon :icon="Menu" size="sm" />
          </template>
        </BingButton>
      </div>
    `,
  }),
}

export const Loading: Story = {
  name: '加载状态',
  args: {
    label: '保存中',
    loading: true,
  },
  parameters: {
    docs: { description: { story: '加载时保留文字并循环逐字 jump，沿用 textJump 系列参数。关闭 loading 后恢复原来的文字动效；减少动态效果模式下显示静态文字。' } },
  },
}

export const LoadingText: Story = {
  name: '加载文字',
  render: () => ({
    components: { BingButton, BingIcon },
    setup() { return { Star } },
    template: `
      <div style="display: grid; gap: 24px; padding: 24px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px;">
          <BingButton loading>正在创建</BingButton>
          <BingButton variant="secondary" loading>保存中</BingButton>
          <BingButton variant="tertiary" loading>正在上传</BingButton>
          <BingButton variant="success" loading>提交中</BingButton>
        </div>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px;">
          <BingButton size="xs" variant="secondary" loading>处理中</BingButton>
          <BingButton size="sm" variant="secondary" loading>处理中</BingButton>
          <BingButton size="md" variant="secondary" loading>
            <template #prefix><BingIcon :icon="Star" size="sm" /></template>
            正在收藏
          </BingButton>
          <BingButton size="lg" variant="secondary" loading>处理中</BingButton>
          <BingButton size="xl" variant="secondary" loading>处理中</BingButton>
          <BingButton variant="tertiary" loading aria-label="保存">
            <template #prefix><BingIcon :icon="Star" size="sm" /></template>
          </BingButton>
        </div>
      </div>
    `,
  }),
}

export const LoadingTransition: Story = {
  name: '加载状态切换',
  parameters: {
    docs: { description: { story: '点击后分别模拟 70ms 与 2.4s 请求，检查文字持续可见、jump 自动开始与结束，以及按钮尺寸保持稳定。' } },
  },
  render: () => ({
    components: { BingButton },
    setup() {
      const fastLoading = ref(false)
      const slowLoading = ref(false)
      const timers = new Set<ReturnType<typeof setTimeout>>()

      function simulateRequest(target: typeof fastLoading, duration: number) {
        target.value = true

        const timer = setTimeout(() => {
          target.value = false
          timers.delete(timer)
        }, duration)

        timers.add(timer)
      }

      function simulateFastRequest() {
        simulateRequest(fastLoading, 70)
      }

      function simulateSlowRequest() {
        simulateRequest(slowLoading, 2400)
      }

      onBeforeUnmount(() => {
        timers.forEach((timer) => clearTimeout(timer))
      })

      return {
        fastLoading,
        slowLoading,
        simulateFastRequest,
        simulateSlowRequest,
      }
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        <BingButton
          :loading="fastLoading"
          :throttle="false"
          @click="simulateFastRequest"
        >
          快速保存 · 70ms
        </BingButton>
        <BingButton
          variant="secondary"
          :loading="slowLoading"
          :throttle="false"
          @click="simulateSlowRequest"
        >
          保存设置 · 2.4s
        </BingButton>
      </div>
    `,
  }),
}
