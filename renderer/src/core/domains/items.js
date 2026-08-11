// 领域：物品（获得 / 使用）
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
import { CONFIG } from '../config.js';

export const itemDomain = {
  addItem(item) {
    if (!item?.name) return null;
    const rarityOk = CONFIG.rarities.some(r => r.key === item.rarity);
    // 分类校验：对话模式分类 + 地图模式扩展分类（herb/pill）
    const catOk = CONFIG.itemCategories.some(c => c.key === item.category)
      || ['herb', 'pill'].includes(item.category);
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
      // 地图模式扩展字段：售价 / 突破境界 / 丹药品质 / 草药键
      price: item.price && typeof item.price === 'object' ? { ...item.price } : null,
      breakthrough: typeof item.breakthrough === 'number' ? item.breakthrough : undefined,
      quality: typeof item.quality === 'number' ? item.quality : undefined,
      herbKey: typeof item.herbKey === 'string' ? item.herbKey : undefined
    };
    this.set({ items: [...this.state.items, entry] });
    const r = CONFIG.rarities.find(x => x.key === entry.rarity);
    this.pushHistory(`获得${r.label}之物【${entry.name}】`, 'item');
    return entry;
  },

  useItem(id) {
    const item = this.state.items.find(i => i.id === id);
    if (!item || !item.usable) return false;
    // 1) 数值效果（hp/mp/atk/cultivation…）
    this.applyEffects(item.effects);
    // 2) 授予效果：技能 / 天赋 / 常驻增益——全部在系统中注册
    const g = item.grant;
    if (g) {
      if (g.skill?.name) this.grantSkill({ ...g.skill });
      if (g.talent?.name) this.grantSkill({ ...g.talent, type: 'talent' });
      if (g.buff?.name) this.addBuff(g.buff);
    }
    this.set({ items: this.state.items.filter(i => i.id !== id) });
    this.pushHistory(`使用了【${item.name}】——${item.effect}`);
    return true;
  }
};
