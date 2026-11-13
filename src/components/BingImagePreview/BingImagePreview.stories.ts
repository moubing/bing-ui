import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import BingButton from '../BingButton/BingButton.vue'
import BingImage from '../BingImage/BingImage.vue'
import BingImagePreview from './BingImagePreview.vue'
import type {
  BingImagePreviewDownloadPayload,
  BingImagePreviewItem,
  BingImagePreviewProps,
} from './BingImagePreview.types'

function createSvgImage(
  label: string,
  background: string,
  accent: string,
  text: string,
  mode: 'landscape' | 'portrait' = 'landscape',
) {
  const width = mode === 'portrait' ? 520 : 900
  const height = mode === 'portrait' ? 720 : 560
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${background}"/>
  <circle cx="${width * 0.76}" cy="${height * 0.2}" r="${Math.min(width, height) * 0.22}" fill="${accent}" opacity="0.52"/>
  <circle cx="${width * 0.22}" cy="${height * 0.78}" r="${Math.min(width, height) * 0.28}" fill="${accent}" opacity="0.22"/>
  <path d="M0 ${height * 0.72} C ${width * 0.22} ${height * 0.44}, ${width * 0.5} ${height * 0.9}, ${width} ${height * 0.58} L ${width} ${height} L 0 ${height} Z" fill="${accent}" opacity="0.34"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${text}" font-family="Maple Mono NF CN, Consolas, monospace" font-size="${Math.round(width / 12)}" font-weight="800">${label}</text>
</svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const previewItems: BingImagePreviewItem[] = [
  {
    src: 'https://picsum.photos/seed/bing-preview-one/1200/780',
    alt: '远程风景图一',
    downloadName: 'bing-preview-one.jpg',
    caption: '查看完整图片。',
  },
  {
    src: 'https://picsum.photos/seed/bing-preview-two/1200/780',
    alt: '远程风景图二',
    downloadName: 'bing-preview-two.jpg',
    caption: '使用方向键或两侧按钮切换图片。',
  },
  {
    src: 'https://picsum.photos/seed/bing-preview-three/900/1200',
    alt: '远程人像图',
    downloadName: 'bing-preview-three.jpg',
    caption: '竖图保持完整比例。',
  },
]

const docsGeneratedPreviewItems: BingImagePreviewItem[] = [
  {
    src: createSvgImage('预览一', '#fee2e2', '#fb7185', '#7f1d1d'),
    alt: '预览图片一',
    caption: '第一张图片：横向封面图。',
    downloadName: 'preview-01.svg',
  },
  {
    src: createSvgImage('预览二', '#dbeafe', '#60a5fa', '#1e3a8a'),
    alt: '预览图片二',
    caption: '第二张图片：用于测试切换和计数器。',
    downloadName: 'preview-02.svg',
  },
  {
    src: createSvgImage('预览三', '#ede9fe', '#a78bfa', '#312e81', 'portrait'),
    alt: '预览图片三',
    caption: '第三张图片：竖向图片会完整适配预览空间。',
    downloadName: 'preview-03.svg',
  },
]

type StoryArgs = BingImagePreviewProps & {
  onClose?: (reason: string) => void
  onChange?: (index: number, item: BingImagePreviewItem) => void
  onDownload?: (payload: BingImagePreviewDownloadPayload) => void
}

const meta = {
  title: 'Components/BingImagePreview',
  component: BingImagePreview,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
BingImagePreview 支持缩放、拖动、旋转、重置、下载、多图切换与键盘操作。预览采用中性深色背景，让图片保持清晰。
        `,
      },
    },
  },
  argTypes: {
    modelValue: {
      description: '控制预览是否打开。',
      control: 'boolean',
    },
    items: {
      description: '预览器中的图片列表。',
      control: false,
    },
    initialIndex: {
      description: '打开时的初始图片索引。',
      control: {
        type: 'number',
        min: 0,
        step: 1,
      },
    },
    minScale: {
      description: '最小缩放比例。',
      control: {
        type: 'number',
        min: 0.1,
        step: 0.1,
      },
    },
    maxScale: {
      description: '最大缩放比例。',
      control: {
        type: 'number',
        min: 1,
        step: 0.5,
      },
    },
    zoomStep: {
      description: '工具栏和键盘操作的缩放步长。',
      control: {
        type: 'number',
        min: 0.05,
        step: 0.05,
      },
    },
    downloadable: {
      description: '显示下载工具。',
      control: 'boolean',
    },
    loop: {
      description: '上一张和下一张支持循环切换。',
      control: 'boolean',
    },
    lockScroll: {
      description: '打开时锁定页面滚动。',
      control: 'boolean',
    },
    closeOnEsc: {
      description: '按 Escape 键关闭。',
      control: 'boolean',
    },
    closeOnOverlay: {
      description: '点击遮罩时关闭。',
      control: 'boolean',
    },
    showToolbar: {
      description: '显示内置工具栏。',
      control: 'boolean',
    },
    showCounter: {
      description: '显示当前序号和图片总数。',
      control: 'boolean',
    },
    glass: { control: 'boolean', description: '启用预览工具栏与遮罩磨砂。' },
    glassBlur: { control: 'text', description: '默认跟随主题模糊强度。' },
    glassOpacity: { control: 'number' },
    glassSaturation: { control: 'number' },
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
    onChange: {
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
  },
  args: {
    modelValue: false,
    items: previewItems,
    initialIndex: 0,
    minScale: 0.5,
    maxScale: 5,
    zoomStep: 0.25,
    downloadable: true,
    loop: true,
    lockScroll: true,
    closeOnEsc: true,
    closeOnOverlay: true,
    showToolbar: true,
    showCounter: true,
    zIndex: 2400,
    ariaLabel: '图片预览',
    onClose: fn(),
    onChange: fn(),
    onDownload: fn(),
  },
  render: (args) => ({
    components: { BingButton, BingImagePreview },
    setup() {
      const open = ref(args.modelValue)

      return { args, open }
    },
    template: `
      <div>
        <BingButton @click="open = true">打开预览</BingButton>
        <BingImagePreview
          v-model="open"
          :items="args.items"
          :initial-index="args.initialIndex"
          :min-scale="args.minScale"
          :max-scale="args.maxScale"
          :zoom-step="args.zoomStep"
          :downloadable="args.downloadable"
          :loop="args.loop"
          :lock-scroll="args.lockScroll"
          :close-on-esc="args.closeOnEsc"
          :close-on-overlay="args.closeOnOverlay"
          :show-toolbar="args.showToolbar"
          :show-counter="args.showCounter"
          :glass="args.glass"
          :glass-blur="args.glassBlur"
          :glass-opacity="args.glassOpacity"
          :glass-saturation="args.glassSaturation"
          :z-index="args.zIndex"
          :aria-label="args.ariaLabel"
          @close="args.onClose"
          @change="args.onChange"
          @download="args.onDownload"
        />
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<StoryArgs>

export const Basic: Story = { name: '基础示例' }

export const Open: Story = {
  name: '默认打开',
  args: {
    modelValue: true,
  },
}

export const DocsGeneratedImages: Story = {
  name: '横图与竖图',
  args: {
    modelValue: true,
    items: docsGeneratedPreviewItems,
    initialIndex: 2,
    ariaLabel: '文档示例图片预览',
  },
  parameters: {
    docs: {
      description: {
        story: '使用本地 SVG 示例图片，默认打开竖图，便于验证适配、切换与计数器。',
      },
    },
  },
}

export const FromImages: Story = {
  name: '从图片打开',
  render: () => ({
    components: { BingImage },
    setup() {
      return { previewItems }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; width: min(820px, calc(100vw - 48px));">
        <BingImage
          v-for="(item, index) in previewItems"
          :key="item.src"
          :src="item.src"
          :alt="item.alt"
          :preview-items="previewItems"
          :preview-initial-index="index"
          preview
          preview-downloadable
          width="100%"
          aspect-ratio="4 / 3"
          radius="lg"
          block
        />
      </div>
    `,
  }),
}

export const Solid: Story = { name: '实色工具栏', args: { modelValue: true, glass: false, items: docsGeneratedPreviewItems } }
export const ErrorState: Story = { name: '加载失败', args: { modelValue: true, items: [{ src: '/missing-preview.jpg', alt: '加载失败示例', caption: '暂时无法加载原图，请稍后重试。' }] } }
