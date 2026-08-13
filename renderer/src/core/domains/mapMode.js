// 领域：地图模式（三级位置 / 时间推进与寿元 / 赶路 / 修炼 / 采药 / 炼丹 / 突破 / 探索格子 / 月度结算）
// 本文件导出方法集，由 store.js 混入 GameStore.prototype（方法内 this 即 store 实例）
import { CONFIG } from '../config.js';
import { advanceTime, formatTime, isLifespanOver, TIME_COST } from '../time.js';
import { alchemize, getAlchemyLevel, HERBS } from '../alchemy.js';
import { attemptBreakthrough } from '../breakthrough.js';
import { MAP_ITEMS } from '../mapItems.js';
import { WORLD_MAP, SCENES } from '../mapData.js';
import { libraryFor } from '../skills.js';
import { generateExploreGrid, revealAround, isCellPassable, EXPLORE_CELLS } from '../explore.js';
import { STOCKS, initStocks, tickStocks } from '../stocks.js';

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
    // V2.4：月度结算（银市行情 / 量化规则 / 天慧通灵宝自动传讯）
    this._onMapMonths?.(months);
    if (isLifespanOver(mapTime, this.state.realmIndex)) {
      this.set({ dead: { reason: 'lifespan', at: mapTime } });
      this.pushHistory(`寿元已尽，道友坐化陨落于${formatTime(mapTime)}，一生修行付诸东流`, 'death');
      return { died: true };
    }
    return { died: false };
  },

  /**
   * 月度结算钩子（V2.4）：银市行情推进 / 量化规则执行 / 天慧符自动嘘寒问暖
   * 由 advanceMapTime 在时间推进后调用
   */
  _onMapMonths(months) {
    if (this.state.mode !== 'map' || this.state.dead) return;
    // 1) 银市行情随月波动
    const stocks = tickStocks(this.state.stocks ?? initStocks(), months);
    this.set({ stocks });
    // 2) 量化规则（需天慧通灵宝）：价格越线即自动买卖
    const th = this.state.tianhui;
    if (th?.tongling && th.rules) {
      for (const def of STOCKS) {
        const rule = th.rules[def.id] ?? th.rules.all;
        if (!rule) continue;
        const price = stocks[def.id]?.price ?? def.base;
        const held = this.state.portfolio?.[def.id] ?? 0;
        if (rule.sellAbove && rule.sellQty && price >= rule.sellAbove && held > 0) {
          this.sellStock(def.id, Math.min(rule.sellQty, held), { auto: true });
        } else if (rule.buyBelow && rule.buyQty && price <= rule.buyBelow) {
          this.buyStock(def.id, rule.buyQty, { auto: true });
        }
      }
    }
    // 3) 自动嘘寒问暖（需天慧通灵宝）：好感窗口一到即代为传讯
    if (th?.tongling && th.autoGreet) {
      for (const r of this.state.relations) {
        if (this.canChatAffinity(r.name)) {
          this.tryChatAffinity(r.name);
          this.pushHistory(`天慧符微光一闪——向【${r.name}】传讯嘘寒问暖，好感 +2`, 'relation');
        }
      }
    }
  },

  /* ---------- 探索格子地图（V2.4：10×10，离开即重置） ---------- */

  /** 进入探索：生成格子地图（同场景续探则复用）；不入存档，离开重置 */
  enterExplore(sceneId) {
    const cur = this.state.explore;
    if (cur?.sceneId === sceneId && !cur.done) return cur;
    const explore = generateExploreGrid(sceneId);
    revealAround(explore);
    this.set({ explore });
    this.pushHistory(`步入【${SCENES[sceneId]?.name ?? sceneId}】深处——雾霭四合，机缘与凶险并存（每行进一步耗时 ${TIME_COST.exploreStep} 月）`, 'explore');
    return explore;
  },

  /** 离开探索：不记录当前位置，下次进入重置 */
  exitExplore() {
    if (this.state.explore) this.set({ explore: null });
  },

  /**
   * 移向相邻格：耗时 2 月；战斗格未清除可进入（触发战斗），但不胜则被拦回原地
   * @returns {{ok:boolean, died?:boolean, reason?:string, cell?:object, prev?:{x,y}}}
   */
  exploreMove(x, y) {
    const ex = this.state.explore;
    if (!ex || ex.done) return { ok: false, reason: '探索已结束' };
    const dist = Math.abs(x - ex.player.x) + Math.abs(y - ex.player.y);
    if (dist !== 1) return { ok: false, reason: '只能移向相邻的格子' };
    const cell = ex.cells[y]?.[x];
    if (!cell) return { ok: false, reason: '无路可行' };
    const prev = { ...ex.player };
    const { died } = this.advanceMapTime(TIME_COST.exploreStep);
    if (died) return { ok: true, died: true };
    ex.player = { x, y };
    cell.visited = true;
    revealAround(ex);
    this.set({ explore: { ...ex, cells: [...ex.cells] } });
    return { ok: true, died: false, cell, prev };
  },

  /** 清除格子事件（战斗胜利 / 采集完毕 / 奇遇已了） */
  clearExploreCell(x, y) {
    const ex = this.state.explore;
    if (!ex) return;
    const cell = ex.cells[y]?.[x];
    if (!cell) return;
    cell.cleared = true;
    this.set({ explore: { ...ex, cells: [...ex.cells] } });
  },

  /** 战斗未胜：被拦回原位（无法越过战斗节点） */
  exploreBounce(prev) {
    const ex = this.state.explore;
    if (!ex || !prev) return;
    ex.player = { ...prev };
    this.set({ explore: { ...ex } });
  },

  /** 抵达区域入口：本次探索圆满 */
  completeExplore() {
    const ex = this.state.explore;
    if (!ex || ex.done) return;
    ex.done = true;
    this.set({ explore: { ...ex } });
    this.pushHistory(`抵达区域入口——【${SCENES[ex.sceneId]?.name ?? ''}】此行圆满`, 'explore');
  },

  /** 采集格：采得 2~4 株草药入背包（可堆叠，如「剑叶草 ×3」） */
  exploreGather() {
    const keys = Object.keys(HERBS);
    const got = {};
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      const pool = keys.filter(k => {
        const v = HERBS[k].value;
        return roll < 0.55 ? v <= 1 : roll < 0.8 ? v <= 2 : roll < 0.95 ? v <= 4 : true;
      });
      const key = pool[Math.floor(Math.random() * pool.length)];
      got[key] = (got[key] ?? 0) + 1;
    }
    for (const [k, c] of Object.entries(got)) this.addHerb(k, c);
    const text = Object.entries(got).map(([k, c]) => `${HERBS[k].name}×${c}`).join('、');
    this.pushHistory(`探寻采集，得 ${text}，已收入背包`, 'gather');
    return { text, got };
  },

  /**
   * 奇遇格：掷出一段机缘（横财 / 顿悟 / 灵材 / 伏击 / 小憩）
   * combat 结果由调用方接续处理（启动战斗引擎）
   */
  exploreQiyu() {
    const roll = Math.random();
    if (roll < 0.30) {
      const silver = 80 + Math.floor(Math.random() * 180);
      this.gainWealth({ silver });
      this.pushHistory(`奇遇：于隐秘石龛中寻得修行遗囊，获 ${silver} 银元`, 'explore');
      return { kind: 'wealth', text: `石龛遗囊，拾得 ${silver} 银元` };
    }
    if (roll < 0.55) {
      const gain = 40 + Math.floor(Math.random() * 50);
      this.applyEffects({ cultivation: gain });
      this.pushHistory(`奇遇：古碑残文映入眼帘，顿悟之下修为 +${gain}`, 'explore');
      return { kind: 'cultivation', text: `古碑残文，顿悟修为 +${gain}` };
    }
    if (roll < 0.75) {
      const r = this.exploreGather();
      return { kind: 'herbs', text: `灵圃偶得 ${r.text}` };
    }
    if (roll < 0.88) {
      return { kind: 'combat', text: '雾中杀机骤现——妖邪伏击！' };
    }
    this.applyEffects({ hp: 15, mp: 10 });
    this.pushHistory('奇遇：灵泉之畔小憩片刻，气血法力略有恢复', 'explore');
    return { kind: 'flavor', text: '灵泉小憩，气血 +15，法力 +10' };
  },

  /** 探索格子是否可通行（战斗格未清除不可越过） */
  exploreCellPassable(cell) {
    return isCellPassable(cell);
  },

  /** 探索格子定义（供 UI 读取） */
  exploreCellDef(type) {
    return EXPLORE_CELLS[type] ?? EXPLORE_CELLS.empty;
  },
  /* ---------- 赶路（V2.4：按距离耗时，坐骑/御剑可提速） ---------- */

  /** 两节点间的大世界路径长度（沿路网 BFS 的最短边数；无路则以直线距离估算） */
  _travelHops(fromId, toId) {
    const nodes = WORLD_MAP.nodes;
    const edges = WORLD_MAP.edges;
    const adj = new Map(nodes.map(n => [n.id, []]));
    for (const [a, b] of edges) { adj.get(a)?.push(b); adj.get(b)?.push(a); }
    const dist = { [fromId]: 0 };
    const queue = [fromId];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === toId) return dist[cur];
      for (const nx of adj.get(cur) ?? []) {
        if (dist[nx] == null) { dist[nx] = dist[cur] + 1; queue.push(nx); }
      }
    }
    // 路网不通：按直线距离每 260 坐标折一站，至少 2 站
    const na = nodes.find(n => n.id === fromId), nb = nodes.find(n => n.id === toId);
    if (!na || !nb) return 1;
    const d = Math.hypot(na.x - nb.x, na.y - nb.y);
    return Math.max(2, Math.round(d / 260));
  },

  /** 行程提速倍率：御剑 > 坐骑 > 徒步 */
  travelFactor() {
    const t = this.state.travel ?? {};
    if (t.yujian) return 0.3;
    if (t.mount === 'tayan_lu') return 0.5;
    if (t.mount === 'qingzong_ju') return 0.7;
    return 1;
  },

  /** 当前行程方式标签 */
  travelModeLabel() {
    const t = this.state.travel ?? {};
    if (t.yujian) return '御剑飞行';
    if (t.mount === 'tayan_lu') return '踏云鹿';
    if (t.mount === 'qingzong_ju') return '青鬃灵驹';
    return '徒步';
  },

  /** 前往某节点预计耗时（月）：按距离计算，坐骑/御剑降低 */
  travelMonthsTo(worldId) {
    const from = this.state.mapLocation?.world;
    if (!from || from === worldId) return 0;
    const hops = this._travelHops(from, worldId);
    return Math.max(TIME_COST.travel, Math.ceil(hops * this.travelFactor()));
  },

  /** 获得行程方式（坐骑/御剑），由物品 grant.travel 触发 */
  grantTravel(grant) {
    const cur = this.state.travel ?? { mount: null, yujian: false };
    const travel = { ...cur };
    if (grant.yujian) travel.yujian = true;
    if (grant.mount) travel.mount = grant.mount;
    this.set({ travel });
    if (grant.yujian) this.pushHistory('习得【御剑飞行】——剑光一起，山河咫尺，赶路耗时大减', 'skill');
    else if (grant.mount) this.pushHistory(`收服坐骑，此后远行有它代步，赶路耗时降低`, 'item');
  },

  /** 赶路：前往大世界节点（耗时按距离与行程方式浮动，原地免费直入） */
  travelTo(worldId) {
    const node = WORLD_MAP.nodes.find(n => n.id === worldId);
    if (!node) return { ok: false };
    if (this.state.mapLocation?.world === worldId) {
      this.setMapLocation({ world: worldId, region: worldId, scene: null });
      return { ok: true, died: false, moved: false };
    }
    const months = this.travelMonthsTo(worldId);
    const { died } = this.advanceMapTime(months);
    if (died) return { ok: true, died: true, moved: false };
    this.pushHistory(`${this.travelModeLabel()}而行，历时 ${months} 月，抵达【${node.name}】`, 'travel');
    this.setMapLocation({ world: worldId, region: worldId, scene: null });
    return { ok: true, died: false, moved: true, months };
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

  /** 野外探寻草药：耗时1月，按稀有度加权采得 1~3 株（入背包堆叠） */
  mapGatherHerbs() {
    const { died } = this.advanceMapTime(TIME_COST.cultivate);
    if (died) return { ok: true, died: true, herbs: [] };
    const r = this.exploreGather();
    return { ok: true, died: false, herbs: [r.text] };
  },

  /** 炼丹：消耗背包草药 + 耗时1月，成败按炼丹等级与草药品质判定 */
  mapAlchemy(recipeKey) {
    const s = this.state;
    const res = alchemize(recipeKey, this.herbCounts(), s.alchemyLevel, s.alchemyExp);
    if (!res.ok) return res;
    this.consumeHerbs(res.consumed);
    const beforeLv = getAlchemyLevel(s.alchemyExp).level;
    const alchemyExp = s.alchemyExp + res.expGain;
    const after = getAlchemyLevel(alchemyExp);
    this.set({ alchemyExp, alchemyLevel: after.level });

    // 丹成即入囊：先于时间推进落袋，避免推进耗时中寿元陨落导致丹药两空
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
        price: isPill ? null : (MAP_ITEMS[this._pillItemKey(res.pill.name)]?.price ?? null) // 自炼突破丹不可售，防刷银
      });
    }

    const { died } = this.advanceMapTime(TIME_COST.alchemy);
    if (died) return { ...res, died: true };
    if (after.level > beforeLv) {
      this.pushHistory(`丹道精进——晋升为【${after.name}】（成功率 ${Math.round(after.successRate * 100)}%）`, 'skill');
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
    if (pillItemId && !pill) return { ok: false, reason: '丹药已不存在' };
    // 突破丹须与目标大境界匹配（item.breakthrough = 目标境界序，如筑基丹=1、金丹=2）
    if (pill && pill.breakthrough !== s.realmIndex + 1) {
      return { ok: false, reason: '丹药与突破境界不符' };
    }
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
