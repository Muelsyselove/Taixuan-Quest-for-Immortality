// 游戏状态中心：单一数据源 + 订阅发布
import { CONFIG } from './config.js';
import { splitState, mergeDomains } from './data.js';

export class GameStore {
  constructor() {
    this.state = structuredClone(CONFIG.initialState);
    this.state.realm = CONFIG.realms[this.state.realmIndex];
    this.state.event = null;      // 当前事件 {event, options}
    this.state.history = [];      // 史册 [{day, text, kind}]
    this.state.busy = false;      // AI 思考中
    this.state.aiReady = false;   // AI 是否已配置
    this.state.combat = null;     // 战斗状态（非 null 即战斗中）
    this.state.relations = [];    // 人物关系 [{id,name,identity,relation,affinity,day}]
    this._listeners = new Map();  // key -> Set<fn>
    this._uid = 0;
  }

  get(path) {
    return path.split('.').reduce((o, k) => o?.[k], this.state);
  }

  set(patch, silentKeys = []) {
    const changed = [];
    for (const [k, v] of Object.entries(patch)) {
      if (this.state[k] !== v) {
        this.state[k] = v;
        changed.push(k);
      }
    }
    this._emit(changed.filter(k => !silentKeys.includes(k)));
  }

  subscribe(keys, fn) {
    const set = new Set(keys);
    const wrap = (changed) => {
      if (changed.some(k => set.has(k) || set.has('*'))) fn(changed);
    };
    if (!this._listeners.has(fn)) this._listeners.set(fn, wrap);
    return () => this._listeners.delete(fn);
  }

  _emit(changed) {
    if (!changed.length) return;
    for (const wrap of this._listeners.values()) wrap(changed);
  }

  /* ---------- 领域动作 ---------- */

  applyEffects(effects = {}) {
    const patch = {};
    const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
    const s = this.state;

    const apply = (key, delta) => {
      if (!delta) return;
      patch[key] = (patch[key] ?? s[key]) + delta;
    };
    apply('hp', num(effects.hp));
    apply('mp', num(effects.mp));
    apply('atk', num(effects.atk));
    apply('pdef', num(effects.pdef));
    apply('mdef', num(effects.mdef));
    const culDelta = num(effects.cultivation);
    apply('cultivation', culDelta > 0 ? Math.round(culDelta * this.cultivationMult()) : culDelta);

    // 钳制
    if (patch.hp != null) patch.hp = Math.max(0, Math.min(patch.hp, s.maxHp));
    if (patch.mp != null) patch.mp = Math.max(0, Math.min(patch.mp, s.maxMp));
    if (patch.cultivation != null) patch.cultivation = Math.max(0, patch.cultivation);

    // 突破判定：修为满则破境
    if ((patch.cultivation ?? s.cultivation) >= s.cultivationCap) {
      const next = Math.min(s.realmIndex + 1, CONFIG.realms.length - 1);
      if (next !== s.realmIndex) {
        patch.realmIndex = next;
        patch.realm = CONFIG.realms[next];
        patch.cultivation = (patch.cultivation ?? s.cultivation) - s.cultivationCap;
        patch.cultivationCap = Math.round(s.cultivationCap * 1.6);
        patch.maxHp = Math.round(s.maxHp * 1.35);
        patch.maxMp = Math.round(s.maxMp * 1.3);
        patch.hp = patch.maxHp;
        patch.mp = patch.maxMp;
        patch.atk = (patch.atk ?? s.atk) + 6;
        patch.pdef = (patch.pdef ?? s.pdef) + 3;
        patch.mdef = (patch.mdef ?? s.mdef) + 3;
        this.pushHistory(`天雷淬体，道基重铸——突破至【${patch.realm}】！`, 'breakthrough');
      }
    }

    // 死亡判定
    if ((patch.hp ?? s.hp) <= 0) {
      patch.hp = Math.round((patch.maxHp ?? s.maxHp) * 0.3);
      patch.cultivation = Math.round((patch.cultivation ?? s.cultivation) * 0.7);
      this.pushHistory('道友身受重伤，一缕残魂遁入轮回，侥幸保命但修为受损', 'death');
    }

    // 被动技能·吐纳术：每回合恢复
    if (s.passiveSkills.some(sk => sk.name === '吐纳术')) {
      patch.hp = Math.min(patch.maxHp ?? s.maxHp, (patch.hp ?? s.hp) + 2);
      patch.mp = Math.min(patch.maxMp ?? s.maxMp, (patch.mp ?? s.mp) + 2);
    }

    this.set(patch);
  }

