import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import BingButton from '../BingButton/BingButton.vue'
import BingFilePreview from './BingFilePreview.vue'
import type {
  BingFilePreviewDownloadPayload,
  BingFilePreviewFile,
  BingFilePreviewOpenExternalPayload,
  BingFilePreviewProps,
} from './BingFilePreview.types'

const samples: Record<
  'text' | 'json' | 'csv' | 'pdf' | 'docx' | 'docxConverted' | 'xlsx' | 'pptx',
  BingFilePreviewFile
> = {
  text: {
    src: '/mock-files/sample.txt',
    name: '示例文件.txt',
    type: 'text',
  },
  json: {
    src: '/mock-files/sample.json',
    name: '示例文件.json',
    type: 'json',
  },
  csv: {
    src: '/mock-files/sample.csv',
    name: '示例文件.csv',
    type: 'csv',
  },
  pdf: {
    src: '/mock-files/sample.pdf',
    name: '示例文件.pdf',
    type: 'pdf',
  },
  docx: {
    src: '/mock-files/sample.docx',
    name: '示例文件.docx',
    type: 'docx',
  },
  docxConverted: {
    src: '/mock-files/sample.docx',
    name: '示例文件.docx',
    type: 'docx',
    previewSrc: '/mock-files/sample.pdf',
  },
  xlsx: {
    src: '/mock-files/sample.xlsx',
    name: '示例文件.xlsx',
    type: 'xlsx',
  },
  pptx: {
    src: '/mock-files/sample.pptx',
    name: '示例文件.pptx',
    type: 'pptx',
  },
}

type StoryArgs = BingFilePreviewProps & {
  onClose?: (reason: string) => void
  onDownload?: (payload: BingFilePreviewDownloadPayload) => void
  onOpenExternal?: (payload: BingFilePreviewOpenExternalPayload) => void
}

