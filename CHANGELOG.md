# @moubing/bing-ui

## 0.19.0

### Minor Changes

- BingAutocomplete 新增独立行尾操作按钮：通过 optionActionLabel 启用、option-action 事件处理操作，支持图标内容、禁用态与键盘进入操作区；普通候选选择行为保持不变。

### Patch Changes

- 共享点击碎屑改为浏览器原生 transform/opacity 动画，避免页面重渲染阻塞已启动的反馈；保持原有轨迹、时长、减少动态效果与清理规则。悬停波纹重置直接清理内联样式，避免大量控件禁用或卸载时重复强制布局。

## 0.18.4

### Patch Changes

- 修复 Slider 在 Dialog 或纵向 Scrollbar 内误用竖向样式的问题，将方向样式限定在滑块自身，保证横向轨道、滑块、刻度与气泡正常显示。

## 0.18.3

### Patch Changes

- 修复 DropDown 读取原生 DOMRect 时丢失锚点宽高，导致 end 对齐菜单偏移到视口边缘的问题；菜单定位显式保留尺寸，并增加真实浏览器中四个方向与窗口变化后的对齐验证。

## 0.18.2

### Patch Changes

- 将 Table 行内交互控件的判断范围限定在当前行，修复表格放入可聚焦滚动容器后普通内容点击无法激活或选择行的问题。

## 0.18.1

### Patch Changes

- 修复 Table 全文提示节点阻止普通文字点击激活行和 selectOnRowClick 选择的问题，保留输入框、按钮等嵌套控件的交互隔离。

## 0.18.0

### Minor Changes

- d77f658: 完善 BingTable 的键盘网格、列头与排序语义、树行语义、活动行、范围 / 级联 / 跨页选择和远程已选行缓存；增加可变行高虚拟窗口、列宽自适应、排序循环配置、空 / 错误插槽及首次加载骨架。

  兼容注意：keyboardNavigation 默认开启，scrollbarGutter 默认 auto；rowKey 回调 index 改为原始同级序号；virtualRowHeight 仅作为未测量行的预估值。可通过 keyboardNavigation=false 和 scrollbarGutter=stable 保留旧的焦点与预留行为。迁移说明见 docs/table-interactions.md。

- 425490c: 增强 BingSlider 的交互和功能，保留原生 range 的标签、焦点、读屏与表单提交能力。

  - 改为自绘轨道、填充和滑块，提供悬停、抓取与滑块焦点环，补齐尺寸继承、success / warning 状态及强制颜色模式；保留 `--bing-slider-color`，新增轨道和滑块样式变量。
  - 指针拖动实时跟随，点击轨道、Home / End / PageUp / PageDown 和外部更新提供可打断的短过渡；支持全局减少动效配置。触屏轨道点按改为松手生效，竖向滑动保留页面滚动。
  - 新增 `tooltip`（默认 `never`）、`formatTooltip`、`marks`、`snapToMarks`、`range`、`minDistance` 和 `thumbAriaLabels`，以及 `inputs`、`focus(index?)`。范围模式使用数值元组，滑块相遇时停住。
  - Shift + 方向键采用 10 倍步长；PageUp / PageDown 统一为范围的 10%（不小于 step）；Esc 撤销当前拖动且不提交 change。连续更新和操作结束时单次提交的语义保持；受控拖动中保持手势预览，结束后再回到父级接受的值，避免移动过程中反复回弹。
  - `.bing-slider`、禁用及状态类名继续保留，内部 DOM 已调整；依赖旧原生 range 伪元素或直接子级结构的样式需要迁移。

- 9a810e3: 完善 BingInput 与共享文本控件层（REQ-47，P0 / P1 / P2）：统一 Input / Textarea 的组合输入、焦点离开校验、语义状态与清除占位；新增密码显隐、前后缀、字数统计、加载态及 enter 事件。

  数字输入只发布 number / null，清空从空字符串改为 null，默认在失焦或 Enter 按范围和步长规整；新增 Shift 十倍步进和前缀拖动调值，受控拒绝在结束操作后统一恢复。接入方需兼容新的空值与 BingInputValue 类型；原生 change 事件参数保持不变。

