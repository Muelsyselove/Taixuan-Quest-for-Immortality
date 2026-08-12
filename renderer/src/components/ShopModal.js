// 商店模态（V2.4）：分类专营商铺 + 云游商人
// 坊市并列五铺：综合商店 / 草药房 / 丹药房 / 法宝阁 / 功法楼（展示全部可购物品）；
// 云游商人另售 5 种坊市无售的高品质珍品。
import { h, icon } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { Tabs, EmptyState } from '../ui/controls.js';
import { CONFIG } from '../core/config.js';
import { MAP_ITEMS, SHOP_TYPES, getShopStock, getMerchantStock, herbPrice } from '../core/mapItems.js';
import { HERBS } from '../core/alchemy.js';
import { EXCHANGE_RATE } from '../core/wealth.js';

function priceText(price = {}) {
  const parts = [];
  if (price.spirit) parts.push(`${price.spirit} 灵石`);
  if (price.silver) parts.push(`${price.silver} 银元`);
  return parts.join(' + ') || '免费';
}

export class ShopModal extends Modal {
  get modalTitle() {
    if (this.props.merchant) return '云游商人';
    const t = SHOP_TYPES.find(x => x.key === this.shop);
    return t ? `坊市 · ${t.label}` : '坊市交易';
  }
  get modalIcon() { return 'talisman'; }
  get modalClass() { return 'shop-modal'; }

  constructor(store, props = {}) {
    super(store, props);
    // props: { merchant?: boolean, shops?: string[]（限定可见商铺）, shop?: string（默认商铺） }
    this.shop = props.shop ?? (props.shops?.[0] ?? 'general');
    this.tab = 'buy';
    this.notice = '';
  }

  body() {
    this.listEl = h('div', { class: 'shop-list' });
    this.noticeEl = h('div', { class: 'shop-notice' });
    this.wealthEl = h('div', { class: 'shop-wealth' });
    this.shopTabsEl = h('div', { class: 'shop-types' });

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
      this.props.merchant
        ? h('div', { class: 'shop-merchant-tip' }, '云游四方，担上皆是坊市无售的珍品——货只五种，价高质优，机缘难得。')
        : this.shopTabsEl,
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
    // 头部标题随商铺切换
    const titleEl = this.el?.querySelector('.panel-title');
    if (titleEl) titleEl.textContent = this.modalTitle;

    const w = this.store.state.wealth;
    this.wealthEl.innerHTML = '';
    this.wealthEl.append(
      h('span', { class: 'ms-cur', style: { color: '#c0c0c0' } }, icon('talisman', 13), `银元 ${w.silver}`),
      h('span', { class: 'ms-cur', style: { color: '#7fb3a8' } }, icon('spark', 13), `灵石 ${w.spirit}`)
    );
    this.noticeEl.textContent = this.notice;
    this.notice = '';

    this._renderShopTabs();
    this.listEl.innerHTML = '';
    if (this.tab === 'buy') this._renderBuy();
    else this._renderSell();
  }

  /** 坊市五铺并列（云游商人模式不显示） */
  _renderShopTabs() {
    if (this.props.merchant) return;
    const types = SHOP_TYPES.filter(t => !this.props.shops || this.props.shops.includes(t.key));
    this.shopTabsEl.innerHTML = '';
    for (const t of types) {
      this.shopTabsEl.appendChild(h('button', {
        class: `shop-type ${this.shop === t.key ? 'active' : ''}`,
        title: t.desc,
        onclick: () => { this.shop = t.key; this._refresh(); }
      }, t.label));
    }
  }

  _renderBuy() {
    if (this.props.merchant) return this._renderMerchant();
    if (this.shop === 'herb') return this._renderHerbs();
    const stock = getShopStock(this.shop);
    if (!stock.length) {
      this.listEl.appendChild(EmptyState({ text: '此铺暂无货物' }));
      return;
    }
    for (const key of stock) {
      const def = MAP_ITEMS[key];
      if (!def) continue;
      this.listEl.appendChild(this._buyRow(key, def));
    }
  }

