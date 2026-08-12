// ============================================================
// 银市（V2.4）：银股交易行情
// 银股价格随时间（月）波动；玩家以银元自由买卖。
// 已用于购买银股的银元在卖出前不计入已有银元、无法消费。
// ============================================================

/* ---------- 银股定义 ---------- */
export const STOCKS = [
  { id: 'qingming_jiange', name: '青冥剑阁', desc: '铸剑名铺，剑修纷至沓来', base: 100, vol: 0.10, drift: 0.012 },
  { id: 'miaomu_danhang',  name: '妙木丹行', desc: '丹药老字号，稳中求升',     base: 160, vol: 0.06, drift: 0.010 },
  { id: 'fentian_qifang',  name: '焚天器坊', desc: '炼器大坊，订单随战事起伏', base: 120, vol: 0.14, drift: 0.008 },
  { id: 'wanshou_lingyuan',name: '万兽灵苑', desc: '灵兽买卖，行情变幻莫测',   base: 80,  vol: 0.18, drift: 0.006 },
  { id: 'youming_hunshi',  name: '幽冥魂市', desc: '黑市魂货，暴涨暴跌',       base: 60,  vol: 0.26, drift: 0.004 },
  { id: 'tianji_baoge',    name: '天机宝阁', desc: '奇珍异宝，贵人云集',       base: 220, vol: 0.08, drift: 0.014 }
];

export const STOCK_HISTORY_LEN = 36; // 行情快照保留月数

/** 初始行情 */
export function initStocks() {
  const out = {};
  for (const s of STOCKS) out[s.id] = { price: s.base, prev: s.base, history: [s.base] };
  return out;
}

/** 行情推进一月：漂移 + 随机冲击 */
export function tickStocks(stocks, months = 1) {
  const next = structuredClone(stocks);
  for (const def of STOCKS) {
    const st = next[def.id] ?? { price: def.base, prev: def.base, history: [def.base] };
    for (let m = 0; m < months; m++) {
      st.prev = st.price;
      const shock = (Math.random() * 2 - 1) * def.vol;
      // 小幅均值回归，防止价格无限漂移
      const reversion = (def.base - st.price) / def.base * 0.02;
      st.price = Math.max(1, Math.round(st.price * (1 + def.drift + shock + reversion)));
      st.history.push(st.price);
      if (st.history.length > STOCK_HISTORY_LEN) st.history.shift();
    }
    next[def.id] = st;
  }
  return next;
}

export function getStockDef(id) {
  return STOCKS.find(s => s.id === id) ?? null;
}
