# 组件升级与下游待办

## 2026-11-11 统一同步

本批按指令先发布 0.18.0，再完成下游同步。联调修复 Table 全文提示节点及外层可聚焦滚动容器误拦截行点击的问题，最终发布并统一安装 `@moubing/bing-ui@0.18.2`，npm `latest` 校验一致。最终发布提交：`bd7ccc6`。

| 项目 | 实际工作区 | 结果 |
| --- | --- | --- |
| 文档站 | `C:/workspace/bing-ui-docs` | Slider、Input、Textarea、Table、Button 正文/API/网页/独立示例、主题规范及 AI 导出完成；40 个组件、228 个独立 SFC |
| 需求看板 | `C:/workspace/requirement-board-main` | 数字 null/规整、Enter、密码按钮、滑杆恢复、标注提交/高度、活动行及错误重试完成；7 处表格已回归 |

`C:/workspace/requirement-board` 未修改。两项目均精确依赖 0.18.2，锁文件由 pnpm 生成，`pnpm ui:check --check-versions` 通过；安装产物与发布构建的 455 个文件逐字节一致。库内 773 项单测、469 项浏览器测试及发布构建通过。下游详情见各自 `docs/bing-ui-0.18.2-validation.md`。下方表格保留升级差异和检查入口，勾选项为已完成；真机/读屏及 Table P2 保留待办。验证过程未手动部署或更新视觉快照。

## REQ-45 TreeSelect（已发布）

阶段记录：2026-11-10 在 `codex/tree-select-picker` 基于 REQ-44 共享层实现 P0，文档站 `codex/tree-select-docs` 同步候选内容。随后已随 0.17.0 正式发布并完成下游升级；本批统一提升到 0.18.2。

该组件没有需求看板、Table 或 ColorPicker 的直接调用入口。组件库和文档站验证及下游依赖升级已完成。已有 TreeSelect 节点样式选择器继续可用；自动化需要将触发器/搜索框角色更新为 combobox，多选状态改读 aria-checked，展开按钮不再作为辅助技术的独立按钮暴露。固定两个标签的数量假设应改为按可见标签与 +N 校验。

- [x] 共享 picker 外壳、宽度折叠标签、搜索高亮与 typeahead。
- [x] 搜索展开快照、光标边界键盘导航、混合勾选 ARIA。
- [x] 展开收起动画、面板高度过渡、层级引导线与 Storybook 示例。
- [x] 文档/API/示例与 AI 导出同步为候选说明。
- [x] 正式发布并更新文档站依赖。

验证：700 项单测、类型检查与构建通过；TreeSelect 10 项、Select 16 项浏览器回归通过。最初全量浏览器运行的 Dropdown 碎屑断言偶发失败，经追查为延迟滚动通知误清理新反馈；已修复共享清理逻辑并新增 3 项浏览器回归。修复后 700 项单测、350 项全量浏览器用例和类型检查通过，点击反馈文件 14 项连续复跑 5 轮通过；此次内部修复未重复构建。文档站候选模式 10 项页面、14 项独立示例与阅读应用、6 个导出 SFC 类型检查及导出一致性检查通过。无头 Storybook 检查基础、级联/独立多选、搜索、虚拟树、状态、键盘导航与深层引导线；390px 深浅色和减少动态效果均已验证。

本轮 AnimatedText、Button、Checkbox / CheckboxGroup、Dialog、DropDown 和 Tooltip 的下游代码、文档与候选包回归已集中处理。下方影响表保留升级前的差异与检查入口；勾选项表示本轮已完成，发布及实机状态以本节为准。

## 本轮基线

记录日期：2026-11-09。开始处理时两个使用项目均精确依赖 `@moubing/bing-ui@0.15.0`，本轮目标版本为 `0.16.0`。

| 项目 | 本机路径 | 本轮处理方式 |
| --- | --- | --- |
| 文档站 | `C:/workspace/bing-ui-docs` | 正文、API、网页/独立示例和 AI 导出已同步 |
| 需求看板 | `C:/workspace/requirement-board-main` | 业务 API 已迁移并通过候选包回归 |

npm 已发布 `0.16.0`，`latest` 校验一致；两个项目已精确安装正式版本并由 pnpm 更新锁文件，临时 tarball 路径已移除。文档站 104 项页面回归、56 项相关独立示例回归、212 个 SFC 类型检查和 90 项导出测试完成；看板 726 项单测、类型检查及编辑器/工作区/账号场景完成。正式包与候选包 SHA-512 一致，安装后再次完成新增交互、账号和右键焦点回归，`pnpm ui:check --check-versions` 通过。详细记录分别见两项目的 `docs/bing-ui-0.16.0-validation.md`。

发布提交：`4df46d1`（`chore(release): 0.16.0`）。两个下游项目的升级内容与本文收尾记录分别纳入各自仓库的同步提交。

联调同时修复组件库两处问题：Checkbox 减少动态效果的 SSR class 不一致；DropDown 在编辑区鼠标右键后，入场结束时抢走正文焦点。两者均有新增回归用例。实体手机的系统输入法、选字和原生长按菜单尚不能通过无头模拟替代，相关条目保留未勾选。

组件库联调验证：678 项单测通过；335 项浏览器用例中全量运行的 2 项 Table 时序断言失败，独立重跑该文件 16 项全部通过，其余 319 项通过。类型检查和构建、`0.16.0` 发布 dry-run 通过。Table 未作功能或断言变更。

## AnimatedText 与 Button

状态：组件和下游实现、回归及统一发版升级已完成。

### 组件变化

- `BingAnimatedText` 新增 `effect="shimmer"`、`hoverTarget`、`followPointer`、`swap`，以及实例方法 `play(origin?)` 和公开类型 `BingAnimatedTextExpose`、`BingAnimatedTextPlayOrigin`。
- `hover` 支持键盘聚焦；默认根据指针进入位置决定扫光方向或跳动起点。`once` 改为进入视口时播放，`always` 离开视口时暂停。
- 两个组件的 `shineSpeed` 默认值从 3 秒改为 1.6 秒，`shineInterval` 从 1.6 秒改为 2.4 秒；扫光外观及 primary 按钮的默认高光配色调整。
- `BingButton` 新增 `textSwap`，hover 文字动效的感应范围扩展到整个按钮。Button 的 `textEffect` 仍是 `none / shine / jump`，不包含 `shimmer`。
- 文案切换通过字符位置对齐、稳定合成层及扫光文字交接减轻字体抖动。`swap` 和 `textSwap` 默认都为 `false`，升级依赖不会自动让现有动态文案播放切换动画。

### 文档站待办

以下文件路径均相对 `C:/workspace/bing-ui-docs`。

