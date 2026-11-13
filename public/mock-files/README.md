# 预览示例文件

本目录保存 Storybook 和本地组件测试使用的静态示例。
Vite 和 Storybook 通过 `/mock-files/...` 提供这些文件。

| 文件 | 来源 | 用途 |
| --- | --- | --- |
| `sample.pdf` | 本地生成的中文示例，内嵌中文字体 | PDF 预览与转换后的 Office 预览 |
| `sample.docx` | 本地生成的中文虚构示例 | Office 预览提示与转换示例 |
| `sample.xlsx` | 本地生成的中文虚构示例 | Office 预览提示 |
| `sample.pptx` | 本地生成的中文虚构示例 | Office 预览提示 |
| `sample.txt` | 本地中文示例 | 文本预览 |
| `sample.csv` | 本地生成的中文示例 | 大型 CSV 预览性能检查，保留 1200 行、18 列 |
| `sample.json` | 本地生成的中文示例 | 大型 JSON 预览性能检查，保留 800 条嵌套记录及代码字段名 |

这些文件仅用于演示和测试，不作为实际业务数据。JSON 字段名、组件名称、格式和技术标识保留原文。

三个 Office 文件由 `scripts/generate-preview-fixtures.py` 生成，重新生成需要 Python、python-docx、openpyxl 和 python-pptx；这些工具不是组件库运行时依赖。公开版本使用自行编写的内容，未分发原先下载的第三方 Office 样例。
