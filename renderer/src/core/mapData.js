// ============================================================
// 地图模式数据层：大世界 → 宗门/区域 → 场景 三级结构
// 所有数据在此注册，组件只读取不硬编码
//
// 层级：
//   world   大世界地图节点（区域/宗门入口）
//   region  二级地图（点击大世界节点进入）
//   scene   场景（三级，可含NPC、功能交互）
//
// NPC 字段：name/identity/gender/relation/affinity/function/personality/likes
// 宗门字段：name/style(修炼倾向)/scenes(场景列表)/facilities(功能设施)
// ============================================================

/* ==================== 灵根/风格标签 ==================== */
export const SECT_STYLES = {
  jin:   { label: '金系', color: '#d8b25c', focus: '剑修/体修，重杀伐与防御' },
  mu:    { label: '木系', color: '#6fcf7f', focus: '丹修/医修，重生机与控制' },
  shui:  { label: '水系', color: '#5aa9e6', focus: '法修/幻修，重变化与增益' },
  huo:   { label: '火系', color: '#e35d6a', focus: '火修/炼器，重爆发与毁灭' },
  tu:    { label: '土系', color: '#c08a5a', focus: '阵修/御兽，重防御与召唤' },
  yin:   { label: '阴系', color: '#b07fe8', focus: '魂修/鬼修，重精神与诅咒' },
  yang:  { label: '阳系', color: '#f4d98c', focus: '雷修/剑修，重速度与正义' },
  hunyuan: { label: '混元', color: '#7fb3a8', focus: '五行兼修，博采众长' }
};

/* ==================== 宗门设施（通用功能场景） ==================== */
export const FACILITY_TYPES = {
  biguan:   { label: '闭关室', icon: 'yinyang', desc: '闭关修炼，消耗时间提升修为', canCultivate: true },
  cangshu:  { label: '藏书阁', icon: 'scroll', desc: '研读功法典籍，可领悟技能', canLearn: true },
  liandan:  { label: '炼丹房', icon: 'drop', desc: '炼制丹药，需消耗草药', canAlchemy: true },
  liangong: { label: '练功房', icon: 'sword', desc: '切磋演练，提升战斗技巧', canTrain: true },
  leitai:   { label: '擂台', icon: 'spark', desc: '与同门或来客切磋比试', canDuel: true },
  fangshi:  { label: '坊市', icon: 'talisman', desc: '交易买卖，兑换货币', canTrade: true },
  danfang:  { label: '丹房', icon: 'drop', desc: '购买丹药与草药', canBuyPill: true },
  qiju:     { label: '起居', icon: 'heart', desc: '休息恢复，与道侣相处', canRest: true },
  menpai:   { label: '宗门大殿', icon: 'yinyang', desc: '宗门事务，接取任务', canQuest: true }
};

/* ==================== NPC 数据 ==================== */
// 功能型NPC：function 对应 FACILITY_TYPES 的 key
// 非功能NPC：function 为 null，仅提供对话

