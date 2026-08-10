// 太玄问道 · Electron 主进程
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

/* ================= 路径基础设施 ================= */

const userDir = (...p) => path.join(app.getPath('userData'), ...p);
const configPath = () => userDir('settings.json');
const usagePath = () => userDir('usage.json');

// 防目录穿越 / 非法字符
const safeName = (name, fallback = 'x') => {
  const s = String(name ?? '').replace(/[^\w一-龥-]/g, '_').slice(0, 60);
  return s || fallback;
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function readJSON(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}
function writeJSON(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data), 'utf-8');
}

/* ---------- 角色目录 ----------
 * userData/
 *   characters/
 *     index.json                    角色登记册 [{id,name,origin,createdAt,last}]
 *     <charId>/
 *       character.json              角色档案（创建设定：姓名/出身/灵根/天赋/技能）
 *       saves/<slot>/               每个存档槽 = 一个目录，按域分文件
 *         meta.json                 {slot,savedAt,day,realm,name,auto}
 *         profile.json              个人信息（姓名/出身/境界/属性/修为/灵根/位置/天数/增益）
 *         inventory.json            背包
 *         skills.json               功法神通（主动/被动/天赋）
 *         relations.json            人物关系
 *         history.json              史册
 */
const charsDir = () => ensureDir(userDir('characters'));
const charIndexPath = () => path.join(charsDir(), 'index.json');
const charDir = (id) => userDir('characters', safeName(id));
const charFile = (id) => path.join(charDir(id), 'character.json');
const savesRoot = (id) => ensureDir(path.join(charDir(id), 'saves'));
const slotDir = (id, slot) => path.join(savesRoot(id), safeName(slot));

const readIndex = () => readJSON(charIndexPath(), []) || [];
const writeIndex = (list) => writeJSON(charIndexPath(), list);

function createWindow() {
  const win = new BrowserWindow({
    width: 1560,
    height: 940,
    minWidth: 1280,
    minHeight: 760,
    frame: false,
    backgroundColor: '#07090d',
    show: false,
    title: '太玄问道',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  ipcMain.on('win:min', () => win.minimize());
  ipcMain.on('win:max', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
  ipcMain.on('win:close', () => win.close());
}

/* ================= 设置持久化（AI / 画质 / 声音 / 单价） ================= */
ipcMain.handle('settings:read', () => readJSON(configPath()));
ipcMain.handle('settings:write', (_e, data) => {
  // 与既有内容合并，避免不同模块互相覆盖字段
  const cur = readJSON(configPath(), {}) || {};
  writeJSON(configPath(), { ...cur, ...data });
  return true;
});

/* ================= 角色登记册 ================= */
ipcMain.handle('chars:list', () => {
  try {
    return readIndex().sort((a, b) => (b.last?.savedAt || b.createdAt || 0) - (a.last?.savedAt || a.createdAt || 0));
  } catch { return []; }
});

ipcMain.handle('chars:create', (_e, payload) => {
  try {
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const character = {
      id,
      name: String(payload?.name || '无名散修').slice(0, 12),
      origin: String(payload?.origin || '').slice(0, 100),
      createdAt: Date.now(),
      setup: payload?.setup && typeof payload.setup === 'object' ? payload.setup : {}
    };
    ensureDir(charDir(id));
    writeJSON(charFile(id), character);
    const idx = readIndex();
    idx.push({ id, name: character.name, origin: character.origin, createdAt: character.createdAt, last: null });
    writeIndex(idx);
    return { ok: true, id, character };
  } catch (err) { return { ok: false, error: String(err) }; }
});

ipcMain.handle('chars:read', (_e, id) => readJSON(charFile(id)));

ipcMain.handle('chars:delete', (_e, id) => {
  try {
    fs.rmSync(charDir(id), { recursive: true, force: true });
    writeIndex(readIndex().filter(c => c.id !== id));
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err) }; }
});

/* ================= 存档（按角色独立 + 按域分文件） ================= */

function updateIndexLast(id, meta) {
  const idx = readIndex();
  const hit = idx.find(c => c.id === id);
  if (hit) {
    hit.last = { savedAt: meta.savedAt, day: meta.day, realm: meta.realm };
    if (meta.name) hit.name = meta.name;
    writeIndex(idx);
  }
}

ipcMain.handle('saves:list', (_e, charId) => {
  try {
    return fs.readdirSync(savesRoot(charId), { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const meta = readJSON(path.join(slotDir(charId, d.name), 'meta.json'));
        return meta ? { ...meta, slot: d.name, auto: d.name === 'auto' } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  } catch { return []; }
});

ipcMain.handle('saves:read', (_e, charId, slot) => {
  try {
    const dir = slotDir(charId, slot);
    const meta = readJSON(path.join(dir, 'meta.json'));
    if (!meta) return null;
    // 旧版单文件存档兼容
    const legacy = readJSON(path.join(dir, 'legacy.json'));
    if (legacy) return { meta, legacy };
    const files = {};
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f === 'meta.json') continue;
      files[f.replace(/\.json$/, '')] = readJSON(path.join(dir, f));
    }
    return { meta, files };
  } catch { return null; }
});

ipcMain.handle('saves:write', (_e, charId, slot, payload) => {
  try {
    const dir = ensureDir(slotDir(charId, slot));
    const files = payload?.files || {};
    for (const [domain, data] of Object.entries(files)) {
      writeJSON(path.join(dir, `${safeName(domain)}.json`), data);
    }
    const meta = { ...(payload?.meta || {}), slot: safeName(slot) };
    writeJSON(path.join(dir, 'meta.json'), meta);
    updateIndexLast(charId, meta);
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err) }; }
});

