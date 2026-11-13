import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'

const browserChannel = process.env.BING_UI_BROWSER_CHANNEL

export default defineConfig({
  plugins: [vue()],
  test: {
    browser: {
      enabled: true,
      // Vitest overrides Playwright's launchOptions.headless with this value.
      // Keep it explicit so local browser tests never open or focus a window.
      headless: true,
      ui: false,
      provider: playwright({
        launchOptions: {
          ...(browserChannel ? { channel: browserChannel } : {}),
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
    include: ['src/**/*.browser.test.ts'],
  },
})