export const NPCS = {
  /* ---------- 青云门（混元·正道领袖） ---------- */
  qy_zhangmen: {
    id: 'qy_zhangmen', name: '清虚子', identity: '青云门掌门', gender: 'male',
    relation: '宗门领袖', affinity: 50, function: 'menpai',
    personality: '威严持重，心怀天下', likes: '有潜力的后辈、宗门荣誉',
    sect: 'qingyun'
  },
  qy_danshi: {
    id: 'qy_danshi', name: '白芷', identity: '炼丹长老', gender: 'female',
    relation: '丹道前辈', affinity: 30, function: 'liandan',
    personality: '温柔细致，醉心丹道', likes: '珍稀草药、丹方古籍',
    sect: 'qingyun'
  },
  qy_shiku: {
    id: 'qy_shiku', name: '石敢当', identity: '传功长老', gender: 'male',
    relation: '传功恩师', affinity: 40, function: 'liangong',
    personality: '豪爽直率，好为人师', likes: '勤奋弟子、切磋比试',
    sect: 'qingyun'
  },
  qy_jishi: {
    id: 'qy_jishi', name: '小桃', identity: '膳房杂役', gender: 'female',
    relation: '杂役', affinity: 10, function: null,
    personality: '活泼好动，消息灵通', likes: '美食、八卦',
    sect: 'qingyun'
  },

  /* ---------- 焚天谷（火系·炼器） ---------- */
  ft_zhangmen: {
    id: 'ft_zhangmen', name: '炎无极', identity: '焚天谷主', gender: 'male',
    relation: '宗门领袖', affinity: 30, function: 'menpai',
    personality: '暴躁易怒，崇尚力量', likes: '强者、极品炼器材料',
    sect: 'fentian'
  },
  ft_qishi: {
    id: 'ft_qishi', name: '欧冶子', identity: '炼器大师', gender: 'male',
    relation: '器道宗师', affinity: 40, function: 'liangong',
    personality: '沉默寡言，专注铸剑', likes: '稀有矿石、好剑',
    sect: 'fentian'
  },
  ft_huoling: {
    id: 'ft_huoling', name: '火灵儿', identity: '内门弟子', gender: 'female',
    relation: '同门', affinity: 20, function: 'leitai',
    personality: '火辣热情，争强好胜', likes: '比武、火焰法术',
    sect: 'fentian'
  },

  /* ---------- 玄冰宫（水系·法修） ---------- */
  xb_gongzhu: {
    id: 'xb_gongzhu', name: '寒月仙子', identity: '玄冰宫主', gender: 'female',
    relation: '宗门领袖', affinity: 25, function: 'menpai',
    personality: '冷若冰霜，不苟言笑', likes: '冰系功法、清净之地',
    sect: 'xuanbing'
  },
  xb_shuijing: {
    id: 'xb_shuijing', name: '水镜先生', identity: '传功长老', gender: 'male',
    relation: '阵法大师', affinity: 35, function: 'cangshu',
    personality: '博学多才，喜欢考校后辈', likes: '阵法典籍、聪慧弟子',
    sect: 'xuanbing'
  },

  /* ---------- 万兽山（土系·御兽） ---------- */
  ws_shanzhu: {
    id: 'ws_shanzhu', name: '兽皇', identity: '万兽山主', gender: 'male',
    relation: '宗门领袖', affinity: 35, function: 'menpai',
    personality: '粗犷豪迈，与兽为友', likes: '强大妖兽、美酒',
    sect: 'wanshou'
  },
  ws_yushou: {
    id: 'ws_yushou', name: '灵珊', identity: '御兽长老', gender: 'female',
    relation: '御兽导师', affinity: 30, function: 'liangong',
    personality: '温柔善良，爱护灵兽', likes: '可爱灵兽、自然',
    sect: 'wanshou'
  },

  /* ---------- 幽冥教（阴系·魂修·邪道） ---------- */
  ym_jiaozhu: {
    id: 'ym_jiaozhu', name: '幽冥教主', identity: '幽冥教主', gender: 'male',
    relation: '魔道巨擘', affinity: 0, function: 'menpai',
    personality: '阴鸷狠辣，野心勃勃', likes: '生魂、力量',
    sect: 'youming'
  },
  ym_guiyi: {
    id: 'ym_guiyi', name: '鬼医', identity: '幽冥教长老', gender: 'male',
    relation: '邪修', affinity: 10, function: 'liandan',
    personality: '古怪孤僻，医术通神', likes: '尸体、罕见毒物',
    sect: 'youming'
  },

  /* ---------- 天剑宗（金系·剑修） ---------- */
  tj_jianzhu: {
    id: 'tj_jianzhu', name: '剑二十三', identity: '天剑宗主', gender: 'male',
    relation: '剑道魁首', affinity: 45, function: 'menpai',
    personality: '孤高绝世，剑心通明', likes: '剑道、挑战强者',
    sect: 'tianjian'
  },
  tj_jianchi: {
    id: 'tj_jianchi', name: '剑痴', identity: '执法长老', gender: 'male',
    relation: '执法者', affinity: 20, function: 'leitai',
    personality: '嗜剑如命，不近人情', likes: '名剑、剑法对决',
    sect: 'tianjian'
  },

  /* ---------- 妙木宗（木系·丹修） ---------- */
  mm_zongzhu: {
    id: 'mm_zongzhu', name: '青帝', identity: '妙木宗主', gender: 'male',
    relation: '丹道至尊', affinity: 40, function: 'menpai',
    personality: '慈祥和蔼，悲天悯人', likes: '救治病患、培育灵植',
    sect: 'miaomu'
  },
  mm_yaotong: {
    id: 'mm_yaotong', name: '茯苓', identity: '药童', gender: 'female',
    relation: '药童', affinity: 25, function: 'danfang',
    personality: '天真烂漫，辨识百草', likes: '草药、小动物',
    sect: 'miaomu'
  },

  /* ---------- 雷神殿（阳系·雷修） ---------- */
  ls_dianzhu: {
    id: 'ls_dianzhu', name: '雷震子', identity: '雷神殿主', gender: 'male',
    relation: '雷道至尊', affinity: 35, function: 'menpai',
    personality: '刚正不阿，嫉恶如仇', likes: '正义、雷法',
    sect: 'leishen'
  },
  ls_leiying: {
    id: 'ls_leiying', name: '雷影', identity: '首席弟子', gender: 'male',
    relation: '首席', affinity: 30, function: 'leitai',
    personality: '高傲自信，雷厉风行', likes: '速度、战斗',
    sect: 'leishen'
  },

  /* ---------- 散修聚集（无宗门） ---------- */
  ss_yaoren: {
    id: 'ss_yaoren', name: '药人', identity: '流浪药师', gender: 'male',
    relation: '游方医者', affinity: 15, function: 'danfang',
    personality: '神秘莫测，亦正亦邪', likes: '珍稀药材、交换',
    sect: null
  },
  ss_kuanggong: {
    id: 'ss_kuanggong', name: '狂刀', identity: '散修刀客', gender: 'male',
    relation: '散修', affinity: 20, function: 'leitai',
    personality: '狂放不羁，刀法狂野', likes: '美酒、强敌',
    sect: null
  },
  ss_baixiao: {
    id: 'ss_baixiao', name: '百晓生', identity: '情报贩子', gender: 'male',
    relation: '消息灵通人士', affinity: 10, function: 'fangshi',
    personality: '圆滑世故，见钱眼开', likes: '银元、秘密',
    sect: null
  }
};

