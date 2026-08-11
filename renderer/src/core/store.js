// 游戏状态中心：单一数据源 + 订阅发布
// 本文件为状态内核：状态读写 / 效果结算 / 属性派生 / 史册事件 / 快照
// 各业务领域方法拆至 core/domains/*.js，经 Object.assign 混入本类原型：
//   skills（技能与增益） items（物品） relations（人物关系）
//   mapMode（地图模式） wealth（财富/商店/宗门） persistence（存档与重置）
import { CONFIG } from './config.js';
import { formatTime } from './time.js';
import { skillDomain } from './domains/skills.js';
import { itemDomain } from './domains/items.js';
import { relationDomain } from './domains/relations.js';
import { mapDomain } from './domains/mapMode.js';
import { wealthDomain } from './domains/wealth.js';
import { persistenceDomain } from './domains/persistence.js';

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

  /* ---------- 属性派生 ---------- */

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

  /* ---------- 供 AI 参考的角色快照 ---------- */

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

// 领域方法混入（保持对外 API 不变，全部经 this 访问状态内核与其他领域）
Object.assign(
  GameStore.prototype,
  skillDomain,
  itemDomain,
  relationDomain,
  mapDomain,
  wealthDomain,
  persistenceDomain
);
