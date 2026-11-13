# 可点击控件盘点与改造记录

日期：2026-09-08。范围：当前工作区 `src/components` 下的 38 个 Vue 单文件组件，以及共享点击碎屑实现。先记录改造结果，后面保留最初的盘点和设计依据。

## 改造结果

- 41 处操作入口复用 `BingButton`：40 处原生按钮模板和 1 处表头排序动态按钮。覆盖 Textarea/Input 清空、Tag/Toast 关闭、Table 操作、Select/TreeSelect 面板操作、DatePicker 导航、ColorPicker 复制、ImagePreview 工具栏。图标使用 prefix/suffix 插槽，小按钮保留原有尺寸。
- Tabs、Checkbox、Radio、DropDownItem、Select/TreeSelect 选项、日期/时间和预设色接入共享反馈。图片预览入口、卡片点击翻转、表格行选择，以及 Dropdown/Tooltip 点击触发器也已覆盖。
- BingButton 默认关闭节流，快速分页、翻月、缩放和旋转保持响应；需要防止重复提交时显式开启 `throttle`，默认间隔仍为 600ms。Dialog 的确认提交按钮显式开启节流并保留加载保护。Input 数值步进保留长按行为，只在首次有效步进时播放一次，自动连发不重复产生碎屑。
- 表头实际按钮和拖拽预览统一字体、行高与间距，保留不可交互预览和原有拖拽还原效果。
- 纯尺寸拖拽、排序手柄、连续滑动和 Dialog 按住查看背景继续使用各自反馈。

### 共享反馈的归属与清理

`src/motion/useClickFeedback.ts` 按 Vue 应用管理反馈宿主，每个文档共享 `createClickParticles()` 控制器。清空键、标签或菜单项移除后，已经接受的点击仍可播放完约 0.54 秒的反馈。

同一应用、同一文档最多保留 3 批、共 36 个碎屑。动画结束、滚动、窗口尺寸变化、页面可见性变化、页面退出或应用卸载时，清理相关 DOM、时间线和事件监听；应用之间各自清理。开启减少动态效果时跳过碎屑。

同一个事件只播放一次；label 转发给 input 的激活由真实 Checkbox/Radio 负责，decorative 模式由外层选项负责。键盘激活使用实际目标控件中心，内部按钮和可交互子元素不会再次触发行/卡片反馈。

### 改造后验证

- `pnpm test:run`：404 个单元测试通过。
- Vitest Browser 使用系统 Chrome 无头模式，22 个文件、130 个测试通过。新增 11 个共享反馈测试，覆盖清空后继续播放、应用隔离与卸载、label 去重、键盘切换、长按连发、取消/禁用/减少动态效果和数量上限。并发执行时表格拖拽出现过一次采样帧数不足，最终用 `pnpm test:browser -- --no-file-parallelism` 完整通过；未放宽断言。
- `pnpm exec vue-tsc --noEmit -p tsconfig.app.json`：类型检查通过。
- Playwright 复用 6006 Storybook，在 20 个页面执行操作并观察实际生成的碎屑；均通过，没有页面脚本异常。检查了 Textarea/Input、Tabs Variants、Tag Removable、Checkbox/Radio、Select Multiple、TreeSelect Cascading Multiple、DatePicker、ColorPicker、DropDown、Table、ImagePreview、Image、Tooltip Click、Dialog、Toast Manual Close、FilePreview Text 和 Card Click Flip。Input 另检查数字输入页面。
- 实测日期导航和图片缩放在 600ms 内连点 3 次均被接受；检查了 Table 浅色、深色及 390px 窄屏，Select/Tabs 深色，以及清空后的真实碎屑截图。
- 没有变更公开组件 API，未运行构建或视觉快照回归。

## 改造前结论

- 盘点时只有 `BingButton` 调用 `createClickParticles()`。共享实现已经位于 `src/motion/clickParticles.ts`，可以作为其他控件接入的基础。
- 除 `BingButton` 自身外，14 个 Vue 文件中还有 **58 处原生 `<button>` 模板**。其中包括 Table 的内部表头组件；这是源码模板数量，`v-for` 渲染出的多个按钮只计一处。
- 上述 58 处中，3 处承担持续按压或尺寸拖拽：Dialog 的按住查看背景、Resizable 的尺寸手柄、Table 的列宽手柄。其余 55 处还需区分普通操作按钮和具有独立语义的选择控件。
- 另有 2 处动态按钮模板：DropDownItem 的 `a/button`、Table 表头排序的 `span/button`。复选框、单选框、树节点、图片预览入口和有条件的卡片点击翻转也需要覆盖。
- 建议普通操作按钮复用 `BingButton`；Tabs、选项、单选与复选等控件保留原有语义，通过共享动效逻辑获得相同反馈。

## 原生按钮清单

定位行号以本次盘点时的工作区为准。以下路径均相对于项目根目录。