- 7144bb7: 补齐 BingSlider 的 P2 能力：

  - 新增 `orientation`，默认 `horizontal`；`vertical` 从下到上递增，支持范围、刻度、气泡、键盘、RTL 和纵向触屏拖动，默认高度 200px，可用 `style.height` 调整。
  - 拖过有效区间两端时，滑块提供最多 6px 位移和 10% 挤压的视觉反馈，模型仍受边界约束；按住时稳定跟手，松手后用 0.24s 回弹，减少动效时关闭。
  - 新增 `resetValue`，配置后双击滑块恢复到指定值；范围模式恢复整个元组，并遵守步长、离散刻度和最小间距。保留受控回写、焦点与操作结束时单次 `change` 提交语义。
  - 修复父级重建同内容 `marks` 数组时中断拖动的问题，只有有效数值约束变化才结束当前手势。

- d77f658: 升级 BingTable 焦点可见性与样式：焦点环移入单元格和控件，键盘滚入避开固定列、表头及滚动条；统一主题变量、表头和边线，区分浅底选中态与活动行标记，增加树形引导线和 columnControlsPlacement。默认无分页时列设置移到工具栏或表头右上角，显式 footer 可保留页脚入口。窄分页隐藏首末页，完善空、错误和首次加载骨架。

  新增全局 --bing-focus-ring；BingButton 默认 flex-shrink: 0，修复长文本省略。业务如需主动收缩按钮，可显式设置 flex-shrink: 1 和 min-width: 0。迁移与主题变量见 docs/table-appearance.md。

- ebe3e84: 完善 BingTextarea 多行编辑体验（REQ-48）：新增 submitOn（none / enter / mod-enter）及 submit(value, event)，组合输入确认前不提交。新增 countFormatter、默认开启的 120ms 自动增高过渡 autosizeTransition，以及高度稳定后通知一次的 resize(height)。

  clearable 默认从 true 改为 false；需要清除按钮时请显式开启。清除后保持焦点在控件内，5 秒内可用 Ctrl / ⌘+Z 恢复内容；新输入、离开控件或超时后失效。开启清除时固定预留按钮空间，避免首字输入重新折行。

  延续 REQ-47 的共享文本控件行为：组词草稿只更新显示、计数与高度，确认后才发布模型；内部焦点移动不触发失焦校验，语义状态聚焦时保留颜色。计数采用等宽数字与上限反馈，仅在接近上限、达到上限时播报，不逐字播报。大量增高、达到行数上限、宽度变化与减少动效时直接调整高度。

  自动增高按最终高度决定纵向滚动条，消除换行过渡中的短暂溢出闪烁；达到行数上限后的持续滚动与手动缩放保持可用。

### Patch Changes

- 813872a: 按职责拆分 BingTable 的数据、选择、展开、虚拟窗口、列操作、滚动与分页过渡，并提取表头、表体行、分页器、横向滚动条和固定列遮罩子组件。保留公开 API、DOM 层级、CSS 类名和现有交互，为后续表格优化建立独立的内部模块。

## 0.17.0

### Minor Changes

- e8c9407: BingSelect 新增默认开启的 typeahead 与 highlightMatches，支持标签前缀、英文缩写和中文拼音首字母定位及命中标记。option 插槽新增 matchRanges。

  统一指针与键盘高亮，修复选项 Tab 顺序并补充虚拟列表集合信息；全选入口移到面板内，提供三态和当前结果计数。选中态改为勾选与字重，新增标签进出及溢出计数滚动动效。

  抽出内部高亮、输入缓冲、标签测量、标签动效和 bing-picker 公共样式；保留 bing-select 类名与现有 API，TreeSelect 保持当前行为。新增选项行高与面板圆角变量。

  批量全选按容器容量测量标签，避免为虚拟列表全部选中项创建测量副本或同时播放标签动画；标签与溢出计数一次更新，并通过局部 will-change 改善文字和边缘抖动。

  修复取消全选时占位文字与离场标签重叠、标签错位的问题，保持快速反向切换时的位置稳定，并取消清空方向的新碎屑反馈。

- d924adc: BingTreeSelect 复用 picker 共享层，新增默认开启的 typeahead、highlightMatches 和 node 插槽 matchRanges；标签按实际宽度折叠，修复共享标签测量在部分宽度下重复扩缩的问题。

  完善搜索框光标边界、Alt 左右键、星号和空格导航；搜索期间支持独立展开状态，清空恢复快照，收起活动分支先回到父级。补齐多选混合勾选状态与兄弟组 ARIA，增加层级引导线、展开收起与面板高度过渡，并尊重减少动态效果设置。

### Patch Changes

- d924adc: 修复 Dropdown 菜单项的点击碎屑偶发提前消失：以点击时的滚动位置为基准，忽略延迟送达但位置未变化的旧滚动事件，以及无关区域的滚动；来源祖先或页面实际移动时仍立即清理动画。

