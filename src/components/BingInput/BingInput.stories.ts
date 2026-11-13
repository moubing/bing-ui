import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Search, Sparkles } from '@lucide/vue'
import { markRaw, onBeforeUnmount, ref, watch } from 'vue'
import { fn } from 'storybook/test'
import BingInput from './BingInput.vue'
import BingTextarea from '../BingTextarea/BingTextarea.vue'
import type { BingInputProps } from './BingInput.types'

type StoryArgs = BingInputProps & {
  onDebouncedInput: (value: string) => void
  onClear: () => void
}

const meta = {
  title: 'Components/BingInput',
  component: BingInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'inline-radio',
      options: ['text', 'search', 'email', 'password', 'tel', 'url', 'number'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    clearable: {
      control: 'boolean',
      description: '搜索类型默认开启，其他类型默认关闭。显式 true 开启后，清除按钮保留键盘可达性。',
    },
    disabled: {
      control: 'boolean',
    },
    block: {
      control: 'boolean',
    },
    debounceDelay: {
      control: 'number',
    },
    smoothCaret: {
      control: 'boolean',
      description: '默认开启约 90ms 的平滑光标。支持 text、search、tel、url，中文组词时继续跟随原生选区焦点端；普通文字选区、触屏、减少动态效果及不能精确测量的输入使用原生光标。',
    },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'text' },
    clampOnBlur: { control: 'boolean', description: '默认开启；数字在失焦或 Enter 时按范围和步长规整。' },
    passwordToggle: { control: 'boolean', description: 'password 类型默认显示显隐按钮，切换时保持焦点和选区。' },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    maxLength: { control: 'number' },
    showCount: { control: 'boolean' },
    loading: { control: 'boolean' },
    scrub: { control: 'boolean', description: 'number 类型在前缀上横向拖动：每 4px 一个步长，Shift 十倍，Esc 撤销。' },
    autocomplete: { control: 'text', description: '默认 off，关闭浏览器历史输入提示；显式设置原样透传。' },
    onDebouncedInput: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onClear: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    modelValue: '',
    type: 'search',
    placeholder: '搜索动效',
    autocomplete: 'off',
    clearable: undefined,
    smoothCaret: true,
    disabled: false,
    size: 'md',
    block: false,
    debounceDelay: 180,
    onDebouncedInput: fn(),
    onClear: fn(),
  },
  render: (args) => ({
    components: { BingInput },
    setup() {
      const value = ref(args.modelValue)
      const SearchIcon = markRaw(Search)

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue
        },
      )

      return {
        SearchIcon,
        args,
        value,
      }
    },
    template: `
      <div :style="args.block ? { width: 'min(340px, calc(100vw - 48px))' } : undefined">
      <BingInput
        v-bind="args"
        v-model="value"
        :type="args.type"
        :min="args.min"
        :max="args.max"
        :step="args.step"
        :autocomplete="args.autocomplete"
        :placeholder="args.placeholder"
        :clearable="args.clearable"
        :smooth-caret="args.smoothCaret"
        :disabled="args.disabled"
        :icon="args.type === 'search' ? SearchIcon : undefined"
        :size="args.size"
        :block="args.block"
        :debounce-delay="args.debounceDelay"
        @debounced-input="args.onDebouncedInput"
        @clear="args.onClear"
      />
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const SmoothCaret: Story = {
  name: '平滑光标',
  parameters: {
    docs: { description: { story: '输入、退格和方向键移动时，光标以约 90ms 跟随实际插入点，中文组词和确认时保持相同的平滑光标；只读取原生文本与选区，不干预候选窗口。组词完成后才更新模型、校验和防抖事件。数字、邮箱、密码、RTL、非左对齐、只读、普通选区、触屏及减少动态效果模式使用原生光标。可通过 smoothCaret=false 关闭。' } },
  },
  render: () => ({
    components: { BingInput },
    setup() { return { smooth: ref(''), native: ref(''), notifications: ref(0) } },
    template: `
      <section style="display: grid; gap: 24px; width: min(460px, calc(100vw - 48px)); color: var(--bing-text);">
        <div>
          <h2 style="margin: 0 0 8px; color: var(--bing-heading); font-size: 20px;">让光标跟着输入</h2>
          <p style="margin: 0; color: var(--bing-muted); font-size: 13px; line-height: 1.8;">试着连续输入、退格，或者用方向键移动光标。</p>
        </div>
        <label style="display: grid; gap: 10px; font-size: 13px;">平滑光标
          <BingInput v-model="smooth" block aria-label="平滑光标" placeholder="试试中文组词、英文和退格" @input="notifications++" />
        </label>
        <output data-ime-output>已确认：{{ smooth || '（空）' }} · 输入通知：{{ notifications }}</output>
        <label style="display: grid; gap: 10px; font-size: 13px;">原生光标（对照）
          <BingInput v-model="native" :smooth-caret="false" block aria-label="原生光标" placeholder="在这里比较原生输入手感" />
        </label>
      </section>
    `,
  }),
}

export const NumberInput: Story = {
  name: '数字输入',
  render: () => ({
    components: { BingInput },
    setup() {
      const width = ref<number | string | null>(2)
      const count = ref<number | string | null>(0)
      const unrestricted = ref<number | string | null>(1.25)
      const accepted = ref<number | string | null>(30)
      return { width, count, unrestricted, accepted }
    },
    template: `
      <div style="display: grid; gap: 18px; width: min(340px, calc(100vw - 48px));">
        <label style="display: grid; gap: 8px;">线宽（px）
          <BingInput v-model="width" type="number" :min="0.5" :max="12" :step="0.5" suffix="px" clearable block aria-label="线宽" />
        </label>
        <output>当前值：{{ width === null ? 'null（空）' : width }} · {{ typeof width }}</output>
        <label style="display: grid; gap: 8px;">要素数量
          <BingInput v-model="count" type="number" :min="0" :step="1" block aria-label="要素数量" />
        </label>
        <label style="display: grid; gap: 8px;">任意小数（step=any）
          <BingInput v-model="unrestricted" type="number" step="any" :min="0" :max="10" block aria-label="任意小数" />
        </label>
        <label style="display: grid; gap: 8px;">父级固定 30，完成编辑后恢复
          <BingInput :model-value="30" type="number" :min="0" :max="100" block aria-label="受控数字" @update:model-value="accepted = $event" />
        </label>
        <output>最近请求：{{ accepted }}</output>
        <p style="margin: 0; color: var(--bing-muted); font-size: 13px; line-height: 1.7;">负号、小数点与指数可连续输入；清空返回 null。失焦或 Enter 规整，上下键与箭头支持 Shift 十倍步进，按住箭头可连续调节。</p>
      </div>
    `,
  }),
}

export const States: Story = {
  name: 'Input 与 Textarea 状态',
  render: () => ({
    components: { BingInput, BingTextarea },
    setup() {
      const SearchIcon = markRaw(Search)
      const SparklesIcon = markRaw(Sparkles)
      const search = ref('极光')
      const empty = ref('')

      return {
        SearchIcon,
        SparklesIcon,
        empty,
        search,
      }
    },
    template: `
      <div style="display: grid; gap: 14px; width: min(380px, calc(100vw - 48px));">
        <BingInput
          v-model="search"
          :icon="SearchIcon"
          type="search"
          placeholder="搜索动效"
        />
        <BingInput
          v-model="empty"
          :icon="SparklesIcon"
          placeholder="为预设命名"
        />
        <BingInput model-value="Disabled value" disabled />
        <BingInput model-value="错误状态聚焦仍保持红色" status="error" clearable aria-label="错误输入" block />
        <BingInput model-value="保存成功" status="success" aria-label="成功输入" block />
        <BingInput model-value="请核对内容" status="warning" aria-label="警告输入" block />
        <BingInput model-value="只读内容可以选择和复制" readonly aria-label="只读输入" block />
        <BingTextarea model-value="共享错误、焦点与组词行为" status="error" aria-label="错误文本域" :rows="2" block />
        <BingTextarea model-value="只读文本域" readonly aria-label="只读文本域" :rows="2" block />
      </div>
    `,
  }),
}

export const Password: Story = {
  name: '密码显隐',
  render: () => ({
    components: { BingInput },
    setup() { return { password: ref('hello-bing-ui'), fixed: ref('private-value') } },
    template: `<section style="display: grid; gap: 16px; width: min(380px, calc(100vw - 48px));">
      <label style="display: grid; gap: 8px;">密码（支持选区与键盘切换）<BingInput v-model="password" type="password" autocomplete="new-password" clearable block aria-label="密码" /></label>
      <label style="display: grid; gap: 8px;">关闭显隐按钮<BingInput v-model="fixed" type="password" :password-toggle="false" block aria-label="隐藏按钮的密码" /></label>
      <p style="margin: 0; color: var(--bing-muted); line-height: 1.7; font-size: 13px;">选中部分文字后点击眼睛，选区会保留。Tab 可定位到显隐按钮，Enter 或空格切换后回到输入框。</p>
    </section>`,
  }),
}

export const Adornments: Story = {
  name: '前后缀与单位',
  render: () => ({
    components: { BingInput },
    setup() { return { price: ref(128), url: ref('bing-ui.dev'), path: ref('components'), Search: markRaw(Search) } },
    template: `<section style="display: grid; gap: 18px; width: min(380px, calc(100vw - 48px));">
      <BingInput v-model="price" type="number" prefix="¥" suffix="元" :min="0" step="0.01" aria-label="金额" block />
      <BingInput v-model="url" prefix="https://" aria-label="域名" clearable block />
      <BingInput v-model="path" :icon="Search" prefix="/" aria-label="路径" block><template #suffix><span>.vue</span></template></BingInput>
      <p style="margin: 0; color: var(--bing-muted); font-size: 13px;">前后缀文字参与读屏描述，插槽可替换默认文字。</p>
    </section>`,
  }),
}

export const CharacterCount: Story = {
  name: '字数统计与上限反馈',
  render: () => ({
    components: { BingInput, BingTextarea },
    setup() { return { title: ref('一个接近上限的组件名称示例'), note: ref('共享文本控件层：中文组词完成后再发布。'), free: ref('😀 按原生 UTF-16 长度统计') } },
    template: `<section style="display: grid; gap: 18px; width: min(420px, calc(100vw - 48px));">
      <BingInput v-model="title" :max-length="20" show-count clearable block aria-label="标题" />
      <BingTextarea v-model="note" :max-length="60" show-count block aria-label="说明" />
      <BingInput v-model="free" show-count block aria-label="无限制计数" />
      <p style="margin: 0; color: var(--bing-muted); font-size: 13px; line-height: 1.7;">达到 90% 提示剩余字数；达到上限变红，继续输入时轻微反馈。选中文字仍可替换，减少动效时只提示颜色。</p>
    </section>`,
  }),
}

export const SearchLoading: Story = {
  name: '搜索加载与 Enter',
  render: () => ({
    components: { BingInput },
    setup() {
      const query = ref('')
      const loading = ref(false)
      const result = ref('输入关键字，模拟 900ms 搜索')
      let timer: ReturnType<typeof setTimeout> | undefined
      function search(value: string | number | null) {
        clearTimeout(timer)
        loading.value = Boolean(value)
        if (!value) { result.value = '输入关键字，模拟 900ms 搜索'; return }
        timer = setTimeout(() => { loading.value = false; result.value = '已搜索：' + value }, 900)
      }
      onBeforeUnmount(() => clearTimeout(timer))
      return { query, loading, result, search, Search: markRaw(Search) }
    },
    template: `<section style="display: grid; gap: 16px; width: min(380px, calc(100vw - 48px));">
      <BingInput v-model="query" type="search" :icon="Search" :loading="loading" block aria-label="搜索" placeholder="防抖搜索，也可按 Enter" @debounced-input="search" @enter="search" />
      <output aria-live="polite" style="color: var(--bing-muted);">{{ result }}</output>
      <BingInput model-value="正在校验" loading block aria-label="无图标加载" />
    </section>`,
  }),
}

export const Scrub: Story = {
  name: '前缀拖动调值',
  render: () => ({
    components: { BingInput },
    setup() { return { width: ref(120), commits: ref(0), rejected: ref(30) } },
    template: `<section style="display: grid; gap: 18px; width: min(420px, calc(100vw - 48px));">
      <label style="display: grid; gap: 8px;">在“宽度”上左右拖动<BingInput v-model="width" type="number" prefix="宽度" suffix="px" :min="0" :max="500" :step="2" scrub block aria-label="拖动宽度" @change="commits++" /></label>
      <output>当前值：{{ width }} · 提交次数：{{ commits }}</output>
      <label style="display: grid; gap: 8px;">父级固定 30，松手后统一恢复<BingInput :model-value="30" type="number" prefix="受控" :min="0" :max="100" scrub block aria-label="受控拖动" @update:model-value="rejected = $event" /></label>
      <output>最近请求：{{ rejected }}</output>
      <p style="margin: 0; color: var(--bing-muted); font-size: 13px; line-height: 1.7;">每 4px 一个步长，Shift 十倍；松手提交一次 change。Esc、指针取消或离开窗口撤销。也可直接输入或使用方向键。</p>
    </section>`,
  }),
}
