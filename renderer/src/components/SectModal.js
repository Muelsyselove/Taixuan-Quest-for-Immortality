// 宗门大殿模态：宗门风貌 / 拜入宗门 / 宗门任务（地图模式）
import { h } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { CONFIG } from '../core/config.js';
import { SECTS, getSectStyleLabel, canJoinSect } from '../core/mapData.js';
import { TIME_COST } from '../core/time.js';

export class SectModal extends Modal {
  get modalTitle() { return SECTS[this.props.sectId]?.name ?? '宗门大殿'; }
  get modalIcon() { return 'yinyang'; }
  get modalClass() { return 'sect-modal'; }

  constructor(store, props = {}) {
    super(store, props);
    // props: { sectId, audio? }
    this.notice = null; // { text, ok }
  }

  body() {
    this.infoEl = h('div', { class: 'sect-info' });
    this.actEl = h('div', { class: 'sect-acts' });
    this.noticeEl = h('div', { class: 'bk-notice' });
    queueMicrotask(() => this._refresh());
    return h('div', { class: 'sect-wrap' }, this.infoEl, this.actEl, this.noticeEl);
  }

  _refresh() {
    const s = this.store.state;
    const sect = SECTS[this.props.sectId];
    if (!sect) return;
    const style = getSectStyleLabel(sect.style);
    const mine = s.sect === sect.id;
    const check = canJoinSect(sect.id, { ...s, affinity: s.sectAffinity });

    // 宗门风貌
    this.infoEl.innerHTML = '';
    const benefits = Object.entries(sect.benefits ?? {})
      .map(([k, v]) => typeof v === 'number' ? `${this._benefitLabel(k)} +${Math.round(v * 100)}%` : this._benefitLabel(k));
    const req = sect.requirements ?? {};
    const reqText = [
      req.realm ? `境界≥${CONFIG.realms[req.realm]}` : null,
      req.affinity ? `好感≥${req.affinity}` : null,
      req.gender === 'female' ? '仅限女修' : null,
      req.evil ? '需为邪修' : null,
      req.righteous ? '邪修不可入' : null
    ].filter(Boolean).join(' · ') || '无门槛';

    this.infoEl.append(
      h('div', { class: 'sect-head-row' },
        h('span', { class: 'region-style-tag', style: { color: style.color, borderColor: style.color } }, style.label),
        h('span', { class: 'sect-focus' }, style.focus)
      ),
      h('p', { class: 'sect-desc' }, sect.desc),
      h('div', { class: 'sect-line' }, h('span', { class: 'ms-label' }, '入门条件'), h('span', { class: 'ms-value' }, reqText)),
      h('div', { class: 'sect-line' }, h('span', { class: 'ms-label' }, '宗门裨益'), h('span', { class: 'ms-value' }, benefits.join('，') || '—')),
      h('div', { class: 'sect-line' },
        h('span', { class: 'ms-label' }, '好感'),
        h('span', { class: 'ms-value' }, `${s.sectAffinity[sect.id] ?? 0}`),
        mine ? h('span', { class: 'sect-mine' }, '已入门墙') : null
      )
    );

    // 行动
    this.actEl.innerHTML = '';
    if (!s.sect) {
      this.actEl.appendChild(h('button', {
        class: 'btn gold', disabled: check.ok ? null : 'disabled',
        title: check.ok ? '' : check.reason,
        onclick: () => this._do(() => this.store.joinSect(sect.id))
      }, check.ok ? '拜入宗门' : (check.reason ?? '不可加入')));
    }
    if (mine) {
      this.actEl.appendChild(h('button', {
        class: 'btn gold',
        onclick: () => this._do(() => this.store.mapQuest())
      }, `领宗门任务（耗时 ${TIME_COST.quest} 月）`));
    }
    if (s.sect && !mine) {
      this.actEl.appendChild(h('div', { class: 'sect-foreign' }, '你已有所属宗门，此处仅可游历'));
    }

    // 结果提示
    this.noticeEl.innerHTML = '';
    if (this.notice) {
      this.noticeEl.appendChild(h('div', { class: `alch-result ${this.notice.ok ? 'ok' : 'fail'}` }, this.notice.text));
      this.notice = null;
    }
  }

  _benefitLabel(key) {
    return {
      cultivationBonus: '闭关收益', alchemyBonus: '炼丹收益', atkBonus: '攻击', mdefBonus: '法防',
      forgeBonus: '炼器', summonBonus: '造物', beastAffinity: '御兽亲和', darkSkillBonus: '魂修神通',
      soulHarvest: '摄魂', swordSkillBonus: '剑修神通', critBonus: '会心', healBonus: '治疗',
      thunderSkillBonus: '雷修神通', speedBonus: '身法', waterSkillBonus: '水系神通'
    }[key] ?? key;
  }

  _do(fn) {
    const r = fn();
    if (r?.ok === false) {
      this.notice = { text: r.reason ?? '不可行', ok: false };
    } else if (r?.died) {
      this.notice = { text: '寿元已尽……', ok: false };
    } else if (r?.sect) {
      this.notice = { text: `礼成——自此为【${r.sect.name}】弟子`, ok: true };
      this.props.audio?.chime?.();
    } else if (r?.silver) {
      this.notice = { text: `任务交割：赏银 ${r.silver}，宗门好感 +2`, ok: true };
      this.props.audio?.choose?.();
    }
    this._refresh();
  }
}
