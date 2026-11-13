import type { StorybookConfig } from '@storybook/vue3-vite'
import { fileURLToPath } from 'node:url'

type BingStorybookConfig = StorybookConfig & {
  favicon: string
}

const config: BingStorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  staticDirs: ['../public'],
  favicon: fileURLToPath(new URL('../public/bing-ui-favicon.ico', import.meta.url)),
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(config) {
    return {
      ...config,
      build: {
        ...config.build,
        // Keep both backdrop-filter declarations in the static docs build.
        cssMinify: false,
      },
    }
  },
}

export default config
