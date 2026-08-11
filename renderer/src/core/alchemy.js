// ============================================================
// 炼丹系统：草药 + 配方 → 丹药
// 草药品质与炼丹水平影响丹药品质
// ============================================================

import { CONFIG } from './config.js';

/* ---------- 草药数据 ---------- */
export const HERBS = {
  // 平凡草药
  jianye:   { name: '剑叶草', rarity: 'pingfan', effect: 'atk', value: 1, desc: '叶片如剑，蕴含金锐之气' },
  xinyi:    { name: '心意花', rarity: 'pingfan', effect: 'mp', value: 1, desc: '花瓣呈心形，可凝神静气' },
  jinling:  { name: '金灵草', rarity: 'pingfan', effect: 'hp', value: 1, desc: '金色灵草，补气养血' },
  // 优秀草药
  bingxin:  { name: '冰心莲', rarity: 'youxiu', effect: 'mdef', value: 2, desc: '生于寒冰之中，可固心神' },
  huoling:  { name: '火灵果', rarity: 'youxiu', effect: 'atk', value: 2, desc: '蕴含火元的灵果' },
  yuling:   { name: '玉灵参', rarity: 'youxiu', effect: 'hp', value: 2, desc: '如玉般温润的人参' },
  // 精良草药
  ziyun:    { name: '紫云芝', rarity: 'jingliang', effect: 'cultivation', value: 4, desc: '紫色灵芝，可助修行' },
  longxian: { name: '龙涎草', rarity: 'jingliang', effect: 'maxHp', value: 4, desc: '沾染龙涎的灵草' },
  fengyu:   { name: '凤羽花', rarity: 'jingliang', effect: 'dodge', value: 4, desc: '如凤凰羽毛般绚烂' },
  // 史诗草药
  jiuyang:  { name: '九阳花', rarity: 'shishi', effect: 'breakthrough', value: 8, desc: '九阳之力汇聚，可助突破' },
  xuanbing: { name: '玄冰晶', rarity: 'shishi', effect: 'mdef', value: 8, desc: '万年玄冰所化' },
  // 传说草药
  hundun:   { name: '混沌莲', rarity: 'chuanshuo', effect: 'all', value: 15, desc: '混沌初开时的莲台' }
};

/* ---------- 丹药配方 ---------- */
export const RECIPES = {
  // 基础丹药
  huixue: {
    name: '回血丹', rarity: 'pingfan',
    herbs: ['jinling', 'xinyi'],
    effects: { hp: 50 },
    desc: '基础回血丹药'
  },
  huilan: {
    name: '回蓝丹', rarity: 'pingfan',
    herbs: ['xinyi', 'jianye'],
    effects: { mp: 30 },
    desc: '基础回蓝丹药'
  },
  // 进阶丹药
  jinji: {
    name: '金肌丹', rarity: 'youxiu',
    herbs: ['jianye', 'yuling'],
    effects: { maxHp: 10, pdef: 2 },
    desc: '强化肉身防御'
  },
  juqi: {
    name: '聚气丹', rarity: 'youxiu',
    herbs: ['huoling', 'bingxin'],
    effects: { cultivation: 30 },
    desc: '加速修为凝聚'
  },
  // 高级丹药
  zengyuan: {
    name: '增元丹', rarity: 'jingliang',
    herbs: ['ziyun', 'longxian'],
    effects: { maxHp: 25, maxMp: 15 },
    desc: '增强生命与法力上限'
  },
  tishen: {
    name: '提神丹', rarity: 'jingliang',
    herbs: ['fengyu', 'ziyun'],
    effects: { atk: 5, crit: 0.05 },
    desc: '提升攻击与会心'
  },
  // 突破丹药（关键）
  zhuji: {
    name: '筑基丹', rarity: 'jingliang',
    herbs: ['ziyun', 'jiuyang'],
    effects: { breakthrough: 1 },
    desc: '炼气期突破筑基期必备',
    breakthroughRealm: 1
  },
  jindan: {
    name: '金丹', rarity: 'shishi',
    herbs: ['jiuyang', 'xuanbing'],
    effects: { breakthrough: 2 },
    desc: '筑基期突破金丹期必备',
    breakthroughRealm: 2
  },
  yuanying: {
    name: '元婴丹', rarity: 'chuanshuo',
    herbs: ['hundun', 'jiuyang'],
    effects: { breakthrough: 3 },
    desc: '金丹期突破元婴期必备',
    breakthroughRealm: 3
  }
};