| 入口 | 已确认的差异与待处理内容 |
| --- | --- |
| `shared/docs/animated-text.ts` | 当前 effect 类型缺少 shimmer；补充 3 个新属性、实例方法和 2 个公开类型，更新属性数量及扫光默认时长、间隔 |
| `content/components/animated-text.md` | 修正“once 挂载即播放、不等待视口”“hover 不响应 focus”“没有实例方法”等旧说明；补充 shimmer、文案切换、感应区、指针起点与视口行为 |
| `shared/docs/button.ts`、`content/components/button.md` | 补充 textSwap；更新扫光默认值、整按钮 hover / 聚焦触发及配色说明；保留 Button 自身的 effect 类型范围 |
| `app/components/examples/animated-text/`、`app/components/examples/button/` | 同步现有示例参数；增加 shimmer、swap、整块感应区和手动播放示例。文案切换示例覆盖计数、上传状态、复制反馈，检查结束时的字体稳定性 |
| `scripts/lib/doc-registry.ts` | 注册新增示例，使网页预览和独立 AI 示例同时可用 |
| `app/pages/index.vue` | 首页标题使用 once shine，场景标题使用 hover jump，按钮也显式使用 hover 动效；核对进入视口、指针起点和键盘聚焦表现。标题显式设置的 1.7 秒扫光时长继续有效 |
| `tests/browser/animated-text-docs.spec.ts`、`tests/browser/button-docs.spec.ts` | 更新新增章节、示例数量等页面断言，验证新交互与方向控制；固定方向示例需要明确是否关闭 followPointer |
| `tests/ai-browser/animated-text-export.spec.ts`、`tests/ai-browser/button-export.spec.ts`、`tests/fixtures/ai-docs/` | 同步独立示例与阅读应用；加入新 API、视口触发、聚焦和文案切换的行为验证 |
| `shared/docs/migration.ts`、`docs/animated-text-ai-export-validation.md`、`docs/button-ai-export-validation.md` | 随最终版本更新验证状态与记录，通过实际验证后再标记完成 |

- [x] 同步上述正文、API、网页预览与独立示例。
- [x] 最终版本发布后，精确升级 `package.json` 与锁文件，并同步文档版本信息。
- [x] 执行 `pnpm docs:export` 与 `pnpm docs:check`，由脚本生成 `public/ai/` 和 `public/llms.txt`，不手改导出文件。
- [x] 执行相关类型检查、文档页与独立示例的无头浏览器验证，并检查首页亮暗主题表现。

### 需求看板待办

以下文件路径均相对 `C:/workspace/requirement-board-main`。

源码检索未发现应用直接使用 `BingAnimatedText`，也未启用 `textSwap`。当前未发现必须修改的业务 API 用法；影响主要来自 `BingButton` 内部文字效果的默认节奏与配色，以及加载态使用的 jump。

| 入口 | 升级时核对 |
| --- | --- |
| `app/components/editor/RequirementSaveActions.vue` | 保存按钮有动态文案与 loading；核对进入/退出加载态、文案宽度和亮暗主题。当前未启用 textSwap，无需为本次升级强行增加 |
| `app/pages/templates.vue`、`app/components/accounts/AgentTokensPanel.vue` 等提交入口 | 核对默认 primary 扫光、加载态文字、禁用及键盘操作；保留现有提交与操作反馈流程 |
| `app/components/AppSidebar.vue`、`app/components/editor/RequirementAnnotationOverlay.vue` | 现有 text-effect="none" 继续保留；普通状态不应因升级增加文字动效 |
| `app/components/editor/CodeBlockHeader.vue` | 复制按钮为纯图标，继续使用既有 Toast 反馈，无需接入文案切换 |

- [x] 最终版本发布且文档同步完成后，精确升级依赖和锁文件，并更新 `docs/bing-ui.md` 的版本与本轮影响说明。
- [x] 执行 `pnpm ui:check --check-versions`，确认库、文档和应用版本一致。
- [x] 按应用已有验证流程，完成保存/提交、加载态、侧栏与标注按钮的无头回归，覆盖亮暗主题和减少动态效果。

### 组件库已完成的验证

单元测试 617 项、AnimatedText 与 Button 浏览器测试 35 项及 Vue 类型检查通过。无头 Playwright 检查了 `components-binganimatedtext--swap`、`components-bingbutton--text-swap`：计数、上传状态、复制/关注切换及减少动态效果；在 DPR 1 和 1.5 下核对文字交接位置与结束帧，未发现剩余位置跳动。

## Checkbox 与 CheckboxGroup

来源：REQ-40 复选框交互与样式优化方案（内部需求）。本节覆盖 P0 单框细节与 P1 批量、分组交互；下游同步和候选回归已完成。

组件库实现与验证已完成：625 项单元测试、301 项浏览器测试及构建通过。无头 Playwright 检查了 Checkbox 的 States、Sizes、交互细节、批量选择，以及 Table、Select、TreeSelect 复用场景；覆盖亮暗主题、DPR 1 / 2 和减少动态效果，并在 Chromium、Firefox、WebKit 核对 SVG 与分组手势。

点击抖动补充修复：方框增加 `will-change: transform`，稳定按压缩放结束时的边缘。27 项 Checkbox / CheckboxGroup 浏览器测试通过；无头 Playwright 核对基础示例与状态示例，在亮暗主题和 DPR 1 / 1.5 / 2 下，选中及取消的 12 组结束帧完全一致，三种浏览器的连续点击、空格键切换和减少动态效果均正常。

### 组件变化与兼容

- Checkbox 公共 props 不变；新增可覆盖的 `--bing-checkbox-stroke`。内部增加填充层，勾和半选改为 SVG path，保留原 `.bing-checkbox__control / __check / __mixed` 类名。
- 默认视觉增加描勾、可打断的三态过渡、按压、悬停淡勾、焦点过渡与校验提醒；禁用选中态改为控件透明度，外部尺寸不变。
- 无文字且非 decorative 的命中区域增大，密集业务布局需核对相邻点击目标；Table 的行选择、全选与列设置也会受益。
- 同帧外部批量更新按文档顺序级联，视口外与超量实例直接到终态，数据立即更新。
- CheckboxGroup 新增 `dragSelect`、`rangeSelect`，均默认 `false`。业务无需为本次升级自动开启手势；若接入，拖动中用 `update:modelValue` 读取即时值，`change` / 表单校验在结束时触发一次。

### 文档站待办

以下路径相对 `C:/workspace/bing-ui-docs`。

- [x] 更新 `content/components/checkbox.md`、`shared/docs/checkbox.ts`：三态动效、禁用外观、命中区域、decorative 边界和线宽变量。
- [x] 更新 `content/components/checkbox-group.md`、`shared/docs/checkbox-group.ts`：两个新属性的默认值、禁用项跳过、键盘/触摸边界及事件时机。
- [x] 同步 `app/components/examples/checkbox/` 与 `app/components/examples/checkbox-group/`，增加连点、半选互切、批量级联、拖动及 Shift 范围示例，注册到 `scripts/lib/doc-registry.ts`。
- [x] 同步 checkbox / checkbox-group 的 `tests/browser/`、`tests/ai-browser/`、`tests/fixtures/ai-docs/`，以及 `docs/checkbox-ai-export-validation.md`、`docs/checkbox-group-ai-export-validation.md`。
- [x] 回归其他组件示例中复用的 Checkbox 控制项，重点覆盖 Button、AnimatedText、Form、Table、Select 和 TreeSelect 页面，核对按压结束时的稳定性、批量切换和禁用外观。
- [x] 统一升级后更新验证状态并重新导出 AI 文档，检查亮暗主题、减少动态效果及数字尺寸。

### 需求看板待办

以下路径相对 `C:/workspace/requirement-board-main`。目前这些入口使用原有 Checkbox API，不需要业务兼容层；新增分组手势保持未启用。

