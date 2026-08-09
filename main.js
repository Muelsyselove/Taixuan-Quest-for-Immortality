// 太玄问道 · Electron 主进程
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const configPath = () => path.join(app.getPath('userData'), 'settings.json');
const savesDir = () => {
  const dir = path.join(app.getPath('userData'), 'saves');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const saveFile = (name) => {
  // 防目录穿越
  const safe = String(name).replace(/[^\w一-龥-]/g, '_').slice(0, 60);
  return path.join(savesDir(), `${safe}.json`);
};

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

/* ---------- 设置持久化 ---------- */
ipcMain.handle('settings:read', () => {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf-8'));
  } catch {
    return null;
  }
});
ipcMain.handle('settings:write', (_e, data) => {
  fs.writeFileSync(configPath(), JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

/* ---------- 存档 ---------- */
ipcMain.handle('saves:list', () => {
  try {
    return fs.readdirSync(savesDir())
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(savesDir(), f), 'utf-8'));
          return {
            slot: f.replace(/\.json$/, ''),
            savedAt: raw.savedAt || null,
            day: raw.state?.day ?? null,
            realm: raw.state?.realm ?? null,
            name: raw.state?.name ?? null,
            auto: f === 'auto.json'
          };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  } catch { return []; }
});
ipcMain.handle('saves:read', (_e, slot) => {
  try {
    return JSON.parse(fs.readFileSync(saveFile(slot), 'utf-8'));
  } catch { return null; }
});
ipcMain.handle('saves:write', (_e, slot, data) => {
  try {
    fs.writeFileSync(saveFile(slot), JSON.stringify(data), 'utf-8');
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err) }; }
});
ipcMain.handle('saves:delete', (_e, slot) => {
  try { fs.unlinkSync(saveFile(slot)); return { ok: true }; }
  catch (err) { return { ok: false, error: String(err) }; }
});

/* ---------- AI：对话 ---------- */
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
    return { ok: true, content: data?.choices?.[0]?.message?.content ?? '' };
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
