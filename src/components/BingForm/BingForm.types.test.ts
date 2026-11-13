// @vitest-environment node

import { resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// 完整类型检查保留独立兜底时限，避免 CI 瞬时负载导致误报。
const typecheckTimeout = 30_000
let previousProgram: ts.SemanticDiagnosticsBuilderProgram | undefined
let previousWithoutZod: boolean | undefined
let previousZodImporters = new Set<string>()
const sourceFiles = new Map<string, ts.SourceFile>()

/** 在内存中检查消费方代码，避免本地安装的可选依赖掩盖类型声明问题。 */
function checkConsumer(source: string, withoutZod = false) {
  const entry = resolve(__dirname, '__type_consumer__.ts').replaceAll('\\', '/')
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: false,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    types: [],
  }
  const host = ts.createIncrementalCompilerHost(options)
  const canonicalPath = (file: string) => host.getCanonicalFileName(file.replaceAll('\\', '/'))
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (file.replaceAll('\\', '/') === entry) {
      return Object.assign(ts.createSourceFile(file, source, languageVersion), { version: source })
    }
    const key = canonicalPath(file)
    const cached = sourceFiles.get(key)
    if (cached && !shouldCreateNewSourceFile) return cached
    const loaded = getSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile)
    if (loaded) sourceFiles.set(key, loaded)
    return loaded
  }
  const resolutionCache = ts.createModuleResolutionCache(
    host.getCurrentDirectory(), host.getCanonicalFileName, options,
  )
  const zodImporters = new Set(previousZodImporters)
  host.resolveModuleNames = (names, containingFile) => {
    const importsZod = (name: string) => name === 'zod' || name.startsWith('zod/')
    if (names.some(importsZod)) zodImporters.add(canonicalPath(containingFile))
    else zodImporters.delete(canonicalPath(containingFile))
    return names.map((name) => withoutZod && importsZod(name)
      ? undefined
      : ts.resolveModuleName(name, containingFile, options, host, resolutionCache).resolvedModule)
  }
  // 切换依赖可用性时必须重新解析，不能让上一个用例的 Zod 解析结果掩盖缺失依赖。
  const resolutionChanged = previousWithoutZod !== withoutZod
  const invalidatedImporters = previousZodImporters
  host.hasInvalidatedResolutions = (file) => resolutionChanged && invalidatedImporters.has(canonicalPath(file))

  // 复用未变化声明文件的语义诊断，仍检查全部标准库、第三方声明和消费方代码。
  const program = ts.createSemanticDiagnosticsBuilderProgram([entry], options, host, previousProgram)
  previousProgram = program
  previousWithoutZod = withoutZod
  previousZodImporters = zodImporters
  const diagnostics = [
    ...program.getConfigFileParsingDiagnostics(),
    ...program.getOptionsDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ]
  return ts.sortAndDeduplicateDiagnostics(diagnostics).map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  )
}

describe('BingForm 的可选 Zod 类型依赖', () => {
  it('未安装 Zod 时仍能检查公共控件与表单类型', () => {
    expect(checkConsumer(`
      import type { BingButtonProps } from '../BingButton/BingButton.types'
      import type { BingFormProps } from './BingForm.types'
      const button: BingButtonProps = { size: 'sm' }
      const form: BingFormProps = { model: { name: '' } }
    `, true)).toEqual([])
  }, typecheckTimeout)

  it('兼容 Zod 的同步、异步校验与转换 schema，并拒绝无效校验结果', () => {
    expect(checkConsumer(`
      import { z } from 'zod'
      import type { BingFormSchema } from './BingForm.types'
      const schemas: BingFormSchema[] = [
        z.object({ name: z.string().min(1) }),
        z.object({ name: z.string() }).refine(async value => value.name !== 'taken'),
        z.object({ count: z.coerce.number() }).transform(value => value.count),
      ]
      // @ts-expect-error 校验失败必须包含可映射到字段的 issues。
      const invalid: BingFormSchema = { safeParseAsync: async () => ({ success: false, error: 'invalid' }) }
    `)).toEqual([])
  }, typecheckTimeout)
})
