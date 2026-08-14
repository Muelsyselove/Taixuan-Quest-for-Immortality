// README 截图脚本：驱动 Electron 走完关键界面并截图到 docs/images/
// 用法：node scripts/screenshot.js
const { _electron: electron } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'images');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron');
  const app = await electron.launch({ executablePath: electronPath, args: ['.', '--no-sandbox'], cwd: path.join(__dirname, '..') });
  const win = await app.firstWindow();

  const shot = async (name) => {
    await win.screenshot({ path: path.join(OUT_DIR, name), type: 'jpeg', quality: 88 });
    console.log('[shot]', name);
  };
  const wait = (ms) => win.waitForTimeout(ms);

  // 0. 启动 → 主界面；强制本地兜底模式保证确定性，保留灵雾背景供截图
  await win.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
  await win.evaluate(() => {
    const g = window.__game;
    g.engine.settings.apiKey = '';
    g.engine._syncReady();
    g.engine.onCombatSignal = null;
  });
  await win.waitForSelector('.menu-card', { timeout: 10000 });
  await wait(1200);
  await shot('menu.jpg');

  // 1. 新建角色（对话模式）：填写并截图角色设定弹窗
  await win.locator('.menu-card').nth(0).click();
  await win.waitForSelector('.pick-screen');
  await win.locator('.pick-card.dashed').click();
  await win.waitForSelector('.creation-modal');
  await win.locator('.creation-modal .set-input').first().fill('太玄道人');
  await win.locator('.cr-origin').nth(2).click();
  await win.locator('.cr-root').nth(0).click();
  await win.locator('.cr-root').nth(1).click();
  await wait(600);
  await win.locator('.cr-sec[data-kind="passive"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="active"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="talent"] .cr-cand').first().click();
  await wait(400);
  await shot('creation.jpg');
  await win.locator('.cr-confirm').click();

  // 2. 开启新程 → 对话模式主界面
  await win.waitForSelector('.pick-screen');
  await win.locator('.pick-card.dashed').first().click();
  await win.waitForSelector('.game-screen');
  await win.waitForFunction(() => window.__game.store.state.event && window.__game.store.state.busy === false, null, { timeout: 15000 }).catch(() => {});
  await wait(800);
  await shot('dialogue.jpg');

  // 3. 战斗
  await win.evaluate(() => {
    window.__game.store.set({ combat: null });
    window.__game.combat.start({
      enemy: { name: '入山猛虎', desc: '吊睛白额，煞气凛然', hp: 60, atk: 8, pdef: 3, mdef: 2, skills: [{ name: '虎啸', desc: '', mult: 1.4 }] },
      playerFirst: true
    });
  });
  await wait(600);
  await shot('combat.jpg');
  await win.evaluate(() => window.__game.store.set({ combat: null }));
  const goldBtn = win.locator('.combat-actions .btn.gold');
  if (await goldBtn.count()) { await goldBtn.click(); await wait(300); }

  // 4. 地图模式：大世界 → 区域 → 场景
  await win.locator('.gt-btn[data-t="home"]').click();
  await win.waitForSelector('.menu-screen');
  await win.locator('.menu-card').nth(1).click();
  await win.waitForSelector('.pick-screen');
  await win.locator('.pick-card:not(.dashed)').first().click();
  await wait(500);
  await win.locator('.pick-card.dashed').first().click();
  await win.waitForSelector('.map-screen');
  await wait(1000);
  await shot('worldmap.jpg');

  await win.locator('.world-node[data-id="qingyun"]').click();
  await win.waitForSelector('.region-map-panel', { timeout: 6000 });
  await wait(800);
  await shot('region.jpg');

  await win.locator('.region-node[data-id="qy_dadian"]').click();
  await win.waitForSelector('.scene-panel', { timeout: 6000 });
  await win.locator('.npc-chip').first().click();
  await win.waitForSelector('.npc-dialog');
  await win.waitForFunction(() => {
    const el = document.querySelector('.npc-dialog .npc-line span');
    return el && !el.classList.contains('npc-wait') && el.textContent.length > 1;
  }, null, { timeout: 8000 }).catch(() => {});
  await wait(500);
  await shot('scene.jpg');

  await app.close();
  console.log('[shot] 完成，输出目录：docs/images/');
})().catch((e) => { console.error(e); process.exit(1); });
