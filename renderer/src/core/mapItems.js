// ============================================================
// 地图模式物品系统（独立于对话模式）
// 分类：丹药/草药/法宝/功法/材料/奇物/货币
// V2.4：商铺拆分为 草药房 / 丹药房 / 法宝阁 / 功法楼 / 综合商店；
//       云游商人另售 5 种坊市无售的高品质珍品。
// ============================================================

import { HERBS, RECIPES } from './alchemy.js';

/* ---------- 物品分类（扩展对话模式） ---------- */
export const MAP_ITEM_CATEGORIES = [
  { key: 'dan',     label: '丹药', desc: '服之立见效用' },
  { key: 'herb',    label: '草药', desc: '炼丹材料' },
  { key: 'fabao',   label: '法宝', desc: '可随身携带的器物' },
  { key: 'gongfa',  label: '功法', desc: '蕴含传承的典籍玉简' },
  { key: 'cailiao', label: '材料', desc: '炼器炼丹所需之物' },
  { key: 'qiwu',    label: '奇物', desc: '难以归类的机缘之物' },
  { key: 'pill',    label: '突破丹', desc: '突破大境界必备' }
];

/* ---------- 物品数据库 ---------- */
export const MAP_ITEMS = {
  /* ----- 丹药（丹药房） ----- */
  huixue_dan: {
    name: '回血丹', category: 'dan', rarity: 'pingfan',
    desc: '基础回血丹药', effect: '恢复 50 点生命',
    usable: true, effects: { hp: 50 },
    price: { silver: 50 }
  },
  huilan_dan: {
    name: '回蓝丹', category: 'dan', rarity: 'pingfan',
    desc: '基础回蓝丹药', effect: '恢复 30 点法力',
    usable: true, effects: { mp: 30 },
    price: { silver: 40 }
  },
  ningshen_dan: {
    name: '凝神丹', category: 'dan', rarity: 'youxiu',
    desc: '凝心静神的丹药', effect: '恢复 60 点法力',
    usable: true, effects: { mp: 60 },
    price: { silver: 120 }
  },
  jinji_dan: {
    name: '金肌丹', category: 'dan', rarity: 'youxiu',
    desc: '强化肉身防御', effect: '生命上限+10，物防+2',
    usable: true, effects: { maxHp: 10, pdef: 2 },
    price: { silver: 200 }
  },
  juqi_dan: {
    name: '聚气丹', category: 'dan', rarity: 'youxiu',
    desc: '加速修为凝聚', effect: '修为+30',
    usable: true, effects: { cultivation: 30 },
    price: { silver: 150 }
  },
  peiyuan_dan: {
    name: '培元丹', category: 'dan', rarity: 'jingliang',
    desc: '培元固本的上品丹药', effect: '修为+60',
    usable: true, effects: { cultivation: 60 },
    price: { silver: 500 }
  },
  zengyuan_dan: {
    name: '增元丹', category: 'dan', rarity: 'jingliang',
    desc: '增强生命与法力上限', effect: '生命上限+25，法力上限+15',
    usable: true, effects: { maxHp: 25, maxMp: 15 },
    price: { silver: 800 }
  },
  longhu_dan: {
    name: '龙虎丹', category: 'dan', rarity: 'jingliang',
    desc: '龙虎交汇，大补元气', effect: '攻击+3，生命上限+15',
    usable: true, effects: { atk: 3, maxHp: 15 },
    price: { silver: 900 }
  },
  tishen_dan: {
    name: '提神丹', category: 'dan', rarity: 'shishi',
    desc: '服之精神抖擞，锋芒暗蕴', effect: '攻击+5，并获得增益【凝神会意】（会心率+5%）',
    usable: true, effects: { atk: 5 },
    grant: { buff: { name: '凝神会意', desc: '丹力淬炼神识，会心率 +5%', mods: { crit: 0.05 } } },
    price: { silver: 1200 }
  },

  /* ----- 突破丹药（丹药房） ----- */
  zhuji_dan: {
    name: '筑基丹', category: 'pill', rarity: 'jingliang',
    desc: '炼气期突破筑基期必备', effect: '突破成功率大幅提升',
    usable: false, breakthrough: 1, quality: 4,
    price: { spirit: 10 }
  },
  jindan_dan: {
    name: '金丹', category: 'pill', rarity: 'shishi',
    desc: '筑基期突破金丹期必备', effect: '突破成功率大幅提升',
    usable: false, breakthrough: 2, quality: 5,
    price: { spirit: 50 }
  },
  yuanying_dan: {
    name: '元婴丹', category: 'pill', rarity: 'chuanshuo',
    desc: '金丹期突破元婴期必备', effect: '突破成功率大幅提升',
    usable: false, breakthrough: 3, quality: 6,
    price: { spirit: 200 }
  },

  /* ----- 法宝（法宝阁） ----- */
  qingfeng_sword: {
    name: '青锋剑', category: 'fabao', rarity: 'youxiu',
    desc: '锋利的青钢剑', effect: '攻击+5',
    usable: true, effects: { atk: 5 },
    price: { silver: 300 }
  },
  xuanwu_shield: {
    name: '玄武盾', category: 'fabao', rarity: 'jingliang',
    desc: '玄武甲壳所制盾牌', effect: '物防+8',
    usable: true, effects: { pdef: 8 },
    price: { silver: 600 }
  },
  zidian_chui: {
    name: '紫电锤', category: 'fabao', rarity: 'jingliang',
    desc: '挥动间紫电缠绕的重锤', effect: '攻击+9',
    usable: true, effects: { atk: 9 },
    price: { silver: 1500 }
  },
  qingming_jing: {
    name: '青冥镜', category: 'fabao', rarity: 'jingliang',
    desc: '镜面幽深如青冥，可定心神', effect: '法防+10',
    usable: true, effects: { mdef: 10 },
    price: { silver: 1400 }
  },
  qiankun_dai: {
    name: '乾坤袋', category: 'fabao', rarity: 'shishi',
    desc: '内有乾坤的储物法袋，随身温养气血', effect: '生命上限+40',
    usable: true, effects: { maxHp: 40 },
    price: { silver: 2000 }
  },
  lieyan_zhu: {
    name: '烈焰珠', category: 'fabao', rarity: 'shishi',
    desc: '封印着地火精魄的宝珠', effect: '激发后获得常驻增益【烈焰附身】（攻击+6）',
    usable: true, effects: {},
    grant: { buff: { name: '烈焰附身', desc: '烈焰珠之力附着经脉，攻击 +6', mods: { atk: 6 } } },
    price: { silver: 2500 }
  },

  /* ----- 功法（功法楼） ----- */
  tuntu_shu: {
    name: '吐纳术', category: 'gongfa', rarity: 'pingfan',
    desc: '基础吐纳法门', effect: '领悟被动技能【吐纳术】',
    usable: true, grantSkill: { type: 'passive', name: '吐纳术' },
    price: { silver: 100 }
  },
  yuhuo_jue: {
    name: '御火诀', category: 'gongfa', rarity: 'youxiu',
    desc: '基础火系功法', effect: '领悟主动技能【御火诀】',
    usable: true, grantSkill: { type: 'active', name: '御火诀' },
    price: { silver: 200 }
  },
  qijian_jue: {
    name: '气剑诀', category: 'gongfa', rarity: 'youxiu',
    desc: '凝气成剑的入门剑诀', effect: '领悟主动技能【气剑指】',
    usable: true, grantSkill: { type: 'active', name: '气剑指' },
    price: { silver: 180 }
  },
  tiesha_zhang: {
    name: '铁掌谱', category: 'gongfa', rarity: 'youxiu',
    desc: '刚猛掌法谱录', effect: '领悟主动技能【铁掌】',
    usable: true, grantSkill: { type: 'active', name: '铁掌' },
    price: { silver: 220 }
  },
  qingshen_shu: {
    name: '轻身术要解', category: 'gongfa', rarity: 'jingliang',
    desc: '身法要诀详解', effect: '领悟被动技能【轻身术】',
    usable: true, grantSkill: { type: 'passive', name: '轻身术' },
    price: { silver: 400 }
  },
  guixi_jing: {
    name: '龟息经', category: 'gongfa', rarity: 'jingliang',
    desc: '气息绵长的养生经', effect: '领悟被动技能【龟息术】',
    usable: true, grantSkill: { type: 'passive', name: '龟息术' },
    price: { silver: 600 }
  },
  wuqi_chaoyuan: {
    name: '五气朝元录', category: 'gongfa', rarity: 'shishi',
    desc: '五气朝元的全维心法', effect: '领悟被动技能【五气朝元】',
    usable: true, grantSkill: { type: 'passive', name: '五气朝元' },
    price: { silver: 1500 }
  },
  yujian_jue: {
    name: '御剑诀', category: 'gongfa', rarity: 'chuanshuo',
    desc: '御剑飞行之术，一日千里', effect: '习得【御剑飞行】——赶路耗时降至约三成',
    usable: true, effects: {},
    grant: { travel: { yujian: true } },
    price: { silver: 5000 }
  },

  /* ----- 材料（综合商店） ----- */
  yaoshou_neidan: {
    name: '妖兽内丹', category: 'cailiao', rarity: 'jingliang',
    desc: '妖兽毕生精华所在，温热如玉', effect: '服后修为 +35',
    usable: true, effects: { cultivation: 35 },
    price: { silver: 600 }
  },
  lingmu_xin: {
    name: '灵木心', category: 'cailiao', rarity: 'youxiu',
    desc: '千年灵木的木心，生机盎然', effect: '炼丹良材，亦可售予坊市',
    usable: false,
    price: { silver: 400 }
  },
  xingyun_tie: {
    name: '星陨铁', category: 'cailiao', rarity: 'shishi',
    desc: '天外陨星之铁，夜观有微光', effect: '炼器良材，售予坊市可得灵石',
    usable: false,
    price: { silver: 800 }
  },
  qiannian_xuantie: {
    name: '千年玄铁', category: 'cailiao', rarity: 'shishi',
    desc: '深埋地底千年的玄铁精髓', effect: '炼器重宝，价值不菲',
    usable: false,
    price: { silver: 1500 }
  },

  /* ----- 奇物（综合商店） ----- */
  qingzong_ju: {
    name: '青鬃灵驹', category: 'qiwu', rarity: 'youxiu',
    desc: '脚力非凡的灵驹，可代步远行', effect: '骑乘后赶路耗时降至约七成',
    usable: true, effects: {},
    grant: { travel: { mount: 'qingzong_ju' } },
    price: { silver: 1500 }
  },
  tayan_lu: {
    name: '踏云鹿', category: 'qiwu', rarity: 'jingliang',
    desc: '踏云而行的灵鹿，日行千里', effect: '骑乘后赶路耗时降至约五成',
    usable: true, effects: {},
    grant: { travel: { mount: 'tayan_lu' } },
    price: { spirit: 12 }
  },
  tianhui_fu: {
    name: '天慧符', category: 'qiwu', rarity: 'chuanshuo',
    desc: '上古天慧真人所遗符箓，通灵达慧，世间仅此一枚',
    effect: '购得即解锁【远程通讯】与【远程银市】——可随时与任何已结识的人物传讯对话，随时掌控银市买卖',
    usable: false,
    unique: 'tianhui',
    price: { spirit: 30 }
  },
  tianhui_tongling: {
    name: '天慧通灵宝', category: 'qiwu', rarity: 'honghuang',
    desc: '天慧符的通灵媒介，需先持天慧符方可祭炼',
    effect: '天慧符通灵：可设【自动嘘寒问暖】（好感窗口一到即自动传讯），并为银市设【量化规则】低买高卖',
    usable: false,
    unique: 'tongling', requiresTianhui: true,
    price: { spirit: 80 }
  },

  /* ----- 云游商人专属（坊市无售，高品质高价值） ----- */
  jiuzhuan_hundan: {
    name: '九转还魂丹', category: 'dan', rarity: 'chuanshuo',
    desc: '九转炼成的还魂神丹，生死人肉白骨', effect: '生命尽复，修为+200',
    usable: true, effects: { hp: 99999, cultivation: 200 },
    merchantOnly: true,
    price: { spirit: 30 }
  },
  taixu_shenjian: {
    name: '太虚神剑', category: 'fabao', rarity: 'honghuang',
    desc: '太虚古境流出的神剑，剑鸣动九霄', effect: '攻击+25',
    usable: true, effects: { atk: 25 },
    merchantOnly: true,
    price: { spirit: 60 }
  },
  hundun_liantai: {
    name: '混沌莲台', category: 'qiwu', rarity: 'chuanshuo',
    desc: '混沌初开时的一朵莲台，蕴藏造化', effect: '参悟后修为+300',
    usable: true, effects: { cultivation: 300 },
    merchantOnly: true,
    price: { spirit: 45 }
  },
  wangu_shengdan: {
    name: '万古神丹', category: 'dan', rarity: 'honghuang',
    desc: '历经万载火候的神丹，药力磅礴', effect: '生命上限+100，法力上限+60',
    usable: true, effects: { maxHp: 100, maxMp: 60 },
    merchantOnly: true,
    price: { spirit: 50 }
  },
  tianji_yujian: {
    name: '天机玉简', category: 'gongfa', rarity: 'chuanshuo',
    desc: '记载天机上古感悟的玉简', effect: '参悟后觉醒天赋【天机入梦】（修为获取+25%）',
    usable: true, effects: {},
    grant: { talent: { name: '天机入梦', desc: '梦悟天机，修为获取 +25%', mods: { cultivationPct: 0.25 } } },
    merchantOnly: true,
    price: { spirit: 40 }
  }
};

