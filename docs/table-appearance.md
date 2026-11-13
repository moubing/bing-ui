# BingTable 焦点与样式（REQ-50）

2026-11-11 根据 REQ-50（内部需求） 完成 P0 与 P1，包含合入 P1 的紧凑分页行为。接续 [REQ-49](./table-interactions.md)，已发布；文档站与需求看板最终统一使用 0.18.2。

## 焦点和滚动

新增全局 `--bing-focus-ring: var(--bing-accent)`，默认亮色 `#3f3f46`、暗色 `#d4d4d8`；原 `--bing-focus` 柔和光晕不变。表格通过 `--bing-table-focus-ring` 覆盖。

单元格和表头使用向内 1px 的伪元素及 2px 内阴影，圆角 4px；取消固定列边缘向相邻列外溢的 1px 遮片。焦点层留在单元格内部，不高于其他固定列或粘性表头。小控件使用内置轮廓；列宽手柄聚焦时显示 3px 竖线和当前宽度，提示与 `aria-valuetext` 同为如 `240px`。

`useTableViewport` 复用固定列宽度、选择列宽度和滚动条留白计算可阅读区域，统一服务键盘、`focusCell`、`scrollToRow` 与进入控件。固定列聚焦不改变横向位置；普通单元格完整滚入，超过可阅读宽度时按左侧阅读起点对齐。右侧固定列移出滚动条区域，内容最小宽度计入留白，横向末端也能完整显示最后一个普通列。虚拟行定位仍保留按 key 测量及请求校正。

强制颜色模式使用系统 `Highlight` 焦点和活动标记、`SelectedItem / SelectedItemText` 选中态，避免浏览器自动文本背景遮罩盖住选中文字。

## 主题变量

公开变量可以设置在表格自身或祖先容器；组件通过内部解析变量提供默认值，不覆盖祖先的输入。固定表头与普通表头共用同一表面。以下为支持的公开变量，`--_table-*` 和其他内部层级变量不作为定制接口。

| 公开变量 | 默认含义 |
| --- | --- |
| `--bing-table-bg` | `--bing-surface-solid` |
| `--bing-table-header-bg` | `--bing-surface-muted` |
| `--bing-table-striped-bg` | `--bing-surface-muted` |
| `--bing-table-row-hover-bg` | `--bing-surface-hover` |
| `--bing-table-row-selected-bg` | accent 7% 与表格背景混合的实色 |
| `--bing-table-row-active-bg` | `--bing-surface-active` |
| `--bing-table-row-active-accent` | `--bing-accent` |
| `--bing-table-line` | `--bing-border`，统一表头、数据行与填充行 |
| `--bing-table-line-strong` | `--bing-border-strong`，外框及 bordered 竖线 |
| `--bing-table-focus-ring` | `--bing-focus-ring` |
| `--bing-table-radius` | 8px |
| `--bing-table-row-height` | sm / md / lg：36 / 40 / 44px，最小高度 |
| `--bing-table-cell-padding-x` | sm / md / lg：10 / 12 / 14px |
| `--bing-table-cell-padding-y` | sm / md / lg：4 / 6 / 8px |
| `--bing-table-head-height` | sm / md / lg：32 / 36 / 40px，最小高度 |

行状态优先级为禁用、活动、选中、悬停、斑马纹、基础背景。状态直接替换背景，避免在斑马纹上叠加多层；悬停不再改变正文颜色。选中行使用浅底色及复选框，活动行使用较深背景和首格内上下各留 8px 的 2px 圆角标记。

用户已确认保留 6–8% 的浅选中底色；3:1 对比要求由焦点、复选框和活动标记承担，不要求浅底色本身与相邻行达到 3:1。字号、字重和字体保持原有设置。

## 布局与状态

- 新增 `columnControlsPlacement: 'auto' | 'toolbar' | 'footer'`，默认 `auto`：有分页时放页脚；无分页但有 toolbar 插槽时放工具栏右侧；两者均无时放表头右上角独立窄格。显式 `toolbar` 会创建工具栏，显式 `footer` 保留页脚入口。`showColumnControls=false` 仍完全隐藏入口。
- 新增 `treeGuides=false`，按需显示层级引导线。展开按钮为 20px 无边框按钮，单个 ChevronRight 旋转 90°，减少动效时关闭过渡。
- 当前页使用实色填充；分页容器不超过 540px 时隐藏首页、末页和“每页条数”文字，保留上一页、下一页和页码。
- 空态提供图标、标题、说明；错误态增加 danger 图标和 secondary 重试操作，原 `empty` / `error` 插槽继续支持业务自定义。骨架宽度按行列确定地分布于 45–85%，选择列使用 16px 方块；仅变换 shimmer 装饰层，减少动效时静止。首次加载分页总数使用固定宽度占位。
- 纵横轨道透明，滑块共用半透明颜色与 4px 粗细；去掉轨道侧面的不透明阴影，留白区域单独遮住横向滚过的正文。表头右上角使用完整表头底色。

## BingButton 兼容变化

默认 `flex-shrink: 0`，保留 `max-width: 100%`。与 `width: 100%` 的输入框并排时，输入框应设置 `min-width: 0`；如业务确实希望按钮收缩，可显式设置 `flex-shrink: 1; min-width: 0`。

省略号落在实际承载文字的 `BingAnimatedText` 内容行上；loading 拆字、textSwap 测量与图标层保持原有逻辑。表格中含控件的单元格仍保留 overflow 可见，不会为修复按钮而裁剪控件的焦点。

## 验证范围

新增 Storybook：`FocusVisibility`、`ThemeTokens`、`BingButton/FlexRow`。无头 Playwright 对 Default、KeyboardNavigation、HorizontalScroll 在横向 0 / 120px 起点逐个聚焦，像素抽样四条内边缘，圆角各排除 5px，允许 1px 抗锯齿邻域；列宽手柄单独检查竖线。530 个目标均达到每边 90% 的可见率。

检查 Default、Compact、ActiveRows、ErrorState、LoadingSkeleton、BothAxisScroll、FocusVisibility、ThemeTokens 的 1100px 亮 / 暗 / 强制颜色，以及前六个故事的 390px 亮 / 暗，共 36 个页面组合；检查默认按钮宽度与实际省略号。无页面脚本错误、无页面级横向溢出，未运行视觉回归或更新快照。

浏览器回归覆盖固定列安全区、普通 / 虚拟行定位、宽单元格、编辑焦点、列设置位置、主题继承、状态优先级、紧凑分页和初载骨架；默认亮暗主题的焦点与状态标记检查 3:1，正文检查 4.5:1。

最终验证：`pnpm test:run` 70 个文件、773 项通过；`pnpm test:browser --maxWorkers=2` 39 个文件、468 项通过；`pnpm build` 通过，类型声明完整且无 TS 诊断。实际方向键遍历 13 列、F2 / Esc、错误重试通过；KeyboardNavigation 在 440px 容器中执行自动适配列宽前后，3 个“清空”按钮的 clientWidth / scrollWidth 均为 40px，外宽 42px，没有被输入框压缩或裁剪。

P2 的外观变体、复选框粒子与拖拽卡片进一步调整仍留作后续。两个下游项目的主题规范、示例、活动行与 7 处表格已同步，结果见 [同步清单](./pending-consumer-updates.md#table-焦点与样式req-50)。