| 入口 | 升级回归 |
| --- | --- |
| `app/components/editor/TaskCheckbox.vue` | 继续由外层 button 管理 checkbox 语义与编辑器焦点；内部 decorative 的选择动画正常，不增加命中层、悬停淡勾或按压缩放。检查编辑/只读任务清单、撤销和协作状态更新 |
| `app/components/accounts/RolePicker.vue` | 当前是独立 Checkbox 列表，非 CheckboxGroup；保持原角色选择逻辑，检查禁用角色、连续选择与可滚动账号弹窗 |
| `app/components/accounts/InvitationsPanel.vue`、`app/components/accounts/RequestsPanel.vue` | 创建账号、邀请加入与审批中的角色选项使用 CheckboxGroup；检查 options / v-model 同步、回显、清空和表单校验。保持两个新增手势默认关闭，沿用当前点击与事件语义 |
| `app/components/settings/AppSettingsDialog.vue` | 检查自定义指针和版本标记开关，保留通过 CSS 变量覆盖的业务色；核对 error / 禁用和亮暗主题 |
| `app/pages/login.vue` | “保持登录”的原生键盘、name、v-model 和提交行为保持一致 |
| `app/components/requirements/RelatedDocuments.vue`、`app/components/diff/RichTextDiffViewer.vue`、`app/components/diff/SelectionHistoryWorkspace.vue`、`app/pages/requirements/[id].vue` | 检查选项切换、窄屏间距和状态提示，确认新增命中区域不覆盖邻近操作 |
| 应用中的 Table、Select、TreeSelect 与列设置 | 核对全选/半选、禁用行、菜单中 decorative 标记，以及表格选择列内的命中边界；批量数据不应等待视觉级联 |

- [x] 统一升级后按上表执行相关无头回归，并同步 `docs/bing-ui.md`。
- [x] Radio 视觉对齐作为后续独立组件优化处理，本次只记录。

## Dialog

来源：REQ-41 对话框交互与样式优化方案（内部需求）。本轮同时实现 P0 和 P1；两个使用项目的正文、示例和业务接入已同步并验证 `0.16.0` 候选包。

组件库验证已完成：642 项单元测试、311 项浏览器测试及类型检查 / 构建通过，包含原有 Dialog 焦点轮廓与 Checkbox 弹窗布局用例。无头 Playwright 检查了「打开与关闭」「拒绝关闭」「嵌套弹窗」「窄屏底部面板」「关闭前确认」和基础弹窗的窥视交互；覆盖 1280px / 390px、亮暗主题、减少动态效果，并在 Chromium、Firefox、WebKit 验证关闭保护、焦点恢复、手势与窥视中途关闭。连续帧检查了拒绝反馈和退出缩放，避免初值读取导致瞬间跳变。输入法避让通过模拟 visualViewport 的高度、偏移和恢复验证；真实移动设备输入法仍在下游回归时核对。

### 组件变化与兼容

- 新增 `transitionOrigin`、`initialFocus`、`busy`、`rejectFeedback`、`beforeClose`，以及 `close-prevented(reason)`；新增公开类型 `BingDialogTransitionOrigin` 和 `BingDialogInitialFocus`。
- 默认初始焦点改到内容区表单控件，找不到时聚焦面板；不再自动聚焦窥视或确认按钮。按程序打开且没有触发元素时采用居中方向。
- `confirmLoading` 默认启用忙碌保护；需要保留加载期间关闭能力时显式设置 `busy=false`。关闭、取消按钮保持位置，自定义 footer 也可读取 `busy`，组件提供的关闭方法统一经过保护。
- `beforeClose` 等待期间不重复调用，超时 30 秒、抛错或返回 false 均保留弹窗。业务直接设置 `v-model=false` 不会执行确认，因此接入前要检查自定义 footer 是否直接写模型。
- 小屏默认贴底、顶部拖动关闭、使用可视视口避让；关闭原因新增 `swipe`，穷尽 switch 需补分支。嵌套 Dialog 不重复模糊，下层保持 inert。
- 保留 `.bing-dialog`、`.bing-dialog__header`、`.bing-dialog__body-scroll`、`.bing-dialog__footer` 等类名及直接子级结构；`is-active` 在打开动效完成后出现，依赖完成时机的测试应等待它。
- 默认圆角通过 `--bing-dialog-radius` 调整，分隔线跟随滚动显隐；`glass` 保留但标记废弃，下个大版本移除。

### 文档站待办

以下路径相对 `C:/workspace/bing-ui-docs`。

- [x] 更新 `content/components/dialog.md`、`shared/docs/dialog.ts`：新增属性、事件、类型与 footer 的 busy 参数，修正“confirmLoading 仅控制按钮”“初始焦点在头部”、固定关闭时间等旧说明。
- [x] 更新 `app/components/examples/dialog/`，补充触发方向、拦截反馈、异步关闭确认、嵌套与移动面板示例；同步 `scripts/lib/doc-registry.ts`。
- [x] 更新 `tests/browser/dialog-docs.spec.ts`、`tests/browser/dialog-nested.ts`、`tests/ai-browser/dialog-export.spec.ts`、`tests/fixtures/ai-docs/dialog-understanding.vue`；核对焦点、忙碌按钮、退出完成和窄屏贴底的断言。
- [x] 更新 `docs/dialog-ai-export-validation.md`；统一升级后导出 AI 文档，并检查页面其他示例复用的 Dialog。

### 需求看板待办

以下路径相对 `C:/workspace/requirement-board-main`。当前 16 个文件共 22 个 Dialog；13 处组合 busy / closeOnEsc / showClose 可按业务需要迁移为 busy。10 处禁止遮罩关闭将出现内置拒绝反馈；2 处 confirm-loading 将自动启用忙碌保护。以下为升级回归入口，当前只做记录。

| 入口 | 升级时核对 |
| --- | --- |
| `app/components/requirements/CreateRequirementDialog.vue`、`DocumentPropertiesDialog.vue`、`RelatedDocuments.vue` | 新建、属性和关联选择的默认焦点、提交中关闭、表单校验；如引入 beforeClose，检查自定义 footer 的直接模型赋值 |
| `app/components/documents/SaveDocumentTemplateDialog.vue`、`app/pages/members.vue` | 模板保存与成员操作的忙碌保护、取消、提交成功后程序关闭，以及长内容分隔线 |
| `app/components/accounts/UsersPanel.vue`、`ChangePasswordDialog.vue`、`RequestsPanel.vue` | 编辑用户、修改密码和审批中的焦点位置与 busy 组合；保留原提交与校验流程 |
| `app/components/accounts/InvitationsPanel.vue`、`AgentTokensPanel.vue` | 账号创建/邀请与凭证创建的固定尺寸、表单和结果回显；撤销邀请、撤销凭证这 2 个 confirm-loading 弹窗会自动进入 busy；检查完成和失败时的关闭能力 |
| `app/components/editor/RequirementAnnotationComposer.vue` | 当前自行捕获外部事件并播放提醒；决定迁移到 close-prevented / 内置反馈，或用 rejectFeedback=false 保留原方案，避免重复提醒。核对其锚点定位、自定义焦点和窄屏行为 |
| `app/components/editor/RequirementAnnotations.vue`、`RichRequirementEditor.vue`、`RequirementSaveActions.vue` | 标注管理、编辑辅助与版本保存中的键盘、文本输入、嵌套弹窗、关闭后焦点恢复 |
| `app/components/settings/AppSettingsDialog.vue` | 设置表单默认焦点、长内容滚动、亮暗主题与 390px 视口底部操作 |
| `app/pages/requirements/[id].vue`、`app/assets/css/editor-workspace.css` | 页面 4 个弹窗及 `.document-panel--drawer` 右侧抽屉覆盖样式；核对现有直接子级选择器、100dvh 高度、隐藏头部及新增移动面板进出场，不把业务抽屉误当普通底部面板验收 |

- [x] 批量同步时检查所有关闭原因处理，补齐需要的 swipe 分支。
- [x] 执行上述入口的亮暗主题、键盘焦点、忙碌与异步确认、模拟输入法和嵌套回归，更新 `docs/bing-ui.md`；实体手机输入法留作实机验收。