## 0.16.0

- 修复编辑区右键菜单在入场结束后抢走正文焦点的问题；键盘打开和显式 autoFocus 仍聚焦菜单。

### Minor Changes

- 修复 Checkbox 在系统减少动态效果偏好下的 SSR 水合 class 不一致；状态与动画判断保持同步。

- a078e8c: 优化 AnimatedText 与 Button 的文字动效：新增 shimmer、文案逐字切换、感应区域与手动播放能力，支持指针起点、键盘聚焦和视口播放控制，并调整默认扫光节奏与配色。

  改善计数、上传状态和按钮文案切换时的字体抖动，通过字符位置对齐与稳定的文字交接保持渲染连续。

- cc9d7d9: 优化 Checkbox 的填充、描勾和半选切换，支持可打断的连续动效、悬停预览、按压反馈、扩展点击区域与校验提醒，并改进禁用外观和减少动态效果处理。稳定按压缩放的合成层，修复动画结束时方框边缘跳动。批量更新按文档顺序播放，选择值保持同步更新。

  CheckboxGroup 新增默认关闭的 `dragSelect` 和 `rangeSelect`，支持鼠标或触控笔拖动连选及 Shift 范围选择，自动跳过禁用项；拖动期间即时更新值，结束后统一触发 change 和表单校验。

- 743d69f: 优化 Dialog 的可打断进出场、触发点方向、拒绝关闭反馈和滚动分隔线，新增 `transitionOrigin`、`initialFocus`、`busy`、`rejectFeedback`、`beforeClose` 及 `close-prevented` 事件。默认焦点由头部工具按钮改为内容区表单控件，无可用控件时聚焦面板。

  `confirmLoading` 现在默认同时启用忙碌保护，遮罩、Esc、取消和关闭按钮均不能关闭；可用 `busy=false` 恢复加载期间的关闭能力。自定义 footer 可读取 `busy` 插槽参数，其关闭方法也经过忙碌保护与关闭前确认；业务直接设置 v-model 仍可关闭。

  窄屏改为贴底面板，支持顶部下滑关闭和 visualViewport 避让；嵌套 Dialog 复用浮层栈，避免重复背景模糊并让下层面板退后。`BingDialogCloseReason` 新增 `swipe`，使用穷尽分支的调用方需补充分支。保留无视觉效果的 `glass` 属性并标记废弃，计划下个大版本移除。

- 7333bc5: 优化 DropDown 的滚动、指针意图、键盘导航与菜单层级。

  - 所有菜单统一使用内部滚动区，并受视口或 boundary 限制；长右键菜单先平移，再限制高度，子菜单随滚动更新位置。
  - 指针与键盘每层共用一个高亮；子菜单父项保持高亮，指针不会抢走外部编辑器焦点。新增 hoverOpenDelay / hoverCloseDelay，默认 80 / 110ms；子菜单悬停等待 100ms，并以左右安全三角保护斜向移动。
  - 菜单项采用 roving tabindex；Tab / Shift+Tab 关闭并从触发器继续原生顺序，Esc 逐层返回，导航不再播放点击粒子。自定义表单保持输入与原生 Tab 顺序。
  - 新增 BingDropDownGroup / BingDropDownDivider，Item 的 type / checked / textValue，DropDown 的 typeahead 与 highlightMotion。默认保留 liquid 高亮，slide 使用每层独立的滑动高亮；active 仍兼容原有高亮与 aria-current，表示当前选项时推荐 type="radio" + checked。
  - 危险项标题变红，禁用文字不再重复减淡，快捷键拆为键帽并提供 aria-keyshortcuts，子菜单间距缩为 4px。
  - 入场只动画可见项，错峰总延迟最多 120ms，第 8 项以后的可见项同步出现；点击选中项延后 60ms 淡出。减少动态效果时直接显示，触屏右键菜单支持 500ms 长按，移动超过 8px 取消。

  保留现有事件、expose、主要类名和右键重定位过渡；Select / TreeSelect 沿用原来的时间线默认值。

