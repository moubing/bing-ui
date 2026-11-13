# BingTable 交互与选择模型（REQ-49）

2026-11-10 在独立架构拆分提交 `813872a` 之后，实现 REQ-49 的 P0-2～P0-7 和 P1-1～P1-6，已随 0.18.0 发布；两个下游项目最终统一使用包含点击修复的 0.18.2。多列排序、分组表头 / 合并单元格 / 汇总、详情行、行拖动和公共分页组件仍属于 P2。后续焦点与样式调整、列设置自动位置及紧凑分页见 [REQ-50](./table-appearance.md)。本文件末尾保留 REQ-49 阶段的验证记录。

## 升级时需要检查

- `keyboardNavigation` 默认 `true`。表头和表体共用一个网格 Tab 入口，内部按钮、输入和链接在进入编辑模式之前为 `tabindex=-1`，鼠标仍可操作。`false` 恢复自然 Tab 顺序；业务已有快捷键时可暂时关闭。
- `scrollbarGutter` 默认 `auto`。没有纵向溢出时取消右侧预留；没有横向溢出时底部轨道高度为 0。需要列宽与后续内容位置始终稳定时显式设为 `stable`。不要继续通过业务 CSS 强制保留滚动条空隙。
- `rowKey(row, index, path)` 的 `index` 改为原始数据的同级序号，排序、分页和展开不改变 key。建议传字段名，或基于行字段 / `path` 构造 key；各层级 key 必须全表唯一。
- `rowDisabled(row, index)` 在索引阶段计算，index 是原始全树的前序序号。业务应按行字段判断，避免依赖显示位置。
- `virtualRowHeight` 只估计尚未测量的行，不再把所有行拉高。实测高度按 key 缓存；单行最小高度由 `size` 决定（sm 36、md 40、lg 44px）。

## 键盘与读屏语义

| 位置 / 操作 | 按键 |
| --- | --- |
| 表格外进入 / 离开网格 | Tab / Shift+Tab |
| 单元格间移动 | 上下左右 |
| 当前行首 / 尾 | Home / End |
| 表头起点 / 最后一行末尾 | Ctrl/⌘+Home / End |
| 按视口高度移动 | PageUp / PageDown |
| 切换当前行选择 / 范围选择 | Space / Shift+Space |
| 选择当前页可选行 | Ctrl/⌘+A |
| 激活普通单元格所在行 | Enter |
| 进入单元格控件 | F2；有控件时 Enter 也可进入 |
| 编辑模式内切换控件 / 回到单元格 | Tab、Shift+Tab 循环 / Esc |
| 树列展开、进入子项 / 收起、回到父项 | 右 / 左 |
| 排序列头 | Enter / Space |
| 同一固定列分组内左右移动列 | Ctrl/⌘+Shift+左 / 右 |
| 列头直接调宽 | Alt+左 / 右；Shift 改为 48px 步长（默认 12px） |
| 聚焦列宽分隔条后调宽 | 左 / 右、Shift+左 / 右、Home / End |

表头保留原生 `th scope=col`，拖拽属性不再写到 `th`。可排序列带 `aria-sort=none/ascending/descending`；排序按钮的隐藏说明包含当前和下一次排序状态。拖动把手可独立聚焦，鼠标仍可从表头拖动。

表格使用 `grid`，树数据使用 `treegrid`。行带全局 `aria-rowindex`；总数包含表头，远程分页使用 `total + 1`。树行提供 `aria-level`、`aria-expanded`、`aria-setsize` 和 `aria-posinset`。每张表共用一个隐藏 live region，报告排序、列移动、选择数量、错误和加载；同一帧仅提交最后一条操作消息。

焦点按行 key 保留；删除或换页后找不到该 key 时回退到相近序号。虚拟滚动时额外保留焦点所在行，因此滚动不会把焦点节点卸载。作者设置的控件 `tabindex` 在编辑模式或关闭键盘导航后恢复；动态插槽同样处理。

## 选择与活动行

`selectionStrategy` 默认 `independent`，显式 `cascade` 时父项聚合可选后代的全选 / 半选状态。选择键只保存可选叶子，父 key 不额外进入模型；禁用节点不计入选择，但不会阻断其可选后代。单选模式保持独立语义。

Shift 点击复选框、开启 `selectOnRowClick` 后 Shift 点击行，以及 Shift+Space 均支持范围选择。范围使用当前可见拍平顺序，跳过禁用行；单独操作设置锚点，排序、换页、页大小和数据索引变化清除锚点。

远程分页会缓存已加载且仍被选中的行对象。`selection-change.rows` 包含当前页和之前页的已选行；取消选择会释放缓存。未加载的远程数据无法生成 row 对象。

`activeRowKey` 支持受控 / 非受控；`update:activeRowKey(key)` 提议更新，`row-activate(row, key, event)` 响应鼠标点击普通行内容或键盘 Enter。活动行带 `aria-current` 和独立视觉标记；禁用行及嵌套控件不触发行激活。原 `row-click` 事件仍保留，可以 `event.preventDefault()` 取消默认激活 / 行点击选择。

### 跨页全选

