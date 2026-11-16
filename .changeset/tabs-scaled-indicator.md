---
"@moubing/bing-ui": patch
---

修复 BingTabs 放在带 transform: scale 的容器内（例如大屏等比缩放）时，激活指示器的尺寸与位置被重复缩放、偏离选中标签的问题；指示器测量值现在会换算回布局坐标，未缩放时的表现不变。
