import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed } from 'vue'
import { fn } from 'storybook/test'
import BingCodeBlock from './BingCodeBlock.vue'
import type { BingCodeBlockHighlightLine, BingCodeBlockProps } from './BingCodeBlock.types'

type StoryArgs = BingCodeBlockProps & {
  onCopy: (...args: unknown[]) => void
  onCopyError: (...args: unknown[]) => void
  onHighlightError: (...args: unknown[]) => void
}

const typescriptCode = `import { ref } from 'vue'

const count = ref(0)

function increment(step = 1) {
  count.value += step
}

export function useCounter() {
  return {
    count,
    increment,
  }
}`

const longCode = Array.from({ length: 34 }, (_, index) => {
  const line = index + 1

  return `const metric${line.toString().padStart(2, '0')} = computeInsight(source[${index}], { animated: true, density: 'compact' })`
}).join('\n')

const wrappedCode = `const message = '这是一段特意加长的示例文字：开启自动换行后，代码会保留原有缩进，并根据容器宽度折行。即使在较窄的屏幕上，也能阅读完整内容，适合在文档中展示较长的说明、配置或代码片段。'

export function announce() {
  return message.toUpperCase()
}`

const meta = {
  title: 'Components/BingCodeBlock',
  component: BingCodeBlock,
  tags: ['autodocs'],
  args: {
    code: typescriptCode,
    language: 'ts',
    theme: 'auto',
    title: 'useCounter.ts',
    languageLabel: 'TypeScript',
    copyable: true,
    copyLabel: '复制代码',
    copiedLabel: '已复制',
    copyResetDelay: 1600,
    lineNumbers: true,
    highlightLines: [5],
    width: undefined,
    maxHeight: undefined,
    smoothScroll: true,
    resizable: false,
    resizableOptions: undefined,
    wrap: false,
    ariaLabel: '代码块',
    onCopy: fn(),
    onCopyError: fn(),
    onHighlightError: fn(),
  },
  argTypes: {
    code: {
      control: 'text',
      description: '需要展示的原始代码字符串。',
    },
    language: {
      control: 'text',
      description: '传给 Shiki 的语言标识。',
    },
    theme: {
      control: 'select',
      options: [
        'auto',
        'vitesse-light',
        'vitesse-dark',
        'github-light',
        'github-dark',
        'light-plus',
        'dark-plus',
      ],
      description: '`auto` 跟随 Bing UI 全局主题；也可以显式固定任意已注册的 Shiki 主题。',
    },
    title: {
      control: 'text',
      description: '代码块头部标题，通常是文件名。',
    },
    languageLabel: {
      control: 'text',
      description: '头部展示的语言标签；为空时使用 language 的大写形式。',
    },
    copyable: {
      control: 'boolean',
      description: '是否展示复制按钮。',
    },
    copyLabel: {
      control: 'text',
      description: '复制按钮默认文案。',
    },
    copiedLabel: {
      control: 'text',
      description: '复制成功后的按钮文案。',
    },
    copyResetDelay: {
      control: {
        type: 'number',
        min: 0,
        step: 100,
      },
      description: '复制成功状态恢复延迟，单位毫秒。',
    },
    lineNumbers: {
      control: 'boolean',
      description: '是否展示 1-based 行号。',
    },
    highlightLines: {
      control: 'object',
      description: '需要高亮的行号或闭区间范围，例如 [2, [4, 6]]。',
    },
    width: {
      control: 'text',
      description: '代码块宽度，数值按 px 处理，留空填满父容器。',
    },
    maxHeight: {
      control: 'text',
      description: '代码区域最大高度。',
    },
    smoothScroll: {
      control: 'boolean',
      description: '滚轮是否使用共享平滑滚动。',
    },
    resizable: {
      control: 'boolean',
      description: '是否允许调整代码块尺寸。',
    },
    resizableOptions: {
      control: 'object',
      description: '传入内部 BingResizable 的配置。',
    },
    wrap: {
      control: 'boolean',
      description: '是否保持缩进并允许长行换行。',
    },
    ariaLabel: {
      control: 'text',
      description: '代码块可访问名称。',
    },
  },
} satisfies Meta<StoryArgs>

export default meta

type Story = StoryObj<typeof meta>

const renderCodeBlock: Story['render'] = (args) => ({
  components: { BingCodeBlock },
  setup() {
    const demoArgs = computed(() => {
      if (!args.resizable) return args
      const availableWidth = Math.max(160, window.innerWidth - 48)
      const options = args.resizableOptions
      return {
        ...args,
        resizableOptions: {
          ...options,
          defaultSize: {
            ...options?.defaultSize,
            width: Math.min(Number(options?.defaultSize?.width ?? 640), availableWidth),
          },
          minWidth: Math.min(Number(options?.minWidth ?? 240), availableWidth),
          maxWidth: Math.min(Number(options?.maxWidth ?? 900), availableWidth),
        },
      }
    })
    return { demoArgs }
  },
  template: `
    <div style="width: min(920px, calc(100vw - 48px));">
      <BingCodeBlock v-bind="demoArgs" />
    </div>
  `,
})

export const Default: Story = {
  name: '基础示例',
  render: renderCodeBlock,
}

export const HighlightedLines: Story = {
  name: '重点行高亮',
  render: renderCodeBlock,
  args: {
    title: 'interaction.ts',
    highlightLines: [4, [8, 11]] satisfies BingCodeBlockHighlightLine[],
  },
}

export const Scrollable: Story = {
  name: '滚动内容',
  render: renderCodeBlock,
  args: {
    code: longCode,
    title: 'metrics.ts',
    languageLabel: 'TypeScript',
    highlightLines: [[12, 15]],
    maxHeight: 280,
  },
}

export const Wrapped: Story = {
  name: '自动换行',
  render: renderCodeBlock,
  args: {
    code: wrappedCode,
    title: 'announce.ts',
    highlightLines: [1],
    wrap: true,
  },
}

export const WithoutCopy: Story = {
  name: '隐藏复制操作',
  render: renderCodeBlock,
  args: {
    copyable: false,
    title: 'readonly.ts',
    highlightLines: [],
  },
}

export const ResizablePanel: Story = {
  name: '可调整尺寸',
  render: renderCodeBlock,
  args: {
    code: longCode,
    title: 'resizable-code.ts',
    languageLabel: 'TypeScript',
    highlightLines: [6, [10, 12]],
    resizable: true,
    resizableOptions: {
      defaultSize: {
        width: 640,
        height: 360,
      },
      minWidth: 380,
      minHeight: 240,
      maxWidth: 900,
      maxHeight: 430,
      directions: ['right', 'bottom', 'bottom-right'],
      showSize: true,
      ariaLabel: '可调整尺寸的代码块面板',
    },
  },
}