`toolbar` 插槽保留 `selectedRowKeys` / `visibleColumns`，新增 `selectAllPages()`、`clearSelection()`、`allVisibleRowsSelected`、`allPages`、`excludedKeys` 和 `selectionCount`。业务可在当前页全选后展示“选择全部 N 条”。

本地模式枚举全部可选数据。远程模式不枚举未知 key，而返回：

```ts
{ keys: [], rows: /* 已加载且仍选中的行 */, allPages: true, excludedKeys: [] }
```

远程全选后取消单行只增加排除 key；清除时返回 `allPages: false`。普通选择保持原来的 `{ keys, rows }` 载荷。可使用 `v-model:all-pages-selected` 和 `v-model:excluded-row-keys` 受控；筛选或数据变化是否退出全选由业务决定，调用 `clearSelection()` 或更新受控模型。后端批量操作应使用当前查询条件和排除集，不应把 `rows` 当成全部结果。

## 列宽、排序和状态

双击列宽分隔条，或调用 `autoFitColumn(key)` / `autoFitColumns()`，按表头和当前已渲染行内容测量，应用 `minWidth` / `maxWidth`。未渲染的远程数据、虚拟窗口外行和隐藏列不参与测量；受控 `columnWidths` 仍只发出更新提议。分隔条带 `aria-valuenow/min/max/valuetext`；未设最大宽度时 End 使用容器宽度与当前列宽的较大值，该上限同步用于 ARIA 数值。

列配置 `sortDirections` 默认 `['asc', 'desc', null]`，可以降序优先或省略 null。空数据、错误和加载时不可排序；空数据 / 错误时禁用表头全选。

`empty` 插槽替换空提示；`error: boolean | string` 配合 `error` 插槽（参数 `{ error, retry }`）或默认重试按钮，发出 `retry` 事件。`loadingVariant` 默认 `overlay`，可设 `skeleton` 用于首次无 settled 数据的加载；刷新时继续保留旧行。

公开方法新增 `focusCell(rowKey, column?)`、`scrollToRow(rowKey)` 和 `selectAllPages()`。前两者操作当前页的可见树数据，不会自动换页或展开祖先；`focusCell(null, column)` 定位表头，column 可传列 key 或包含选择列的零基序号。

`BingTableCellSlotProps`、`BingTableToolbarSlotProps` 和 `BingTableSlots` 随组件类型导出。`BingScrollbarExpose` 新增只读溢出状态，表格复用这些状态，并用逐帧合并与 2px 回差处理临界切换。

## 性能与验证

2026-11-11 联动补充：`bing-ui-docs` 正文、API、示例和 AI 导出已同步，`requirement-board-main` 的 7 处业务表格已回归。0.18.1/0.18.2 分别修复全文提示焦点节点、外层可聚焦滚动容器误拦截普通行点击的问题；完整联动结果见 [同步清单](./pending-consumer-updates.md)。NVDA + Chrome 的人工朗读仍未完成。

数据索引在数据 / key / 子节点 / 禁用字段变化时重建，包含 key、父子关系和稳定 path；选择使用 Set，展开和行查询复用 Map。默认文本排序复用 `Intl.Collator`，每行只读取一次排序值。变高虚拟窗口采用按 key 的高度缓存和树状数组；更新高度时保存锚点行及行内偏移，均高时直接计算偏移。

无头 Chromium 计算基准（本机，4 次操作中的最长值；不含首次挂载及绘制）如下。数据为 1 万 / 5 万个根行及 1 个用于展开的子行，排序为带数字的中文名称。

| 根行数 | 当前页全选 / 清除 | 排序 | 展开 / 收起 |
| --- | --- | --- | --- |
| 10,000 | 7.4ms | 41.4ms | 4.3ms |
| 50,000 | 25.6ms | 252.1ms | 26.7ms |

1 万行达到本次 <50ms 的计算目标；5 万行文本排序仍超过一帧，业务可使用已有 `remoteSort`。基准记录在 `composables/tablePerformance.browser.test.ts`，使用 `--reporter=verbose --silent=false` 查看数值；耗时依赖机器和并行负载，不用硬编码时间断言制造 CI 偶发失败。

Storybook 新增键盘导航、级联选择、远程分页选择、活动行、变高虚拟行、错误重试和首次骨架。无头 Playwright 检查全部 17 个故事的 1100 / 390px、亮 / 暗主题，共 68 个页面组合；另检查 forced-colors 与减少动效下的焦点环。未运行视觉回归命令或更新快照。

REQ-49 阶段将 NVDA + Chrome 人工朗读及 7 处业务表格回归列入跨项目清单；业务表格已在本批完成，人工朗读仍待验收。该阶段验证：`pnpm test:run` 70 个文件、773 项通过；`pnpm test:browser --maxWorkers=2` 38 个文件、459 项通过；`pnpm build` 通过，确认类型声明完整且无 TS 诊断。另在 Storybook 实际操作键盘编辑、级联半选、远程全选 / 翻页 / 排除、活动版本、变高行末行跳转及错误重试，全部通过且无页面脚本错误。跨项目同步及最终版本验证见 [待办清单](./pending-consumer-updates.md#table-功能优化req-49p0p1)。
