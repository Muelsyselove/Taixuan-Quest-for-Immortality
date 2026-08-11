// ============================================================
// 地图模式时间系统：年 + 月 累计制
// 消耗时间的行为以月为单位累计，12个月 = 1年
// 寿元限制：不同境界寿元不同，元婴期后寿元无限
// ============================================================

// 各境界寿元（年）
export const LIFESPAN = {
  0: 100,   // 炼气
  1: 150,   // 筑基
  2: 200,   // 金丹
  3: 300,   // 元婴
  4: 500,   // 化神
  5: 800,   // 炼虚
  6: 1200,  // 合体
  7: 2000,  // 大乘
  8: 5000   // 渡劫
};

// 元婴期后寿元无限
export const IMMORTAL_REALM = 3;

/** 创建时间对象 */
export function createTime(year = 1, month = 1) {
  return { year, month };
}

/** 时间推进（月为单位） */
export function advanceTime(time, months = 1) {
  const totalMonths = (time.year - 1) * 12 + (time.month - 1) + months;
  return {
    year: Math.floor(totalMonths / 12) + 1,
    month: (totalMonths % 12) + 1
  };
}

/** 计算已存活年数 */
export function getAliveYears(time) {
  return time.year;
}

/** 获取当前境界寿元上限 */
export function getLifespanLimit(realmIndex) {
  if (realmIndex >= IMMORTAL_REALM) return Infinity;
  return LIFESPAN[realmIndex] ?? 100;
}

/** 检查是否寿元已尽 */
export function isLifespanOver(time, realmIndex) {
  const limit = getLifespanLimit(realmIndex);
  return time.year > limit;
}

/** 格式化时间显示 */
export function formatTime(time) {
  return `第${time.year}年 ${time.month}月`;
}

/** 格式化寿元显示 */
export function formatLifespan(time, realmIndex) {
  const limit = getLifespanLimit(realmIndex);
  if (limit === Infinity) return '寿元无限';
  const remaining = limit - time.year;
  return `寿元 ${time.year}/${limit} 年${remaining <= 10 ? '（所剩无多）' : ''}`;
}

// 行为消耗时间（月）
export const TIME_COST = {
  travel: 1,        // 赶路
  cultivate: 1,     // 修炼（普通）
  biguan: 3,        // 闭关修炼
  alchemy: 1,       // 炼丹
  quest: 2,         // 宗门任务
  rest: 0.5         // 休息
};
