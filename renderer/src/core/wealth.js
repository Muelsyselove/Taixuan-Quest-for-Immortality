// ============================================================
// 财富系统：银元（基础货币）/ 灵石（高级货币）
// 汇率：1 灵石 = 1000 银元
// ============================================================

export const CURRENCY = {
  silver: { key: 'silver', label: '银元', icon: 'talisman', color: '#c0c0c0' },
  spirit: { key: 'spirit', label: '灵石', icon: 'spark', color: '#7fb3a8' }
};

// 汇率：1 灵石 = 1000 银元
export const EXCHANGE_RATE = 1000;

/** 银元 → 灵石（需整千兑换） */
export function silverToSpirit(silver) {
  const spirit = Math.floor(silver / EXCHANGE_RATE);
  const remainder = silver % EXCHANGE_RATE;
  return { spirit, remainder };
}

/** 灵石 → 银元 */
export function spiritToSilver(spirit) {
  return spirit * EXCHANGE_RATE;
}

/** 格式化财富显示 */
export function formatWealth(wealth) {
  const parts = [];
  if (wealth.spirit > 0) parts.push(`${wealth.spirit} 灵石`);
  if (wealth.silver > 0 || parts.length === 0) parts.push(`${wealth.silver} 银元`);
  return parts.join(' · ');
}

/** 检查是否支付得起 */
export function canAfford(wealth, price) {
  // price: { silver?: number, spirit?: number }
  const totalSilver = wealth.silver + wealth.spirit * EXCHANGE_RATE;
  const priceSilver = (price.silver ?? 0) + (price.spirit ?? 0) * EXCHANGE_RATE;
  return totalSilver >= priceSilver;
}

/** 支付（优先使用银元，不足自动兑换灵石） */
export function pay(wealth, price) {
  const priceSilver = (price.silver ?? 0) + (price.spirit ?? 0) * EXCHANGE_RATE;
  let totalSilver = wealth.silver + wealth.spirit * EXCHANGE_RATE;
  if (totalSilver < priceSilver) return null; // 支付失败

  totalSilver -= priceSilver;
  return {
    silver: totalSilver % EXCHANGE_RATE,
    spirit: Math.floor(totalSilver / EXCHANGE_RATE)
  };
}

/** 获得财富 */
export function gain(wealth, amount) {
  return {
    silver: wealth.silver + (amount.silver ?? 0),
    spirit: wealth.spirit + (amount.spirit ?? 0)
  };
}
