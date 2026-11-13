# 组件组合审计与修复记录

审计日期：2026-09-06。代码基线：`fce7d8b`，包版本：`0.5.2`。

初次审计确认了 14 项可复现问题，其中 5 项列为 P1。本轮已完成这些问题的修复，并补充组合示例和回归测试。重点是弹层、表单、输入控件、单选/多选组、表格之间的组合；这不是全库所有状态和平台的穷尽检查。

项目已经有 `BingFormContext`、`BingFormItemContext`、主题变量和共享滚动工具。问题主要出在这些约定没有覆盖所有组件，以及实例身份、弹层归属、异步校验和尺寸计算各自实现，组合后发生冲突。

## 修复结果

| 审计编号 | 已完成的修复 | 验证重点 |
| --- | --- | --- |
| 01、12 | 整表与字段分别管理校验请求；校验模型快照；编辑后重试当前快照；清除、重置和卸载使相关在途结果作废 | 字段并发、提交竞争、同字段乱序、连续编辑、清除和重置、卸载后不再提交 |
| 02 | 使用 Vue `useId()` 生成实例 ID 和默认单选组名 | 两组 RadioGroup 的模型与原生 checked 独立，组和控件 ID 唯一 |
| 03、04 | 共享弹层管理器统一层级、父子关系和 Escape 归属；子层 Teleport 面板属于父层交互范围 | Dialog 内菜单命中、ColorPicker 内 Select 逐层关闭、DropDown 内 Select 选项可点击；修改 zIndex 后上层仍高于下层 |
| 05 | Dialog、ImagePreview、FilePreview 共用按持有者管理的文档滚动锁 | 任意关闭顺序、重复加锁、样式优先级恢复；最后一个持有者退出后解锁 |
| 06 | 测量虚拟行内内容，扩展统一行高并修正滚动锚点；纳入边框高度 | 带 Button/Select 的 500 行表格实测统一为 61px，滚动偏移与实际行高相同 |
| 07 | 复合控件的内部搜索框和选项隔离外部 Form/FormItem 上下文 | Select、TreeSelect 搜索不触发外部字段校验，也不复用字段 ID |
| 08 | 行选择忽略交互元素和显式忽略标记 | 点击 Button 或 Select 保持行选择不变，点击普通单元格仍可选择 |
| 09、10 | 提取统一表单控件逻辑；Button 继承尺寸和禁用状态；标签、按钮和单行输入使用相同高度变量 | sm/md/lg 分别为 38/44/52px；标签中心对齐；禁用继承和显式覆盖 |
| 11 | Input、Textarea 增加 readonly；常用原生属性转发到真实输入元素 | readonly、maxlength、required、form、class 分配正确，只读时无清空按钮 |
| 13 | 模态焦点进入、Tab 约束、关闭后恢复；将所属 Teleport 面板纳入焦点范围 | 背景控件不能获取模态焦点；子弹窗退出回到父窗，父窗退出回到打开按钮 |
| 14 | 注册实际控件 ID；组通过 aria-labelledby 关联；标签在控件注册后渲染 | 显式 ID、组内 ID、默认 ID 在客户端及 SSR/hydration 中正确关联 |

共享实现位于 `src/utils/overlay.ts`、`src/utils/scrollLock.ts`、`src/utils/controlAttrs.ts` 和 `src/components/BingForm/useFormControl.ts`。没有新增依赖或修改锁文件。

## 修复后的验证

| 验证方式 | 结果 |
| --- | --- |
| `pnpm test:run` | 38 个测试文件、397 个测试通过 |
| 进程级 `BING_UI_BROWSER_CHANNEL=msedge` + `pnpm test:browser` | 13 个测试文件、58 个测试通过 |
| `pnpm build` | 类型检查、声明文件和 ES/UMD 产物构建通过 |
| Playwright，系统 Edge 无头模式 | 三个组合 Story、RadioGroup/CheckboxGroup 的禁用 Story 检查通过；页面脚本异常为 0 |
| 视觉快照回归 | 未运行，未更新快照 |

新增长期保留的 Story：

