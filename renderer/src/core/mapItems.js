// ============================================================
// 地图模式物品系统（独立于对话模式）
// 分类：丹药/草药/法宝/功法/材料/奇物/货币
// ============================================================

import { CONFIG } from './config.js';
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
  /* ----- 丹药 ----- */
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
  zengyuan_dan: {
    name: '增元丹', category: 'dan', rarity: 'jingliang',
    desc: '增强生命与法力上限', effect: '生命上限+25，法力上限+15',
    usable: true, effects: { maxHp: 25, maxMp: 15 },
    price: { silver: 800 }
  },

  /* ----- 突破丹药 ----- */
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

  /* ----- 法宝 ----- */
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

  /* ----- 功法 ----- */
  yuhuo_jue: {
    name: '御火诀', category: 'gongfa', rarity: 'youxiu',
    desc: '基础火系功法', effect: '领悟火系技能',
    usable: true, grantSkill: { type: 'active', name: '御火诀' },
    price: { silver: 200 }
  },
  tuntu_shu: {
    name: '吐纳术', category: 'gongfa', rarity: 'pingfan',
    desc: '基础吐纳法门', effect: '领悟被动技能',
    usable: true, grantSkill: { type: 'passive', name: '吐纳术' },
    price: { silver: 100 }
  }
};

/* ---------- 商店库存（按场景/宗门） ---------- */
export const SHOP_STOCKS = {
  // 青云门炼丹房
  qy_liandan: ['huixue_dan', 'huilan_dan', 'jinji_dan', 'juqi_dan', 'zhuji_dan'],
  // 妙木宗药王殿
  mm_yaowang: ['huixue_dan', 'huilan_dan', 'jinji_dan', 'juqi_dan', 'zengyuan_dan', 'zhuji_dan', 'jindan_dan'],
  // 散修坊市
  wild_fangshi: ['huixue_dan', 'huilan_dan', 'qingfeng_sword', 'yuhuo_jue', 'tuntu_shu'],
  // 焚天谷
  ft_ronglu: ['qingfeng_sword', 'xuanwu_shield'],
  // 通用（默认）
  default: ['huixue_dan', 'huilan_dan']
};

/* ---------- 查询工具 ---------- */
export function getMapItem(id) {
  return MAP_ITEMS[id];
}

export function getShopStock(sceneId) {
  return SHOP_STOCKS[sceneId] ?? SHOP_STOCKS.default;
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