- ac19414: 优化 Tooltip 的触发、共享面板动效、无障碍关联与轻量外观。

  - 点击悬停触发器以 `click` 原因关闭，离开前不因 hover / focus 再次打开；只有 `:focus-visible` 焦点打开提示。触屏点按不触发 hover，长按 500ms 显示，移动超过 8px 取消，松手 1500ms 后自动隐藏。
  - 新增 `skipDelay`（默认 300ms）的全局预热窗口；共享面板接管时旧实例立即同步关闭，发出 `update:modelValue(false)` 和新增的 `close('replaced')`。click / manual 固定提示会抑制其他目标的 hover / focus，显式 click / manual 可以替换。
  - ARIA 关联移到实际触发元素，合并已有描述并去除重复朗读；默认插槽新增 `triggerProps`，可显式指定目标。`suppressWhenExpanded` 默认 true，菜单目标展开后自动关闭和抑制提示。
  - 近距离同方向平移，远距离或换边先淡出再出现；背景、边框与阴影拆为 surface，通过 transform 适配尺寸，文字单独淡入。打开时的内容变化使用同样的尺寸过渡，减少动态效果时直接切换。
  - 短提示不再挂载滚动组件；检测到溢出或显式设置 `scrollable` 才使用 BingScrollbar，并限制在触发器方向的可用空间。新增圆角、阴影、内边距三个 Tooltip token。
  - 新增 `shortcut` 键帽和 `tone="inverse"` 外观；键帽与 DropDown 共用 `.bing-kbd` 样式及快捷键解析。原有 show / hide / toggle / updatePosition、事件名称与主要类名继续保留。

## 0.15.0

### Minor Changes

- BingDropDown 支持虚拟矩形锚点与局部视口边界，按可用空间翻转并限制菜单宽高，供编辑器光标命令菜单使用。

## 0.14.0

### Minor Changes

- 公开代码高亮 API：语言列表与别名规范化、auto 主题解析、逐行 token 高亮及类型。与 BingCodeBlock 共用按需加载模块，纯文本不加载 Shiki；未知语言在加载前拒绝，保留组件的失败回退与事件语义。

## 0.13.3

### Patch Changes

- 修复 Toast 异步操作状态：复用同一 action 更新提示时保留 loading；回调内同步替换或关闭后重建同 ID 提示时，旧操作不再影响新提示的 loading、计时或关闭。

## 0.13.2

### Patch Changes

- c52a936: 修复 BingDragOverlay 在条目放下后不再显示时飞向视口左上角：落到会把条目移出列表或隐藏的区域（如「已完成」投放区、回收站、窄屏下未显示的列）时，dnd-kit 的归位动画以已卸载或 0×0 的条目为终点。现在浮层保持拖动时的尺寸，缩小淡出地收进它落下的区域；区域也已不在页面上时就地收拢。减少动效设置改为每次松手时读取，运行中切换系统设置后立即生效。

## 0.13.1

### Patch Changes

- fcb4d24: 修复 BingDragOverlay 归位动画结束时的闪烁：dnd-kit 先撤掉浮层定位、下一个任务才恢复源条目，中间会画出一帧错位的浮层和空占位。现在浮层落到位的同一帧内收起浮层内容，BingDraggable 的 `dragging` 也同时变为 false。

## 0.13.0

### Minor Changes

- dddcd20: 新增 BingDragDrop、BingDraggable、BingDropZone、BingDragOverlay 与 useBingDragDrop，支持条目在多个区域之间拖动：鼠标越过阈值、触屏长按开始，Esc 取消，只按指针所在区域判定落点，可按条目限制可放置区域，并在滚动容器边缘自动滚动。BingToast 新增 `action` 选项，可在提示中放置撤销等单个操作按钮，异步操作期间显示处理中并暂停自动关闭，失败时保留提示供重试。

## 0.12.5

### Patch Changes

- 修复 BingResizable 锁定宽高比时角手柄在横纵位移主次切换、反向和抖动时尺寸突跳的问题。角点位移连续投影到起始比例线上，吸附轴按起始长边保持稳定；保留边缘手柄、键盘、最小/最大尺寸和松手吸附语义。

## 0.12.4

### Patch Changes

- d9e807f: 修复可选 Zod 依赖仍被公共类型引用的问题，未安装 Zod 的项目也可正常检查组件类型；表单校验接口继续兼容 Zod schema。

  修复共享 Tooltip 面板的动效策略错误跟随宿主实例的问题，打开、切换和关闭时均使用对应触发器的局部配置。

## 0.12.3

### Patch Changes

- af097ea: 修复 BingSelect 与 BingTreeSelect 打开面板后抢回焦点的问题：为保证打开动画期间焦点落到搜索框，组件会在随后两帧内重试聚焦，但此前不检查焦点是否已被移走。若用户或业务代码在这段时间内把焦点移到组件外（如快速 Tab、程序化聚焦其他控件），焦点会被拉回搜索框，后续按键随之落入搜索框。现在重试前会确认焦点仍在组件自身或页面主体上，焦点已离开组件时停止重试。打开后聚焦搜索框、`/` 快捷键和 Escape 返回触发器的行为不变。

