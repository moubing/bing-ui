import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import BingImage from './BingImage.vue'
import type {
  BingImageErrorPayload,
  BingImageLoadPayload,
  BingImageProps,
  BingImageStatusChangePayload,
} from './BingImage.types'

const photos = {
  basic: 'https://picsum.photos/seed/bing-image-basic/1040/640',
  basicSmall: 'https://picsum.photos/seed/bing-image-basic/520/320',
  basicLarge: 'https://picsum.photos/seed/bing-image-basic/1560/960',
  placeholder: 'https://picsum.photos/seed/bing-image-basic/80/50?blur=6',
  portrait: 'https://picsum.photos/seed/bing-image-portrait/640/860',
  galleryOne: 'https://picsum.photos/seed/bing-image-gallery-one/720/520',
  galleryTwo: 'https://picsum.photos/seed/bing-image-gallery-two/720/520',
  galleryThree: 'https://picsum.photos/seed/bing-image-gallery-three/720/520',
  fallback: 'https://picsum.photos/seed/bing-image-fallback/840/520',
}

type StoryArgs = BingImageProps & {
  onLoad?: (payload: BingImageLoadPayload) => void
  onError?: (payload: BingImageErrorPayload) => void
  onStatusChange?: (payload: BingImageStatusChangePayload) => void
}

