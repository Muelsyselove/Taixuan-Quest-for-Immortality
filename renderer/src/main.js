// 渲染进程入口：应用级单例 + 屏幕流转
// 流程：主界面 → （对话模式）角色选择 → 存档选择 → 游戏界面；设置随时可入
import { GameStore } from './core/store.js';
import { NarrativeEngine } from './core/ai.js';
import { CombatEngine } from './core/combat.js';
import { SaveManager } from './core/saves.js';
import { AudioEngine } from './core/audio.js';
import { ScreenManager } from './core/screens.js';
import { MistRenderer } from './gl/MistRenderer.js';
import { MainMenu } from './screens/MainMenu.js';
import { CharacterSelect } from './screens/CharacterSelect.js';
import { SaveSelect } from './screens/SaveSelect.js';
import { SettingsView } from './screens/SettingsView.js';
import { GameScreen } from './screens/GameScreen.js';
import { CONFIG } from './core/config.js';

/* ---------- 应用级单例 ---------- */
const store = new GameStore();
const engine = new NarrativeEngine(store);
const combat = new CombatEngine(store, engine);
const saves = new SaveManager(store);
const mist = new MistRenderer(document.getElementById('gl-bg'));
const audio = new AudioEngine();
const screens = new ScreenManager(document.getElementById('app'));

// AI 战斗信号 → 系统战斗引擎
engine.onCombatSignal = (signal) => combat.start(signal);

// 应用设置（画质/声音）实时生效
function applyAppSettings(app) {
  const q = CONFIG.qualityLevels.find(x => x.key === app.quality) ?? CONFIG.qualityLevels[2];
  mist.setQuality(q.dpr);
  audio.apply({ volume: app.volume, muted: app.muted });
}
engine.onAppSettings = applyAppSettings;

// 音效挂钩：突破祥瑞 / 陨落哀音 / 战斗遭遇
store.subscribe(['history'], () => {
  const last = store.state.history.at(-1);
  if (last?.kind === 'breakthrough') audio.chime();
  if (last?.kind === 'death') audio.fall();
});
store.subscribe(['combat'], () => { if (store.state.combat) audio.hit(); });

/* ---------- 屏幕流转 ---------- */

function showMainMenu() {
  screens.show('menu', new MainMenu(store, {
    audio,
    onMode: (key) => {
      if (key === 'dialogue') showCharSelect();
      else if (key === 'settings') showSettings();
    }
  }));
}

function showSettings() {
  screens.show('settings', new SettingsView(store, { engine, audio, onBack: showMainMenu }));
}

function showCharSelect() {
  screens.show('chars', new CharacterSelect(store, {
    engine, audio,
    onBack: showMainMenu,
    onPick: (ch) => showSaveSelect(ch)
  }));
}

function showSaveSelect(ch) {
  screens.show('saves', new SaveSelect(store, {
    char: ch, audio,
    onBack: showCharSelect,
    onEnter: (slot) => enterGame(ch, slot)
  }));
}

/** 进入游戏：绑定角色存档空间 → 读档/新开局 → 挂载游戏界面 → 推进剧情 */
async function enterGame(char, slot) {
  saves.bind(char.id);
  if (slot) {
    await saves.load(slot);
  } else {
    const rec = await window.taixuan.chars.read(char.id).catch(() => null);
    store.reset(rec?.setup || {});
  }
  screens.show('game', new GameScreen(store, {
    engine, combat, saves, mist, audio, char,
    onExit: async () => {
      await saves.autoSave().catch(() => {}); // 退出时自动存档，便于续玩
      showMainMenu();
    }
  }));
  await engine.advance(null, { opening: true });
  if (!slot) saves.autoSave(); // 新开局落定后立即落一档
}

/* ---------- 窗口控制 ---------- */
document.getElementById('btn-min').onclick = () => window.taixuan.win.min();
document.getElementById('btn-max').onclick = () => window.taixuan.win.max();
document.getElementById('btn-close').onclick = () => window.taixuan.win.close();

/* ---------- 启动 ---------- */
(async () => {
  await engine.loadSettings();
  applyAppSettings(engine.app);
  document.title = CONFIG.gameTitle;
  showMainMenu();
})();

// 调试钩子
window.__game = { store, engine, combat, saves, mist, audio, screens };
