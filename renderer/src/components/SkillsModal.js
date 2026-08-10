// 技能 / 天赋 二级页：主动 / 被动 / 天赋 三栏详情（技能层结构化字段展示）
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { describeActive, describePassive } from '../core/skills.js';
import { effectText, EFFECTS } from '../core/fx.js';

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
      this.bodyEl.appendChild(this._card(sec.key, sk));
    }
  }

  _card(secKey, sk) {
    const rootDef = sk.root ? CONFIG.roots.find(r => r.key === sk.root) : null;
    return h('div', { class: 'skill-detail' },
      h('div', { class: 'skill-detail-head' },
        icon(SECTIONS.find(s => s.key === secKey).icon, 16),
        h('b', null, sk.name),
        rootDef ? h('i', { class: 'skill-root-tag', style: { color: rootDef.color, borderColor: rootDef.color } }, rootDef.label) : null,
        sk.custom ? h('i', { class: 'skill-custom-tag', title: '存档专属技能：仅当前存档及其后续存档生效' }, '专属') : null,
        sk.cost != null ? h('span', { class: 'skill-cost' }, `耗蓝 ${sk.cost}`) : null
      ),
      h('p', { class: 'skill-detail-desc' }, sk.desc || '（无描述）'),
      this._statLine(secKey, sk),
      this._buffLines(sk)
    );
  }

  /** 技能层结构化数值行 */
  _statLine(secKey, sk) {
    if (secKey === 'activeSkills') {
      return h('div', { class: 'skill-struct' }, describeActive(sk));
    }
    // 被动/天赋：mods → 文案
    if (sk.mods && Object.keys(sk.mods).length) {
      return h('div', { class: 'skill-struct' }, describePassive(sk));
    }
    return null;
  }

  /** 主动技能施加的 buff 明细（buff 层：由效果组成、持续/叠加规则） */
  _buffLines(sk) {
    if (!Array.isArray(sk.buffs) || !sk.buffs.length) return null;
    return h('div', { class: 'skill-buffs' },
      sk.buffs.map(b => {
        const fxText = (b.effects || []).map(e => {
          const def = EFFECTS[e.key];
          return h('i', { style: def ? { color: def.color } : null }, effectText(e));
        });
        return h('div', { class: 'skill-buff-row' },
          h('span', { class: 'skill-buff-name' },
            `${b.target === 'enemy' ? '敌' : '己'}【${b.name}】`),
          h('span', { class: 'skill-buff-meta' },
            `${b.turns} 回合${b.stackable ? ` · 可叠 ${b.maxStacks} 层` : ''}`),
          h('span', { class: 'skill-buff-fx' }, fxText)
        );
      })
    );
  }

  close() { this.destroy(); }
}
