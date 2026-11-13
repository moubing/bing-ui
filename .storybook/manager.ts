import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Bing UI · 使用文档 ↗',
    brandUrl: 'https://101.35.217.21:6008/docs',
    brandTarget: '_blank',
  }),
})
