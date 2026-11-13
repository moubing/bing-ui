import { expect, test } from '@playwright/test'

test.skip('bing button default state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Primary action' })).toHaveScreenshot(
    'bing-button-default.png',
    {
      animations: 'disabled',
    },
  )
})
