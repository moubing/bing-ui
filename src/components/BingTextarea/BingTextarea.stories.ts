import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import BingTextarea from './BingTextarea.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingButton from '../BingButton/BingButton.vue'
import type { BingTextareaProps } from './BingTextarea.types'

const meta = {
  title: 'Components/BingTextarea',
  component: BingTextarea,
  tags: ['autodocs'],
  args: {
    modelValue: '',
    placeholder: '添加图层说明…',
    rows: 4,
    autosize: true,
    autosizeTransition: true,
    submitOn: 'none',
    clearable: false,
    showCount: true,
    maxLength: 120,
    disabled: false,
    smoothCaret: true,
    size: 'md',
    block: false,
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    smoothCaret: { control: 'boolean' },
    clearable: { control: 'boolean' },
    autosizeTransition: { control: 'boolean' },
    submitOn: { control: 'inline-radio', options: ['none', 'enter', 'mod-enter'] },
    countFormatter: { control: false },
    block: {
      control: 'boolean',
    },
    showCount: {
      control: 'boolean',
    },
  },
  render: (args) => ({
    components: { BingTextarea },
    setup() {
      const value = ref(args.modelValue)

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue
        },
      )

      return { args, value }
    },
    template: `
      <div style="width: min(420px, calc(100vw - 48px));">
        <BingTextarea
          v-model="value"
          :placeholder="args.placeholder"
          :rows="args.rows"
          :autosize="args.autosize"
          :autosize-transition="args.autosizeTransition"
          :submit-on="args.submitOn"
          :count-formatter="args.countFormatter"
          :show-count="args.showCount"
          :max-length="args.maxLength"
          :disabled="args.disabled"
          :smooth-caret="args.smoothCaret"
          :readonly="args.readonly"
          :clearable="args.clearable"
          :resize="args.resize"
          :status="args.status"
          :size="args.size"
          :block="args.block"
        />
      </div>
    `,
  }),
} satisfies Meta<BingTextareaProps>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const SmoothCaret: Story = {
  name: '多行平滑光标',
  args: { block: true, autosize: { minRows: 1, maxRows: 4 }, resize: 'none', showCount: false, clearable: false, modelValue: '试着输入、换行，或用方向键移动。\n中文组词也会保留同一条光标。' },
}

export const Sizes: Story = {
  name: '尺寸与对齐',
  render: () => ({
    components: { BingInput, BingTextarea },
    setup() {
      return { sizes: ['sm', 'md', 'lg'], names: ref(['紧凑', '默认', '宽松']), notes: ref(['', '', '']) }
    },
    template: `
      <div style="display: grid; gap: 24px; width: min(420px, calc(100vw - 48px));">
        <section v-for="(size, index) in sizes" :key="size" style="display: grid; gap: 8px;">
          <label style="font-size: 12px; color: var(--bing-muted);">{{ { xs: '超小', sm: '小', md: '中', lg: '大', xl: '超大' }[size] }}</label>
          <BingInput v-model="names[index]" :size="size" block :aria-label="size + ' 图层名称'" />
          <BingTextarea v-model="notes[index]" :size="size" :rows="3" block :aria-label="size + ' 图层说明'" placeholder="与输入框统一边界、文字和内边距" />
        </section>
      </div>
    `,
  }),
}

