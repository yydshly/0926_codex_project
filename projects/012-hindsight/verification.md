# 本地验证记录

日期：2026-09-26。验证对象仅为本仓库新增的静态研究网页，不是 Hindsight 服务。

| 检查 | 实际结果 |
| --- | --- |
| 页面加载 | 本地 HTTP 返回 200；标题与中文内容正常 |
| 脚本检查 | `app.js` 语法检查通过；浏览器无页面脚本错误 |
| 本地引用 | 页面内锚点与相对路径目标全部存在 |
| 原理步骤 | 四个步骤均切换到对应说明与示例 |
| 键盘操作 | 聚焦首个步骤后，右方向键选中第二步并更新面板 |
| 认识更新 | 三个按钮分别呈现 V.01、V.02、V.03，三组文本不同 |
| 边界说明 | 折叠说明可展开 |
| 响应式 | 1440、1024、768、390、320 像素宽度均未检测到横向溢出 |
| 文字放大 | 在 720 像素视口、根字号 200% 时未检测到横向溢出；不是完整可访问性审计 |
| 视觉核对 | 已查看桌面封面、记忆更新区域与手机首屏截图；无明显截断或元素重叠 |

机器记录保存在 [`browser-check.json`](browser-check.json)。

## 截图

均为本仓库网页在本地 Chrome 中渲染的真实截图；示例数据由本项目编写，未调用 Hindsight 或模型。没有使用第三方图片素材。

- [`assets/cover.png`](assets/cover.png)：1440 × 760，保留的首版项目首屏截图。
- [`assets/desktop-full.png`](assets/desktop-full.png)：桌面完整页面。
- [`assets/mobile-full.png`](assets/mobile-full.png)：390 像素宽度的完整页面。
- [`assets/mobile-preview.png`](assets/mobile-preview.png)：390 × 844，手机首屏。
- [`assets/memory-evolution.png`](assets/memory-evolution.png)：记忆更新示例区域。

## 本地预览恢复（2026-09-26）

后续检查发现临时预览服务已退出，页面地址连接被拒绝。已新增后台启动脚本 `sites/012-hindsight/start-preview.ps1` 和可双击的 `open-preview.cmd`；服务只监听 `127.0.0.1:8124`。启动命令结束后，另一次检查确认进程仍在运行；再次调用脚本复用原进程。浏览器重新加载页面返回 200，原理区切换正常且无页面脚本错误。未配置开机自启；重启电脑后需重新启动，或直接用浏览器打开静态 `index.html`。

## 理解全景图与查看器（2026-09-26）

新增的理解全景图是根据官方文档、源码和本次讨论绘制的原创说明图，不是 Hindsight 运行截图。SVG 原件由 `build-understanding-map.cjs` 生成，PNG 由同一 SVG 渲染，尺寸均为 2560 × 2710。研究目录与网页目录保存相同图像。

- 图中 135 个文字块通过浏览器宽度检查，未发现超出各自预留宽度的文字；已目视核对整体布局。
- 独立查看器 `sites/012-hindsight/map.html` 返回 200，图像加载成功；实际尺寸、缩放、适合宽度、完整显示操作均正常。
- 已验证 PNG 下载成功、相对路径目标存在、研究网页中的图像入口能打开查看器；浏览器无页面脚本错误。
- 390 像素手机视口中，研究页面与查看器均未检测到页面横向溢出；放大后的图像可在画布内滚动查看。
- 机器记录见 [`map-check.json`](map-check.json)；[`assets/map-viewer-preview.png`](assets/map-viewer-preview.png) 是查看器的真实浏览器截图。

## 未验证范围

- 未安装或运行 Hindsight，未连接真实模型，未写入实际记忆。
- 未复现论文指标，未测量中文检索质量、成本、延迟、权限隔离或生产稳定性。
- 未进行完整屏幕阅读器、跨浏览器或所有字号组合测试。
- 发布的是静态研究网页与图解，不能通过网页直接调用 Hindsight 或访问真实记忆库。

## 网页发布方式

研究网页与总览图查看器纳入本仓库已有的 GitHub Pages 发布流程。新增文件范围为 `projects/012-hindsight/` 和 `sites/012-hindsight/`，研究集摘要及网页索引使用同一张理解总览图。部署执行情况可在 [GitHub Actions](https://github.com/yydshly/0926_codex_project/actions/workflows/deploy-chat2db-pages.yml) 中核对。

- [中文研究网页](https://yydshly.github.io/0926_codex_project/sites/012-hindsight/)
- [可放大的理解总览图](https://yydshly.github.io/0926_codex_project/sites/012-hindsight/map.html)

发布前复核：摘要包含能力、实现原理、使用场景与对我们的意义四项；首屏使用理解总览图。1440、768、390、320 像素视口无页面横向溢出，四步切换和认识时间线正常，总览图查看器与 PNG 下载通过，索引按 001–013 排列，本地路径和发布源目录完整。机器记录见 [publication-check.json](publication-check.json)；[桌面截图](assets/publication-desktop.png)与[手机截图](assets/publication-mobile.png)是最终网页的实际浏览器截图。