| 文件 | 原生模板数 | 入口与定位 | 建议 |
| --- | ---: | --- | --- |
| `src/components/BingTextarea/BingTextarea.vue` | 1 | 清空：228 | 优先复用 BingButton；保留清空后的输入焦点和当前 24px 尺寸 |
| `src/components/BingInput/BingInput.vue` | 3 | 数值增加/减少：254、260；清空：267 | 清空优先复用；数值步进还要保留 pointerdown 和长按连发行为 |
| `src/components/BingTag/BingTag.vue` | 1 | 移除标签：52 | 复用 BingButton；检查标签随点击被移除时的反馈生命周期 |
| `src/components/BingToast/BingToast.vue` | 1 | 关闭：375 | 复用 BingButton；检查通知退出动画与碎屑清理 |
| `src/components/BingTable/BingTable.vue` | 8 | 展开行：2539；列设置：2735；重置：2749；分页：2878–2920 | 普通操作按钮统一复用；分页要保留连续点击、禁用与切换动画 |
| `src/components/BingTable/BingTableHeaderContent.vue` | 2 | 帮助：63；列宽手柄：73 | 帮助按钮复用；列宽手柄保留尺寸调整语义；动态排序按钮见下文 |
| `src/components/BingSelect/BingSelect.vue` | 5 | 触发器：2499；清空：2561；展开箭头：2572；全选：2625；选项：2701 | 清空、箭头、全选复用；触发器与选项直接接共享反馈，保留 combobox/option 语义 |
| `src/components/BingTreeSelect/BingTreeSelect.vue` | 6 | 触发器：2717；清空：2777；箭头：2788；批量选择：2817；全部展开：2842；节点展开：2954 | 操作按钮复用；触发器和树节点保留原有键盘与选择语义 |
| `src/components/BingDatePicker/BingDatePicker.vue` | 14 | 触发器、清空、箭头：1497–1533；起止切换：1583、1591；年月导航：1614–1675；日/月/年选择：1704–1744；时间选项：1787 | 清空、箭头和导航动作复用；日期、时间与范围切换单独接反馈，保留网格和焦点逻辑 |
| `src/components/BingColorPicker/BingColorPicker.vue` | 3 | 触发器：1584；预设色：1702；复制：1766 | 复制按钮复用；触发器和预设色保留专用呈现，接共享反馈 |
| `src/components/BingImagePreview/BingImagePreview.vue` | 11 | 工具栏：929–1011；两侧上一张/下一张：1017、1026 | 操作按钮统一复用；缩放、旋转、切图要保持快速连续操作 |
| `src/components/BingTabs/BingTabs.vue` | 1 | 标签项：536 | 直接接共享反馈；保留 role=tab、活动项、自动/手动激活与 roving tabindex |
| `src/components/BingDialog/BingDialog.vue` | 1 | 按住查看背景：705 | 按压期间持续生效，松开恢复；保留专用按压行为，不套用普通点击碎屑规则 |
| `src/components/BingResizable/BingResizable.vue` | 1 | 尺寸手柄：1019 | 保留拖拽和键盘尺寸调整，不在拖拽过程中触发碎屑 |
| **合计** | **58** | | |

动态模板：

- `src/components/BingDropDown/BingDropDownItem.vue:456`：根据链接状态渲染 `a` 或 `button`，角色为 `menuitem`。建议保留标签、链接行为和子菜单处理，接共享反馈。
- `src/components/BingTable/BingTableHeaderContent.vue:33`：实际表头为排序按钮，拖拽预览为 `span`。实际排序动作可以复用 BingButton；预览继续保持不可交互。

## 其他需要覆盖的交互

| 组件或入口 | 当前实现 | 建议接入位置 |
| --- | --- | --- |
| BingCheckbox | `label + input[type=checkbox]`，由 `handleChange` 更新状态 | 真实控件的用户激活；decorative 模式由外层选项统一反馈 |
| BingRadio | `label + input[type=radio]`，由 `handleChange` 更新状态 | 真实单选控件的用户激活；组组件不重复播放 |
| BingTreeSelect 树节点 | `div[role=treeitem]`，点击调用 `selectNode` | 节点接受选择时；展开按钮与节点选择分别处理冒泡 |
| BingDropDown 触发器 | 通过 `triggerProps.onClick` 注入消费方提供的触发元素 | 由实际触发控件负责；BingButton 触发器已经有反馈 |
| BingTooltip 点击触发器 | 根节点的点击事件判断触发方式 | 覆盖点击触发的入口；避免与内部 BingButton 产生双份效果 |
| BingImage | 允许预览时以按钮角色打开预览 | 预览入口的有效激活，包括键盘 Enter/Space |
| BingCard | `flipTrigger='click'` 时执行点击翻转 | 实际点击翻转入口；悬停、倾斜和长按反馈单独保留 |
| BingTable 行选择 | `selectable && selectOnRowClick` 时点击普通单元格选行 | 行接受选择时；内部按钮、复选框和选择器不再触发行级碎屑 |

