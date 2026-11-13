import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { reactive, ref, watch } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingDatePicker from '../BingDatePicker/BingDatePicker.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingTextarea from '../BingTextarea/BingTextarea.vue'
import BingTabs from '../BingTabs/BingTabs.vue'

export const FixedFrame = {
  name: '固定尺寸与头部分类',
  render: () => ({
    components: { BingButton, BingDialog, BingTabs, BingInput },
    setup() {
      return { open: ref(false), compact: ref(false), tab: ref('members'),
        tabs: [{ value: 'members', label: '项目成员' }, { value: 'preferences', label: '显示偏好' }] }
    },
    template: `
      <div style="display: flex; gap: 12px;">
        <BingButton @click="compact = false; open = true">打开项目设置</BingButton>
        <BingButton variant="secondary" @click="compact = true; open = true">打开账号表单</BingButton>
        <BingDialog v-model="open" :title="compact ? '修改密码' : '项目设置'"
          :width="compact ? 480 : 900" :max-width="900" :height="compact ? 480 : 600" :show-peek="false">
          <template v-if="!compact" #header-addon>
            <BingTabs v-model="tab" :items="tabs" aria-label="设置分类" />
          </template>
          <div v-if="compact" style="display: grid; gap: 20px;">
            <BingInput type="password" placeholder="当前密码" block />
            <BingInput type="password" placeholder="新密码" block />
          </div>
          <div v-else style="display: grid; gap: 16px;">
            <p v-for="index in 24" :key="index">{{ tab === 'members' ? '成员' : '偏好' }}设置 {{ index }}：分类栏和底部操作保持可见，内容在中部滚动。</p>
          </div>
        </BingDialog>
      </div>
    `,
  }),
}
import BingDialog from './BingDialog.vue'
import type {
  BingDialogCloseReason,
  BingDialogProps,
} from './BingDialog.types'

type StoryArgs = BingDialogProps & {
  content: string
  onConfirm: () => void
  onCancel: () => void
  onClose: (reason: BingDialogCloseReason) => void
}

