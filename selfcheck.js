// 自检脚本 v3：驱动 Electron 全功能回归（主界面 → 角色 → 存档 → 游戏 → 统计）
const { _electron: electron } = require('playwright-core');

(async () => {
  const electronPath = require('path').join(__dirname, 'node_modules', 'electron', 'dist', 'electron');
  const app = await electron.launch({ executablePath: electronPath, args: ['.', '--no-sandbox', '--disable-gpu'], cwd: __dirname });
  const win = await app.firstWindow();

  const errors = [];
  win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  win.on('pageerror', (e) => errors.push(String(e.stack || e)));

  const out = {};

  // 0. 启动 → 主界面；强制本地兜底模式，保证全程确定性
  await win.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
  await win.evaluate(() => {
    const g = window.__game;
    g.engine.settings.apiKey = '';       // 仅改内存，不落盘
    g.engine._syncReady();
    g.engine.onCombatSignal = null;      // 剧情推进不再随机触发战斗
    g.mist.stop?.();                     // 软件渲染环境下停掉灵雾背景，避免拖垮主线程
  });
  await win.waitForSelector('.menu-card', { timeout: 10000 });
  out.menu = {
    cards: await win.locator('.menu-card').count(),
    disabled: await win.locator('.menu-card.disabled').count()
  };

  // 1. 设置视图：画质 / 声音控件 + 实时生效
  await win.locator('.menu-card').nth(2).click();
  await win.waitForSelector('.settings-screen');
  await win.locator('.settings-screen select').first().selectOption('low');
  await win.waitForTimeout(300);
  out.settings = {
    cards: await win.locator('.settings-card').count(),
    quality: await win.evaluate(() => window.__game.engine.app.quality),
    maxDpr: await win.evaluate(() => window.__game.mist.maxDpr)
  };
  await win.locator('.settings-screen select').first().selectOption('high');
  await win.locator('.pick-back').click();
  await win.waitForSelector('.menu-screen');

  // 2. 对话模式 → 角色选择 → 新建角色（姓名 + 出身：预设被自由填写覆盖）
  await win.locator('.menu-card').nth(0).click();
  await win.waitForSelector('.pick-screen');
  out.charSelect = { newCard: await win.locator('.pick-card.dashed').count() };
  await win.locator('.pick-card.dashed').click(); // 新建角色
  await win.waitForSelector('.creation-modal');
  await win.locator('.creation-modal .set-input').first().fill('自检道人');
  await win.locator('.cr-origin').nth(2).click();            // 预设：商贾之子
  await win.locator('.cr-origin-free').fill('云游四海的织梦人，以千丝万缕入道。'); // 自由填写优先
  await win.waitForTimeout(200);
  out.creation = { originChipsDimmed: await win.locator('.cr-origin.dim').count() };
  await win.locator('.cr-root').nth(0).click();
  await win.locator('.cr-root').nth(1).click();
  await win.waitForTimeout(400);
  await win.locator('.cr-sec[data-kind="passive"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="active"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="talent"] .cr-cand').first().click();
  await win.waitForTimeout(200);
  out.creation.confirmEnabled = await win.locator('.cr-confirm:not([disabled])').count();
  await win.locator('.cr-confirm').click();

  // 3. 存档选择 → 开启新程 → 进入游戏
  await win.waitForSelector('.pick-screen');
  out.saveSelect = { freshCard: await win.locator('.pick-card.dashed').count() };
  await win.locator('.pick-card.dashed').first().click();
  await win.waitForSelector('.game-screen');
  await win.waitForFunction(() => window.__game.store.state.event && window.__game.store.state.busy === false, null, { timeout: 15000 }).catch(() => {});
  out.game = {
    name: await win.evaluate(() => window.__game.store.state.name),
    origin: await win.evaluate(() => window.__game.store.state.origin),
    toolbar: await win.locator('.gt-btn').count(),
    options: await win.locator('.option-card').count(),
    stats: await win.locator('.stat-row').count(),
    nodes: await win.locator('.map-node').count(),
    entries: await win.locator('.char-entry').count()
  };

  // 4. 背包：筛选 + 使用物品
  await win.locator('.char-entry').nth(1).click();
  await win.waitForTimeout(400);
  out.inventory = {
    items: await win.locator('.inv-item').count(),
    tabs: await win.locator('.inv-tab').count()
  };
  const hpBefore = await win.evaluate(() => window.__game.store.state.hp);
  const useBtn = win.locator('.inv-use').first();
  if (await useBtn.count()) { await useBtn.click(); await win.waitForTimeout(300); }
  out.inventory.hpChanged = (await win.evaluate(() => window.__game.store.state.hp)) !== hpBefore;
  await win.locator('.modal-close').click();
  await win.waitForTimeout(200);

  // 5. 功法二级页（技能层结构化字段展示）
  await win.locator('.char-entry').nth(0).click();
  await win.waitForTimeout(300);
  out.skills = {
    details: await win.locator('.skill-detail').count(),
    structLines: await win.locator('.skill-struct').count()
  };
  await win.locator('.modal-close').click();
  await win.waitForTimeout(200);

  // 6. 人物关系：注册 → 面板入口 → 卡片呈现
  await win.evaluate(() => {
    window.__game.store.upsertRelation({ name: '自检散人', identity: '游方术士', relation: '一面之缘', affinity: 25 });
    window.__game.store.upsertRelation({ name: '自检散人', delta: 20 });
  });
  await win.locator('.char-entry').nth(2).click();
  await win.waitForSelector('.relations-modal');
  await win.waitForTimeout(300);
  out.relations = {
    cards: await win.locator('.rel-card').count(),
    name: await win.locator('.rel-card .rel-name').first().innerText(),
    affinity: await win.evaluate(() => window.__game.store.state.relations[0]?.affinity)
  };
  await win.locator('.relations-modal .modal-close').click();
  await win.waitForTimeout(200);

  // 7. 地图缩放（上限/下限/复位）
  const zoomIn = win.locator('.map-zoom-btn').nth(1);
  for (let i = 0; i < 12; i++) await zoomIn.click();
  out.map = { maxZoom: await win.locator('.map-zoom-label').innerText() };
  const zoomOut = win.locator('.map-zoom-btn').nth(0);
  for (let i = 0; i < 20; i++) await zoomOut.click();
  out.map.minZoom = await win.locator('.map-zoom-label').innerText();
  await win.locator('.map-zoom-btn.reset').click();

  // 8. 战斗：手动触发并完整打一场（本地策略代理敌方）
  await win.evaluate(() => {
    window.__game.store.set({ combat: null });
    window.__game.combat.start({
      enemy: { name: '试炼木傀儡', desc: '自检用', hp: 40, atk: 5, pdef: 2, mdef: 2, skills: [{ name: '木拳', desc: '', mult: 1.3 }] },
      playerFirst: true
    });
  });
  await win.waitForTimeout(500);
  out.combat = { visible: await win.locator('.combat-stage').count() };
  let guard = 0;
  while (guard++ < 30) {
    const phase = await win.evaluate(() => window.__game.store.state.combat?.phase);
    if (!phase || phase === 'over') break;
    if (phase === 'player') {
      await win.locator('.combat-root-actions .combat-btn').first().click();
      await win.waitForTimeout(400);
    } else {
      await win.waitForTimeout(500);
    }
  }
  out.combat.result = await win.evaluate(() => window.__game.store.state.combat?.result ?? 'cleared');
  await win.evaluate(() => {
    const g = window.__game;
    if (g.store.state.combat && g.store.state.combat.phase !== 'over') g.store.set({ combat: null });
  });
  const goldBtn = win.locator('.combat-actions .btn.gold');
  if (await goldBtn.count()) { await goldBtn.click(); await win.waitForTimeout(300); }
  out.combat.maskGone = await win.evaluate(() => !window.__game.store.state.combat);

  // 8.2 三层体系微测：效果层 tick / buff 叠加 / 技能结构化结算（确定性，不依赖随机）
  out.layers = await win.evaluate(() => {
    const g = window.__game;
    const st = g.store;
    const ce = g.combat;
    st.set({ combat: null });
    ce.start({ enemy: { name: '自检木桩', desc: '', hp: 500, atk: 5, pdef: 0, mdef: 0, skills: [{ name: '轻拍', mult: 1 }] }, playerFirst: true });
    const c = () => st.state.combat;
    const r = {};

    // 清零常驻加成（避免随机选到的闪避/反伤被动干扰断言）
    const stash = { p: st.state.passiveSkills, t: st.state.talents, b: st.state.buffs };
    st.set({ passiveSkills: [], talents: [], buffs: [] });

    // buff 层：可叠加上限（同名中毒 buff 叠 2 层）
    const poisonSkill = { name: '自检毒雾', cost: 0, buffs: [{ target: 'enemy', name: '中毒', turns: 3, stackable: true, maxStacks: 2, effects: [{ key: 'poison', pct: 0.05 }] }] };
    ce._castSkill('player', poisonSkill);
    ce._castSkill('player', poisonSkill);
    ce._castSkill('player', poisonSkill); // 第三次应被上限截断
    r.buffStackCap = c().buffs.enemy.find(b => b.name === '中毒')?.stacks === 2;

    // 技能层：次数盾 / 屏障 / 造物 / 眩晕
    ce._castSkill('player', { name: '自检护盾', cost: 0, shieldLayers: 2 });
    ce._castSkill('player', { name: '自检屏障', cost: 0, barrierMult: 1.0 });
    ce._castSkill('player', { name: '自检造物', cost: 0, buffs: [{ target: 'self', name: '石傀', turns: 3, effects: [{ key: 'summon', mult: 0.5 }] }] });
    ce._castSkill('player', { name: '自检定身', cost: 0, buffs: [{ target: 'enemy', name: '定身', turns: 1, effects: [{ key: 'stun' }] }] });
    r.shieldUp = c().buffs.player.some(b => b.effects.some(e => e.key === 'shield' && e.layers === 2));
    r.barrierUp = c().buffs.player.some(b => b.effects.some(e => e.key === 'barrier' && e.value > 0));
    r.summonUp = c().buffs.player.some(b => b.effects.some(e => e.key === 'summon'));
    r.stunUp = ce._hasFx('enemy', 'stun');

    // 效果层 tick：敌方中毒掉血；我方造物自动攻击
    const hp0 = c().enemy.hp;
    ce._tickStart('enemy');
    r.poisonTick = c().enemy.hp < hp0;
    const hp1 = c().enemy.hp;
    ce._tickStart('player');
    r.summonTick = c().enemy.hp < hp1;

    // 结算链：次数盾完整抵消一次伤害（玩家不掉血，盾层数 2→1）
    const pHp0 = st.state.hp;
    ce._strike('enemy', { atk: 30, mult: 1, label: '试击' });
    r.shieldBlock = st.state.hp === pHp0
      && c().buffs.player.some(b => b.effects.some(e => e.key === 'shield' && e.layers === 1));

    // 还原常驻加成并清场
    st.set({ passiveSkills: stash.p, talents: stash.t, buffs: stash.b, combat: null });
    return r;
  });
  await win.waitForTimeout(200);

  // 8.5 存档专属技能注册（registerSkill 路径）→ 随存档持久化验证（在存档测试前注册）
  await win.evaluate(() => {
    window.__game.store.registerCustomSkill({
      type: 'active', name: '天机一剑', desc: '自检专属神通', cost: 15, mult: 2.2,
      buffs: [{ target: 'enemy', name: '灼烧', turns: 2, effects: [{ key: 'burn', mult: 0.3 }] }]
    });
  });
  out.customSkill = {
    learned: await win.evaluate(() => window.__game.store.state.activeSkills.some(s => s.name === '天机一剑' && s.custom)),
    registered: await win.evaluate(() => window.__game.store.state.customSkills.active.some(s => s.name === '天机一剑'))
  };

  // 9. 存档 / 读档（按角色独立 + 分域文件）
  await win.evaluate(() => window.__game.saves.save('selfcheck'));
  const dayNow = await win.evaluate(() => window.__game.store.state.day);
  const loaded = await win.evaluate(() => window.__game.saves.load('selfcheck'));
  out.saves = {
    written: true, loaded,
    dayMatch: (await win.evaluate(() => window.__game.store.state.day)) === dayNow,
    listCount: (await win.evaluate(() => window.__game.saves.list())).length,
    relationsKept: await win.evaluate(() => window.__game.store.state.relations.length),
    customKept: await win.evaluate(() =>
      window.__game.store.state.customSkills.active.some(s => s.name === '天机一剑')
      && window.__game.store.state.activeSkills.some(s => s.name === '天机一剑'))
  };
  await win.evaluate(() => window.__game.saves.remove('selfcheck'));

  // 10. 剧情推进 → 自动存档
  await win.locator('.option-card').first().click();
  await win.waitForFunction(() => window.__game.store.state.busy === false, null, { timeout: 15000 }).catch(() => {});
  await win.waitForTimeout(500);
  out.autosave = (await win.evaluate(() => window.__game.saves.list())).some(s => s.auto);

  // 11. 物品 grant 注册：技能 / 天赋 / 常驻增益
  out.grants = await win.evaluate(() => {
    const g = window.__game;
    const s = g.store.state;
    const before = { passive: s.passiveSkills.length, talents: s.talents.length, buffs: s.buffs.length };
    const it1 = g.store.addItem({ name: '测试玉简', rarity: 'jingliang', category: 'gongfa', usable: true, effects: {}, grant: { skill: { type: 'passive', name: '龟息术', desc: '测试' } } });
    const it2 = g.store.addItem({ name: '测试符', rarity: 'youxiu', category: 'fabao', usable: true, effects: {}, grant: { buff: { name: '锐气', desc: '测试', mods: { atk: 3 } } } });
    const it3 = g.store.addItem({ name: '测试茶', rarity: 'shishi', category: 'dan', usable: true, effects: {}, grant: { talent: { name: '道心通明', desc: '测试', mods: { cultivationPct: 0.1 } } } });
    g.store.useItem(it1.id); g.store.useItem(it2.id); g.store.useItem(it3.id);
    return {
      passiveAdded: s.passiveSkills.length === before.passive + 1,
      talentAdded: s.talents.length === before.talents + 1,
      buffAdded: s.buffs.length === before.buffs + 1,
      effAtkBonus: g.store.effStat('atk') - s.atk
    };
  });

  // 12. 花费统计：注入用量记录（含缓存命中/未命中）→ 堆叠图渲染 + 命中率 + 缩放跨档钳制
  await win.evaluate(async () => {
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      const pt = 1200 + i * 100;
      const ch = 600 + i * 40;            // 缓存命中
      const cm = pt - ch;                 // 缓存未命中
      await window.taixuan.usage.record({ t: now - i * 3600 * 1000, kind: 'advance', vendor: 'deepseek', model: 'deepseek-chat', pt, ct: 300 + i * 50, ch, cm });
    }
  });
  await win.locator('.gt-btn[data-t="usage"]').click();
  await win.waitForSelector('.usage-modal');
  await win.waitForTimeout(500);
  out.usage = {
    tabs: await win.locator('.usage-modal .ui-tab').count(),
    charts: await win.locator('.barchart').count(),
    bars: await win.locator('.bc-bar').count(),
    segs: await win.locator('.bc-seg').count(),           // 堆叠段（命中/输入/输出）
    legend: await win.locator('.bc-legend').count(),
    priceFields: await win.locator('.usage-pricing .ui-field').count(), // 输入/输出/缓存命中价
    hitRateShown: await win.locator('.usage-sum-item b:has-text("%")').count(),
    defaultScale: await win.locator('.usage-modal .ui-tab.active').innerText()
  };
  const usageZoomIn = win.locator('.usage-zoom-btn').nth(1);
  for (let i = 0; i < 8; i++) await usageZoomIn.click();
  out.usage.afterZoomIn = await win.locator('.usage-modal .ui-tab.active').innerText(); // 应跨至「时」并钳制
  const usageZoomOut = win.locator('.usage-zoom-btn').nth(0);
  for (let i = 0; i < 24; i++) await usageZoomOut.click();
  out.usage.afterZoomOut = await win.locator('.usage-modal .ui-tab.active').innerText(); // 应跨至「年」并钳制
  out.usage.barsAfterZoom = await win.locator('.bc-bar').count();
  await win.locator('.usage-modal .modal-close').click();
  await win.waitForTimeout(200);

  // 13. 退出主界面 → 重进：角色列表 → 存档列表（含自动存档）→ 读档续玩
  await win.locator('.gt-btn[data-t="home"]').click();
  await win.waitForSelector('.menu-screen');
  await win.locator('.menu-card').nth(0).click();
  await win.waitForSelector('.pick-screen');
  await win.waitForTimeout(300);
  out.reenter = { chars: await win.locator('.pick-card:not(.dashed)').count() };
  await win.locator('.pick-card:not(.dashed)').first().click();
  await win.waitForTimeout(400);
  out.reenter.saves = await win.locator('.pick-card:not(.dashed)').count();
  out.reenter.hasAuto = await win.locator('.pick-badge:has-text("自动")').count();
  await win.locator('.pick-card:not(.dashed)').first().click();
  await win.waitForSelector('.game-screen');
  await win.waitForFunction(() => window.__game.store.state.busy === false, null, { timeout: 15000 }).catch(() => {});
  out.reenter.name = await win.evaluate(() => window.__game.store.state.name);
  out.reenter.relations = await win.evaluate(() => window.__game.store.state.relations.length);

  // ==================== 14. 地图模式回归 ====================
  // 主菜单 → 地图模式 → 沿用角色「自检道人」→ 开启新程 → 地图界面
  await win.locator('.gt-btn[data-t="home"]').click();
  await win.waitForSelector('.menu-screen');
  await win.locator('.menu-card').nth(1).click();
  await win.waitForSelector('.pick-screen');
  await win.locator('.pick-card:not(.dashed)').first().click();
  await win.waitForTimeout(400);
  await win.locator('.pick-card.dashed').first().click();
  await win.waitForSelector('.map-screen');
  await win.waitForTimeout(600);

  out.mapMode = {};
  out.mapMode.entry = await win.evaluate(() => {
    const s = window.__game.store.state;
    return { mode: s.mode, time: `第${s.mapTime.year}年${s.mapTime.month}月`, silver: s.wealth.silver, spirit: s.wealth.spirit };
  });
  out.mapMode.worldView = await win.locator('.map-main-stage[data-level="world"] .world-map-panel').count();
  out.mapMode.miniHidden = (await win.locator('.mini-world').count()) === 0;
  out.mapMode.statusPanel = await win.locator('.map-status-panel').count();
  out.mapMode.worldNodes = await win.locator('.world-node').count();

  // 14.1 三级导航：大世界 → 青云门区域（原地直入不耗时）→ 场景；侧栏迷你大世界展开
  await win.locator('.world-node[data-id="qingyun"]').click();
  await win.waitForSelector('.region-map-panel', { timeout: 6000 });
  out.mapMode.regionView = await win.locator('.map-main-stage[data-level="region"] .region-map-panel').count();
  out.mapMode.miniShown = await win.locator('.mini-world').count();
  out.mapMode.regionScenes = await win.locator('.region-node').count();
  out.mapMode.enterFree = await win.evaluate(() => {
    const t = window.__game.store.state.mapTime; return t.year === 1 && t.month === 1;
  });
  await win.locator('.region-node[data-id="qy_dadian"]').click();
  await win.waitForSelector('.scene-panel', { timeout: 6000 });
  out.mapMode.sceneView = await win.locator('.map-main-stage[data-level="scene"] .scene-panel').count();
  out.mapMode.sceneNpcs = await win.locator('.npc-chip').count();
  out.mapMode.sceneFacilities = await win.locator('.fac-btn').count();

  // 14.2 NPC 对话：AI 寒暄（本地兜底）+ 关系注册 + 自由对话 + 固定话题
  await win.locator('.npc-chip').first().click();
  await win.waitForSelector('.npc-dialog');
  await win.waitForFunction(() => {
    const el = document.querySelector('.npc-dialog .npc-line span');
    return el && !el.classList.contains('npc-wait') && el.textContent.length > 1;
  }, null, { timeout: 8000 });
  out.mapMode.npcGreet = (await win.locator('.npc-dialog .npc-line').first().innerText()).slice(0, 40);
  out.mapMode.npcRelation = await win.evaluate(() => window.__game.store.state.relations.some(r => r.name === '清虚子'));
  out.mapMode.npcTopics = await win.locator('.npc-topic').count();
  await win.locator('.npc-input').fill('道友可曾见过会飞的剑？');
  await win.locator('.npc-send').click();
  await win.waitForFunction(() => {
    const lines = document.querySelectorAll('.npc-dialog .npc-line');
    if (lines.length < 3) return false;
    return !lines[lines.length - 1].querySelector('.npc-wait');
  }, null, { timeout: 8000 });
  out.mapMode.npcFreeChat = (await win.locator('.npc-dialog .npc-line').last().innerText()).slice(0, 40);

  // 14.3 固定话题 → 宗门大殿：拜入青云门（无门槛）→ 领宗门任务（+2月 +赏银 +好感）
  await win.locator('.npc-topic:has-text("拜入宗门")').click();
  await win.waitForSelector('.sect-modal');
  const silverBefore = await win.evaluate(() => window.__game.store.state.wealth.silver);
  await win.locator('.sect-acts .btn.gold:has-text("拜入宗门")').click();
  await win.waitForTimeout(300);
  out.mapMode.sectJoined = await win.evaluate(() => window.__game.store.state.sect);
  await win.locator('.sect-acts .btn.gold:has-text("领宗门任务")').click();
  await win.waitForTimeout(300);
  out.mapMode.quest = await win.evaluate((sb) => {
    const s = window.__game.store.state;
    return { silverUp: s.wealth.silver > sb, affinity: s.sectAffinity.qingyun ?? 0, time: `${s.mapTime.year}年${s.mapTime.month}月` };
  }, silverBefore);
  await win.locator('.sect-modal .modal-close').click();
  await win.waitForTimeout(200);
  await win.locator('.npc-dialog .modal-close').click();
  await win.waitForTimeout(200);

  // 14.4 闭关修炼：闭关室 → 入定闭关（默认3月，修为增、时光+3月）
  await win.locator('.fac-btn.leave').click();
  await win.waitForSelector('.region-map-panel', { timeout: 6000 });
  await win.locator('.region-node[data-id="qy_biguan"]').click();
  await win.waitForSelector('.scene-panel', { timeout: 6000 });
  const cultBefore = await win.evaluate(() => window.__game.store.state.cultivation);
  await win.locator('.fac-btn:has-text("闭关室")').click();
  await win.waitForSelector('.cult-modal');
  await win.locator('.cult-modal .bk-go').click();
  await win.waitForTimeout(300);
  out.mapMode.cultivate = await win.evaluate((b) => {
    const s = window.__game.store.state;
    return { gain: s.cultivation - b, time: `${s.mapTime.year}年${s.mapTime.month}月` };
  }, cultBefore);
  await win.locator('.cult-modal .modal-close').click();
  await win.waitForTimeout(200);

  // 14.5 炼丹：注入背包草药（V2.4 起草药入背包堆叠） → 炼丹房 → 必成注入炼制（丹药入包 + 经验 + 耗时1月）
  await win.evaluate(() => { window.__game.store.addHerb('jinling', 2); window.__game.store.addHerb('xinyi', 2); });
  await win.locator('.fac-btn.leave').click();
  await win.waitForSelector('.region-map-panel', { timeout: 6000 });
  await win.locator('.region-node[data-id="qy_liandan"]').click();
  await win.waitForSelector('.scene-panel', { timeout: 6000 });
  await win.locator('.fac-btn:has-text("炼丹房")').click();
  await win.waitForSelector('.alchemy-modal');
  out.mapMode.alchemyHerbChips = await win.locator('.alch-herb-chip').count();
  await win.evaluate(() => { window.__rand = Math.random; Math.random = () => 0.01; });
  const itemsBefore = await win.evaluate(() => window.__game.store.state.items.length);
  await win.locator('.alch-item:not(.lack) .btn.gold.sm').first().click();
  await win.waitForTimeout(300);
  out.mapMode.alchemy = await win.evaluate((ib) => {
    const s = window.__game.store.state;
    return {
      pillGained: s.items.length === ib + 1,
      expGained: s.alchemyExp > 0,
      herbConsumed: (window.__game.store.herbCounts().jinling ?? 0) === 1,
      time: `${s.mapTime.year}年${s.mapTime.month}月`
    };
  }, itemsBefore);
  await win.evaluate(() => { Math.random = window.__rand; });
  await win.locator('.alchemy-modal .modal-close').click();
  await win.waitForTimeout(200);

  // 14.6 财富系统：汇兑双向 + 购物/售出（确定性，直驱 store）
  out.mapMode.wealth = await win.evaluate(() => {
    const st = window.__game.store;
    st.gainWealth({ silver: 2000 });
    const s0 = st.state.wealth.silver;
    const ex1 = st.exchangeSilverToSpirit();
    const afterEx = { silver: st.state.wealth.silver, spirit: st.state.wealth.spirit };
    const ex2 = st.exchangeSpiritToSilver();
    const buy = st.buyMapItem('huixue_dan');
    const it = st.state.items.find(i => i.name === '回血丹');
    const sell = it ? st.sellMapItem(it.id) : { ok: false };
    return {
      ex1: ex1.ok, afterEx, silverDropOnEx: s0 - afterEx.silver === 1000,
      ex2: ex2.ok, buyOk: buy.ok, sellOk: sell.ok
    };
  });

  // 14.7 突破系统：修为圆满 → 按钮就绪；必成/必败注入（失败回退一个小境界）
  await win.evaluate(() => { const st = window.__game.store; st.set({ cultivation: st.state.cultivationCap }); });
  await win.waitForTimeout(300);
  out.mapMode.breakReady = await win.locator('.ms-break-btn.ready').count();
  out.mapMode.breakthrough = await win.evaluate(() => {
    const st = window.__game.store;
    const r0 = st.state.realmIndex;
    const rand = Math.random;
    Math.random = () => 0.01; // 必成
    const w1 = st.mapBreakthrough();
    const r1 = st.state.realmIndex;
    st.set({ cultivation: st.state.cultivationCap });
    Math.random = () => 0.99; // 必败
    const w2 = st.mapBreakthrough();
    const r2 = st.state.realmIndex;
    Math.random = rand;
    return { r0, winUp: w1.success === true && r1 === r0 + 1, failRollback: w2.success === false && r2 === r1 - 1 };
  });

  // 14.8 战斗「静息」（恢复50%法力）+ 切磋血线钳制（点到为止不致死）
  out.mapMode.rest = await win.evaluate(async () => {
    const g = window.__game; const st = g.store;
    const stash = { p: st.state.passiveSkills, t: st.state.talents, b: st.state.buffs };
    st.set({ passiveSkills: [], talents: [], buffs: [], mp: 10 }); // 屏蔽被动回蓝干扰
    const expect = 10 + Math.round(st.effStat('maxMp') * 0.5);
    g.combat.start({ enemy: { name: '自检木人', desc: '', hp: 500, atk: 1, pdef: 0, mdef: 0, skills: [{ name: '轻拍', mult: 1 }] }, playerFirst: true, spar: true });
    await g.combat.playerAction({ type: 'rest' });
    const r = { recovered: st.state.mp === expect, sparFlag: st.state.combat?.spar === true };
    st.set({ passiveSkills: stash.p, talents: stash.t, buffs: stash.b, combat: null, mp: st.effStat('maxMp') });
    return r;
  });
  out.mapMode.sparClamp = await win.evaluate(() => {
    const g = window.__game; const st = g.store;
    const stash = { p: st.state.passiveSkills, t: st.state.talents, b: st.state.buffs };
    st.set({ passiveSkills: [], talents: [], buffs: [] });
    g.combat.start({ enemy: { name: '自检重锤', desc: '', hp: 500, atk: 9999, pdef: 0, mdef: 0, skills: [{ name: '重击', mult: 5 }] }, playerFirst: true, spar: true });
    st.applyEffects({ hp: -99999 }); // 切磋中致命伤害应钳至 1
    const r = { hp: st.state.hp, alive: !st.state.dead };
    st.set({ passiveSkills: stash.p, talents: stash.t, buffs: stash.b, combat: null, hp: st.effStat('maxHp') });
    return r;
  });

  // 14.9 地图模式存档往返：模式/宗门/位置/时间/背包草药/财富全量恢复
  out.mapMode.saveRound = await win.evaluate(async () => {
    const g = window.__game; const st = g.store;
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const snap = {
      mode: st.state.mode, sect: st.state.sect,
      loc: { ...st.state.mapLocation }, time: { ...st.state.mapTime },
      herbs: st.herbCounts(), silver: st.state.wealth.silver
    };
    await g.saves.save('mapcheck');
    st.set({ mapLocation: { world: 'fentian', region: 'fentian', scene: null }, items: [], wealth: { silver: 1, spirit: 0 } });
    const ok = await g.saves.load('mapcheck');
    const back = {
      mode: st.state.mode, sect: st.state.sect,
      loc: { ...st.state.mapLocation }, time: { ...st.state.mapTime },
      herbs: st.herbCounts(), silver: st.state.wealth.silver
    };
    await g.saves.remove('mapcheck');
    return {
      ok, modeKept: back.mode === 'map', sectKept: back.sect === snap.sect,
      locKept: eq(back.loc, snap.loc), timeKept: eq(back.time, snap.time),
      herbsKept: eq(back.herbs, snap.herbs), silverKept: back.silver === snap.silver
    };
  });
  await win.waitForTimeout(500);

  // 14.10 寿元：推进150年（练气上限100年）→ 陨落遮罩；元婴后寿元无限（逻辑断言）
  out.mapMode.lifespan = await win.evaluate(async () => {
    const st = window.__game.store;
    const r = st.advanceMapTime(12 * 150);
    const dead = !!st.state.dead;
    const { isLifespanOver } = await import('./src/core/time.js');
    return { died: r.died, dead, immortal: isLifespanOver({ year: 99999, month: 1 }, 3) === false };
  });
  await win.waitForSelector('.dead-mask', { timeout: 3000 });
  out.mapMode.deadMask = await win.locator('.dead-mask').count();
  await win.evaluate(() => window.__game.store.set({ dead: null })); // 清场便于截图
  await win.waitForTimeout(300);

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await win.screenshot({ path: 'selfcheck.png' });
  await app.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error('SELFCHECK FAILED:', e); process.exit(1); });