  /** 云游商人：5 种坊市无售的高品质珍品 */
  _renderMerchant() {
    for (const key of getMerchantStock()) {
      const def = MAP_ITEMS[key];
      if (!def) continue;
      this.listEl.appendChild(this._buyRow(key, def));
    }
  }

  _buyRow(key, def) {
    const rarity = CONFIG.rarities.find(r => r.key === def.rarity);
    // 唯一之物（天慧符/通灵宝）：已购则置灰
    const th = this.store.state.tianhui;
    const soldOut = (def.unique === 'tianhui' && th?.owned) || (def.unique === 'tongling' && th?.tongling);
    const locked = def.unique === 'tongling' && !th?.owned;
    const afford = this.store.canPay(def.price ?? {});
    const disabled = soldOut || locked || !afford;
    const btnText = soldOut ? '已购得' : locked ? '需天慧符' : '购入';
    const btnTitle = soldOut ? '唯一之物，世间仅此一件'
      : locked ? '需先持天慧符，方可祭炼通灵宝'
      : !afford ? '资财不足' : '';
    return h('div', { class: `shop-item ${soldOut ? 'sold-out' : ''}` },
      h('span', { class: 'shop-item-dot', style: { color: rarity?.color, background: rarity?.color } }),
      h('div', { class: 'shop-item-text' },
        h('b', null, def.name,
          def.unique ? h('em', { class: 'shop-unique-tag' }, '唯一') : null,
          def.merchantOnly ? h('em', { class: 'shop-rare-tag' }, '珍品') : null),
        h('i', null, `${def.effect ?? def.desc} · ${priceText(def.price)}`)
      ),
      h('button', {
        class: 'btn gold sm', disabled: disabled ? 'disabled' : null,
        title: btnTitle,
        onclick: () => this._do(() => this.store.buyMapItem(key))
      }, btnText)
    );
  }

  /** 草药房：百草齐备，按株售卖（入背包堆叠） */
  _renderHerbs() {
    for (const [key, herb] of Object.entries(HERBS)) {
      const price = herbPrice(key);
      const rarity = CONFIG.rarities.find(r => r.key === herb.rarity);
      const owned = this.store.herbCounts()[key] ?? 0;
      const mk = (n) => h('button', {
        class: 'btn gold sm',
        disabled: this.store.canPay({ silver: price.silver * n }) ? null : 'disabled',
        title: `${priceText(price)} / 株`,
        onclick: () => this._do(() => this.store.buyHerb(key, n))
      }, `购 ×${n}`);
      this.listEl.appendChild(h('div', { class: 'shop-item' },
        h('span', { class: 'shop-item-dot', style: { color: rarity?.color, background: rarity?.color } }),
        h('div', { class: 'shop-item-text' },
          h('b', null, herb.name, owned ? h('em', { class: 'shop-owned-tag' }, `已有 ×${owned}`) : null),
          h('i', null, `${herb.desc} · 药效 ${herb.effect}+${herb.value} · ${price.silver} 银元/株`)
        ),
        h('div', { class: 'shop-buy-group' }, mk(1), mk(5))
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
      const cnt = it.count ?? 1;
      this.listEl.appendChild(h('div', { class: 'shop-item' },
        h('div', { class: 'shop-item-text' },
          h('b', null, it.name, cnt > 1 ? h('em', { class: 'shop-owned-tag' }, `×${cnt}`) : null),
          h('i', null, `${it.effect || it.desc} · 回收 ${sell} 银元${it.unique ? ' · 唯一之物不可售' : ''}`)
        ),
        it.unique
          ? h('span', { class: 'shop-unique-tag' }, '认主')
          : h('button', {
              class: 'btn ghost sm',
              onclick: () => this._do(() => this.store.sellMapItem(it.id))
            }, '售出')
      ));
    }
  }
}
