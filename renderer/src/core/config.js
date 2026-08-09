// 全局配置：所有数值、文案、地图节点、厂商预设皆在此声明，组件只读取不硬编码
export const CONFIG = {
  gameTitle: '太玄问道',
  gameSubtitle: '一缕神魂入太玄 · 万般因果问长生',

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
    realmIndex: 0,
    hp: 100, maxHp: 100,
    mp: 60,  maxMp: 60,
    atk: 12, pdef: 6, mdef: 5,
    cultivation: 0, cultivationCap: 100,
    roots: [], // 灵根 ['jin','mu',...]
    buffs: [], // 常驻增益 [{id,name,desc,mods,day}]
    activeSkills: [{ name: '御火诀', desc: '焚尽八荒之火，耗法力 12', cost: 12, mult: 1.8 }],
    passiveSkills: [{ name: '吐纳术', desc: '每回合微量恢复生命与法力' }],
    talents: [{ name: '天生剑骨', desc: '剑类攻击额外 +15%' }],
    items: [
      { id: 'seed-1', name: '粗制回气丹', desc: '山脚下药铺最常见的丹药，带着淡淡的苦味。', effect: '恢复 30 点生命', rarity: 'pingfan', category: 'dan', day: 1, usable: true, effects: { hp: 30 } },
      { id: 'seed-2', name: '残破玉简', desc: '穿越时怀中所藏，表面裂纹中隐有光纹流转。', effect: '参悟后修为 +20', rarity: 'jingliang', category: 'gongfa', day: 1, usable: true, effects: { cultivation: 20 } }
    ],
    location: 'qingyun',
    day: 1
  },

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

  // 战斗系统常量
  combat: {
    critChance: 0.15,
    critMult: 1.5,
    guardReduce: 0.5,   // 防御减伤
    fleeChance: 0.55,   // 基础逃跑成功率
    buffKinds: {
      atkUp:  { label: '攻击提升', color: '#e8a34f' },
      defUp:  { label: '防御提升', color: '#5aa9e6' },
      poison: { label: '中毒',     color: '#6fcF7f' },
      regen:  { label: '回复',     color: '#7fb3a8' },
      stun:   { label: '眩晕',     color: '#b07fe8' },
      guard:  { label: '格挡',     color: '#9a937f' }
    }
  },

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
【输出契约】只输出一个 JSON 对象，不要任何额外文字或代码块标记：
{
  "event": "120~220字的当前事件描写，文风典雅有仙气，可含对话",
  "options": ["选项一","选项二","选项三","选项四"],
  "effects": { "hp":0, "mp":0, "atk":0, "pdef":0, "mdef":0, "cultivation":0 },
  "location": "地点id，必须来自给定地点列表，若未移动则保持原值",
  "log": "一句话概括此次行动结果（写入史册）",
  "grantSkill": null 或 { "type":"active|passive|talent", "name":"...", "desc":"...", "cost":0, "mult":1.5 },
  "grantItem": null 或 { "name":"...", "desc":"外观/来历一句话", "effect":"效果说明一句话", "rarity":"pingfan|youxiu|jingliang|shishi|chuanshuo|honghuang|chuyuan", "category":"dan|fabao|gongfa|cailiao|qiwu", "usable":true, "effects":{"hp":0,"cultivation":0}, "grant":null 或 {"skill":{"type":"active|passive","name":"...","desc":"...","cost":0,"mult":1.5}} 或 {"talent":{"name":"...","desc":"..."}} 或 {"buff":{"name":"...","desc":"...","mods":{"atk":0,"pdef":0,"mdef":0,"cultivationPct":0.1}}} },
  "combat": null 或 { "enemy": { "name":"...", "desc":"...", "hp":80, "atk":10, "pdef":4, "mdef":3, "skills":[{"name":"...","desc":"...","mult":1.4}] }, "playerFirst": true }
}
【规则】
1. options 给出 4 个风格迥异的预选项（莽撞/谨慎/机巧/随缘）。
2. effects 只写发生变化的属性，可为负；修为足够时剧情可暗示突破，境界提升由系统判定。
3. 剧情需连贯参考史册；玩家生命归零由系统处理陨落或重生。
4. 当剧情自然走到遭遇敌人（妖兽、魔修、拦路劫修等）时，填 combat 字段触发战斗：enemy 属性需与玩家境界匹配（炼气期敌人 hp 60~120、atk 8~16 为宜，随境界等比提升），playerFirst 依据剧情合理性决定先手权。战斗中敌方行动由你代理（系统会再向你询问）。
5. grantItem 在玩家获得物品时填写，rarity 越高的物品效果越强、越稀有，红色 honghuang 与白色 chuyuan 极为罕见，慎用（chuyuan 为最高品阶）。
6. grantSkill 中主动技能(active)需给出 cost(法力消耗)与 mult(伤害倍率 1.2~2.5)。
7. 物品若可习得心法/天赋或获得常驻增益，用 grantItem.grant 表达：skill 为主动或被动技能、talent 为天赋、buff 为常驻增益（mods 只写非零项：atk/pdef/mdef 为属性加值，cultivationPct 为修为获取加成比例如 0.1）。`
  },

  // 敌方战斗决策提示词
  combatPrompt: `你是修仙战斗中敌方的操控者。根据系统给出的战斗状态，为敌方选择本回合行动。