export const States: Story = {
  name: '状态',
  render: () => ({
    components: { BingTextarea },
    setup() {
      return {
        states: [
          { status: 'default', label: '默认', note: '可以继续补充说明。' },
          { status: 'error', label: '错误', note: '请补充数据来源。' },
          { status: 'success', label: '成功', note: '说明已通过检查。' },
          { status: 'warning', label: '警告', note: '数据来源需要复核。' },
        ],
        values: ref(['可以继续补充说明。', '请补充数据来源。', '说明已通过检查。', '数据来源需要复核。']),
      }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 24px; width: min(960px, calc(100vw - 48px));">
        <section v-for="(state, index) in states" :key="state.status" style="display: grid; gap: 14px; align-content: start;">
          <strong style="font-size: 14px;">{{ state.label }}</strong>
          <label style="display: grid; gap: 6px; font-size: 12px;">可编辑 · 试试悬停和聚焦
            <BingTextarea v-model="values[index]" :status="state.status" :rows="2" block clearable show-count :max-length="60" :aria-label="state.label + '说明'" />
          </label>
          <label style="display: grid; gap: 6px; font-size: 12px;">只读 · 可以选择复制
            <BingTextarea :model-value="state.note" :status="state.status" :rows="2" readonly block :aria-label="state.label + '只读说明'" />
          </label>
          <label style="display: grid; gap: 6px; font-size: 12px;">禁用 · 优先显示禁用外观
            <BingTextarea :model-value="state.note" :status="state.status" :rows="2" disabled block :aria-label="state.label + '禁用说明'" />
          </label>
        </section>
      </div>
    `,
  }),
}

export const Autosize: Story = {
  name: '自动增高',
  render: () => ({
    components: { BingTextarea, BingButton },
    setup() {
      const value = ref('第一行说明')
      const transition = ref(true)
      const height = ref(0)
      const notices = ref(0)
      const inputs = ref(0)
      return {
        value, transition, height, notices, inputs,
        resized: (next: number) => { height.value = next; notices.value++ },
        add: () => { value.value += '\n补充一行说明' },
        remove: () => { value.value = value.value.split('\n').slice(0, -1).join('\n') },
        paste: () => { value.value = Array.from({ length: 12 }, (_, index) => `第 ${index + 1} 行：较长的说明内容`).join('\n') },
      }
    },
    template: `<div style="display: grid; gap: 16px; width: min(480px, calc(100vw - 48px));">
      <label style="font-size: 14px;"><input type="checkbox" v-model="transition" /> 自动增高过渡</label>
      <BingTextarea v-model="value" :autosize="{ minRows: 1, maxRows: 6 }" :autosize-transition="transition"
        resize="none" block show-count :max-length="600" aria-label="自动增高说明" aria-describedby="autosize-hint"
        @resize="resized" @input="inputs++" placeholder="输入、换行或粘贴多行说明" />
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <BingButton size="sm" :throttle="false" @click="add">增加一行</BingButton>
        <BingButton size="sm" variant="secondary" :throttle="false" @click="remove">删除一行</BingButton>
        <BingButton size="sm" variant="secondary" :throttle="false" @click="paste">填入长文本</BingButton>
        <BingButton size="sm" variant="ghost" :throttle="false" @click="value = ''">重置</BingButton>
      </div>
      <p id="autosize-hint" style="margin: 0; font-size: 13px; color: var(--bing-muted); line-height: 1.7;">小幅换行在 120ms 内过渡；一次增加超过三行、达到六行上限、改变容器宽度或开启减少动效时，直接调整高度。</p>
      <output style="font-size: 13px; color: var(--bing-muted);" data-resize>高度 {{ height }}px · resize 通知 {{ notices }} 次 · 已确认输入 {{ inputs }} 次</output>
      <details style="font-size: 12px; color: var(--bing-muted);"><summary>当前模型（组词确认后更新）</summary><pre data-model style="white-space: pre-wrap; overflow-wrap: anywhere;">{{ JSON.stringify(value) }}</pre></details>
    </div>`,
  }),
}

export const SubmitShortcuts: Story = {
  name: '提交快捷键',
  render: () => ({
    components: { BingTextarea },
    setup: () => ({
      modes: [
        { mode: 'enter', label: '短标注', hint: 'Enter 提交，Shift+Enter 换行。' },
        { mode: 'mod-enter', label: '长说明', hint: 'Ctrl / ⌘+Enter 提交，Enter 换行。' },
        { mode: 'none', label: '普通文本域', hint: '默认模式：Enter 换行，不触发提交。' },
      ],
      values: ref(['', '', '']), submitted: ref(['尚未提交', '尚未提交', '尚未提交']),
    }),
    template: `<div style="display: grid; gap: 24px; width: min(480px, calc(100vw - 48px));">
      <section v-for="(item, index) in modes" :key="item.mode" style="display: grid; gap: 8px;">
        <label :for="'submit-' + item.mode" style="font-size: 14px;">{{ item.label }}</label>
        <BingTextarea v-model="values[index]" :id="'submit-' + item.mode" :submit-on="item.mode"
          :autosize="{ minRows: 2, maxRows: 4 }" block resize="none" :aria-describedby="'hint-' + item.mode"
          @submit="value => submitted[index] = '最近提交：' + (value || '（空文本）')" />
        <p :id="'hint-' + item.mode" style="margin: 0; font-size: 12px; color: var(--bing-muted);">{{ item.hint }}中文选词时不会提交。</p>
        <output style="font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere;" :data-submit="item.mode">{{ submitted[index] }}</output>
      </section>
    </div>`,
  }),
}

export const CharacterCount: Story = {
  name: '字数上限与提示',
  render: () => ({
    components: { BingTextarea },
    setup: () => ({
      values: ref(['输入一段简短的说明。', '这是一段接近字数限制的示例说明，请继续', '这段说明已经到达字数上限，请尝试继续输入。', '']),
      remaining: (count: number, max?: number) => max === undefined ? `已输入 ${count} 字` : `还可输入 ${Math.max(0, max - count)} 字`,
    }),
    template: `<div style="display: grid; gap: 18px; width: min(480px, calc(100vw - 48px));">
      <label style="display: grid; gap: 8px; font-size: 14px;">正常计数<BingTextarea v-model="values[0]" :rows="2" block show-count :max-length="20" aria-label="正常计数" /></label>
      <label style="display: grid; gap: 8px; font-size: 14px;">接近上限 · 90% 起提示<BingTextarea v-model="values[1]" :rows="2" block show-count :max-length="20" aria-label="接近上限" /></label>
      <label style="display: grid; gap: 8px; font-size: 14px;">达到上限 · 继续输入有反馈<BingTextarea v-model="values[2]" :rows="2" block show-count :max-length="21" aria-label="达到上限" /></label>
      <label style="display: grid; gap: 8px; font-size: 14px;">自定义剩余字数<BingTextarea v-model="values[3]" :rows="2" block show-count :max-length="60" :count-formatter="remaining" aria-label="自定义剩余字数" /></label>
      <p style="margin: 0; font-size: 12px; color: var(--bing-muted); line-height: 1.7;">计数遵循原生 maxlength 的 UTF-16 长度，emoji 可能占两个单位。读屏仅在接近上限和达到上限时提示。</p>
    </div>`,
  }),
}

export const ClearUndo: Story = {
  name: '清除与撤销',
  render: () => ({
    components: { BingTextarea, BingButton },
    setup() {
      const original = '图层包含道路与行政边界。\n来源已核对，可用于下一轮地图标注。'
      return { original, value: ref(original), defaultValue: ref('多行输入默认关闭清除按钮。') }
    },
    template: `<div style="display: grid; gap: 20px; width: min(480px, calc(100vw - 48px));">
      <label style="display: grid; gap: 8px; font-size: 14px;">默认关闭清除<BingTextarea v-model="defaultValue" :rows="2" block aria-label="默认关闭清除" /></label>
      <label style="display: grid; gap: 8px; font-size: 14px;">显式开启清除与撤销<BingTextarea v-model="value" clearable show-count :max-length="200" :autosize="{ minRows: 2, maxRows: 5 }" resize="none" block aria-label="可撤销说明" aria-describedby="undo-hint" /></label>
      <p id="undo-hint" style="margin: 0; font-size: 13px; color: var(--bing-muted); line-height: 1.7;">点击右上角清除后，保持焦点在输入框内，5 秒内按 Ctrl / ⌘+Z 可恢复内容。继续输入、离开控件或超过 5 秒后失效。</p>
      <BingButton variant="secondary" style="justify-self: start;" :throttle="false" @click="value = original">重新填入示例</BingButton>
    </div>`,
  }),
}

export const Overflow: Story = {
  name: '长文本与滚动',
  render: () => ({
    components: { BingTextarea },
    setup: () => ({
      value: ref(Array.from({ length: 18 }, (_, index) => `第 ${index + 1} 行：检查图层信息、数据来源与协作说明。`).join('\n')),
      wideValue: ref(Array.from({ length: 10 }, (_, index) => `记录 ${index + 1}：${'道路与行政边界用于地图标注和图层分析。'.repeat(5)}`).join('\n')),
    }),
    template: `<div style="display: grid; gap: 20px; width: min(480px, calc(100vw - 48px));">
      <label style="display: grid; gap: 8px; font-size: 14px;">固定高度，可拖动调整
        <BingTextarea v-model="value" :rows="4" block show-count aria-label="固定高度说明" />
      </label>
      <label style="display: grid; gap: 8px; font-size: 14px;">自动增高，最多五行
        <BingTextarea v-model="value" :autosize="{ minRows: 2, maxRows: 5 }" resize="none" block show-count aria-label="自动增高说明" />
      </label>
      <label style="display: grid; gap: 8px; font-size: 14px;">只读长行，横纵滚动
        <BingTextarea :model-value="wideValue" wrap="off" :rows="3" readonly resize="none" block aria-label="只读长行说明" />
      </label>
    </div>`,
  }),
}
