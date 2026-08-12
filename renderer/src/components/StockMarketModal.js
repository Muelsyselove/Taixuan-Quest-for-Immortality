// 银市模态（V2.4）：银股行情 / 买卖 / 持仓 / 量化规则
// 股价随月波动；以银元结算；已购银股的银元卖出前不计入可用银元。
// 持天慧符可远程操作；祭炼天慧通灵宝后可设量化规则（低买高卖自动执行）。
import { h, icon } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { EmptyState } from '../ui/controls.js';
import { STOCKS } from '../core/stocks.js';

export class StockMarketModal extends Modal {
  get modalTitle() { return this.props.remote ? '银市 · 远程操盘' : '银市交易行'; }
  get modalIcon() { return 'spark'; }
  get modalClass() { return 'stock-modal'; }

  constructor(store, props = {}) {
    super(store, props);
    // props: { remote?: boolean } — 远程操盘（天慧符）
    this.notice = '';
    this.qty = {};      // 各股委托数量 { stockId: n }
    this.ruleFor = null; // 展开规则编辑的 scope（'all' 或 stockId）
  }

  watch() { return ['stocks', 'portfolio', 'wealth', 'tianhui']; }

  body() {
    this.wealthEl = h('div', { class: 'stock-wealth' });
    this.listEl = h('div', { class: 'stock-list' });
    this.noticeEl = h('div', { class: 'shop-notice' });
    this.ruleEl = h('div', { class: 'stock-rule-host' });
    queueMicrotask(() => this._refresh());
    return h('div', { class: 'stock-wrap' },
      this.wealthEl,
      this.props.remote
        ? h('div', { class: 'stock-remote-tip' }, '天慧符微光流转——虽远在千里，银市买卖尽在一念之间。')
        : null,
      this.ruleEl,
      this.listEl,
      this.noticeEl
    );
  }

  update() { if (this.listEl?.isConnected) this._refresh(); }

  _do(fn) {
    const r = fn();
    this.notice = r?.ok === false ? (r.reason ?? '操作失败') : '';
    this._refresh();
  }

  _refresh() {
    const s = this.store.state;
    const stocks = this.store.ensureStocks();
    const tongling = !!s.tianhui?.tongling;

    // 财富总览：可用银元 / 持仓市值 / 冻结说明
    const pv = this.store.portfolioValue();
    this.wealthEl.innerHTML = '';
    this.wealthEl.append(
      h('span', { class: 'ms-cur', style: { color: '#c0c0c0' } }, icon('talisman', 13), `可用银元 ${s.wealth.silver}`),
      h('span', { class: 'ms-cur', style: { color: '#f4d98c' } }, icon('spark', 13), `持仓市值 ${pv}`),
      h('span', { class: 'stock-frozen-tip' }, '已购银股的银元，卖出前方可使用')
    );

    // 通灵宝：全局量化规则入口
    this.ruleEl.innerHTML = '';
    if (tongling) {
      const allRule = s.tianhui?.rules?.all;
      this.ruleEl.appendChild(h('div', { class: 'stock-global-rule' },
        icon('talisman', 13),
        h('span', null, '通灵宝量化规则：'),
        h('button', {
          class: `ms-ex-btn ${allRule ? 'on' : ''}`,
          onclick: () => { this.ruleFor = this.ruleFor === 'all' ? null : 'all'; this._refresh(); }
        }, allRule ? '全局规则 · 已设' : '设全局规则')
      ));
    }

    this.noticeEl.textContent = this.notice;
    this.notice = '';

    // 行情列表
    this.listEl.innerHTML = '';
    if (!STOCKS.length) {
      this.listEl.appendChild(EmptyState({ text: '今日休市' }));
      return;
    }
    for (const def of STOCKS) {
      this.listEl.appendChild(this._row(def, stocks[def.id], tongling));
    }
    if (this.ruleFor) {
      this.listEl.prepend(this._ruleEditor(this.ruleFor));
    }
  }

