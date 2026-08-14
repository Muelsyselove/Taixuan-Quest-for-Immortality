---
name: "taixuan-release"
description: "太玄问道项目的版本管理与发布工作流：同步版本号、构建 ECO 友好压缩包、通过 tag 触发 GitHub Action 发布 Release 供 ECO 启动器接入与更新。当用户要求发版、升版本号或提交新版本到 GitHub/ECO 时调用。"
---

# 太玄问道 · 版本管理与发布工作流（ECO 接入）

本 skill 仅适用于当前项目（太玄问道，Electron 修仙游戏）。本项目已按 ECO 启动器（莱茵生命生态科）规范接入，所有发布操作必须通过本流程执行。

## 核心原则

1. **保留调试入口**：`npm run start`（electron .）是开发与 ECO 共用的启动命令，任何改动不得移除。
2. **Release 只提供 ECO 友好压缩包**：不发布 NSIS 安装器、绿色 exe 整合包等一键安装包。下载、解压、依赖装配、启动与更新全部由 ECO 负责。
3. **依赖与启动显式声明**：仓库根目录 `eco-manifest.json`（spec: eco/1）声明 `launch` 命令与 `dependencies` 装配命令，必须打入压缩包根部。

## 版本号三处同步

发布脚本自动同步以下三处，禁止只改一处：

- `package.json` 的 `version`
- `renderer/src/core/config.js` 的 `version` 字段
- `eco-manifest.json` 的 `version`（必须与 git tag / Release tag 一致，ECO 以此检测"远方来信"即更新）

## 发布命令

```bash
# 标准发布：patch 版本 +1，同步版本号 → 自检 → 本地验证压缩包 → git 提交/打标签/推送
npm run release -- patch --notes "更新说明"

# 指定版本类型或确切版本号
npm run release -- minor --notes "新增地图模式"
npm run release -- 2.5.0

# 仅同步版本号并本地打包验证，不做 git 操作
npm run release -- patch --no-git
```

前置：确保 `node_modules/electron/dist/electron.exe` 存在（缺失时运行 `node node_modules/electron/install.js`）；工作区改动已提交（脚本只自动提交版本号变更的三个文件）。

## 发布链路

1. `scripts/release.mjs` 计算并三处同步新版本号
2. 运行 `node selfcheck.js` 全功能回归
3. 本地打出 `release/taixuan-quest-for-immortality-{version}-eco.tar.gz` 验证内容完整性（含 eco-manifest.json、package.json、package-lock.json、main.js、preload.js、selfcheck.js、start.bat、renderer/）
4. git 提交版本变更、打标签 `v{version}`、推送分支与标签
5. tag 推送触发 `.github/workflows/eco-release.yml`：校验 manifest 版本与 tag 一致 → 重新打包 → 上传 `{name}-{version}-eco.tar.gz` 到 GitHub Release

## 发布后验证清单

- [ ] Release 资产名含 `-eco` 且为 `.tar.gz`，不含任何安装器
- [ ] tag（v 开头）与 eco-manifest.json 的 version 一致
- [ ] 解压压缩包后根目录有 eco-manifest.json，`npm install && npm run start` 可启动
- [ ] ECO 端能检测到"远方来信"（新版本）并完成生长更新

## 故障排查

| 现象 | 原因 | 处理 |
|------|------|------|
| Action 失败：版本不一致 | 手动改过 tag 或 manifest | 重跑 `npm run release` 让脚本统一版本 |
| ECO 检测不到更新 | Release 缺少 `-eco` 资产或 tag 未推送 | 检查 Action 日志；确认 `git push origin v{version}` 成功 |
| ECO 装配失败 | eco-manifest.json 依赖命令有误 | 本地解压压缩包手动执行 dependencies 命令复现 |
| selfcheck 启动失败 | 缺 Electron 二进制 | `node node_modules/electron/install.js` |
