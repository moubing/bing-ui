import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import type { Plugin } from 'vite'

interface PackageManifest {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const manifest = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf8'),
) as PackageManifest

/** 运行时依赖与 peer 依赖全部外置，交给使用方的包管理器去重、打包器摇树。 */
const externalPackages = [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
]

export function isExternalDependency(id: string) {
  return externalPackages.some((name) => id === name || id.startsWith(`${name}/`))
}

/** 本地固化图标的第三方许可文本随产物发布。 */
function emitThirdPartyLicenses(): Plugin {
  return {
    name: 'bing-ui:third-party-licenses',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'icons/LICENSE-lucide.txt',
        source: readFileSync(resolve(__dirname, 'src/icons/LICENSE-lucide.txt'), 'utf8'),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(() => {
  const isStorybook = process.env.STORYBOOK === 'true'

  return {
    plugins: [
      vue(),
      !isStorybook && emitThirdPartyLicenses(),
      !isStorybook &&
        dts({
          tsconfigPath: './tsconfig.lib.json',
          entryRoot: './src',
          insertTypesEntry: true,
        }),
    ],
    build: isStorybook
      ? undefined
      : {
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es' as const],
            cssFileName: 'bing-ui',
          },
          cssMinify: 'esbuild' as const,
          copyPublicDir: false,
          rolldownOptions: {
            external: isExternalDependency,
            output: {
              // 按源码目录输出多文件，使用方只打包实际导入的组件。
              preserveModules: true,
              preserveModulesRoot: 'src',
              entryFileNames: '[name].js',
            },
          },
        },
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.ts'],
      exclude: ['src/**/*.browser.test.ts'],
    },
  }
})
