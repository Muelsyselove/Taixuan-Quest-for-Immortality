// 动态验证脚本：Electron 43 实机运行巡检（审计用，跑完即删）
const { _electron } = require('/workspace/node_modules/playwright-core');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const app = await _electron.launch({ args: ['.', '--no-sandbox'], cwd: '/workspace' });
  const win = await app.firstWindow();
  const consoleErrors = [];
  win.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  win.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e.message).slice(0, 200)));

  const step = async (name, fn) => {
    try { await fn(); console.log('OK  ' + name); }
    catch (e) { console.log('FAIL ' + name + ' :: ' + String(e.message || e).split('\n')[0].slice(0, 160)); }
  };

  await win.waitForLoadState('domcontentloaded');
  await step('主菜单渲染', () => win.waitForSelector('.menu-screen', { timeout: 15000 }));

  const glInfo = await win.evaluate(() => {
    const c = document.getElementById('gl-bg');
    const g = c.getContext('webgl') || c.getContext('experimental-webgl');
    return { hasCanvas: !!c, ctx: !!g, lost: g ? g.isContextLost() : null };
  });
  console.log('WEBGL', JSON.stringify(glInfo));

  const hook = await win.evaluate(() => ({
    exposed: !!window.__game,
    keys: window.__game ? Object.keys(window.__game) : [],
    apiKeyReadable: !!(window.__game && window.__game.engine && window.__game.engine.settings && 'apiKey' in window.__game.engine.settings)
  }));
  console.log('HOOK ', JSON.stringify(hook));

  await step('点击对话模式', async () => { await win.click('text=对话模式'); await win.waitForSelector('.pick-title'); });
  await step('点击新建角色', async () => { await win.click('text=新建角色'); await win.waitForSelector('.cr-confirm'); });
  await step('填写道号', async () => {
    const input = await win.$('.cr-name input, input[type="text"]');
    if (input) await input.fill('审计道人');
  });
  await step('选择灵根/被动/主动', async () => {
    await win.click('.cr-root');                       // 第一个灵根
    await sleep(1500);                                  // 等待候选生成（本地兜底）
    await win.waitForSelector('.cr-cand', { timeout: 15000 });
    const secs = await win.$$('.cr-sec[data-kind]');
    for (const sec of secs) {
      const kind = await sec.getAttribute('data-kind');
      if (kind === 'talent') continue;                  // 天赋可空
      const cand = await sec.$('.cr-cand');
      if (cand) await cand.click();
      await sleep(200);
    }
  });
  await step('确认创建(踏上路途)', async () => { await win.click('.cr-confirm'); await sleep(1200); });
  await step('选择角色进入存档页', async () => {
    await win.waitForSelector('.pick-title', { timeout: 8000 });
    await win.click('text=审计道人');
    await sleep(500);
  });
  await step('开启新程', async () => { await win.click('text=开启新程'); await sleep(500); });

  await step('等待游戏界面/选项', async () => {
    await win.waitForSelector('.game-screen, .option-dock, .panel-title', { timeout: 20000 });
    await win.waitForFunction(() => !window.__game || !window.__game.store.get('busy'), null, { timeout: 60000 });
  });

  const stateProbe = async (label) => {
    const p = await win.evaluate(() => {
      const s = window.__game.store.state;
      return {
        day: s.day, hp: s.hp, mode: s.mode,
        history: s.history.length,
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        listeners: window.__game.store._listeners.size
      };
    });
    console.log('PROBE', label, JSON.stringify(p));
    return p;
  };
  const before = await stateProbe('进入游戏后');

  let advances = 0;
  for (let i = 0; i < 12; i++) {
    const done = await win.evaluate(() => {
      const g = window.__game;
      if (g.store.get('busy')) return false;
      if (g.store.state.combat) {  // 战斗中：尝试逃跑，避免遮罩卡住后续流程
        const btns = [...document.querySelectorAll('button')];
        const flee = btns.find(b => b.textContent.includes('逃'));
        if (flee) { flee.click(); return true; }
        const atk = btns.find(b => b.textContent.includes('攻') || b.textContent.includes('挥'));
        if (atk) { atk.click(); return true; }
        return false;
      }
      const btn = document.querySelector('.option-grid button, .option-dock button');
      if (!btn) return false;
      btn.click(); return true;
    });
    if (done) {
      advances++;
      await win.waitForFunction(() => !window.__game.store.get('busy'), null, { timeout: 60000 }).catch(() => {});
    }
    await sleep(250);
  }
  console.log('ADVANCES', advances);
  const after = await stateProbe('推进12回合后');
  if (before.heapMB != null && after.heapMB != null) {
    console.log('HEAP_DELTA_MB', after.heapMB - before.heapMB, 'LISTENER_DELTA', after.listeners - before.listeners);
  }

  for (const t of ['saves', 'relations', 'usage', 'ai']) {
    await step('开合模态:' + t, async () => {
      // 确保不在战斗中：over 态需 dismiss 才会收起遮罩
      await win.evaluate(async () => {
        const g = window.__game;
        const c = g.store.state.combat;
        if (!c) return;
        try {
          if (c.phase === 'over') await g.combat.dismiss();
          else { await g.combat.playerAction({ type: 'flee' }); await g.combat.dismiss(); }
        } catch {}
      });
      await sleep(600);
      await win.click(`.gt-btn[data-t="${t}"]`); await sleep(400);
      const mask = await win.$('.modal-mask');
      if (!mask) throw new Error('模态未打开');
      await win.keyboard.press('Escape'); await sleep(150);
      const m2 = await win.$('.modal-mask');
      if (m2) { const x = await m2.$('.ms-close, .modal-close'); if (x) { await x.click(); await sleep(200); } }
      if (await win.$('.modal-mask')) throw new Error('模态未关闭');
    });
  }

  await step('快捷键穿透检查', async () => {
    await win.evaluate(async () => {
      const g = window.__game;
      const c = g.store.state.combat;
      if (!c) return;
      try {
        if (c.phase === 'over') await g.combat.dismiss();
        else { await g.combat.playerAction({ type: 'flee' }); await g.combat.dismiss(); }
      } catch {}
    });
    await sleep(600);
    const dayBefore = await win.evaluate(() => window.__game.store.state.day);
    await win.click('.gt-btn[data-t="saves"]'); await sleep(500);
    const inp = await win.$('.modal-mask input');
    if (!inp) throw new Error('模态无输入框');
    await inp.click();
    await win.keyboard.type('111');
    await sleep(400);
    const dayAfter = await win.evaluate(() => window.__game.store.state.day);
    const histAfter = await win.evaluate(() => window.__game.store.state.history.length);
    if (dayAfter !== dayBefore) console.log('KEYLEAK CONFIRMED day', dayBefore, '->', dayAfter);
    else console.log('KEYLEAK day-unchanged; history=', histAfter);
    await win.keyboard.press('Escape');
  });

  await win.screenshot({ path: '/workspace/.audit-screen.png' });
  console.log('CONSOLE_ERRORS', consoleErrors.length);
  consoleErrors.slice(0, 10).forEach(e => console.log('  CERR:', e));

  await app.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