## 0.12.2

### Patch Changes

- 8d6dd1c: 修复 BingSplitPane 在 KeepAlive 缓存（移出文档）或 `display:none` / `v-show` 隐藏期间，把 ResizeObserver 报告的 0 宽度当作容器真实变窄，导致重新显示时右侧栏先以 0 宽渲染一帧再展开、主区宽度随之跳动的问题。组件现在在未渲染时保留上次有效宽度，隐藏期间未提交的拖动按 `container` 原因取消；显示状态下容器真实变窄仍按可用宽度压缩，偏好宽度和事件语义不变。

## 0.12.1

### Patch Changes

- b1588ff: 修复 0.12.0 在 SSR / Node ESM 环境下无法加载的问题：`BingDatePicker` 引用的 `dayjs/plugin/customParseFormat` 外置后缺少 `.js` 扩展名，Node 解析失败，导致 Nuxt 等服务端渲染场景导入组件库即报 `ERR_MODULE_NOT_FOUND`。仅在浏览器端打包的项目不受影响。新增测试，确保所有外置依赖的导入路径都能被 Node 严格 ESM 解析。

## 0.12.0

### Minor Changes

- c53bef3: 新增 `BingConfigProvider`，为子树统一配置默认尺寸（`size`）、浮层层级基准（`zIndex`，默认 2000，各类浮层按固定偏移叠加，默认层级与之前一致）和 JS 动效策略（`reducedMotion`: `user` / `always` / `never`）。组件显式 props 优先，嵌套 Provider 只覆盖自身设置的字段。

  新增 `useReducedMotion()` 与 `useBingConfig()`；各组件分散的 `prefers-reduced-motion` 检测统一到共享实现，并遵循全局 `reducedMotion` 配置。BingForm、BingTag、BingTabs、BingTable、BingDropDown 的 `size` 不再在 props 上默认填充 `md`，未传时按全局配置解析，最终仍回落到 `md`。

- a38117a: 精简发布产物：改为纯 ESM 多文件输出（`dist/index.js`），移除 UMD 构建；Shiki、Day.js、Lucide、dnd-kit 及 `gsap/*` 子路径不再打进产物，打包器可按组件摇树。`BingCodeBlock` 的 Shiki 核心、语法和主题改为首次高亮时按需加载。`zod` 改为可选 peer dependency。

### Patch Changes

- 4f1978a: 组件内部图标固化为本地 SVG 组件（图形来自 Lucide，ISC 许可文本随产物发布于 `dist/icons/LICENSE-lucide.txt`），移除运行时依赖 `lucide-vue-next`。图标外观不变；组件内图标的类名由 `lucide lucide-*` 改为 `bing-svg-icon bing-svg-icon--*`。
- f18c126: 内部重构：Select 与 TreeSelect 的搜索匹配、虚拟列表、选项详情面板、键盘滚动同步、`/` 搜索快捷键、外部点击检测与表单失焦校验抽取为 `src/utils` 下的共享模块；TreeSelect 的详情面板动画改用 `src/motion/optionDetailMotion.ts`。行为与之前保持一致。
- cb8525b: 内部重构：ColorPicker、DatePicker、DropDown、Select、TreeSelect、Tooltip 的浮层定位（方向翻转、对齐、视口约束、滚动与窗口尺寸跟随）统一由 `src/utils/floating.ts` 实现，定位结果与之前保持一致。
- db1058f: 内部重构：BingColorPicker 拆出色域与色相/透明度滑杆（`BingColorPickerSpectrum`）、格式输入与复制（`BingColorPickerFormatEditor`）两个内部子组件，颜色解析与转换等纯函数移到 `BingColorPicker.utils.ts`；剪贴板写入逻辑抽到 `utils/clipboard`，与 BingCodeBlock 共用。行为与样式保持不变。
- b45270c: 内部重构：BingDatePicker 拆出日历（`BingDatePickerCalendar`）与时间列（`BingDatePickerTimePanel`）两个内部子组件，日期解析、比较、网格生成与快捷选项等纯函数移到 `BingDatePicker.utils.ts`。行为与样式保持不变。

## 0.11.2

### Patch Changes