## DropDown

来源：REQ-42 下拉菜单交互与样式优化方案（内部需求）。本轮覆盖 P0、P1 和可选的 slide 高亮。文档站与需求看板的源码和文档已同步，候选包已验证。

组件库验证已完成：658 项单元测试、324 项浏览器测试及类型检查 / 构建通过。无头 Playwright 检查了基础、悬停、右键、复杂右键、长右键、勾选、滑动高亮与编辑器命令示例；覆盖亮暗主题、900×600 / 900×420 和减少动态效果，并在 Chromium、Firefox、WebKit 验证斜向进入子菜单、逐层 Esc、长列表末项点击及外部编辑器焦点。浏览器用例另覆盖 Tab 前后顺序、hover 子菜单保持、勾选动画打断、可见项错峰上限、自定义表单输入与键盘行为。共享点击反馈用例改为真实点击，符合菜单仅在点击或键盘激活时播放反馈的新规则。

### 组件变化与兼容

- 新增 `hoverOpenDelay=80`、`hoverCloseDelay=110`、`typeahead=true`、`highlightMotion='liquid'`；Item 新增 `type='item'`、`checked=false`、`textValue`；导出 Group / Divider 及相关类型。已有事件、expose 和主要类名保留。
- Tab 从菜单项关闭整棵菜单并继续触发器前后顺序；Esc 在子菜单只返回上一层；子菜单在右方向键 / Enter 时展开，单纯聚焦父项不展开。自动化用例需等待悬停延迟和入场完成。
- 所有面板统一包裹滚动区，主体的直接子级结构变化；依赖 `.bing-dropdown__panel > .bing-dropdown__body` 的样式需调整。浮层和滚动区均受可用尺寸限制。
- 危险标题变红、快捷键键帽、禁用图标减淡、4px 子菜单间距为默认样式变化。普通菜单采用每层唯一高亮，外部编辑器焦点保持不动。
- `active` 继续保留高亮及 aria-current；业务当前值建议迁移到 `type="radio" :checked`，开关使用 checkbox。外部虚拟高亮（斜杠菜单）继续使用 active。
- 自定义表单（链接菜单）的输入与 Tab 顺序继续由原生控件处理。Select / TreeSelect 共用时间线的默认节奏不变。

### 文档站待办

以下路径相对 `C:/workspace/bing-ui-docs`。

- [x] 更新 `content/components/drop-down.md`、`shared/docs/drop-down.ts`：新增 props / 类型 / Group / Divider、Tab 和逐层 Esc、typeahead、checked 与 active 的语义、长按和尺寸约束。
- [x] 同步 `app/components/examples/drop-down/` 和 `examples/drop-down/` 的基础、条目、受控、右键、光标锚点示例；补充分组、勾选、slide 及编辑器保持焦点的示例，并注册到 `scripts/lib/doc-registry.ts`。
- [x] 同步 `tests/browser/drop-down-docs.spec.ts`、`tests/ai-browser/drop-down-export.spec.ts`、`tests/fixtures/ai-docs/drop-down-understanding.vue` 与 `docs/drop-down-ai-export-validation.md`；更新旧的 hover 无延迟、Tab 逐项、聚焦自动展开等断言。
- [x] 统一升级后导出 AI 文档，检查网页与独立示例在 420px 高视口、亮暗主题及减少动态效果下的表现。

### 需求看板待办

以下路径相对 `C:/workspace/requirement-board-main`。当前检索到 11 个使用文件（包括只渲染 Item 的 CalloutToneItems），按实际入口回归。

| 入口 | 升级时核对 |
| --- | --- |
| `app/components/editor/RequirementSlashMenu.vue` | 保留 `autoFocus=false`、外部键盘、`@mousedown.prevent` 和 active 虚拟高亮；验证上下键自动滚动、鼠标选项不抢编辑器焦点、过滤结果变化、anchor / boundary 和窄编辑区。将自定义分组标题迁到 Group |
| `app/components/editor/RichRequirementEditor.vue` | 段落样式和图片对齐等互斥当前值改用 radio / checked，布尔格式可按需使用 checkbox；回归编辑器右键、表格和多层子菜单、选区保持、危险操作、长菜单与左右安全三角 |
| `app/components/editor/CalloutToneItems.vue`、`RequirementCalloutNode.vue` | 提示类型迁为 radio / checked，核对自定义 suffix 与勾选并存、节点菜单和编辑器子菜单复用 |
| `app/components/editor/RequirementLinkMenu.vue` | 自定义表单与滚动容器结构兼容；文本输入、Tab、Enter、原选区、更新 / 删除链接和固定宽度；不能让 typeahead 截获网址输入 |
| `app/pages/requirements/[id].vue` | 状态切换从 active 迁到 radio / checked；页面菜单的按钮、禁用项和键盘关闭顺序 |
| `app/components/workbench/WorkflowBoard.vue` | 卡片操作菜单的状态迁移、拖放与触发器事件、窄屏位置和点击关闭 |
| `app/components/AppUserMenu.vue` | 用户菜单、导航链接、退出中的禁用与 closeOnClick=false；打开修改密码弹窗时的焦点交接 |
| `app/components/requirements/RecentRequirementsMenu.vue`、`RelatedDocuments.vue` | 长列表滚动、链接跳转、关联文档操作、宽高限制与亮暗主题 |
| `app/components/accounts/AgentTokensPanel.vue` | 凭证操作的禁用状态、危险标题、菜单关闭与后续确认弹窗 |

- [x] 本轮统一升级时完成上述应用入口的无头回归，再更新 `docs/bing-ui.md`。本次组件库内已建立等价的编辑器外部焦点、局部边界和自定义链接表单用例，下游真实应用验证留在这一步。
- [ ] 真实移动设备补测长按与原生菜单抑制；本轮自动化覆盖合成触屏指针的 500ms、8px、取消与卸载清理。

## Tooltip

状态：REQ-43 的 P0 / P1 和下游文档、业务入口已实现并通过候选包验证。

### 组件变化

- 悬停提示点击后关闭且不因鼠标焦点闪回；键盘焦点打开，触屏由点按改为长按 500ms，松手后 1500ms 自动关闭。新增默认 300ms 的 `skipDelay`。
- 共享面板换主立即发出旧实例的 `close('replaced')` 与 `update:modelValue(false)`；固定的 click / manual 提示抑制其他目标的 hover / focus。
- ARIA 自动关联到实际按钮等焦点目标；默认插槽新增 `triggerProps`。重复的提示文本不会再次写入 describedby。默认 `suppressWhenExpanded=true`，观察实际目标的业务展开状态。
- 新增 `scrollable`、`shortcut` 和 `tone`；近距离平移、远距离淡出淡入，独立背景形变。短提示不再渲染 `.bing-scrollbar`，内容变长才重挂为滚动容器。主要类名保留，背景和阴影转移到 `.bing-tooltip__surface`。
- 新增三个 Tooltip 外观 token；键帽和 DropDown 共用 `.bing-kbd`。穷尽处理 `BingTooltipCloseReason` 的代码需要接纳 `replaced`。

### 文档站待办

以下路径相对 `C:/workspace/bing-ui-docs`。

