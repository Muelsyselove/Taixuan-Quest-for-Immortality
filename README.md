# 太玄问道 · Taixuan: Quest for Immortality

![太玄问道](docs/images/banner.jpg)

> 道友，这都 AI 时代了，你怎么还在跟着宗门教导死学硬啃？

**太玄问道**是一款由 AI 驱动的东方修仙文字游戏。Electron 为骨、WebGL 为魂、SVG 绘山河，大语言模型实时生成剧情——每段旅途独一无二，每位道友的证道之路，皆由天道亲手书写。

![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Windows%207%2F10%2F11-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue)
![Version](https://img.shields.io/badge/version-2.0.0-gold)

---

## ✨ 主要特性

### 双模式玩法

- **对话模式**：AI 实时生成剧情的文字冒险。事件、选项、战斗、奇遇皆由大模型执笔，亦可自由输入行动，天马行空皆能成章。
- **地图模式**：自由漫游太玄大陆。三级导航（**大世界 → 宗门/区域 → 场景**），纯 SVG 地图支持滚轮缩放与拖拽平移，所见皆可踏足。

![山河舆图](docs/images/worldmap.jpg)

### 修行体系

- **角色成长**：境界突破（炼气→筑基→金丹→元婴→化神…）、五行灵根、属性修炼、天赋与功法习得；地图模式下修为圆满需手动破境，成败由天。
- **八大宗门**：青云门（混元）、焚天谷（火）、玄冰宫（水）、万兽山（土）、幽冥教（阴）、天剑宗（金）、妙木宗（木）、雷神殿（阳）——各有加入门槛、修炼加成与专属场景。
- **战斗系统**：系统驱动的回合制战斗，三层结算架构（效果层 / buff 层 / 技能层），AI 代理敌方行动；切磋点到为止，死战凶险万分。
- **炼丹闭关**：采集草药、按方炼丹，丹药品质随炼丹水平与药材品质浮动；闭关入定消耗时光换取修为——留意寿元，莫道坐化方悔。
- **财富经营**：银元与灵石双向汇兑，坊市买卖，宗门任务领取赏银。

![闭关修炼](docs/images/cultivation.jpg)

### 角色与世界

- **角色设定**：新征程自定义灵根（1~5 个）、天赋、被动/主动技能（与灵根属性相关）。AI 生成候选，可无限刷新，随心搭配。
- **人物关系**：十余位性格迥异的 NPC——掌门、长老、药童、情报贩子……寒暄赠答皆入史册，好感度影响宗门际遇。
- **物品系统**：七档品质（平凡·优秀·精良·史诗·传说·洪荒·初元），丹药、法宝、功法、材料、奇物一应俱全；道具可授予 buff、学习技能或获得天赋。
- **存档系统**：多角色 × 多存档槽，按域分文件存储 + 自动存档，随时读档回溯。
- **花费统计**：AI 调用用量与花费实时记录，缓存命中率与堆叠图一目了然。

## 🚀 快速开始

### 下载与启动（ECO 启动器）

本项目已接入 ECO 启动器：前往 [Releases](https://github.com/Muelsyselove/Taixuan-Quest-for-Immortality/releases) 页面可获取 `taixuan-quest-for-immortality-x.x.x-eco.tar.gz`（ECO 友好压缩包）。推荐使用 ECO 启动器「种植」本项目——由 ECO 自动完成下载、解压、依赖装配与启动，并在有新版本时提示更新。

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

### 发布新版本

```bash
npm run release -- patch --notes "更新说明"
```

同步版本号（package.json / config.js / eco-manifest.json）→ 自检 → 本地验证 ECO 压缩包 → git 提交并推送 tag，GitHub Action 自动构建 ECO 压缩包并发布到 Release。

### 自检

```bash
npm run selfcheck
```

基于 Playwright 驱动 Electron 的全功能回归：主界面 → 角色创建 → 对话/地图双模式 → 战斗 → 存档往返 → 花费统计，全流程自动验证。

## 🔑 AI 配置

首次启动后，点击顶部标题栏的**设置**按钮（⚙），填写你所使用的 AI 供应商信息：

1. **选择供应商**：内置 DeepSeek、月之暗面 Kimi、智谱 GLM、阿里通义千问、字节豆包、MiniMax，亦支持任何 OpenAI 兼容接口（自定义 Base URL）。
2. **填写 API Key**：在对应服务商平台申请后填入。
3. **选择模型**：填入模型 ID（如 `deepseek-chat`、`kimi-k2-turbo-preview`、`glm-4.6` 等）。

无 AI Key 时游戏也能以「无 AI 模式」运行，使用内置兜底内容，但剧情丰富度会大幅降低——强烈建议配置 API Key 以获得完整体验。

## 🏗️ 项目结构

```
Taixuan-Quest-for-Immortality/
├── main.js                  # Electron 主进程（窗口 / IPC / 存档读写）
├── preload.js               # 预加载脚本（contextBridge 白名单 IPC）
├── package.json             # 依赖与脚本
├── eco-manifest.json        # ECO 启动器接入清单（依赖装配 + 启动命令）
├── docs/images/             # README 插图
├── renderer/                # 渲染层（前端）
│   ├── index.html           # 入口 HTML
│   ├── styles/              # 玄墨鎏金主题（按功能域拆分，main.css 聚合引入）
│   │   ├── main.css         # 聚合入口（@import 级联：base→game→creation→menu→ui→map）
│   │   ├── base.css         # 主题变量 / reset / 标题栏 / 布局 / 滚动条
│   │   ├── game.css         # 对话模式界面
│   │   ├── creation.css     # 角色设定（新开征程）
│   │   ├── menu.css         # 主界面 / 角色与存档选择 / 设置视图
│   │   ├── ui.css           # 通用 UI 组件库（Tabs / 表单 / 图表 / 统计）
│   │   └── map.css          # 地图模式（三级导航 / 场景 / NPC / 炼丹 / 突破）
│   └── src/
│       ├── main.js          # 渲染进程入口
│       ├── core/            # 游戏内核（纯逻辑，不依赖 DOM）
│       │   ├── config.js    # 游戏配置（境界 / 物品 / 提示词 / 灵根 / AI 供应商）
│       │   ├── store.js     # 状态内核：读写 / 订阅发布 / 效果结算 / 属性派生
│       │   ├── domains/     # 状态领域方法（Object.assign 混入 store 原型）
│       │   │   ├── skills.js       # 技能与增益
│       │   │   ├── items.js        # 物品
│       │   │   ├── relations.js    # 人物关系
│       │   │   ├── mapMode.js      # 地图模式（游历 / 闭关 / 炼丹 / 突破）
│       │   │   ├── wealth.js       # 财富 / 商店 / 宗门
│       │   │   └── persistence.js  # 存档序列化与角色重置
│       │   ├── mapData.js   # 地图数据聚合入口 + 查询工具函数
│       │   ├── mapData/     # 地图数据层（按域拆分，组件只读取不硬编码）
│       │   │   ├── styles.js       # 灵根风格 / 设施类型
│       │   │   ├── npcs.js         # NPC 数据
│       │   │   ├── scenes.js       # 场景数据
│       │   │   ├── sects.js        # 八大宗门
│       │   │   └── maps.js         # 大世界 / 二级地图结构
│       │   ├── ai.js        # AI 通信层（多供应商适配 / NPC 对话 / 创建生成）
│       │   ├── combat.js    # 战斗引擎（三层结算：效果层 / buff 层 / 技能层）
│       │   ├── fx.js        # 效果层原子实现与 buff 构建
│       │   ├── skills.js    # 技能库
│       │   ├── alchemy.js   # 草药 / 丹方 / 炼丹结算
│       │   ├── breakthrough.js # 突破系统
│       │   ├── time.js      # 地图时间（年/月）与寿元
│       │   ├── wealth.js    # 财富换算
│       │   ├── data.js      # 存档分域拆分 / 合并
│       │   ├── saves.js     # 存档管理（本地文件读写）
│       │   ├── usageStats.js# 花费统计
│       │   ├── audio.js     # 音效
│       │   └── component.js # UI 组件基类（h 函数 / 响应式订阅）
│       ├── components/      # UI 组件
│       │   ├── svgViewport.js      # SVG 视口（缩放 / 拖拽 / 工具条，各地图共用）
│       │   ├── WorldMap.js         # 大世界地图（一级）
│       │   ├── RegionMap.js        # 区域地图（二级）
│       │   ├── SceneView.js        # 场景绘卷（三级）
│       │   ├── MapView.js          # 山河舆图（对话模式）
│       │   └── ...                 # 面板 / 模态等 20+ 组件
│       ├── screens/         # 界面（主菜单 / 选角 / 对话 / 地图 / 存档 / 设置）
│       ├── ui/              # 通用控件（Modal / 表单 / 柱形图）
│       └── gl/
│           └── MistRenderer.js     # WebGL 灵雾背景
└── selfcheck.js             # Playwright 全功能回归（Electron 驱动）
```

### 架构要点

- **状态管理**：单一数据源 `GameStore` + 键级订阅发布；业务方法按领域拆至 `core/domains/`，经原型混入保持对外 API 不变。
- **战斗三层结算**：效果层（`fx.js` 原子效果）→ buff 层（效果自由组合、可叠加）→ 技能层（蓝耗与结构化效果），职责分明、可独立测试。
- **SVG 视口复用**：缩放 / 平移 / 拖拽 / 工具条收敛于 `svgViewport.js`，大世界、区域图、山河舆图共用同一套交互。

## 🎨 设计主题

采用「**玄墨鎏金**」配色——以玄黑为底，鎏金勾边，朱砂点缀，辅以翡翠青绿，营造水墨仙侠的东方美学意境。字体选用 `Ma Shan Zheng`（马善政体）作为标题展示字，`Noto Serif SC`（思源宋体）作为正文字。

## 🛠️ 技术栈

- **Electron** — 跨平台桌面应用框架
- **原生 WebGL** — 背景山水雾气实时渲染（无第三方 3D 库）
- **原生 SVG** — 地图绘制与交互
- **Vanilla JavaScript** — 无前端框架，自研轻量组件系统（h 函数 + 响应式订阅）
- **ECO 启动器** — 下载 / 装配 / 启动 / 更新（Release 提供 ECO 友好压缩包）
- **Playwright** — 自动化自检

## 📜 许可证

本项目采用 [GNU AGPL v3.0](LICENSE) 开源。

---

> 天地玄黄，宇宙洪荒。
> 一念成道，太玄问道。