- 修复页面缩放后滚轮档位取整导致 BingScrollbar 将鼠标误判为触控板、失去 smooth 惯性的情况；保留实际滚动距离、触控板原生回退和减少动态效果偏好。

## 0.11.1

### Patch Changes

- 优化 BingCursor 长编辑区滚动：全部停用时跳过命中与样式扫描，自动模式通过稳定根标记和局部光标样式切换状态，保留正文 DOM、原生边界及指针捕获语义。

## 0.11.0

### Minor Changes

- 增加 BingTable 服务端排序和独立的 BingTableColumnControls，修正受控 null 无法清空排序的问题。多个分组表格可共享列宽、顺序、隐藏和固定状态。

  BingDialog 增加 height、maxHeight、maxWidth 和不随正文滚动的 header-addon 插槽，保持默认尺寸行为。

  新增 BingSplitPane，支持右侧栏拖动、键盘、取消及容器压缩下的偏好保留；新增 BingSlider，支持数值范围、步长、连续更新、结束提交和原生触控。

## 0.10.0

### Minor Changes

- BingTextarea 新增默认开启的 `smoothCaret`，输入、退格、方向键和换行时以约 90ms 平滑跟随原生插入点。支持自动折行、自动高度、内部滚动和中文输入法组词；与 BingInput 共用光标生命周期，保留文本选择、触屏、减少动态效果与不可可靠定位时的原生光标，并在失焦和卸载时清理测量节点及动画。

## 0.9.4

### Patch Changes

- 修复 Tabs 与同一行文字、按钮垂直居中时上偏 4px 的问题。滚动容器改为上下对称留白，保留整体高度和横向滚动条空间，避免切换溢出状态时改变布局高度。

## 0.9.3

### Patch Changes

- 修复 Cursor 在富文本编辑区内标记段落时触发 ProseMirror 反复重建正文的问题。编辑区只更新编辑根节点，使用预生成的悬停规则显示光标，保留文字、链接、嵌入控件和原生回退的行为。

## 0.9.2

### Patch Changes

- 优化 BingCursor 在长文档中的滚动性能：预先生成各状态的原生光标样式，切换状态只更新命中元素，不再修改覆盖整个文档的共享规则。保留局部优先、主题更新、伪元素、指针捕获及原生光标回退，并补充浏览器回归测试。

## 0.9.1

### Patch Changes

- 修复 BingTable 关闭列拖拽时整个表头被误标为禁用的问题。普通表头保留列语义和默认光标，排序按钮仍可点击并显示手形光标；重新启用拖拽后继续支持调整列顺序。

  修复 BingTooltip 短文案右侧和底部多出的滚动槽留白。滚动轨道复用提示框原有内边距，短提示恢复紧凑尺寸，同时保留长内容滚动和共享面板切换。

## 0.9.0

### Minor Changes

- BingAutocomplete 新增 `openOnEmpty`，默认保留空输入展开行为；设为 `false` 时，空值或纯空白不会展开面板，清空输入后自动收起。为面板和实际参与 stagger 的可见候选补充合成层提示，减少文字在缩放动画中的反复重绘。

  BingInput 在聚焦时立即定位自定义光标，普通鼠标按下不再临时切回原生光标；保留拖选、触屏、减少动态效果及不可准确测量时的原生回退。

## 0.8.2

### Patch Changes

- 统一 BingAutocomplete 与 BingSelect 的面板进出、候选悬停和详情跟随动效。详情支持跨面板停留、滚动后恢复、边缘避让和窄屏独立预览，并在关闭或卸载时清理浮层与动画。

  BingInput 在中文组词期间继续使用平滑光标，按原生选区焦点端定位，保持真实输入与候选窗口。组词期间暂停模型、校验及防抖通知，确认后仅发布一次；取消组词恢复原值，不提交拼音片段。

## 0.8.1

### Patch Changes

- 修复 BingAutocomplete 错误插槽的重试按钮消失后关闭候选的问题，恢复输入焦点并保留搜索结果。

## 0.8.0

### Minor Changes

- 新增 BingAutocomplete，支持原位输入、受控候选、键盘和中文输入、候选详情、加载与错误展示，以及公开聚焦和关闭方法。复用输入框、滚动条与浮层管理，支持 SSR 和响应式布局。

## 0.7.2

### Patch Changes

- 修复滚动条出现或消失时挤动内容的问题：按启用方向固定预留轨道空间，支持页面左右对称占位，并隔离嵌套实例的样式。同步稳定表格列宽与横向轨道高度、标签栏高度、多行输入框留白和清空按钮位置。