const meta = {
  title: 'Components/BingDialog',
  component: BingDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
BingDialog 是 bing-ui 的基础弹窗组件。它使用 \`v-model\` 控制显隐，内部通过 Teleport 挂载到 \`body\` 下，避免被普通页面层级遮挡。

弹窗默认使用实色内容面板和中性遮罩，支持以下交互：

- \`modelValue\` 为 true 时显示，false 时隐藏。
- 默认开启 \`lockScroll\`，弹窗打开时锁住页面滚动。
- 默认包含标题区、右上角关闭按钮、内容区、底部关闭/确定按钮。
- 关闭按钮使用 \`BingIcon\`，底部操作按钮使用 \`BingButton\`。
- \`confirm\` 默认只抛事件，不自动关闭；需要自动关闭时设置 \`closeOnConfirm\`。
        `,
      },
    },
  },
  argTypes: {
    modelValue: {
      description: '是否显示弹窗。对外推荐使用 v-model。',
      control: 'boolean',
    },
    title: {
      description: '弹窗标题。',
      control: 'text',
    },
    content: {
      description: 'Storybook 演示用内容，不属于真实组件 API。',
      control: 'text',
      table: {
        disable: true,
      },
    },
    width: {
      description: '弹窗宽度，支持 number 或 CSS 长度字符串。',
      control: 'text',
    },
    zIndex: {
      description: '弹窗根节点 z-index。',
      control: {
        type: 'number',
        min: 1,
        step: 100,
      },
    },
    lockScroll: {
      description: '弹窗打开时是否锁住 body 滚动。',
      control: 'boolean',
    },
    smoothScroll: {
      description: '内容区是否启用平滑滚动；也可以传入平滑滚动参数。',
      control: 'boolean',
    },
    closeOnOverlay: {
      description: '点击遮罩层是否关闭弹窗。',
      control: 'boolean',
    },
    closeOnEsc: {
      description: '按 Escape 是否关闭弹窗。',
      control: 'boolean',
    },
    closeOnConfirm: {
      description: '点击默认确定按钮后是否自动关闭弹窗。',
      control: 'boolean',
    },
    showClose: {
      description: '是否展示右上角关闭按钮。',
      control: 'boolean',
    },
    showPeek: {
      description:
        '是否展示右上角查看背景按钮。按住时弹窗会收缩到眼睛位置，松开后从眼睛位置重新展开。',
      control: 'boolean',
    },
    peekOpacity: {
      description: '弹窗收缩到眼睛位置后，小型弹窗残影的目标透明度。',
      control: {
        type: 'number',
        min: 0,
        max: 1,
        step: 0.02,
      },
    },
    showFooter: {
      description: '是否展示默认底部操作区。传入 footer slot 时会展示自定义底部。',
      control: 'boolean',
    },
    cancelText: {
      description: '默认取消/关闭按钮文案。',
      control: 'text',
    },
    confirmText: {
      description: '默认确定按钮文案。',
      control: 'text',
    },
    confirmLoading: {
      description: '默认确定按钮 loading 状态；自动阻止用户关闭，可通过 busy=false 覆盖。',
      control: 'boolean',
    },
    confirmDisabled: {
      description: '默认确定按钮禁用状态。',
      control: 'boolean',
    },
    glass: {
      description: '已废弃的兼容参数，无视觉效果；背景模糊由 overlayBlur 控制，下个大版本移除。',
      control: 'boolean',
    },
    overlayBlur: {
      description: '是否启用遮罩背景模糊。关闭后只保留纯色半透明遮罩，并且不渲染光圈。',
      control: 'boolean',
    },
    overlayOrbs: {
      description:
        '可选的遮罩光圈，默认不显示。可设置颜色、位置、大小、透明度、模糊程度和漂移参数；overlayBlur=false 时不渲染。',
      control: 'object',
    },
    overlayOrbsAnimated: {
      description: '是否使用 GSAP 让光圈在配置范围内小幅漂移。',
      control: 'boolean',
    },
    ariaLabel: {
      description: '无标题弹窗的可访问名称。',
      control: 'text',
    },
    busy: { description: '阻止用户关闭，默认跟随 confirmLoading；程序更新 v-model 不受限制。', control: 'boolean' },
    transitionOrigin: { description: '进出场方向：auto、center、元素或视口坐标。', control: false },
    initialFocus: { description: 'auto 优先内容表单控件；支持选择器、元素或 false。', control: false },
    rejectFeedback: { description: '关闭被拦截时的缩放和描边提醒。', control: 'boolean' },
    beforeClose: { description: '关闭前同步或异步确认，返回 false 时保留弹窗。', control: false },
    ariaDescribedby: {
      description: '弹窗描述内容 id。',
      control: 'text',
    },
    onConfirm: {
      description: '点击默认确定按钮时触发。',
      control: false,
      table: {
        category: '事件',
      },
    },
    onCancel: {
      description: '点击默认关闭按钮时触发。',
      control: false,
      table: {
        category: '事件',
      },
    },
    onClose: {
      description: '弹窗关闭时触发，payload 为关闭原因。',
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    modelValue: false,
    title: '创建新组件',
    content: '为你的界面添加一个新组件。创建后可以继续调整名称、外观和交互。',
    width: '520px',
    zIndex: 2000,
    lockScroll: true,
    smoothScroll: true,
    closeOnOverlay: true,
    closeOnEsc: true,
    closeOnConfirm: false,
    showClose: true,
    showPeek: true,
    peekOpacity: 0,
    showFooter: true,
    cancelText: '关闭',
    confirmText: '确定',
    confirmLoading: false,
    confirmDisabled: false,
    glass: true,
    overlayBlur: true,
    overlayOrbs: [],
    overlayOrbsAnimated: false,
    onConfirm: fn(),
    onCancel: fn(),
    onClose: fn(),
  },
  render: (args) => ({
    components: { BingButton, BingDialog },
    setup() {
      const open = ref(args.modelValue)

      watch(
        () => args.modelValue,
        (value) => {
          open.value = value
        },
      )

      return {
        args,
        open,
      }
    },
    template: `
      <div style="display: grid; justify-items: center; gap: 18px;">
        <BingButton @click="open = true">打开弹窗</BingButton>
        <BingDialog
          v-model="open"
          :title="args.title"
          :width="args.width"
          :z-index="args.zIndex"
          :lock-scroll="args.lockScroll"
          :smooth-scroll="args.smoothScroll"
          :close-on-overlay="args.closeOnOverlay"
          :close-on-esc="args.closeOnEsc"
          :close-on-confirm="args.closeOnConfirm"
          :show-close="args.showClose"
          :show-peek="args.showPeek"
          :peek-opacity="args.peekOpacity"
          :show-footer="args.showFooter"
          :cancel-text="args.cancelText"
          :confirm-text="args.confirmText"
          :confirm-loading="args.confirmLoading"
          :confirm-disabled="args.confirmDisabled"
          :busy="args.busy"
          :transition-origin="args.transitionOrigin"
          :initial-focus="args.initialFocus"
          :reject-feedback="args.rejectFeedback"
          :before-close="args.beforeClose"
          :glass="args.glass"
          :glass-blur="args.glassBlur"
          :glass-saturation="args.glassSaturation"
          :overlay-blur="args.overlayBlur"
          :overlay-orbs="args.overlayOrbs"
          :overlay-orbs-animated="args.overlayOrbsAnimated"
          :aria-label="args.ariaLabel"
          :aria-describedby="args.ariaDescribedby"
          @confirm="args.onConfirm"
          @cancel="args.onCancel"
          @close="args.onClose"
        >
          <p>{{ args.content }}</p>
        </BingDialog>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { name: '基础弹窗' }

export const OpenAndClose: Story = {
  name: '打开与关闭',
  render: () => ({
    components: { BingButton, BingDialog, BingInput },
    setup() { return { open: ref(false), name: ref('秋季发布'), reason: ref(''), origin: ref('') } },
    template: `
      <div style="width: min(900px, calc(100vw - 48px)); display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; align-items: center; min-height: min(520px, 75vh)">
        <BingButton style="justify-self: start; align-self: start" @click="origin = '左上'; open = true">左上打开</BingButton><span></span>
        <BingButton style="justify-self: end; align-self: start" @click="origin = '右上'; open = true">右上打开</BingButton>
        <span></span><BingButton @click="origin = '中央'; open = true">中央打开</BingButton><span></span>
        <BingButton style="justify-self: start; align-self: end" @click="origin = '左下'; open = true">左下打开</BingButton><span></span>
        <BingButton style="justify-self: end; align-self: end" @click="origin = '右下'; open = true">右下打开</BingButton>
      </div>
      <p aria-live="polite" style="color: var(--bing-muted)">{{ reason ? '上次关闭：' + reason : '从不同位置打开，体验确认和取消的去向。' }}</p>
      <BingDialog v-model="open" :title="origin + ' · 项目设置'" close-on-confirm cancel-text="取消" confirm-text="保存" @close="reason = $event">
        <div style="display: grid; gap: 16px"><p>确认后向上淡出，取消时回到打开的方向。</p><BingInput v-model="name" aria-label="项目名称" block /></div>
      </BingDialog>
    `,
  }),
}

export const ClosePrevention: Story = {
  name: '拒绝关闭',
  render: () => ({
    components: { BingButton, BingDialog },
    setup() { return { open: ref(false), mode: ref('overlay'), message: ref(''), count: ref(0) } },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <BingButton @click="mode = 'overlay'; open = true; message = ''">禁止遮罩关闭</BingButton>
        <BingButton @click="mode = 'escape'; open = true; message = ''">禁止 Esc 关闭</BingButton>
        <BingButton @click="mode = 'busy'; open = true; message = ''">提交中</BingButton>
      </div>
      <BingDialog v-model="open" title="保护当前操作" :close-on-overlay="mode !== 'overlay'" :close-on-esc="mode !== 'escape'" :confirm-loading="mode === 'busy'"
        @close-prevented="count++; message = '关闭被阻止（' + $event + '），共 ' + count + ' 次'">
        <div style="display: grid; gap: 16px"><p>点击遮罩、按 Esc 或尝试关闭，查看反馈。</p><p aria-live="polite">{{ message }}</p>
          <BingButton v-if="mode === 'busy'" variant="secondary" @click="mode = 'done'">模拟提交完成</BingButton>
        </div>
      </BingDialog>
    `,
  }),
}