| 入口 | 待处理内容 |
| --- | --- |
| `content/components/tooltip.md`、`shared/docs/tooltip.ts` | 新属性、默认插槽 triggerProps、replaced 原因、触屏长按、键盘焦点、固定提示优先级；明确短说明适用范围、长内容降级与滚动时的重挂行为 |
| `app/pages/docs/components/tooltip.vue`、`app/components/examples/tooltip/`、`examples/tooltip/` | 同步网页和独立示例，增加工具栏连续浏览、快捷键、inverse、禁用按钮包装；回归原 hover / click / manual 和边界方向 |
| `tests/browser/tooltip-docs.spec.ts`、`tests/ai-browser/tooltip-export.spec.ts`、`tests/fixtures/ai-docs/tooltip-understanding.vue` | 将根节点 ARIA 断言移到实际目标；加入鼠标不闪回、键盘、触屏和短文案无滚动容器检查 |
| `docs/tooltip-ai-export-validation.md`、AI 导出注册与产物 | 最终同步时更新验证记录，执行 docs:export / docs:check 生成产物，不手改 `public/ai/` |

- [x] 更新上述正文、API、网页与独立示例，并完成无头浏览器检查。

### 需求看板待办

以下路径相对 `C:/workspace/requirement-board-main`。当前源码共 9 个 Tooltip 模板入口，保留现有业务代码，待统一升级后验证。

| 入口 | 升级时核对 |
| --- | --- |
| `app/components/editor/RichRequirementEditor.vue` | 格式工具栏、插入工具栏、选区浮动工具栏连续扫过与点击命令；焦点留在编辑器时不闪回；按实际命令补 shortcut，检查相同 aria-label 不重复描述 |
| `app/components/editor/RichRequirementEditor.vue` 的表格菜单 | 触发按钮已绑定 DropDown triggerProps，可在确认新 suppressWhenExpanded 行为后删除 `:disabled="open"` |
| `app/components/editor/RequirementLinkMenu.vue` | 触发按钮已绑定 DropDown triggerProps，可删除 `:disabled="panelOpen"`；验证链接菜单打开、编辑器选区和焦点恢复 |
| `app/components/editor/RequirementVersionMarkers.vue` | 自定义 id 和按钮已有 describedby 改由组件统一维护；相同 label 去重；当前 `:disabled="!!selectedId"` 用于任意版本卡片打开时抑制全部标记，不能直接删除，因为其他标记的 aria-expanded 仍为 false |
| `app/pages/requirements/[id].vue` | 比较版本说明保持 hover / interactive=false；验证键盘描述、窄屏位置与新内容过渡 |

需求中提及的 3 处人工禁用，在当前下游源码里分别是表格菜单、链接菜单和版本标记；前两处可由菜单展开观察替代，版本标记的全局业务约束应保留。不要按数量统一删除。

- [x] 统一升级依赖后执行工具栏、DropDown 联动、版本标记与比较版本说明的真实业务回归，再更新 `docs/bing-ui.md`。
- [ ] 在真实移动设备补测系统长按菜单与选字；组件库已覆盖无头 Chromium 的触屏输入、取消和自动隐藏。

## Select 与共享选择器外壳（REQ-44）

来源：REQ-44 BingSelect 选择器交互与样式优化（内部需求）。P0 已随 0.17.0 发布，并为 TreeSelect 提供内部共享接口；本批补齐遗留测试角色并统一提升依赖。

### 组件变化与兼容

- 新增默认开启的 `typeahead`、`highlightMatches`，option 插槽新增 `matchRanges`；支持中文拼音首字母，关闭面板时不会因输入字符改值。
- 选项不再逐一进入 Tab 顺序，触发器/搜索框使用 combobox 与 activedescendant。键盘定位后静止鼠标不抢高亮。
- 全选移入面板头部，三态和计数基于当前可用结果；旧 `.bing-select__action-rail` 保留为新容器的别名。旧位置/坐标相关覆盖和按 button 角色定位选择器的测试需复核。
- 选中项去掉灰底，保留勾选和字重；标签进出与 +N 更新有过渡，减少动态效果时立即切换。
- 虚拟列表批量全选只测量容器所需的标签前缀，标签和计数一次更新；可见标签加 `will-change` 稳定动画结束帧。回归清空后再全选、连续增删和缩放后的溢出计数。
- 清空时标签按批次记录位置并原地退场，占位文字在退场完成后显示；取消全选不再触发新的碎屑反馈，覆盖快速反向切换的中间帧。
- 共享 composable 仅供内部使用，接口见 `component-notes.md`。TreeSelect 维持原行为，继续使用原有 `selectPanelMotion` 参数。

### 文档站

- [x] 同步 `content/components/select.md`、`shared/docs/select.ts`，注明候选 API 和兼容变化。
- [x] 同步基础网页/独立示例的输入定位与高亮开关，以及搜索、角色和全选行测试。
- [x] 生成 Select AI 文档并核对导出一致性、独立示例类型与浏览器交互。
- [x] 统一发版后升级精确依赖，去除本轮候选说明并重新生成对应版本 AI 导出。

### 需求看板

已核对 `pnpm ui:check` 的本地映射。组件库以 `sm + block + searchable=false` 的状态选择器回归拼音定位、禁用跳过、关闭时不改值；库内 Table 分页和 ColorPicker 格式选择通过无头验证。REQ-44 阶段的应用真实页面夹具加载候选构建，验证优先级的输入定位、两处 value 插槽、负责人多选，以及 390px 暗色属性弹窗的拼音定位、确认提交和父浮层保留。夹具使用内存接口，正文和版本数保持不变；该阶段保留原依赖，本批已统一升级到 0.18.2，未更新业务数据或部署。

- [x] 统一发版并完成属性栏/窄屏属性弹窗、两处 value 插槽、文档列表筛选、创建文档和模板筛选回归；联调构建与最终安装的正式产物逐字节一致。
- [x] 升级 `package.json` 与锁文件、更新 `docs/bing-ui.md`，执行 `pnpm ui:check --check-versions`。

## Slider（REQ-46）

来源：REQ-46 BingSlider 滑块：交互与功能优化方案（内部需求）。P0/P1/P2（竖向、边缘弹性、双击恢复）已发布；本批完成文档站和需求看板同步。

组件库验证（P2 补齐后）：全量 719 项单测、406 项浏览器测试与包含类型检查的构建通过，Slider 浏览器用例共 56 项。全量浏览器测试首次并行运行遇到 3 项 Table 动画时序断言失败，串行复跑遇到 1 项 DropDown 可见区域断言超时；这些组件单独复跑均通过，最终使用 `pnpm test:browser -- --run --maxWorkers=2` 全量通过，未修改这些组件或测试。

无头 Playwright 在 Chromium / Firefox / WebKit 实测竖向拖动、RTL 键盘、单值 / 范围双击恢复、边界持续按住与释放，以及原有受控拖动回弹；竖向 5 个采样点的填充末端与滑块中心误差均为 0。Storybook「竖向」「边缘弹性与双击恢复」核对亮暗主题和 390px 布局，另检查 forced-colors、减少动效、真实触屏点按松手生效、纵向拖动和横向滑动不改值。P0 / P1 已有的横向几何、键盘、表单和受控拖动用例继续通过。未运行视觉回归或更新快照。

### 组件变化与兼容

