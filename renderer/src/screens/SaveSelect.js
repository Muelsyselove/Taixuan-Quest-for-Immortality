// 存档选择：选定角色后，读取其独立存档空间，选择存档进入或开启新程
import { Component, h } from '../core/component.js';
import { PickCard, armDelete } from '../components/PickCard.js';
import { EmptyState } from '../ui/controls.js';

export class SaveSelect extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { char, audio, mode, onBack, onEnter(slotKey|null) } — slotKey=null 表示新开局；mode 过滤本模式存档
    this.slots = null;
  }

  render() {
    this.listEl = h('div', { class: 'pick-grid' });
    this.el = h('div', { class: 'screen pick-screen' },
      h('div', { class: 'pick-wrap' },
        h('div', { class: 'pick-head' },
          h('button', { class: 'pick-back', title: '返回角色选择', onclick: () => { this.props.audio?.click(); this.props.onBack?.(); } }, '‹'),
          h('div', { class: 'pick-head-text' },
            h('div', { class: 'pick-title' }, `选择存档 · ${this.props.char.name}`),
            h('div', { class: 'pick-sub' }, this.props.char.origin || '出身未明')
          )
        ),
        this.listEl
      )
    );
    return this.el;
  }

  afterMount() { this._load(); }

  async _load() {
    const all = await window.taixuan.saves.list(this.props.char.id).catch(() => []) || [];
    // 模式隔离：仅展示本模式存档；无 mode 的旧存档视为 dialogue
    const mode = this.props.mode === 'map' ? 'map' : 'dialogue';
    this.slots = all.filter(s => (s.mode || 'dialogue') === mode);
    this._renderList();
  }

  _renderList() {
    this.listEl.innerHTML = '';

    // 开启新程（虚线行动卡）：以角色初始设定从零开始
    this.listEl.appendChild(PickCard({
      dashed: true,
      icon: 'spark',
      title: '开启新程',
      lines: ['以此角色的初始设定，自第一日重新启程'],
      onClick: () => { this.props.audio?.choose(); this.props.onEnter?.(null); }
    }));

    if (!this.slots.length) {
      this.listEl.appendChild(EmptyState({ text: '此角色尚无存档', sub: '点击「开启新程」踏入太玄大陆' }));
      return;
    }

    for (const s of this.slots) {
      const time = s.savedAt ? new Date(s.savedAt).toLocaleString('zh-CN', { hour12: false }) : '';
      this.listEl.appendChild(PickCard({
        icon: 'scroll',
        title: s.auto ? '自动存档' : s.slot,
        lines: [`${s.realm || ''} · 第${s.day ?? '?'}日`, time],
        badge: s.auto ? '自动' : '',
        onClick: () => { this.props.audio?.choose(); this.props.onEnter?.(s.slot); },
        onDelete: s.auto ? null : (btn) => armDelete(btn, async () => {
          await window.taixuan.saves.remove(this.props.char.id, s.slot);
          this._load();
        })
      }));
    }
  }
}
