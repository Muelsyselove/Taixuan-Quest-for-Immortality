// 炼丹模态：配方 + 草药库存 + 炼制（草药品质与炼丹水平影响丹药品质，耗时一月）
import { h, icon } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { CONFIG } from '../core/config.js';
import { RECIPES, HERBS, getAlchemyLevel, calcSuccessRate } from '../core/alchemy.js';
import { TIME_COST } from '../core/time.js';

export class AlchemyModal extends Modal {
  get modalTitle() { return '炼丹房'; }
  get modalIcon() { return 'drop'; }
  get modalClass() { return 'alchemy-modal'; }

  constructor(store, props = {}) {
    super(store, props);
    this.notice = null; // { text, ok }
  }

  body() {
    this.levelEl = h('div', { class: 'alch-level' });
    this.herbsEl = h('div', { class: 'alch-herbs' });
    this.listEl = h('div', { class: 'alch-list' });
    this.noticeEl = h('div', { class: 'alch-notice' });
    queueMicrotask(() => this._refresh());
    return h('div', { class: 'alch-wrap' },
      this.levelEl,
      h('div', { class: 'alch-sec-title' }, '草药库存'),
      this.herbsEl,
      h('div', { class: 'alch-sec-title' }, `丹方（每炉耗时 ${TIME_COST.alchemy} 月）`),
      this.listEl,
      this.noticeEl
    );
  }

  _refresh() {
    const s = this.store.state;
    const herbCounts = this.store.herbCounts(); // V2.4 起草药存于背包，库存视图按 herbKey 聚合
    // 等级与经验
    const lv = getAlchemyLevel(s.alchemyExp);
    const pct = lv.nextExpNeeded === Infinity ? 100
      : Math.round(((s.alchemyExp - lv.expNeeded) / (lv.nextExpNeeded - lv.expNeeded)) * 100);
    this.levelEl.innerHTML = '';
    this.levelEl.append(
      h('div', { class: 'alch-level-row' },
        icon('lotus', 15),
        h('b', null, `丹道 · ${lv.name}`),
        h('span', { class: 'alch-rate' }, `基础成功率 ${Math.round(lv.successRate * 100)}%`)
      ),
      h('div', { class: 'alch-exp-bar' },
        h('span', { class: 'alch-exp-fill', style: { width: `${pct}%` } })
      ),
      h('div', { class: 'alch-exp-text' }, lv.nextExpNeeded === Infinity
        ? `经验 ${s.alchemyExp} · 已臻化境`
        : `经验 ${s.alchemyExp} / ${lv.nextExpNeeded}`)
    );

    // 草药
    this.herbsEl.innerHTML = '';
    const owned = Object.entries(herbCounts).filter(([, n]) => n > 0);
    if (!owned.length) {
      this.herbsEl.appendChild(h('div', { class: 'alch-herb-empty' }, '暂无草药——可往野外场景「探寻」采得'));
    } else {
      for (const [key, n] of owned) {
        const herb = HERBS[key];
        if (!herb) continue;
        const rarity = CONFIG.rarities.find(r => r.key === herb.rarity);
        this.herbsEl.appendChild(h('span', {
          class: 'alch-herb-chip', style: { color: rarity?.color, borderColor: rarity?.color },
          title: herb.desc
        }, `${herb.name} ×${n}`));
      }
    }

    // 丹方
    this.listEl.innerHTML = '';
    for (const [key, recipe] of Object.entries(RECIPES)) {
      const canMake = recipe.herbs.every(hk => (herbCounts[hk] ?? 0) > 0);
      const herbQuality = recipe.herbs.reduce((sum, hk) => sum + (HERBS[hk]?.value ?? 0), 0) / recipe.herbs.length;
      const rate = calcSuccessRate(s.alchemyLevel, herbQuality);
      const rarity = CONFIG.rarities.find(r => r.key === recipe.rarity);
      this.listEl.appendChild(h('div', { class: `alch-item ${canMake ? '' : 'lack'}` },
        h('span', { class: 'shop-item-dot', style: { color: rarity?.color, background: rarity?.color } }),
        h('div', { class: 'shop-item-text' },
          h('b', null, recipe.name, recipe.breakthroughRealm ? h('em', { class: 'alch-pill-tag' }, '突破丹') : null),
          h('i', null, `${recipe.herbs.map(hk => HERBS[hk]?.name ?? hk).join(' + ')} · 成功率 ${Math.round(rate * 100)}%`),
          h('i', { class: 'alch-effect' }, recipe.desc)
        ),
        h('button', {
          class: 'btn gold sm', disabled: canMake ? null : 'disabled',
          title: canMake ? '' : '草药不足',
          onclick: () => this._refine(key)
        }, '开炉')
      ));
    }

    // 结果提示
    this.noticeEl.innerHTML = '';
    if (this.notice) {
      this.noticeEl.appendChild(h('div', {
        class: `alch-result ${this.notice.ok ? 'ok' : 'fail'}`
      }, this.notice.text));
      this.notice = null;
    }
  }

  _refine(recipeKey) {
    const res = this.store.mapAlchemy(recipeKey);
    if (!res.ok) {
      this.notice = { text: res.reason ?? '无法炼制', ok: false };
    } else if (res.died) {
      this.notice = { text: '炉火未熄，寿元已尽……', ok: false };
    } else if (res.success) {
      this.notice = { text: `${res.message}，丹道经验 +${res.expGain}`, ok: true };
    } else {
      this.notice = { text: `${res.message}（经验 +${res.expGain}）`, ok: false };
    }
    this._refresh();
  }
}
