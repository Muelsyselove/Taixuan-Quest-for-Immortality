// AI 叙事引擎客户端：多厂商 OpenAI 兼容适配；未配置时启用本地兜底叙事
// 支持 AI 自主读取游戏数据：AI 可输出 {"needData":[域名...]} 请求数据文件，引擎回传后继续推演
// 伪域 "library"：系统技能库目录（见 skills.js），授予技能前 AI 必须先查阅
import { CONFIG } from './config.js';
import { presentDomain, domainCatalog, isDomainKey } from './data.js';
import { presentLibrary, libraryFor } from './skills.js';

const MAX_DATA_ROUNDS = 3; // 单次推演允许的数据请求轮数上限

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
    /** 应用设置变更回调（画质/声音等，由 main.js 注入） */
    this.onAppSettings = null;
    // 应用级设置（画质/声音/自定义单价），与 AI 设置共用 settings.json
    this.app = { ...CONFIG.appSettings };
  }

  /* ---------- 设置 ---------- */

  async loadSettings() {
    const saved = await window.taixuan?.settings.read().catch(() => null);
    if (saved) {
      const { quality, volume, muted, priceInput, priceOutput, priceCache, ...aiPart } = saved;
      Object.assign(this.settings, aiPart);
      Object.assign(this.app, { quality, volume, muted, priceInput, priceOutput, priceCache });
      // 允许 null 落回默认
      for (const k of Object.keys(this.app)) {
        if (this.app[k] === undefined) this.app[k] = CONFIG.appSettings[k];
      }
    }
    this._syncReady();
  }

  async saveSettings(patch) {
    Object.assign(this.settings, patch);
    await window.taixuan?.settings.write({ ...patch });
    this._syncReady();
  }

  /** 保存应用级设置（画质/声音/单价），并触发应用回调 */
  async saveAppSettings(patch) {
    Object.assign(this.app, patch);
    await window.taixuan?.settings.write({ ...patch });
    this.onAppSettings?.(this.app);
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

  /* ---------- Token 用量记录（输入/输出分项 + 缓存命中） ---------- */

  async _recordUsage(kind, usage) {
    if (!usage) return;
    try {
      const pt = usage.prompt_tokens ?? 0;
      let ch = usage.prompt_cache_hit_tokens;
      let cm = usage.prompt_cache_miss_tokens;
      if (ch == null && cm == null) {
        ch = 0; cm = 0; // 厂商未回传缓存字段：全部视为普通输入
      } else {
        // 只回传一侧时按 pt 补全另一侧
        if (ch == null) ch = pt - (cm ?? 0);
        if (cm == null) cm = pt - ch;
      }
      ch = Math.max(0, Math.min(pt, Math.round(ch)));
      cm = Math.max(0, Math.min(pt, Math.round(cm)));
      await window.taixuan.usage.record({
        t: Date.now(), kind,
        vendor: this.settings.vendor,
        model: this.settings.model,
        pt, ct: usage.completion_tokens ?? 0,
        ch, cm
      });
    } catch { /* 统计失败不影响游戏 */ }
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

  async _chat(messages, temperature, kind = 'advance') {
    const resp = await window.taixuan.ai.chat({
      baseUrl: this.settings.baseUrl,
      apiKey: this.settings.apiKey,
      model: this.settings.model,
      temperature: temperature ?? this.settings.temperature,
      messages
    });
    if (resp?.ok) this._recordUsage(kind, resp.usage);
    return resp?.ok ? resp.content : null;
  }

  _systemPrompt() {
    return CONFIG.ai.systemPrompt.replace('{{DOMAIN_CATALOG}}', domainCatalog());
  }

  /**
   * AI 推演主循环：先送概要，AI 可通过 needData 自主请求数据域，最多 MAX_DATA_ROUNDS 轮
   */
  async _callAI(action, opening) {
    const s = this.store;
    const recentHistory = s.get('history').slice(-8).map(h => `第${h.day}日：${h.text}`).join('\n');
    const userContent = opening
      ? `角色初始概要：${JSON.stringify(s.snapshot())}\n请生成开局事件（主角初入修仙界）。如需更多数据可先按协议请求。`
      : `角色概要：${JSON.stringify(s.snapshot())}\n近期史册：\n${recentHistory || '（无）'}\n上一事件：${s.get('event')?.event ?? '（无）'}\n玩家行动：「${action}」\n请推演后续事件。如需更多数据可先按协议请求。`;

    const messages = [
      { role: 'system', content: this._systemPrompt() },
      { role: 'user', content: userContent }
    ];

    for (let round = 0; round <= MAX_DATA_ROUNDS; round++) {
      const content = await this._chat(messages, undefined, 'advance');
      if (!content) return null;

      const req = this._parseDataRequest(content);
      // 最后一轮仍要数据则强制作出事件（由 _parseJSON 尝试兜底）
      if (req && round < MAX_DATA_ROUNDS) {
        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: this._buildDataReply(req) });
        continue;
      }
      return this._parseJSON(content);
    }
    return null;
  }

  /** 解析 AI 的数据请求：{"needData":["profile",...]}（"library" 为技能库伪域） */
  _parseDataRequest(text) {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return null;
      const data = JSON.parse(m[0]);
      if (!Array.isArray(data.needData)) return null;
      const keys = data.needData.map(String).filter(k => isDomainKey(k) || k === 'library');
      return keys.length ? keys : null;
    } catch {
      return null;
    }
  }

  /** 将 AI 请求的数据域内容打包为一条用户消息 */
  _buildDataReply(keys) {
    const bundle = {};
    for (const k of keys) {
      if (k === 'library') { bundle.library = presentLibrary(); continue; }
      const d = presentDomain(this.store.state, k);
      if (d) bundle[k] = d;
    }
    return `【数据回传】以下为请求的游戏数据文件内容：\n${JSON.stringify(bundle)}\n请据此输出正式事件 JSON。`;
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
        registerSkill: data.registerSkill && typeof data.registerSkill === 'object' ? data.registerSkill : null,
        grantItem: data.grantItem && typeof data.grantItem === 'object' ? data.grantItem : null,
        relations: Array.isArray(data.relations) ? data.relations.filter(r => r && typeof r === 'object') : null,
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
      ], 0.6, 'combat');
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

  /* ---------- 角色创建候选生成 ---------- */

  /**
   * @param kind 'talent' | 'passive' | 'active'
   * @param rootKeys 已选灵根 key 数组（主动技能需与之相关）
   * @returns Promise<Array> 候选条目
   * 主动/被动技能一律取自系统技能库（不再由 AI 生成）；仅天赋由 AI 生成（本地池兜底）。
   */
  async generateCreation(kind, rootKeys = []) {
    if (kind === 'active' || kind === 'passive') {
      return this._librarySample(kind, rootKeys);
    }
    if (this.store.get('aiReady')) {
      const rootLabels = rootKeys.map(k => CONFIG.roots.find(r => r.key === k)?.label ?? k);
      const content = await this._chat([
        { role: 'system', content: CONFIG.creationPrompt },
        { role: 'user', content: JSON.stringify({ 类型: kind, 灵根: rootLabels, 数量: 8 }) }
      ], 0.95, 'creation');
      const list = this._parseArray(content);
      if (list?.length) return list;
    }
    return this._creationFallback(kind, rootKeys);
  }

  /** 从技能库抽样候选：主动仅取已选灵根对应属性+无属性；被动取全库（含无属性） */
  _librarySample(kind, rootKeys) {
    const type = kind === 'active' ? 'active' : 'passive';
    const keys = rootKeys.length ? rootKeys : CONFIG.roots.map(r => r.key);
    const pool = libraryFor(keys, type);
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 8).map(x => ({ ...x }));
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
    return this._librarySample(kind, rootKeys); // 技能候选由系统技能库提供
  }

  /* ---------- 本地兜底叙事 ---------- */

  _fallback(action, opening) {
    const F = CONFIG.fallback;
    if (opening) {
      return {
        event: '你于雷雨之夜穿越至太玄大陆，醒来时躺在一处山神庙中，怀中多了一枚温润的玉简。庙外云海翻腾，隐约有钟鸣自山巅传来——那里是青云门的方向。',
        options: ['前往青云门拜师', '研究怀中玉简', '下山历练闯荡', '在庙中闭关吐纳'],
        effects: { cultivation: 5 }, location: 'qingyun',
        log: '魂穿太玄，山神庙中得玉简', grantSkill: null, grantItem: null, relations: null, combat: null
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
        grantSkill: null, grantItem: null, relations: null,
        combat: { enemy, playerFirst }
      };
    }
    const pick = F.events[Math.floor(Math.random() * F.events.length)];
    const seed = [...String(action)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const jitter = (n) => Math.round(n * (0.6 + ((seed % 7) / 10)));
    // 兜底授予：从技能库按灵根取一门被动（库外技能须走 registerSkill，不可凭空授予）
    let grantSkill = null;
    if (seed % 11 === 0) {
      const roots = this.store.state.roots;
      const pool = libraryFor(roots.length ? roots : ['wu'], 'passive');
      const hit = pool[seed % pool.length];
      if (hit) grantSkill = { type: 'passive', name: hit.name };
    }
    return {
      event: pick.event,
      options: pick.options,
      effects: Object.fromEntries(Object.entries(pick.effects).map(([k, v]) => [k, jitter(v)])),
      location: pick.location,
      log: `行「${String(action).slice(0, 12)}」——${pick.log}`,
      grantSkill,
      grantItem: seed % 5 === 0 ? { ...F.loot[seed % F.loot.length] } : null,
      relations: seed % 6 === 0 ? [{ name: '云游散人', identity: '萍水相逢的散修', relation: '一面之缘', affinity: 5 }] : null,
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
    if (result.registerSkill) s.registerCustomSkill(result.registerSkill);
    if (result.grantItem) s.addItem(result.grantItem);
    // 人物关系登记/好感变化
    if (Array.isArray(result.relations)) {
      for (const r of result.relations) s.upsertRelation(r);
    }
    s.setEvent({ event: result.event, options: result.options });
    s.nextDay();

    // 战斗信号：交给系统驱动的战斗引擎
    if (result.combat && this.onCombatSignal) {
      this.onCombatSignal(result.combat);
    }
  }
}