- 原生 range 保留焦点、读屏、label for、name、form 和输入事件，视觉改为自绘层；input 缩到滑块位置且不接收指针。基于原生 input 全宽坐标进行点击 / 拖动的测试需改为 `.bing-slider` / `.bing-slider__thumb`；键盘和读屏继续操作 input。
- `update:modelValue` 连续更新，`change` 在操作结束提交一次已接受的变化。指针点击轨道、Home / End / PageUp / PageDown 及外部恢复默认有短过渡；方向键单步和拖动直接跟随，减少动效时直接到位。
- 受控拖动期间独立预览手势值，滑块、填充、气泡和原生 input 保持一致；父级拒绝或修正时在结束操作后统一回弹。回归需包含持续拖动和中途停留，不能只检查最终回到父级值。
- 触屏点按轨道改为松手生效，竖向滑动不误改值；Shift + 方向键为 10 倍步长，PageUp / PageDown 统一取范围 10% 且不小于 step，Esc 撤销拖动并阻止外层 Esc 行为。
- 新增 size、tooltip、formatTooltip、marks、snapToMarks、range、minDistance、thumbAriaLabels；tooltip 默认 never。范围事件使用元组，两端不交叉；单值模板事件仍推断 number。新增 inputs 和 focus(index?)，旧 input 保留。
- 保留 `--bing-slider-color` 及根节点 / 禁用 / 状态类名；补齐尺寸继承和 success / warning 配色。新增轨道颜色、高度、滑块尺寸和边框变量；原生伪元素样式需迁移。
- P2 新增 orientation（默认 horizontal）和 resetValue。vertical 下小上大，不随 RTL 翻转，默认高度 200px，触屏以纵向意图激活；双击滑块恢复到规范化后的配置值，范围模式恢复整个元组。边缘弹性仅作用于滑块外观，按住期间不回弹，减少动效时关闭。

### 文档站待办

以下路径相对 `C:/workspace/bing-ui-docs`。

| 入口 | 待处理内容 |
| --- | --- |
| `content/components/slider.md`、`shared/docs/slider.ts` | 删除“仅单值、不支持范围或刻度”的旧描述；补齐新增 props / 类型 / expose、触屏松手生效、键盘步长、Esc、双滑块名称与表单提交、可打断过渡及样式兼容说明；增加 orientation / BingSliderOrientation、竖向高度与触屏方向、resetValue 的单值 / 元组语义 |
| `app/pages/docs/components/slider.vue`、网页 basic 示例与 `examples/slider/basic.vue` | 保留连续更新 / 最终提交演示，补尺寸状态、气泡、离散档位、双滑块、受控恢复、竖向和边缘弹性 / 双击恢复；气泡上方或左侧预留空间，默认 never 不改变基础页面布局 |
| `tests/browser/s1-components.spec.ts`、`tests/browser/s1-interactions.ts` | 保留现有原生 input 键盘断言；新增指针用例按自绘轨道几何操作。补触屏滚动、松手提交、范围不交叉、气泡两端和亮暗主题 |
| AI 导出注册、独立示例与相关导出测试 | 按现有注册方式补示例；统一升级后执行 docs:export / docs:check 并回归独立示例，不手改生成产物 |

- [x] 同步正文、API、网页与独立示例，完成 390×700、亮暗主题、减少动效和键盘回归。
- [x] 统一发版后升级精确版本、重新生成该版本 AI 文档并验证导出一致性。

### 需求看板待办

以下路径相对本批实际工作区 `C:/workspace/requirement-board-main`。

| 入口 | 升级时核对 |
| --- | --- |
| `app/components/settings/AppSettingsDialog.vue` 正文最大宽度 | 保留 640–1800 / step=20、aria-label、formatValueText 与 `--bing-slider-color: var(--ui-accent)`；检查滑杆和数字输入框双向联动、连续更新偏好、“恢复默认”的过渡、错误输入的业务处理 |
| 同文件辅助面板宽度 | 保留业务范围与 step=10、自定义颜色和恢复按钮，回归两处宽度设置同时更新时的布局与焦点 |
| 设置弹窗与滚动容器 | 390px 下从轨道起始竖向滚动不改变偏好，水平拖动和松手点按正常；拖动 Esc 只撤销滑杆，不关闭弹窗；关闭或卸载时无残留抓取光标 / 禁止选字 |
| `docs/bing-ui.md`、依赖清单与 ui:check | 统一发版后记录 API 和行为变化，升级 package.json / 锁文件并执行版本一致性检查 |

tooltip 可以按业务需要改为 auto，并独立提供 formatTooltip；它不替代数字输入框的精确输入能力。P2 的 resetValue 可按实际业务默认值启用，双击作为快捷方式；保留恢复按钮便于发现和键盘操作，并确认两者使用相同默认值及偏好持久化逻辑。库内“受控回弹与恢复默认”“边缘弹性与双击恢复”提供颜色覆盖、数字输入、按钮和双击示例。下游两处宽度设置已接入同源默认值，并通过恢复、持久化及弹窗回归。

- [x] 统一升级后回归两处设置项、实际偏好持久化和弹窗焦点，更新 `docs/bing-ui.md`。
- [x] 两处宽度接入 resetValue 并验证业务恢复；库内验证单次提交与边缘弹性，文档示例验证受控拒绝回弹。
- [ ] 真机补测移动端读屏调节与触摸滚动；自动化覆盖原生 input 事件及 Chromium 触屏输入，不替代屏幕阅读器实测。

## Input 与共享文本控件层（REQ-47）

来源：REQ-47 BingInput 输入框：交互与功能优化方案（内部需求）。P0/P1/P2 已发布；本批完成关联项目源码、文档和依赖同步。

组件库验证：全量 735 项单测、417 项浏览器测试与包含类型检查的构建通过。随后补充“释放时最后一步只发布一次、恢复文档样式优先级”的浏览器用例，Input 与点击反馈的 34 项定向回归通过；最终浏览器套件共有 418 项。旧点击反馈用例已按新需求改为检查清除按钮隐藏并退出 Tab 顺序，继续验证 24px 尺寸、碎屑完成和连续清空。

无头 Playwright 在 Chromium / Firefox / WebKit 验证密码鼠标 / 键盘切换与选区、数字负号 / 小数 / 指数中间态、null、失焦 / Enter 规整、Shift 步进、受控拒绝及真实前缀拖动的单次提交 / Esc 撤销。七个 Input Story 检查亮暗主题、1100px / 390px 布局、计数替换、加载反馈、减少动效和强制颜色；另检查 Textarea 自动增高页，以及 Select 搜索高亮、TreeSelect 搜索展开、Autocomplete 的组词 / 清除 / 键盘选择。未运行视觉回归或更新快照。

### 组件变化与兼容

- number 模型只发布 number / null，清空由 `''` 改为 null；通用输入事件的类型扩展为 BingInputValue。input / debounced-input 仍为字符串，组词和数字中间态不通知业务。
- clampOnBlur 默认 true；失焦 / Enter 根据 min/max 与 step 规整，父级拒绝更新后恢复已接受值。step=any 不对齐，Shift 支持十倍步进；达到边界的箭头禁用。原生 change(Event) 参数保持不变。
- passwordToggle 默认 true；前后缀可用字符串或插槽，suffix 可承载 px 等单位；新增 maxLength / showCount、loading、enter(value,event) 与可选 scrub。
- Input / Textarea 统一组合输入和“离开整个控件”校验。Textarea 的回车、自动增高与滚动能力不扩展。clearable 空值仍占位，依赖内宽 / 坐标的样式和测试需复核；密码框默认多一个可达按钮。
- scrub 需 number + prefix，每 4px 一个步长、Shift 十倍。拖动连续更新，释放为接受的变化发一次原生 change；Esc、指针取消、窗口失焦撤销。受控拒绝在拖动中保留预览，结束后恢复。

### 文档站待办

路径相对 `C:/workspace/bing-ui-docs`。

