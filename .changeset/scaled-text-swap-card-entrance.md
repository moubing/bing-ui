---
"@moubing/bing-ui": patch
---

修复 BingAnimatedText 放在带 transform: scale 的容器内切换文案时，退场的字被甩到原位之外、占位宽度先跳变再收缩的问题（BingButton 的 text-swap 同样受益）；测量值现在会换算回布局坐标。

修复 BingCard 带入场动画时会先完整显示一帧、再消失、再入场的闪烁：等待进入视口期间卡面保持隐藏。比视口或滚动容器大很多、达不到触发面积的卡片不受影响，仍然直接显示。

修复 BingCard 翻到背面后文字发虚：背面停稳、没有倾斜时撤掉透视，浏览器按正常精度绘制；卡面再次倾斜或翻转前自动还原。

修复 BingAppSwitcherTransition 当前页文字发虚：去掉舞台上不起作用的 perspective，转场画面不变。