/* ==================== 场景数据 ==================== */
// 每个场景可含：NPC列表、可交互功能、场景描述、场景类型

export const SCENES = {
  /* ---------- 青云门场景 ---------- */
  qy_dadian: {
    id: 'qy_dadian', name: '青云大殿', type: 'hall',
    desc: '青云门主殿，庄严肃穆，掌门清虚子在此处理宗门事务。',
    npcs: ['qy_zhangmen'],
    facilities: ['menpai'],
    bg: 'hall_gold'
  },
  qy_liandan: {
    id: 'qy_liandan', name: '炼丹房', type: 'workshop',
    desc: '药香四溢的丹房，白芷长老常年在此炼丹。',
    npcs: ['qy_danshi'],
    facilities: ['liandan', 'danfang'],
    bg: 'workshop_green'
  },
  qy_liangong: {
    id: 'qy_liangong', name: '演武场', type: 'training',
    desc: '宽阔的演武场，石敢当长老在此指导弟子修炼。',
    npcs: ['qy_shiku'],
    facilities: ['liangong', 'leitai'],
    bg: 'field_earth'
  },
  qy_houyuan: {
    id: 'qy_houyuan', name: '后山药园', type: 'garden',
    desc: '种植着各种灵药的后山，小桃常来此玩耍。',
    npcs: ['qy_jishi'],
    facilities: ['qiju'],
    bg: 'garden_green'
  },
  qy_biguan: {
    id: 'qy_biguan', name: '闭关室', type: 'cave',
    desc: '幽静的闭关石室，灵气浓郁，适合闭关突破。',
    npcs: [],
    facilities: ['biguan'],
    bg: 'cave_dark'
  },

  /* ---------- 焚天谷场景 ---------- */
  ft_ronglu: {
    id: 'ft_ronglu', name: '熔炉殿', type: 'workshop',
    desc: '烈焰熊熊的炼器之地，欧冶子在此铸造神兵。',
    npcs: ['ft_zhangmen', 'ft_qishi'],
    facilities: ['menpai', 'liangong'],
    bg: 'workshop_fire'
  },
  ft_huoyan: {
    id: 'ft_huoyan', name: '火焰窟', type: 'cave',
    desc: '地火涌动的洞窟，火灵儿常在此修炼火系法术。',
    npcs: ['ft_huoling'],
    facilities: ['biguan', 'leitai'],
    bg: 'cave_fire'
  },

  /* ---------- 玄冰宫场景 ---------- */
  xb_bingdian: {
    id: 'xb_bingdian', name: '冰晶大殿', type: 'hall',
    desc: '晶莹剔透的冰宫，寒月仙子高坐冰莲之上。',
    npcs: ['xb_gongzhu'],
    facilities: ['menpai'],
    bg: 'hall_ice'
  },
  xb_cangshu: {
    id: 'xb_cangshu', name: '藏经冰窟', type: 'library',
    desc: '收藏着无数水系功法的冰窟，水镜先生在此整理典籍。',
    npcs: ['xb_shuijing'],
    facilities: ['cangshu'],
    bg: 'cave_ice'
  },

  /* ---------- 万兽山场景 ---------- */
  ws_shouyuan: {
    id: 'ws_shouyuan', name: '万兽园', type: 'garden',
    desc: '各种灵兽栖息的山林，兽皇与灵珊在此照料灵兽。',
    npcs: ['ws_shanzhu', 'ws_yushou'],
    facilities: ['menpai', 'liangong'],
    bg: 'garden_beast'
  },

  /* ---------- 幽冥教场景 ---------- */
  ym_mingdian: {
    id: 'ym_mingdian', name: '幽冥大殿', type: 'hall',
    desc: '阴森恐怖的魔教总坛，幽冥教主在此修炼魔功。',
    npcs: ['ym_jiaozhu'],
    facilities: ['menpai'],
    bg: 'hall_dark'
  },
  ym_guihuo: {
    id: 'ym_guihuo', name: '鬼火窟', type: 'cave',
    desc: '鬼火幽幽的洞窟，鬼医在此研究毒术与医术。',
    npcs: ['ym_guiyi'],
    facilities: ['liandan', 'cangshu'],
    bg: 'cave_ghost'
  },

  /* ---------- 天剑宗场景 ---------- */
  tj_jianchi: {
    id: 'tj_jianchi', name: '剑池', type: 'training',
    desc: '插满古剑的剑池，剑二十三与剑痴在此论剑。',
    npcs: ['tj_jianzhu', 'tj_jianchi'],
    facilities: ['menpai', 'leitai', 'liangong'],
    bg: 'field_sword'
  },

  /* ---------- 妙木宗场景 ---------- */
  mm_yaowang: {
    id: 'mm_yaowang', name: '药王殿', type: 'hall',
    desc: '供奉药王的殿堂，青帝在此传授丹道。',
    npcs: ['mm_zongzhu', 'mm_yaotong'],
    facilities: ['menpai', 'liandan', 'danfang'],
    bg: 'hall_wood'
  },

  /* ---------- 雷神殿场景 ---------- */
  ls_leidian: {
    id: 'ls_leidian', name: '雷池', type: 'training',
    desc: '雷霆环绕的圣池，雷震子与雷影在此修炼雷法。',
    npcs: ['ls_dianzhu', 'ls_leiying'],
    facilities: ['menpai', 'biguan', 'leitai'],
    bg: 'field_thunder'
  },

  /* ---------- 野外/散修场景 ---------- */
  wild_fangshi: {
    id: 'wild_fangshi', name: '散修坊市', type: 'market',
    desc: '散修聚集的交易场所，三教九流汇聚于此。',
    npcs: ['ss_yaoren', 'ss_kuanggong', 'ss_baixiao'],
    facilities: ['fangshi', 'danfang', 'leitai'],
    bg: 'market_bustle'
  },
  wild_mishi: {
    id: 'wild_mishi', name: '迷雾森林', type: 'wild',
    desc: '常年被迷雾笼罩的森林，传说有上古传承。',
    npcs: [],
    facilities: [],
    bg: 'forest_mist'
  },
  wild_duanya: {
    id: 'wild_duanya', name: '断魂崖', type: 'wild',
    desc: '险峻的断崖，常有修士在此陨落，怨气冲天。',
    npcs: [],
    facilities: [],
    bg: 'cliff_danger'
  }
};

