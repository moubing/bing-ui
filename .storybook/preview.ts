import type { Preview } from '@storybook/vue3-vite'
import '../src/theme/index.css'
import './preview.css'

const bingThemes = ['light', 'dark', 'system'] as const

type BingTheme = (typeof bingThemes)[number]

function resolveBingTheme(value: unknown): BingTheme {
  return bingThemes.includes(value as BingTheme) ? (value as BingTheme) : 'light'
}

const preview: Preview = {
  decorators: [
    (story, context) => {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.bingTheme = resolveBingTheme(context.globals.bingTheme)
      }

      return story()
    },
  ],
  globalTypes: {
    bingTheme: {
      name: '主题',
      description: 'Bing UI 配色主题',
      toolbar: {
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'light', title: '浅色', icon: 'sun' },
          { value: 'dark', title: '深色', icon: 'moon' },
          { value: 'system', title: '跟随系统', icon: 'browser' },
        ],
      },
    },
  },
  parameters: {
    layout: 'centered',
    backgrounds: {
      options: {
        canvas: { name: '画布', value: 'var(--bing-canvas)' },
        white: { name: '纯白', value: '#ffffff' },
        sky: { name: '天蓝', value: '#f0f9ff' },
        pink: { name: '粉色', value: '#fdf2f8' },
        blushSky: {
          name: '粉霞天空',
          value:
            'radial-gradient(circle at 18% 12%, rgba(236, 72, 153, 0.14), transparent 28rem), radial-gradient(circle at 78% 0%, rgba(14, 165, 233, 0.16), transparent 26rem), linear-gradient(135deg, #fff7fb 0%, #f8fbff 52%, #fdf2f8 100%)',
        },
        glassMist: {
          name: '玻璃薄雾',
          value: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 46%, #fdf2f8 100%)',
        },
        cottonCandy: {
          name: '棉花糖',
          value: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 38%, #e0f2fe 100%)',
        },
        auroraSoft: {
          name: '柔和极光',
          value:
            'radial-gradient(circle at 22% 20%, rgba(244, 114, 182, 0.18), transparent 22rem), radial-gradient(circle at 82% 24%, rgba(125, 211, 252, 0.22), transparent 24rem), radial-gradient(circle at 48% 88%, rgba(251, 191, 36, 0.13), transparent 24rem), #fffafb',
        },
        lilacBreeze: {
          name: '丁香微风',
          value: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 45%, #e0f2fe 100%)',
        },
        peachCloud: {
          name: '蜜桃云朵',
          value: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 48%, #f0f9ff 100%)',
        },
        dark: { name: '深色', value: '#111827' },
      },
      grid: {
        cellSize: 24,
        opacity: 0.32,
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  initialGlobals: {
    bingTheme: 'light',
    backgrounds: { value: 'canvas' },
  },
}

export default preview
