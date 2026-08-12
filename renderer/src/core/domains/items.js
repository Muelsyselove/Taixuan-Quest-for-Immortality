// 领域：物品（获得 / 使用 / 堆叠）
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
// V2.4：可堆叠物品（草药等材料）以 count 聚合显示（如「剑叶草 ×6」）；
//       草药采集所得直接入背包，炼丹亦从背包支取。
import { CONFIG } from '../config.js';
import { getHerbItem, herbPrice } from '../mapItems.js';

export const itemDomain = {
  /** 物品的可堆叠键：草药按 herbKey 堆叠，其余物品各自独立 */
  _stackKeyOf(item) {
    return item?.herbKey ? `herb:${item.herbKey}` : null;
  },

  addItem(item) {
    if (!item?.name) return null;
    const rarityOk = CONFIG.rarities.some(r => r.key === item.rarity);
    // 分类校验：对话模式分类 + 地图模式扩展分类（herb/pill）
    const catOk = CONFIG.itemCategories.some(c => c.key === item.category)
      || ['herb', 'pill'].includes(item.category);

    // 堆叠：命中既有堆则合并数量
    const stackKey = this._stackKeyOf(item);
    const gain = Math.max(1, Math.round(item.count ?? 1));
    if (stackKey) {
      const list = [...this.state.items];
      const exist = list.find(i => this._stackKeyOf(i) === stackKey);
      if (exist) {
        exist.count = (exist.count ?? 1) + gain;
        this.set({ items: list });
        this.pushHistory(`获得【${exist.name}】×${gain}（现有 ${exist.count}）`, 'item');
        return exist;
      }
    }

    const entry = {
      id: `it-${Date.now()}-${++this._uid}`,
      name: String(item.name),
      desc: String(item.desc || ''),
      effect: String(item.effect || ''),
      rarity: rarityOk ? item.rarity : 'pingfan',
      category: catOk ? item.category : 'qiwu',
      day: this.state.day,
      usable: !!item.usable,
      effects: item.effects && typeof item.effects === 'object' ? item.effects : {},
      grant: item.grant && typeof item.grant === 'object' ? item.grant : null,
      count: gain,
      // 地图模式扩展字段：售价 / 突破境界 / 丹药品质 / 草药键 / 唯一之物
      price: item.price && typeof item.price === 'object' ? { ...item.price } : null,
      breakthrough: typeof item.breakthrough === 'number' ? item.breakthrough : undefined,
      quality: typeof item.quality === 'number' ? item.quality : undefined,
      herbKey: typeof item.herbKey === 'string' ? item.herbKey : undefined,
      unique: typeof item.unique === 'string' ? item.unique : undefined
    };
    this.set({ items: [...this.state.items, entry] });
    const r = CONFIG.rarities.find(x => x.key === entry.rarity);
    this.pushHistory(`获得${r.label}之物【${entry.name}】${gain > 1 ? `×${gain}` : ''}`, 'item');
    return entry;
  },

  /** 草药入背包（可堆叠；V2.4 起草药不再入独立库存） */
  addHerb(key, n = 1) {
    const base = getHerbItem(key);
    if (!base) return null;
    return this.addItem({ ...base, count: n, price: herbPrice(key) });
  },

  /** 背包草药库存视图：{ herbKey: count }（炼丹/商店读取） */
  herbCounts() {
    const out = {};
    for (const it of this.state.items) {
      if (it.herbKey) out[it.herbKey] = (out[it.herbKey] ?? 0) + (it.count ?? 1);
    }
    return out;
  },

  /** 从背包支取草药：{ herbKey: n }（不足时调用方应先校验） */
  consumeHerbs(consumed = {}) {
    const list = [...this.state.items];
    for (const [key, n] of Object.entries(consumed)) {
      let need = n;
      for (const it of list) {
        if (!need || it.herbKey !== key) continue;
        const take = Math.min(need, it.count ?? 1);
        it.count = (it.count ?? 1) - take;
        need -= take;
      }
    }
    this.set({ items: list.filter(i => (i.count ?? 1) > 0) });
  },

  /** 从背包移除一件物品（堆叠品减一），返回移除后的残余 */
  _takeItem(id) {
    const list = [...this.state.items];
    const idx = list.findIndex(i => i.id === id);
    if (idx < 0) return null;
    const item = list[idx];
    if ((item.count ?? 1) > 1) {
      item.count -= 1;
      this.set({ items: list });
    } else {
      list.splice(idx, 1);
      this.set({ items: list });
    }
    return item;
  },

  useItem(id) {
    const item = this.state.items.find(i => i.id === id);
    if (!item || !item.usable) return false;
    // 1) 数值效果（hp/mp/atk/cultivation…）
    this.applyEffects(item.effects);
    // 2) 授予效果：技能 / 天赋 / 常驻增益 / 行程方式——全部在系统中注册
    const g = item.grant;
    if (g) {
      if (g.skill?.name) this.grantSkill({ ...g.skill });
      if (g.talent?.name) this.grantSkill({ ...g.talent, type: 'talent' });
      if (g.buff?.name) this.addBuff(g.buff);
      if (g.travel) this.grantTravel(g.travel); // 坐骑 / 御剑飞行（V2.4）
    }
    this._takeItem(id);
    this.pushHistory(`使用了【${item.name}】——${item.effect}`);
    return true;
  }
};
