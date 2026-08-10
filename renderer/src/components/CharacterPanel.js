// 个人面板：属性条 / 境界 / 背包与功法入口（按钮 + 二级页）
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';

export class CharacterPanel extends Component {
  watch() {
    return ['hp', 'maxHp', 'mp', 'maxMp', 'atk', 'pdef', 'mdef',
            'cultivation', 'cultivationCap', 'realm', 'realmIndex',
            'activeSkills', 'passiveSkills', 'talents', 'items', 'name',
            'roots', 'buffs', 'relations'];
  }

  render() {
    const s = this.store.state;

    this.nameEl = h('div', { class: 'char-name' }, s.name);
    this.realmEl = h('div', { class: 'char-realm' });
    this.rootsEl = h('div', { class: 'char-roots' });
    this.statsEl = h('div', { class: 'char-stats' });
    this.buffsEl = h('div', { class: 'char-buffs' });
    this.entryEl = h('div', { class: 'char-entries' });

    this.el = h('aside', { class: 'panel char-panel' },
      h('header', { class: 'panel-head' },
        icon('yinyang', 16),
        h('span', { class: 'panel-title' }, '个人面板')
      ),
      h('div', { class: 'char-identity' },
        h('div', { class: 'char-seal', html: this._sealSVG() }),
        this.nameEl,
        this.realmEl,
        this.rootsEl
      ),
      this.statsEl,
      this.buffsEl,
      this.entryEl
    );
    return this.el;
  }

  afterMount() { this.update(); }

  _sealSVG() {
    // 篆刻风格印章
    return `<svg viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M32 14v10M22 24h20M26 24c0 8-4 12-10 14M38 24c0 8 4 12 10 14M24 38h16v10H24z"
        fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  update() {
    const s = this.store.state;
    this.realmEl.innerHTML = '';
    this.realmEl.append(
      h('span', { class: 'realm-badge' }, s.realm),
      h('span', { class: 'realm-stage' }, `${s.realmIndex + 1} 重天`)
    );

    // 灵根：五行小印
    this.rootsEl.innerHTML = '';
    if (s.roots?.length) {
      for (const key of s.roots) {
        const def = CONFIG.roots.find(r => r.key === key);
        if (!def) continue;
        this.rootsEl.appendChild(
          h('span', { class: 'root-chip', title: `${def.label}灵根`, style: { color: def.color, borderColor: def.color } }, def.label)
        );
      }
    }

    // 属性区：配置驱动（数值含增益加成时标注）
    this.statsEl.innerHTML = '';
    for (const def of CONFIG.stats) {
      const val = s[def.key];
      const bonus = ['atk', 'pdef', 'mdef'].includes(def.key) ? this.store.effStat(def.key) - val : 0;
      const row = h('div', { class: 'stat-row' },
        h('span', { class: 'stat-icon', style: def.color ? { color: def.color } : null }, icon(def.icon, 15)),
        h('span', { class: 'stat-label' }, def.label),
        def.bar
          ? h('span', { class: 'stat-bar' },
              h('span', {
                class: 'stat-bar-fill',
                style: {
                  width: `${Math.min(100, (val / (s[def.max] || 1)) * 100)}%`,
                  background: def.color || 'var(--gold)'
                }
              })
            )
          : null,
        h('span', { class: 'stat-value' },
          def.bar ? `${val} / ${s[def.max]}` : String(val),
          bonus > 0 ? h('i', { class: 'stat-bonus' }, `+${bonus}`) : null
        )
      );
      this.statsEl.appendChild(row);
    }

    // 增益栏：常驻 buff 记录
    this.buffsEl.innerHTML = '';
    this.buffsEl.appendChild(h('div', { class: 'buff-bar-title' }, '增益'));
    if (s.buffs?.length) {
      const wrap = h('div', { class: 'buff-bar' });
      for (const b of s.buffs) {
        wrap.appendChild(h('span', { class: 'buff-tag', title: `${b.desc}（第${b.day}日所得）` }, b.name));
      }
      this.buffsEl.appendChild(wrap);
    } else {
      this.buffsEl.appendChild(h('div', { class: 'buff-empty' }, '暂无增益'));
    }

    // 入口按钮：功法神通 / 背包 / 人物关系
    const skillCount = s.activeSkills.length + s.passiveSkills.length + s.talents.length;
    this.entryEl.innerHTML = '';
    this.entryEl.append(
      h('button', { class: 'char-entry', onclick: () => this.props.onOpenSkills?.() },
        icon('sword', 16),
        h('span', { class: 'entry-text' },
          h('b', null, '功法神通'),
          h('i', null, `主动 ${s.activeSkills.length} · 被动 ${s.passiveSkills.length} · 天赋 ${s.talents.length}`)
        ),
        h('span', { class: 'entry-arrow' }, '›')
      ),
      h('button', { class: 'char-entry', onclick: () => this.props.onOpenInventory?.() },
        icon('drop', 16),
        h('span', { class: 'entry-text' },
          h('b', null, '背包'),
          h('i', null, `${s.items.length} 件物品`)
        ),
        h('span', { class: 'entry-arrow' }, '›')
      ),
      h('button', { class: 'char-entry', onclick: () => this.props.onOpenRelations?.() },
        icon('heart', 16),
        h('span', { class: 'entry-text' },
          h('b', null, '人物关系'),
          h('i', null, s.relations.length ? `${s.relations.length} 位故交` : '尚未结识任何人')
        ),
        h('span', { class: 'entry-arrow' }, '›')
      )
    );
  }
}