/* ==================== 宗门数据（8大宗门） ==================== */

export const SECTS = {
  qingyun: {
    id: 'qingyun', name: '青云门', style: 'hunyuan',
    desc: '太玄大陆正道领袖，五行兼修，底蕴深厚。',
    scenes: ['qy_dadian', 'qy_liandan', 'qy_liangong', 'qy_houyuan', 'qy_biguan'],
    requirements: { realm: 0, affinity: 0 }, // 加入条件
    benefits: { cultivationBonus: 0.1, alchemyBonus: 0.1 }
  },
  fentian: {
    id: 'fentian', name: '焚天谷', style: 'huo',
    desc: '火系炼器宗门，以地火铸器，战力强悍。',
    scenes: ['ft_ronglu', 'ft_huoyan'],
    requirements: { realm: 1, affinity: 20 },
    benefits: { atkBonus: 0.15, forgeBonus: 0.2 }
  },
  xuanbing: {
    id: 'xuanbing', name: '玄冰宫', style: 'shui',
    desc: '水系法修圣地，冰系功法独步天下。',
    scenes: ['xb_bingdian', 'xb_cangshu'],
    requirements: { realm: 1, affinity: 20, gender: 'female' }, // 只收女修
    benefits: { mdefBonus: 0.15, waterSkillBonus: 0.2 }
  },
  wanshou: {
    id: 'wanshou', name: '万兽山', style: 'tu',
    desc: '御兽宗门，可与灵兽签订契约共同战斗。',
    scenes: ['ws_shouyuan'],
    requirements: { realm: 1, affinity: 15 },
    benefits: { summonBonus: 0.2, beastAffinity: true }
  },
  youming: {
    id: 'youming', name: '幽冥教', style: 'yin',
    desc: '魔道巨擘，魂修鬼道，行事诡秘狠辣。',
    scenes: ['ym_mingdian', 'ym_guihuo'],
    requirements: { realm: 2, affinity: -20, evil: true }, // 邪修宗门
    benefits: { darkSkillBonus: 0.25, soulHarvest: true }
  },
  tianjian: {
    id: 'tianjian', name: '天剑宗', style: 'jin',
    desc: '剑修圣地，一剑破万法，攻伐无双。',
    scenes: ['tj_jianchi'],
    requirements: { realm: 2, affinity: 30, swordSkill: true },
    benefits: { swordSkillBonus: 0.25, critBonus: 0.1 }
  },
  miaomu: {
    id: 'miaomu', name: '妙木宗', style: 'mu',
    desc: '丹修圣地，医术通神，济世救人。',
    scenes: ['mm_yaowang'],
    requirements: { realm: 1, affinity: 25 },
    benefits: { alchemyBonus: 0.25, healBonus: 0.2 }
  },
  leishen: {
    id: 'leishen', name: '雷神殿', style: 'yang',
    desc: '雷修圣地，代天刑罚，诛邪灭魔。',
    scenes: ['ls_leidian'],
    requirements: { realm: 2, affinity: 25, righteous: true },
    benefits: { thunderSkillBonus: 0.25, speedBonus: 0.15 }
  }
};

