// 游戏界面（对话模式）：工具条 + 三栏布局，组装全部游戏组件
import { Component, h, icon } from '../core/component.js';
import { CharacterPanel } from '../components/CharacterPanel.js';
import { EventPanel } from '../components/EventPanel.js';
import { OptionDock } from '../components/OptionDock.js';
import { MapView } from '../components/MapView.js';
import { HistoryLog } from '../components/HistoryLog.js';
import { CombatOverlay } from '../components/CombatOverlay.js';
import { SettingsModal } from '../components/SettingsModal.js';
import { InventoryModal } from '../components/InventoryModal.js';
import { SkillsModal } from '../components/SkillsModal.js';
import { RelationsModal } from '../components/RelationsModal.js';
import { SaveLoadModal } from '../components/SaveLoadModal.js';
import { UsageModal } from '../components/UsageModal.js';

export class GameScreen extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { engine, combat, saves, mist, audio, char, onExit }
    this._kids = [];
  }

  render() {
    const { engine, char } = this.props;
    const tool = (key, label, ic, onClick) =>
      h('button', { class: 'gt-btn', 'data-t': key, title: label, onclick: onClick },
        icon(ic, 14), h('span', null, label));

    this.el = h('div', { class: 'screen game-screen' },
      h('div', { class: 'game-toolbar' },
        h('div', { class: 'gt-left' },
          tool('home', '主页', 'yinyang', () => this.props.onExit?.()),
          h('span', { class: 'gt-char' }, `${char?.name ?? ''} · 对话模式`)
        ),
        h('div', { class: 'gt-right' },
          tool('saves', '存档', 'scroll', () => this._openSaves()),
          tool('relations', '关系', 'heart', () => new RelationsModal(this.store).mount(document.body)),
          tool('usage', '算盘', 'spark', () => new UsageModal(this.store, { engine }).mount(document.body)),
          tool('ai', 'AI', 'talisman', () => new SettingsModal(this.store, { engine }).mount(document.body))
        )
      ),
      h('main', { id: 'layout' },
        h('div', { id: 'col-left' }),
        h('div', { id: 'col-center' }),
        h('div', { id: 'col-right' })
      )
    );
    return this.el;
  }

  afterMount() {
    const { engine, combat, saves, mist, audio } = this.props;
    const store = this.store;
    const $ = (sel) => this.el.querySelector(sel);
    const kid = (c, parent) => { c.mount(parent); this._kids.push(c); return c; };

    kid(new CharacterPanel(store, {
      onOpenSkills: () => new SkillsModal(store).mount(document.body),
      onOpenInventory: () => new InventoryModal(store).mount(document.body),
      onOpenRelations: () => new RelationsModal(store).mount(document.body)
    }), $('#col-left'));

    kid(new EventPanel(store), $('#col-center'));

    kid(new OptionDock(store, {
      onChoose: async (action) => {
        if (store.get('combat')) return; // 战斗中锁定剧情推进
        audio?.choose();
        mist?.pulse(); // 灵雾涌动反馈
        await engine.advance(action);
        saves.autoSave(); // 自动存档
      }
    }), $('#col-center'));

    kid(new MapView(store), $('#col-right'));
    kid(new HistoryLog(store), $('#col-right'));

    // 战斗覆盖层（fixed 定位，挂于本屏幕内随切屏销毁）
    kid(new CombatOverlay(store, { combat }), this.el);
  }

  _openSaves() {
    const { engine, saves, char } = this.props;
    new SaveLoadModal(this.store, {
      saves,
      onLoad: () => engine.advance(null, { opening: true }), // 读档后承接新剧情
      onRestart: async () => {
        // 重开此角色：读取初始设定 → 重置 → 开局 → 自动存档
        const rec = await window.taixuan.chars.read(char.id).catch(() => null);
        this.store.reset(rec?.setup || {});
        await engine.advance(null, { opening: true });
        saves.autoSave();
      }
    }).mount(document.body);
  }

  destroy() {
    for (const k of this._kids) k.destroy?.();
    this._kids = [];
    super.destroy();
  }
}