| 入口 | 待处理内容 |
| --- | --- |
| `content/components/input.md`、`shared/docs/input.ts` | 补齐全部新增 props / enter / BingInputValue；解释 number 清空 null、默认规整、草稿与原生 change、前缀拖动提交 / 取消；更新 passwordToggle、清除常驻槽位的兼容说明 |
| Input 网页、独立示例与 AI 导出注册 | 补密码、单位、计数、加载搜索、数字规整、受控拒绝和 scrub；为模型及回调补 null 类型，删除旧空字符串断言 |
| Textarea 正文、API 与示例 | 更新组合输入、焦点校验、清除占位和阈值播报；保留原有换行、自动增高与滚动行为 |
| 浏览器与导出测试 | 验证亮暗主题 / 390px、IME、密码键盘及选区、计数替换、数字中间态与 scrub 取消；统一升级后重新生成 AI 文档，检查独立示例类型 |

### 需求看板待办

路径相对本批实际工作区 `C:/workspace/requirement-board-main`。

| 入口 | 待处理内容 |
| --- | --- |
| `PreferenceNumberInput` 与设置弹窗数字项 | 兼容 null；盘点重复 clamp / round 逻辑，按业务是否允许暂时清空决定保留或移除；检查正文宽度和辅助面板宽度与 Slider 双向联动、偏好持久化和恢复默认 |
| `app/components/settings/AppSettingsDialog.vue` | 需要单位时使用 suffix="px"；按需提供 prefix + scrub，保留精确输入 / 键盘调节；Esc 撤销不关闭外层弹窗 |
| 自定义 Enter 提交处理（需求列出 4 处） | 逐项迁移到 enter(value,event) 或保留明确的业务快捷键；不要重复过滤 IME 导致漏提交，校验修饰键语义 |
| 登录 / 注册 / 密码设置（需求列出 5 处） | 复核默认显隐按钮与现有自绘按钮，避免重复；验证密码管理器的 current-password / new-password、Tab 顺序和选区保留 |
| Select / TreeSelect / Autocomplete 内嵌搜索与文本域 | 回归中文输入、清除、搜索键盘和父浮层关闭；确认表单只在离开整个文本控件后做 blur 校验 |
| `docs/bing-ui.md`、依赖与 ui:check | 统一发版时升级精确依赖和锁文件，执行版本一致性检查及业务回归 |

- [x] 同步文档站正文、API、示例及生成流程，升级后重新生成对应版本 AI 文档。
- [x] 统一升级后处理需求看板空值、规整、Enter 和密码按钮，回归实际表单与持久化。
- [ ] 真机补测中文输入法候选窗口、移动数字键盘、密码管理器及屏幕阅读器播报；自动化组合事件与无头浏览器测试不能替代这些实际环境。

## Textarea 多行编辑（REQ-48）

来源：REQ-48 BingTextarea 多行输入：交互与功能优化方案（内部需求）。依赖 REQ-47 共享层，P0/P1 已发布；本批完成下列文档站与需求看板迁移。

本库验证：全量 749 项单测、439 项浏览器测试及包含类型检查的构建通过。无头 Playwright 检查 9 个 Textarea Story 在亮 / 暗主题、1100px / 390px 下的布局，覆盖状态、计数阈值、三种尺寸、提交、清除撤销、长文本滚动和增高；额外在 Chromium / Firefox / WebKit 回归提交、撤销与高度上限。Chromium CDP 逐字模拟 nihao，确认草稿不发布模型、确认只发布一次，长组词按显示值增高；实测高度过渡存在中间帧，resize 在稳定后只通知一次。等价 autosize 对象重建、挂载后立即收窄、同高度输入、补间打断与卸载均有浏览器用例保护。未运行视觉回归或更新快照。

随后按实际试用反馈修复换行时滚动条闪现：自动增高使用最终高度判断纵向溢出，不把过渡中的临时溢出显示成滚动条。新增 4 项回归用例，Textarea / Scrollbar 的 55 项定向浏览器测试通过；无头 Playwright 在 Chromium / Firefox / WebKit 的亮暗主题下逐帧检查连续换行、退格、行数上限及减少动效，确认增高中不闪出、真实溢出时不闪退。手动缩小和关闭 autosize 的滚动仍可用。

### API 与兼容变化

- 新增 submitOn（默认 none）、submit(value,event)、countFormatter、autosizeTransition（默认 true）和 resize(height)。Enter 默认继续换行，短标注可选 enter，长说明可选 mod-enter；消费方的 keydown.preventDefault 会阻止 submit。
- clearable 默认从 true 改为 false。需要一键清除的入口须显式 true；清除后 5 秒内且焦点未离开控件，可以 Ctrl / ⌘+Z 恢复，新增输入后失效。现有两处显式 false 可保留或删除。
- 组词草稿实时计数和增高，但确认后才更新业务模型。共享焦点校验包含内部按钮与滚动条。清除按钮槽位常驻，首次输入不缩窄文字区。
- resize 的参数是 textarea 高度，不含外框和计数区；初次测量与稳定后的高度变化各通知一次。定位浮层时可在回调读取自己的完整外框位置；无需再观察 textarea。若还需监听窗口、锚点移动或其他业务布局，应保留相应定位逻辑。
- 自动增高采用 120ms 过渡；单次增加超过三行、到达 maxRows、宽度变化与减少动效时直接设高。可用 autosizeTransition=false 保持立即调整。

### 文档站待办

路径相对 `C:/workspace/bing-ui-docs`，处理时按实际文件核对。

| 入口 | 待处理内容 |
| --- | --- |
| Textarea 正文与 API 注册（`content/components/textarea.md`、`shared/docs/textarea.ts`） | 补齐 submitOn / BingTextareaSubmitOn、autosizeTransition、countFormatter、submit / resize；明确 clearable 默认 false、撤销条件及 resize 高度范围 |
| Textarea 网页与独立示例、AI 导出注册 | 同步提交快捷键、可见说明与 aria-describedby、计数阈值、清除撤销、自动增高和状态矩阵；确需按钮的示例显式 clearable |
| 浏览器与导出测试 | 回归中文组词、快捷键、清除默认值、撤销、resize 次数、亮暗主题及 390px；升级精确依赖后重新生成对应版本 AI 文档 |

### 需求看板待办

路径相对 `C:/workspace/requirement-board-main`；已盘点本需求列出的 9 个使用文件。

| 入口 | 待处理内容 |
| --- | --- |
| 标注输入框（原 rows=1、autosize 1–4 行） | 改为 submitOn="enter" + @submit 保存，保留 Shift+Enter 换行；删除重复的 window keydown / 组词过滤，核对外层 Escape 和焦点快捷键的范围 |
| 标注浮层定位 | 用 @resize 重新定位，删除专为 textarea 高度增加的 ResizeObserver；保留锚点、窗口和业务布局变化处理。回归边缘翻转、滚动、1–4 行切换与减少动效 |
| 审批、停用、模板、版本说明等多行字段 | 审核是否需要显式 clearable；默认无按钮，已有两处 false 可省略。回归 max-length 500–2000、清除撤销、计数播报、只读 / 禁用和 blur 校验 |
| `docs/bing-ui.md`、依赖与 ui:check | 与前面 Input / Slider 统一升级到精确版本，更新行为说明并执行版本一致性及实际表单回归 |

- [x] 同步文档站 API、正文、网页和独立示例，统一升级后验证导出。
- [x] 迁移标注提交和高度通知，回归标注定位、版本与审批说明；锚定浮层关闭高度过渡并避免重复处理 Dialog Tab 循环。
- [ ] 真机补测输入法候选窗口与读屏阈值播报；CDP 组合输入验证不替代这些实际环境。