/* ==================== 大世界地图（一级地图） ==================== */

export const WORLD_MAP = {
  minZoom: 0.25,
  maxZoom: 3,
  nodes: [
    // 宗门节点
    { id: 'qingyun',  name: '青云门',   x: 200, y: 150, kind: 'sect', sect: 'qingyun', region: 'central' },
    { id: 'fentian',  name: '焚天谷',   x: 800, y: 500, kind: 'sect', sect: 'fentian', region: 'south' },
    { id: 'xuanbing', name: '玄冰宫',   x: 150, y: 500, kind: 'sect', sect: 'xuanbing', region: 'north' },
    { id: 'wanshou',  name: '万兽山',   x: 600, y: 300, kind: 'sect', sect: 'wanshou', region: 'east' },
    { id: 'youming',  name: '幽冥教',   x: 850, y: 200, kind: 'danger', sect: 'youming', region: 'dark' },
    { id: 'tianjian', name: '天剑宗',   x: 400, y: 100, kind: 'sect', sect: 'tianjian', region: 'west' },
    { id: 'miaomu',   name: '妙木宗',   x: 300, y: 550, kind: 'sect', sect: 'miaomu', region: 'south' },
    { id: 'leishen',  name: '雷神殿',   x: 700, y: 80,  kind: 'sect', sect: 'leishen', region: 'sky' },
    // 野外节点
    { id: 'wild_fangshi', name: '散修坊市', x: 500, y: 400, kind: 'city', region: 'central' },
    { id: 'wild_mishi',   name: '迷雾森林', x: 100, y: 300, kind: 'wild', region: 'west' },
    { id: 'wild_duanya',  name: '断魂崖',   x: 900, y: 350, kind: 'danger', region: 'east' }
  ],
  edges: [
    ['qingyun', 'tianjian'], ['qingyun', 'wild_fangshi'], ['qingyun', 'miaomu'],
    ['tianjian', 'leishen'], ['leishen', 'youming'], ['youming', 'wild_duanya'],
    ['wild_duanya', 'fentian'], ['fentian', 'wild_fangshi'], ['wild_fangshi', 'wanshou'],
    ['wanshou', 'wild_mishi'], ['wild_mishi', 'xuanbing'], ['xuanbing', 'miaomu'],
    ['wanshou', 'youming']
  ]
};

