// 渲染进程入口：组装所有组件
import { GameStore } from './core/store.js';
import { NarrativeEngine } from './core/ai.js';
import { CombatEngine } from './core/combat.js';
import { SaveManager } from './core/saves.js';
import { MistRenderer } from './gl/MistRenderer.js';
import { CharacterPanel } from './components/CharacterPanel.js';
import { EventPanel } from './components/EventPanel.js';
import { OptionDock } from './components/OptionDock.js';
import { MapView } from './components/MapView.js';
import { HistoryLog } from './components/HistoryLog.js';
import { SettingsModal } from './components/SettingsModal.js';
import { InventoryModal } from './components/InventoryModal.js';
import { SkillsModal } from './components/SkillsModal.js';
import { SaveLoadModal } from './components/SaveLoadModal.js';
import { CreationModal } from './components/CreationModal.js';
import { CombatOverlay } from './components/CombatOverlay.js';
import { CONFIG } from './core/config.js';

const store = new GameStore();
const engine = new NarrativeEngine(store);
const combat = new CombatEngine(store, engine);
const saves = new SaveManager(store);
const mist = new MistRenderer(document.getElementById('gl-bg'));

// AI 战斗信号 → 系统战斗引擎
engine.onCombatSignal = (signal) => combat.start(signal);

/* ---------- 组件挂载 ---------- */
new CharacterPanel(store, {
  onOpenSkills: () => new SkillsModal(store).mount(document.body),
  onOpenInventory: () => new InventoryModal(store).mount(document.body)
}).mount(document.getElementById('col-left'));

new EventPanel(store).mount(document.getElementById('col-center'));
new OptionDock(store, {
  onChoose: async (action) => {
    if (store.get('combat')) return; // 战斗中锁定剧情推进
    mist.pulse(); // 灵雾涌动反馈
    await engine.advance(action);
    saves.autoSave(); // 自动存档
  }
}).mount(document.getElementById('col-center'));

new MapView(store).mount(document.getElementById('col-right'));
new HistoryLog(store).mount(document.getElementById('col-right'));

// 战斗覆盖层
new CombatOverlay(store, { combat }).mount(document.body);

/* ---------- 窗口控制与工具 ---------- */
document.getElementById('btn-min').onclick = () => window.taixuan.win.min();
document.getElementById('btn-max').onclick = () => window.taixuan.win.max();
document.getElementById('btn-close').onclick = () => window.taixuan.win.close();
document.getElementById('btn-settings').onclick = () => {
  new SettingsModal(store, { engine }).mount(document.body);
};
document.getElementById('btn-saves').onclick = () => {
  new SaveLoadModal(store, {
    saves,
    onLoad: () => engine.advance(null, { opening: true }), // 读档后承接新剧情
    onNewGame: () => {
      // 新开征程：角色设定 → 重置 → 开局 → 自动存档
      new CreationModal(store, {
        engine,
        onComplete: async (setup) => {
          store.reset(setup);
          await engine.advance(null, { opening: true });
          saves.autoSave();
        }
      }).mount(document.body);
    }
  }).mount(document.body);
};

/* ---------- 启动 ---------- */
(async () => {
  await engine.loadSettings();
  document.title = CONFIG.gameTitle;
  engine.advance(null, { opening: true });
})();

// 调试钩子
window.__game = { store, engine, combat, saves };
