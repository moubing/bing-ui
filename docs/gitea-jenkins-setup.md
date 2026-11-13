# 持续集成说明

公开仓库保留组件源码、类型、Storybook、测试和 Changesets。内部 Git 服务、Jenkins 账号、服务器路径、代理和部署拓扑不在公开范围内。

自建 CI 可依次执行锁文件安装、组件测试、浏览器测试和库构建，再按需要生成 Storybook。具体命令与浏览器边界见 [开发约定](../AGENTS.md)。发布 npm 包时仅由安全的 CI 凭证或进程级环境提供认证，不能把 Token 写入仓库中的 .npmrc。

部署静态 Storybook 时，可把生成的 storybook-static 目录交给自己的静态托管服务；源代码仓库不提交构建产物。
