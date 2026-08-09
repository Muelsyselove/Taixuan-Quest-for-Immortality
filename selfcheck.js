// 自检脚本 v2：驱动 Electron 全功能回归
const { _electron: electron } = require('playwright-core');

(async () => {
  const app = await electron.launch({ args: ['.'], cwd: __dirname });
  const win = await app.firstWindow();

  const errors = [];
  win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  win.on('pageerror', (e) => errors.push(String(e.stack || e)));

  // 0. 启动收尾：等开局叙事落定（事件出现且不在思考中）；随后强制本地兜底模式 + 屏蔽剧情随机战斗，
  //    避免历史配置/网络/战斗遮罩导致后续步骤不确定
  await win.waitForFunction(() => window.__game && window.__game.store.state.event && window.__game.store.state.busy === false, null, { timeout: 30000 }).catch(() => {});
  await win.evaluate(() => {
    const g = window.__game;
    g.store.set({ busy: false, combat: null });
    g.engine.onCombatSignal = null;      // 测试期间剧情不再触发战斗
    g.engine.settings.apiKey = '';       // 仅改内存，不落盘
    g.engine._syncReady();
  });
  await win.waitForTimeout(400);
  const out = {};

  // 1. 基础 UI
  out.base = {
    options: await win.locator('.option-card').count(),
    stats: await win.locator('.stat-row').count(),
    nodes: await win.locator('.map-node').count(),
    entries: await win.locator('.char-entry').count()
  };

  // 2. 背包：筛选 + 使用物品
  await win.locator('.char-entry').nth(1).click();
  await win.waitForTimeout(400);
  out.inventory = {
    items: await win.locator('.inv-item').count(),
    tabs: await win.locator('.inv-tab').count(),
    rarities: await win.locator('.inv-rarity').count()
  };
  await win.locator('.inv-rarity').nth(3).click(); // 精良（全部/平凡/优秀/精良…）
  await win.waitForTimeout(200);
  out.inventory.jingliangCount = await win.locator('.inv-item').count();
  out.inventory.rarityDots = await win.locator('.inv-dot').count();
  const hpBefore = await win.evaluate(() => window.__game.store.state.hp);
  await win.locator('.inv-rarity').nth(0).click();
  await win.waitForTimeout(200);
  const useBtn = win.locator('.inv-use').first();
  if (await useBtn.count()) { await useBtn.click(); await win.waitForTimeout(300); }
  out.inventory.hpBefore = hpBefore;
  out.inventory.hpAfterUse = await win.evaluate(() => window.__game.store.state.hp);
  out.inventory.itemsAfterUse = await win.evaluate(() => window.__game.store.state.items.length);
  await win.keyboard.press('Escape');
  await win.locator('.modal-close').click();
  await win.waitForTimeout(200);

  // 3. 功法二级页
  await win.locator('.char-entry').nth(0).click();
  await win.waitForTimeout(300);
  out.skills = {
    details: await win.locator('.skill-detail').count(),
    tabs: await win.locator('.inv-tab').count()
  };
  await win.locator('.modal-close').click();
  await win.waitForTimeout(200);

  // 4. 地图缩放
  const zoomIn = win.locator('.map-zoom-btn').nth(1);
  for (let i = 0; i < 12; i++) await zoomIn.click();
  out.map = { maxZoom: await win.locator('.map-zoom-label').innerText() };
  const zoomOut = win.locator('.map-zoom-btn').nth(0);
  for (let i = 0; i < 20; i++) await zoomOut.click();
  out.map.minZoom = await win.locator('.map-zoom-label').innerText();
  await win.locator('.map-zoom-btn.reset').click();

  // 5. 手动触发战斗并完整打一场（本地策略代理敌方）
  await win.evaluate(() => {
    window.__game.store.set({ combat: null });
    window.__game.combat.start({
      enemy: { name: '试炼木傀儡', desc: '自检用', hp: 40, atk: 5, pdef: 2, mdef: 2, skills: [{ name: '木拳', desc: '', mult: 1.3 }] },
      playerFirst: true
    });
  });
  await win.waitForTimeout(500);
  out.combat = { visible: await win.locator('.combat-stage').count(), phaseBtns: await win.locator('.combat-btn').count() };
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
  out.combat.rounds = guard;
  // 收尾：确保战斗遮罩消失——未分胜负则强制清理，已结束则点「收起战局」
  await win.evaluate(() => {
    const g = window.__game;
    if (g.store.state.combat && g.store.state.combat.phase !== 'over') g.store.set({ combat: null });
  });
  const goldBtn = win.locator('.combat-actions .btn.gold');
  if (await goldBtn.count()) { await goldBtn.click(); await win.waitForTimeout(300); }
  out.combat.maskGone = await win.evaluate(() => !window.__game.store.state.combat);

  // 6. 存档 / 读档
  await win.evaluate(() => window.__game.saves.save('selfcheck'));
  const dayNow = await win.evaluate(() => window.__game.store.state.day);
  const loaded = await win.evaluate(() => window.__game.saves.load('selfcheck'));
  const dayLoaded = await win.evaluate(() => window.__game.store.state.day);
  out.saves = { written: true, loaded, dayNow, dayLoaded, listCount: (await win.evaluate(() => window.__game.saves.list())).length };
  await win.evaluate(() => window.__game.saves.remove('selfcheck'));

  // 7. 剧情推进 → 自动存档
  await win.locator('.option-card').first().click();
  await win.waitForFunction(() => window.__game.store.state.busy === false, null, { timeout: 15000 }).catch(() => {});
  await win.waitForTimeout(500);
  out.autosave = (await win.evaluate(() => window.__game.saves.list())).some(s => s.auto);

  // 8. 物品 grant 注册：技能 / 天赋 / 常驻增益全部生效
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
      effAtkBonus: g.store.effStat('atk') - s.atk,
      cultMult: g.store.cultivationMult()
    };
  });

  // 9. 新开征程 → 角色设定（灵根 2 + 天赋 1 + 被动 1 + 主动 1）
  await win.locator('#btn-saves').click();
  await win.waitForTimeout(300);
  await win.locator('.save-newgame').click();
  await win.waitForTimeout(600);
  await win.locator('.cr-root').nth(0).click();
  await win.locator('.cr-root').nth(1).click();
  await win.waitForTimeout(400);
  await win.locator('.cr-sec[data-kind="passive"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="active"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="talent"] .cr-cand').first().click();
  await win.waitForTimeout(200);
  out.creation = {
    confirmEnabled: await win.locator('.cr-confirm:not([disabled])').count(),
    rootsPicked: await win.locator('.cr-root.sel').count()
  };
  await win.locator('.cr-confirm').click();
  await win.waitForFunction(() => window.__game.store.state.busy === false, null, { timeout: 15000 }).catch(() => {});
  await win.waitForTimeout(400);
  out.creation.rootsInState = await win.evaluate(() => window.__game.store.state.roots.length);
  out.creation.activesInState = await win.evaluate(() => window.__game.store.state.activeSkills.length);
  out.creation.autosaved = (await win.evaluate(() => window.__game.saves.list())).some(s => s.auto);

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await win.screenshot({ path: 'selfcheck.png' });
  await app.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error('SELFCHECK FAILED:', e); process.exit(1); });