/* ---------- 炼丹等级 ---------- */
export const ALCHEMY_LEVELS = [
  { level: 1, name: '学徒', expNeeded: 0, successRate: 0.6 },
  { level: 2, name: '药师', expNeeded: 100, successRate: 0.7 },
  { level: 3, name: '丹师', expNeeded: 300, successRate: 0.8 },
  { level: 4, name: '丹王', expNeeded: 600, successRate: 0.9 },
  { level: 5, name: '丹皇', expNeeded: 1000, successRate: 0.95 },
  { level: 6, name: '丹帝', expNeeded: 2000, successRate: 0.98 }
];

/** 计算炼丹成功率 */
export function calcSuccessRate(alchemyLevel, herbQuality) {
  const levelDef = ALCHEMY_LEVELS[Math.min(alchemyLevel - 1, ALCHEMY_LEVELS.length - 1)];
  // 草药品质加成：品质越高，成功率越高
  const qualityBonus = herbQuality * 0.02; // 每点品质+2%
  return Math.min(0.99, levelDef.successRate + qualityBonus);
}

/** 计算丹药品质 */
export function calcPillQuality(alchemyLevel, herbQuality, successRate) {
  // 基础品质 = (炼丹等级 + 草药品质) / 2
  const base = (alchemyLevel + herbQuality) / 2;
  // 随机浮动 ±1
  const roll = Math.random();
  let quality = base;
  if (roll < 0.2) quality -= 1; // 20% 降一级
  else if (roll > 0.9) quality += 1; // 10% 升一级
  // 品质范围 1-7（对应稀有度）
  return Math.max(1, Math.min(7, Math.round(quality)));
}

/** 炼丹 */
export function alchemize(recipeKey, herbs, alchemyLevel, alchemyExp) {
  const recipe = RECIPES[recipeKey];
  if (!recipe) return { ok: false, reason: '配方不存在' };

  // 检查草药
  const hasAll = recipe.herbs.every(h => herbs[h] > 0);
  if (!hasAll) return { ok: false, reason: '草药不足' };

  // 计算草药品质平均值
  const herbQuality = recipe.herbs.reduce((sum, h) => sum + (HERBS[h]?.value ?? 0), 0) / recipe.herbs.length;

  // 计算成功率
  const successRate = calcSuccessRate(alchemyLevel, herbQuality);

  // 判定成功
  const success = Math.random() < successRate;

  // 消耗草药
  const consumed = {};
  for (const h of recipe.herbs) consumed[h] = (consumed[h] ?? 0) + 1;

  if (!success) {
    return {
      ok: true, success: false,
      consumed,
      expGain: 10, // 失败也给经验
      message: '炼丹失败，草药尽毁'
    };
  }

  // 成功：计算品质
  const quality = calcPillQuality(alchemyLevel, herbQuality, successRate);
  const rarityIndex = Math.min(quality - 1, CONFIG.rarities.length - 1);
  const rarity = CONFIG.rarities[rarityIndex].key;

  // 经验 = 配方价值
  const expGain = Math.round(herbQuality * 10);

  return {
    ok: true, success: true,
    pill: {
      name: recipe.name,
      rarity,
      effects: recipe.effects,
      desc: recipe.desc,
      quality
    },
    consumed,
    expGain,
    message: `成功炼制【${recipe.name}】（品质${quality}）`
  };
}

/** 获取炼丹等级信息 */
export function getAlchemyLevel(exp) {
  let level = 1;
  for (let i = ALCHEMY_LEVELS.length - 1; i >= 0; i--) {
    if (exp >= ALCHEMY_LEVELS[i].expNeeded) {
      level = ALCHEMY_LEVELS[i].level;
      break;
    }
  }
  const def = ALCHEMY_LEVELS[level - 1];
  const next = ALCHEMY_LEVELS[level];
  return {
    level,
    name: def.name,
    exp,
    expNeeded: def.expNeeded,
    nextExpNeeded: next?.expNeeded ?? Infinity,
    successRate: def.successRate
  };
}