  /* ---------------- 个股行 ---------------- */
  _row(def, st, tongling) {
    const s = this.store.state;
    const price = st?.price ?? def.base;
    const prev = st?.prev ?? def.base;
    const delta = price - prev;
    const pct = prev ? Math.round((delta / prev) * 1000) / 10 : 0;
    const held = s.portfolio?.[def.id] ?? 0;
    const qty = this.qty[def.id] ?? 1;
    const rule = s.tianhui?.rules?.[def.id];

    const setQty = (n) => {
      this.qty[def.id] = Math.max(1, Math.min(999, Math.round(n) || 1));
      this._refresh();
    };

    const qtyInput = h('input', {
      class: 'stock-qty set-input', type: 'number', min: '1', max: '999', value: String(qty)
    });
    qtyInput.addEventListener('change', () => setQty(parseInt(qtyInput.value, 10)));

    return h('div', { class: 'stock-item' },
      h('div', { class: 'stock-main' },
        h('div', { class: 'stock-name' },
          h('b', null, def.name),
          h('i', null, def.desc)
        ),
        h('div', { class: 'stock-quote' },
          h('span', { class: 'stock-price' }, `${price}`),
          h('span', { class: `stock-chg ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}` },
            `${delta > 0 ? '+' : ''}${delta}（${delta > 0 ? '+' : ''}${pct}%）`),
          this._spark(st?.history ?? [def.base], delta >= 0)
        ),
        held ? h('div', { class: 'stock-held' }, `持仓 ${held} 股 · 市值 ${price * held} 银元`) : null
      ),
      h('div', { class: 'stock-ops' },
        qtyInput,
        h('button', {
          class: 'btn gold sm',
          disabled: s.wealth.silver < price * qty ? 'disabled' : null,
          title: s.wealth.silver < price * qty ? '银元不足' : `买入 ${qty} 股，约 ${price * qty} 银元`,
          onclick: () => this._do(() => this.store.buyStock(def.id, qty))
        }, '买入'),
        h('button', {
          class: 'btn ghost sm',
          disabled: held < qty ? 'disabled' : null,
          title: held < qty ? `持仓不足（仅 ${held} 股）` : `卖出 ${qty} 股，约得 ${price * qty} 银元`,
          onclick: () => this._do(() => this.store.sellStock(def.id, qty))
        }, '卖出'),
        tongling ? h('button', {
          class: `ms-ex-btn ${rule ? 'on' : ''}`,
          title: '为此股单设量化规则（缺省随全局规则）',
          onclick: () => { this.ruleFor = this.ruleFor === def.id ? null : def.id; this._refresh(); }
        }, rule ? '规则·已设' : '量化') : null
      )
    );
  }

  /** 迷你走势线（近 36 月行情） */
  _spark(history, up) {
    const W = 96, H = 30;
    const data = history.slice(-24);
    const min = Math.min(...data), max = Math.max(...data);
    const span = Math.max(1, max - min);
    const pts = data.map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * W;
      const y = H - 3 - ((v - min) / span) * (H - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', `stock-spark ${up ? 'up' : 'down'}`);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', pts);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke-width', '1.6');
    svg.appendChild(line);
    return svg;
  }

  /* ---------------- 量化规则编辑器 ---------------- */
  _ruleEditor(scope) {
    const isAll = scope === 'all';
    const name = isAll ? '全局（所有银股）' : (STOCKS.find(x => x.id === scope)?.name ?? scope);
    const cur = this.store.state.tianhui?.rules?.[scope] ?? {};
    const fields = {};
    const mk = (key, label, ph) => {
      const inp = h('input', { class: 'set-input stock-rule-inp', type: 'number', min: '1', value: cur[key] ? String(cur[key]) : '', placeholder: ph });
      inp.addEventListener('input', () => { fields[key] = inp.value; });
      fields[key] = cur[key] ?? '';
      return h('label', { class: 'stock-rule-field' }, h('span', null, label), inp);
    };

    return h('div', { class: 'stock-rule-editor' },
      h('div', { class: 'stock-rule-title' },
        icon('talisman', 13),
        h('b', null, `量化规则 · ${name}`),
        h('span', { class: 'stock-rule-tip' }, '行情月变，价格越线即自动委托')
      ),
      h('div', { class: 'stock-rule-grid' },
        mk('buyBelow', '股价低于', '买入触发价'),
        mk('buyQty', '买入股数', '如 5'),
        mk('sellAbove', '股价高于', '卖出触发价'),
        mk('sellQty', '卖出股数', '如 5')
      ),
      h('div', { class: 'stock-rule-acts' },
        h('button', {
          class: 'btn gold sm',
          onclick: () => this._do(() => {
            const r = this.store.setStockRule(scope, {
              buyBelow: +fields.buyBelow || 0, buyQty: +fields.buyQty || 0,
              sellAbove: +fields.sellAbove || 0, sellQty: +fields.sellQty || 0
            });
            this.ruleFor = null;
            return r;
          })
        }, '立下规则'),
        h('button', {
          class: 'btn ghost sm',
          onclick: () => this._do(() => {
            const r = this.store.setStockRule(scope, {}); // 清除
            this.ruleFor = null;
            return r;
          })
        }, '废除规则'),
        h('button', { class: 'btn ghost sm', onclick: () => { this.ruleFor = null; this._refresh(); } }, '收起')
      )
    );
  }
}
