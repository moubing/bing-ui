import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { onBeforeUnmount, onMounted } from 'vue'
import { fn } from 'storybook/test'
import BingButton from '../BingButton/BingButton.vue'
import BingToast from './BingToast.vue'
import { bingToast } from './BingToast.service'
import { BING_TOAST_POSITIONS } from './BingToast.types'
import type { BingToastPosition, BingToastProps, BingToastViewportPosition } from './BingToast.types'

type StoryArgs = BingToastProps & {
  toastPosition: BingToastPosition
  duration: number
  closable: boolean
  onClose: () => void
}

const toastPositionOptions = [...BING_TOAST_POSITIONS] satisfies BingToastPosition[]
const viewportPositionOptions = ['all', ...toastPositionOptions] satisfies BingToastViewportPosition[]
const positionLabels: Record<BingToastPosition, string> = {
  top: '顶部居中', bottom: '底部居中', left: '左侧居中', right: '右侧居中',
  'top-left': '左上角', 'top-right': '右上角', 'bottom-left': '左下角', 'bottom-right': '右下角',
  'top-center': '顶部居中', 'bottom-center': '底部居中',
}

const meta = {
  title: 'Components/BingToast',
  component: BingToast,
  tags: ['autodocs'],
  argTypes: {
    viewportPosition: {
      control: 'inline-radio',
      options: viewportPositionOptions,
      description: 'Toast 视口渲染的位置。默认为 all，允许同一个实例承载所有位置。',
    },
    toastPosition: {
      control: 'inline-radio',
      options: toastPositionOptions,
      description: 'Storybook 演示里新消息出现的位置。',
      table: {
        disable: true,
      },
    },
    duration: {
      control: {
        type: 'number',
        min: 0,
        step: 200,
      },
      table: {
        disable: true,
      },
    },
    closable: {
      control: 'boolean',
      table: {
        disable: true,
      },
    },
    zIndex: {
      control: {
        type: 'number',
        min: 1,
        step: 100,
      },
    },
    offset: {
      control: 'text',
    },
    gap: {
      control: 'text',
    },
    width: {
      control: 'text',
    },
    max: {
      control: {
        type: 'number',
        min: 1,
        step: 1,
      },
    },
    smoothScroll: {
      control: 'boolean',
      description: '消息溢出时启用平滑滚动。',
    },
    onClose: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    viewportPosition: 'all',
    toastPosition: 'top-right',
    duration: 2800,
    closable: true,
    zIndex: 2100,
    offset: 18,
    gap: 10,
    width: 360,
    max: 5,
    smoothScroll: true,
    onClose: fn(),
  },
  render: (args) => ({
    components: { BingButton, BingToast },
    setup() {
      function pushSuccess() {
        bingToast.success({
          title: '保存成功',
          message: '新的交互参数已经写入组件配置。',
          position: args.toastPosition,
          duration: args.duration,
          closable: args.closable,
        })
      }

      function pushError() {
        bingToast.error({
          title: '提交失败',
          message: '当前素材还没有通过校验。',
          position: args.toastPosition,
          duration: args.duration,
          closable: args.closable,
        })
      }

      function pushLoading() {
        const id = bingToast.loading({
          title: '处理中',
          message: '正在同步动效时间线。',
          position: args.toastPosition,
          closable: args.closable,
        })

        window.setTimeout(() => {
          bingToast.success({
            id,
            title: '同步完成',
            message: '动效时间线已经准备好。',
            position: args.toastPosition,
            duration: args.duration,
            closable: args.closable,
          })
        }, 1400)
      }

      function pushStack() {
        ;[
          ['success', '画布已保存'],
          ['info', '预览链接已复制'],
          ['warning', '有一个状态需要确认'],
        ].forEach(([type, message], index) => {
          window.setTimeout(() => {
            bingToast[type as 'success' | 'info' | 'warning']({
              message,
              position: args.toastPosition,
              duration: args.duration,
              closable: args.closable,
            })
          }, index * 140)
        })
      }

      function clearAll() {
        bingToast.clear()
      }

      return {
        args,
        pushSuccess,
        pushError,
        pushLoading,
        pushStack,
        clearAll,
      }
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; max-width: min(720px, calc(100vw - 48px));">
        <BingButton variant="success" :throttle="false" @click="pushSuccess">成功</BingButton>
        <BingButton variant="danger" :throttle="false" @click="pushError">失败</BingButton>
        <BingButton variant="secondary" :throttle="false" @click="pushLoading">加载中</BingButton>
        <BingButton variant="tertiary" :throttle="false" @click="pushStack">堆叠</BingButton>
        <BingButton variant="ghost" :throttle="false" @click="clearAll">清空</BingButton>
        <BingToast
          :viewport-position="args.viewportPosition"
          :z-index="args.zIndex"
          :offset="args.offset"
          :gap="args.gap"
          :width="args.width"
          :max="args.max"
          :smooth-scroll="args.smoothScroll"
          @close="args.onClose"
        />
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { name: '交互演示' }

export const Reflow: Story = {
  name: '关闭与补位',
  args: { duration: 0 },
  parameters: {
    docs: {
      description: {
        story: '点击“堆叠”添加常驻消息，再关闭第一条或中间一条，观察其余消息平滑补位。支持连续关闭，也可切换 toastPosition 查看底部和侧边的补位方向。',
      },
    },
  },
}

export const ManualClose: Story = {
  name: '手动关闭',
  args: {
    toastPosition: 'top-right',
    duration: 0,
    closable: true,
  },
  render: (args) => ({
    components: { BingButton, BingToast },
    setup() {
      function pushManualToast() {
        bingToast.warning({
          id: 'manual-close-toast',
          title: '请确认后继续',
          message: '部分更改需要确认，请检查内容后手动关闭提示。',
          position: args.toastPosition,
          duration: 0,
          closable: true,
        })
      }

      function clearAll() {
        bingToast.clear()
      }

      return {
        args,
        pushManualToast,
        clearAll,
      }
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; max-width: min(720px, calc(100vw - 48px));">
        <BingButton variant="warning" :throttle="false" @click="pushManualToast">显示常驻提示</BingButton>
        <BingButton variant="ghost" :throttle="false" @click="clearAll">清空</BingButton>
        <BingToast
          :viewport-position="args.viewportPosition"
          :z-index="args.zIndex"
          :offset="args.offset"
          :gap="args.gap"
          :width="args.width"
          :max="args.max"
          :smooth-scroll="args.smoothScroll"
          @close="args.onClose"
        />
      </div>
    `,
  }),
}

export const Action: Story = {
  name: '操作按钮',
  args: { toastPosition: 'bottom' },
  parameters: {
    docs: {
      description: {
        story: '传入 `action` 显示单个操作按钮，常用于撤销。未指定 duration 时至少保留 6 秒；回调返回 Promise 时按钮显示处理中并暂停计时，成功后关闭，失败则保留提示可重试。',
      },
    },
  },
  render: (args) => ({
    components: { BingButton, BingToast },
    setup() {
      let attempts = 0

      function pushUndoToast() {
        bingToast.success({
          id: 'action-toast',
          message: 'REQ-26 已改为测试中',
          position: args.toastPosition,
          action: {
            label: '撤销',
            onClick: () => new Promise<void>((resolve, reject) => {
              attempts += 1
              // 第一次模拟冲突失败，再点一次成功。
              window.setTimeout(() => {
                if (attempts % 2 === 1) {
                  bingToast.error({ message: '状态已被他人修改，撤销失败', position: args.toastPosition })
                  reject(new Error('conflict'))
                  return
                }
                bingToast.info({ message: '已撤销', position: args.toastPosition })
                resolve()
              }, 900)
            }),
          },
        })
      }

      return { args, pushUndoToast }
    },
    template: `
      <div style="display: flex; gap: 8px; align-items: center;">
        <BingButton :throttle="false" @click="pushUndoToast">模拟拖动完成</BingButton>
        <BingToast :viewport-position="args.viewportPosition" />
      </div>
    `,
  }),
}

export const Positions: Story = {
  name: '显示位置',
  render: (args) => ({
    components: { BingButton, BingToast },
    setup() {
      const positions = BING_TOAST_POSITIONS

      function pushAtPosition(position: BingToastPosition) {
        bingToast.success({
          title: `显示位置：${positionLabels[position]}`,
          message: '更改已保存，可继续编辑。',
          position,
          duration: args.duration,
          closable: args.closable,
        })
      }

      function clearAll() {
        bingToast.clear()
      }

      return {
        args,
        positions,
        positionLabels,
        pushAtPosition,
        clearAll,
      }
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; max-width: min(720px, calc(100vw - 48px));">
        <BingButton
          v-for="position in positions"
          :key="position"
          variant="secondary"
          :throttle="false"
          @click="pushAtPosition(position)"
        >
          {{ positionLabels[position] }}
        </BingButton>
        <BingButton variant="ghost" :throttle="false" @click="clearAll">清空</BingButton>
        <BingToast
          viewport-position="all"
          :z-index="args.zIndex"
          :offset="args.offset"
          :gap="args.gap"
          :width="args.width"
          :max="args.max"
          :smooth-scroll="args.smoothScroll"
          @close="args.onClose"
        />
      </div>
    `,
  }),
}

export const CompactStack: Story = {
  name: '紧凑堆叠',
  args: {
    width: 320,
    gap: 8,
    max: 3,
  },
}

export const Variants: Story = {
  name: '六种状态',
  render: () => ({
    components: { BingToast },
    setup() {
      const ids: string[] = []
      onMounted(() => {
        const variants = [
          { type: 'default', message: '预览链接已复制。' },
          { type: 'success', title: '保存成功', message: '所有更改都已保存。' },
          { type: 'error', title: '上传失败', message: '连接已断开，请稍后重试。' },
          { type: 'loading', message: '正在同步更改…' },
          { type: 'warning', title: '即将离开页面', message: '有未保存的更改，请确认后继续。' },
          { type: 'info', title: '新版本可用', message: '刷新页面即可查看最新内容。' },
        ] as const
        variants.forEach(options => ids.push(bingToast.show({ ...options, duration: 0 })))
      })
      onBeforeUnmount(() => ids.forEach(id => bingToast.close(id)))
      return {}
    },
    template: '<BingToast :width="360" />',
  }),
}

export const LongContent: Story = {
  name: '长文本',
  render: () => ({
    components: { BingToast },
    setup() {
      let id: string | undefined
      onMounted(() => {
        id = bingToast.warning({
          title: '部分图层未能同步，请检查以下资源后重新提交',
          message: '资源标识：layer_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz。其余更改已保存，可关闭提示后继续编辑。',
          duration: 0,
        })
      })
      onBeforeUnmount(() => { if (id) bingToast.close(id) })
      return {}
    },
    template: '<BingToast />',
  }),
}