export const MobileSheet: Story = {
  name: '窄屏底部面板',
  render: () => ({
    components: { BingButton, BingDialog, BingInput, BingCheckbox },
    setup() { return { open: ref(false), swipeAllowed: ref(true), name: ref(''), reason: ref('') } },
    template: `
      <div style="display: grid; gap: 16px">
        <BingCheckbox v-model="swipeAllowed" label="允许遮罩及下滑关闭" />
        <BingButton @click="open = true">打开底部面板</BingButton>
        <p aria-live="polite">{{ reason }}</p>
      </div>
      <BingDialog v-model="open" title="编辑资料" :close-on-overlay="swipeAllowed" :show-peek="false"
        @close="reason = '已关闭：' + $event" @close-prevented="reason = '已阻止：' + $event">
        <div style="display: grid; gap: 16px"><p>将视口缩窄到 560px 以内，从顶部把手或标题处下滑。</p>
          <BingInput v-model="name" aria-label="显示名称" placeholder="显示名称" block />
          <p v-for="index in 8" :key="index">内容区域保留滚动，只有头部可以拖动关闭。</p>
        </div>
      </BingDialog>
    `,
  }),
}

export const BeforeClose: Story = {
  name: '关闭前确认',
  render: () => ({
    components: { BingButton, BingDialog, BingInput },
    setup() {
      const open = ref(false), confirmation = ref(false), name = ref('未保存的草稿')
      let resolve: ((value: boolean) => void) | undefined
      const beforeClose = () => new Promise<boolean>(done => { resolve = done; confirmation.value = true })
      const decide = (accepted: boolean) => { confirmation.value = false; resolve?.(accepted); resolve = undefined }
      return { open, confirmation, name, beforeClose, decide }
    },
    template: `
      <BingButton @click="open = true">编辑草稿</BingButton>
      <BingDialog v-model="open" title="编辑草稿" :before-close="beforeClose">
        <BingInput v-model="name" aria-label="草稿名称" block />
        <BingDialog v-model="confirmation" title="放弃未保存的修改？" :width="380" :show-peek="false" cancel-text="继续编辑" confirm-text="放弃修改"
          @confirm="decide(true)" @close="decide(false)">
          <p>继续编辑会回到草稿；放弃修改会关闭编辑弹窗。</p>
        </BingDialog>
      </BingDialog>
    `,
  }),
}

