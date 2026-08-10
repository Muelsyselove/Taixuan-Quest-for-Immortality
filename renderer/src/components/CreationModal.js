// 角色设定界面：新开征程时的创建向导
// 姓名(可编辑) / 出身(固定选项或自由填写≤100字) / 灵根(1~5) / 天赋(AI生成·0~3) / 被动(1~2) / 主动(与灵根相关·1~2)
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { FormField, TextInput } from '../ui/controls.js';

const SECTIONS = [
  { kind: 'talent',  title: '天赋',     min: 0, max: 3, tip: '天成之质，可弃权不选' },
  { kind: 'passive', title: '初始被动', min: 1, max: 2, tip: '常驻生效的心法' },
  { kind: 'active',  title: '初始主动', min: 1, max: 2, tip: '与所选灵根相应的术法' }
];

export class CreationModal extends Component {
  constructor(store, props) {
    super(store, props);
    // props.engine: NarrativeEngine；props.onComplete(setup)
    this.name = '';                               // 角色姓名
    this.originKey = CONFIG.origins[0].key;       // 选中的预设出身
    this.originFree = '';                         // 自由填写出身（非空时优先）
    this.roots = new Set();                       // 已选灵根 key
    this.cands = { talent: [], passive: [], active: [] };
    this.picks = { talent: new Set(), passive: new Set(), active: new Set() }; // 按 name
    this.loading = { talent: false, passive: false, active: false };
    this.secEls = {};
  }

  render() {
    /* 姓名 */
    this.nameEl = TextInput({
      placeholder: '立下道号……（必填）',
      maxlength: 12,
      onChange: (v) => { this.name = v.trim(); this._validate(); }
    });

    /* 出身：预设 + 自由填写 */
    this.originChipsEl = h('div', { class: 'cr-origins' },
      CONFIG.origins.map(o => h('button', {
        class: `cr-origin ${o.key === this.originKey ? 'sel' : ''}`,
        'data-key': o.key,
        title: o.desc,
        onclick: () => this._pickOrigin(o.key)
      }, o.label))
    );
    this.originFreeEl = h('textarea', {
      class: 'cr-origin-free',
      placeholder: '或自书出身（≤100 字，填写后优先于此）……',
      maxlength: 100,
      rows: 2
    });
    this.originFreeEl.addEventListener('input', () => {
      this.originFree = this.originFreeEl.value.trim();
      this.originCountEl.textContent = `${this.originFreeEl.value.length}/100`;
      this._renderOrigins();
      this._validate();
    });
    this.originCountEl = h('span', { class: 'cr-origin-count' }, '0/100');

    /* 灵根区 */
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
              h('b', null, '道号'),
              h('span', { class: 'cr-tip' }, '行走江湖的名号（必填）')
            ),
            this.nameEl
          ),
          h('section', { class: 'cr-sec' },
            h('div', { class: 'cr-sec-head' },
              h('b', null, '出身'),
              h('span', { class: 'cr-tip' }, '择一预设，或自书出身'),
              this.originCountEl
            ),
            this.originChipsEl,
            this.originFreeEl
          ),
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
    this._validate();
  }

  /* ---------- 出身 ---------- */

  _pickOrigin(key) {
    this.originKey = key;
    this.originFree = '';
    this.originFreeEl.value = '';
    this.originCountEl.textContent = '0/100';
    this._renderOrigins();
    this._validate();
  }

  _renderOrigins() {
    const freeActive = this.originFree.length > 0;
    for (const btn of this.originChipsEl.children) {
      const on = btn.dataset.key === this.originKey && !freeActive;
      btn.classList.toggle('sel', on);
      btn.classList.toggle('dim', freeActive);
    }
  }

  _originText() {
    if (this.originFree) return this.originFree.slice(0, 100);
    const hit = CONFIG.origins.find(o => o.key === this.originKey);
    return hit ? `${hit.label}——${hit.desc}` : '';
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
    return this.name.length >= 1
      && this.roots.size >= 1 && this.roots.size <= 5
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
        : this.name.length < 1 ? '请先立下道号。'
        : this.roots.size < 1 ? '请择灵根。'
        : this.picks.passive.size < 1 ? '请至少择一门初始被动。'
        : this.picks.active.size < 1 ? '请至少择一门初始主动。' : '';
    }
  }

  _confirm() {
    if (!this._valid()) return;
    const pickObjs = (kind) => this.cands[kind].filter(c => this.picks[kind].has(c.name));
    this.props.onComplete?.({
      name: this.name.slice(0, 12),
      origin: this._originText(),
      roots: [...this.roots],
      talents: pickObjs('talent'),
      passives: pickObjs('passive'),
      actives: pickObjs('active')
    });
    this.close();
  }

  close() { this.destroy(); }
}
