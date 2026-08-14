// 渲染进程入口：应用级单例 + 屏幕流转
// 流程：主界面 → （对话/地图模式）角色选择 → 存档选择 → 对应模式游戏界面；设置随时可入
// 读档分发：存档内含 mode 域，读取后按存档模式进入对应界面（跨模式读档亦可）
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
import { MapScreen } from './screens/MapScreen.js';
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
// 战斗遭遇音仅在战斗实例创建时播一次（此前每次 combat 状态变更都触发，回合内反复作响）
let _inCombat = false;
store.subscribe(['combat'], () => {
  const now = !!store.state.combat;
  if (now && !_inCombat) audio.hit();
  _inCombat = now;
});

// 窗口隐藏时暂停 WebGL 灵雾渲染，回前台恢复（降低后台 CPU/GPU 占用）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) mist.stop();
  else mist.start();
});

/* ---------- 屏幕流转 ---------- */

function showMainMenu() {
  screens.show('menu', new MainMenu(store, {
    audio,
    onMode: (key) => {
      if (key === 'dialogue') showCharSelect('dialogue');
      else if (key === 'map') showCharSelect('map');
      else if (key === 'settings') showSettings();
    }
  }));
}

function showSettings() {
  screens.show('settings', new SettingsView(store, { engine, audio, onBack: showMainMenu }));
}

function showCharSelect(mode = 'dialogue') {
  screens.show('chars', new CharacterSelect(store, {
    engine, audio, mode,
    onBack: showMainMenu,
    onPick: (ch) => showSaveSelect(ch, mode)
  }));
}

function showSaveSelect(ch, mode = 'dialogue') {
  screens.show('saves', new SaveSelect(store, {
    char: ch, audio, mode,
    onBack: () => showCharSelect(mode),
    onEnter: (slot) => enterGame(ch, slot, mode)
  }));
}

/**
 * 进入游戏：绑定角色存档空间 → 读档/新开局 → 按模式挂载游戏界面
 * 模式判定：读档以存档内 mode 域为准（跨模式入口亦可正确分发）；新开局以入口模式为准
 */
async function enterGame(char, slot, mode = 'dialogue') {
  saves.bind(char.id);
  if (slot) {
    await saves.load(slot);
  } else {
    const rec = await window.taixuan.chars.read(char.id).catch(() => null);
    store.reset(rec?.setup || {});
    store.set({ mode: rec?.mode || char.mode || mode }); // 新开局以角色归属模式为准
  }
  const effective = store.state.mode === 'map' ? 'map' : 'dialogue';
  const onExit = async () => {
    await saves.autoSave().catch(() => {}); // 退出时自动存档，便于续玩
    showMainMenu();
  };
  if (effective === 'map') {
    screens.show('map', new MapScreen(store, { engine, combat, saves, mist, audio, char, onExit }));
    if (!slot) saves.autoSave(); // 新开局落定后立即落一档
  } else {
    screens.show('game', new GameScreen(store, { engine, combat, saves, mist, audio, char, onExit }));
    await engine.advance(null, { opening: true });
    if (!slot) saves.autoSave();
  }
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

// 调试钩子：仅开发/自检环境（主进程未打包时附加 ?dev=1）挂载，正式包不暴露内部句柄
if (new URLSearchParams(location.search).has('dev')) {
  window.__game = { store, engine, combat, saves, mist, audio, screens };
}
