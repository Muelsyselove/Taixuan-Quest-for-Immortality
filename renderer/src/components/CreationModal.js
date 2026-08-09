// 角色设定界面：新开征程时的创建向导
// 灵根(1~5) / 天赋(AI生成·0~3) / 被动技能(AI生成·1~2) / 主动技能(AI生成·与灵根相关·1~2)
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';

const SECTIONS = [
  { kind: 'talent',  title: '天赋',     min: 0, max: 3, tip: '天成之质，可弃权不选' },
  { kind: 'passive', title: '初始被动', min: 1, max: 2, tip: '常驻生效的心法' },
  { kind: 'active',  title: '初始主动', min: 1, max: 2, tip: '与所选灵根相应的术法' }
];

export class CreationModal extends Component {
  constructor(store, props) {
    super(store, props);
    // props.engine: NarrativeEngine；props.onComplete(setup)
    this.roots = new Set();                       // 已选灵根 key
    this.cands = { talent: [], passive: [], active: [] };
    this.picks = { talent: new Set(), passive: new Set(), active: new Set() }; // 按 name
    this.loading = { talent: false, passive: false, active: false };
    this.secEls = {};
  }

  render() {
    // 灵根区
    this.rootsEl = h('div', { class: 'cr-roots' },
      CONFIG.roots.map(r => h('button', {
        class: 'cr-root',
        style: { '--root-color': r.color },
        onclick: () => this._toggleRoot(r.key)
      }, r.label))
    );

    const mask = h('div', { class: 'modal-mask' },
      h('div', { class: 'modal creation-modal' },
        h('header', { class: 'panel-head' },
          icon('lotus', 16),
          h('span', { class: 'panel-title' }, '角色设定 · 新的征程')
        ),
        h('div', { class: 'cr-scroll' },
          h('section', { class: 'cr-sec' },
            h('div', { class: 'cr-sec-head' },
              h('b', null, '灵根'),
              h('span', { class: 'cr-tip' }, '择 1~5 行（决定可习主动术法）'),
              h('span', { class: 'cr-count', 'data-for': 'roots' }, '')
            ),
            this.rootsEl
          ),
          ...SECTIONS.map(sec => {
            const el = h('section', { class: 'cr-sec', 'data-kind': sec.kind });
            this.secEls[sec.kind] = el;
            return el;
          })
        ),
        h('footer', { class: 'cr-foot' },
          h('span', { class: 'cr-hint' }, ''),
          h('button', { class: 'btn gold cr-confirm', onclick: () => this._confirm() }, '踏上路途')
        )
      )
    );
    this.el = mask;
    return mask;
  }

  afterMount() {
    this._renderRoots();
    for (const sec of SECTIONS) this._renderSec(sec);
    this._refresh('talent');
    this._refresh('passive');
    this._refresh('active');
  }

  /* ---------- 灵根 ---------- */

  _toggleRoot(key) {
    if (this.roots.has(key)) this.roots.delete(key);
    else if (this.roots.size < 5) this.roots.add(key);
    this._renderRoots();
    // 灵根变化 → 主动技能候选随之刷新
    this.picks.active.clear();
    this._refresh('active');
    this._validate();
  }

  _renderRoots() {
    [...this.rootsEl.children].forEach((btn, i) => {
      btn.classList.toggle('sel', this.roots.has(CONFIG.roots[i].key));
    });
    const counter = this.el.querySelector('.cr-count[data-for="roots"]');
    if (counter) counter.textContent = `${this.roots.size}/5`;
  }

  /* ---------- 候选区（天赋/被动/主动） ---------- */

  async _refresh(kind) {
    if (this.loading[kind]) return;
    this.loading[kind] = true;
    const sec = SECTIONS.find(s => s.kind === kind);
    this._renderSec(sec);
    const list = await this.props.engine.generateCreation(kind, [...this.roots]);
    this.cands[kind] = list;
    // 保留仍存在的选项
    const names = new Set(list.map(x => x.name));
    this.picks[kind].forEach(n => { if (!names.has(n)) this.picks[kind].delete(n); });
    this.loading[kind] = false;
    this._renderSec(sec);
    this._validate();
  }

  _togglePick(kind, name) {
    const sec = SECTIONS.find(s => s.kind === kind);
    const set = this.picks[kind];
    if (set.has(name)) set.delete(name);
    else if (set.size < sec.max) set.add(name);
    this._renderSec(sec);
    this._validate();
  }

  _renderSec(sec) {
    const el = this.secEls[sec.kind];
    if (!el) return;
    el.innerHTML = '';
    const picked = this.picks[sec.kind];

    el.appendChild(
      h('div', { class: 'cr-sec-head' },
        h('b', null, sec.title),
        h('span', { class: 'cr-tip' }, `${sec.tip} · 选 ${sec.min}~${sec.max}`),
        h('span', { class: 'cr-count' }, `${picked.size}/${sec.max}`),
        h('button', {
          class: 'cr-refresh',
          disabled: this.loading[sec.kind] ? 'disabled' : null,
          onclick: () => { this.picks[sec.kind].clear(); this._refresh(sec.kind); }
        }, this.loading[sec.kind] ? '生成中…' : '↻ 刷新')
      )
    );

    if (this.loading[sec.kind]) {
      el.appendChild(h('div', { class: 'inv-empty' }, '天机推演中……'));
      return;
    }
    const list = this.cands[sec.kind];
    if (!list.length) {
      el.appendChild(h('div', { class: 'inv-empty' }, '暂无候选，点击刷新生成。'));
      return;
    }
    el.appendChild(
      h('div', { class: 'cr-cands' },
        list.map(c => {
          const rootDef = c.root ? CONFIG.roots.find(r => r.key === c.root) : null;
          return h('button', {
            class: `cr-cand ${picked.has(c.name) ? 'sel' : ''}`,
            onclick: () => this._togglePick(sec.kind, c.name)
          },
            h('div', { class: 'cr-cand-head' },
              h('b', null, c.name),
              rootDef ? h('i', { class: 'cr-cand-root', style: { color: rootDef.color, borderColor: rootDef.color } }, rootDef.label) : null,
              sec.kind === 'active' ? h('i', { class: 'cr-cand-cost' }, `耗蓝${c.cost ?? 10} · 倍率${c.mult ?? 1.5}`) : null
            ),
            h('span', { class: 'cr-cand-desc' }, c.desc)
          );
        })
      )
    );
  }

  /* ---------- 校验与完成 ---------- */

  _valid() {
    return this.roots.size >= 1 && this.roots.size <= 5
      && this.picks.talent.size <= 3
      && this.picks.passive.size >= 1 && this.picks.passive.size <= 2
      && this.picks.active.size >= 1 && this.picks.active.size <= 2;
  }

  _validate() {
    const btn = this.el.querySelector('.cr-confirm');
    const hint = this.el.querySelector('.cr-hint');
    const ok = this._valid();
    if (btn) btn.disabled = ok ? null : 'disabled';
    if (hint) {
      hint.textContent = ok ? '机缘已备，只待启程。'
        : this.roots.size < 1 ? '请先择灵根。'
        : this.picks.passive.size < 1 ? '请至少择一门初始被动。'
        : this.picks.active.size < 1 ? '请至少择一门初始主动。' : '';
    }
  }

  _confirm() {
    if (!this._valid()) return;
    const pickObjs = (kind) => this.cands[kind].filter(c => this.picks[kind].has(c.name));
    this.props.onComplete?.({
      roots: [...this.roots],
      talents: pickObjs('talent'),
      passives: pickObjs('passive'),
      actives: pickObjs('active')
    });
    this.close();
  }

  close() { this.destroy(); }
}
