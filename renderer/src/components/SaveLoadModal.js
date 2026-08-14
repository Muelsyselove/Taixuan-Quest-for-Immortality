// 存档 / 读档 弹窗
import { h } from '../core/component.js';
import { Modal } from '../ui/Modal.js';

export class SaveLoadModal extends Modal {
  get modalTitle() { return '存档 · 读档'; }
  get modalIcon() { return 'scroll'; }
  get modalClass() { return 'save-modal'; }

  constructor(store, props) {
    super(store, props);
    // props.saves: SaveManager, props.onLoad: fn 读档后回调（重新推进剧情）
    this.slots = [];
    this.busy = false;
  }

  body() {
    this.listEl = h('div', { class: 'save-list' });
    this.inputEl = h('input', { class: 'set-input', placeholder: '新存档名称…', maxlength: 24 });
    return [
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
    ];
  }

  afterMount() { this.refresh(); }

  async refresh() {
    try {
      const all = await this.props.saves.list();
      // 模式隔离：仅展示当前模式的存档（旧存档无 mode 视为 dialogue）
      const mode = this.store.state.mode === 'map' ? 'map' : 'dialogue';
      this.slots = all.filter(s => (s.mode || 'dialogue') === mode);
    } catch (e) {
      // 读档列表失败：按无存档渲染，不阻塞弹窗
      this.slots = [];
    }
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
}