## 0.7.1

### Patch Changes

- 修复 SSR 页面中多个 body 浮层的水合错配：浮层在客户端挂载后创建，避免刷新时误移除页面正文；初始打开的对话框和预览也在挂载后初始化焦点、滚动锁与动画。

## 0.7.0

### Minor Changes

- 将 BingCursor 改为由浏览器原生绘制的 CSS 光标，减少移动时的主线程开销。SVG 图片按状态、尺寸和配色缓存，保留 16 种状态、局部与全局作用域、颜色、尺寸、热点及原生回退。

  这是 0.x 阶段的兼容性变更：移除 DOM 跟随、SVG 形变、自定义 cursor 插槽、data-bing-cursor-label，以及 mode、followDuration、transitionDuration、zIndex 属性和 BingCursorMode、BingCursorSlotProps 类型。迁移时删除这些旧用法，使用 type、color、outlineColor、size 和 hotspot 配置内置光标。

  优化 BingTable 与 BingScrollbar：隔离滑块位移和内容渲染，共享单元格尺寸监听并批量测量变化内容，缓存列样式，按帧合并列宽调整并在松手时提交最终位置。保留默认平滑滚动、拖拽落位、分页过渡、文本提示与键盘交互。

## 0.6.0

### Minor Changes

- 180d2f7: 优化通用表单的默认填写与纠错流程。

  - BingInput 的清除按钮默认只在 `type="search"` 时开启，其他类型按需设置 `clearable`。需要保留原有按钮的场景可显式设置 `clearable=true`。
  - BingForm 的 `validateTrigger` 默认改为 `auto`：离开字段或提交时进行初次校验，已有错误的字段在修改时重新检查。需要持续即时校验时可显式设置 `['change', 'blur', 'submit']`。
  - 新增 `focusOnError`，默认在提交失败后聚焦页面顺序中的第一个可用错误字段。跳过隐藏、禁用字段，保留复合控件选值，并避免异步校验结束后打断用户的新操作。`scrollToError` 继续独立控制滚动。

- 180d2f7: BingForm 新增实验性 `nextStepHint`，默认关闭。为顶部标签表单显示下一原生 Tab 落点，随焦点更新，不修改 Tab、Shift+Tab、方向键或 Enter 的行为。表单项内部还有清除按钮、复选框选项等入口时不误指向下一字段；浮层展开或顺序不确定时隐藏。末尾只提示提交入口，不把“走到最后”当作填写完成。

  目标位于视口外时在当前字段旁显示目标名称；标签旁空间不足则隐藏提示。业务确认提交成功后可把 `nextStepHint` 设为 false，修改后再次开启。Storybook 的“下一项提示 / 填写与纠错”展示首次填写、修改错误和成功提交的完整流程。

- 180d2f7: BingInput 新增默认开启的 smoothCaret：输入、删除和键盘移动时使用约 90ms 的光标位移过渡，文字和编辑行为仍由原生输入框处理。提供原生光标对照示例，可显式关闭动效。

  光标跟随实际选区和文本滚动，中文组字、选择文本、触屏、减少动态效果，以及数字、邮箱、密码和不能准确测量的文字布局保留原生光标；失焦和卸载时清理动画、测量节点与事件监听。

- efb3a23: 新增 BingCursor，内置参考 macOS 风格的普通、链接、禁用、文本、拖拽与调整尺寸等光标，支持自动状态识别、局部与全局作用域、自定义插槽、可配置的 SVG 轮廓形变和可选跟随模式。

### Patch Changes

- c3b47cd: 为非 Primary 类型的 Button 增加与 Select 节奏一致的悬停波纹，从指针位置铺开，并适配按钮配色、圆角和图标插槽。波纹位于内容下方，不改变按钮布局；禁用、加载、触摸操作及减少动态效果模式下不播放，离开、切换为 Primary 或卸载时清理动画。Primary 保留原有的明亮主题色实底、按压反馈和默认文字扫光。
- fce7d8b: 优化 BingTable 的业务页面体验：

  - 将列设置收进底部操作栏，统一表头、表体和分页的视觉层次，减轻外围阴影。
  - 加载时在原表格上显示遮罩，保留已有行、表格高度和总数；延迟显示并保证最短停留时间，避免快速请求闪烁。
  - 自动为被截断的普通单元格和插槽文本提供全文提示，支持悬停、键盘聚焦和列宽变化；设置 `ellipsis: false` 可关闭省略及自动提示。

