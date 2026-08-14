// 全局配置：所有数值、文案、地图节点、厂商预设皆在此声明，组件只读取不硬编码
export const CONFIG = {
  gameTitle: '太玄问道',
  gameSubtitle: '一缕神魂入太玄 · 万般因果问长生',
  version: '2.4.1',

  // 主界面模式入口（available=false 表示敬请期待）
  modes: [
    { key: 'dialogue', icon: 'scroll', title: '对话模式', desc: '与天道对答，以言语书写你的修仙长卷', available: true },
    { key: 'map', icon: 'spark', title: '地图模式', desc: '自由漫游山河舆图，踏遍机缘秘境', available: true, badge: 'V2.4' },
    { key: 'settings', icon: 'talisman', title: '设 置', desc: '画质 · 声音 · AI 接入 · 花费价目', available: true }
  ],

  stats: [
    { key: 'hp',        label: '生命值',   icon: 'heart',   bar: true, color: '#e35d6a', max: 'maxHp' },
    { key: 'mp',        label: '法力值',   icon: 'drop',    bar: true, color: '#5aa9e6', max: 'maxMp' },
    { key: 'atk',       label: '攻击力',   icon: 'sword',   bar: false },
    { key: 'pdef',      label: '物理防御', icon: 'shield',  bar: false },
    { key: 'mdef',      label: '法术防御', icon: 'talisman',bar: false },
    { key: 'cultivation', label: '修为',   icon: 'lotus',   bar: true, color: '#d8b25c', max: 'cultivationCap' }
  ],

  realms: ['炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'],

  // 物品稀有度（order 越大越稀有；初元为最高品阶）
  rarities: [
    { key: 'pingfan', label: '平凡', color: '#9a9a94', order: 0 },
    { key: 'youxiu',  label: '优秀', color: '#6fcF7f', order: 1 },
    { key: 'jingliang', label: '精良', color: '#5aa9e6', order: 2 },
    { key: 'shishi',  label: '史诗', color: '#b07fe8', order: 3 },
    { key: 'chuanshuo', label: '传说', color: '#e8a34f', order: 4 },
    { key: 'honghuang', label: '洪荒', color: '#e35d6a', order: 5 },
    { key: 'chuyuan', label: '初元', color: '#f2f2ee', order: 6 }
  ],

  // 五行灵根
  roots: [
    { key: 'jin',   label: '金', color: '#d8b25c' },
    { key: 'mu',    label: '木', color: '#6fcF7f' },
    { key: 'shui',  label: '水', color: '#5aa9e6' },
    { key: 'huo',   label: '火', color: '#e35d6a' },
    { key: 'tu',    label: '土', color: '#c08a5a' }
  ],

  itemCategories: [
    { key: 'dan',    label: '丹药', desc: '服之立见效用' },
    { key: 'fabao',  label: '法宝', desc: '可随身携带的器物' },
    { key: 'gongfa', label: '功法', desc: '蕴含传承的典籍玉简' },
    { key: 'cailiao', label: '材料', desc: '炼器炼丹所需之物' },
    { key: 'qiwu',   label: '奇物', desc: '难以归类的机缘之物' }
  ],

  initialState: {
    name: '无名散修',
    origin: '', // 出身（固定选项或自由填写，≤100字）
    realmIndex: 0,
    hp: 100, maxHp: 100,
    mp: 60,  maxMp: 60,
    atk: 12, pdef: 6, mdef: 5,
    cultivation: 0, cultivationCap: 100,
    roots: [], // 灵根 ['jin','mu',...]
    buffs: [], // 常驻增益 [{id,name,desc,mods,day}]
    relations: [], // 人物关系 [{id,name,identity,relation,affinity,day}]
    activeSkills: [{ name: '御火诀', desc: '焚尽八荒之火', cost: 12, mult: 1.8, root: 'huo' }],
    passiveSkills: [{ name: '吐纳术', desc: '呼吸吐纳，每回合回血 1、回蓝 1', mods: { hpRegen: 1, mpRegen: 1 } }],
    talents: [{ name: '天生剑骨', desc: '剑心天成，攻击 +5%', mods: { atkPct: 0.05 } }],
    customSkills: { active: [], passive: [] }, // 存档专属技能（AI 剧情需要时注册，仅当前存档生效）
    items: [
      { id: 'seed-1', name: '粗制回气丹', desc: '山脚下药铺最常见的丹药，带着淡淡的苦味。', effect: '恢复 30 点生命', rarity: 'pingfan', category: 'dan', day: 1, usable: true, effects: { hp: 30 } },
      { id: 'seed-2', name: '残破玉简', desc: '穿越时怀中所藏，表面裂纹中隐有光纹流转。', effect: '参悟后修为 +20', rarity: 'jingliang', category: 'gongfa', day: 1, usable: true, effects: { cultivation: 20 } }
    ],
    location: 'qingyun',
    day: 1,
    // 地图模式扩展
    mode: 'dialogue', // dialogue | map
    wealth: { silver: 100, spirit: 0 }, // 财富：银元/灵石
    mapTime: { year: 1, month: 1 }, // 地图模式时间
    alchemyLevel: 1, // 炼丹等级
    alchemyExp: 0, // 炼丹经验
    herbs: {}, // 草药库存 { herbKey: count }
    mapLocation: null, // 地图模式当前位置 { world: 'qingyun', region: null, scene: null }
    sect: null, // 所属宗门
    sectAffinity: {}, // 各宗门好感度 { sectId: affinity }
    evil: false, // 是否邪修
    gender: 'male', // 性别（部分宗门有性别要求）
    dead: null, // 陨落标记 { reason:'lifespan', at:{year,month} }（地图模式寿元尽时置位）
    // V2.4 扩展
    stocks: null, // 银市行情 { stockId: { price, prev, history:[...] } }（懒初始化）
    portfolio: {}, // 银股持仓 { stockId: 股数 }（已购银元卖出前不可消费）
    tianhui: null, // 天慧符 { owned, tongling, autoGreet, rules:{ 'all'|stockId: {buyBelow,buyQty,sellAbove,sellQty} } }
    travel: { mount: null, yujian: false }, // 行程方式：坐骑 id / 御剑飞行
    relationChatAt: {}, // 各 NPC 上次自由对话涨好感的年月（总月数）{ name: totalMonths }
    explore: null // 探索格子地图状态（不入存档，离开即重置）
  },

  // 出身预设（创建角色时可选，也允许自由填写 ≤100 字）
  origins: [
    { key: 'sanxiu',  label: '山野散修', desc: '无门无派，于山野间自悟吐纳之法，一人一剑闯荡江湖。' },
    { key: 'zongmen', label: '宗门弃徒', desc: '曾是名门大派外门弟子，因故被逐出师门，心怀不甘。' },
    { key: 'shangjia', label: '商贾之子', desc: '生于行商世家，见惯奇珍异宝，揣着盘缠与算盘求仙问道。' },
    { key: 'shuxiang', label: '书香门第', desc: '世代耕读传家，满腹经纶却弃文从道，以经史参悟天机。' },
    { key: 'jiangmen', label: '将门之后', desc: '将星之后，家传武艺傍身，沙场戾气未脱，杀伐果断。' },
    { key: 'nongjia', label: '农家子弟', desc: '面朝黄土背朝天，偶得仙缘入道，吃苦耐劳，心性坚韧。' }
  ],

  // 地图节点（SVG 坐标系 0-1000 x 0-640）
  map: {
    minZoom: 0.25,
    maxZoom: 4,
    nodes: [
      { id: 'qingyun',  name: '青云门',   x: 180, y: 200, kind: 'sect'    },
      { id: 'wanling',  name: '万灵谷',   x: 420, y: 130, kind: 'wild'    },
      { id: 'youming',  name: '幽冥涧',   x: 660, y: 220, kind: 'danger'  },
      { id: 'tianji',   name: '天机城',   x: 850, y: 120, kind: 'city'    },
      { id: 'canglan',  name: '沧澜海',   x: 760, y: 420, kind: 'wild'    },
      { id: 'fenhuo',   name: '焚火山',   x: 500, y: 500, kind: 'danger'  },
      { id: 'luoxia',   name: '落霞镇',   x: 260, y: 440, kind: 'city'    },
      { id: 'xuankong', name: '悬空寺',   x: 560, y: 320, kind: 'sect'    }
    ],
    edges: [
      ['qingyun', 'wanling'], ['wanling', 'youming'], ['youming', 'tianji'],
      ['youming', 'canglan'], ['canglan', 'fenhuo'], ['fenhuo', 'luoxia'],
      ['luoxia', 'qingyun'], ['wanling', 'xuankong'], ['xuankong', 'youming'],
      ['xuankong', 'fenhuo'], ['xuankong', 'canglan']
    ]
  },

  // 战斗系统常量（buff 效果定义见 core/fx.js 效果层）
  combat: {
    critChance: 0.15,
    critMult: 1.5,
    guardReduce: 0.5,   // 防御减伤
    fleeChance: 0.55    // 基础逃跑成功率
  },

  // Token 花费估算价目（单位：元 / 1M tokens；可在设置中自定义覆盖）
  // cache = 缓存命中输入价（命中部分远低于普通输入价）；缺省时按 cacheRatio × input 折算
  tokenPricing: {
    cacheRatio: 0.25,
    // vendor 级默认价
    byVendor: {
      deepseek: { input: 2, output: 8, cache: 0.5 },
      moonshot: { input: 4, output: 16, cache: 1 },
      zhipu:    { input: 5, output: 15, cache: 1 },
      qwen:     { input: 2, output: 6, cache: 0.5 },
      doubao:   { input: 2.4, output: 12, cache: 0.6 },
      minimax:  { input: 3, output: 12, cache: 0.8 },
      custom:   { input: 2, output: 8, cache: 0.5 }
    },
    // model 级精确价（优先于 vendor 价）
    byModel: {
      'deepseek-chat': { input: 2, output: 8, cache: 0.5 },
      'deepseek-reasoner': { input: 4, output: 16, cache: 1 },
      'qwen-turbo': { input: 0.3, output: 0.6, cache: 0.08 },
      'qwen-plus': { input: 0.8, output: 2, cache: 0.2 },
      'qwen3-max': { input: 6, output: 24, cache: 1.5 },
      'qwen-long': { input: 0.5, output: 2, cache: 0.12 },
      'glm-4.5-air': { input: 0.8, output: 2, cache: 0.2 }
    },
    currency: '¥'
  },

  // 花费统计时间尺度：hour/day/week/month/year，支持缩放跨档
  usageScales: [
    { key: 'hour',  label: '时', bucketMs: 60 * 1000,          buckets: 60,  fmt: 'HH:mm' },
    { key: 'day',   label: '天', bucketMs: 60 * 60 * 1000,     buckets: 24,  fmt: 'HH:00' },
    { key: 'week',  label: '周', bucketMs: 24 * 60 * 60 * 1000, buckets: 7,  fmt: 'MM-dd' },
    { key: 'month', label: '月', bucketMs: 24 * 60 * 60 * 1000, buckets: 30, fmt: 'MM-dd' },
    { key: 'year',  label: '年', bucketMs: 30 * 24 * 60 * 60 * 1000, buckets: 12, fmt: 'yyyy-MM' }
  ],

  // 应用设置默认值（画质 / 声音）
  appSettings: {
    quality: 'high',      // low | medium | high（WebGL 渲染精度）
    volume: 0.6,          // 主音量 0~1
    muted: false,         // 静音
    priceInput: null,     // 自定义输入价（元/1M tokens，null 用内置价目）
    priceOutput: null,
    priceCache: null      // 自定义缓存命中价（元/1M tokens，null 用内置价目/折算）
  },

  qualityLevels: [
    { key: 'low',    label: '流畅', dpr: 0.75, desc: '低分辨率灵雾，省电流畅' },
    { key: 'medium', label: '均衡', dpr: 1.1,  desc: '适中的渲染精度' },
    { key: 'high',   label: '极致', dpr: 1.6,  desc: '满精度灵雾与星尘' }
  ],

  // 国内 AI 厂商预设（均为 OpenAI 兼容接口）；模型列表可在线拉取以保证时效性
  vendors: [
    {
      key: 'deepseek', name: 'DeepSeek 深度求索',
      baseUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-chat', 'deepseek-reasoner'],
      hint: 'platform.deepseek.com 申请'
    },
    {
      key: 'moonshot', name: '月之暗面 Kimi',
      baseUrl: 'https://api.moonshot.cn/v1',
      models: ['kimi-k2-0905-preview', 'kimi-k2-turbo-preview', 'kimi-latest'],
      hint: 'platform.moonshot.cn 申请'
    },
    {
      key: 'zhipu', name: '智谱 GLM',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      models: ['glm-4.6', 'glm-4.5', 'glm-4.5-air'],
      hint: 'open.bigmodel.cn 申请'
    },
    {
      key: 'qwen', name: '阿里通义千问',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: ['qwen3-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
      hint: 'bailian.console.aliyun.com 开通'
    },
    {
      key: 'doubao', name: '字节豆包',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      models: ['doubao-seed-1.6-250615', 'doubao-seed-1.6-flash-250715'],
      hint: '火山引擎方舟控制台创建推理接入点'
    },
    {
      key: 'minimax', name: 'MiniMax',
      baseUrl: 'https://api.minimaxi.com/v1',
      models: ['MiniMax-M2', 'MiniMax-M1'],
      hint: 'platform.minimaxi.com 申请'
    },
    {
      key: 'custom', name: '自定义（OpenAI 兼容）',
      baseUrl: '',
      models: [],
      hint: '填入任何兼容 /chat/completions 的接口地址'
    }
  ],

  ai: {
    vendor: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: '',
    temperature: 0.9,
    // 叙事引擎系统提示词：要求模型返回结构化 JSON
    systemPrompt: `你是一款东方修仙文字游戏的"天道叙事引擎"。根据玩家状态与其行动，推进剧情。
【数据读取协议】首次会提供角色概要；若你需要更详尽的游戏数据再作推演，不要编造——先只输出一个 JSON 请求对象：
{ "needData": ["域名1","域名2"] }
系统将回传对应数据文件的内容，你再据此输出正式事件。可多次请求。可用数据域：
{{DOMAIN_CATALOG}}
数据充足后，输出正式事件 JSON。
【输出契约】只输出一个 JSON 对象，不要任何额外文字或代码块标记：
{
  "event": "120~220字的当前事件描写，文风典雅有仙气，可含对话",
  "options": ["选项一","选项二","选项三","选项四"],
  "effects": { "hp":0, "mp":0, "atk":0, "pdef":0, "mdef":0, "cultivation":0 },
  "location": "地点id，必须来自给定地点列表，若未移动则保持原值",
  "log": "一句话概括此次行动结果（写入史册）",
  "grantSkill": null 或 { "type":"active|passive|talent", "name":"..." },
  "registerSkill": null 或 存档专属技能完整定义（见规则7，慎用）,
  "grantItem": null 或 { "name":"...", "desc":"外观/来历一句话", "effect":"效果说明一句话", "rarity":"pingfan|youxiu|jingliang|shishi|chuanshuo|honghuang|chuyuan", "category":"dan|fabao|gongfa|cailiao|qiwu", "usable":true, "effects":{"hp":0,"cultivation":0}, "grant":null 或 {"skill":{"type":"active|passive","name":"技能库技能名"}} 或 {"talent":{"name":"...","desc":"...","mods":{...}}} 或 {"buff":{"name":"...","desc":"...","mods":{"atk":0,"cultivationPct":0.1}}} },
  "relations": null 或 [ { "name":"出场角色姓名", "identity":"其身份", "relation":"与主角的关系", "affinity":初始好感-100~100, "delta":好感变化(已登记者用) } ],
  "combat": null 或 { "enemy": { "name":"...", "desc":"...", "hp":80, "atk":10, "pdef":4, "mdef":3, "skills":[{"name":"...","desc":"...","mult":1.4}] }, "playerFirst": true }
}
【规则】
1. options 给出 4 个风格迥异的预选项（莽撞/谨慎/机巧/随缘）。
2. effects 只写发生变化的属性，可为负；修为足够时剧情可暗示突破，境界提升由系统判定。
3. 剧情需连贯参考史册；玩家生命归零由系统处理陨落或重生。
4. 当剧情自然走到遭遇敌人（妖兽、魔修、拦路劫修等）时，填 combat 字段触发战斗：enemy 属性需与玩家境界匹配（炼气期敌人 hp 60~120、atk 8~16 为宜，随境界等比提升），playerFirst 依据剧情合理性决定先手权。战斗中敌方行动由你代理（系统会再向你询问）。敌方 skills 除 mult 伤害倍率外，还可选填结构化字段：healMult 治疗倍率、shieldLayers 次数盾层数、barrierMult 屏障倍率、buffs 状态（如 {"target":"enemy","name":"灼烧","turns":2,"effects":[{"key":"burn","mult":0.3}]}；可用效果 key：poison(pct)/burn(mult)/regen(pct)/mpRegen(value)/stun/counter(pct)/dodge(pct)/summon(mult)/statUp|statDown(stat,pct)）。
5. grantItem 在玩家获得物品时填写，rarity 越高的物品效果越强、越稀有，红色 honghuang 与白色 chuyuan 极为罕见，慎用（chuyuan 为最高品阶）。
6. 授予主动/被动技能（grantSkill 的 active|passive，及 grantItem.grant.skill）必须从系统技能库中按名称选取——先通过 needData 请求 "library" 域查阅技能库目录，再填 { "type":"active|passive", "name":"库中技能名" }，只需名称，耗蓝/倍率/效果由系统按库定义结算。玩家只能习得与其灵根相符的属性技能（无属性技能皆可学）。
7. registerSkill 仅当剧情确实需要库中不存在的技能时（如独门传承、上古秘术）才使用，会创建独属当前存档的技能：主动须给出 { "type":"active", "name":"...", "desc":"...", "cost":0, "mult":0~3.5, "healMult":0~3, "shieldLayers":1~3, "barrierMult":0~2.5, "buffs":[...] }（按需选填，数值必须明确）；被动须给出 { "type":"passive", "name":"...", "desc":"...", "mods":{...} }。此技能仅当前存档及其后续存档生效，切勿滥用。
8. 天赋（grantSkill type="talent" 或 grantItem.grant.talent）由你自由拟定，但必须在 mods 中给出明确数值，desc 文案与数值一致。mods 可用键：atk/pdef/mdef/maxHp/maxMp 固定值；atkPct/pdefPct/mdefPct 比例（0.05=+5%）；crit 会心率、dodge 闪避率、counterPct 反伤比例；hpRegen/mpRegen 战斗每回合回复；cultivationPct 修为获取加成比例。
9. relations 用于人物关系系统：剧情中有名字的角色登场时必须登记（name/identity/relation/affinity 初始好感，萍水相逢为 0 上下）；已登记角色好感变化时用 name+delta。好感度区间 -100(死敌)~100(至交)。`
  },

  // 敌方战斗决策提示词
  combatPrompt: `你是修仙战斗中敌方的操控者。根据系统给出的战斗状态，为敌方选择本回合行动。
【输出契约】只输出 JSON：
{ "action": "attack" | "skill" | "guard" | "rest", "skill": "技能名(action为skill时必填)", "narration": "一句战斗描写(30字内)" }
【策略】血量低时可 guard 防守蓄势；法力不足时可 rest 静息恢复（恢复50%法力）；技能伤害高但不可连续使用同一招超过两次；偶尔普攻即可。`,

  // 地图模式 NPC 打招呼提示词（首句由 AI 生成，须兼顾 NPC 信息与玩家角色信息，特别是功能）
  npcGreetPrompt: `你是修仙世界中的一名 NPC。系统会给你 NPC 信息（姓名/身份/性别/性格/喜好/功能）与玩家角色信息。
请生成你见到玩家时的第一句招呼。
【要求】严格符合 NPC 的身份、性格与喜好；若 NPC 有功能（如炼丹/交易/切磋/传功），须自然提及所能提供的服务；可照顾玩家的境界、宗门、性别、出身等信息；30~60字；只输出招呼文本本身，不要 JSON、不要引号、不要旁白。`,

  // 地图模式 NPC 自由对话提示词
  npcChatPrompt: `你是修仙世界中的一名 NPC，正在与玩家交谈。系统会给你 NPC 信息（姓名/身份/性别/性格/喜好/功能）、玩家角色信息与近日对话记录。
请以第一人称回应玩家的话。
【要求】1~3句话，严格符合人设（身份/性格/喜好）；不提供实质性奖励——不赠送物品、不传授功法、不泄露机密、不承诺好处；只输出对话文本本身，不要 JSON、不要引号、不要旁白。`,

  // 角色创建生成提示词（天赋候选；主动/被动技能一律取自系统技能库，不再由 AI 生成）
  creationPrompt: `你是修仙游戏的角色创建生成器。根据请求生成候选天赋，只输出 JSON 数组，不要任何额外文字。
【输入】{ "类型": "talent", "灵根": ["金","木",...], "数量": 8 }
【输出】[{"name":"2~4字雅名","desc":"一句话天赋效果，须写明数值","mods":{...}}, ...]
【mods 可用键】atk/pdef/mdef/maxHp/maxMp 固定值加成；atkPct/pdefPct/mdefPct 比例加成（0.05=+5%）；crit 会心率、dodge 闪避率、counterPct 反伤比例；hpRegen/mpRegen 战斗每回合回复；cultivationPct 修为获取加成比例。
【规则】名称雅致有仙气、互不重复；凡能明确数值的效果必须在 mods 中给出明确数值，且 desc 文案与 mods 数值一致；数量不足时可少给，但不少于 5 个。`,

  // 角色创建本地兜底候选池（未配置 AI 时使用；技能候选由系统技能库提供，见 skills.js）
  creation: {
    talents: [
      { name: '天生剑骨', desc: '剑心天成，攻击 +5%', mods: { atkPct: 0.05 } },
      { name: '道心通明', desc: '悟性过人，修为获取 +10%', mods: { cultivationPct: 0.1 } },
      { name: '百毒不侵', desc: '百毒难伤，法防 +3', mods: { mdef: 3 } },
      { name: '夜观星象', desc: '偶能窥得天机，机缘事件更易出现' },
      { name: '饕餮之胃', desc: '丹药效果额外提升两成' },
      { name: '草木亲和', desc: '草木有灵，战斗每回合回血 2', mods: { hpRegen: 2 } },
      { name: '福缘深厚', desc: '奇遇频发，战利品更为丰厚' },
      { name: '过目不忘', desc: '参悟典籍事半功倍，修为获取 +5%', mods: { cultivationPct: 0.05 } },
      { name: '铁血战意', desc: '愈战愈勇，攻击 +3', mods: { atk: 3 } },
      { name: '灵气漩涡', desc: '法力生生不息，战斗每回合回蓝 2', mods: { mpRegen: 2 } },
      { name: '钢筋铁骨', desc: '筋骨强健，生命上限 +15', mods: { maxHp: 15 } },
      { name: '身轻如燕', desc: '身法飘然，常驻闪避 +4%', mods: { dodge: 0.04 } }
    ]
  },

  // 未配置 API 时的本地叙事兜底
  fallback: {
    combatChance: 0.22,
    enemies: [
      { name: '赤瞳狼妖', desc: '双目赤红的低阶妖兽，獠牙滴着涎水。', hp: 70, atk: 10, pdef: 3, mdef: 2, skills: [{ name: '裂爪', desc: '撕裂之击', mult: 1.4 }] },
      { name: '黑风劫修', desc: '蒙面劫修，专修阴损的黑风掌。', hp: 90, atk: 12, pdef: 5, mdef: 4, skills: [{ name: '黑风掌', desc: '阴风蚀骨', mult: 1.5 }] },
      { name: '腐骨毒藤', desc: '成精的毒藤，触须所至草木枯朽。', hp: 110, atk: 9, pdef: 6, mdef: 6, skills: [{ name: '毒刺缠绕', desc: '毒刺攒射', mult: 1.3 }] }
    ],
    loot: [
      { name: '凝露草', desc: '叶片上凝着不散的灵露。', effect: '恢复 25 点法力', rarity: 'pingfan', category: 'dan', usable: true, effects: { mp: 25 } },
      { name: '精铁剑丸', desc: '剑修留下的剑丸，入手沉重。', effect: '参悟后攻击 +2', rarity: 'youxiu', category: 'fabao', usable: true, effects: { atk: 2 } },
      { name: '妖兽内丹', desc: '妖兽毕生精华所在，温热如玉。', effect: '服后修为 +35', rarity: 'jingliang', category: 'cailiao', usable: true, effects: { cultivation: 35 } },
      { name: '龟息玉简', desc: '刻有古篆的玉简，隐有呼吸起伏之感。', effect: '研习后领悟被动技能【龟息术】', rarity: 'jingliang', category: 'gongfa', usable: true, effects: {}, grant: { skill: { type: 'passive', name: '龟息术', desc: '气息绵长，行动后小幅回复生命' } } },
      { name: '锐气符', desc: '符上朱砂未干，触之有金铁之鸣。', effect: '激发后获得常驻增益【锐气】（攻击 +3）', rarity: 'youxiu', category: 'fabao', usable: true, effects: {}, grant: { buff: { name: '锐气', desc: '符箓之力附着兵刃，攻击 +3', mods: { atk: 3 } } } },
      { name: '悟道茶', desc: '一盏清茶，饮之如闻大道纶音。', effect: '饮后顿悟天赋【道心通明】', rarity: 'shishi', category: 'dan', usable: true, effects: {}, grant: { talent: { name: '道心通明', desc: '悟性过人，修为获取 +10%', mods: { cultivationPct: 0.1 } } } },
      { name: '星陨铁', desc: '天外陨星之铁，夜观有微光。', effect: '炼器良材，售予坊市可得灵石', rarity: 'shishi', category: 'cailiao', usable: false, effects: {} }
    ],
    events: [
      { event: '山雾缭绕，你行至一处断崖，崖下隐有灵光吞吐。一株不知名的灵草生于石缝之间，叶脉间流转着淡金色的纹路。', options: ['攀崖采药', '驻足观察', '绕行而过', '就地打坐'], effects: { cultivation: 12 }, location: null, log: '于断崖见灵草，机缘未明' },
      { event: '夜半，客栈外传来兵刃相击之声。你推窗望去，两名修士正在巷中斗法，符光与剑气交错，殃及四邻。', options: ['出手制止', '隔岸观火', '趁机搜刮', '悄然离去'], effects: { hp: -8, cultivation: 8 }, location: null, log: '夜观斗法，略有所悟' },
      { event: '一白发老者在古松下弈棋，见你路过，抬手邀你对弈一局。棋盘上黑白子隐隐构成一座大阵。', options: ['欣然对弈', '以力破局', '讨教棋道', '婉拒离开'], effects: { mp: -5, cultivation: 15 }, location: null, log: '松下对弈，窥见阵法之妙' },
      { event: '你误入一片古战场遗迹，残剑断戟插满荒原。风过时，金铁之声如泣如诉，一缕残魂自剑中升起。', options: ['拔剑问灵', '焚符超度', '吸收残魂', '速离此地'], effects: { hp: -12, atk: 2, cultivation: 18 }, location: null, log: '古战场遇剑灵，杀气入体' },
      { event: '溪边有一垂钓叟，鱼篓空空却神态自若。他见你来了，笑道：「小友，可知这钓的不是鱼，是这满山秋色？」', options: ['请教玄机', '与之同钓', '夺篓验货', '一揖而去'], effects: { cultivation: 10, mdef: 1 }, location: null, log: '溪边闻道，心有所感' }
    ]
  }
};
