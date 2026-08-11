// 突破模态：大境界突破——修为圆满 + 突破丹（提升成功率）+ 失败回退一个小境界
import { h, icon } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { EmptyState } from '../ui/controls.js';
import { CONFIG } from '../core/config.js';
import { BREAKTHROUGH_CONFIG, calcBreakthroughRate, canBreakthrough } from '../core/breakthrough.js';

export class BreakthroughModal extends Modal {
  get modalTitle() { return '大境界突破'; }
  get modalIcon() { return 'yinyang'; }
  get modalClass() { return 'break-modal'; }

  constructor(store, props = {}) {
    super(store, props);
    this.pillId = null;   // 选中的突破丹
    this.result = null;   // 突破结果 { success, message }
  }

  body() {
    this.rateEl = h('div', { class: 'bk-rate' });
    this.pillEl = h('div', { class: 'bk-pills' });
    this.noticeEl = h('div', { class: 'bk-notice' });
    this.goBtn = h('button', { class: 'btn gold bk-go', onclick: () => this._attempt() }, '引雷突破');
    queueMicrotask(() => this._refresh());
    return h('div', { class: 'bk-wrap' },
      this.rateEl,
      h('div', { class: 'alch-sec-title' }, '突破丹（可选，品质越高成功率越高）'),
      this.pillEl,
      this.noticeEl,
      h('div', { class: 'bk-actions' }, this.goBtn)
    );
  }

  _pills() {
    const next = this.store.state.realmIndex + 1;
    return this.store.state.items.filter(i => i.breakthrough === next);
  }

  _refresh() {
    const s = this.store.state;
    const next = Math.min(s.realmIndex + 1, CONFIG.realms.length - 1);
    const check = canBreakthrough(s);

    // 境界与成功率
    const pill = this.pillId ? s.items.find(i => i.id === this.pillId) : null;
    const rate = calcBreakthroughRate(s, pill?.quality ?? 0);
    this.rateEl.innerHTML = '';
    this.rateEl.append(
      h('div', { class: 'bk-realm-row' },
        h('span', { class: 'bk-realm cur' }, s.realm),
        icon('send', 14),
        h('span', { class: 'bk-realm next' }, CONFIG.realms[next])
      ),
      h('div', { class: 'bk-checklist' },
        this._check(s.cultivation >= s.cultivationCap, `修为圆满（${s.cultivation}/${s.cultivationCap}）`),
        this._check(!!pill, pill ? `突破丹【${pill.name}】品质${pill.quality}` : '未备突破丹（成功率较低）'),
        this._check(true, `失败惩罚：跌落至【${CONFIG.realms[Math.max(0, s.realmIndex - BREAKTHROUGH_CONFIG.failRollback)] ?? s.realm}】，修为折半`)
      ),
      h('div', { class: 'bk-rate-row' },
        h('span', { class: 'ms-label' }, '成功率'),
        h('div', { class: 'bk-rate-bar' },
          h('span', { class: 'bk-rate-fill', style: { width: `${Math.round(rate * 100)}%` } })
        ),
        h('b', { class: 'bk-rate-num' }, `${Math.round(rate * 100)}%`)
      ),
      h('div', { class: 'bk-rate-detail' },
        `基础 ${Math.round(BREAKTHROUGH_CONFIG.baseRate * 100)}%`
        + ` · 丹药 +${Math.round((pill?.quality ?? 0) * BREAKTHROUGH_CONFIG.pillRatePerQuality * 100)}%`
        + ` · 丹道 +${Math.round((s.alchemyLevel ?? 1) * BREAKTHROUGH_CONFIG.alchemyRatePerLevel * 100)}%`
      )
    );

    // 可选突破丹
    this.pillEl.innerHTML = '';
    const pills = this._pills();
    if (!pills.length) {
      this.pillEl.appendChild(EmptyState({
        text: '背包中无对应突破丹',
        sub: '可于炼丹房炼制，或往坊市/丹房购得'
      }));
    } else {
      for (const p of pills) {
        const rarity = CONFIG.rarities.find(r => r.key === p.rarity);
        const sel = this.pillId === p.id;
        this.pillEl.appendChild(h('button', {
          class: `bk-pill ${sel ? 'sel' : ''}`,
          onclick: () => { this.pillId = sel ? null : p.id; this._refresh(); }
        },
          h('span', { class: 'shop-item-dot', style: { color: rarity?.color, background: rarity?.color } }),
          h('b', null, p.name),
          h('i', null, `品质${p.quality} · 成功率 +${Math.round(p.quality * BREAKTHROUGH_CONFIG.pillRatePerQuality * 100)}%`)
        ));
      }
    }

    // 结果提示
    this.noticeEl.innerHTML = '';
    if (this.result) {
      this.noticeEl.appendChild(h('div', {
        class: `alch-result ${this.result.success ? 'ok' : 'fail'}`
      }, this.result.message));
    }

    // 突破按钮
    const done = this.result?.success;
    this.goBtn.disabled = (!check.ok || done) ? 'disabled' : null;
    this.goBtn.textContent = done ? '已登新境' : check.ok ? '引雷突破' : (check.reason ?? '不可突破');
  }

  _check(ok, text) {
    return h('div', { class: `bk-check ${ok ? 'ok' : ''}` },
      h('span', { class: 'bk-check-dot' }, ok ? '✓' : '·'),
      h('span', null, text)
    );
  }

  _attempt() {
    const res = this.store.mapBreakthrough(this.pillId);
    if (!res.ok) {
      this.result = { success: false, message: res.reason ?? '不可突破' };
    } else {
      this.result = { success: res.success, message: res.message };
      if (res.success) this.props.audio?.chime?.();
      else this.props.audio?.fall?.();
    }
    this.pillId = null;
    this._refresh();
  }
}