ipcMain.handle('saves:delete', (_e, charId, slot) => {
  try { fs.rmSync(slotDir(charId, slot), { recursive: true, force: true }); return { ok: true }; }
  catch (err) { return { ok: false, error: String(err) }; }
});

/* ---------- 旧版存档一次性迁移（userData/saves/*.json → 按角色分目录） ---------- */
function migrateLegacySaves() {
  const legacyDir = userDir('saves');
  if (!fs.existsSync(legacyDir)) return;
  let files = [];
  try { files = fs.readdirSync(legacyDir).filter(f => f.endsWith('.json')); } catch { return; }
  if (!files.length) return;

  const idx = readIndex();
  for (const f of files) {
    const raw = readJSON(path.join(legacyDir, f));
    if (!raw?.state) continue;
    const slot = f.replace(/\.json$/, '');
    const name = raw.state.name || '旧旅人';
    let ch = idx.find(c => c.name === name);
    if (!ch) {
      ch = { id: `clegacy${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, origin: '', createdAt: raw.savedAt || Date.now(), last: null };
      idx.push(ch);
      ensureDir(charDir(ch.id));
      writeJSON(charFile(ch.id), { id: ch.id, name, origin: '', createdAt: ch.createdAt, setup: {} });
    }
    const dir = ensureDir(slotDir(ch.id, slot));
    writeJSON(path.join(dir, 'legacy.json'), raw);
    writeJSON(path.join(dir, 'meta.json'), {
      slot, savedAt: raw.savedAt || Date.now(),
      day: raw.state.day ?? 1, realm: raw.state.realm ?? '', name
    });
  }
  writeIndex(idx);
  try { fs.renameSync(legacyDir, userDir(`saves.migrated-${Date.now()}`)); } catch { /* 保留原目录亦无碍 */ }
}

/* ================= Token 用量统计 ================= */
ipcMain.handle('usage:record', (_e, entry) => {
  try {
    const data = readJSON(usagePath(), { records: [] });
    data.records.push({
      t: entry.t || Date.now(),
      kind: String(entry.kind || 'advance'),
      vendor: String(entry.vendor || ''),
      model: String(entry.model || ''),
      pt: Math.max(0, Math.round(entry.pt || 0)),
      ct: Math.max(0, Math.round(entry.ct || 0))
    });
    // 上限裁剪，避免无限膨胀
    if (data.records.length > 50000) data.records = data.records.slice(-40000);
    writeJSON(usagePath(), data);
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err) }; }
});
ipcMain.handle('usage:read', () => (readJSON(usagePath(), { records: [] }) || { records: [] }).records);

/* ================= AI：对话（含 usage 回传） ================= */
ipcMain.handle('ai:chat', async (_e, payload) => {
  const { baseUrl, apiKey, model, messages, temperature = 0.9 } = payload || {};
  if (!baseUrl || !model) throw new Error('AI 配置不完整：缺少 baseUrl 或 model');

  const endpoint = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ model, messages, temperature, stream: false })
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`AI 服务返回 ${resp.status}: ${text.slice(0, 300)}`);
    }
    const data = await resp.json();
    return {
      ok: true,
      content: data?.choices?.[0]?.message?.content ?? '',
      usage: data?.usage ? {
        prompt_tokens: data.usage.prompt_tokens ?? 0,
        completion_tokens: data.usage.completion_tokens ?? 0,
        total_tokens: data.usage.total_tokens ?? 0
      } : null
    };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? '请求超时（90s）' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
});

/* ---------- AI：拉取厂商模型列表（保证模型时效性） ---------- */
ipcMain.handle('ai:models', async (_e, { baseUrl, apiKey }) => {
  if (!baseUrl) return { ok: false, error: '缺少 baseUrl' };
  const endpoint = baseUrl.replace(/\/+$/, '') + '/models';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch(endpoint, {
      signal: controller.signal,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
    });
    if (!resp.ok) throw new Error(`返回 ${resp.status}`);
    const data = await resp.json();
    const ids = (data?.data || []).map(m => m.id).filter(Boolean).sort();
    return { ok: true, models: ids };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? '请求超时' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
});

app.whenReady().then(() => {
  migrateLegacySaves();
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
