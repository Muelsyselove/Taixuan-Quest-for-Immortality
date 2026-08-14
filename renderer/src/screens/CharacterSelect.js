// 角色选择：列出已有角色（含最近存档摘要），或新建角色（进入角色设定向导）
import { Component, h, icon } from '../core/component.js';
import { PickCard, armDelete } from '../components/PickCard.js';
import { CreationModal } from '../components/CreationModal.js';
import { EmptyState } from '../ui/controls.js';

export class CharacterSelect extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { engine, audio, mode, onBack, onPick(character) } — mode 决定仅列出该模式角色
    this.chars = null;
  }

  _modeLabel() { return this.props.mode === 'map' ? '地图模式' : '对话模式'; }

  render() {
    this.listEl = h('div', { class: 'pick-grid' });
    this.el = h('div', { class: 'screen pick-screen' },
      h('div', { class: 'pick-wrap' },
        h('div', { class: 'pick-head' },
          h('button', { class: 'pick-back', title: '返回主界面', onclick: () => { this.props.audio?.click(); this.props.onBack?.(); } }, '‹'),
          h('div', { class: 'pick-head-text' },
            h('div', { class: 'pick-title' }, `选择角色 · ${this._modeLabel()}`),
            h('div', { class: 'pick-sub' }, '两种模式的角色与存档相互独立')
          )
        ),
        this.listEl
      )
    );
    return this.el;
  }

  afterMount() { this._load(); }

  async _load() {
    this.chars = await window.taixuan.chars.list(this.props.mode).catch(() => []) || [];
    this._renderList();
  }

  _renderList() {
    this.listEl.innerHTML = '';

    // 新建角色入口（虚线行动卡）
    this.listEl.appendChild(PickCard({
      dashed: true,
      icon: 'lotus',
      title: '新建角色',
      lines: ['立下道号 · 择出身灵根 · 定天赋功法'],
      onClick: () => this._create()
    }));

    if (!this.chars.length) {
      this.listEl.appendChild(EmptyState({ text: `此模式尚无角色`, sub: '点击「新建角色」踏上仙途' }));
      return;
    }

    for (const ch of this.chars) {
      const last = ch.last;
      const lines = [
        ch.origin ? (ch.origin.length > 26 ? ch.origin.slice(0, 26) + '…' : ch.origin) : '出身未明',
        last
          ? `${last.realm || ''} · 第${last.day ?? '?'}日 · ${new Date(last.savedAt).toLocaleString('zh-CN', { hour12: false })}`
          : `尚无存档 · 创建于 ${new Date(ch.createdAt).toLocaleDateString('zh-CN')}`
      ];
      this.listEl.appendChild(PickCard({
        icon: 'yinyang',
        title: ch.name,
        lines,
        badge: last ? '有存档' : '',
        onClick: () => { this.props.audio?.click(); this.props.onPick?.(ch); },
        onDelete: (btn) => armDelete(btn, async () => {
          await window.taixuan.chars.remove(ch.id);
          this._load();
        })
      }));
    }
  }

  _create() {
    this.props.audio?.click();
    new CreationModal(this.store, {
      engine: this.props.engine,
      onComplete: async (setup) => {
        const resp = await window.taixuan.chars.create({ name: setup.name, origin: setup.origin, setup, mode: this.props.mode });
        if (resp?.ok) this.props.onPick?.(resp.character);
      }
    }).mount(document.body);
  }
}
