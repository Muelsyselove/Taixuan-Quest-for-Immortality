# 太玄问道 · Taixuan: Quest for Immortality

> 道友，这都 AI 时代了，你怎么还在跟着宗门教导死学硬啃？

**太玄问道**是一款由 AI 驱动的东方修仙文字游戏。Electron 为骨、WebGL 为魂、SVG 绘山河，大语言模型实时生成剧情——每段旅途独一无二，每位道友的证道之路，皆由天道亲手书写。

![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Windows%207%2F10%2F11-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue)
![Version](https://img.shields.io/badge/version-1.0.0-gold)

---

## ✨ 主要特性

- **天道叙事引擎**：接入国内主流 AI 厂商（DeepSeek、通义、智谱、Moonshot、豆包、讯飞等），剧情实时生成，每一段旅途都独一无二。
- **角色成长**：境界突破（炼气→筑基→金丹→元婴→化神…）、五行灵根（金木水火土）、属性修炼、天赋与功法习得。
- **物品系统**：七档品质（平凡·优秀·精良·史诗·传说·洪荒·初元），分类管理，稀有度筛选；丹药、法宝、功法、材料、奇物一应俱全；道具可授予 buff、学习技能或获得天赋。
- **角色设定**：新征程可自定义灵根（1~5 个）、天赋、被动技能、主动技能（与灵根属性相关）。AI 生成候选，可无限刷新，随心搭配。
- **战斗系统**：系统驱动的回合制战斗，AI 代理敌方行动，功法招式各有消耗与倍率。
- **山河舆图**：纯 SVG 绘制的修仙世界地图，支持 **25%~400%** 滚轮缩放与拖拽平移。
- **存档系统**：多存档槽 + 自动存档，随时读档回溯。
- **增益系统**：常驻 Buff 栏，记录修行路上所得的种种机缘加成。
- **NSIS 安装包**：支持自选安装目录、是否创建桌面快捷方式。

## 🚀 快速开始

### 下载安装

前往 [Releases](https://github.com/Muelsyselove/Taixuan-Quest-for-Immortality/releases) 页面下载最新版本的 `Taixuan-Setup-x.x.x.exe`，运行后按向导安装即可。

### 本地运行（开发模式）

```bash
# 克隆仓库
git clone https://github.com/Muelsyselove/Taixuan-Quest-for-Immortality.git
cd Taixuan-Quest-for-Immortality

# 安装依赖
npm install

# 启动游戏
npm start
```

### 打包安装包

```bash
npm run pack
```

打包产物位于 `release/` 目录下，包含 NSIS 安装程序 `太玄问道-Setup-x.x.x.exe`。

### 自检

```bash
npm run selfcheck
```

运行自动化自检脚本，验证核心功能（角色创建、物品使用、战斗、存档等）是否正常。

## 🔑 AI 配置

首次启动后，点击顶部标题栏的**设置**按钮（⚙），填写你所使用的 AI 供应商信息：

1. **选择供应商**：支持 DeepSeek、阿里云通义千问、智谱 GLM、Moonshot、字节豆包、讯飞星火等多家国产大模型。
2. **填写 API Key**：在对应服务商平台申请 API Key 后填入。
3. **选择模型**：填入模型 ID（如 `deepseek-chat`、`qwen-max`、`glm-4` 等）。

无 AI Key 时游戏也能以"无 AI 模式"运行，使用内置兜底内容，但剧情丰富度会大幅降低——强烈建议配置 API Key 以获得完整体验。

## 🏗️ 项目结构

```
Taixuan-Quest-for-Immortality/
├── main.js                  # Electron 主进程
├── preload.js               # 预加载脚本（IPC 桥接）
├── package.json             # 依赖与构建配置
├── build/
│   └── installer.nsh        # NSIS 安装包自定义脚本
├── renderer/                # 渲染层（前端）
│   ├── index.html           # 入口 HTML
│   ├── styles/
│   │   └── main.css         # 玄墨鎏金主题样式
│   └── src/
│       ├── main.js          # 渲染进程入口
│       ├── core/
│       │   ├── config.js    # 游戏配置（境界/物品/地图/提示词/灵根等）
│       │   ├── store.js     # 状态管理（属性/背包/存档/增益/有效属性计算）
│       │   ├── ai.js        # AI 通信层（多供应商适配 + 创建生成）
│       │   ├── combat.js    # 战斗系统（伤害计算/敌方AI）
│       │   ├── saves.js     # 存档管理（本地文件读写）
│       │   └── component.js # UI 组件基类（h 函数/响应式）
│       ├── components/      # UI 组件
│       │   ├── CharacterPanel.js   # 个人面板（属性/灵根/增益/入口）
│       │   ├── EventPanel.js       # 事件面板（叙事文本）
│       │   ├── OptionDock.js       # 选项坞（预设选项 + 自由输入）
│       │   ├── MapView.js          # 山河舆图（SVG 缩放/拖拽）
│       │   ├── HistoryLog.js       # 史册（行动日志）
│       │   ├── InventoryModal.js   # 背包二级页（分类/筛选/使用）
│       │   ├── SkillsModal.js      # 功法神通（技能/天赋展示）
│       │   ├── CreationModal.js    # 角色设定（新开征程）
│       │   ├── SaveLoadModal.js    # 存档/读档
│       │   ├── SettingsModal.js    # 设置（AI 配置）
│       │   └── CombatOverlay.js    # 战斗浮层
│       └── gl/
│           └── MistRenderer.js     # WebGL 背景（山水雾气渲染）
└── selfcheck.js             # Playwright 自动化自检
```

## 🎨 设计主题

采用「**玄墨鎏金**」配色——以玄黑为底，鎏金勾边，朱砂点缀，辅以翡翠青绿，营造水墨仙侠的东方美学意境。字体选用 `Ma Shan Zheng`（马善政体）作为标题展示字，`Noto Serif SC`（思源宋体）作为正文字。

## 🛠️ 技术栈

- **Electron 31** — 跨平台桌面应用框架
- **原生 WebGL** — 背景山水雾气实时渲染（无第三方 3D 库）
- **原生 SVG** — 地图绘制与交互
- **Vanilla JavaScript** — 无前端框架，自研轻量组件系统（h 函数 + 响应式订阅）
- **electron-builder** — NSIS 安装包打包
- **Playwright** — 自动化自检

## 📜 许可证

本项目采用 [GNU AGPL v3.0](LICENSE) 开源。

---

> 天地玄黄，宇宙洪荒。
> 一念成道，太玄问道。
