// AI 叙事引擎客户端：多厂商 OpenAI 兼容适配；未配置时启用本地兜底叙事
import { CONFIG } from './config.js';

export class NarrativeEngine {
  constructor(store) {
    this.store = store;
    this.settings = {
      vendor: CONFIG.ai.vendor,
      baseUrl: CONFIG.ai.baseUrl,
      model: CONFIG.ai.model,
      apiKey: CONFIG.ai.apiKey,
      temperature: CONFIG.ai.temperature
    };
    /** 战斗触发回调（由外部注入 CombatEngine.start） */
    this.onCombatSignal = null;
  }

  /* ---------- 设置 ---------- */

  async loadSettings() {
    const saved = await window.taixuan?.settings.read().catch(() => null);
    if (saved) Object.assign(this.settings, saved);
    this._syncReady();
  }

  async saveSettings(patch) {
    Object.assign(this.settings, patch);
    await window.taixuan?.settings.write({ ...this.settings });
    this._syncReady();
  }

  _syncReady() {
    this.store.set({ aiReady: !!(this.settings.baseUrl && this.settings.model && this.settings.apiKey) });
  }

  /** 在线拉取当前厂商可用模型列表（保证时效性） */
  async fetchModels() {
    const resp = await window.taixuan.ai.models({
      baseUrl: this.settings.baseUrl,
      apiKey: this.settings.apiKey
    });
    return resp;
  }

  /* ---------- 剧情推进 ---------- */

  /** action 为玩家选择/输入的行动，opening=true 时为开局 */
  async advance(action, { opening = false } = {}) {
    this.store.set({ busy: true });
    try {
      let result = null;
      if (this.store.get('aiReady')) {
        result = await this._callAI(action, opening);
      }
      if (!result) result = this._fallback(action, opening);
      this._commit(result, action);
    } finally {
      this.store.set({ busy: false });
    }
  }

  async _chat(messages, temperature) {
    const resp = await window.taixuan.ai.chat({
      baseUrl: this.settings.baseUrl,
      apiKey: this.settings.apiKey,
      model: this.settings.model,
      temperature: temperature ?? this.settings.temperature,
      messages
    });
    return resp?.ok ? resp.content : null;
  }

  async _callAI(action, opening) {
    const s = this.store;
    const recentHistory = s.get('history').slice(-8).map(h => `第${h.day}日：${h.text}`).join('\n');
    const userContent = opening
      ? `角色初始状态：${JSON.stringify(s.snapshot())}\n请生成开局事件（主角初入修仙界）。`
      : `角色状态：${JSON.stringify(s.snapshot())}\n近期史册：\n${recentHistory || '（无）'}\n上一事件：${s.get('event')?.event ?? '（无）'}\n玩家行动：「${action}」\n请推演后续事件。`;

    const content = await this._chat([
      { role: 'system', content: CONFIG.ai.systemPrompt },
      { role: 'user', content: userContent }
    ]);
    return content ? this._parseJSON(content) : null;
  }

