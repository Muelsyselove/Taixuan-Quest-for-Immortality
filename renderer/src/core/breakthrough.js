// ============================================================
// 突破系统：大境界突破
// 需要：修为满 + 突破丹（增加成功率）+ 合理操作
// 失败惩罚：回退一个小境界
// ============================================================

import { CONFIG } from './config.js';

/* ---------- 突破配置 ---------- */
export const BREAKTHROUGH_CONFIG = {
  // 基础成功率（无丹药）
  baseRate: 0.3,
  // 每点丹药品质提升成功率
  pillRatePerQuality: 0.08,
  // 每点炼丹等级提升成功率
  alchemyRatePerLevel: 0.02,
  // 最高成功率
  maxRate: 0.95,
  // 失败后回退境界数
  failRollback: 1,
  // 失败后修为保留比例
  failKeepRatio: 0.5
};

/* ---------- 突破丹药对应表 ---------- */
export const BREAKTHROUGH_PILLS = {
  1: 'zhuji',      // 炼气→筑基：筑基丹
  2: 'jindan',     // 筑基→金丹：金丹
  3: 'yuanying',   // 金丹→元婴：元婴丹
  4: 'huashen',    // 元婴→化神：化神丹（暂未实现）
  5: 'lianxu',     // 化神→炼虚
  6: 'heti',       // 炼虚→合体
  7: 'dacheng',    // 合体→大乘
  8: 'dujie'       // 大乘→渡劫
};

/** 计算突破成功率 */
export function calcBreakthroughRate(playerState, pillQuality = 0) {
  let rate = BREAKTHROUGH_CONFIG.baseRate;

  // 丹药加成
  rate += pillQuality * BREAKTHROUGH_CONFIG.pillRatePerQuality;

  // 炼丹等级加成（自己炼的丹效果更好）
  const alchemyLevel = playerState.alchemyLevel ?? 1;
  rate += alchemyLevel * BREAKTHROUGH_CONFIG.alchemyRatePerLevel;

  // 天赋/技能加成（如有）
  if (playerState.talents?.some(t => t.name === '道心通明')) {
    rate += 0.05;
  }

  return Math.min(BREAKTHROUGH_CONFIG.maxRate, rate);
}

/** 尝试突破 */
export function attemptBreakthrough(playerState, pillQuality = 0) {
  const currentRealm = playerState.realmIndex;
  const nextRealm = currentRealm + 1;

  if (nextRealm >= CONFIG.realms.length) {
    return { ok: false, reason: '已达最高境界' };
  }

  // 检查修为是否满
  if (playerState.cultivation < playerState.cultivationCap) {
    return { ok: false, reason: '修为未圆满' };
  }

  // 计算成功率
  const rate = calcBreakthroughRate(playerState, pillQuality);
  const success = Math.random() < rate;

  if (success) {
    return {
      ok: true,
      success: true,
      nextRealm,
      realmName: CONFIG.realms[nextRealm],
      message: `突破成功！进阶【${CONFIG.realms[nextRealm]}】`
    };
  } else {
    // 失败：回退一个小境界
    const rollbackRealm = Math.max(0, currentRealm - BREAKTHROUGH_CONFIG.failRollback);
    const keepCultivation = Math.round(playerState.cultivation * BREAKTHROUGH_CONFIG.failKeepRatio);

    return {
      ok: true,
      success: false,
      rollbackRealm,
      rollbackRealmName: CONFIG.realms[rollbackRealm],
      keepCultivation,
      message: `突破失败，境界跌落至【${CONFIG.realms[rollbackRealm]}】`
    };
  }
}

/** 获取突破所需丹药 */
export function getRequiredPill(currentRealm) {
  return BREAKTHROUGH_PILLS[currentRealm + 1] ?? null;
}

/** 检查是否可以尝试突破 */
export function canBreakthrough(playerState) {
  if (playerState.realmIndex >= CONFIG.realms.length - 1) {
    return { ok: false, reason: '已达最高境界' };
  }
  if (playerState.cultivation < playerState.cultivationCap) {
    return { ok: false, reason: `修为未满（${playerState.cultivation}/${playerState.cultivationCap}）` };
  }
  return { ok: true };
}