/* ==================== 二级地图（宗门/区域内部） ==================== */

export const REGION_MAPS = {
  qingyun: {
    id: 'qingyun', name: '青云门', type: 'sect',
    desc: '正道领袖青云门，仙气缭绕，灵峰环绕。',
    scenes: ['qy_dadian', 'qy_liandan', 'qy_liangong', 'qy_houyuan', 'qy_biguan'],
    // 场景在大地图上的相对位置（用于二级地图展示）
    positions: {
      qy_dadian:  { x: 400, y: 200 },
      qy_liandan: { x: 200, y: 350 },
      qy_liangong:{ x: 600, y: 350 },
      qy_houyuan: { x: 300, y: 500 },
      qy_biguan:  { x: 500, y: 500 }
    }
  },
  fentian: {
    id: 'fentian', name: '焚天谷', type: 'sect',
    desc: '地火涌动的炼器圣地。',
    scenes: ['ft_ronglu', 'ft_huoyan'],
    positions: {
      ft_ronglu: { x: 300, y: 300 },
      ft_huoyan: { x: 500, y: 400 }
    }
  },
  xuanbing: {
    id: 'xuanbing', name: '玄冰宫', type: 'sect',
    desc: '冰天雪地中的水晶宫殿。',
    scenes: ['xb_bingdian', 'xb_cangshu'],
    positions: {
      xb_bingdian: { x: 400, y: 250 },
      xb_cangshu: { x: 300, y: 450 }
    }
  },
  wanshou: {
    id: 'wanshou', name: '万兽山', type: 'sect',
    desc: '灵兽汇聚的山林。',
    scenes: ['ws_shouyuan'],
    positions: {
      ws_shouyuan: { x: 400, y: 350 }
    }
  },
  youming: {
    id: 'youming', name: '幽冥教', type: 'sect',
    desc: '阴森恐怖的魔教总坛。',
    scenes: ['ym_mingdian', 'ym_guihuo'],
    positions: {
      ym_mingdian: { x: 400, y: 250 },
      ym_guihuo: { x: 300, y: 450 }
    }
  },
  tianjian: {
    id: 'tianjian', name: '天剑宗', type: 'sect',
    desc: '剑气冲霄的剑修圣地。',
    scenes: ['tj_jianchi'],
    positions: {
      tj_jianchi: { x: 400, y: 350 }
    }
  },
  miaomu: {
    id: 'miaomu', name: '妙木宗', type: 'sect',
    desc: '药香四溢的丹修圣地。',
    scenes: ['mm_yaowang'],
    positions: {
      mm_yaowang: { x: 400, y: 350 }
    }
  },
  leishen: {
    id: 'leishen', name: '雷神殿', type: 'sect',
    desc: '雷霆环绕的雷修圣地。',
    scenes: ['ls_leidian'],
    positions: {
      ls_leidian: { x: 400, y: 350 }
    }
  },
  wild_fangshi: {
    id: 'wild_fangshi', name: '散修坊市', type: 'city',
    desc: '散修聚集的自由交易之地。',
    scenes: ['wild_fangshi'],
    positions: {
      wild_fangshi: { x: 400, y: 350 }
    }
  },
  wild_mishi: {
    id: 'wild_mishi', name: '迷雾森林', type: 'wild',
    desc: '危机与机缘并存的迷雾森林。',
    scenes: ['wild_mishi'],
    positions: {
      wild_mishi: { x: 400, y: 350 }
    }
  },
  wild_duanya: {
    id: 'wild_duanya', name: '断魂崖', type: 'wild',
    desc: '险峻的断崖，常有修士陨落。',
    scenes: ['wild_duanya'],
    positions: {
      wild_duanya: { x: 400, y: 350 }
    }
  }
};