export const Nested: Story = {
  name: '嵌套弹窗',
  render: () => ({
    components: { BingButton, BingDialog, BingInput },
    setup() { return { open: ref(false), confirmOpen: ref(false), name: ref('秋季发布') } },
    template: `
      <BingButton @click="open = true">打开项目设置</BingButton>
      <BingDialog v-model="open" title="项目设置" :width="560">
        <div style="display: grid; gap: 20px">
          <BingInput v-model="name" aria-label="项目名称" block />
          <BingButton variant="secondary" @click="confirmOpen = true">打开确认弹窗</BingButton>
        </div>
        <BingDialog v-model="confirmOpen" title="确认发布" :width="380" close-on-confirm confirm-text="发布">
          <p>发布后，工作区成员将看到最新内容。</p>
        </BingDialog>
      </BingDialog>
    `,
  }),
}

export const SmoothScrolling: Story = {
  name: '长内容滚动',
  args: {
    modelValue: true,
    title: '平滑滚动',
    smoothScroll: true,
    content: Array.from(
      { length: 40 },
      (_, index) =>
        `第 ${index + 1} 段：使用鼠标滚轮滚动弹窗内容，检查平滑动效与弹窗边界处的页面滚动锁定。`,
    ).join(' '),
  },
}

export const NoGlass: Story = {
  name: '实色遮罩',
  args: {
    title: '无毛玻璃弹窗',
    glass: false,
    overlayBlur: false,
  },
}