文本输入框仅获得焦点、文本选择、滚动条、排序手柄、颜色滑块、拖拽缩放和弹层空白遮罩，建议沿用各自的反馈方式。连续 pointermove 不应产生碎屑。

## 已经通过 BingButton 覆盖的入口

当前组件模板内共有 16 处 BingButton 使用，分布于 6 个文件：

| 组件 | 模板数 | 入口 |
| --- | ---: | --- |
| BingCodeBlock | 2 | 两种呈现分支的复制按钮 |
| BingDatePicker | 3 | 快捷项、取消、确认 |
| BingDeckTransition | 1 | 下一项 |
| BingDialog | 3 | 关闭、取消、确认 |
| BingFilePreview | 5 | 工具栏与状态内容中的打开、下载、关闭 |
| BingTable | 2 | 本轮已改造的左固定、右固定按钮 |

这些入口应复查关闭/卸载时的反馈可见性，以及内部动作是否需要关闭默认节流。

## 统一接入前需要处理的问题

### 1. 清空或关闭后，效果可能被立即清掉

Textarea 的清空键受 `v-if="canClear"` 控制，清空后节点立即消失。BingButton 在 `onBeforeUnmount` 中调用 `clickParticles.clear()`；已有浏览器测试也要求卸载时清理所有碎屑与时间线。

因此，仅把清空键的标签替换成 BingButton，碎屑会随按钮卸载而中断。Input 清空、标签移除、选项移除和关闭弹层也需要检查同类行为。

建议为短命操作入口设计由稳定父级或共享反馈宿主持有的动画生命周期，保留有限的粒子数量、自动结束、减少动态效果、页面滚动及宿主销毁时的清理。采用哪一种归属方式后，要补充独立的生命周期验证。

### 2. 盘点时 BingButton 默认有 600ms 节流

内部清空、分页、切换、日期导航、缩放和旋转需要保持原来的响应节奏，迁移时应显式设置 `:throttle="false"`。业务提交按钮继续按原有策略处理。

Input 数值按钮还存在特殊路径：鼠标/触摸已经在 pointerdown 完成首次步进，普通 click 会主动避开重复步进；长按随后每 80ms 连发。反馈应按一次用户按压处理，不能让每次连发都生成碎屑。

### 3. 一次操作只播放一次

复选框的 label 会激活内部 input；Select 和 TreeSelect 的选项包含 decorative Checkbox；表格行、卡片、Tooltip 又可能包住 BingButton。

共享接入应处理事件归属与去重，并保留 `stopPropagation`、`preventDefault`、禁用、只读和加载状态的约定。组组件、装饰复选框和容器不重复处理内部控件的点击。

### 4. 保留控件尺寸、语义与焦点

Textarea 清空键当前是 24px，BingButton 的 xs 默认高度为 28px。迁移时要明确内部按钮尺寸、圆角和样式变量，并通过 prefix/suffix 插槽放置图标。

Tabs、Select 选项、TreeSelect 节点、日期网格和范围切换均有独立的键盘或 ARIA 约定。它们适合通过共享函数或 composable 接入碎屑；纯装饰预览保持 inert，不接入点击反馈。

## 建议改造顺序

1. **共享接入与生命周期**：整理通用接入方式，明确同步记录点击位置、键盘激活位置、事件去重、短命控件和卸载清理；沿用现有 GSAP 时间线、transform/opacity 和减少动态效果支持。
2. **常见操作按钮**：Textarea/Input 清空、Tag/Toast 关闭、Table 展开/列设置/重置/分页。先解决用户最常遇到的遗漏。
3. **选择类控件**：Tabs、Checkbox、Radio、DropDownItem、Select、TreeSelect。重点验证鼠标和键盘行为一致，内部装饰不重复触发。
4. **复杂面板**：DatePicker、ColorPicker、ImagePreview，并复查已经使用 BingButton 的弹层操作。
5. **条件式容器交互**：图片预览入口、卡片点击翻转、表格行选择和插槽触发器，覆盖组合使用时的事件归属。

## 盘点阶段验证（改造前）

使用系统 Chrome 的 Playwright 无头模式，复用现有 6006 Storybook 服务，观察实际生成的 `.bing-click-particles` 节点：

| 页面 | 操作 | 结果 |
| --- | --- | --- |
| BingTextarea / Default | 输入 `2322` 后清空 | 清空成功，清空按钮立即移除，碎屑生成次数为 0 |
| BingTabs / Default | 切换到“详情” | aria-selected 正确更新，碎屑生成次数为 0 |
| BingButton / Primary | 点击 | 碎屑生成次数为 1 |

以上三个页面未捕获到脚本异常。盘点阶段只审查源码和运行现有页面，没有修改组件实现。后续改造及验证结果见本文开头。
