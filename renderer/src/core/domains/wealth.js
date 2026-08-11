// 领域：财富（银元/灵石）、商店（地图模式物品）、宗门
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
import { canAfford, pay as wealthPay, gain as wealthGain, EXCHANGE_RATE } from '../wealth.js';
import { MAP_ITEMS } from '../mapItems.js';
import { SECTS, canJoinSect } from '../mapData.js';

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
    if (!this.payWealth(def.price ?? {})) return { ok: false, reason: '资财不足' };
    const entry = this.addItem({ ...def, price: def.price ?? null });
    this.pushHistory(`购得【${def.name}】`, 'wealth');
    return { ok: true, item: entry };
  },

  /** 出售：按标价半价回收（无标价按稀有度估值） */
  sellMapItem(itemId) {
    const s = this.state;
    const item = s.items.find(i => i.id === itemId);
    if (!item) return { ok: false };
    const base = item.price
      ? (item.price.silver ?? 0) + (item.price.spirit ?? 0) * EXCHANGE_RATE
      : (SELL_PRICE_BY_RARITY[item.rarity] ?? 25);
    const silver = Math.max(1, Math.floor(base / 2));
    this.set({ items: s.items.filter(i => i.id !== itemId) });
    this.gainWealth({ silver });
    this.pushHistory(`售出【${item.name}】，得银 ${silver}`, 'wealth');
    return { ok: true, silver };
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
