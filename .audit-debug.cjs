const { _electron } = require('/workspace/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const app = await _electron.launch({ args: ['.', '--no-sandbox'], cwd: '/workspace' });
  const win = await app.firstWindow();
  win.on('pageerror', e => console.log('PAGEERROR', String(e.message).slice(0, 150)));
  await win.waitForLoadState('domcontentloaded');
  await win.waitForSelector('.menu-screen', { timeout: 15000 });
  await win.click('text=对话模式');
  await win.waitForSelector('.pick-title');
  await win.click('text=审计道人');
  await sleep(400);
  // 读取已有 auto 存档（上次运行已建）
  const auto = await win.$('text=auto');
  if (auto) { await auto.click(); } else { await win.click('text=开启新程'); }
  await sleep(500);
  await win.waitForFunction(() => window.__game && !window.__game.store.get('busy'), null, { timeout: 60000 }).catch(() => console.log('busy wait timeout'));

  const probe = await win.evaluate(() => {
    const g = window.__game;
    const b = document.querySelector('.gt-btn[data-t="saves"]');
    const r = b ? b.getBoundingClientRect() : null;
    const el = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    const cover = el ? `${el.tagName}.${el.className}#${el.id}` : 'null';
    const chain = el ? (() => { const a = []; let n = el; while (n && n !== document.body) { a.push(`${n.tagName}.${n.className}`); n = n.parentElement; } return a.join(' < '); })() : '';
    return {
      busy: g.store.get('busy'), combat: !!g.store.state.combat,
      combatPhase: g.store.state.combat?.phase ?? null,
      hp: g.store.state.hp, btn: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
      cover, chain,
      overlays: [...document.querySelectorAll('.modal-mask, .combat-mask')].map(e => `${e.className}[display=${e.style.display || 'css'}]`)
    };
  });
  console.log('PROBE', JSON.stringify(probe, null, 1));
  await win.screenshot({ path: '/workspace/.audit-debug.png' });
  await app.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