  grantSkill(grant) {
    if (!grant?.name) return;
    const bucket = { active: 'activeSkills', passive: 'passiveSkills', talent: 'talents' }[grant.type];
    if (!bucket) return;
    const list = [...this.state[bucket]];
    if (list.some(s => s.name === grant.name)) return;
    const entry = { name: grant.name, desc: grant.desc || '' };
    if (grant.type === 'active') {
      entry.cost = typeof grant.cost === 'number' ? grant.cost : 10;
      entry.mult = typeof grant.mult === 'number' ? grant.mult : 1.5;
      if (grant.root) entry.root = grant.root;
    }
    if (grant.mods && typeof grant.mods === 'object') entry.mods = { ...grant.mods };
    list.push(entry);
    this.set({ [bucket]: list });
    this.pushHistory(`领悟${{ active: '主动技能', passive: '被动技能', talent: '天赋' }[grant.type]}【${grant.name}】`, 'skill');
  }

  /* ---------- 常驻增益（buff 栏） ---------- */

  addBuff(buff) {
    if (!buff?.name) return null;
    if (this.state.buffs.some(b => b.name === buff.name)) return null;
    const entry = {
      id: `bf-${Date.now()}-${++this._uid}`,
      name: String(buff.name),
      desc: String(buff.desc || ''),
      mods: buff.mods && typeof buff.mods === 'object' ? { ...buff.mods } : {},
      day: this.state.day
    };
    this.set({ buffs: [...this.state.buffs, entry] });
    this.pushHistory(`获得增益【${entry.name}】——${entry.desc}`, 'buff');
    return entry;
  }

  /** 汇总 buff/被动/天赋中的结构化加成 */
  _modSum(key) {
    const s = this.state;
    let sum = 0;
    for (const src of [s.buffs, s.passiveSkills, s.talents]) {
      for (const it of src) {
        const v = it.mods?.[key];
        if (typeof v === 'number') sum += v;
      }
    }
    return sum;
  }

  /** 有效属性 = 基础值 + 各类加成（战斗/结算用） */
  effStat(key) {
    return (this.state[key] ?? 0) + this._modSum(key);
  }

  /** 修为获取加成倍率（来自 cultivationPct 加成） */
  cultivationMult() {
    return 1 + this._modSum('cultivationPct');
  }

  /* ---------- 物品 ---------- */