## Table 功能优化（REQ-49，P0/P1）

来源：REQ-49 BingTable 表格：可访问性、交互与架构优化方案（内部需求）。架构拆分提交为 `813872a`，P0-2～P0-7 与 P1-1～P1-6 已发布；本批完成两个下游项目同步，线上需求和部署未改动。

完整说明见 [Table 交互与选择模型](./table-interactions.md)。P2 的多列排序、分组 / 合并 / 汇总、详情行、行拖动和公共 Pagination 尚未实现；窄分页隐藏首末页已在后续 REQ-50 中实现。

### API 与兼容变化

- `keyboardNavigation=true` 默认启用 grid / treegrid 和单一网格 Tab 入口。内部按钮进入单元格编辑模式后恢复自然焦点；可显式 false 兼容业务现有快捷键。
- `scrollbarGutter=auto` 默认按需预留，stable 保留双向位置。清理为旧占位添加的业务覆盖样式，并检查窄屏固定列与滚动阴影。
- `rowKey` 函数 index 现在是原始同级序号，不是拍平序号。优先改用字段 key 或 path，保证跨层级唯一。
- `virtualRowHeight` 只估计尚未测量行；实际行高按 key 缓存，size 决定最小高度。业务要显式固定高度时应约束自身单元格内容。
- 新增 `activeRowKey` / `row-activate`、`selectionStrategy`、远程选择缓存、`sortDirections`、`error` / `retry`、`empty` / `error` 插槽和 `loadingVariant`。公开 `focusCell`、`scrollToRow`、`autoFitColumn(s)`、`selectAllPages`，并导出插槽参数类型。
- 远程全选载荷新增 `allPages / excludedKeys`，可用 `allPagesSelected / excludedRowKeys` 受控；`rows` 只包含已加载数据。后端需以查询条件和排除列表执行全量操作；筛选改变时由业务决定清除全选。

### 文档站待办

路径相对 `C:/workspace/bing-ui-docs`，统一同步时核对实际入口。

| 入口 | 待处理内容 |
| --- | --- |
| Table 正文、API 注册与类型 | 更新新增 props / emits / expose / slots 和四项兼容变化；加入完整快捷键表、排序 / 树行语义与焦点恢复说明 |
| Table 网页、独立示例、AI 文档 | 同步 7 个新故事：键盘编辑、级联选择、远程分页选择、活动行、变高虚拟行、错误重试、骨架加载 |
| 全选与远程数据示例 | 说明 keys 与 allPages / excludedKeys 的区别、已加载 rows 缓存，以及筛选变化后的退出策略 |
| 列宽与性能说明 | 自适应只测量当前已渲染内容；虚拟行高为估计值；记录 1 万行目标和 5 万行文本排序的边界 |
| 统一发版与导出 | 升级精确依赖，检查亮暗主题、390px、键盘及 AI 导出注册 / 版本一致性 |

### 需求看板待办

路径相对本批实际工作区 `C:/workspace/requirement-board-main`。

| 入口 | 待处理内容 |
| --- | --- |
| RequirementTable、账号 4 个面板、成员页、选区历史，共 7 处 | 统一升级后回归方向键、F2 / Enter / Esc、嵌套控件、树展开、远程排序 / 分页、范围选择、列设置和固定列；盘点 `.bing-table__*` 留白覆盖样式 |
| SelectionHistoryWorkspace | 用 `activeRowKey` / `row-activate` 替换自定义 rowClass 活动高亮与普通行点击切换，保留业务导航和历史定位逻辑 |
| AgentTokensPanel | 用 `error` / `retry` 替换借用 emptyText 的错误提示，区分正常空数据与请求失败 |
| 跨页批量操作入口 | 按需接入 selectAllPages 工具栏入口；接口支持查询条件 + excludedKeys，筛选改变时明确退出或保留全选；不把缓存 rows 当全部结果 |
| 自定义快捷键 / rowKey / 虚拟内容 | 审计新默认键盘行为，必要时暂时 false；核对函数 key 的 index 含义和虚拟行高估计，避免重复处理 Enter 激活 |
| `docs/bing-ui.md`、依赖与 ui:check | 与本轮其他组件统一升级精确版本，更新行为说明并跑版本一致性检查 |

- [x] 独立提交 P0-1 架构拆分（813872a），随后开始功能开发。
- [x] 记录 P0/P1 功能与兼容变化；只在 bing-ui 内实现候选和示例。
- [x] 同步文档站正文、API、示例和 AI 导出，统一升级精确依赖。
- [x] 迁移活动行 / 错误状态并回归 7 处业务表格。
- [ ] 用 NVDA + Chrome 人工抽查列头、排序、树层级与全局行号；无头自动化语义检查不替代真实朗读。

## Table 焦点与样式（REQ-50）

来源：REQ-50 BingTable 表格：焦点可见性修复与整体样式升级（内部需求）。P0/P1 已发布，文档站和需求看板源码本批同步；线上需求未改动。详细规范与验证见 [Table 焦点与样式](./table-appearance.md)。

用户已确认选中行保留 6–8% 浅底，由复选框、活动标记、焦点环承担状态辨识；不将选中底色加深到相邻背景 3:1。

| 项目 / 入口 | 后续同步 |
| --- | --- |
| bing-ui-docs Table 正文、API、示例和 AI 导出 | 增加 columnControlsPlacement、treeGuides 和 15 个主题变量；记录焦点滚入、行状态优先级、列设置自动位置及紧凑分页；同步 FocusVisibility、ThemeTokens 故事 |
| bing-ui-docs Button / 主题规范 | 记录全局 --bing-focus-ring、按钮默认 flex-shrink: 0、业务主动收缩写法和长文省略；同步 FlexRow 示例 |
| requirement-board 7 处 Table 使用 | 回归需求表、账号 4 个面板、成员页、选区历史的固定列、滚动末端、键盘控件、亮暗主题与窄屏；检查列设置从页脚移动后是否仍需要显式 footer |
| requirement-board CSS 覆盖 | 清理旧固定表头底色、选中侧条、hover 文字色、滚动条留白与轨道阴影覆盖；使用公开主题变量，避免依赖内部 --_table-* |
| requirement-board 活动行 / 错误态 | 沿用 REQ-49 清单，迁移 rowClass 活动高亮和 emptyText 错误复用；检查 selected 与 active 同时存在时的视觉优先级 |
| requirement-board 表单操作行 | 升级后确认按钮保留自然宽度；需要收缩的少数入口显式 flex-shrink: 1 与 min-width: 0，输入侧保持 min-width: 0 |
| 两项目依赖、导出、截图 | 与其他组件候选统一升级精确版本，更新版本注册和实际页面回归；本轮不更新下游快照 |

- [x] 实现 bing-ui P0 / P1，记录浅选中底色决策与兼容变化。
- [x] 同步 bing-ui-docs 的 API、示例、主题规范和 AI 导出。
- [x] 统一升级 requirement-board-main 并回归 7 处表格与 flex 操作行。
- [ ] 后续评估 P2 外观变体、复选框粒子及拖拽视觉。

## 统一收尾顺序

1. 收齐本轮组件优化与对应 Changeset，逐项补充本清单。
2. 同步文档站的正文、API、网页和独立示例，并验证候选组件行为。
3. 获得本轮发版指令后统一发布；文档站与需求看板精确升级到同一版本。
4. 重新生成 AI 文档、执行版本一致性检查及两个项目的相关回归，完成后逐项勾选并记录最终版本。
