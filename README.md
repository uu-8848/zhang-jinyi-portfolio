# 张津溢 · 动画与视觉创作

以中文招聘阅读为主的动画作品集，React + Vite。由已发布的 Sites 第 6 版迁入，保留源码、作品图版、影片、循环背景、实时 WebGL 着色器及设计记录。

## 开始修改

推荐 Node.js 22.12 或更高版本。

```bash
npm ci
npm run dev
```

开发服务端口为 4173。正式构建：

```bash
npm run build
npm run preview
```

构建结果为 `dist/`。不要将 `node_modules/`、`dist/` 或密码提交到仓库。

## 文件在哪里

- `src/App.jsx`：页面结构、作品顺序、滚动切换。
- `src/cinema.css`：字体、构图、响应式与磨砂效果。
- `src/Atmosphere.jsx`：循环视频、交互网格、光标与方块揭幕。
- `src/GlassShader.jsx`、`src/glassShaders.js`：背景视频上的实时折射着色器。
- `src/artworks.js`：项目文字、海报和图版。
- `src/films.js`：每个项目的视频链接；四季、POP MART 的链接暂未提供。
- `src/content.js`：个人介绍、教育经历及联系信息。
- `public/assets/`：部署所需的作品、简历和影片素材。
- `design/sources/`：生成背景的源图；`design/` 还有提示词、字体许可及离线视频制作代码。
- `ART_DIRECTION.md`：参考视频分析、设计决定与验证边界。
- `AGENTS.md`：后续修改必须保留的要求。

## 影片与动态

影片均已随项目保存。悬置状态使用本地 HLS 播放列表及其分片，移动或替换时应保留整个 `public/assets/films/suspended-state/` 文件夹。其余影片是 MP4。三组背景各有桌面与手机版本，均为 12 秒循环视频。

## 上线与原网址

迁移时已发布的网址：https://zhang-jinyi.jinyi.chatgpt.site

此 GitHub 仓库尚未绑定自动部署。提交代码不会自动更新上述 Sites 网址。后续可把本仓库接入支持 Vite 静态站点的托管平台，安装命令 `npm ci`，构建命令 `npm run build`，输出目录 `dist`。当前所有资源使用根路径 `/assets/`；若部署到 GitHub Pages 的仓库子路径，需要同步修改资源路径，不能仅修改 Vite base。

本仓库不携带原 Sites 项目绑定配置，以免在新的开发环境中误发布到旧项目。原网站保持可用。

## 验证记录

迁入版本已通过生产构建、静态渲染、影片路径与循环检查，以及离线 EGL 着色器绘制检查。尚未完成真实浏览器的桌面与手机验收。后续优先检查自动播放、触控、滚动切换、影片全屏及减弱动态设置。
