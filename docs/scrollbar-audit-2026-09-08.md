# 滚动条统一盘点（2026-09-08）

## 目标与范围

组件库自身提供的滚动区域统一使用 `BingScrollbar`。保留文本框的原生编辑、光标、选区、输入法和尺寸调整行为，滚动轨道与滑块由组件绘制。继续沿用组件已有的主题、平滑滚动开关和减少动态效果设置。

盘点覆盖 `src` 与 `.storybook` 中的溢出样式、运行时滚动设置、原生文本域、文件预览和已有的 `BingScrollbar` 使用位置。

## 本次补齐

| 组件 | 原先遗漏 | 改造结果 |
| --- | --- | --- |
| BingTextarea | 固定行数或自动增高达到上限后，文本域显示系统滚动条 | 使用 BingScrollbar 的自定义视口插槽，直接绑定原生 textarea；支持横纵滑块、内容更新、清空、容器宽度变化与手动调整高度 |
| BingTooltip | 长提示超出窗口高度后使用原生滚动条 | 内容区域接入 BingScrollbar，保留箭头、共享面板和定位；宽内容支持横向滚动 |
| BingColorPicker | 色板较多或窗口较矮时，整个面板使用原生滚动条 | 面板内容使用 BingScrollbar，色值编辑区域保持可达 |
| BingDatePicker | 时间选项已使用组件滚动条，但外层日历内容区仍使用原生滚动条 | 外层内容区统一接入，快捷选项和确认区域保留原有布局；外层与时间列共同遵守 smoothScroll 设置 |
| BingTabs | 横向滚动区域隐藏了系统滚动条，缺少可拖动滑块 | 接入横向 BingScrollbar，溢出时显示轨道，保留键盘切换和指示器；长标签保持足够宽度 |

Textarea 的轨道避开清空按钮、字数统计和右下角的调整尺寸手柄。原生 `wrap`、`cols` 属性转交文本域，`wrap="off"` 的长行可以横向滚动。普通内容仍然自动换行。

## 已经统一的位置

| 组件 | 已覆盖区域 |
| --- | --- |
| BingTable | 表格内容、独立横向轨道和列设置列表 |
| BingSelect | 下拉选项、长列表和虚拟列表 |
| BingTreeSelect | 树形选项、搜索与虚拟树 |
| BingDatePicker | 时、分、秒选项列 |
| BingDialog | 弹窗正文 |
| BingToast | 溢出的消息列表 |
| BingCodeBlock | 长代码的横向、纵向内容 |
| BingFilePreview | 文本、JSON、CSV 预览内容 |

原本用于省略、裁切和动画的 `overflow: hidden/clip` 保留，不把这些区域自动改成可滚动容器。

## 自定义滚动视口

`BingScrollbar` 新增 `viewport` 插槽，参数为 `viewportRef` 和 `viewportAttrs`。两者必须绑定到同一个、实际发生滚动的 DOM 元素。

```vue
<BingScrollbar :smooth="false" always>
  <template #viewport="{ viewportRef, viewportAttrs }">
    <textarea
      :ref="viewportRef"
      v-bind="viewportAttrs"
      v-model="value"
      aria-label="说明"
      rows="5"
    />
  </template>
</BingScrollbar>
```

调用方为该元素提供尺寸、溢出行为及无障碍属性。自定义视口保留自身的角色和焦点规则，不会被替换为额外的可聚焦区域。默认插槽的用法不变。

组件监听实际视口的尺寸、滚动、输入以及子内容变化；程序直接修改 DOM 的 value 且没有触发输入事件时，可在更新后调用公开的 `update()` 方法。`BingTextarea` 已自动同步 v-model 的程序更新。

## 范围边界

- 宿主页面和 Storybook 管理界面的页面滚动由对应应用管理。
- BingFilePreview 中浏览器 PDF 阅读器、外部 Office 转换页面等 iframe 内部滚动由对应渲染器控制。组件库的文本、JSON、CSV 视口已统一。
- 使用者在插槽中自行创建的滚动容器，应显式使用 BingScrollbar，组件库不会改写传入内容中的任意 DOM。

## 验证

- 全量 406 项单元测试、146 项无头浏览器组件测试通过。
- 组件库构建和类型声明生成通过，构建输出使用临时目录。
- 无头 Playwright 检查 Storybook 的 Textarea 自动增高与长文本、Tabs 溢出、颜色选择器、日期时间选择器、Tooltip 长内容和 Scrollbar 自定义视口。
- 验证滑块拖动、真实滚轮、输入焦点与选区、键盘移动光标、清空、手动拉高、只读长行及浅色/深色主题。
- 新增“长文本与滚动”“长内容滚动”“自定义滚动视口”示例，方便持续检查。