【输出契约】只输出 JSON：
{ "action": "attack" | "skill" | "guard", "skill": "技能名(action为skill时必填)", "narration": "一句战斗描写(30字内)" }
【策略】血量低时可 guard 防守蓄势；技能伤害高但不可连续使用同一招超过两次；偶尔普攻即可。`,

  // 角色创建生成提示词（天赋/被动/主动技能候选）
  creationPrompt: `你是修仙游戏的角色创建生成器。根据请求生成候选条目，只输出 JSON 数组，不要任何额外文字。
【输入】{ "类型": "talent|passive|active", "灵根": ["金","木",...], "数量": 8 }
【输出】
- talent（天赋）: [{"name":"2~4字雅名","desc":"一句话天赋效果（如根骨、悟法、机缘等方向）"}, ...]
- passive（被动技能）: [{"name":"2~5字","desc":"一句话常驻效果"}, ...]
- active（主动技能，必须与给定灵根属性相关，每个标注 root）: [{"name":"...","desc":"一句话招式描写","cost":8~20,"mult":1.2~2.2,"root":"金|木|水|火|土"}, ...]
【规则】名称雅致有仙气、互不重复；数量不足时可少给，但不少于 5 个。`,

  // 角色创建本地兜底候选池（未配置 AI 时使用）
  creation: {
    talents: [
      { name: '天生剑骨', desc: '剑类攻击额外 +15%' },
      { name: '道心通明', desc: '悟性过人，修为获取 +10%', mods: { cultivationPct: 0.1 } },
      { name: '百毒不侵', desc: '百毒难伤，异常状态抗性提升' },
      { name: '夜观星象', desc: '偶能窥得天机，机缘事件更易出现' },
      { name: '饕餮之胃', desc: '丹药效果额外提升两成' },
      { name: '草木亲和', desc: '行走山野更易寻得灵草' },
      { name: '福缘深厚', desc: '奇遇频发，战利品更为丰厚' },
      { name: '过目不忘', desc: '参悟典籍事半功倍' },
      { name: '铁血战意', desc: '战斗中愈战愈勇' },
      { name: '灵气漩涡', desc: '法力恢复速度远超同侪' }
    ],
    passives: [
      { name: '吐纳术', desc: '每回合微量恢复生命与法力' },
      { name: '龟息术', desc: '气息绵长，行动后小幅回复生命' },
      { name: '铁布衫', desc: '皮肉坚韧，物理防御 +2', mods: { pdef: 2 } },
      { name: '清心诀', desc: '心境澄明，法术防御 +2', mods: { mdef: 2 } },
      { name: '轻身术', desc: '身形如风，更容易脱身' },
      { name: '凝神气', desc: '神气内守，攻击 +2', mods: { atk: 2 } },
      { name: '回春功', desc: '气血悠长，生命上限提升' },
      { name: '听涛诀', desc: '感知敏锐，先手概率提升' }
    ],
    actives: {
      jin: [
        { name: '金刃斩', desc: '凝金气为刃，无坚不摧', cost: 10, mult: 1.6, root: 'jin' },
        { name: '破甲剑气', desc: '剑气凌冽，专破护体罡气', cost: 14, mult: 2.0, root: 'jin' },
        { name: '金钟镇魂', desc: '金声浩荡，震慑敌胆', cost: 12, mult: 1.5, root: 'jin' }
      ],
      mu: [
        { name: '青藤缚', desc: '青藤破土而出，缠敌伤敌', cost: 10, mult: 1.5, root: 'mu' },
        { name: '枯木逢春', desc: '木灵生生不息，伤中带愈', cost: 14, mult: 1.8, root: 'mu' },
        { name: '万叶飞刀', desc: '落叶皆成利刃', cost: 12, mult: 1.7, root: 'mu' }
      ],
      shui: [
        { name: '寒冰刺', desc: '寒水凝刺，透骨三分', cost: 10, mult: 1.6, root: 'shui' },
        { name: '怒涛卷', desc: '狂澜骤起，席卷敌身', cost: 14, mult: 2.0, root: 'shui' },
        { name: '镜水诀', desc: '水镜映影，扰敌心神', cost: 12, mult: 1.5, root: 'shui' }
      ],
      huo: [
        { name: '御火诀', desc: '焚尽八荒之火', cost: 12, mult: 1.8, root: 'huo' },
        { name: '烈阳焚空', desc: '烈阳当空，烈焰焚敌', cost: 15, mult: 2.1, root: 'huo' },
        { name: '星火燎原', desc: '星火一点，燎原千里', cost: 10, mult: 1.6, root: 'huo' }
      ],
      tu: [
        { name: '落岩击', desc: '巨石自天而落', cost: 10, mult: 1.6, root: 'tu' },
        { name: '地龙翻身', desc: '大地震颤，地龙突袭', cost: 14, mult: 2.0, root: 'tu' },
        { name: '尘沙障', desc: '飞沙走石，伤敌蔽目', cost: 12, mult: 1.5, root: 'tu' }
      ]
    }
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