  addItem(item) {
    if (!item?.name) return null;
    const rarityOk = CONFIG.rarities.some(r => r.key === item.rarity);
    const catOk = CONFIG.itemCategories.some(c => c.key === item.category);
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
      grant: item.grant && typeof item.grant === 'object' ? item.grant : null
    };
    this.set({ items: [...this.state.items, entry] });
    const r = CONFIG.rarities.find(x => x.key === entry.rarity);
    this.pushHistory(`获得${r.label}之物【${entry.name}】`, 'item');
    return entry;
  }

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

  /* ---------- 人物关系 ---------- */

  /**
   * 注册/更新出场角色：{name, identity, relation, affinity, delta}
   * - 新角色：登记姓名/身份/关系/初始好感（默认 0）
   * - 已登记：补充身份/关系描述，好感按 delta 增减（或 affinity 直接设值）
   */
  upsertRelation(entry) {
    if (!entry?.name) return null;
    const name = String(entry.name).slice(0, 20);
    const list = [...this.state.relations];
    const idx = list.findIndex(r => r.name === name);
    const clampAff = (v) => Math.max(-100, Math.min(100, Math.round(v)));

    if (idx >= 0) {
      const cur = list[idx];
      const next = { ...cur };
      if (entry.identity) next.identity = String(entry.identity).slice(0, 30);
      if (entry.relation) next.relation = String(entry.relation).slice(0, 40);
      if (typeof entry.affinity === 'number') next.affinity = clampAff(entry.affinity);
      if (typeof entry.delta === 'number' && entry.delta) next.affinity = clampAff(next.affinity + entry.delta);
      if (next.affinity !== cur.affinity) {
        this.pushHistory(`【${name}】好感${next.affinity > cur.affinity ? '升温' : '转冷'}至 ${next.affinity}`, 'relation');
      }
      list[idx] = next;
      this.set({ relations: list });
      return next;
    }

    const fresh = {
      id: `rl-${Date.now()}-${++this._uid}`,
      name,
      identity: String(entry.identity || '身份未明').slice(0, 30),
      relation: String(entry.relation || '萍水相逢').slice(0, 40),
      affinity: clampAff(typeof entry.affinity === 'number' ? entry.affinity : 0),
      day: this.state.day
    };
    list.push(fresh);
    this.set({ relations: list });
    this.pushHistory(`结识【${fresh.name}】——${fresh.identity}，${fresh.relation}`, 'relation');
    return fresh;
  }

  /* ---------- 事件 / 史册 ---------- */

  setEvent(ev) { this.set({ event: ev }); }

  pushHistory(text, kind = 'normal') {
    const history = [...this.state.history, { day: this.state.day, text, kind, t: Date.now() }];
    this.set({ history });
  }

  nextDay() { this.set({ day: this.state.day + 1 }); }

  setLocation(loc) {
    if (loc && loc !== this.state.location && CONFIG.map.nodes.some(n => n.id === loc)) {
      this.set({ location: loc });
    }
  }

  /* ---------- 存档序列化（按域分文件） ---------- */

  /** 拆分为域文件集合：{ profile: {...}, inventory: {...}, ... } */
  serializeDomains() {
    const { combat, busy, aiReady, event, ...persisted } = this.state;
    return splitState(persisted);
  }

  /** 旧版整树序列化（仅用于读取 legacy 存档时的兼容路径） */
  serialize() {
    const { combat, busy, aiReady, ...rest } = this.state;
    return { version: 3, savedAt: Date.now(), state: structuredClone(rest) };
  }

  /** 从域文件集合恢复 */
  deserializeDomains(files) {
    const partial = mergeDomains(files);
    if (!Object.keys(partial).length) return false;
    return this._applyLoaded(partial);
  }

  /** 旧版整树恢复（兼容） */
  deserialize(data) {
    if (!data?.state) return false;
    return this._applyLoaded(data.state);
  }

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
  }

  /* ---------- 新开征程：角色设定后重置 ---------- */

  /**
   * @param setup { roots:string[], talents:[], passives:[], actives:[], name?:string, origin?:string }
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
      fresh.passiveSkills = setup.passives.map(p => {
        const e = { name: String(p.name), desc: String(p.desc || '') };
        if (p.mods) e.mods = { ...p.mods };
        return e;
      });
    }
    if (Array.isArray(setup.actives) && setup.actives.length) {
      fresh.activeSkills = setup.actives.map(a => {
        const e = {
          name: String(a.name), desc: String(a.desc || ''),
          cost: typeof a.cost === 'number' ? a.cost : 10,
          mult: typeof a.mult === 'number' ? a.mult : 1.5
        };
        if (a.root) e.root = a.root;
        return e;
      });
    }

    this.state = fresh;
    this.pushHistory('新程既启，踏入太玄大陆', 'normal');
    this._emit(['*']);
  }

  // 供 AI 参考的角色快照
  snapshot() {
    const s = this.state;
    return {
      姓名: s.name, 出身: s.origin || '未明', 境界: s.realm, 生命: `${s.hp}/${s.maxHp}`, 法力: `${s.mp}/${s.maxMp}`,
      攻击: s.atk, 物防: s.pdef, 法防: s.mdef, 修为: `${s.cultivation}/${s.cultivationCap}`,
      灵根: s.roots.map(k => CONFIG.roots.find(r => r.key === k)?.label ?? k).join('、') || '未测',
      主动技能: s.activeSkills.map(x => `${x.name}(耗蓝${x.cost ?? 10},倍率${x.mult ?? 1.5})`),
      被动技能: s.passiveSkills.map(x => x.name),
      天赋: s.talents.map(x => x.name),
      常驻增益: s.buffs.map(x => `${x.name}(${x.desc})`),
      持有物品: s.items.slice(-10).map(x => `${x.name}(${CONFIG.rarities.find(r => r.key === x.rarity)?.label})`),
      人物关系: s.relations.map(r => `${r.name}(${r.identity}，${r.relation}，好感${r.affinity})`),
      当前地点: CONFIG.map.nodes.find(n => n.id === s.location)?.name,
      地点列表: CONFIG.map.nodes.map(n => `${n.id}=${n.name}`).join('，'),
      天数: s.day
    };
  }
}