- c3b47cd: 修复 Dialog 内容区首项输入框的外扩焦点环被滚动容器裁剪的问题。在滚动区内部预留轮廓空间，并相应减少标题下间距，保持内容位置；同时让滚动到焦点控件时保留边缘间距，覆盖桌面和窄屏布局。
- 180d2f7: 表单错误提示改为整句淡入与原位更新：首次报错约 160ms 淡入，同一错误状态下更新文案不重播入场动画，修正后约 100ms 淡出并恢复帮助文案。移除提示文字的逐字跳动、位移与缩放，保留一行提示空间和长文案换行。支持减少动态效果，并处理快速校验、隐藏与卸载时的动效清理。
- c3b47cd: 将 Select 的面板、选项及侧边操作动画统一为 TreeSelect 现有的效果。两组件复用完整的入场和退场时间线，选项以 22ms 间隔、220ms 时长错峰入场，保持紧凑的节奏；保留减少动态效果、关闭中重开和虚拟列表支持。

  普通列表复用虚拟列表的稳定合成容器，减少选项入场收尾时绘制上下文的变化，保留自适应行高和原有阴影显示范围。

- c3b47cd: 修复组件组合时的弹层层级、Escape 归属、模态焦点和共享滚动锁，支持 Dialog、预览、选择器与菜单的多层嵌套。

  统一表单控件与按钮的尺寸和禁用继承，修复多实例 ID、单选组独立性、标签关联、内部搜索框误触发外部校验，以及异步校验、清空和重置之间的竞争问题。Input 和 Textarea 支持 readonly，并将常用原生属性传给实际输入元素。

  修复表格操作控件误选行、焦点外框被文字省略容器裁剪，以及虚拟行高计算不一致。含控件的单元格保留完整外框，普通长文本继续支持省略和全文提示，新增组合 Storybook 示例与浏览器回归测试。

  表头拖拽期间关闭边缘自动滚动、停止已有平滑滚动并拦截滚动输入，松手、取消或卸载后恢复正常滚动。

  修复表头拖拽松手时浮层内容提前消失，让卡片保留至 dnd-kit 的归位动画结束。浮层与实际表头共用内容和样式，支持自定义标题、排序图标和对齐方式，并在归位过程中收起阴影、圆角与描边，平滑交接到表头。归位按左上角对齐，修复列宽变化时浮层偏离目标的问题。

- 180d2f7: 修复鼠标滚轮的像素步长变化时被误判为触控板、导致 smooth 绕过平滑动画的问题。设备识别优先参考滚轮档位信息，并正确处理行、页单位；实际滚动距离、动画参数及触控板原生滚动策略保持兼容。
- fce7d8b: 修复 Checkbox 在可滚动 Dialog 中获焦、勾选时内容上移并在底部露出空白的问题。隐藏原生 input 以自身 label 为定位参照，Dialog 的滚动外层只负责裁剪，实际滚动由 Scrollbar 的 viewport 承担。
- 180d2f7: 修复连续关闭 Toast 后，补位动画残留的溢出范围导致少量消息也显示滚动条的问题。滚动范围由实际列表高度决定，放得下时隐藏滚动条，超出可用高度时保留滚动和键盘操作，消息减少后恢复正常边界。
- fce7d8b: 修复 BingFormItem 的控件及说明 ID 在多个实例间重复的问题。使用 Vue 的 `useId()` 保证同一应用内实例唯一，并在服务端渲染和客户端水合时保持一致，让标签及错误说明正确关联各自的字段。

## 0.5.2

### Patch Changes

- 1b021dc: Use compatible flex sizing for block tabs while preserving continuous hit areas and visual spacing.

## 0.5.1

### Patch Changes

- Fix fixed table row backgrounds and remove dead pointer gaps between selectable options while preserving their visual spacing.

## 0.5.0

### Minor Changes

- 6b5629e: Add light, dark, and system color themes, give dark mode a night-purple interaction accent, migrate the core controls, surfaces, data displays, and floating components to semantic theme tokens, and let BingCodeBlock syntax highlighting follow the global theme by default.

### Patch Changes

- 18ae962: Adjust the shared glass defaults to use a 16px blur and 0.85 surface opacity, and simplify picker chrome by removing decorative trigger gradients and panel highlight lines.

## 0.4.0

### Minor Changes

- 6c54edc: Enable pulse-eased scrolling by default in BingScrollbar and integrate configurable smooth scrolling across Table, Select, TreeSelect, DatePicker, Toast, CodeBlock, FilePreview, Dialog, and Tabs.
