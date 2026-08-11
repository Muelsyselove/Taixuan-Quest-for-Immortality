// 地图模式状态面板：年月时间 / 寿元 / 财富兑换 / 宗门 / 突破入口
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { formatTime, formatLifespan } from '../core/time.js';
import { CURRENCY, EXCHANGE_RATE } from '../core/wealth.js';
import { SECTS, getSectStyleLabel } from '../core/mapData.js';

export class MapStatus extends Component {
  watch() {
    return ['mapTime', 'wealth', 'realmIndex', 'cultivation', 'cultivationCap', 'sect', 'mapLocation', 'dead'];
  }

  render() {
    this.timeEl = h('div', { class: 'ms-time' });
    this.lifeEl = h('div', { class: 'ms-life' });
    this.wealthEl = h('div', { class: 'ms-wealth' });
    this.sectEl = h('div', { class: 'ms-sect' });
    this.btEl = h('div', { class: 'ms-break' });

    this.el = h('section', { class: 'panel map-status-panel' },
      h('header', { class: 'panel-head' },
        icon('yinyang', 16),
        h('span', { class: 'panel-title' }, '游历')
      ),
      this.timeEl,
      this.lifeEl,
      this.wealthEl,
      this.sectEl,
      this.btEl
    );
    return this.el;
  }

  afterMount() { this.update(); }

  update() {
    const s = this.store.state;

    // 时间与寿元
    this.timeEl.innerHTML = '';
    this.timeEl.append(
      h('span', { class: 'ms-label' }, '时光'),
      h('span', { class: 'ms-value' }, formatTime(s.mapTime))
    );
    this.lifeEl.innerHTML = '';
    this.lifeEl.append(
      h('span', { class: 'ms-label' }, '寿元'),
      h('span', { class: 'ms-value' }, formatLifespan(s.mapTime, s.realmIndex))
    );

    // 财富与兑换
    this.wealthEl.innerHTML = '';
    const row = (cur, amount, btnLabel, title, fn) => h('div', { class: 'ms-cur-row' },
      h('span', { class: 'ms-cur', style: { color: cur.color } }, icon(cur.icon, 13), `${cur.label} ${amount}`),
      h('button', { class: 'ms-ex-btn', title, onclick: fn }, btnLabel)
    );
    this.wealthEl.append(
      h('div', { class: 'ms-sec-title' }, `财富（1 灵石 = ${EXCHANGE_RATE} 银元）`),
      row(CURRENCY.silver, s.wealth.silver, '兑灵石', `以 ${EXCHANGE_RATE} 银元兑 1 灵石`, () => this.store.exchangeSilverToSpirit()),
      row(CURRENCY.spirit, s.wealth.spirit, '兑银元', `以 1 灵石兑 ${EXCHANGE_RATE} 银元`, () => this.store.exchangeSpiritToSilver())
    );

    // 宗门
    this.sectEl.innerHTML = '';
    const sect = s.sect ? SECTS[s.sect] : null;
    this.sectEl.append(
      h('span', { class: 'ms-label' }, '宗门'),
      sect
        ? h('span', { class: 'ms-sect-badge', style: { color: getSectStyleLabel(sect.style).color } }, sect.name)
        : h('span', { class: 'ms-value dim' }, '散修')
    );

    // 突破入口（修为圆满时高亮）
    this.btEl.innerHTML = '';
    const full = s.cultivation >= s.cultivationCap;
    const atMax = s.realmIndex >= CONFIG.realms.length - 1;
    if (!atMax) {
      this.btEl.appendChild(h('button', {
        class: `ms-break-btn ${full ? 'ready' : ''}`,
        disabled: full ? null : 'disabled',
        title: full ? '修为圆满，可尝试突破大境界' : `修为未满（${s.cultivation}/${s.cultivationCap}）`,
        onclick: () => this.props.onBreakthrough?.()
      }, full ? '⚡ 突破大境界' : '突破（修为未满）'));
    }
  }
}