const meta = {
  title: 'Components/BingFilePreview',
  component: BingFilePreview,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
统一文件预览容器：图片交给 BingImagePreview，PDF 使用浏览器预览，文本、JSON 与 CSV 在本地渲染。Office 文件可通过 previewSrc 展示转换后的 PDF 或 HTML。标题栏跟随主题，文档内容保留白色纸面。
        `,
      },
    },
  },
  argTypes: {
    glass: { control: 'boolean', description: '背景磨砂。' },
    glassBlur: { control: 'number', description: '模糊半径，默认跟随主题。' },
    glassOpacity: { control: 'number', description: '遮罩透明度，默认跟随主题。' },
    glassSaturation: { control: 'number', description: '饱和度，默认跟随主题。' },
    modelValue: {
      description: '控制预览是否打开。',
      control: 'boolean',
    },
    file: {
      description: '需要预览的文件对象。',
      control: false,
    },
    src: {
      description: '文件源地址。',
      control: 'text',
    },
    name: {
      description: '显示的文件名。',
      control: 'text',
    },
    type: {
      description: '预览类型。设为 auto 时，根据 name、src 或 mimeType 自动识别。',
      control: 'inline-radio',
      options: ['auto', 'image', 'pdf', 'text', 'json', 'csv', 'docx', 'xlsx', 'pptx', 'office', 'unknown'],
    },
    mimeType: {
      description: '可选的 MIME 类型，用于自动识别文件格式。',
      control: 'text',
    },
    previewSrc: {
      description: '浏览器可直接渲染的预览地址，可用于 Office 文档转换后的 PDF 或 HTML。',
      control: 'text',
    },
    content: {
      description: '用于文本、JSON 和 CSV 预览的内联内容。',
      control: 'text',
    },
    downloadUrl: {
      description: '下载地址，默认使用 src。',
      control: 'text',
    },
    size: {
      description: '文件大小，单位为字节。',
      control: {
        type: 'number',
        min: 0,
      },
    },
    width: {
      description: '预览面板宽度。',
      control: 'text',
    },
    height: {
      description: '预览面板高度。',
      control: 'text',
    },
    downloadable: {
      description: '显示下载操作。',
      control: 'boolean',
    },
    openable: {
      description: '显示在新标签页打开的操作。',
      control: 'boolean',
    },
    jsonHighlight: {
      description: '高亮 JSON 的键、字符串、数字、布尔值和空值。',
      control: 'boolean',
    },
    jsonHighlightMaxLength: {
      description: '启用语法高亮的 JSON 文本长度上限。',
      control: {
        type: 'number',
        min: 1000,
        step: 100000,
      },
    },
    closeOnEsc: {
      description: '按 Escape 键关闭。',
      control: 'boolean',
    },
    closeOnOverlay: {
      description: '点击遮罩关闭。',
      control: 'boolean',
    },
    lockScroll: {
      description: '打开时锁定页面滚动。',
      control: 'boolean',
    },
    smoothScroll: {
      description: '文本和 CSV 内容使用共享的平滑滚动效果。',
      control: 'boolean',
    },
    textMaxLength: {
      description: '渲染文本的最大字符数。',
      control: {
        type: 'number',
        min: 1000,
        step: 1000,
      },
    },
    csvMaxRows: {
      description: '渲染 CSV 的最大行数。',
      control: {
        type: 'number',
        min: 1,
        step: 1,
      },
    },
    csvMaxColumns: {
      description: '渲染 CSV 的最大列数。',
      control: {
        type: 'number',
        min: 1,
        step: 1,
      },
    },
    zIndex: {
      description: '根节点的堆叠层级。',
      control: {
        type: 'number',
        min: 1,
        step: 100,
      },
    },
    ariaLabel: {
      description: '对话框的无障碍标签。',
      control: 'text',
    },
    onClose: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onDownload: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onOpenExternal: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    modelValue: false,
    file: samples.text,
    width: 'min(1120px, calc(100vw - 36px))',
    height: 'min(760px, calc(100vh - 36px))',
    smoothScroll: true,
    zIndex: 2300,
    lockScroll: true,
    closeOnEsc: true,
    closeOnOverlay: true,
    downloadable: true,
    openable: true,
    jsonHighlight: true,
    jsonHighlightMaxLength: 3_500_000,
    textMaxLength: 240000,
    csvMaxRows: 80,
    csvMaxColumns: 24,
    ariaLabel: '文件预览',
    onClose: fn(),
    onDownload: fn(),
    onOpenExternal: fn(),
  },
  render: (args) => ({
    components: { BingButton, BingFilePreview },
    setup() {
      const open = ref(args.modelValue)

      return { args, open }
    },
    template: `
      <div>
        <BingButton @click="open = true">打开文件预览</BingButton>
        <BingFilePreview
          v-model="open"
          :file="args.file"
          :src="args.src"
          :name="args.name"
          :type="args.type"
          :mime-type="args.mimeType"
          :preview-src="args.previewSrc"
          :content="args.content"
          :download-url="args.downloadUrl"
          :size="args.size"
          :width="args.width"
          :height="args.height"
          :smooth-scroll="args.smoothScroll"
          :glass="args.glass"
          :glass-blur="args.glassBlur"
          :glass-opacity="args.glassOpacity"
          :glass-saturation="args.glassSaturation"
          :json-highlight="args.jsonHighlight"
          :json-highlight-max-length="args.jsonHighlightMaxLength"
          :z-index="args.zIndex"
          :lock-scroll="args.lockScroll"
          :close-on-esc="args.closeOnEsc"
          :close-on-overlay="args.closeOnOverlay"
          :downloadable="args.downloadable"
          :openable="args.openable"
          :text-max-length="args.textMaxLength"
          :csv-max-rows="args.csvMaxRows"
          :csv-max-columns="args.csvMaxColumns"
          :aria-label="args.ariaLabel"
          @close="args.onClose"
          @download="args.onDownload"
          @open-external="args.onOpenExternal"
        />
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<StoryArgs>

export const Text: Story = { name: '文本预览' }

export const Json: Story = {
  name: 'JSON 预览',
  args: {
    file: samples.json,
    textMaxLength: 3_200_000,
    jsonHighlightMaxLength: 3_500_000,
  },
}

export const Csv: Story = {
  name: 'CSV 预览',
  args: {
    file: samples.csv,
    csvMaxRows: 1200,
    csvMaxColumns: 18,
  },
}

export const Pdf: Story = {
  name: 'PDF 预览',
  args: {
    file: samples.pdf,
  },
}

export const OfficeFallback: Story = {
  name: 'Office 文档提示',
  render: () => ({
    components: { BingButton, BingFilePreview },
    setup() {
      const openDocx = ref(false)
      const openXlsx = ref(false)
      const openPptx = ref(false)

      return {
        openDocx,
        openXlsx,
        openPptx,
        samples,
      }
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <BingButton @click="openDocx = true">预览 DOCX</BingButton>
        <BingButton variant="secondary" @click="openXlsx = true">预览 XLSX</BingButton>
        <BingButton variant="tertiary" @click="openPptx = true">预览 PPTX</BingButton>
        <BingFilePreview v-model="openDocx" :file="samples.docx" />
        <BingFilePreview v-model="openXlsx" :file="samples.xlsx" />
        <BingFilePreview v-model="openPptx" :file="samples.pptx" />
      </div>
    `,
  }),
}

export const ConvertedOffice: Story = {
  name: '转换后的文档',
  args: {
    file: samples.docxConverted,
  },
}

export const LongFilename: Story = {
  name: '长文件名',
  args: { file: { type: 'text', name: '项目资料_城市道路与公共设施年度更新说明_审核修订版.txt', content: '长文件名在标题栏省略，正文区域保持独立滚动。' } },
}

export const ErrorState: Story = {
  name: '加载失败',
  args: { file: { type: 'text', name: '未找到的文件.txt' } },
}

export const Solid: Story = {
  name: '关闭磨砂',
  args: { glass: false },
}
