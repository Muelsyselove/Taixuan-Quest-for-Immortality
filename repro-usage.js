// 复现：进入游戏 → 点击「算盘」→ 检查 usage-modal 是否出现 + 页面错误
const { _electron: electron } = require('playwright-core');

(async () => {
  const electronPath = require('path').join(__dirname, 'node_modules', 'electron', 'dist', 'electron');
  const app = await electron.launch({ executablePath: electronPath, args: ['.', '--no-sandbox', '--disable-gpu'], cwd: __dirname });
  const win = await app.firstWindow();
  win.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  win.on('pageerror', (e) => console.log('[pageerror]', String(e.stack || e)));

  await win.waitForFunction(() => !!window.__game, null, { timeout: 20000 });
  await win.evaluate(() => {
    const g = window.__game;
    g.engine.settings.apiKey = '';
    g.engine._syncReady();
    g.engine.onCombatSignal = null;
  });
  await win.waitForSelector('.menu-card', { timeout: 10000 });

  // 对话模式 → 新建角色（最少操作）
  await win.locator('.menu-card').nth(0).click();
  await win.waitForSelector('.pick-screen');
  await win.locator('.pick-card.dashed').click();
  await win.waitForSelector('.creation-modal');
  await win.locator('.creation-modal .set-input').first().fill('复现道人');
  await win.locator('.cr-root').nth(0).click();
  await win.locator('.cr-root').nth(1).click();
  await win.waitForTimeout(400);
  await win.locator('.cr-sec[data-kind="passive"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="active"] .cr-cand').first().click();
  await win.locator('.cr-sec[data-kind="talent"] .cr-cand').first().click();
  await win.locator('.cr-confirm').click();
  await win.waitForSelector('.pick-screen');
  await win.locator('.pick-card.dashed').first().click();
  await win.waitForSelector('.game-screen');
  await win.waitForFunction(() => window.__game.store.state.busy === false, null, { timeout: 15000 }).catch(() => {});

  console.log('toolbar buttons:', await win.locator('.gt-btn').count());

  // 点击「算盘」
  await win.locator('.gt-btn[data-t="usage"]').click();
  await win.waitForTimeout(1500);
  const info = await win.evaluate(() => {
    const mask = document.querySelector('.modal-mask');
    const modal = document.querySelector('.usage-modal');
    const vis = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: r.width, h: r.height, display: cs.display, visibility: cs.visibility, opacity: cs.opacity };
    };
    return { mask: vis(mask), modal: vis(modal), bodyChildren: document.body.children.length };
  });
  console.log('after click:', JSON.stringify(info, null, 2));

  await app.close();
})().catch(e => { console.error('REPRO FAILED:', e.message); process.exit(1); });