/* ---------- 商铺体系（V2.4：分类专营 + 综合商店） ---------- */
// 坊市内并列的商铺；general 综合商店收编其余一切物品
export const SHOP_TYPES = [
  { key: 'general', label: '综合商店', desc: '材料、奇物、坐骑等杂物', categories: ['cailiao', 'qiwu'] },
  { key: 'herb',    label: '草药房',   desc: '百草齐备，炼丹之基',     categories: ['herb'] },
  { key: 'dan',     label: '丹药房',   desc: '成品丹药与突破灵丹',     categories: ['dan', 'pill'] },
  { key: 'fabao',   label: '法宝阁',   desc: '随身法宝，增益护体',     categories: ['fabao'] },
  { key: 'gongfa',  label: '功法楼',   desc: '功法典籍，传承玉简',     categories: ['gongfa'] }
];

/** 商铺库存：该商铺可售的全部物品 key（坊市展示能购买的所有物品，云游商人专属除外） */
export function getShopStock(shopType) {
  const type = SHOP_TYPES.find(t => t.key === shopType);
  if (!type) return [];
  return Object.keys(MAP_ITEMS).filter(k => {
    const def = MAP_ITEMS[k];
    return !def.merchantOnly && type.categories.includes(def.category);
  });
}

/** 云游商人库存：5 种坊市无售的高品质珍品 */
export function getMerchantStock() {
  return Object.keys(MAP_ITEMS).filter(k => MAP_ITEMS[k].merchantOnly);
}

/** 草药售价（按药效价值折算银元） */
export function herbPrice(herbKey) {
  const herb = HERBS[herbKey];
  if (!herb) return null;
  return { silver: Math.max(10, herb.value * 30) };
}

/* ---------- 查询工具 ---------- */
export function getMapItem(id) {
  return MAP_ITEMS[id];
}

export function getHerbItem(herbKey) {
  const herb = HERBS[herbKey];
  if (!herb) return null;
  return {
    name: herb.name,
    category: 'herb',
    rarity: herb.rarity,
    desc: herb.desc,
    effect: `炼丹材料（${herb.effect}+${herb.value}）`,
    usable: false,
    herbKey
  };
}

export function getAllHerbs() {
  return Object.entries(HERBS).map(([key, herb]) => ({
    key,
    ...herb
  }));
}

export function getAllRecipes() {
  return Object.entries(RECIPES).map(([key, recipe]) => ({
    key,
    ...recipe
  }));
}