- [弹窗与表单](http://localhost:6006/?path=/story/composition-%E7%BB%84%E4%BB%B6%E8%81%94%E5%8A%A8--dialog-form)：真实 BingForm 校验、搜索选择、独立单选组、日期、颜色、操作菜单和嵌套 Dialog。验证浅色桌面布局及深色 390px 窄屏布局，也验证 ColorPicker 内 Select 的三级 Escape 归属。
- [表格中的操作控件](http://localhost:6006/?path=/story/composition-%E7%BB%84%E4%BB%B6%E8%81%94%E5%8A%A8--editable-table)：500 行数据、Button 和 Select 单元格、行选择与虚拟滚动。
- [统一尺寸与禁用状态](http://localhost:6006/?path=/story/composition-%E7%BB%84%E4%BB%B6%E8%81%94%E5%8A%A8--form-states)：动态切换 sm/md/lg 和 disabled，比较控件高度、标签对齐与按钮继承。

新增回归测试位于 `src/components/Composition.browser.test.ts`、`src/components/BingForm/BingForm.validation.test.ts`、`src/utils/scrollLock.test.ts`；扩展了 `src/components/BingFormItem/BingFormItem.test.ts` 的 SSR/hydration 检查，以及 RadioGroup/CheckboxGroup 的禁用插槽选项测试。

## 组合使用约定

- 控件显式的 size/disabled 优先，其次继承 FormItem/Form，最后使用默认值。省略 disabled 会继承，显式 `:disabled="false"` 可用于表单禁用时仍需执行的取消操作。BingForm 自身禁用时不会提交。RadioGroup/CheckboxGroup 作为整体禁用时，其内部选项始终禁用；要覆盖 Form 的禁用状态，应在组组件上显式设置 false。
- Input、Textarea 的 readonly 只限制输入和清空，不影响聚焦与文本选择。class/style 仍应用于组件外框，maxlength、required、form 等应用于实际输入元素。
- `selectOnRowClick` 忽略按钮、链接、输入控件和可编辑区域。自定义操作区可标记 `data-bing-table-row-click-ignore`。`row-click` 仍保留原始冒泡事件；若业务不希望接收该事件，可在操作控件上使用 `@click.stop`。
- 虚拟表格仍采用统一行高，virtualRowHeight 是下限；已测得更高内容时只向上扩展，并同步调整滚动锚点。需要逐行不同高度时可使用 `:virtual="false"`。
- 弹层 zIndex 是其最低层级；后来打开的层会排在现有层之上。自定义可聚焦控件保留正常的 tabindex；菜单和选择器的 Teleport 面板通过父子关系纳入模态焦点范围。
- 被更新请求、清空、重置或卸载作废的校验返回 false；不能把作废结果当成验证成功。未被作废的校验只提交当前模型快照的结果。

## 补充修复：Dialog 首项控件的焦点环裁剪

用户反馈“高级设置”嵌套弹窗中，输入框顶部的焦点环被截断。实测 Input 外扩 3px 的 box-shadow 贴着 Scrollbar viewport 的上边界，而 Dialog body 顶部 padding 为 0。

现将 6px 标题下间距移入滚动内容区，保持原有内容位置，同时设置 viewport 的 scroll-padding-block。保留必要的滚动裁剪，让输入框外扩阴影和按钮 outline 在聚焦滚动后仍有显示空间。

新增 `src/components/BingDialog/BingDialog.browser.test.ts`，在 1280px 和 390px 视口下断言实际焦点轮廓没有越过祖先的裁剪边界，并覆盖末尾按钮和返回首项的滚动。Dialog、Checkbox 滚动兼容性和组合场景共 24 项浏览器测试通过，类型检查通过。Playwright 已检查 `Composition/组件联动/弹窗与表单` 中“高级设置”的浅色桌面与深色窄屏状态，页面脚本异常为 0。

## 补充调整：Select 复用 TreeSelect 的动效

以用户认可的 TreeSelect 现有效果为参照，将完整时间线提取到内部模块 `src/motion/selectPanelMotion.ts`，由 Select 和 TreeSelect 共同调用。保留 TreeSelect 的原始参数和动画目标：面板以 240ms 入场，选项从第 60ms 开始，以 22ms 间隔、220ms 时长依次入场，使用 `power3.out` 缓动。

面板沿展开方向位移 8px、单轴缩放 0.96～1；选项使用相反方向的 6px 位移及 0.98～1 缩放。侧边按钮的入场、倒序退场，以及四个展开方向和三种对齐方式也复用同一实现，避免两份动画各自调整后再次产生差异。

减少动态效果模式直接显示所有节点；关闭中重开会终止旧动画并重新入场，卸载时清理时间线及操作按钮的动画。Select 原有的液态选中反馈、选项点击范围和虚拟列表行为保持兼容。

浏览器回归挂载相同三项数据的 TreeSelect 和 Select，在 61 个入场进度点和 30 个退场进度点比较面板、选项及操作按钮的实际透明度、缩放与位移，并覆盖关闭中重开。测试同时检查短列表不增加滚动范围，结束后无残留动画偏移或多余滚动条。

Playwright 使用 Edge 无头模式检查 `TreeSelect/Default`、`Composition/组件联动/弹窗与表单` 的浅色和深色场景，以及 Select 的 `Single`、`VirtualList` 和 `Multiple`。实际播放中能观察到错峰入场，收尾后选项坐标稳定，四个展开方向的短列表均未产生横向滚动或多余滚动条。选择“开发”、日期选择、Escape 只关闭子面板、虚拟列表滚动、连续开关和减少动态效果检查通过，页面脚本异常为 0。

本次 397 个单元测试、17 项 Select/TreeSelect/组合浏览器测试及类型检查通过。

## 补充排查：Single 普通列表与浏览器缩放

用户进一步确认，抖动发生在 Single 示例的整行选项；开启虚拟列表或改变浏览器缩放后消失。对原始五项数据逐帧测量，普通列表的行高始终为 40px、总滚动高度为 212px，未发生重新排高或横向滚动。固定行高的对照没有改变测量结果，因此目前没有证据将原因归结为行高计算。

通过 Chrome DevTools Protocol 检查合成层，虚拟列表具有持续存在的列表合成容器，普通列表此前没有。两者的选项均会在 GSAP 入场结束时退出临时 3D 合成层；Select 另有液态效果的独立子层。缩放后恢复正常进一步支持渲染状态相关的推断，但不是已确认浏览器缺陷的充分证据。

现将 `transform: translateZ(0)` 和 `will-change: transform` 放到 Select 的公共选项容器中，让普通与虚拟列表都保留稳定的合成容器。没有修改行高、动画参数或普通列表的裁剪范围。实际层树检查确认，入场期间和结束后使用相同的容器层；原有点击范围、选项选择和虚拟滚动检查通过。

验证使用 Chrome、Edge 无头模式。Storybook 检查包括 Single 的普通及虚拟模式、VirtualList 和弹窗表单；另外通过 CDP 模拟 1、1.25、1.5 像素比例及对应视口的变化，覆盖浅色和深色。17 项浏览器测试及类型检查通过。无头环境未复现用户肉眼看到的整行抖动，本次改动是对已确认渲染差异的兼容处理，其在用户原浏览器状态下的视觉效果仍需确认，不能仅凭 DOM 坐标稳定断言彻底解决。

## 初次审计的验证范围与结果

以下保留修复前的证据和建议；源代码位置均指原始基线 `fce7d8b`，不是当前代码行号。

| 验证方式 | 结果 |
| --- | --- |
| `pnpm test:run` | 36 个测试文件、385 个测试通过 |
| 默认 `pnpm test:browser` | 本机缺少对应版本的 Chromium Headless Shell，未执行测试 |
| 进程级设置 `BING_UI_BROWSER_CHANNEL=msedge` 后执行 `pnpm test:browser` | 12 个测试文件、47 个测试通过 |
| Playwright 组合场景 | 使用系统 Edge 无头模式，验证下列问题；未发现页面脚本异常 |
| 构建、视觉快照回归 | 未执行，未更新快照 |

复用现有 `http://localhost:6006` Storybook。浏览器版本为 `152.0.4191.66`。没有打开可见浏览器，也没有重启用户的 Storybook。

直接检查的现有 Story：

- `Components/BingDialog/FormExample`：两个 Select 的 ID 冲突；关闭 Select 的 Escape 同时关闭 Dialog。这个示例使用原生 `form`，没有组合 `BingForm`。
- `Components/BingForm/ZodSchema`：Form 禁用后输入框禁用，提交按钮仍可用。
- `Components/BingTable/VirtualRows`：行高变量为 48px，实测行高 49px。
- `Components/BingSelect/Sizes`：多个尺寸实例共用 `bing-select-1` 及对应的 listbox ID。

另外临时添加 `Audit/Composition/Reproduction`，覆盖 Dialog + Form + Select/DropDown、多个 Dialog、两个 RadioGroup、并发校验、各尺寸控件、表格操作列、500 行虚拟表格和可搜索 Select。验证脚本、临时 Story、截图和日志在审计结束后清理。

P1 表示当前就会阻断正常交互或产生错误数据状态；P2 表示应纳入本轮优化的兼容性、交互、样式或可访问性问题。

## 01 · P1 · 并发校验会把无效表单报告为有效

位置：`src/components/BingForm/BingForm.vue:219`、`:286`、`:304`、`:328`。

`validate()` 和所有字段的 `validateField()` 共用 `validationRun`。某个字段开始校验就会使先前的整表校验或其他字段校验失效。旧请求随后根据当前 `errors` 是否为空返回结果；空错误集并不表示旧请求校验成功。

复现：为 A 设置必填规则，A 保持空值，B 有效；schema 包含耗时 50ms 的异步 refinement。先提交表单，紧接着调用 `validateField('b')`。

实测：原生 `form.requestSubmit()` 最终触发 `submit({ valid: true, errors: {} })`，尽管 A 仍为空。另一个用例中，A、B 都无效，并行校验两者得到 `[true, false]`，错误集只留下 B。

```ts
// A、B 均为空；schema 对两个字段设置必填规则。
await Promise.all([
  formRef.validateField('a'),
  formRef.validateField('b'),
])
// 实际：[true, false]；errors 只有 b。
```

修复方向：整表提交校验和字段校验分别管理请求身份；字段之间不能互相取消。过期结果应明确作废或重新校验当前快照，不能根据尚未落定的空错误集返回成功。

## 02 · P1 · 多实例 ID 重复，两个 RadioGroup 会互相取消选中

位置：`src/components/BingRadioGroup/BingRadioGroup.vue:13`、`:31`、`:36`；`src/components/BingRadio/BingRadio.vue:8`；`src/components/BingSelect/BingSelect.vue:43`、`:95`。

这些计数器放在 `<script setup>` 内，每创建一个组件实例就重新从 0 开始。RadioGroup 默认 `name` 因此始终是 `bing-radio-group-1`，Radio 的 ID 始终是 `bing-radio-1`。

复现：同一个 Form 内放两个 RadioGroup，分别绑定独立的 `v-model`，不手动指定 `name`。第一组选择 A，第二组选择 B。

实测：浏览器把两个组识别为同一原生单选组；初始化就只有后一组的原生 input 处于选中状态。点击前一组后，后一组原生 input 被取消，但后一组的 Vue model 和 `.is-checked` 样式仍显示已选，造成模型、视觉和原生状态不一致。

同源问题：两个 Select 都生成 `bing-select-1` 和 `bing-select-1-listbox`；两个 Dialog 的标题都是 `bing-dialog-1-title`。TreeSelect、DatePicker、CheckboxGroup 的相同写法在代码中也可确认，尚未分别执行所有多实例用例。只给 Select 传入自定义 `id` 不能修正内部 listbox/option 的计数器。

修复方向：统一采用 Vue `useId()` 生成实例标识，并从唯一基础 ID 派生 listbox、option、标题等 ID；原生 radio 的默认分组名必须按组独立。

## 03 · P1 · Dialog 中的 DropDown 菜单被遮挡，无法点击

位置：`src/components/BingDropDown/BingDropDown.vue:1374`、`:1431`；`src/components/BingDropDown/BingDropDownItem.vue:619`；`src/components/BingDialog/BingDialog.vue:33`。

DropDown 将菜单 Teleport 到 `body`，固定 `z-index: 60`，子菜单为 70；Dialog 的默认层级为 2000。菜单脱离 Dialog DOM 后也失去其层叠上下文。

复现：Dialog 的 FormItem 里放 DropDown，点击绑定 `triggerProps` 的 BingButton。

实测：菜单已渲染且 `visibility: visible`，但菜单中心的 `elementFromPoint()` 命中 `.bing-form__layout`，菜单完全被 Dialog 挡住。

修复方向：为弹层建立父子归属与统一层级分配，菜单和子菜单继承所属弹窗的层级关系。不能只把一个菜单的数字无限调大，否则又会盖住后来打开的模态弹窗。

## 04 · P1 · 关闭子组件的 Escape 会连带关闭父弹窗

位置：`src/components/BingDialog/BingDialog.vue:347`、`:359`；`src/components/BingSelect/BingSelect.vue:2495` 附近。

Dialog 各实例独立监听 `window.keydown`，没有判断自己是不是最上层，也不检查事件是否已经由子组件消费。Select 触发器处理 Escape 时仅 `preventDefault()`，事件仍会到达 Dialog。

复现一：Dialog 内打开不可搜索 Select，在触发器上按 Escape。实测选择面板和 Dialog 同时关闭。现有 `FormExample` 也能复现。

复现二：连续打开两个 Dialog，按一次 Escape。实测两个 `v-model` 都变为 `false`。

修复方向：由弹层栈统一分发关闭操作，一次 Escape 只交给当前活动层；明确子组件消费事件的约定。还要覆盖焦点在 Teleport 面板内时的情况。

## 05 · P1 · 多弹窗乱序关闭会提前解锁页面，最后还会残留滚动锁

位置：`src/components/BingDialog/BingDialog.vue:21`、`:187`、`:216`。ImagePreview 和 FilePreview 也分别实现了自己的滚动锁。

`scrollLockCount` 与历史样式写在 `<script setup>` 内，实际是每个实例一份，不能统计整个页面的锁持有者。

复现：依次打开两个独立 Dialog，先由业务状态关闭第一个，再关闭第二个。

实测：第一个关闭后还有一个 Dialog 可见，但 `body/html.style.overflow` 已恢复为空。第二个关闭后 Dialog 数量为 0，`body/html.style.overflow` 却恢复为 `hidden`，页面仍无法正常滚动。

修复方向：抽成按 Document 管理的共享滚动锁，以持有者集合记录 Dialog、ImagePreview、FilePreview。首次加锁保存样式，最后一个持有者释放时恢复，支持乱序关闭和卸载。

## 06 · P2 · 表格嵌入 Button 后实际行高与虚拟滚动计算不一致

位置：`src/components/BingTable/BingTable.vue:282`、`:526`、`:599`、`:3631`、`:3651`。

虚拟范围和占位高度按 `virtualRowHeight` 计算，默认 48px；单元格只设置 `height/min-height`，内容、内边距和边框可以把实际表格行撑高。

复现：500 行、关闭分页、400px 高度，操作列放默认 md BingButton；保持默认虚拟行高。

实测：每行实际 61px，计算仍使用 48px。`scrollTop` 从 600 增至 648 时，同一个第 20 行按钮的屏幕位置从 584 变为 523，移动 61px，出现额外 13px 的跳动。现有纯展示 `VirtualRows` Story 也测到实际 49px 对计算 48px 的差异。

修复方向：明确虚拟表格是固定高度还是可测量高度。固定高度模式必须把内容区、内边距、边框都纳入总行高约束；允许内容撑高时则需要测量，并用实际高度计算偏移。验收必须包含按钮、选择器和多行内容。

## 07 · P2 · Select 的内部搜索框被误当成表单字段本身

位置：`src/components/BingSelect/BingSelect.vue:86`、`:2852`；`src/components/BingInput/BingInput.vue:43`、`:88`。

Select 内部复用 BingInput，但没有隔离外部 `BingFormItemContext`。内部搜索框继续继承字段 ID、错误状态和校验回调。

复现：必填 FormItem 中放可搜索 Select，不选择值，只打开面板并输入搜索词 A。

实测：选择值仍是空字符串，仅输入搜索词就触发外部字段的 change 校验并显示“A 必填”。触发器与搜索框的 ID 同时为 `bing-form-item-v-0-control`。

修复方向：复合控件内部的辅助输入应有独立 ID 和交互状态，屏蔽外部字段的注册/校验回调；只在真正改变选择值或整体离开控件时通知 FormItem。TreeSelect 等复用输入组件的内部面板需要按同一约定检查。

## 08 · P2 · 表格操作控件点击会误触发行选择

位置：`src/components/BingTable/BingTable.vue:1666`、`:2485`。

`handleRowClick()` 不区分点击来源。内置选择框和展开按钮手动阻止冒泡，但单元格插槽里的交互控件没有统一处理。

复现：启用 `selectable` 和 `selectOnRowClick`，操作列放 BingButton，另一列放 BingSelect。

实测：点击第一行“编辑”，操作执行 1 次，同时产生 `row-click` 并选中第 1 行；打开第二行 Select，又产生一次 `row-click` 并选中第 2 行。

修复方向：行选择默认忽略按钮、链接、输入控件、可编辑区域及显式忽略标记。`row-click` 是否保留原始冒泡事件应单独明确，不能让开启操作菜单隐式改变选择结果。

## 09 · P2 · Form 的 disabled/size 没有传到 Button

位置：`src/components/BingButton/BingButton.vue:15`、`:44`、`:73`；`src/components/BingForm/BingForm.vue` 的 context provide。

输入类组件已经读取 FormItem context，Button 则只读取自身 props。

复现：`<BingForm disabled size="sm">` 中同时放 Input 和 Button，包括 Button 位于 FormItem 内的情况。

实测：Input 禁用且为 38px，Button 未禁用且仍为 md 44px，点击后业务动作计数增加。现有 `ZodSchema` Story 的表单禁用时，提交按钮同样未禁用。切换 Form 为 lg 后，输入类控件变成 52px，Button 仍为 44px。

修复方向：定义统一的尺寸和禁用继承规则，包括 Form 的直接子按钮、FormItem 内按钮和显式覆盖方式；为只读表单需要保留的取消、关闭操作定义清楚的例外能力。

## 10 · P2 · 同名尺寸使用不同高度，标签无法与控件对齐

位置：`src/components/BingFormItem/BingFormItem.vue:351`；`src/theme/tokens.css:37`；`src/components/BingButton/BingButton.vue:458`。

在左侧标签布局中测得：

| 尺寸 | FormItem 标签高度 | Input / Select / TreeSelect / DatePicker / ColorPicker 外框高度 | 显式同尺寸 Button 高度 |
| --- | ---: | ---: | ---: |
| sm | 34px | 38px | 36px |
| md | 40px | 44px | 44px |
| lg | 46px | 52px | 52px |

标签自身居中依赖旧高度，所以相对单行控件中心偏上约 2/2/3px；即使给表格内 Button 和 Select 都显式设置 sm，仍分别是 36px 和 38px。这与第 09 项的继承缺失是两个不同问题。

修复方向：标签、按钮和单行控件统一使用控制高度变量，定义包含边框的总高度。Textarea 等多行控件应单独规定首行对齐，不能强制为单行高度。

## 11 · P2 · 常用原生输入属性落在包装 div 上，实际输入框不生效

位置：`src/components/BingInput/BingInput.vue:147`、`:161`；`src/components/BingTextarea/BingTextarea.vue:177`、`:178`。

未声明的属性由 Vue 自动透传到根 div，组件没有为真实 input/textarea 定义统一的原生属性转发方式。

复现：`<BingInput readonly maxlength="3" required />`。

实测：包装 div 有 `readonly` 和 `maxlength="3"`；真实 input 的 `readOnly=false`、`maxLength=-1`、`required=false`，仍能填入完整的 `abcdef`。`BingTextarea readonly` 同样没有只读效果。

范围说明：Textarea 已有 `maxLength` prop，按现有文档使用 `:max-length="3"` 是另一条有效路径；这里不把该 prop 误报为失效。Input 本身没有对应的 maxlength prop。

修复方向：明确常用原生属性的 props 或输入属性入口，将它们传给真实控件，并保留根元素的 class/style 定制能力。补测 readonly、maxlength、form、required 和原生可访问性属性。

## 12 · P2 · resetFields/clearValidate 后，未完成的校验会重新写入旧错误

位置：`src/components/BingForm/BingForm.vue:255`、`:320`。

清除错误和重置模型没有使正在执行的校验失效。

复现：启动包含 50ms 异步 refinement 的校验，立即 `resetFields()`，等待旧校验完成。

实测：重置后错误集立即为 `{}`，旧 Promise 完成后又出现 `{ a: ['A 必填'] }`。`clearValidate()` 走同样的无失效处理路径。

修复方向：清除、重置、模型切换以及卸载时，按操作范围使在途结果失效。整表校验和字段校验的并发规则需要与第 01 项一起设计。

## 13 · P2 · Dialog 没有建立模态焦点范围

位置：`src/components/BingDialog/BingDialog.vue:679`、`:790`、`:818`。

组件声明 `aria-modal="true"`，但没有设置初始焦点、约束 Tab 导航或在关闭后恢复触发器焦点。

复现：键鼠打开 Dialog，再按 Tab，然后点击关闭。

实测：打开后焦点仍在背景的打开按钮；Tab 可以移动到另一个背景按钮；弹窗完全消失后焦点落在 BODY，没有恢复到触发器。

修复方向：打开时选择合理的初始焦点，在模态层内部管理 Tab；关闭后恢复仍存在的触发器。必须将属于该 Dialog 的 Teleport 面板纳入焦点范围，否则会反过来破坏 Select、DatePicker 和 DropDown。

## 14 · P2 · FormItem 与实际控件没有注册关系，显式 ID 会使 label 关联失效

位置：`src/components/BingFormItem/BingFormItem.vue:32`、`:256`；`src/components/BingInput/BingInput.vue:43`；`src/components/BingCheckbox/BingCheckbox.vue:51`。

FormItem 的 label 固定指向自己生成的 controlId，而 Input 允许显式 props.id 覆盖该 ID。两边没有同步或注册机制。

复现一：`<BingFormItem label="名称"><BingInput id="custom-input" /></BingFormItem>`。实测 label 仍指向 `bing-form-item-…-control`，`label.control === input` 为 false。

复现二：FormItem 内的 CheckboxGroup 包含两个默认 Checkbox。实测组根节点和两个原生 input 使用同一个字段 controlId，产生重复标识；组本身也不是可由 label 聚焦的原生输入。

修复方向：字段注册真正的控件 ID 和聚焦方法；区分单控件的 `label for` 与复合组的 `aria-labelledby`。组内各选项必须有各自的 ID，不能都继承字段的 controlId。

## 建议的优化顺序

1. **先修 P1 的正确性问题。** 修正实例 ID、RadioGroup 分组名、并发校验和共享滚动锁；建立弹层关闭与层级的统一实现。每个已复现场景都应先成为回归测试。
2. **建立统一的控件与字段约定。** 提取内部表单控件逻辑，统一 disabled、size、status、原生属性转发、控件注册、焦点与校验事件；复合控件内部的辅助输入显式隔离。
3. **统一尺寸与表格约定。** 采用相同的高度变量，明确操作列事件规则，修正固定行高与虚拟计算的对应关系。一起检查边框、内边距和聚焦轮廓，避免只调整外观数值。
4. **把组合场景加入长期验收。** Storybook 同时保留单组件示例与业务组合示例；浏览器测试断言真实点击、原生 checked、焦点、命中测试和几何数据。

建议至少固定以下组合用例：

| 组合 | 必须断言的行为 |
| --- | --- |
| Dialog → Form → Select / TreeSelect / DatePicker / ColorPicker / DropDown | 菜单可点击、Escape 只关闭当前层、焦点不逃到背景 |
| Dialog → Dialog / ImagePreview / FilePreview | 层级正确、任意顺序关闭和卸载后滚动锁正确释放 |
| Form → 两个 RadioGroup / CheckboxGroup | 组间独立、ID 唯一、label 与错误说明关联正确 |
| Form → 可搜索 Select / TreeSelect | 搜索行为不修改外部字段状态，不重复注册字段 ID |
| Form → 异步校验 → 提交/清空/重置/连续编辑 | 不丢字段错误、不误报成功、不回写过期错误 |
| Form → 各类控件 + 提交按钮 | 尺寸、禁用、只读和错误状态有一致的继承规则 |
| Table → Button / Select / DropDown | 操作控件不误选行，焦点轮廓和菜单不被裁切 |
| 虚拟 Table → 操作控件与多行内容 | 行高计算与 DOM 一致，切换虚拟范围时无跳动 |

上述场景再分别覆盖 sm/md/lg、明暗主题、窄容器、减少动态效果及连续打开/关闭。现有 432 个测试通过并不能替代这些组合断言。

## 尚未作为缺陷计入的事项

- 主题目前明确约定设置在 `document.documentElement`；局部容器的 `data-bing-theme` 不生效，不能据此认定现有主题实现有 Bug。
- 更广的动画生命周期、触摸设备、输入法组合输入、服务端渲染和完整业务数据规模未做穷尽验证。
- 本机依赖安装状态存在 pnpm 警告，未进行安装或修改锁文件；缺失 Chromium 是验证环境问题，已用 Edge 无头模式完成浏览器验证。
