// ============================================================
// 效果层（Effect Layer）
// 所有对敌我双方的「非直接伤害」效果的基础实现注册于此。
// 注意：效果是原子实现，不会被技能直接贴到角色身上；
// 技能施加的是 buff，buff 由若干效果组成（见 buff 层）。
//   例：造成 1 回合眩晕 = 施加一个持续 1 回合、效果为 stun 的 buff
// ============================================================

/**
 * 效果参数约定（buff 实例的 effects 数组元素）：
 *   { key:'poison',  pct }              中毒：回合开始损失 最大生命*pct
 *   { key:'burn',    value }            灼烧：回合开始损失 value（施加时按施术者攻击快照计算）
 *   { key:'regen',   pct }              回春：回合开始恢复 最大生命*pct
 *   { key:'mpRegen', value }            回蓝：回合开始恢复 value 法力
 *   { key:'stun' }                      眩晕/控制：无法行动
 *   { key:'shield',  layers }           护盾（次数盾）：每层抵消一次伤害
 *   { key:'barrier', value }            屏障（血量盾）：吸收伤害的护盾池
 *   { key:'counter', pct }              反伤：受击后反弹 所受伤害*pct
 *   { key:'statUp',  stat, pct|value }  增益：属性提升（atk/pdef/mdef/crit/dodge）
 *   { key:'statDown',stat, pct|value }  减益：属性降低
 *   { key:'dodge',   pct }              化形：受击时 pct 概率完全闪避
 *   { key:'summon',  value }            召唤造物：回合开始造物自动攻击，造成 value
 *   { key:'guard' }                     格挡：下次受击减伤（系统防御动作）
 * value 类效果随 buff 叠加层数（stacks）乘算。
 */
export const EFFECTS = {
  poison:   { key: 'poison',   label: '中毒',   color: '#6fcf7f', desc: '回合开始损失生命',        phase: 'turnStart' },
  burn:     { key: 'burn',     label: '灼烧',   color: '#e35d6a', desc: '回合开始受到灼烧伤害',    phase: 'turnStart' },
  regen:    { key: 'regen',    label: '回春',   color: '#7fb3a8', desc: '回合开始恢复生命',        phase: 'turnStart' },
  mpRegen:  { key: 'mpRegen',  label: '回蓝',   color: '#5aa9e6', desc: '回合开始恢复法力',        phase: 'turnStart' },
  summon:   { key: 'summon',   label: '造物',   color: '#c08a5a', desc: '召唤造物，回合开始自动攻敌', phase: 'turnStart' },
  stun:     { key: 'stun',     label: '眩晕',   color: '#b07fe8', desc: '无法行动',                phase: 'control' },
  shield:   { key: 'shield',   label: '护盾',   color: '#f4d98c', desc: '次数盾：每层抵消一次伤害',  phase: 'defend' },
  barrier:  { key: 'barrier',  label: '屏障',   color: '#d8b25c', desc: '血量盾：吸收伤害的护盾池',  phase: 'defend' },
  dodge:    { key: 'dodge',    label: '化形',   color: '#5aa9e6', desc: '受击时有概率完全闪避',      phase: 'defend' },
  guard:    { key: 'guard',    label: '格挡',   color: '#9a937f', desc: '下次受击减伤',             phase: 'defend' },
  counter:  { key: 'counter',  label: '反伤',   color: '#e8a34f', desc: '受击后反弹部分伤害',        phase: 'attacked' },
  statUp:   { key: 'statUp',   label: '增益',   color: '#e8a34f', desc: '属性提升',                phase: 'stat' },
  statDown: { key: 'statDown', label: '减益',   color: '#b07fe8', desc: '属性降低',                phase: 'stat' }
};

export const STAT_LABELS = { atk: '攻击', pdef: '物防', mdef: '法防', crit: '会心', dodge: '身法' };

/* ================= buff 层工具 ================= */

/**
 * 生成 buff 实例
 * @param name  buff 名（状态名，如「中毒」「金钟罩」）
 * @param effects 效果数组（见上方参数约定；value 类需在施加前快照计算）
 * @param opts  { turns 持续回合, stackable 可否叠加, maxStacks 叠加上限 }
 */
export function mkBuff(name, effects, { turns = 2, stackable = false, maxStacks = 1 } = {}) {
  return {
    name: String(name),
    effects: effects.map(e => ({ ...e })),
    turns,
    stackable: !!stackable,
    maxStacks: Math.max(1, maxStacks | 0),
    stacks: 1
  };
}

/**
 * 将 buff 加入列表（叠加规则在此）
 * - 不可叠加：同名刷新持续与参数
 * - 可叠加：层数 +1（不超上限），并刷新持续
 * @returns 新列表
 */
export function applyBuff(list, buff) {
  const next = [...list];
  const idx = next.findIndex(b => b.name === buff.name);
  if (idx < 0) return [...next, buff];
  const cur = next[idx];
  if (cur.stackable && cur.stacks < cur.maxStacks) {
    next[idx] = { ...buff, stacks: cur.stacks + 1 };
  } else {
    next[idx] = { ...buff, stacks: cur.stacks }; // 刷新参数与持续
  }
  return next;
}

/** buff 展示文案：状态名·层数·剩余回合（>90 回合视为当次行动） */
export function buffLabel(b) {
  const stack = b.stacks > 1 ? `×${b.stacks}` : '';
  const turns = b.turns > 90 ? '' : `·${b.turns}`;
  return `${b.name}${stack}${turns}`;
}

/** buff 主色调：取第一个已注册效果的颜色 */
export function buffColor(b) {
  for (const e of b.effects || []) {
    const def = EFFECTS[e.key];
    if (def) return def.color;
  }
  return '#9a937f';
}

/** 效果一句话说明（技能描述自动生成用） */
export function effectText(e) {
  switch (e.key) {
    case 'poison':   return `中毒：每回合损失最大生命 ${Math.round((e.pct ?? 0) * 100)}%`;
    case 'burn':     return `灼烧：每回合受到 ${Math.round(e.value ?? 0)} 点灼烧伤害`;
    case 'regen':    return `回春：每回合恢复最大生命 ${Math.round((e.pct ?? 0) * 100)}%`;
    case 'mpRegen':  return `每回合恢复 ${e.value} 点法力`;
    case 'summon':   return `造物每回合自动攻击（${Math.round(e.value ?? 0)} 点）`;
    case 'stun':     return '无法行动';
    case 'shield':   return `${e.layers ?? 1} 层次数盾（每层抵消一次伤害）`;
    case 'barrier':  return `屏障：吸收 ${Math.round(e.value ?? 0)} 点伤害`;
    case 'counter':  return `反伤 ${Math.round((e.pct ?? 0) * 100)}%`;
    case 'dodge':    return `化形：${Math.round((e.pct ?? 0) * 100)}% 概率闪避攻击`;
    case 'guard':    return '格挡：下次受击减伤';
    case 'statUp':   return `${STAT_LABELS[e.stat] ?? e.stat}提升 ${e.pct != null ? Math.round(e.pct * 100) + '%' : e.value}`;
    case 'statDown': return `${STAT_LABELS[e.stat] ?? e.stat}降低 ${e.pct != null ? Math.round(e.pct * 100) + '%' : e.value}`;
    default:         return e.key;
  }
}