const meta = {
  title: 'Components/BingImage',
  component: BingImage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
BingImage 提供懒加载、加载占位、图片淡入、错误状态、备用图片与尺寸控制。

示例使用 picsum.photos 远程图片，用于观察加载、占位和备用图片切换；加载速度取决于网络。
        `,
      },
    },
  },
  argTypes: {
    src: {
      description: '图片源地址。',
      control: 'text',
    },
    alt: {
      description: '图片的无障碍描述。装饰性图片可使用空字符串。',
      control: 'text',
    },
    srcset: {
      description: '原生 img 的 srcset 属性。',
      control: 'text',
    },
    sizes: {
      description: '原生 img 的 sizes 属性。',
      control: 'text',
    },
    width: {
      description: 'CSS 宽度。数字按像素处理，并传入原生 width 属性。',
      control: 'text',
    },
    height: {
      description: 'CSS 高度。数字按像素处理，并传入原生 height 属性。',
      control: 'text',
    },
    aspectRatio: {
      description: 'CSS 宽高比，例如 16 / 9 或 1。',
      control: 'text',
    },
    fit: {
      description: '图片的 object-fit 适配模式。',
      control: 'inline-radio',
      options: ['contain', 'cover', 'fill', 'none', 'scale-down'],
    },
    position: {
      description: '图片的 object-position 对齐位置。',
      control: 'text',
    },
    radius: {
      description: '圆角尺寸。',
      control: 'inline-radio',
      options: ['none', 'sm', 'md', 'lg', 'xl', 'full'],
    },
    block: {
      description: '填满可用宽度。',
      control: 'boolean',
    },
    loading: {
      description: '原生 img 的加载行为。',
      control: 'inline-radio',
      options: ['lazy', 'eager'],
    },
    decoding: {
      description: '原生 img 的解码行为。',
      control: 'inline-radio',
      options: ['async', 'sync', 'auto'],
    },
    fetchPriority: {
      description: '原生 fetchpriority 加载优先级提示。',
      control: 'inline-radio',
      options: ['auto', 'high', 'low'],
    },
    fallbackSrc: {
      description: '主图片加载失败后使用的备用地址，仅尝试一次。',
      control: 'text',
    },
    placeholderSrc: {
      description: '加载时可选的模糊占位图片地址。',
      control: 'text',
    },
    showLoading: {
      description: '加载图片时显示内置加载图标。',
      control: 'boolean',
    },
    showError: {
      description: '加载失败时显示内置错误提示。',
      control: 'boolean',
    },
    errorText: {
      description: '默认错误提示。',
      control: 'text',
    },
    crossorigin: {
      description: '原生 crossorigin 属性。',
      control: 'inline-radio',
      options: [undefined, '', 'anonymous', 'use-credentials'],
    },
    referrerPolicy: {
      description: '原生 referrerpolicy 属性。',
      control: 'select',
      options: [
        undefined,
        '',
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin',
        'unsafe-url',
      ],
    },
    preview: {
      description: '图片加载完成后，点击打开 BingImagePreview。',
      control: 'boolean',
    },
    previewSrc: {
      description: '预览器使用的高分辨率图片地址。',
      control: 'text',
    },
    previewItems: {
      description: '预览器可选的图片列表。',
      control: false,
    },
    previewInitialIndex: {
      description: '使用 previewItems 时的初始预览索引。',
      control: {
        type: 'number',
        min: 0,
        step: 1,
      },
    },
    previewDownloadable: {
      description: '显示预览下载操作。',
      control: 'boolean',
    },
    previewDownloadUrl: {
      description: '单图预览的下载地址。',
      control: 'text',
    },
    previewDownloadName: {
      description: '单图预览的下载文件名。',
      control: 'text',
    },
    previewAriaLabel: {
      description: '预览触发器的无障碍标签。',
      control: 'text',
    },
    onLoad: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onError: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onStatusChange: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    src: photos.basic,
    alt: '图片加载示例',
    srcset: `${photos.basicSmall} 520w, ${photos.basic} 1040w, ${photos.basicLarge} 1560w`,
    sizes: '(max-width: 680px) 92vw, 520px',
    width: 520,
    height: 320,
    aspectRatio: undefined,
    fit: 'cover',
    position: 'center',
    radius: 'md',
    block: false,
    loading: 'lazy',
    decoding: 'async',
    fetchPriority: 'auto',
    fallbackSrc: undefined,
    placeholderSrc: undefined,
    showLoading: true,
    showError: true,
    errorText: '图片加载失败',
    crossorigin: undefined,
    referrerPolicy: undefined,
    preview: true,
    previewSrc: photos.basicLarge,
    previewItems: undefined,
    previewInitialIndex: 0,
    previewDownloadable: true,
    previewDownloadUrl: photos.basicLarge,
    previewDownloadName: 'bing-image-basic.jpg',
    previewAriaLabel: '预览远程图片',
    onLoad: fn(),
    onError: fn(),
    onStatusChange: fn(),
  },
  render: (args) => ({
    components: { BingImage },
    setup() {
      return { args }
    },
    template: `
      <BingImage
        :src="args.src"
        :alt="args.alt"
        :srcset="args.srcset"
        :sizes="args.sizes"
        :width="args.width"
        :height="args.height"
        :aspect-ratio="args.aspectRatio"
        :fit="args.fit"
        :position="args.position"
        :radius="args.radius"
        :block="args.block"
        :loading="args.loading"
        :decoding="args.decoding"
        :fetch-priority="args.fetchPriority"
        :fallback-src="args.fallbackSrc"
        :placeholder-src="args.placeholderSrc"
        :show-loading="args.showLoading"
        :show-error="args.showError"
        :error-text="args.errorText"
        :crossorigin="args.crossorigin"
        :referrer-policy="args.referrerPolicy"
        :preview="args.preview"
        :preview-src="args.previewSrc"
        :preview-items="args.previewItems"
        :preview-initial-index="args.previewInitialIndex"
        :preview-downloadable="args.previewDownloadable"
        :preview-download-url="args.previewDownloadUrl"
        :preview-download-name="args.previewDownloadName"
        :preview-aria-label="args.previewAriaLabel"
        @load="args.onLoad"
        @error="args.onError"
        @status-change="args.onStatusChange"
      />
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<StoryArgs>

export const Basic: Story = { name: '基础示例' }

export const RatioBox: Story = {
  name: '比例容器',
  args: {
    width: '100%',
    height: undefined,
    aspectRatio: '16 / 9',
    block: true,
  },
  render: (args) => ({
    components: { BingImage },
    setup() {
      return { args }
    },
    template: `
      <div style="width: min(720px, calc(100vw - 48px));">
        <BingImage
          :src="args.src"
          :alt="args.alt"
          :width="args.width"
          :height="args.height"
          :aspect-ratio="args.aspectRatio"
          :fit="args.fit"
          :position="args.position"
          :radius="args.radius"
          :block="args.block"
        />
      </div>
    `,
  }),
}

export const Contain: Story = {
  name: '完整显示',
  args: {
    fit: 'contain',
    position: 'center',
    radius: 'md',
  },
}

export const WithPlaceholder: Story = {
  name: '加载占位',
  args: {
    placeholderSrc: photos.placeholder,
  },
}

export const PreviewGallery: Story = {
  name: '预览图集',
  render: () => ({
    components: { BingImage },
    setup() {
      const items = [
        {
          src: photos.galleryOne,
          alt: '远程预览图集第一张',
          downloadName: 'gallery-one.jpg',
          caption: '图集第一张',
        },
        {
          src: photos.galleryTwo,
          alt: '远程预览图集第二张',
          downloadName: 'gallery-two.jpg',
          caption: '图集第二张',
        },
        {
          src: photos.galleryThree,
          alt: '远程预览图集第三张',
          downloadName: 'gallery-three.jpg',
          caption: '图集第三张',
        },
      ]

      return { items }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; width: min(820px, calc(100vw - 48px));">
        <BingImage
          v-for="(item, index) in items"
          :key="item.src"
          :src="item.src"
          :alt="item.alt"
          :preview-items="items"
          :preview-initial-index="index"
          preview
          preview-downloadable
          width="100%"
          aspect-ratio="4 / 3"
          block
          radius="lg"
        />
      </div>
    `,
  }),
}

export const RemoteGallery: Story = {
  name: '远程图集',
  render: () => ({
    components: { BingImage },
    setup() {
      return { photos }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 12px; width: min(820px, calc(100vw - 48px));">
        <BingImage
          :src="photos.galleryOne"
          alt="远程图集第一张"
          width="100%"
          aspect-ratio="4 / 3"
          block
          radius="lg"
        />
        <BingImage
          :src="photos.galleryTwo"
          alt="远程图集第二张"
          width="100%"
          aspect-ratio="4 / 3"
          block
          radius="lg"
        />
        <BingImage
          :src="photos.galleryThree"
          alt="远程图集第三张"
          width="100%"
          aspect-ratio="4 / 3"
          block
          radius="lg"
        />
      </div>
    `,
  }),
}

export const FallbackRemoteImage: Story = {
  name: '备用图片',
  args: {
    src: '/missing-primary-image.jpg',
    srcset: undefined,
    sizes: undefined,
    fallbackSrc: photos.fallback,
    width: 420,
    height: 260,
    previewSrc: photos.fallback,
    previewDownloadUrl: photos.fallback,
    errorText: '备用图片暂不可用',
  },
}

export const PortraitCrop: Story = {
  name: '纵向裁剪',
  args: {
    src: photos.portrait,
    srcset: undefined,
    sizes: undefined,
    width: 320,
    height: 420,
    fit: 'cover',
    position: 'center',
    radius: 'xl',
  },
}

export const ErrorState: Story = {
  name: '加载失败',
  args: {
    src: '/missing-image.jpg',
    srcset: undefined,
    sizes: undefined,
    fallbackSrc: undefined,
    preview: false,
    previewSrc: undefined,
    previewDownloadUrl: undefined,
    previewDownloadName: undefined,
    width: 420,
    height: 260,
    alt: '图片加载失败示例',
    errorText: '暂时无法加载图片',
  },
}
