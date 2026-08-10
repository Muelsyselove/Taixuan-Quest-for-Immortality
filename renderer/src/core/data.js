// 游戏数据域定义：一个域 = 一个磁盘文件 = 一项功能
// 三大用途：
//   1) 存档持久化——每个域独立成文件，存档槽 = 一组域文件的目录
//   2) AI 按需读取——AI 通过 needData 协议按域名取用对应数据
//   3) 状态拆分/合并——serialize / deserialize 的单一事实来源
import { CONFIG } from './config.js';

export const DOMAINS = [
  {
    key: 'profile',
    file: 'profile.json',
    label: '个人信息',
    desc: '角色姓名、出身、境界、六维属性、修为、灵根、所在地点、游历天数与常驻增益',
    keys: ['name', 'origin', 'realmIndex', 'hp', 'maxHp', 'mp', 'maxMp',
           'atk', 'pdef', 'mdef', 'cultivation', 'cultivationCap',
           'roots', 'buffs', 'location', 'day'],
    /** 给 AI 阅读的紧凑形态 */
    present(s) {
      return {
        姓名: s.name, 出身: s.origin || '未明', 境界: `${s.realm}（${s.realmIndex + 1}重天）`,
        生命: `${s.hp}/${s.maxHp}`, 法力: `${s.mp}/${s.maxMp}`,
        攻击: s.atk, 物防: s.pdef, 法防: s.mdef,
        修为: `${s.cultivation}/${s.cultivationCap}`,
        灵根: s.roots.map(k => CONFIG.roots.find(r => r.key === k)?.label ?? k).join('、') || '未测',
        常驻增益: s.buffs.map(b => `${b.name}(${b.desc})`),
        当前地点: CONFIG.map.nodes.find(n => n.id === s.location)?.name ?? s.location,
        天数: s.day
      };
    }
  },
  {
    key: 'inventory',
    file: 'inventory.json',
    label: '背包',
    desc: '持有物品清单（名称/品阶/分类/效用/获得日）',
    keys: ['items'],
    present(s) {
      return {
        物品数量: s.items.length,
        物品: s.items.map(x => ({
          名称: x.name,
          品阶: CONFIG.rarities.find(r => r.key === x.rarity)?.label ?? x.rarity,
          分类: CONFIG.itemCategories.find(c => c.key === x.category)?.label ?? x.category,
          效用: x.effect || '未明', 描述: x.desc, 第几日所得: x.day
        }))
      };
    }
  },
  {
    key: 'skills',
    file: 'skills.json',
    label: '功法神通',
    desc: '主动技能（耗蓝/倍率/灵根属性）、被动技能、天赋能力',
    keys: ['activeSkills', 'passiveSkills', 'talents'],
    present(s) {
      return {
        主动技能: s.activeSkills.map(x => `${x.name}(耗蓝${x.cost ?? 10},倍率${x.mult ?? 1.5}${x.root ? ',属' + (CONFIG.roots.find(r => r.key === x.root)?.label ?? x.root) : ''})——${x.desc}`),
        被动技能: s.passiveSkills.map(x => `${x.name}——${x.desc}`),
        天赋: s.talents.map(x => `${x.name}——${x.desc}`)
      };
    }
  },
  {
    key: 'relations',
    file: 'relations.json',
    label: '人物关系',
    desc: '出场角色名录：姓名、身份、与主角的关系、好感度（-100 死敌 ~ 100 至交）',
    keys: ['relations'],
    present(s) {
      return {
        人物: s.relations.map(r => `${r.name}｜${r.identity}｜${r.relation}｜好感${r.affinity}`)
      };
    }
  },
  {
    key: 'history',
    file: 'history.json',
    label: '史册',
    desc: '游历日志：每日所历事件的记载（最新在后）',
    keys: ['history'],
    present(s) {
      return { 记载: s.history.slice(-30).map(h => `第${h.day}日：${h.text}`) };
    }
  }
];

const byKey = Object.fromEntries(DOMAINS.map(d => [d.key, d]));

/** 将整树状态拆分为 {域名: 数据}（写盘用，原始结构） */
export function splitState(state) {
  const out = {};
  for (const d of DOMAINS) {
    out[d.key] = {};
    for (const k of d.keys) out[d.key][k] = structuredClone(state[k]);
  }
  return out;
}

/** 将 {域名: 数据} 合并回整树状态片段（读档用） */
export function mergeDomains(files) {
  const state = {};
  for (const d of DOMAINS) {
    const data = files?.[d.key];
    if (!data) continue;
    for (const k of d.keys) {
      if (data[k] !== undefined) state[k] = data[k];
    }
  }
  return state;
}

/** 供 AI 按需读取：域名 → 该域的可读数据 */
export function presentDomain(state, key) {
  const d = byKey[key];
  return d ? { 文件: d.file, 说明: d.desc, 数据: d.present(state) } : null;
}

/** AI 可读数据目录（写进系统提示词） */
export function domainCatalog() {
  return DOMAINS.map(d => `- ${d.key}（${d.label}）：${d.desc}`).join('\n');
}

export function isDomainKey(key) {
  return !!byKey[key];
}
