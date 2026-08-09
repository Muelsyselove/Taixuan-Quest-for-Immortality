// 背包二级页：分类查看 + 稀有度筛选 + 使用物品
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';

export class InventoryModal extends Component {
  constructor(store, props) {
    super(store, props);
    this.filterCat = 'all';
    this.filterRarity = 'all';
    this._seen = new Set(); // 已渲染过的物品 id：避免状态刷新时整表重放入场动画
  }

  watch() { return ['items']; }

  render() {
    this.tabsEl = h('div', { class: 'inv-tabs' });
    this.rarityEl = h('div', { class: 'inv-rarities' });
    this.listEl = h('div', { class: 'inv-list' });

    const mask = h('div', {
      class: 'modal-mask',
      onclick: (e) => { if (e.target === mask) this.close(); }
    },
      h('div', { class: 'modal inv-modal' },
        h('header', { class: 'panel-head' },
          icon('drop', 16),
          h('span', { class: 'panel-title' }, '背包'),
          h('span', { class: 'inv-count' }, `${this.store.state.items.length} 件`),
          h('button', { class: 'modal-close', onclick: () => this.close() }, '×')
        ),
        h('div', { class: 'inv-filters' }, this.tabsEl, this.rarityEl),
        this.listEl
      )
    );
    this.el = mask;
    return mask;
  }

  afterMount() { this.update(); }

  update() {
    this._renderTabs();
    this._renderRarities();
    this._renderList();
  }

  _renderTabs() {
    this.tabsEl.innerHTML = '';
    const mk = (key, label) => h('button', {
      class: `inv-tab ${this.filterCat === key ? 'active' : ''}`,
      onclick: () => { this.filterCat = key; this.update(); }
    }, label);
    this.tabsEl.appendChild(mk('all', '全部'));
    for (const c of CONFIG.itemCategories) this.tabsEl.appendChild(mk(c.key, c.label));
  }

  _renderRarities() {
    this.rarityEl.innerHTML = '';
    const mk = (key, label, color) => h('button', {
      class: `inv-rarity ${this.filterRarity === key ? 'active' : ''}`,
      style: color ? { '--rarity-color': color } : null,
      onclick: () => { this.filterRarity = key; this.update(); }
    }, label);
    this.rarityEl.appendChild(mk('all', '全部品阶'));
    for (const r of CONFIG.rarities) this.rarityEl.appendChild(mk(r.key, r.label, r.color));
  }

  _renderList() {
    const items = this.store.state.items
      .filter(i => this.filterCat === 'all' || i.category === this.filterCat)
      .filter(i => this.filterRarity === 'all' || i.rarity === this.filterRarity)
      .sort((a, b) => {
        const ra = CONFIG.rarities.find(r => r.key === a.rarity)?.order ?? 0;
        const rb = CONFIG.rarities.find(r => r.key === b.rarity)?.order ?? 0;
        return rb - ra || b.day - a.day;
      });

    this.listEl.innerHTML = '';
    if (!items.length) {
      this.listEl.appendChild(h('div', { class: 'inv-empty' }, '囊中空空，一物也无。'));
      return;
    }
    for (const item of items) {
      const r = CONFIG.rarities.find(x => x.key === item.rarity);
      const cat = CONFIG.itemCategories.find(x => x.key === item.category);
      // 仅新入囊的物品播放入场动画；刷新重绘时保持静止
      const isNew = !this._seen.has(item.id);
      this._seen.add(item.id);
      this.listEl.appendChild(
        h('div', { class: 'inv-item', style: isNew ? null : { animation: 'none' } },
          h('span', { class: 'inv-dot', title: r.label, style: { background: r.color, boxShadow: `0 0 6px ${r.color}` } }),
          h('div', { class: 'inv-item-body' },
            h('div', { class: 'inv-item-head' },
              h('span', { class: 'inv-item-name' }, item.name),
              h('span', { class: 'inv-item-rarity' }, r.label),
              h('span', { class: 'inv-item-cat' }, cat.label)
            ),
            h('div', { class: 'inv-item-desc' }, item.desc),
            h('div', { class: 'inv-item-foot' },
              h('span', { class: 'inv-item-effect' }, item.effect ? `效用：${item.effect}` : '效用未明'),
              h('span', { class: 'inv-item-day' }, `第${item.day}日所得`),
              item.usable
                ? h('button', {
                    class: 'btn gold inv-use',
                    onclick: () => { this.store.useItem(item.id); }
                  }, '使用')
                : null
            )
          )
        )
      );
    }
  }

  close() { this.destroy(); }
}
