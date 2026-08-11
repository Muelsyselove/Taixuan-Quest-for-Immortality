// 游戏状态中心：单一数据源 + 订阅发布
import { CONFIG } from './config.js';
import { splitState, mergeDomains } from './data.js';
import { findSkill, libraryFor } from './skills.js';
import { advanceTime, formatTime, isLifespanOver, TIME_COST } from './time.js';
import { canAfford, pay as wealthPay, gain as wealthGain, EXCHANGE_RATE } from './wealth.js';
import { alchemize, getAlchemyLevel, HERBS } from './alchemy.js';
import { attemptBreakthrough } from './breakthrough.js';
import { MAP_ITEMS, getShopStock } from './mapItems.js';
import { SECTS, canJoinSect, WORLD_MAP } from './mapData.js';

// 无标价物品的出售估值（按稀有度，单位：银元）
const SELL_PRICE_BY_RARITY = {
  pingfan: 25, youxiu: 100, jingliang: 400,
  shishi: 1500, chuanshuo: 6000, honghuang: 20000, chuyuan: 50000
};

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
    const capHp = this.effStat('maxHp');
    const capMp = this.effStat('maxMp');

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

    // 钳制（上限含被动/天赋/buff 的 maxHp/maxMp 加成）
    if (patch.hp != null) patch.hp = Math.max(0, Math.min(patch.hp, capHp));
    if (patch.mp != null) patch.mp = Math.max(0, Math.min(patch.mp, capMp));
    if (patch.cultivation != null) patch.cultivation = Math.max(0, patch.cultivation);

    // 突破判定：修为满则破境（地图模式不自动突破，需走突破系统）
    if ((patch.cultivation ?? s.cultivation) >= s.cultivationCap) {
      if (s.mode === 'map') {
        patch.cultivation = s.cultivationCap; // 修为圆满，静待突破
      } else {
        const next = Math.min(s.realmIndex + 1, CONFIG.realms.length - 1);
        if (next !== s.realmIndex) {
          this._applyRealmUp(patch, s, next);
          patch.cultivation = (patch.cultivation ?? s.cultivation) - s.cultivationCap;
          this.pushHistory(`天雷淬体，道基重铸——突破至【${patch.realm}】！`, 'breakthrough');
        }
      }
    }

    // 死亡判定（切磋点到为止，不致陨落）
    if ((patch.hp ?? s.hp) <= 0) {
      if (s.combat?.spar) {
        patch.hp = 1;
      } else {
        patch.hp = Math.round(capHp * 0.3);
        patch.cultivation = Math.round((patch.cultivation ?? s.cultivation) * 0.7);
        this.pushHistory('道友身受重伤，一缕残魂遁入轮回，侥幸保命但修为受损', 'death');
      }
    }

    this.set(patch);
  }

  /** 境界提升的属性成长（patch 为待写入的补丁对象） */
  _applyRealmUp(patch, s, next) {
    patch.realmIndex = next;
    patch.realm = CONFIG.realms[next];
    patch.cultivationCap = Math.round(s.cultivationCap * 1.6);
    patch.maxHp = Math.round(s.maxHp * 1.35);
    patch.maxMp = Math.round(s.maxMp * 1.3);
    patch.hp = patch.maxHp;
    patch.mp = patch.maxMp;
    patch.atk = (patch.atk ?? s.atk) + 6;
    patch.pdef = (patch.pdef ?? s.pdef) + 3;
    patch.mdef = (patch.mdef ?? s.mdef) + 3;
  }

  /* ---------- 技能授予（库技能解析 + 存档专属注册） ---------- */

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
  }

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
  }

  _learnTalent(grant) {
    const list = [...this.state.talents];
    if (list.some(t => t.name === grant.name)) return;
    const entry = { name: String(grant.name), desc: String(grant.desc || '') };
    if (grant.mods && typeof grant.mods === 'object') entry.mods = { ...grant.mods };
    this.set({ talents: [...list, entry] });
    this.pushHistory(`觉醒天赋【${entry.name}】`, 'skill');
  }

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
      const mods = {};
      if (def.mods && typeof def.mods === 'object') {
        for (const [k, v] of Object.entries(def.mods)) {
          if (typeof v === 'number' && Number.isFinite(v)) mods[k] = Math.max(-50, Math.min(50, v));
        }
      }
      entry.mods = mods;
      if (def.root && CONFIG.roots.some(r => r.key === def.root)) entry.root = def.root;
    }

    custom[type] = [...list, entry];
    this.set({ customSkills: custom });
    this.pushHistory(`天机入梦——存档专属${type === 'active' ? '神通' : '心法'}【${name}】已铭刻于此世命轨`, 'skill');
    this._learnSkill(type, entry, true);
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

  /** 有效属性 = (基础值 + 固定加成) × (1 + 比例加成)；比例加成约定为 key+'Pct' */
  effStat(key) {
    const flat = (this.state[key] ?? 0) + this._modSum(key);
    const pct = this._modSum(`${key}Pct`);
    return Math.round(flat * (1 + pct));
  }

  /** 修为获取加成倍率（来自 cultivationPct 加成） */
  cultivationMult() {
    return 1 + this._modSum('cultivationPct');
  }

  /** 战斗衍生加成汇总：会心率/闪避率/常驻反伤/回合回复（来自被动与天赋 mods） */
  combatMods() {
    return {
      crit: this._modSum('crit'),
      dodge: this._modSum('dodge'),
      counterPct: this._modSum('counterPct'),
      hpRegen: this._modSum('hpRegen'),
      mpRegen: this._modSum('mpRegen')
    };
  }

  /* ---------- 物品 ---------- */

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
    const entry = { day: this.state.day, text, kind, t: Date.now() };
    if (this.state.mode === 'map') entry.when = formatTime(this.state.mapTime); // 地图模式以年/月计
    const history = [...this.state.history, entry];
    this.set({ history });
  }

  nextDay() { this.set({ day: this.state.day + 1 }); }

  setLocation(loc) {
    if (loc && loc !== this.state.location && CONFIG.map.nodes.some(n => n.id === loc)) {
      this.set({ location: loc });
    }
  }

  /* ==================== 地图模式 ==================== */

  /** 切换地图位置 { world, region, scene }（缺省层级置空） */
  setMapLocation(loc) {
    this.set({ mapLocation: { world: null, region: null, scene: null, ...loc } });
  }

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
  }

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
  }

  /** 闭关修炼：按月计修为收益（bonus 为宗门/场景加成） */
  mapCultivate(months, bonus = 0) {
    const per = 10 + this.state.realmIndex * 5;
    const gain = Math.round(per * months * (1 + bonus));
    const { died } = this.advanceMapTime(months);
    if (died) return { died: true, gain: 0 };
    this.applyEffects({ cultivation: gain });
    this.pushHistory(`潜心闭关 ${months} 月，修为 +${gain}`, 'cultivate');
    return { died: false, gain };
  }

  /** 起居休息：气血法力尽复（居家安歇，不耗时） */
  mapRest() {
    this.set({ hp: this.effStat('maxHp'), mp: this.effStat('maxMp') });
    this.pushHistory('安歇休整，气血法力尽复', 'rest');
    return { ok: true };
  }

  /** 练功房：耗时1月 + 100银元，攻/防精进 + 修为 */
  mapTrain() {
    if (!this.payWealth({ silver: 100 })) return { ok: false, reason: '银元不足（需 100 银元）' };
    const { died } = this.advanceMapTime(TIME_COST.cultivate);
    if (died) return { ok: true, died: true };
    const stat = Math.random() < 0.5 ? 'atk' : 'pdef';
    this.applyEffects({ [stat]: 1, cultivation: 10 });
    this.pushHistory(`练功房苦练一月，${stat === 'atk' ? '攻击' : '物防'} +1，修为 +10`, 'cultivate');
    return { ok: true, died: false };
  }

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
  }

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
  }

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
  }

  addHerb(key, n = 1) {
    const herbs = { ...this.state.herbs };
    herbs[key] = Math.max(0, (herbs[key] ?? 0) + n);
    this.set({ herbs });
  }

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
  }

  _pillItemKey(pillName) {
    return Object.keys(MAP_ITEMS).find(k => MAP_ITEMS[k].name === pillName) ?? null;
  }

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

  /* ---------- 财富（银元/灵石） ---------- */

  gainWealth(amount) { this.set({ wealth: wealthGain(this.state.wealth, amount) }); }
  canPay(price) { return canAfford(this.state.wealth, price); }
  /** 支付（灵石自动折算），成功返回 true */
  payWealth(price) {
    const w = wealthPay(this.state.wealth, price);
    if (!w) return false;
    this.set({ wealth: w });
    return true;
  }
  /** 兑换：1000 银元 → 1 灵石 */
  exchangeSilverToSpirit() {
    const w = this.state.wealth;
    if (w.silver < EXCHANGE_RATE) return { ok: false, reason: '银元不足一千' };
    this.set({ wealth: { silver: w.silver - EXCHANGE_RATE, spirit: w.spirit + 1 } });
    this.pushHistory(`以 ${EXCHANGE_RATE} 银元兑得 1 灵石`, 'wealth');
    return { ok: true };
  }
  /** 兑换：1 灵石 → 1000 银元 */
  exchangeSpiritToSilver() {
    const w = this.state.wealth;
    if (w.spirit < 1) return { ok: false, reason: '灵石不足' };
    this.set({ wealth: { silver: w.silver + EXCHANGE_RATE, spirit: w.spirit - 1 } });
    this.pushHistory(`以 1 灵石兑得 ${EXCHANGE_RATE} 银元`, 'wealth');
    return { ok: true };
  }

  /* ---------- 商店（地图模式物品） ---------- */

  buyMapItem(itemKey) {
    const def = MAP_ITEMS[itemKey];
    if (!def) return { ok: false, reason: '物品不存在' };
    if (!this.payWealth(def.price ?? {})) return { ok: false, reason: '资财不足' };
    const entry = this.addItem({ ...def, price: def.price ?? null });
    this.pushHistory(`购得【${def.name}】`, 'wealth');
    return { ok: true, item: entry };
  }

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
  }

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
