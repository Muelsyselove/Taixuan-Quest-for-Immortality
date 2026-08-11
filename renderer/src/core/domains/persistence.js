// 领域：存档序列化（按域分文件）与角色重置
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
import { CONFIG } from '../config.js';
import { splitState, mergeDomains } from '../data.js';

export const persistenceDomain = {
  /* ---------- 存档序列化（按域分文件） ---------- */

  /** 拆分为域文件集合：{ profile: {...}, inventory: {...}, ... } */
  serializeDomains() {
    const { combat, busy, aiReady, event, ...persisted } = this.state;
    return splitState(persisted);
  },

  /** 旧版整树序列化（仅用于读取 legacy 存档时的兼容路径） */
  serialize() {
    const { combat, busy, aiReady, ...rest } = this.state;
    return { version: 3, savedAt: Date.now(), state: structuredClone(rest) };
  },

  /** 从域文件集合恢复 */
  deserializeDomains(files) {
    const partial = mergeDomains(files);
    if (!Object.keys(partial).length) return false;
    return this._applyLoaded(partial);
  },

  /** 旧版整树恢复（兼容） */
  deserialize(data) {
    if (!data?.state) return false;
    return this._applyLoaded(data.state);
  },

  _applyLoaded(partialState) {
    const base = structuredClone(CONFIG.initialState);
    const merged = { ...base, ...partialState };
    merged.realm = CONFIG.realms[merged.realmIndex] ?? CONFIG.realms[0];
    merged.combat = null;
    merged.busy = false;
    merged.event = null; // 重新推进剧情
    if (!Array.isArray(merged.relations)) merged.relations = [];
    if (!Array.isArray(merged.history)) merged.history = [];
    this.state = merged;
    this._emit(['*']);
    return true;
  },

  /* ---------- 新开征程：角色设定后重置 ---------- */

  /**
   * @param setup { roots:string[], talents:[], passives:[], actives:[], name?:string, origin?:string }
   * 技能条目为技能库完整定义（含 buffs/mods 等结构化字段），整体克隆保留
   */
  reset(setup = {}) {
    const fresh = structuredClone(CONFIG.initialState);
    fresh.realm = CONFIG.realms[fresh.realmIndex];
    fresh.event = null;
    fresh.history = [];
    fresh.busy = false;
    fresh.aiReady = this.state.aiReady;
    fresh.combat = null;
    fresh.relations = [];
    fresh.customSkills = { active: [], passive: [] };

    if (setup.name) fresh.name = String(setup.name).slice(0, 12);
    if (setup.origin) fresh.origin = String(setup.origin).slice(0, 100);
    fresh.roots = Array.isArray(setup.roots) ? [...setup.roots] : [];
    if (Array.isArray(setup.talents)) {
      fresh.talents = setup.talents.map(t => {
        const e = { name: String(t.name), desc: String(t.desc || '') };
        if (t.mods) e.mods = { ...t.mods };
        return e;
      });
    }
    if (Array.isArray(setup.passives) && setup.passives.length) {
      fresh.passiveSkills = setup.passives.map(p => structuredClone(p));
    }
    if (Array.isArray(setup.actives) && setup.actives.length) {
      fresh.activeSkills = setup.actives.map(a => structuredClone(a));
    }

    this.state = fresh;
    this.pushHistory('新程既启，踏入太玄大陆', 'normal');
    this._emit(['*']);
  }
};
