// 人物关系谱：姓名 / 身份 / 关系 / 好感度（-100 ~ 100 双色量条）
import { Modal } from '../ui/Modal.js';
import { EmptyState } from '../ui/controls.js';
import { h } from '../core/component.js';

const TIERS = [
  { min: 80, label: '生死至交', color: '#f4d98c' },
  { min: 40, label: '意气相投', color: '#d8b25c' },
  { min: 10, label: '友善', color: '#7fb3a8' },
  { min: -9, label: '萍水相逢', color: '#9a937f' },
  { min: -39, label: '心生嫌隙', color: '#c08a5a' },
  { min: -79, label: '势同水火', color: '#e35d6a' },
  { min: -100, label: '不共戴天', color: '#ff4d5e' }
];
const tierOf = (v) => TIERS.find(t => v >= t.min);

export class RelationsModal extends Modal {
  get modalTitle() { return '人物关系谱'; }
  get modalIcon() { return 'yinyang'; }
  get modalClass() { return 'relations-modal'; }

  watch() { return ['relations']; }

  body() {
    this.listEl = h('div', { class: 'rel-list' });
    return this.listEl;
  }

  afterMount() { this.update(); }

  update() {
    const list = [...this.store.state.relations].sort((a, b) => b.affinity - a.affinity);
    this.listEl.innerHTML = '';
    if (!list.length) {
      this.listEl.appendChild(EmptyState({ text: '江湖偌大，尚未结识任何人。', sub: '剧情中登场的人物会自动登记在此' }));
      return;
    }
    for (const r of list) this.listEl.appendChild(this._card(r));
  }

  _card(r) {
    const tier = tierOf(r.affinity);
    const pct = Math.abs(r.affinity); // 量条长度
    const positive = r.affinity >= 0;
    return h('div', { class: 'rel-card' },
      h('div', { class: 'rel-head' },
        h('b', { class: 'rel-name' }, r.name),
        h('span', { class: 'rel-tier', style: { color: tier.color, borderColor: tier.color } }, tier.label)
      ),
      h('div', { class: 'rel-meta' },
        h('span', { class: 'rel-identity' }, r.identity),
        h('i', { class: 'rel-divider' }, '·'),
        h('span', { class: 'rel-relation' }, r.relation)
      ),
      h('div', { class: 'rel-bar' },
        h('span', { class: 'rel-bar-mid' }),
        h('span', {
          class: `rel-bar-fill ${positive ? 'pos' : 'neg'}`,
          style: {
            [positive ? 'left' : 'right']: '50%',
            width: `${pct / 2}%`,
            background: tier.color
          }
        }),
        h('span', { class: 'rel-bar-val', style: { color: tier.color } }, String(r.affinity))
      ),
      h('div', { class: 'rel-day' }, `第${r.day}日相识`)
    );
  }
}