/* ==================== 查询工具函数 ==================== */

export function getSect(id) { return SECTS[id]; }
export function getScene(id) { return SCENES[id]; }
export function getNPC(id) { return NPCS[id]; }
export function getRegion(id) { return REGION_MAPS[id]; }

export function getScenesBySect(sectId) {
  const sect = SECTS[sectId];
  return sect ? sect.scenes.map(id => SCENES[id]).filter(Boolean) : [];
}

export function getNPCsByScene(sceneId) {
  const scene = SCENES[sceneId];
  return scene ? scene.npcs.map(id => NPCS[id]).filter(Boolean) : [];
}

export function getFacilitiesByScene(sceneId) {
  const scene = SCENES[sceneId];
  return scene ? scene.facilities.map(key => ({ key, ...FACILITY_TYPES[key] })) : [];
}

/** 获取宗门风格标签 */
export function getSectStyleLabel(styleKey) {
  return SECT_STYLES[styleKey] || SECT_STYLES.hunyuan;
}

/** 检查玩家是否满足加入宗门条件 */
export function canJoinSect(sectId, playerState) {
  const sect = SECTS[sectId];
  if (!sect) return { ok: false, reason: '宗门不存在' };
  const req = sect.requirements;
  if (playerState.realmIndex < req.realm) return { ok: false, reason: `需达到${['炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'][req.realm]}期` };
  if (req.affinity > 0 && (playerState.affinity?.[sectId] ?? 0) < req.affinity) return { ok: false, reason: `需好感度${req.affinity}以上` };
  if (req.gender && playerState.gender !== req.gender) return { ok: false, reason: '性别不符' };
  if (req.evil && !playerState.evil) return { ok: false, reason: '需为邪修' };
  if (req.righteous && playerState.evil) return { ok: false, reason: '邪修不可入' };
  return { ok: true };
}