export const NoOverlayBlur: Story = {
  name: '关闭背景模糊',
  args: {
    title: '无背景模糊',
    overlayBlur: false,
  },
}

export const AnimatedOrbs: Story = {
  name: '可选动态光圈',
  args: {
    title: '漂移光圈',
    overlayOrbsAnimated: true,
    overlayOrbs: [
      {
        id: 'pink',
        color: '#f472b6',
        x: 22,
        y: 26,
        size: 380,
        opacity: 0.3,
        blur: 56,
        motionX: 92,
        motionY: 62,
        duration: 14,
      },
      {
        id: 'sky',
        color: '#0ea5e9',
        x: 78,
        y: 24,
        size: 360,
        opacity: 0.26,
        blur: 54,
        motionX: -88,
        motionY: 66,
        duration: 16,
        delay: 0.35,
      },
      {
        id: 'violet',
        color: '#a78bfa',
        x: 54,
        y: 78,
        size: 300,
        opacity: 0.2,
        blur: 56,
        motionX: 68,
        motionY: -72,
        duration: 18,
        delay: 0.7,
      },
    ],
  },
}

export const CustomFooter: Story = {
  name: '自定义底部',
  args: {
    title: '自定义底部',
    content: '保存草稿后可以继续编辑，也可以直接发布。',
  },
  render: (args) => ({
    components: { BingButton, BingDialog },
    setup() {
      const open = ref(args.modelValue)

      watch(
        () => args.modelValue,
        (value) => {
          open.value = value
        },
      )

      return {
        args,
        open,
      }
    },
    template: `
      <div style="display: grid; justify-items: center; gap: 18px;">
        <BingButton @click="open = true">打开弹窗</BingButton>
        <BingDialog
          v-model="open"
          :title="args.title"
          :width="args.width"
          :z-index="args.zIndex"
          :lock-scroll="args.lockScroll"
          :smooth-scroll="args.smoothScroll"
          :close-on-overlay="args.closeOnOverlay"
          :close-on-esc="args.closeOnEsc"
          :show-close="args.showClose"
          :show-peek="args.showPeek"
          :peek-opacity="args.peekOpacity"
          :glass="args.glass"
          :glass-blur="args.glassBlur"
          :glass-saturation="args.glassSaturation"
          :overlay-blur="args.overlayBlur"
          :overlay-orbs="args.overlayOrbs"
          :overlay-orbs-animated="args.overlayOrbsAnimated"
          @close="args.onClose"
        >
          <p>{{ args.content }}</p>
          <template #footer="{ cancel, confirm }">
            <BingButton variant="ghost" @click="cancel">稍后再说</BingButton>
            <BingButton variant="secondary" @click="confirm">保存草稿</BingButton>
            <BingButton variant="primary" @click="confirm">发布</BingButton>
          </template>
        </BingDialog>
      </div>
    `,
  }),
}

