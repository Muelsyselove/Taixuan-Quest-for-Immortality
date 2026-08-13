// 领域：技能授予（库技能解析 + 存档专属注册）与常驻增益
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
import { CONFIG } from '../config.js';
import { findSkill } from '../skills.js';

export const skillDomain = {
  /** mods 数值钳制：比例类（*Pct / crit / dodge）钳制到 ±1，固定值类钳制到 ±50 */
  _clampMods(src) {
    const mods = {};
    if (!src || typeof src !== 'object') return mods;
    for (const [k, v] of Object.entries(src)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const isRatio = k.endsWith('Pct') || k === 'crit' || k === 'dodge';
      mods[k] = isRatio ? Math.max(-1, Math.min(1, v)) : Math.max(-50, Math.min(50, v));
    }
    return mods;
  },

  /**
   * 授予技能/天赋
   * - 名称命中预配置技能库：以库定义为准授予（忽略调用方给的数值）
   * - 天赋(talent)：自由注册（AI 生成，要求带明确数值 mods）
   * - 库中不存在的主动/被动：转入 registerCustomSkill，注册为当前存档专属技能
   */
  grantSkill(grant) {
    if (!grant?.name) return;
    if (grant.type === 'talent') return this._learnTalent(grant);

    const found = findSkill(grant.name);
    if (found) {
      const def = structuredClone(found.def);
      if (found.root !== 'wu') def.root = found.root;
      return this._learnSkill(found.type, def, false);
    }
    return this.registerCustomSkill(grant);
  },

  /** 学习技能（写入对应列表，查重） */
  _learnSkill(type, def, custom) {
    const bucket = type === 'active' ? 'activeSkills' : 'passiveSkills';
    const list = [...this.state[bucket]];
    if (list.some(s => s.name === def.name)) return;
    const entry = { name: String(def.name), desc: String(def.desc || '') };
    if (type === 'active') {
      entry.cost = typeof def.cost === 'number' ? def.cost : 10;
      for (const k of ['mult', 'healMult', 'mpGain', 'shieldLayers', 'barrierMult']) {
        if (typeof def[k] === 'number') entry[k] = def[k];
      }
      if (def.root) entry.root = def.root;
      if (Array.isArray(def.buffs) && def.buffs.length) entry.buffs = structuredClone(def.buffs);
    } else if (def.mods && typeof def.mods === 'object') {
      entry.mods = { ...def.mods };
    }
    if (custom) entry.custom = true; // 存档专属标记
    list.push(entry);
    this.set({ [bucket]: list });
    this.pushHistory(
      custom
        ? `天道垂青——悟得独属此世之${type === 'active' ? '神通' : '心法'}【${entry.name}】`
        : `领悟${type === 'active' ? '主动技能' : '被动技能'}【${entry.name}】`,
      'skill'
    );
  },

  _learnTalent(grant) {
    const list = [...this.state.talents];
    if (list.some(t => t.name === grant.name)) return;
    const entry = { name: String(grant.name), desc: String(grant.desc || '') };
    if (grant.mods && typeof grant.mods === 'object') entry.mods = this._clampMods(grant.mods);
    this.set({ talents: [...list, entry] });
    this.pushHistory(`觉醒天赋【${entry.name}】`, 'skill');
  },

  /**
   * 注册存档专属技能（AI 仅剧情需要时创建；仅当前存档及其后续存档生效）
   * 技能本体写入 customSkills 数据域（随存档持久化），同时直接授予玩家。
   */
  registerCustomSkill(def) {
    const type = def.type === 'passive' ? 'passive' : 'active';
    const custom = { active: [], passive: [], ...(this.state.customSkills || {}) };
    const list = [...(custom[type] || [])];
    const name = String(def.name || '').slice(0, 12);
    if (!name || list.some(s => s.name === name)) return;

    const entry = { name, desc: String(def.desc || '').slice(0, 80) };
    if (type === 'active') {
      entry.cost = Math.max(0, Math.round(typeof def.cost === 'number' ? def.cost : 10));
      const num = (v, lo, hi) => (typeof v === 'number' && v >= lo && v <= hi ? v : undefined);
      entry.mult = num(def.mult, 0, 3.5);
      entry.healMult = num(def.healMult, 0, 3);
      entry.mpGain = num(def.mpGain, 0, 60);
      entry.shieldLayers = num(def.shieldLayers, 1, 3);
      entry.barrierMult = num(def.barrierMult, 0, 2.5);
      for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];
      if (def.root && CONFIG.roots.some(r => r.key === def.root)) entry.root = def.root;
      if (Array.isArray(def.buffs)) {
        const buffs = def.buffs.slice(0, 3).map(b => ({
          target: b?.target === 'enemy' ? 'enemy' : 'self',
          name: String(b?.name || '异象').slice(0, 8),
          turns: Math.max(1, Math.min(6, Math.round(b?.turns ?? 2))),
          stackable: !!b?.stackable,
          maxStacks: Math.max(1, Math.min(3, Math.round(b?.maxStacks ?? 1))),
          effects: (Array.isArray(b?.effects) ? b.effects : []).slice(0, 3)
            .filter(e => e && typeof e.key === 'string')
            .map(e => ({ ...e }))
        })).filter(b => b.effects.length);
        if (buffs.length) entry.buffs = buffs;
      }
    } else {
      entry.mods = this._clampMods(def.mods);
      if (def.root && CONFIG.roots.some(r => r.key === def.root)) entry.root = def.root;
    }

    custom[type] = [...list, entry];
    this.set({ customSkills: custom });
    this.pushHistory(`天机入梦——存档专属${type === 'active' ? '神通' : '心法'}【${name}】已铭刻于此世命轨`, 'skill');
    this._learnSkill(type, entry, true);
  },

  /* ---------- 常驻增益（buff 栏） ---------- */

  addBuff(buff) {
    if (!buff?.name) return null;
    if (this.state.buffs.some(b => b.name === buff.name)) return null;
    const entry = {
      id: `bf-${Date.now()}-${++this._uid}`,
      name: String(buff.name),
      desc: String(buff.desc || ''),
      mods: this._clampMods(buff.mods),
      day: this.state.day
    };
    this.set({ buffs: [...this.state.buffs, entry] });
    this.pushHistory(`获得增益【${entry.name}】——${entry.desc}`, 'buff');
    return entry;
  }
};