  _parseJSON(text) {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return null;
      const data = JSON.parse(m[0]);
      if (typeof data.event !== 'string' || !Array.isArray(data.options)) return null;
      return {
        event: data.event,
        options: data.options.slice(0, 4).map(String),
        effects: data.effects && typeof data.effects === 'object' ? data.effects : {},
        location: typeof data.location === 'string' ? data.location : null,
        log: typeof data.log === 'string' ? data.log : null,
        grantSkill: data.grantSkill && typeof data.grantSkill === 'object' ? data.grantSkill : null,
        grantItem: data.grantItem && typeof data.grantItem === 'object' ? data.grantItem : null,
        combat: data.combat && typeof data.combat === 'object' && data.combat.enemy ? data.combat : null
      };
    } catch {
      return null;
    }
  }

  /* ---------- 敌方战斗决策（AI 代理 / 本地策略兜底） ---------- */

  async decideEnemyAction(snapshot) {
    if (this.store.get('aiReady')) {
      const content = await this._chat([
        { role: 'system', content: CONFIG.combatPrompt },
        { role: 'user', content: `战斗状态：${JSON.stringify(snapshot)}` }
      ], 0.6);
      if (content) {
        try {
          const m = content.match(/\{[\s\S]*\}/);
          const data = JSON.parse(m?.[0] || '');
          if (['attack', 'skill', 'guard'].includes(data.action)) {
            return { action: data.action, skill: data.skill, narration: String(data.narration || '') };
          }
        } catch { /* 落入本地策略 */ }
      }
    }
    return this._enemyHeuristic(snapshot);
  }

  _enemyHeuristic(snapshot) {
    const c = this.store.state.combat;
    const hpRatio = c ? c.enemy.hp / c.enemy.maxHp : 1;
    if (hpRatio < 0.25 && Math.random() < 0.4) {
      return { action: 'guard', narration: `【${snapshot.敌方.名称}】势弱，收势回防` };
    }
    if (Math.random() < 0.45) {
      const skills = c?.enemy.skills ?? [];
      const sk = skills[Math.floor(Math.random() * skills.length)];
      if (sk) return { action: 'skill', skill: sk.name, narration: '' };
    }
    return { action: 'attack', narration: '' };
  }

  /* ---------- 角色创建候选生成（AI / 本地池兜底） ---------- */

  /**
   * @param kind 'talent' | 'passive' | 'active'
   * @param rootKeys 已选灵根 key 数组（主动技能需与之相关）
   * @returns Promise<Array> 候选条目
   */
  async generateCreation(kind, rootKeys = []) {
    if (this.store.get('aiReady')) {
      const rootLabels = rootKeys.map(k => CONFIG.roots.find(r => r.key === k)?.label ?? k);
      const content = await this._chat([
        { role: 'system', content: CONFIG.creationPrompt },
        { role: 'user', content: JSON.stringify({ 类型: kind, 灵根: rootLabels, 数量: 8 }) }
      ], 0.95);
      const list = this._parseArray(content);
      if (list?.length) return list;
    }
    return this._creationFallback(kind, rootKeys);
  }

  _parseArray(text) {
    try {
      const m = String(text).match(/\[[\s\S]*\]/);
      if (!m) return null;
      const arr = JSON.parse(m[0]);
      if (!Array.isArray(arr)) return null;
      return arr.filter(x => x && typeof x.name === 'string').map(x => {
        const e = { name: String(x.name).slice(0, 12), desc: String(x.desc || '').slice(0, 60) };
        if (typeof x.cost === 'number') e.cost = x.cost;
        if (typeof x.mult === 'number') e.mult = x.mult;
        if (typeof x.root === 'string') {
          const hit = CONFIG.roots.find(r => r.label === x.root || r.key === x.root);
          if (hit) e.root = hit.key;
        }
        if (x.mods && typeof x.mods === 'object') e.mods = x.mods;
        return e;
      });
    } catch {
      return null;
    }
  }

  _creationFallback(kind, rootKeys) {
    const C = CONFIG.creation;
    const sample = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
    if (kind === 'talent') return sample(C.talents, 8).map(x => ({ ...x }));
    if (kind === 'passive') return sample(C.passives, 8).map(x => ({ ...x }));
    // active：仅取已选灵根对应技能（未选灵根时给全部）
    const keys = rootKeys.length ? rootKeys : Object.keys(C.actives);
    const pool = keys.flatMap(k => (C.actives[k] || []).map(x => ({ ...x })));
    return sample(pool, Math.min(8, pool.length));
  }

  /* ---------- 本地兜底叙事 ---------- */

  _fallback(action, opening) {
    const F = CONFIG.fallback;
    if (opening) {
      return {
        event: '你于雷雨之夜穿越至太玄大陆，醒来时躺在一处山神庙中，怀中多了一枚温润的玉简。庙外云海翻腾，隐约有钟鸣自山巅传来——那里是青云门的方向。',
        options: ['前往青云门拜师', '研究怀中玉简', '下山历练闯荡', '在庙中闭关吐纳'],
        effects: { cultivation: 5 }, location: 'qingyun',
        log: '魂穿太玄，山神庙中得玉简', grantSkill: null, grantItem: null, combat: null
      };
    }
    // 概率触发战斗
    if (Math.random() < F.combatChance) {
      const s = this.store.state;
      const scale = 1 + s.realmIndex * 0.8;
      const base = F.enemies[Math.floor(Math.random() * F.enemies.length)];
      const enemy = {
        ...base,
        hp: Math.round(base.hp * scale), atk: Math.round(base.atk * scale),
        pdef: Math.round(base.pdef * scale), mdef: Math.round(base.mdef * scale)
      };
      const playerFirst = Math.random() < 0.6;
      return {
        event: `行至半途，腥风骤起——${base.desc}${playerFirst ? '你先一步察觉杀机，暗自凝神。' : '它已扑至面前！'}`,
        options: ['拔剑迎战', '且战且退', '观其破绽', '喝问来意'],
        effects: {}, location: null,
        log: `遭遇【${base.name}】`,
        grantSkill: null, grantItem: null,
        combat: { enemy, playerFirst }
      };
    }
    const pick = F.events[Math.floor(Math.random() * F.events.length)];
    const seed = [...String(action)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const jitter = (n) => Math.round(n * (0.6 + ((seed % 7) / 10)));
    return {
      event: pick.event,
      options: pick.options,
      effects: Object.fromEntries(Object.entries(pick.effects).map(([k, v]) => [k, jitter(v)])),
      location: pick.location,
      log: `行「${String(action).slice(0, 12)}」——${pick.log}`,
      grantSkill: seed % 11 === 0 ? { type: 'passive', name: '灵犀一瞬', desc: '偶有所悟，修为获取 +10%' } : null,
      grantItem: seed % 5 === 0 ? { ...F.loot[seed % F.loot.length] } : null,
      combat: null
    };
  }

  /* ---------- 结算 ---------- */

  _commit(result, action) {
    const s = this.store;
    if (action) s.pushHistory(result.log || `行「${String(action).slice(0, 16)}」`);
    s.applyEffects(result.effects);
    if (result.location) s.setLocation(result.location);
    if (result.grantSkill) s.grantSkill(result.grantSkill);
    if (result.grantItem) s.addItem(result.grantItem);
    s.setEvent({ event: result.event, options: result.options });
    s.nextDay();

    // 战斗信号：交给系统驱动的战斗引擎
    if (result.combat && this.onCombatSignal) {
      this.onCombatSignal(result.combat);
    }
  }
}
