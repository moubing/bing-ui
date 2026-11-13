import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isExternalDependency } from '../vite.config'

const root = resolve(__dirname, '..')

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return collectSourceFiles(path)
    return /\.(vue|ts)$/.test(name) && !/\.(stories|test)\.ts$/.test(name) ? [path] : []
  })
}

/** 源码中所有会被外置、原样保留在产物里的导入路径（含动态 import）。 */
function collectExternalSpecifiers() {
  const specifiers = new Set<string>()
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g
  for (const file of collectSourceFiles(resolve(root, 'src'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      if (isExternalDependency(match[1]!)) specifiers.add(match[1]!)
    }
  }
  return [...specifiers].sort()
}

describe('library build externals', () => {
  it('externalizes runtime and peer dependencies including subpaths', () => {
    for (const id of [
      'vue',
      'gsap',
      'gsap/SplitText',
      'shiki/core',
      'shiki/langs/typescript.mjs',
      'dayjs',
      'dayjs/plugin/customParseFormat',
      '@dnd-kit/vue',
      'zod',
    ]) {
      expect(isExternalDependency(id), id).toBe(true)
    }
  })

  it('keeps external import paths resolvable by Node ESM (SSR consumers)', () => {
    const specifiers = collectExternalSpecifiers()
    expect(specifiers).toContain('vue')
    expect(specifiers.some((id) => id.includes('/')), '应覆盖子路径导入').toBe(true)

    // Vite 的解析器会自动补全扩展名，SSR 与 Node 不会；没有 exports 映射的包必须写全文件名。
    // import.meta.resolve 只计算 URL，不检查文件是否存在，需要再确认解析结果是真实文件。
    const script = `
      import { statSync } from 'node:fs'
      import { fileURLToPath } from 'node:url'
      const failures = []
      for (const id of JSON.parse(process.argv[1])) {
        try {
          const url = import.meta.resolve(id)
          if (url.startsWith('file:') && !statSync(fileURLToPath(url), { throwIfNoEntry: false })?.isFile()) failures.push(id)
        } catch (error) {
          failures.push(id + ' (' + error.code + ')')
        }
      }
      process.stdout.write(JSON.stringify(failures))
    `
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(specifiers)], {
      cwd: root,
      encoding: 'utf8',
    })

    expect(JSON.parse(output)).toEqual([])
  })

  it('keeps library source and look-alike packages bundled', () => {
    for (const id of ['./components', '/src/index.ts', 'vue-router', 'gsap-extra', 'dayjs-x']) {
      expect(isExternalDependency(id), id).toBe(false)
    }
  })
})
