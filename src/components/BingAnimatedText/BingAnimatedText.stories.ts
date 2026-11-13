import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { onBeforeUnmount, ref } from 'vue'
import BingAnimatedText from './BingAnimatedText.vue'
import { BingButton } from '../BingButton'
import type { BingAnimatedTextProps } from './BingAnimatedText.types'

type StoryArgs = BingAnimatedTextProps & {
  label: string
}

const meta = {
  title: 'Components/BingAnimatedText',
  component: BingAnimatedText,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
共享文字动画层，继承父级的字号、字重与颜色，可复用于按钮、消息与正文。

- **shine**：文字保持原色，一道光带扫过；光带处墨色变薄，浅色与深色背景下都清晰可见。
- **shimmer**：文字常态减淡，原色光带循环扫过，适合「思考中」「同步中」等持续状态。
- **jump**：逐字跳跃。hover 时从指针最近的字向两侧扩散，越远越低。
- **swap**：文字内容变化时逐字过渡，与 effect 互相独立，可叠加使用。

hover 触发同时响应键盘聚焦；通过 \`hoverTarget\` 可让整块区域（例如按钮）作为感应区。\`once\` 在进入视口时播放，常驻动画离开视口时自动暂停。尊重减少动态效果设置。
        `,
      },
    },
  },
  argTypes: {
    effect: {
      description: '文字动画类型。',
      control: 'inline-radio',
      options: ['none', 'shine', 'shimmer', 'jump'],
    },
    trigger: {
      description: '动画触发方式。once 进入视口时播放一次。',
      control: 'inline-radio',
      options: ['always', 'hover', 'once'],
    },
    disabled: {
      description: '禁用文字动画。',
      control: 'boolean',
    },
    followPointer: {
      description: 'hover 时从指针进入的位置起势。',
      control: 'boolean',
    },
    swap: {
      description: '文字内容变化时逐字过渡。',
      control: 'boolean',
    },
    hoverTarget: {
      description: 'hover / 键盘聚焦的感应区域：元素，或从文字向上 closest() 查找的选择器。',
      control: false,
    },
    shineColor: {
      description: '光带颜色。留空时 shine 为变薄的墨色，shimmer 为文字原色。',
      control: 'color',
    },
    shineBaseColor: {
      description: '文字常态颜色。留空时 shine 继承正文，shimmer 为减淡的正文色。',
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
      description: '首次扫光延迟，单位秒。',
      control: {
        type: 'number',
        min: 0,
        step: 0.1,
      },
    },
    shineInterval: {
      description: '循环扫光的间隔，单位秒。',
      control: {
        type: 'number',
        min: 0,
        max: 8,
        step: 0.1,
      },
    },
    shineDirection: {
      description: '光带方向；hover 且开启 followPointer 时改为从指针进入的一侧扫入。',
      control: 'inline-radio',
      options: ['left', 'right'],
    },
    shineAngle: {
      description: '光带角度。',
      control: {
        type: 'number',
        min: 0,
        max: 360,
        step: 5,
      },
    },
    jumpY: {
      description: '字符跳跃距离，单位 px。',
      control: {
        type: 'number',
        min: -20,
        max: 20,
        step: 1,
      },
    },
    jumpStagger: {
      description: '相邻字符起跳的间隔。',
      control: {
        type: 'number',
        min: 0,
        max: 0.2,
        step: 0.005,
      },
    },
    jumpDuration: {
      description: '单字跳跃时长。',
      control: {
        type: 'number',
        min: 0.1,
        max: 1,
        step: 0.02,
      },
    },
    jumpEase: {
      description: '向上跳跃的缓动。',
      control: 'text',
    },
    jumpReturnEase: {
      description: '落回原位的缓动。',
      control: 'text',
    },
    jumpRepeatDelay: {
      description: '循环跳跃的间隔。',
      control: {
        type: 'number',
        min: 0,
        max: 5,
        step: 0.1,
      },
    },
    label: {
      description: '示例文字内容，修改后可观察 swap 过渡。',
      control: 'text',
      table: {
        category: '插槽',
      },
    },
  },
  args: {
    label: '让文字轻轻流动',
    effect: 'shine',
    trigger: 'always',
    disabled: false,
    followPointer: true,
    swap: true,
    shineColor: undefined,
    shineBaseColor: undefined,
    shineSpeed: 1.6,
    shineDelay: 0,
    shineInterval: 2.4,
    shineDirection: 'left',
    shineAngle: 120,
    jumpY: -6,
    jumpStagger: 0.035,
    jumpDuration: 0.34,
    jumpEase: 'power2.out',
    jumpReturnEase: 'back.out(2.4)',
    jumpRepeatDelay: 1.2,
  },
  render: (args) => ({
    components: { BingAnimatedText },
    setup() {
      return { args }
    },
    template: `
      <p style="margin: 0; color: var(--bing-heading); max-width: 280px; font-size: 14px; line-height: 20px; font-weight: 400;">
        <BingAnimatedText
          :effect="args.effect"
          :trigger="args.trigger"
          :disabled="args.disabled"
          :follow-pointer="args.followPointer"
          :swap="args.swap"
          :shine-color="args.shineColor"
          :shine-base-color="args.shineBaseColor"
          :shine-speed="args.shineSpeed"
          :shine-delay="args.shineDelay"
          :shine-interval="args.shineInterval"
          :shine-direction="args.shineDirection"
          :shine-angle="args.shineAngle"
          :jump-y="args.jumpY"
          :jump-stagger="args.jumpStagger"
          :jump-duration="args.jumpDuration"
          :jump-ease="args.jumpEase"
          :jump-return-ease="args.jumpReturnEase"
          :jump-repeat-delay="args.jumpRepeatDelay"
        >
          {{ args.label }}
        </BingAnimatedText>
      </p>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Shine: Story = { name: '文字扫光' }

export const ShineOnHover: Story = {
  name: '悬停扫光',
  args: {
    label: '从左边或右边移入',
    trigger: 'hover',
  },
  parameters: {
    docs: { description: { story: '光带从指针进入的一侧扫入；关闭 followPointer 后固定使用 shineDirection。' } },
  },
}

export const Shimmer: Story = {
  name: '思考中',
  parameters: {
    docs: { description: { story: 'shimmer 让文字常态减淡、原色光带循环扫过，用于持续时间不确定的等待。可与 swap 叠加，在阶段变化时逐字过渡。' } },
  },
  render: () => ({
    components: { BingAnimatedText },
    setup() {
      const steps = ['正在读取会议记录', '正在整理要点', '正在生成待办清单']
      const index = ref(0)
      const timer = setInterval(() => {
        index.value = (index.value + 1) % steps.length
      }, 3200)
      onBeforeUnmount(() => clearInterval(timer))
      return { steps, index }
    },
    template: `
      <div style="display: grid; gap: 14px; color: var(--bing-heading); font-size: 14px; line-height: 22px;">
        <BingAnimatedText effect="shimmer" swap>{{ steps[index] }}</BingAnimatedText>
        <BingAnimatedText effect="shimmer" style="font-size: 20px; line-height: 28px; font-weight: 500;">正在思考</BingAnimatedText>
      </div>
    `,
  }),
}

export const JumpOnHover: Story = {
  name: '悬停跳动',
  args: {
    label: '从任意一个字移入，跳动会从那里向两侧扩散',
    effect: 'jump',
    trigger: 'hover',
  },
  parameters: {
    docs: { description: { story: '跳动从指针最近的字开始，越远起跳越晚、越低。Tab 聚焦到外层可交互元素时从首字开始。' } },
  },
}

export const JumpAlways: Story = {
  name: '循环跳动',
  args: {
    label: '正在处理中',
    effect: 'jump',
    trigger: 'always',
    jumpRepeatDelay: 0.8,
  },
}

export const JumpOnce: Story = {
  name: '单次跳动',
  args: {
    label: '完成一次轻巧的跳跃',
    effect: 'jump',
    trigger: 'once',
    jumpY: -4,
    jumpStagger: 0.018,
    jumpDuration: 0.28,
  },
}

export const Swap: Story = {
  name: '文字切换',
  parameters: {
    docs: {
      description: {
        story: '文字变化时只动变化的部分：保留的字滑到新位置，删除的字上移淡出，新增的字从下方翻入，占位宽度同步伸缩。连续快速点击会从当前画面接续，不会跳回。',
      },
    },
  },
  render: () => ({
    components: { BingAnimatedText, BingButton },
    setup() {
      const unread = ref(12)
      const uploadSteps = ['等待上传', '正在上传 3 个文件', '正在校验文件', '3 个文件已上传']
      const upload = ref(0)
      const copied = ref(false)
      const following = ref(false)
      const timers = new Set<ReturnType<typeof setTimeout>>()

      function later(run: () => void, delay: number) {
        const timer = setTimeout(() => {
          timers.delete(timer)
          run()
        }, delay)
        timers.add(timer)
      }

      function copy() {
        copied.value = true
        later(() => { copied.value = false }, 1800)
      }

      function startUpload() {
        upload.value = 1
        later(() => { upload.value = 2 }, 1400)
        later(() => { upload.value = 3 }, 2600)
      }

      onBeforeUnmount(() => timers.forEach(timer => clearTimeout(timer)))

      return { unread, uploadSteps, upload, copied, following, copy, startUpload }
    },
    template: `
      <div style="display: grid; gap: 28px; color: var(--bing-heading); font-size: 14px; line-height: 22px; max-width: 420px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
          <BingButton variant="tertiary" text-swap @click="copy">
            {{ copied ? '已复制' : '复制链接' }}
          </BingButton>
          <BingButton
            :variant="following ? 'secondary' : 'primary'"
            text-swap
            @click="following = !following"
          >
            {{ following ? '已关注' : '关注' }}
          </BingButton>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <BingButton size="sm" variant="secondary" aria-label="减少一条" @click="unread = Math.max(0, unread - 1)">−</BingButton>
          <BingButton size="sm" variant="secondary" aria-label="增加一条" @click="unread += 1">+</BingButton>
          <BingAnimatedText swap style="margin-inline-start: 4px;">{{ unread }} 条未读消息</BingAnimatedText>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <BingButton size="sm" variant="tertiary" :disabled="upload === 1 || upload === 2" @click="startUpload">模拟上传</BingButton>
          <BingAnimatedText
            :effect="upload === 1 || upload === 2 ? 'shimmer' : 'none'"
            swap
            style="color: var(--bing-text);"
          >{{ uploadSteps[upload] }}</BingAnimatedText>
        </div>
      </div>
    `,
  }),
}

export const Typography: Story = {
  name: '字号与长文本',
  render: () => ({
    components: { BingAnimatedText },
    template: `
      <div style="display: grid; gap: 24px; width: min(320px, calc(100vw - 48px)); color: var(--bing-heading);">
        <p style="margin: 0; font-size: 13px; line-height: 20px; font-weight: 400;">
          <BingAnimatedText effect="jump" trigger="always">正在同步数据</BingAnimatedText>
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 22px; font-weight: 400;">
          <BingAnimatedText effect="jump" trigger="hover">鼠标经过时，这段较长的文字会从指针所在的位置向两侧跳动，并且保持正文原本的自然换行。</BingAnimatedText>
        </p>
        <p style="margin: 0; font-size: 20px; line-height: 28px; font-weight: 500;">
          <BingAnimatedText effect="shine">从这里开始</BingAnimatedText>
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 20px; font-weight: 400; color: var(--bing-muted);">
          <BingAnimatedText effect="jump" disabled>暂时停止动画</BingAnimatedText>
        </p>
      </div>
    `,
  }),
}
