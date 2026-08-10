// 存档 / 读档 弹窗
import { Component, h, icon } from '../core/component.js';

export class SaveLoadModal extends Component {
  constructor(store, props) {
    super(store, props);
    // props.saves: SaveManager, props.onLoad: fn 读档后回调（重新推进剧情）
    this.slots = [];
    this.busy = false;
  }

  render() {
    this.listEl = h('div', { class: 'save-list' });
    this.inputEl = h('input', { class: 'set-input', placeholder: '新存档名称…', maxlength: 24 });

    const mask = h('div', {
      class: 'modal-mask',
      onclick: (e) => { if (e.target === mask) this.close(); }
    },
      h('div', { class: 'modal save-modal' },
        h('header', { class: 'panel-head' },
          icon('scroll', 16),
          h('span', { class: 'panel-title' }, '存档 · 读档'),
          h('button', { class: 'modal-close', onclick: () => this.close() }, '×')
        ),
        h('div', { class: 'save-new' },
          this.inputEl,
          h('button', {
            class: 'btn gold',
            onclick: async () => {
              const name = this.inputEl.value.trim() || `存档-${new Date().toLocaleString('zh-CN', { hour12: false })}`;
              await this.props.saves.save(name);
              this.inputEl.value = '';
              this.refresh();
            }
          }, '存档'),
          h('button', {
            class: 'btn ghost save-newgame',
            onclick: () => { this.close(); this.props.onRestart?.(); }
          }, '重开此角色')
        ),
        this.listEl
      )
    );
    this.el = mask;
    return mask;
  }

  afterMount() { this.refresh(); }

  async refresh() {
    this.slots = await this.props.saves.list();
    this.listEl.innerHTML = '';
    if (!this.slots.length) {
      this.listEl.appendChild(h('div', { class: 'inv-empty' }, '尚无存档。'));
      return;
    }
    for (const slot of this.slots) {
      const time = slot.savedAt ? new Date(slot.savedAt).toLocaleString('zh-CN', { hour12: false }) : '';
      this.listEl.appendChild(
        h('div', { class: `save-item ${slot.auto ? 'is-auto' : ''}` },
          h('div', { class: 'save-info' },
            h('b', null, slot.auto ? '自动存档' : slot.slot),
            h('span', null, `${slot.name ?? ''} · ${slot.realm ?? ''} · 第${slot.day ?? '?'}日 · ${time}`)
          ),
          h('div', { class: 'save-ops' },
            h('button', {
              class: 'btn gold',
              onclick: async () => {
                const ok = await this.props.saves.load(slot.slot);
                if (ok) { this.close(); this.props.onLoad?.(); }
              }
            }, '读取'),
            slot.auto ? null : h('button', {
              class: 'btn ghost',
              onclick: async () => { await this.props.saves.remove(slot.slot); this.refresh(); }
            }, '删除')
          )
        )
      );
    }
  }

  close() { this.destroy(); }
}
