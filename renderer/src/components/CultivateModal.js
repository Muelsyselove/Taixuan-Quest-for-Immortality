// 闭关模态：按月闭关修炼——耗时累计年月，修为收益随境界与宗门/洞府加成
import { h, icon } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { Slider } from '../ui/controls.js';
import { SECTS } from '../core/mapData.js';
import { formatTime } from '../core/time.js';

export class CultivateModal extends Modal {
  get modalTitle() { return '闭关修炼'; }
  get modalIcon() { return 'lotus'; }
  get modalClass() { return 'cult-modal'; }

  constructor(store, props = {}) {
    super(store, props);
    // props: { bonus?: number, place?: string, audio? } — bonus 由场景/宗门加成注入
    this.months = 3;
    this.result = null; // { died, gain }
  }

  _bonus() {
    const s = this.store.state;
    const sectBonus = s.sect ? (SECTS[s.sect]?.benefits?.cultivationBonus ?? 0) : 0;
    return sectBonus + (this.props.bonus ?? 0);
  }

  body() {
    this.previewEl = h('div', { class: 'cult-preview' });
    this.noticeEl = h('div', { class: 'bk-notice' });
    this.sliderEl = h('div', { class: 'cult-slider' });

    const slider = Slider({
      min: 1, max: 12, step: 1, value: this.months,
      fmt: (v) => `${v} 月`,
      onChange: (v) => { this.months = Math.round(v); this._refresh(); }
    });
    this.sliderEl.appendChild(slider);

    this.goBtn = h('button', { class: 'btn gold bk-go', onclick: () => this._start() }, '入定闭关');
    queueMicrotask(() => this._refresh());

    return h('div', { class: 'cult-wrap' },
      h('div', { class: 'cult-tip' },
        icon('yinyang', 14),
        h('span', null, `于${this.props.place ?? '静室'}闭关，岁月悠悠——闭关注定耗时，出关方见真章`)
      ),
      this.sliderEl,
      this.previewEl,
      this.noticeEl,
      h('div', { class: 'bk-actions' }, this.goBtn)
    );
  }

  _calc() {
    const s = this.store.state;
    const per = 10 + s.realmIndex * 5;
    const bonus = this._bonus();
    return {
      per,
      bonus,
      gain: Math.round(per * this.months * (1 + bonus)),
      endTime: this._endTime()
    };
  }

  _endTime() {
    const t = this.store.state.mapTime;
    const total = (t.year - 1) * 12 + (t.month - 1) + this.months;
    return { year: Math.floor(total / 12) + 1, month: (total % 12) + 1 };
  }

  _refresh() {
    const s = this.store.state;
    const { gain, bonus, endTime } = this._calc();
    this.previewEl.innerHTML = '';
    this.previewEl.append(
      h('div', { class: 'cult-row' },
        h('span', { class: 'ms-label' }, '闭关时长'),
        h('b', { class: 'cult-val' }, `${this.months} 月`)
      ),
      h('div', { class: 'cult-row' },
        h('span', { class: 'ms-label' }, '预计修为'),
        h('b', { class: 'cult-val gold' }, `+${gain}`),
        bonus > 0 ? h('i', { class: 'cult-bonus' }, `（含加成 ${Math.round(bonus * 100)}%）`) : null
      ),
      h('div', { class: 'cult-row' },
        h('span', { class: 'ms-label' }, '出关之时'),
        h('b', { class: 'cult-val' }, formatTime(endTime))
      ),
      h('div', { class: 'cult-row dim' },
        h('span', { class: 'ms-label' }, '当前修为'),
        h('span', { class: 'ms-value' }, `${s.cultivation}/${s.cultivationCap}`)
      )
    );

    this.noticeEl.innerHTML = '';
    if (this.result) {
      this.noticeEl.appendChild(h('div', {
        class: `alch-result ${this.result.died ? 'fail' : 'ok'}`
      }, this.result.died
        ? '闭关未竟，寿元已尽——道友坐化于定中'
        : `出关了——修为 +${this.result.gain}（当前 ${this.store.state.cultivation}/${this.store.state.cultivationCap}）`));
      this.result = null;
    }
  }

  _start() {
    const res = this.store.mapCultivate(this.months, this._bonus());
    this.result = res;
    if (!res.died && res.gain > 0) this.props.audio?.chime?.();
    this._refresh();
  }
}
