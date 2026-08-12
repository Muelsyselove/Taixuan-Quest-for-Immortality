// 领域：财富（银元/灵石）、商店（地图模式物品）、银市（V2.4 银股）、宗门
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
import { canAfford, pay as wealthPay, gain as wealthGain, EXCHANGE_RATE } from '../wealth.js';
import { MAP_ITEMS, herbPrice } from '../mapItems.js';
import { SECTS, canJoinSect } from '../mapData.js';
import { initStocks, getStockDef } from '../stocks.js';

// 无标价物品的出售估值（按稀有度，单位：银元）
const SELL_PRICE_BY_RARITY = {
  pingfan: 25, youxiu: 100, jingliang: 400,
  shishi: 1500, chuanshuo: 6000, honghuang: 20000, chuyuan: 50000
};

export const wealthDomain = {
  gainWealth(amount) { this.set({ wealth: wealthGain(this.state.wealth, amount) }); },
  canPay(price) { return canAfford(this.state.wealth, price); },
  /** 支付（灵石自动折算），成功返回 true */
  payWealth(price) {
    const w = wealthPay(this.state.wealth, price);
    if (!w) return false;
    this.set({ wealth: w });
    return true;
  },
  /** 兑换：1000 银元 → 1 灵石 */
  exchangeSilverToSpirit() {
    const w = this.state.wealth;
    if (w.silver < EXCHANGE_RATE) return { ok: false, reason: '银元不足一千' };
    this.set({ wealth: { silver: w.silver - EXCHANGE_RATE, spirit: w.spirit + 1 } });
    this.pushHistory(`以 ${EXCHANGE_RATE} 银元兑得 1 灵石`, 'wealth');
    return { ok: true };
  },
  /** 兑换：1 灵石 → 1000 银元 */
  exchangeSpiritToSilver() {
    const w = this.state.wealth;
    if (w.spirit < 1) return { ok: false, reason: '灵石不足' };
    this.set({ wealth: { silver: w.silver + EXCHANGE_RATE, spirit: w.spirit - 1 } });
    this.pushHistory(`以 1 灵石兑得 ${EXCHANGE_RATE} 银元`, 'wealth');
    return { ok: true };
  },

  /* ---------- 商店（地图模式物品） ---------- */

  buyMapItem(itemKey) {
    const def = MAP_ITEMS[itemKey];
    if (!def) return { ok: false, reason: '物品不存在' };
    // 唯一之物：天慧符 / 天慧通灵宝（限购一次，通灵宝需先持天慧符）
    if (def.unique === 'tianhui' && this.state.tianhui?.owned) {
      return { ok: false, reason: '天慧符已认主，世间仅此一枚' };
    }
    if (def.unique === 'tongling') {
      if (!this.state.tianhui?.owned) return { ok: false, reason: '需先持天慧符，方可祭炼通灵宝' };
      if (this.state.tianhui?.tongling) return { ok: false, reason: '天慧通灵宝已祭炼，无需再求' };
    }
    if (!this.payWealth(def.price ?? {})) return { ok: false, reason: '资财不足' };
    const entry = this.addItem({ ...def, price: def.price ?? null });
    if (def.unique === 'tianhui') {
      this.set({ tianhui: { owned: true, tongling: false, autoGreet: false, rules: {} } });
      this.pushHistory('天慧符入体——【远程通讯】与【远程银市】已解锁：可随时传讯已结识之人，随时掌控银市买卖', 'item');
    } else if (def.unique === 'tongling') {
      this.set({ tianhui: { ...this.state.tianhui, tongling: true } });
      this.pushHistory('天慧通灵宝祭炼成功——天慧符通灵：可设【自动嘘寒问暖】与银市【量化规则】', 'item');
    }
    this.pushHistory(`购得【${def.name}】`, 'wealth');
    return { ok: true, item: entry };
  },

  /** 购买草药（草药房）：按药效价值计价，入背包堆叠 */
  buyHerb(herbKey, n = 1) {
    const price = herbPrice(herbKey);
    if (!price) return { ok: false, reason: '草药不存在' };
    const total = { silver: price.silver * n };
    if (!this.payWealth(total)) return { ok: false, reason: '资财不足' };
    this.addHerb(herbKey, n);
    this.pushHistory(`购得草药 ×${n}，花费 ${total.silver} 银元`, 'wealth');
    return { ok: true };
  },

  /** 出售：按标价半价回收（无标价按稀有度估值）；堆叠品每次售一件；唯一之物不可售 */
  sellMapItem(itemId) {
    const s = this.state;
    const item = s.items.find(i => i.id === itemId);
    if (!item) return { ok: false };
    if (item.unique) return { ok: false, reason: '此物已认主，不可出售' };
    const base = item.price
      ? (item.price.silver ?? 0) + (item.price.spirit ?? 0) * EXCHANGE_RATE
      : (SELL_PRICE_BY_RARITY[item.rarity] ?? 25);
    const silver = Math.max(1, Math.floor(base / 2));
    this._takeItem(itemId);
    this.gainWealth({ silver });
    this.pushHistory(`售出【${item.name}】，得银 ${silver}`, 'wealth');
    return { ok: true, silver };
  },

  /* ---------- 银市（V2.4：银股买卖） ---------- */

  /** 行情懒初始化 */
  ensureStocks() {
    if (!this.state.stocks) this.set({ stocks: initStocks() });
    return this.state.stocks;
  },

  /**
   * 买入银股：仅以银元结算；所耗银元即时扣除（卖出前不计入已有银元、无法消费）
   * @returns {{ok:boolean, reason?:string}}
   */
  buyStock(stockId, qty = 1, opts = {}) {
    const def = getStockDef(stockId);
    qty = Math.max(1, Math.round(qty));
    if (!def) return { ok: false, reason: '银股不存在' };
    const stocks = this.ensureStocks();
    const price = stocks[stockId]?.price ?? def.base;
    const cost = price * qty;
    const w = this.state.wealth;
    if (w.silver < cost) return { ok: false, reason: `银元不足（需 ${cost} 银元）` };
    const portfolio = { ...(this.state.portfolio ?? {}) };
    portfolio[stockId] = (portfolio[stockId] ?? 0) + qty;
    this.set({ wealth: { ...w, silver: w.silver - cost }, portfolio });
    this.pushHistory(`${opts.auto ? '量化规则触发——' : ''}买入【${def.name}】${qty} 股，每股 ${price} 银元，共 ${cost} 银元`, 'wealth');
    return { ok: true, cost, price };
  },

  /** 卖出银股：得资立即可用 */
  sellStock(stockId, qty = 1, opts = {}) {
    const def = getStockDef(stockId);
    qty = Math.max(1, Math.round(qty));
    if (!def) return { ok: false, reason: '银股不存在' };
    const held = this.state.portfolio?.[stockId] ?? 0;
    if (held < qty) return { ok: false, reason: `持仓不足（仅 ${held} 股）` };
    const stocks = this.ensureStocks();
    const price = stocks[stockId]?.price ?? def.base;
    const proceeds = price * qty;
    const portfolio = { ...(this.state.portfolio ?? {}) };
    portfolio[stockId] = held - qty;
    if (!portfolio[stockId]) delete portfolio[stockId];
    const w = this.state.wealth;
    this.set({ wealth: { ...w, silver: w.silver + proceeds }, portfolio });
    this.pushHistory(`${opts.auto ? '量化规则触发——' : ''}卖出【${def.name}】${qty} 股，每股 ${price} 银元，得 ${proceeds} 银元`, 'wealth');
    return { ok: true, proceeds, price };
  },

  /** 持仓市值（按当前行情） */
  portfolioValue() {
    const stocks = this.state.stocks ?? {};
    let sum = 0;
    for (const [id, qty] of Object.entries(this.state.portfolio ?? {})) {
      const def = getStockDef(id);
      sum += (stocks[id]?.price ?? def?.base ?? 0) * qty;
    }
    return sum;
  },

  /** 是否可远程操作银市（持有天慧符，或身处银市场景） */
  canRemoteStock() {
    return !!this.state.tianhui?.owned;
  },

  /* ---------- 天慧通灵宝：自动问候 + 量化规则 ---------- */

  /** 开关自动嘘寒问暖（需已祭炼通灵宝） */
  setAutoGreet(on) {
    const th = this.state.tianhui;
    if (!th?.tongling) return { ok: false, reason: '需先祭炼天慧通灵宝' };
    this.set({ tianhui: { ...th, autoGreet: !!on } });
    this.pushHistory(on ? '天慧符通灵：自动嘘寒问暖已开启——情谊窗口一到即代为传讯' : '天慧符通灵：自动嘘寒问暖已关闭', 'item');
    return { ok: true };
  },

  /**
   * 设置银市量化规则（需已祭炼通灵宝）
   * @param scope 'all' 或银股 id
   * @param rule { buyBelow?, buyQty?, sellAbove?, sellQty? }（空对象 = 清除）
   */
  setStockRule(scope, rule) {
    const th = this.state.tianhui;
    if (!th?.tongling) return { ok: false, reason: '需先祭炼天慧通灵宝' };
    const rules = { ...(th.rules ?? {}) };
    const clean = {};
    for (const k of ['buyBelow', 'buyQty', 'sellAbove', 'sellQty']) {
      const v = Number(rule?.[k]);
      if (Number.isFinite(v) && v > 0) clean[k] = Math.round(v);
    }
    if (Object.keys(clean).length) rules[scope] = clean;
    else delete rules[scope];
    this.set({ tianhui: { ...th, rules } });
    return { ok: true };
  },

  /* ---------- 宗门 ---------- */

  joinSect(sectId) {
    const s = this.state;
    if (s.sect === sectId) return { ok: false, reason: '已是本门弟子' };
    if (s.sect) return { ok: false, reason: '已有所属宗门，不可改投' };
    const sect = SECTS[sectId];
    if (!sect) return { ok: false, reason: '宗门不存在' };
    const check = canJoinSect(sectId, { ...s, affinity: s.sectAffinity });
    if (!check.ok) return check;
    this.set({ sect: sectId });
    this.pushHistory(`拜入【${sect.name}】——${sect.desc}`, 'sect');
    return { ok: true, sect };
  }
};
