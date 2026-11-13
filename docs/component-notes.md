# 组件接入与行为说明

[返回项目介绍](../README.md)

## Table 焦点与样式（REQ-50）

完成表格内置焦点环、固定列安全滚入、共享主题变量、浅底选中态与 2px 活动标记、20px 展开按钮、可选树形引导线、列设置自动位置、紧凑分页及空 / 错误 / 骨架样式。新增全局 `--bing-focus-ring`；BingButton 默认不在 flex 中收缩，受限宽度文字正确省略。

公开变量、`columnControlsPlacement` / `treeGuides`、按钮兼容变化与验证记录见 [Table 焦点与样式](./table-appearance.md)。按用户确认，保留浅选中底色，通过复选框、活动标记和焦点保证辨识度。其他项目继续只记录在 [待同步清单](./pending-consumer-updates.md#table-焦点与样式req-50)。

## Table 功能优化（REQ-49，P0/P1）

独立拆分已提交为 `813872a`。其后的功能候选完成 P0-2～P0-7 与 P1-1～P1-6：网格键盘与读屏语义、活动行、范围 / 级联 / 跨页选择、按需滚动条留白、稳定数据索引、变高虚拟行、自动列宽、排序循环和空 / 错误 / 骨架状态。

完整 API、快捷键、受控选择模型、兼容变化与性能实测见 [Table 交互与选择模型](./table-interactions.md)。其中 `keyboardNavigation=true`、`scrollbarGutter=auto`、rowKey 同级序号和 virtualRowHeight 仅作预估需要消费方注意；本轮只修改 bing-ui，其他项目见 [待同步清单](./pending-consumer-updates.md#table-功能优化req-49p0p1)。以下拆分章节保留为独立阶段的历史验证记录。

## Table 架构拆分（REQ-49，P0-1）

2026-11-10 完成 REQ-49（内部需求） 的独立拆分阶段。`BingTable.vue` 从 3553 行缩到 873 行，负责公开 props / emits / expose、组件装配和跨模块联动。

| 内部模块 | 职责 |
| --- | --- |
| `useTableData` | 根行排序、分页、树拍平、行 key / 禁用判断及分页与排序事件 |
| `useTableSelection` / `useTableExpansion` | 受控 / 非受控选择与展开、行点击及对应事件 |
| `useVirtualRows` | 虚拟窗口、spacer、行高测量；沿用原 measurements 注入键和批量调度 |
| `useFixedColumns` | 列样式缓存、左右固定偏移、遮罩与阴影 |
| `useColumnResize` / `useColumnDnd` | 列宽计算与拖动、键盘调宽、列拖拽传感器与滚动锁 |
| `useHorizontalScrollbar` | 横向轨道与拖动、视口测量、滚动事件和公开 scrollTo 的实现 |
| `useTableLoading` | 延迟显示、最短显示时长、settled 数据与总数 |
| `useTablePager` / `useTableMotion` | 分页派生状态、表框高度、收缩时旧行保留、分页按钮快照和分页栏浮动 |

上述文件位于 `src/components/BingTable/composables/`，显式接收所需 props、事件、ref 和回调；定时器、监听器与 rAF 在所属 composable 内清理。分页高度订阅在默认展开初始化之后注册，保留原有时序。

展示层拆成 `BingTableHeaderRow`、`BingTableBodyRow`、`BingTablePager`、`BingTableHorizontalScrollbar`、`BingTableFixedEdges`。表体行同时承接原有分页填充行，分页器通过内部插槽放置原有列设置入口。所有内部组件保留原来的原生根节点，不增加布局容器；表头 / 单元格共有样式放在 `BingTable.cells.css`，由对应组件以 scoped 样式复用，其余样式跟随组件。公开插槽继续透传，`.bing-table__*` 类名不变。

本阶段不改变公开 API、默认值、选择载荷、排序循环、虚拟行高估算或 rowKey 回调 index 的含义。索引与行缓存优化、语义和键盘模型、级联 / 范围选择、按需 gutter 等留到后续阶段。没有新增运行依赖，也没有导出内部 composable 或公共 Pagination。

验证结果：

- `pnpm test:run`：69 个文件、762 项通过，包含新增的 13 项 composable 测试。
- `pnpm test:browser -- --run`：无头 Chromium，36 个文件、443 项通过；Table 的 16 项覆盖拖列归位、自定义表头、列宽逐帧预览、虚拟行测量、插槽控件、加载保留行和测量器卸载。
- `pnpm exec vue-tsc --noEmit -p tsconfig.app.json` 通过。此次无公开 API 或构建配置变化，按约定未运行构建命令。
- 复用 6006 端口的 Storybook，以无头 Playwright 对全部 10 个 Table 故事分别采集 1100×760 / 390×760、亮 / 暗主题截图。40 组前后截图逐像素一致，表格 / frame 几何、行数、列头和文本也一致，未出现页面脚本错误。
- 在 `default` 实际操作勾选、树展开、键盘调宽、翻页、填充行和页大小过渡，在 `both-axis-scroll` 检查轨道点击与纵向滚动后的固定阴影，在 `remote-sort` 确认每次操作仅发起一次请求且保持服务端顺序，均通过。

| Storybook 故事 | 1100px 亮 / 暗 | 390px 亮 / 暗 |
| --- | --- | --- |
| 基础示例 `default` | 差异像素均为 0 | 差异像素均为 0 |
| 虚拟行 `virtual-rows` | 差异像素均为 0 | 差异像素均为 0 |
| 横向滚动 `horizontal-scroll` | 差异像素均为 0 | 差异像素均为 0 |
| 双向滚动 `both-axis-scroll` | 差异像素均为 0 | 差异像素均为 0 |
| 紧凑密度 `compact` | 差异像素均为 0 | 差异像素均为 0 |
| 空状态 `empty` | 差异像素均为 0 | 差异像素均为 0 |
| 加载遮罩 `loading` | 差异像素均为 0 | 差异像素均为 0 |
| 业务表格 · 邀请记录 `account-invitations` | 差异像素均为 0 | 差异像素均为 0 |
| 宽松密度 `spacious` | 差异像素均为 0 | 差异像素均为 0 |
| 服务端排序与真实分页 `remote-sort` | 差异像素均为 0 | 差异像素均为 0 |

截图对比仅用于此次拆分验收，没有运行 `test:visual` 或更新视觉基准。跨项目事项见 [待同步清单](./pending-consumer-updates.md#table-架构拆分req-49p0-1)；文档站、需求看板源码、依赖和部署均未修改。

## TreeSelect 交互优化（REQ-45 候选）

TreeSelect 已接入 Select 的活动节点、标签宽度测量、标签动画、搜索高亮和字符定位共享层。旧 `bing-tree-select__*` 类名保留，同时使用 `bing-picker__*` 外壳；多选标签随容器实际宽度折叠，退场结束后显示占位文字。共享测量保留第一个放不下的标签样本，避免测量数量反复扩缩导致持续布局。

新增 `typeahead`、`highlightMatches`，均默认 `true`；`node` 插槽新增 UTF-16 `matchRanges: { start, end }[]`。搜索支持英文/拼音首字母，搜索期间可展开收起；清空查询恢复此前状态，并保持当前活动节点可见。无搜索框时连续输入在 500ms 内累计定位可见节点。

搜索框左右键仅在折叠光标位于对应边界时导航树，Alt + 左右键不受光标位置限制；空查询支持星号展开同级、空格选择。输入法组词期间保留编辑行为。收起活动后代先移到父级；不可选目录仍可键盘展开。多选用 `aria-checked=true/false/mixed`，单选用 `aria-selected`，节点均带兄弟组总数、序号和层级。

子节点展开最多 160ms，下移 4px 淡入；收起淡出 120ms 后移除。普通树仅测量面板高度，不逐行做 FLIP；虚拟树只动画实际挂载行，滚动高度立即更新。快速切换结束上一批任务，卸载、关闭和减少动态效果时清理。展开图标旋转 180ms，详情图标按悬停/活动/聚焦显示，触摸设备始终显示。

`--bing-tree-select-indent` 默认 16px，`--bing-tree-select-guide-color` 默认 `--bing-border`；活动祖先路径使用 `--bing-border-strong`。旧缩进元素保留但不占宽，实际缩进用逻辑 padding，引导线用单个伪元素背景。选中节点以勾选与 500 字重区分，半选节点保留普通字重。

Storybook 新增“键盘导航”“深层级引导线”。受控展开、懒加载、选中展示策略等 P1 不在本次范围；该候选尚未发布。

本文保留原 README 中的具体接入规则、组件行为和迁移说明。项目概览、安装方式与组件目录见 README。

当前一轮组件优化对文档站和需求看板的影响及统一更新事项，见[组件升级与下游待办](pending-consumer-updates.md)。

## 点击反馈的滚动清理

共享点击碎屑记录点击时的页面及来源祖先滚动位置。只有这些位置发生新位移时才结束动画；无关容器的滚动、点击前已完成但延迟送达的滚动通知不会清掉新反馈。窗口缩放、页面隐藏、减少动态效果设置变化和应用卸载仍立即清理节点、时间线与监听器。

此前 Dropdown 的入场动画和焦点定位会产生短暂的滚动范围变化，位置归零后的通知可能晚于菜单项点击送达。旧实现监听整个文档的任意 scroll 并直接销毁反馈，导致真实动效提前消失，同时使浏览器断言偶发失败。回归现覆盖横向/纵向旧事件、无关区域滚动、来源祖先实际位移与页面滚动；保留原有真实点击断言。

无头 Playwright 验证了 Storybook 的 DropDown 基础示例与 Button 点击碎屑：浅色、深色下菜单关闭后反馈继续播放并自然清理，按钮尺寸保持稳定，键盘激活与减少动态效果正常。

## BingSelect：REQ-44 P0 与共享选择器外壳

`typeahead` 与 `highlightMatches` 默认开启。面板打开且焦点不在搜索框时，500ms 内输入的字符匹配标签前缀，再匹配英文/中文拼音首字母；重复字符循环定位，跳过禁用项，不在关闭状态改值。搜索高亮只处理默认标签，自定义 `option` 插槽收到 `matchRanges: { start: number; end: number }[]`，使用 UTF-16 偏移且 end 不包含。

选项统一由 `.is-active` 高亮，键盘导航后静止指针的 enter 不接管状态，实际移动超过 2px 且键盘滚动结束才恢复。选项 `tabindex=-1`，触发器和搜索框通过 `aria-activedescendant` 关联；虚拟选项提供当前结果集的 `aria-setsize / aria-posinset`。全选移到面板头部，三态与计数以当前可用结果为范围，保留范围外、禁用及未知的已有值。可从触发器/搜索框 Tab 到全选行，空格或 Enter 切换，继续 Tab 离开。

选中项使用勾选、`--bing-heading` 与 500 字重，active 项使用 hover 底色。单选立即 emit，并在关闭过渡中保留新选中态。标签只动画 transform / opacity，进入 0.18s、离开 0.12s；`+N` 滚动切换，减少动态效果时直接更新。

以下接口均为库内部共享层，不从包根导出；后续 TreeSelect 可复用，本轮没有迁移 TreeSelect 或改变其搜索/动效调用。

| 内部模块 | 接口与接入规则 |
| --- | --- |
| `utils/useActiveItem.ts` | `activeIndex / inputMethod / isKeyboardNavigating`，`fromKeyboard(index)`、`fromPointer(index, event, moving)`、`rememberPointer(event)`、`reset()`；`isPointerBlocked` 接 `useKeyboardScrollSync.isSyncing` |
| `utils/useOverflowTags.ts` | 输入 `items / enabled / paused / layoutKey`；返回 viewport/measure refs、`visibleItems / visibleTagCount / hiddenTagCount`、`measurementItems / overflowCounts / refresh`。测量副本使用 `data-picker-measure-tag` 和 `data-overflow-count`，先测 4 项前缀，仅容器放得下时扩展；标签和计数按最终布局一起提交。扣除容器 padding，观察尺寸/字体和前缀内容变化，动画期间延后测量 |
| `utils/useTypeahead.ts` | 输入 `items / activeIndex / onMatch / enabled`，返回 `handleKeydown / reset`；activeIndex 为调用方列表位置，关闭时 reset，作用域销毁清理定时器 |
| `utils/search.ts` | `getMatchRanges(text, query)` 返回合并后的原文区间；`getSearchInitials / searchQueryMatches` 只有显式传 `includePinyin=true` 才扩展中文能力，旧使用方保持原行为。拼音由 `pinyin-pro` 处理 |
| `motion/selectTagMotion.ts` | `useSelectTagMotion()` 返回 `tagHooks / counterHooks / isAnimating`，配合 Vue TransitionGroup/Transition；同实例复用 timeline、`overwrite: auto`，离场节点 inert 且脱离测量，卸载清理 |
| `theme/picker.css` | `bing-picker__trigger / __tags-value / __panel / __search-area / __actions` 等公共外壳样式，使用 picker 变量。Select 同元素保留旧类名并桥接旧变量，`.bing-select__action-rail` 为面板内操作容器的别名 |

可在 Select 根节点设置 `--bing-select-option-height` 与 `--bing-select-panel-radius`，打开时同步到 Teleport 面板；默认行高为 sm/md/lg 的 28/32/36px，圆角沿用 popover token。虚拟列表中显式 `virtualItemHeight` 优先，自定义内容应匹配实际行高。

批量全选不再为每个选中项创建标签和对应的 `+N` 测量副本；清空后再次全选也不会先挂载全部标签。实际可见/离场标签与计数使用 `will-change: transform, opacity` 保持动画结束前后的合成层稳定，测量副本不提升图层，减少动态效果时恢复 `auto`。值匹配、全选去重和计数使用集合索引，保持选项顺序及严格值比较。

清空时先批量记录同一轮离场标签的位置，再移出布局；入场尚未结束时被清空，也沿用这一批位置。占位文字不参与标签布局，并在最后一个标签退场后显示，避免挤位和重叠。全选行只在选中方向触发点击碎屑，取消全选不产生新的碎屑。新增逐帧回归覆盖位置/宽度不变、占位文字不重叠、快速反向切换与外部清空；Select 浏览器用例增至 16 项，692 项单测和 Vue 类型检查通过。VirtualList 的 1100px / 390px、亮暗主题、DPR 1 / 1.5 / 2 与减少动态效果走查通过。

本机 VirtualList 补充验证：225 个可用项全选时，测量节点从 450 个降至 9 个；清空后再全选，可见标签峰值从 225 个降至 2 个。相同无头 Chromium 场景，清空后全选到两次 rAF 的采样耗时由 329–337ms 降至 29–37ms（交互采样指标，不代表完整动画时长）。亮暗主题与 DPR 1 / 1.5 / 2 下，逐帧缩放单调、纵向中心稳定，动画结束后的两次标签截图像素一致；减少动态效果直接到终态。补充回归通过 692 项单测、Select 14 项浏览器用例及 Vue 类型检查，新增用例约束批量 DOM 数量、计数一次更新和宽容器按需扩展；本次未再构建。

验证记录（2026-11-10）：692 项单测、全套 339 项浏览器用例和类型检查/构建通过，收尾键盘修改后另复跑 Select 的 12 项浏览器用例。无头 Playwright 检查 Single、Typeahead、SearchHighlights、SelectAllCount、TagOverflow、LongList、VirtualList，以及 Table 分页和 ColorPicker 内嵌选择器；覆盖 390px、暗色、减少动态效果、全选行 Tab/字符定位和两项 CSS token。文档站候选示例与需求看板真实页面夹具的范围见 `pending-consumer-updates.md`。

P1 的分组、范围选择、selectedFirst、远程搜索和滑动高亮层不在本轮交付内。

## SSR 浮层

弹窗、选择器菜单、提示及预览的 Teleport 浮层在客户端挂载后创建，服务端仍输出页面与控件本体。这样无需应用手动拼接 `body` 浮层 HTML，也能避免多个异步组件水合时误认正文节点。初始设为打开的浮层会在挂载后的更新中显示；组件测试需等待 Vue 的 `nextTick()` 后检查其内容。

## 滚动条稳定占位

`BingScrollbar` 的默认内容容器按启用的方向固定预留轨道空间：纵向在右侧、横向在底部。预留从首次渲染生效，不随内容溢出、轨道显隐或禁用状态改变。`always` 仍只控制轨道可见性，`vertical` / `horizontal` 仍控制对应轨道与平滑滚动。

默认占位宽度为 `--bing-scrollbar-gutter: 13px`。页面需要相对整个视口居中时，在该滚动组件上设置 `--bing-scrollbar-gutter-left: var(--bing-scrollbar-gutter)`，左右将对称预留。该变量在每个实例重置为 `0px`，不会传给嵌套的局部滚动区域。已有安全留白的布局可以显式将 `--bing-scrollbar-gutter` 设为 `0px`。

自定义 `viewport` 插槽的尺寸和内边距仍由调用方负责，应在内容溢出之前就预留轨道空间。BingTextarea、BingTabs 和 BingTable 的内置滚动区域已采用固定占位；表格独立的横向轨道始终保留高度，未溢出时隐藏，并保持表头与固定列对齐。嵌套滚动条的占位、轨道显隐和表格样式仅作用于所属实例。

Storybook 的 **BingScrollbar / 稳定占位** 可切换短内容与长内容，检查正文中心和起始位置是否保持一致。

## 主题与外观

样式包包含 `light`、`dark` 和 `system` 三种主题，未设置时默认浅色。默认配色采用中性灰黑，浅色为白色表面，深色为炭灰表面；原有粉色、蓝色等色阶继续保留，可用于品牌与业务状态。

第一批外观试做覆盖 `BingButton`、`BingInput`、`BingSelect`、`BingCard` 和 `BingDropDown`，可在 Storybook 的 **Design / 外观试做** 中交互体验。提供「图层工作区」「实色表面」「紧凑尺寸」三个示例，并支持切换主题。

- Button 的 xs / sm / md / lg / xl 高度为 28 / 32 / 36 / 40 / 44px。
- Button 点击时本体保持稳定，以点击位置散开的短促碎屑替代缩放和下沉；键盘触发时从中心播放。禁用、加载、节流拦截及减少动态效果模式不触发新粒子，可在 **BingButton / 点击碎屑** 中体验。
- Button 的 `loading` 保留文字并循环逐字 jump，沿用 `textJump` 系列参数；结束后恢复配置的文字效果。带文字按钮的图标继续显示，纯图标按钮使用加载图标；显式禁用及减少动态效果时保留静态文字。可在 **BingButton / 加载文字** 和 **Loading Transition** 中体验。
- 共享表单控件的 sm / md / lg 高度为 32 / 36 / 40px。共享主题和尺寸会影响其他组件，其专属视觉仍待后续逐个调整。
- Select、TreeSelect 与 DropDown 默认单行选项的 sm / md / lg 行高为 28 / 32 / 36px。含自定义内容或说明的菜单项可增高；虚拟列表的自定义内容应配合 `virtualItemHeight` 指定实际行高。
- 普通控件以实色为主，首批卡片与菜单的磨砂默认使用 16px 模糊、1.05 饱和度、浅色 0.86 / 深色 0.92 底色不透明度。显式 `glassBlur` / `glassOpacity` / `glassSaturation` 优先于主题变量，设置 `:glass="false"` 后使用实色底。

将主题设置在文档根元素上，使 Teleport 到 `body` 的弹层与触发器继承相同变量：

```ts
document.documentElement.dataset.bingTheme = 'dark'

// 跟随操作系统主题。
document.documentElement.dataset.bingTheme = 'system'
```

建议在挂载 Vue 前应用持久化的主题，避免启动时闪烁。导入组件库样式后，可覆盖语义变量，例如自定义深色模式的强调色：

```css
html[data-bing-theme='dark'] {
  --bing-accent-rgb: 251 113 133;
  --bing-accent-strong-rgb: 254 205 211;
  --bing-accent-solid-rgb: 253 164 175;
  --bing-accent: #fb7185;
  --bing-accent-strong: #fecdd3;
  --bing-accent-solid: #fda4af;
  --bing-focus: rgb(var(--bing-accent-rgb) / 0.62);
}
```

当前主题以文档根元素为作用域，局部容器上的主题不会自动传播到 Teleport 弹层。

`BingCodeBlock` 默认使用 `theme="auto"`，浅色对应 `vitesse-light`，深色对应 `github-dark`。需要独立固定代码配色时，可传入明确的 Shiki 主题名。

## Input 与 Textarea 共享文本控件层（REQ-47）

`src/utils/useTextControl.ts` 供两种控件内部复用，负责组合输入、组合结束后的重复 input 去重、清除时序、焦点离开校验、UTF-16 计数及阈值提示。组词期间只显示草稿，不发布模型、input、防抖事件或 change 校验；确认后发布一次。根节点 focusout 在 nextTick 检查最终 activeElement，移到内部按钮、滚动条或立即移回字段不触发 blur 校验。原生 focus / blur / keydown 仍原样通知接入方；Textarea 在 REQ-48 中增加可选的提交快捷键与自动增高过渡，默认 Enter 仍换行。

共享 `src/theme/text-control.css` 定义 `.bing-text-control` 外框，保留 `.bing-input` / `.bing-textarea` 与原有尺寸、状态类。优先级为禁用 > error / success / warning > hover / focus。语义颜色聚焦时不丢失，readonly 使用柔和背景且允许选择复制；强制颜色模式使用系统 Highlight 焦点框。清除功能开启且可编辑时，按钮占位常驻；空值时 visibility 隐藏并移出 Tab 顺序和可访问树。Input 少约 29px 文字区，Textarea 固定保留右侧按钮空间，避免输入或清空时重排。

Input 新增能力：

| API | 默认与行为 |
| --- | --- |
| `passwordToggle` | password 类型默认 true；本地 Eye / EyeOff 按钮提供显示 / 隐藏密码标签与 aria-pressed，鼠标、Tab + Enter / Space 均可用。显隐按钮固定在操作区末端，清除按钮放在它前面；清空后末端不会留下空槽，眼睛和文字区保持原位，Tab 顺序与视觉顺序一致。切换前结束组词，切换后保留焦点、选区和滚动；密码即使可见也使用原生光标。禁用或切换类型重新隐藏 |
| `prefix` / `suffix` | 字符串或同名插槽，插槽优先；顺序为 icon、prefix、字段、suffix、计数、操作。可见前后缀通过 aria-describedby 合并进描述，文字点击聚焦字段 |
| `maxLength` / `showCount` | showCount 默认 false；显式 maxLength 优先于旧 maxlength 属性。长度与原生 maxlength 一样按 UTF-16 计算，数值类型不受原生 maxlength 限制。90% 警告、达到上限变红，继续输入被阻止时计数短暂 ±2px 反馈；替换选区仍可输入。独立 polite 区只在跨阈值时播报，计数本身不设 aria-live |
| `loading` | 默认 false；替换左侧图标，无图标时在操作区显示 LoaderCircle；字段 aria-busy=true，仍可编辑 |
| `enter(value, event)` | 普通 Enter 提交，忽略组合输入、229、修饰键或被 keydown 监听阻止的事件。number 先规整再传递 number / null；其他类型传字符串，不阻止原生表单提交 |
| `scrub` | 默认 false；number 类型且存在 prefix 时，按前缀横向拖动每 4px 一个步长，Shift 十倍。拖动连续发布 update:modelValue / input，释放后为父级接受的变化派发一次原生 change(Event)。Esc、pointercancel、丢失捕获或窗口失焦撤销，不派发 change。禁用、只读、切换类型或卸载释放监听、捕获及光标样式 |

显隐、清除只改变 opacity / transform；计数反馈使用 transform。系统减少动态效果或全局 reducedMotion=always 时关闭位移反馈与按钮过渡，加载图标只做透明度呼吸。

### 数字输入与浏览器自动填充

`BingInput` 支持原生 `type="number"`，可设置 `min`、`max`、`step`，保留浏览器范围校验。数值输入的 `v-model` 返回 `number | null`，清空返回 null；文本类型仍返回字符串。统一导出 `BingInputValue = string | number | null`，接入方的通用事件处理函数须接受空值。`input` 和 `debounced-input` 继续返回已确认的原始字符串。

负号、小数点、尾随小数点与指数前缀等编辑中间态不发布模型；原生 number 在 badInput 时会暴露空 value，组件将其与真正清空区分。失焦或 Enter 默认按 min/max 限制并按 step 网格规整，网格原点取 min（未设置取 0），结果用 toPrecision(14) 收敛浮点误差；`step="any"` 不对齐。未完成输入恢复最近有效值，真正空值仍为 null。`clampOnBlur=false` 可关闭自动范围 / 步长规整。完整原生行为参考 [WHATWG Number state](https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number))。

数字编辑保留本地草稿，完成编辑后 nextTick 与父级接受的模型重新同步。前缀拖动期间也保持本地预览，父级拒绝或修正不会让数值反复跳动，释放后统一恢复。`change` 继续使用原生事件参数；精确业务提交建议使用规整后的模型和 enter，或在整个控件失焦更新后的时机读取模型。

右侧步进按钮使用透明底 SVG 箭头，随主题调整颜色，支持点击和长按连续增减，Shift + 方向键 / 点击箭头为十倍步长。`step="any"` 从当前值加减 1；其他步长从非网格值沿步进方向对齐。达到对应边界时按钮禁用，按住到边界、只读、禁用、松开或卸载均停止重复步进。整数步长默认 inputmode=numeric，小数步长或 any 为 decimal，显式 inputmode 可覆盖。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { BingInput, type BingInputValue } from '@moubing/bing-ui'

const width = ref<BingInputValue>(2)
</script>

<template>
  <BingInput v-model="width" type="number" :min="0.5" :max="12" :step="0.5" prefix="宽度" suffix="px" scrub />
</template>
```

浏览器保存的历史输入与自动填充弹层由浏览器自身绘制，组件不能用页面 CSS 为它换肤。`:autofill` 只匹配已自动填充的输入框，不控制弹层外观。参考：[Chromium 弹层实现](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/ui/views/autofill/popup/README.md)、[MDN :autofill](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:autofill)。

组件默认设置 `autocomplete="off"`，关闭浏览器的历史输入提示。接入方显式传入的 `autocomplete` 原样透传，例如 `on`、`email`、`current-password`。浏览器或密码管理器仍可能忽略 `off`，无法保证所有原生弹层都被隐藏。组件不提供自定义输入建议。参考：[MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)。

Storybook 新增 **密码显隐、前后缀与单位、字数统计与上限反馈、搜索加载与 Enter、前缀拖动调值**，补充 **数字输入** 的空值、any、受控恢复，以及 **Input 与 Textarea 状态** 的亮暗主题和语义状态。Default 的 Controls 可调整全部新增 prop。下游同步清单见 [pending-consumer-updates.md](./pending-consumer-updates.md)。

### Textarea 提交、清除撤销与自动增高（REQ-48）

`BingTextarea` 继续使用共享编辑会话和外框状态。组词期间计数与高度根据当前草稿更新，模型、input 与表单 change 校验在确认后才发布；countFormatter 接收到的也是草稿长度。计数使用 tabular-nums，自身不带 aria-live；独立 polite 区只在跨越 90% 和达到上限时提示。上限反馈、选区替换和减少动效规则与 Input 一致。

| API | 默认与行为 |
| --- | --- |
| `submitOn` / `BingTextareaSubmitOn` | 默认 `none`，保留原生换行；`enter` 使用普通 Enter 提交、Shift+Enter 换行；`mod-enter` 使用 Ctrl / ⌘+Enter 提交、普通 Enter 换行。Alt / Shift 修饰的组合均不提交 |
| `submit(value, event)` | 只监听本 textarea 的 keydown，先保留原 keydown 通知；消费方 preventDefault 后不再提交。组词、isComposing、229、只读和禁用均不提交。成功提交时阻止默认换行，不额外发布模型 |
| `countFormatter(count, max?)` | 自定义计数文字；默认仍为 count/max 或 count。长度采用原生 maxlength 的 UTF-16 单位；不改变限制、颜色阈值和隐藏提示 |
| `clearable` | **默认从 true 改为 false**。显式 true 时仍保留右侧槽位，空值按钮隐藏且移出 Tab 顺序。接受清除后可在 5 秒内通过 Ctrl / ⌘+Z 恢复 |
| `autosizeTransition` | 默认 true；小幅整行增减使用 120ms / power2.out，高度是唯一参与补间的属性。设为 false 或减少动效时直接调整 |
| `resize(height)` | autosize 初次测量及高度变化稳定后通知一次；单位 px，为 textarea 的 border-box 高度，不包含计数区和外框。补间完成前不逐帧通知，同高度输入不重复通知；关闭 autosize 时不发出 |

提交模式会设置 `aria-keyshortcuts="Enter"` 或 `"Control+Enter Meta+Enter"`。组件不自动改写 placeholder，消费方用 `aria-describedby` 关联可见说明即可。公开的 `textarea / focus / blur / select` 保持不变。`resize` prop 仍控制原生手动缩放，与 `@resize` 高度通知分开使用。

清除继续按共享时序发布一次空字符串和 clear，随后聚焦字段；不伪造原生 input。撤销只恢复最近一次被父级接受的清除，发布一次 update:modelValue，恢复计数 / 高度并将光标放到末尾。新输入（包括开始组词）、离开整个控件、超时、父级改值、禁用 / 只读 / 切换 clearable 或卸载会丢弃快照；没有有效快照时不拦截原生撤销。受控父级拒绝清除不创建有效快照，拒绝撤销时仍显示父级接受的值。

自动增高在 nextTick 后按帧合并测量，保存并恢复 scrollTop。新目标会中断旧补间，从当前可见高度继续；相同目标不会反复重启动画。一次增加超过三行、到达 maxRows、初次布局、宽度 / 尺寸 / 行数配置变化时直接设高；达到上限后保持内部滚动。补间 onUpdate 不测量布局，完成时更新 BingScrollbar。卸载会取消待测量帧、断开 ResizeObserver 并清理本实例补间。关闭 autosize 恢复原生 rows / 原有内联高度，手动缩放仍可用。

纵向滚动条按自动增高的最终高度判断溢出，避免换行后内容先增长、框体补间尚未完成时闪出轨道。已经超过行数上限的真实溢出持续显示，不会在每次输入时先隐藏再出现；手动缩小文本域或关闭 autosize 后，恢复按实际可见高度判断。横向滚动沿用原有行为。

Storybook 增加 **提交快捷键、字数上限与提示、清除与撤销**；**状态** 按 default / error / success / warning 展示可编辑、只读和禁用；**自动增高** 提供逐行增删、长文本、过渡开关及 resize 通知次数。跨项目迁移见 [待同步清单](./pending-consumer-updates.md)。

## 文字动效

`BingAnimatedText` 提供 `shine`、`shimmer`、`jump` 三种效果和独立的 `swap` 文案切换。

- `shine` 默认让光带处的墨色变薄，浅色和深色背景下都可见；`shimmer` 常态减淡、原色光带扫过，用于持续等待。二者都使用 `shine*` 参数；`shineSpeed` 是光带穿过文字的时长，默认 1.6 秒，循环间隔默认 2.4 秒。
- hover 触发同时响应键盘聚焦。`followPointer` 默认开启：jump 从离指针最近的字向两侧扩散，shine 从指针进入的一侧扫入。`hoverTarget` 可传入元素或选择器（从文字向上 `closest()`），把整块区域作为感应区。
- `once` 在文字进入视口时播放；`always` 离开视口时暂停，回来后继续。
- `swap` 在文案变化时保留共同的字并滑到新位置，删除的字上移淡出，新字从下方翻入，占位宽度同步过渡。保留的字要移动超过 1.6 个字宽时改为原地翻出再翻入；超过 160 个字、禁用或减少动态效果时直接替换。默认关闭，避免实时计数、流式文本等高频变化产生干扰。
- 组件实例暴露 `play(origin?)`，可在保存成功等时机手动播放一次；传入指针事件时从该位置起势。

`BingButton` 的 hover 文字动效以整个按钮为感应区，`textSwap` 开启文案切换。可在 **BingAnimatedText / 文字切换、思考中、悬停跳动** 与 **BingButton / 文字切换** 中体验。

## 下拉菜单（DropDown）

`BingDropDown` 的点击、悬停、右键与虚拟锚点共用尺寸约束和 `BingScrollbar`。内容过长时在视口或 `boundary` 内滚动，右键菜单先向上平移，再压缩滚动区；子菜单独立滚动，并随父菜单滚动更新位置。外观尺寸与插槽实例不会因是否溢出而切换。

每层菜单由指针和键盘共用一个高亮项。键盘直接显示底色，指针保留 liquid 扩散；只有焦点已经在菜单树内，指针才同步移动焦点。编辑器命令菜单应继续使用 `autoFocus=false`、业务键盘处理与 `@mousedown.prevent`，通过 `active` 传递虚拟高亮和滚动目标。`active` 保留原视觉及 `aria-current`，当前值建议使用 `type="radio"` / `type="checkbox"` 与 `checked`；数据仍由业务控制，组件不自动切换 checked。

悬停打开默认等待 80ms，离开后默认等待 110ms；可通过 `hoverOpenDelay`、`hoverCloseDelay` 调整。子菜单等待 100ms，键盘右方向键、Enter 立即展开。指针从父项斜向进入子菜单时，安全三角暂时保留父项与子菜单，最多等待 300ms，左右展开均适用。子菜单与父面板相隔 4px，首项尽量对齐父项，接近视口边缘时优先避免溢出。

- 上下方向键、Home / End 在当前层移动，跳过禁用项；右方向键进入子菜单，左方向键或 Esc 返回父项，根层 Esc 关闭。
- 每层只保留一个 `tabindex=0`。菜单项上的 Tab / Shift+Tab 关闭整棵菜单，同步回到触发器后继续浏览器原生前后顺序。自定义输入框和表单按钮保持原生键盘操作。
- `typeahead` 默认开启：500ms 内累积字符进行前缀匹配，重复同一字符循环匹配项；输入法组合输入不触发。中文可通过 `textValue` 提供拼音或别名。焦点在外部编辑器时不会拦截输入。
- `BingDropDownGroup` 提供 `label` / `#label` 和分组语义，`BingDropDownDivider` 提供分隔线。标题与分隔线跟随入场，但不参与导航。
- `highlightMotion="slide"` 改为每层一个高亮层，在不改变文字尺寸的情况下平移和缩放；默认仍为 `liquid`。减少动态效果时直接切换。

快捷键使用独立键帽，支持 `Ctrl+Shift+C`、`Ctrl++` 和字符串数组，输出 `aria-keyshortcuts`。危险项标题与高亮使用危险色；禁用项保留禁用文字色，只减淡图标和快捷键。无图标的可勾选项使用前缀列，有图标时在末尾显示勾，勾选动画为 180ms 描线。

入场只处理当前可见项，错峰延迟总计不超过 120ms，第 8 项以后的可见项与第 8 项同时出现；滚动区外的项直接显示。点击关闭时保留选中高亮并延后 60ms 淡出。减少动态效果时直接打开 / 关闭。`trigger="contextmenu"` 支持触屏长按 500ms；移动超过 8px、松手、取消、卸载时清理等待。

Storybook 的 **BingDropDown / 长右键菜单、勾选菜单、滑动高亮、编辑器命令菜单** 可体验分组、状态选择、键盘导航、内部滚动与外部焦点。

## 复选框

`BingCheckbox` 的选中反馈由中心填充与 SVG 描勾组成，取消时先收笔再褪去填充；半选横线与勾共用线宽和颜色。连续切换从当前画面继续，不重置到动画起点。鼠标悬停未选项时显示淡勾，按下时轻微缩小；键盘 Tab / 空格沿用原生复选框行为，只在选择完成时播放点击碎屑。

控件外部尺寸、文字间距与行高保持不变。无文字的普通复选框通过透明命中层扩大到 32px（sm 为 28px），不占布局空间；密集自定义布局仍应给相邻操作留出命中间距。`--bing-checkbox-stroke` 可覆盖勾和横线粗细，默认 sm / md / lg 为 1.5 / 1.75 / 2px，数字尺寸按比例计算。禁用选中态保留正常配色并降低控件透明度，文字继续使用禁用色。

`decorative` 复选框继续播放状态动画，但不新增交互、悬停淡勾或按压缩放，由 Select、TreeSelect、任务清单等宿主管理焦点与点击。初次渲染直接显示终态；减少动态效果时直接切换，设置在播放中改变也会立即停止动画。

外部批量更新在同一帧内按文档顺序依次播放，间隔 14ms、最大延迟 220ms；视口外或同批超过 60 个的控件直接显示终态，数据和事件不等待动画。状态首次变为 error 时轻摆提醒一次，初始 error 与 decorative 不播放提醒。

`BingCheckboxGroup` 新增两个默认关闭的属性：

| 属性 | 行为 |
| --- | --- |
| `dragSelect` | 鼠标或触控笔按下并跨项拖动后，经过的可用项统一设为起始项切换后的状态，往回划过不撤销；触摸保留原生滚动 |
| `rangeSelect` | Shift + 点击将上次指针点击项到当前项之间的可用项设为当前项的新状态；键盘逐项选择保持原生行为 |

两种手势都跳过禁用项，支持 options 和默认插槽。拖动时实时发出 `update:modelValue`，松开后只发一次 `change` 并校验表单；范围选择也只提交一次。普通点击的事件语义保持不变。

Storybook 的 **BingCheckbox / 交互细节、批量选择** 提供按压、键盘、半选互切、全选级联及分组手势的体验入口。

## 对话框

`BingDialog` 默认从打开时焦点元素的方向浮起；`transitionOrigin` 支持 `auto`、`center`、元素或视口坐标 `{ x, y }`。取消、关闭按钮、Esc 和遮罩关闭时向触发方向回落，确认后向上淡出；程序直接关闭按取消处理。进出场由实例独立的 GSAP 时间轴接管，快速反向从当前画面继续，退出完成后卸载并释放滚动锁。窥视与进出场互相打断，减少动态效果时只过渡透明度。

`initialFocus="auto"` 优先内容区带 `autofocus` / `data-autofocus` 的元素，其次为可用表单控件，再回退到弹窗自身。可传选择器或元素，`false` 沿用原浮层焦点规则；关闭后仍恢复触发前的焦点。头部按钮统一使用 Button，并为窥视按钮提供延迟 400ms 的 Tooltip。

`busy` 默认跟随 `confirmLoading`，显式 `false` 可覆盖。忙碌时关闭、取消按钮保留位置并禁用，弹窗带 `aria-busy`，所有用户关闭请求都被阻止；程序直接更新 `v-model` 不受限制。自定义 footer 获得额外的 `busy` 插槽参数，`close`、`cancel`、`confirm` 仍由组件统一处理，直接写业务模型则由业务负责。

被 `closeOnOverlay`、`closeOnEsc`、忙碌保护或关闭前确认拦截时，每次发出 `close-prevented(reason)`，并轻微缩放、闪现描边。`rejectFeedback=false` 保留事件、关闭内置反馈。`beforeClose(reason)` 可返回 boolean 或 Promise；返回 false、异常、拒绝或等待超过 30 秒均保留弹窗，等待期间不重复调用；关闭、重新打开和卸载后忽略旧 Promise 的结果。

头部与底部分隔线根据正文滚动位置显隐，伪元素不改变原有内容 padding 和底部占位。`--bing-dialog-radius` 默认采用 `--bing-radius-lg`。`glass` 已标记废弃，背景模糊使用 `overlayBlur`；旧属性继续保留至下个大版本。

560px 以内使用贴底面板，顶部拖动超过面板高度的 30% 或向下速度超过 0.6px/ms 时以 `swipe` 原因关闭，小幅拖动回弹。只接收把手和头部的拖动，内容区保留滚动；禁用遮罩关闭或忙碌时只做阻尼并提醒。支持 `visualViewport` 的浏览器根据可视高度与偏移避让输入法，底部保留安全区。`BingDialogCloseReason` 的穷尽分支需处理新增的 `swipe`。

嵌套层级复用浮层栈：上层打开时，下层 Dialog 退后并设为 `inert`；上层遮罩减半且不重复模糊。Select、Tooltip 等非 Dialog 浮层不会触发退后。Storybook 新增 **打开与关闭、拒绝关闭、嵌套弹窗、窄屏底部面板、关闭前确认**，用于核对方向、保护、手势和焦点恢复。

## 文字提示（Tooltip）

Tooltip 用于短标签和补充说明；表单、链接列表及长段落优先使用 Popover 或独立页面。默认等待 180ms 后悬停打开，进场为 160ms；离开等待 90ms，再用 140ms 退出。点击触发器后以 `click` 原因关闭，并在指针离开前抑制 hover / focus，避免关闭后闪回。`trigger` 包含 `click` 时仍由点击切换。只有 `:focus-visible` 的键盘焦点打开提示，鼠标点击产生的焦点不打开。

触屏点按不触发 hover；按住 500ms 显示，移动超过 8px 取消。松手后 1500ms 自动关闭，期间新的指针按下立即关闭；原生长按菜单和选字仅在触发器长按期间抑制。关闭、禁用与卸载都会清理等待和自动关闭计时器。

所有实例仍共用一个面板。`skipDelay` 默认 300ms，在前一个提示关闭后的窗口内，进入下一个目标会跳过悬停等待。共享面板接管时，旧实例立即清空状态和计时器，发出 `update:modelValue(false)` 及 `close('replaced')`。click / manual 打开的提示优先保留，其他目标的 hover / focus 被抑制；显式 click / manual 仍可以替换它。

同方向且面板中心距离不超过 160px 时平移 180ms；远距离或换边时先在旧位置淡出 80ms，再在新位置淡入 120ms，新文字延后 40ms 开始出现。背景、边框和阴影位于独立 surface，使用 scaleX / scaleY 适配尺寸，文字不随背景拉伸。打开时内容变化采用 120ms 的表面形变和文字过渡。减少动态效果时直接显示、定位和卸载。

ARIA 默认关联 `.bing-tooltip__anchor` 内第一个按钮、链接、输入控件或可聚焦元素，无合适目标时回退根节点。保留已有 `aria-describedby` token，只清理自己的 ID；提示与 `aria-label` 或目标文本一致时不重复描述。click / manual 的 controls / expanded 也放到目标，业务已有的展开状态优先。默认插槽可通过 `triggerProps` 显式绑定其他目标。禁用按钮应使用可聚焦的外层包装，并让禁用按钮的指针事件由包装层接收。

新增属性：

| 属性 | 默认值 | 用途 |
| --- | --- | --- |
| `skipDelay` | `300` | 关闭后的免等待窗口，毫秒 |
| `scrollable` | `false` | 强制使用滚动容器，适合不希望溢出检测重挂内容的场景 |
| `suppressWhenExpanded` | `true` | 目标业务 `aria-expanded=true` 时自动抑制提示 |
| `shortcut` | — | 字符串或字符串数组；渲染键帽并设置目标的 `aria-keyshortcuts` |
| `tone` | `surface` | `inverse` 使用反色实底，随亮暗主题反转，不使用玻璃效果 |

短文案使用对称内边距的普通容器，仅检测到宽高溢出后切换到 `BingScrollbar`（内容会重挂一次）。面板受所选方向可用空间限制，避免长说明覆盖触发器。外观可通过 `--bing-tooltip-radius`（6px）、`--bing-tooltip-shadow` 和 `--bing-tooltip-padding`（6px 8px）调整；滚动模式保留滚动槽的内边距补偿。Tooltip 与 DropDown 的键帽共用主题中的 `.bing-kbd`。

Storybook 新增 **工具栏连续浏览、禁用按钮说明、反色与快捷键、内容与尺寸变化、近距离与远距离切换**；长内容示例作为溢出降级展示。真实使用项目的文档、菜单和编辑器入口在本轮统一升级时验证，参见下游清单。

## 滑块（Slider）

REQ-46 已实现 P0、P1、P2。`BingSlider` 保留每个值对应的原生 `input[type=range]`，承接 id、name、label、表单提交、键盘和读屏输入；透明 input 的位置与滑块一致，指针事件由根节点接收。轨道、填充、滑块和气泡由自绘层呈现，不能再通过原生 range 伪元素定制外观。单值模式的默认值仍为 0，范围模式未传初值时采用可用区间的两端。

数值先按 min / max / step 规范化，非法外部模型只影响显示，不主动回写。`update:modelValue` 连续提供新值，`change` 在松开指针、键盘松键或失焦时只提交一次已接受的变化；重复值和父级拒绝的值不提交。原生 input/change 事件仍可供移动端读屏调节。`name` 在范围模式下提交两个同名字段，可用 `FormData.getAll(name)` 读取。

受控拖动使用独立的预览值，滑块、填充、气泡和原生 input 在按住期间一致跟随手势。父级拒绝或修正数值时，不在每次移动后抢回位置；结束拖动后等待最后一轮父级更新，再统一回到已接受的值。Esc、触屏取消、失去捕获、窗口失焦和禁用也会清理预览，change 仍只提交父级接受的变化。

鼠标在滑块上按下时保留抓取偏移；点击轨道移动较近的滑块，拖出控件仍可继续调整。拖动期间锁定抓取光标和选字，失去捕获、禁用、窗口失焦或卸载时清理。触屏轨道先判断方向：水平移动超过 6px 且大于竖向位移后开始拖动，竖向意图交给页面滚动；移动小于 6px、持续小于 300ms 的点按在松手时生效。按住滑块立即拖动，触屏取消会回到操作前数值且不提交。粗指针命中区扩大至 44×44，视觉尺寸保持不变。

竖向模式从下到上递增，不随 RTL 翻转；原生 input 设置 `aria-orientation="vertical"`。上下键仍表示增减，轨道触屏改为纵向意图超过 6px 后激活、横向交给浏览器（`touch-action: pan-x`）。默认高度 200px，可通过 `style="height: 240px"` 等设置；刻度文字位于右侧，气泡位于左侧，二者沿高度收在两端。范围、最小间距、离散刻度、受控预览、尺寸和状态均沿用横向规则。

拖过可用区间的两端时，只在滑块绘制层增加阻尼位移和沿拖动轴的挤压：位移不超过 6px，压缩系数最低 0.9（叠加按下放大）。数值、填充和原生控件仍停在有效边界；范围内碰到另一滑块不触发边缘弹性。按住期间直接跟随，不启动自动回弹；松手后用 0.24s 恢复，回到区间内立即消除形变。取消、失焦、禁用、方向切换和卸载均清理；减少动效时关闭形变和回弹。

方向键逐步调整，Shift + 方向键采用 10 倍步长；PageUp / PageDown 采用 `max(step, (max - min) / 10)` 再对齐步长。Home / End 到达当前滑块可用的两端。RTL 下水平方向键与几何一起翻转，上下键继续表示增减。拖动中 Esc 恢复按下前的值并发送更新，不发送 change；不会触发外层浮层的 Esc 关闭。

跳跃式变化和外部恢复默认使用 0.2s `power3.out`，连续跳跃从当前画面继续；方向键单步与拖动直接到位。`sliderMotion` 为每个滑块复用 quickTo，在抓住正在移动的滑块时暂停，在释放时收敛到已接受值，卸载时销毁。位置只更新 transform，填充通过两个裁切层平移，避免 scaleX 拉伸圆角。CSS 容器长度单位让首帧、SSR 和容器缩放无需 JS 测宽；同一百分比同时驱动滑块、填充和气泡，气泡主体用 CSS clamp 收在两端，箭头始终指向滑块。系统与 ConfigProvider 的减少动效设置均受支持。

| 能力 | 默认值与规则 |
| --- | --- |
| `size` | 继承 FormItem / Form / ConfigProvider，最后回退 md；sm / md / lg 的轨道为 4 / 5 / 6px，滑块为 14 / 16 / 20px，命中高度为 28 / 32 / 36px |
| `status` | success / warning / error 对应成功、警告、危险色；error 同时设置 aria-invalid |
| `tooltip` | 默认 never；auto 仅在按下、拖动或键盘聚焦时显示，结束后延迟 600ms 淡出；always 常显。浮动气泡不占文档流，示例需为上方标签留出空间 |
| `formatTooltip` | 默认 String(value)，与较长的 `formatValueText` 读屏文案独立；气泡 aria-hidden，无 Teleport，不占用 BingTooltip 共享面板 |
| `marks` | 数字或 `{ value, label? }` 数组；过滤非法及越界值、排序、按值去重，重复值保留最后一项；文字点击定位，不增加 Tab 停靠点 |
| `snapToMarks` | 默认 false；开启后只取有效标记值，忽略 step，方向键逐档移动；无有效标记时回退普通步长 |
| `range` | 默认 false；开启后模型与事件载荷为 `[number, number]`，按值排序且不交换两个 input 的身份；点击轨道选较近端点，重合后由拖动方向决定移动端点 |
| `minDistance` | 默认 0；不整除 step 时使用满足距离的合法刻度，超过可用跨度时限制为整个跨度；离散模式使用可满足距离的标记 |
| `thumbAriaLabels` | 分别指定两个完整读屏名称；否则 ariaLabel 加“最小值 / 最大值”。ariaLabelledby / FormItem 标签与独立后缀关联，原生 min / max 反映各端点当前可用范围 |
| `orientation` | 默认 horizontal；vertical 从下到上，默认高 200px，可通过 style.height 设置 |
| `resetValue` | 默认未设置；配置后双击滑块恢复到指定值，单值为 number，范围为元组；双击任一范围滑块恢复整个区间。先按步长 / 标记 / 最小间距规范化，只为父级接受的变化提交一次 change；轨道双击与禁用状态不触发恢复 |

保留 `.bing-slider`、`.is-disabled`、`.bing-slider--{status}` 与 `--bing-slider-color`。新增 `--bing-slider-track-color`、`--bing-slider-track-height`、`--bing-slider-thumb-size`、`--bing-slider-thumb-border`；强制颜色模式使用系统颜色。`input` 继续指向第一个原生控件，新增 `inputs` 和 `focus(index?)`，`blur()` 移出任一端点的焦点。组件模板中的单值用法继续推断 number，range 用法推断元组；手写通用属性 / 事件类型可通过 `BingSliderProps<false | true>`、`BingSliderEmits<false | true>` 区分模式。

Storybook 提供 **基础与提交时机、尺寸与状态、数值气泡、刻度与离散档位、范围选择、受控回弹与恢复默认、竖向、边缘弹性与双击恢复**。正文宽度示例同时验证数字输入框与自定义颜色；双击恢复示例仍提供按钮，便于发现和键盘操作。下游同步与验证清单见 [pending-consumer-updates.md](./pending-consumer-updates.md)。

## 自定义鼠标

`BingCursor` 提供参考 macOS 黑白轮廓的 16 种本地 SVG 光标，支持普通、链接、禁用、文本、抓取、移动、十字、调整尺寸和缩放。默认自动识别元素的 CSS `cursor` 与交互状态，仅作用于默认插槽中的内容。

```vue
<script setup lang="ts">
import { BingButton, BingCursor, BingInput } from '@moubing/bing-ui'
</script>

<template>
  <BingCursor :size="28">
    <BingButton>自动显示链接手形</BingButton>
    <BingButton disabled>自动显示禁用光标</BingButton>
    <BingInput placeholder="自动显示文本光标" />
    <div data-bing-cursor="grab">可抓取区域，按住时切换为抓取中</div>
    <div data-bing-cursor="native">这里使用原生光标</div>
  </BingCursor>
</template>
```

在应用根部挂载 `<BingCursor global />` 可覆盖当前文档，包括 Teleport 到 `body` 的普通弹层。局部实例优先于全局实例，嵌套实例以内层优先。局部实例不自动覆盖 Teleport 到其 DOM 之外的内容。

通过 `color`、`outlineColor` 和 `size` 调整预设；也可设置主题变量 `--bing-cursor-color`、`--bing-cursor-outline`。主题变量从组件所在位置读取。`type` 可固定状态，`data-bing-cursor` 可在局部覆盖，禁用语义优先。

自动识别 CSS 状态需要浏览器允许读取对应的样式表。对于无法读取的跨域样式表，可用 `data-bing-cursor` 明确指定状态。

**光标统一由浏览器原生绘制，以性能和跟手性优先。** 本地 SVG 作为 CSS `cursor` 图片交给浏览器绘制，移动时不更新 DOM 坐标、不运行位置动画；图形按状态直接切换。颜色、尺寸和点击热点仍可配置，图片会复用缓存。尺寸取整到 8–128 px，热点取整并限制在画布内。图片无法加载或被浏览器限制时，回退到同类系统光标。CSS 光标图片及热点规则见 [MDN cursor 文档](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/cursor)。

状态识别在目标、按键、作用域或相关 DOM 变化时更新；同一目标内的移动复用识别结果，样式表扫描不会每帧执行。直接调用 CSSOM API 修改规则没有 DOM 通知，移动期间最多每 100 ms 校验一次；停止移动后没有轮询定时器。

`change` 事件在光标类型变化时触发，`visibility-change` 在启用或释放光标图片时触发。图片不影响点击、键盘焦点和无障碍树；触摸、笔输入和强制颜色模式下使用系统光标。退出作用域、禁用或卸载后恢复原有样式。

iframe、开放的 Shadow DOM 边界、原生选择框与滚动条、浏览器顶层弹窗、原生 HTML 拖放以及未内置的 CSS cursor（例如 `wait`、`progress` 和图片光标）保留原生光标。封闭的 Shadow DOM 宿主请设置 `data-bing-cursor="native"`；该属性也可用于明确排除任何区域。

Storybook 提供 **BingCursor / mac 风格光标、全局与局部** 两个示例，可在 Controls 中调整颜色、尺寸和热点。

从旧版迁移时，删除 `renderer`、`mode`、`followDuration`、`transitionDuration`、`zIndex` 和 `#cursor` 插槽。DOM 跟随、SVG 形变及 `data-bing-cursor-label` 提示已移除；仅保留包裹页面内容的默认插槽。
