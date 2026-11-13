import { resolveConfig, transformWithEsbuild } from 'vite'
import { describe, expect, it } from 'vitest'
import viteConfig from '../vite.config'

describe('library CSS build config', () => {
  it('preserves both standard and webkit backdrop-filter declarations in published CSS', async () => {
    const userConfig =
      typeof viteConfig === 'function'
        ? await viteConfig({
            command: 'build',
            mode: 'production',
            isSsrBuild: false,
            isPreview: false,
          })
        : viteConfig
    const config = await resolveConfig(userConfig, 'build', 'production')

    expect(config.build.cssMinify).toBe('esbuild')

    const result = await transformWithEsbuild(
      '.bing-glass{backdrop-filter:blur(8px) saturate(1.18);-webkit-backdrop-filter:blur(8px) saturate(1.18)}',
      'bing-glass.css',
      {
        loader: 'css',
        minify: true,
        target: config.build.cssTarget || undefined,
      },
    )

    expect(result.code).toContain('backdrop-filter:')
    expect(result.code).toContain('-webkit-backdrop-filter:')
  })
})