export const FormExample: Story = {
  name: '表单弹窗',
  args: {
    title: '创建项目',
    width: '680px',
    confirmText: '创建',
    cancelText: '取消',
    closeOnConfirm: true,
  },
  render: (args) => ({
    components: { BingButton, BingCheckbox, BingDatePicker, BingDialog, BingInput, BingSelect, BingTextarea },
    setup() {
      const open = ref(args.modelValue)
      const form = reactive({
        name: '秋季发布',
        owner: 'mira',
        priority: 'high',
        dueDate: '2026-07-18',
        notes: '发布前完成组件的外观与交互检查。',
        notifyTeam: true,
      })
      const ownerOptions = [
        { label: '林晓', value: 'mira', description: '设计负责人' },
        { label: '周宁', value: 'nolan', description: '动效负责人' },
        { label: '许言', value: 'june', description: '测试负责人' },
      ]
      const priorityOptions = [
        { label: '高', value: 'high', description: '本周完成' },
        { label: '中', value: 'medium', description: '下一版本' },
        { label: '低', value: 'low', description: '后续优化' },
      ]

      watch(
        () => args.modelValue,
        (value) => {
          open.value = value
        },
      )

      function submitForm() {
        args.onConfirm()
      }

      return {
        args,
        form,
        open,
        ownerOptions,
        priorityOptions,
        submitForm,
      }
    },
    template: `
      <div style="display: grid; justify-items: center; gap: 18px;">
        <BingButton @click="open = true">打开表单弹窗</BingButton>
        <BingDialog
          v-model="open"
          :title="args.title"
          :width="args.width"
          :z-index="args.zIndex"
          :lock-scroll="args.lockScroll"
          :smooth-scroll="args.smoothScroll"
          :close-on-overlay="args.closeOnOverlay"
          :close-on-esc="args.closeOnEsc"
          :close-on-confirm="args.closeOnConfirm"
          :show-close="args.showClose"
          :show-peek="args.showPeek"
          :peek-opacity="args.peekOpacity"
          :cancel-text="args.cancelText"
          :confirm-text="args.confirmText"
          :overlay-blur="args.overlayBlur"
          :overlay-orbs="args.overlayOrbs"
          :overlay-orbs-animated="args.overlayOrbsAnimated"
          @confirm="submitForm"
          @cancel="args.onCancel"
          @close="args.onClose"
        >
          <form style="display: grid; gap: 16px;" @submit.prevent="submitForm">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 14px;">
              <label style="display: grid; gap: 6px; min-width: 0; color: var(--bing-heading); font-size: 13px; font-weight: 400;">
                <span>项目名称</span>
                <BingInput v-model="form.name" block placeholder="项目名称" />
              </label>
              <label style="display: grid; gap: 6px; min-width: 0; color: var(--bing-heading); font-size: 13px; font-weight: 400;">
                <span>负责人</span>
                <BingSelect
                  v-model="form.owner"
                  :options="ownerOptions"
                  block
                  width="100%"
                  :min-width="0"
                  :searchable="false"
                  placeholder="选择负责人"
                />
              </label>
              <label style="display: grid; gap: 6px; min-width: 0; color: var(--bing-heading); font-size: 13px; font-weight: 400;">
                <span>优先级</span>
                <BingSelect
                  v-model="form.priority"
                  :options="priorityOptions"
                  block
                  width="100%"
                  :min-width="0"
                  :searchable="false"
                  placeholder="选择优先级"
                />
              </label>
              <label style="display: grid; gap: 6px; min-width: 0; color: var(--bing-heading); font-size: 13px; font-weight: 400;">
                <span>截止日期</span>
                <BingDatePicker
                  v-model="form.dueDate"
                  type="date"
                  block
                  placeholder="选择截止日期"
                />
              </label>
            </div>
            <label style="display: grid; gap: 6px; min-width: 0; color: var(--bing-heading); font-size: 13px; font-weight: 400;">
              <span>备注</span>
              <BingTextarea
                v-model="form.notes"
                block
                :rows="4"
                resize="vertical"
                :show-count="true"
                :max-length="180"
                placeholder="添加发布备注"
              />
            </label>
            <BingCheckbox v-model="form.notifyTeam" label="创建后通知工作区成员" />
          </form>
        </BingDialog>
      </div>
    `,
  }),
}
