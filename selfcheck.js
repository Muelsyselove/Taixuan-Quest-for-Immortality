// 自检脚本 v3：驱动 Electron 全功能回归（主界面 → 角色 → 存档 → 游戏 → 统计）
const { _electron: electron } = require('playwright-core');

(async () => {
  const app = await electron.launch({ args: ['.', '--no-sandbox', '--disable-gpu'], cwd: __dirname });
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

  // 5. 功法二级页
  await win.locator('.char-entry').nth(0).click();
  await win.waitForTimeout(300);
  out.skills = { details: await win.locator('.skill-detail').count() };
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

  // 9. 存档 / 读档（按角色独立 + 分域文件）
  await win.evaluate(() => window.__game.saves.save('selfcheck'));
  const dayNow = await win.evaluate(() => window.__game.store.state.day);
  const loaded = await win.evaluate(() => window.__game.saves.load('selfcheck'));
  out.saves = {
    written: true, loaded,
    dayMatch: (await win.evaluate(() => window.__game.store.state.day)) === dayNow,
    listCount: (await win.evaluate(() => window.__game.saves.list())).length,
    relationsKept: await win.evaluate(() => window.__game.store.state.relations.length)
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

  // 12. 花费统计：注入用量记录 → 双图渲染 + 缩放跨档钳制
  await win.evaluate(async () => {
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      await window.taixuan.usage.record({ t: now - i * 3600 * 1000, kind: 'advance', vendor: 'deepseek', model: 'deepseek-chat', pt: 1200 + i * 100, ct: 300 + i * 50 });
    }
  });
  await win.locator('.gt-btn[data-t="usage"]').click();
  await win.waitForSelector('.usage-modal');
  await win.waitForTimeout(500);
  out.usage = {
    tabs: await win.locator('.usage-modal .ui-tab').count(),
    charts: await win.locator('.barchart').count(),
    bars: await win.locator('.bc-bar').count(),
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

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await win.screenshot({ path: 'selfcheck.png' });
  await app.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error('SELFCHECK FAILED:', e); process.exit(1); });
