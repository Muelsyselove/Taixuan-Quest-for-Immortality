// 领域：地图模式（三级位置 / 时间推进与寿元 / 赶路 / 修炼 / 采药 / 炼丹 / 突破）
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
import { CONFIG } from '../config.js';
import { advanceTime, formatTime, isLifespanOver, TIME_COST } from '../time.js';
import { alchemize, getAlchemyLevel, HERBS } from '../alchemy.js';
import { attemptBreakthrough } from '../breakthrough.js';
import { MAP_ITEMS } from '../mapItems.js';
import { WORLD_MAP } from '../mapData.js';
import { libraryFor } from '../skills.js';

export const mapDomain = {
  /** 切换地图位置 { world, region, scene }（缺省层级置空） */
  setMapLocation(loc) {
    this.set({ mapLocation: { world: null, region: null, scene: null, ...loc } });
  },

  /**
   * 时间推进（月为单位）+ 寿元判定
   * @returns {{died:boolean}} 寿元已尽时角色陨落（state.dead 置位）
   */
  advanceMapTime(months = 1) {
    if (this.state.mode !== 'map' || this.state.dead) return { died: false };
    const mapTime = advanceTime(this.state.mapTime, months);
    this.set({ mapTime });
    if (isLifespanOver(mapTime, this.state.realmIndex)) {
      this.set({ dead: { reason: 'lifespan', at: mapTime } });
      this.pushHistory(`寿元已尽，道友坐化陨落于${formatTime(mapTime)}，一生修行付诸东流`, 'death');
      return { died: true };
    }
    return { died: false };
  },

  /** 赶路：前往大世界节点（异地耗时1月，原地免费直入） */
  travelTo(worldId) {
    const node = WORLD_MAP.nodes.find(n => n.id === worldId);
    if (!node) return { ok: false };
    if (this.state.mapLocation?.world === worldId) {
      this.setMapLocation({ world: worldId, region: worldId, scene: null });
      return { ok: true, died: false, moved: false };
    }
    const { died } = this.advanceMapTime(TIME_COST.travel);
    if (died) return { ok: true, died: true, moved: false };
    this.pushHistory(`跋山涉水月余，抵达【${node.name}】`, 'travel');
    this.setMapLocation({ world: worldId, region: worldId, scene: null });
    return { ok: true, died: false, moved: true };
  },

  /** 闭关修炼：按月计修为收益（bonus 为宗门/场景加成） */
  mapCultivate(months, bonus = 0) {
    const per = 10 + this.state.realmIndex * 5;
    const gain = Math.round(per * months * (1 + bonus));
    const { died } = this.advanceMapTime(months);
    if (died) return { died: true, gain: 0 };
    this.applyEffects({ cultivation: gain });
    this.pushHistory(`潜心闭关 ${months} 月，修为 +${gain}`, 'cultivate');
    return { died: false, gain };
  },

  /** 起居休息：气血法力尽复（居家安歇，不耗时） */
  mapRest() {
    this.set({ hp: this.effStat('maxHp'), mp: this.effStat('maxMp') });
    this.pushHistory('安歇休整，气血法力尽复', 'rest');
    return { ok: true };
  },

  /** 练功房：耗时1月 + 100银元，攻/防精进 + 修为 */
  mapTrain() {
    if (!this.payWealth({ silver: 100 })) return { ok: false, reason: '银元不足（需 100 银元）' };
    const { died } = this.advanceMapTime(TIME_COST.cultivate);
    if (died) return { ok: true, died: true };
    const stat = Math.random() < 0.5 ? 'atk' : 'pdef';
    this.applyEffects({ [stat]: 1, cultivation: 10 });
    this.pushHistory(`练功房苦练一月，${stat === 'atk' ? '攻击' : '物防'} +1，修为 +10`, 'cultivate');
    return { ok: true, died: false };
  },

  /** 藏书阁研读：耗时1月，优先领悟未习得的灵根相符功法，否则修为 +30 */
  mapStudy() {
    const s = this.state;
    const { died } = this.advanceMapTime(TIME_COST.cultivate);
    if (died) return { ok: true, died: true };
    const known = new Set([...s.activeSkills, ...s.passiveSkills].map(x => x.name));
    const roots = s.roots.length ? s.roots : ['wu'];
    const pool = [...libraryFor(roots, 'active'), ...libraryFor(roots, 'passive')]
      .filter(sk => !known.has(sk.name));
    if (pool.length) {
      const hit = pool[Math.floor(Math.random() * pool.length)];
      this.grantSkill({ type: hit.cost != null ? 'active' : 'passive', name: hit.name });
      return { ok: true, died: false, learned: hit.name };
    }
    this.applyEffects({ cultivation: 30 });
    this.pushHistory('研读典籍一月，温故知新，修为 +30', 'cultivate');
    return { ok: true, died: false, learned: null };
  },

  /** 宗门任务：耗时2月，赏银 + 宗门好感 + 修为 */
  mapQuest() {
    const s = this.state;
    if (!s.sect) return { ok: false, reason: '尚未拜入宗门' };
    const { died } = this.advanceMapTime(TIME_COST.quest);
    if (died) return { ok: true, died: true };
    const silver = 150 + Math.floor(Math.random() * 150);
    this.gainWealth({ silver });
    const sectAffinity = { ...s.sectAffinity, [s.sect]: (s.sectAffinity[s.sect] ?? 0) + 2 };
    this.set({ sectAffinity });
    this.applyEffects({ cultivation: 20 });
    this.pushHistory(`完成宗门任务，赏银 ${silver}，宗门好感 +2，修为 +20`, 'quest');
    return { ok: true, died: false, silver };
  },

  /** 野外探寻草药：耗时1月，按稀有度加权采得 1~3 株 */
  mapGatherHerbs() {
    const { died } = this.advanceMapTime(TIME_COST.cultivate);
    if (died) return { ok: true, died: true, herbs: [] };
    const keys = Object.keys(HERBS);
    const got = [];
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      const pool = keys.filter(k => {
        const v = HERBS[k].value;
        return roll < 0.55 ? v <= 1 : roll < 0.8 ? v <= 2 : roll < 0.95 ? v <= 4 : true;
      });
      const key = pool[Math.floor(Math.random() * pool.length)];
      this.addHerb(key, 1);
      got.push(HERBS[key].name);
    }
    this.pushHistory(`野外探寻月余，采得 ${got.join('、')}`, 'gather');
    return { ok: true, died: false, herbs: got };
  },

  addHerb(key, n = 1) {
    const herbs = { ...this.state.herbs };
    herbs[key] = Math.max(0, (herbs[key] ?? 0) + n);
    this.set({ herbs });
  },

  /** 炼丹：消耗草药 + 耗时1月，成败按炼丹等级与草药品质判定 */
  mapAlchemy(recipeKey) {
    const s = this.state;
    const res = alchemize(recipeKey, s.herbs, s.alchemyLevel, s.alchemyExp);
    if (!res.ok) return res;
    const herbs = { ...s.herbs };
    for (const [k, n] of Object.entries(res.consumed)) herbs[k] = Math.max(0, (herbs[k] ?? 0) - n);
    const beforeLv = getAlchemyLevel(s.alchemyExp).level;
    const alchemyExp = s.alchemyExp + res.expGain;
    const after = getAlchemyLevel(alchemyExp);
    this.set({ herbs, alchemyExp, alchemyLevel: after.level });

    const { died } = this.advanceMapTime(TIME_COST.alchemy);
    if (died) return { ...res, died: true };
    if (after.level > beforeLv) {
      this.pushHistory(`丹道精进——晋升为【${after.name}】（成功率 ${Math.round(after.successRate * 100)}%）`, 'skill');
    }
    if (res.success) {
      const isPill = !!res.pill.effects.breakthrough;
      const effectText = isPill ? '突破大境界时服用，提升成功率' :
        Object.entries(res.pill.effects).map(([k, v]) => `${CONFIG.stats.find(x => x.key === k)?.label ?? k} +${v}`).join('，');
      this.addItem({
        name: res.pill.name, desc: res.pill.desc, effect: effectText,
        rarity: res.pill.rarity, category: isPill ? 'pill' : 'dan',
        usable: !isPill, effects: isPill ? {} : res.pill.effects,
        quality: res.pill.quality,
        breakthrough: isPill ? res.pill.effects.breakthrough : undefined,
        price: MAP_ITEMS[this._pillItemKey(res.pill.name)]?.price ?? null
      });
    }
    this.pushHistory(res.message, 'alchemy');
    return { ...res, died: false };
  },

  _pillItemKey(pillName) {
    return Object.keys(MAP_ITEMS).find(k => MAP_ITEMS[k].name === pillName) ?? null;
  },

  /** 大境界突破：可服用突破丹提升成功率；失败回退一个大境界 */
  mapBreakthrough(pillItemId = null) {
    const s = this.state;
    const pill = pillItemId ? s.items.find(i => i.id === pillItemId) : null;
    const res = attemptBreakthrough(s, pill?.quality ?? 0);
    if (!res.ok) return res;
    if (pill) this.set({ items: this.state.items.filter(i => i.id !== pillItemId) }); // 丹药已服

    const patch = {};
    if (res.success) {
      this._applyRealmUp(patch, s, res.nextRealm);
      patch.cultivation = 0;
      this.set(patch);
      this.pushHistory(`天雷淬体，道基重铸——突破至【${res.realmName}】！`, 'breakthrough');
    } else {
      const rb = res.rollbackRealm;
      patch.realmIndex = rb;
      patch.realm = CONFIG.realms[rb];
      patch.cultivationCap = Math.max(100, Math.round(s.cultivationCap / 1.6));
      patch.maxHp = Math.max(100, Math.round(s.maxHp / 1.35));
      patch.maxMp = Math.max(60, Math.round(s.maxMp / 1.3));
      patch.hp = patch.maxHp;
      patch.mp = patch.maxMp;
      patch.atk = Math.max(12, s.atk - 6);
      patch.pdef = Math.max(6, s.pdef - 3);
      patch.mdef = Math.max(5, s.mdef - 3);
      patch.cultivation = Math.min(res.keepCultivation, patch.cultivationCap - 1);
      this.set(patch);
      this.pushHistory(res.message, 'death');
    }
    return res;
  }
};
