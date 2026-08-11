// 商店模态：购买 / 出售 / 货币兑换（地图模式物品体系）
import { h, icon } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { Tabs, EmptyState } from '../ui/controls.js';
import { CONFIG } from '../core/config.js';
import { MAP_ITEMS, getShopStock } from '../core/mapItems.js';
import { EXCHANGE_RATE } from '../core/wealth.js';

function priceText(price = {}) {
  const parts = [];
  if (price.spirit) parts.push(`${price.spirit} 灵石`);
  if (price.silver) parts.push(`${price.silver} 银元`);
  return parts.join(' + ') || '免费';
}

export class ShopModal extends Modal {
  get modalTitle() { return '坊市交易'; }
  get modalIcon() { return 'talisman'; }
  get modalClass() { return 'shop-modal'; }

  constructor(store, props = {}) {
    super(store, props);
    // props: { sceneId } — 店铺库存按场景而定
    this.tab = 'buy';
    this.notice = '';
  }

  body() {
    this.listEl = h('div', { class: 'shop-list' });
    this.noticeEl = h('div', { class: 'shop-notice' });
    this.wealthEl = h('div', { class: 'shop-wealth' });

    const tabs = Tabs({
      tabs: [{ key: 'buy', label: '购买' }, { key: 'sell', label: '出售' }],
      active: this.tab,
      onChange: (k) => { this.tab = k; this._refresh(); }
    });

    const wrap = h('div', { class: 'shop-wrap' },
      this.wealthEl,
      h('div', { class: 'shop-exchange' },
        h('span', { class: 'shop-ex-rate' }, `汇率：1 灵石 = ${EXCHANGE_RATE} 银元`),
        h('button', { class: 'ms-ex-btn', onclick: () => this._do(() => this.store.exchangeSilverToSpirit()) }, '银元兑灵石'),
        h('button', { class: 'ms-ex-btn', onclick: () => this._do(() => this.store.exchangeSpiritToSilver()) }, '灵石兑银元')
      ),
      tabs,
      this.listEl,
      this.noticeEl
    );
    queueMicrotask(() => this._refresh());
    return wrap;
  }

  _do(fn) {
    const r = fn();
    this.notice = r?.ok === false ? (r.reason ?? '操作失败') : '';
    this._refresh();
  }

  _refresh() {
    const w = this.store.state.wealth;
    this.wealthEl.innerHTML = '';
    this.wealthEl.append(
      h('span', { class: 'ms-cur', style: { color: '#c0c0c0' } }, icon('talisman', 13), `银元 ${w.silver}`),
      h('span', { class: 'ms-cur', style: { color: '#7fb3a8' } }, icon('spark', 13), `灵石 ${w.spirit}`)
    );
    this.noticeEl.textContent = this.notice;
    this.notice = '';

    this.listEl.innerHTML = '';
    if (this.tab === 'buy') this._renderBuy();
    else this._renderSell();
  }

  _renderBuy() {
    const stock = getShopStock(this.props.sceneId);
    if (!stock.length) {
      this.listEl.appendChild(EmptyState({ text: '此地无货可售' }));
      return;
    }
    for (const key of stock) {
      const def = MAP_ITEMS[key];
      if (!def) continue;
      const rarity = CONFIG.rarities.find(r => r.key === def.rarity);
      const afford = this.store.canPay(def.price ?? {});
      this.listEl.appendChild(h('div', { class: 'shop-item' },
        h('span', { class: 'shop-item-dot', style: { color: rarity?.color, background: rarity?.color } }),
        h('div', { class: 'shop-item-text' },
          h('b', null, def.name),
          h('i', null, `${def.effect ?? def.desc} · ${priceText(def.price)}`)
        ),
        h('button', {
          class: 'btn gold sm', disabled: afford ? null : 'disabled',
          title: afford ? '' : '资财不足',
          onclick: () => this._do(() => this.store.buyMapItem(key))
        }, '购入')
      ));
    }
  }

  _renderSell() {
    const items = this.store.state.items;
    if (!items.length) {
      this.listEl.appendChild(EmptyState({ text: '背包空空，无物可售' }));
      return;
    }
    for (const it of items) {
      const base = it.price
        ? (it.price.silver ?? 0) + (it.price.spirit ?? 0) * EXCHANGE_RATE
        : 25;
      const sell = Math.max(1, Math.floor(base / 2));
      this.listEl.appendChild(h('div', { class: 'shop-item' },
        h('div', { class: 'shop-item-text' },
          h('b', null, it.name),
          h('i', null, `${it.effect || it.desc} · 回收 ${sell} 银元`)
        ),
        h('button', {
          class: 'btn ghost sm',
          onclick: () => this._do(() => this.store.sellMapItem(it.id))
        }, '售出')
      ));
    }
  }
}
