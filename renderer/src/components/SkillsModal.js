// 技能 / 天赋 二级页：主动 / 被动 / 天赋 三栏详情
import { Component, h, icon } from '../core/component.js';

const SECTIONS = [
  { key: 'activeSkills', title: '主动技能', icon: 'sword', tip: '战斗中可主动施展，消耗法力' },
  { key: 'passiveSkills', title: '被动技能', icon: 'shield', tip: '常驻生效，无需催动' },
  { key: 'talents', title: '天赋能力', icon: 'spark', tip: '与生俱来的根骨机缘' }
];

export class SkillsModal extends Component {
  constructor(store, props) {
    super(store, props);
    this.tab = 'activeSkills';
  }

  watch() { return ['activeSkills', 'passiveSkills', 'talents']; }

  render() {
    this.tabsEl = h('div', { class: 'inv-tabs' });
    this.bodyEl = h('div', { class: 'skill-detail-list' });

    const mask = h('div', {
      class: 'modal-mask',
      onclick: (e) => { if (e.target === mask) this.close(); }
    },
      h('div', { class: 'modal skills-modal' },
        h('header', { class: 'panel-head' },
          icon('sword', 16),
          h('span', { class: 'panel-title' }, '功法神通'),
          h('button', { class: 'modal-close', onclick: () => this.close() }, '×')
        ),
        h('div', { class: 'inv-filters' }, this.tabsEl),
        this.bodyEl
      )
    );
    this.el = mask;
    return mask;
  }

  afterMount() { this.update(); }

  update() {
    this.tabsEl.innerHTML = '';
    for (const sec of SECTIONS) {
      const count = this.store.state[sec.key].length;
      this.tabsEl.appendChild(h('button', {
        class: `inv-tab ${this.tab === sec.key ? 'active' : ''}`,
        onclick: () => { this.tab = sec.key; this.update(); }
      }, `${sec.title} · ${count}`));
    }

    const sec = SECTIONS.find(s => s.key === this.tab);
    const list = this.store.state[this.tab];
    this.bodyEl.innerHTML = '';
    this.bodyEl.appendChild(h('div', { class: 'skill-sec-tip' }, sec.tip));
    if (!list.length) {
      this.bodyEl.appendChild(h('div', { class: 'inv-empty' }, '尚未领悟'));
      return;
    }
    for (const sk of list) {
      this.bodyEl.appendChild(
        h('div', { class: 'skill-detail' },
          h('div', { class: 'skill-detail-head' },
            icon(sec.icon, 16),
            h('b', null, sk.name),
            sk.cost != null ? h('span', { class: 'skill-cost' }, `耗蓝 ${sk.cost}`) : null,
            sk.mult != null ? h('span', { class: 'skill-mult' }, `倍率 ${sk.mult}`) : null
          ),
          h('p', { class: 'skill-detail-desc' }, sk.desc || '（无描述）')
        )
      );
    }
  }

  close() { this.destroy(); }
}
