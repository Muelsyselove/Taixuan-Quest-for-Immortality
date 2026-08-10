// 花费统计弹窗：token 用量 + 预估花费双柱形图
// 时间尺度：时/天/周/月/年；缩放越界自动切换更细/更粗尺度，两端各有缩放上限
import { Modal } from '../ui/Modal.js';
import { Tabs, Button, FormField, TextInput } from '../ui/controls.js';
import { BarChart } from '../ui/BarChart.js';
import { h } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { aggregate, fmtTokens, fmtCost, resolvePrice, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '../core/usageStats.js';

export class UsageModal extends Modal {
  get modalTitle() { return '天机算盘 · 花费统计'; }
  get modalIcon() { return 'spark'; }
  get modalClass() { return 'usage-modal'; }

  constructor(store, props) {
    super(store, props);
    // props.engine: NarrativeEngine（读取 app 设置 / 单价）
    this.scaleIdx = 1; // 默认「天」
    this.zoom = 1;
    this.records = [];
  }

  body() {
    const eng = this.props.engine;

    /* 尺度页签 */
    this.tabsEl = Tabs({
      tabs: CONFIG.usageScales.map(s => ({ key: s.key, label: s.label })),
      active: this._scale().key,
      onChange: (key) => {
        this.scaleIdx = CONFIG.usageScales.findIndex(s => s.key === key);
        this.zoom = 1;
        this._refresh(true);
      }
    });

    /* 缩放控件 */
    this.zoomOutBtn = Button({ label: '－', variant: 'ghost', class: 'usage-zoom-btn', title: '缩小（窗口更宽）', onClick: () => this._zoomBy(1 / ZOOM_STEP) });
    this.zoomInBtn = Button({ label: '＋', variant: 'ghost', class: 'usage-zoom-btn', title: '放大（窗口更窄）', onClick: () => this._zoomBy(ZOOM_STEP) });
    this.zoomLabel = h('span', { class: 'usage-zoom-label' }, '×1.0');

    /* 双图 */
    this.tokenChart = new BarChart({ title: 'Token 消耗', format: fmtTokens, color: 'linear-gradient(180deg,#f4d98c,#d8b25c)', empty: '该窗口无 token 消耗' });
    this.costChart = new BarChart({ title: '预估花费', format: fmtCost, color: 'linear-gradient(180deg,#9ad6c8,#7fb3a8)', empty: '该窗口无花费' });

    /* 汇总 */
    this.sumEl = h('div', { class: 'usage-summary' });

    /* 单价设置 */
    const price = this._currentPrice();
    this.priceInEl = TextInput({ type: 'number', value: String(price.input), maxlength: 8, onChange: (v) => { this._priceDraft.input = parseFloat(v); } });
    this.priceOutEl = TextInput({ type: 'number', value: String(price.output), maxlength: 8, onChange: (v) => { this._priceDraft.output = parseFloat(v); } });
    this._priceDraft = { ...price };
    this.priceTipEl = h('span', { class: 'ui-field-tip' }, `当前按 ${eng.settings.vendor} / ${eng.settings.model} 价目估算`);

    /* 滚轮缩放 */
    const wheel = (e) => {
      e.preventDefault();
      this._zoomBy(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    };
    this.tokenChart.el.addEventListener('wheel', wheel, { passive: false });
    this.costChart.el.addEventListener('wheel', wheel, { passive: false });

    return [
      h('div', { class: 'usage-toolbar' },
        this.tabsEl,
        h('div', { class: 'usage-zoom' }, this.zoomOutBtn, this.zoomLabel, this.zoomInBtn)
      ),
      this.sumEl,
      h('div', { class: 'usage-charts' },
        this.tokenChart.el,
        this.costChart.el
      ),
      h('div', { class: 'usage-pricing' },
        FormField({ label: '输入价（元/1M）', control: this.priceInEl }),
        FormField({ label: '输出价（元/1M）', control: this.priceOutEl }),
        Button({
          label: '应用单价', variant: 'gold', onClick: async () => {
            const inOk = Number.isFinite(this._priceDraft.input) && this._priceDraft.input >= 0;
            const outOk = Number.isFinite(this._priceDraft.output) && this._priceDraft.output >= 0;
            await eng.saveAppSettings({
              priceInput: inOk ? this._priceDraft.input : null,
              priceOutput: outOk ? this._priceDraft.output : null
            });
            this.priceTipEl.textContent = '已应用自定义单价（清空输入框可恢复内置价目）';
            this._refresh(false);
          }
        }),
        Button({
          label: '恢复内置价目', variant: 'ghost', onClick: async () => {
            await eng.saveAppSettings({ priceInput: null, priceOutput: null });
            const p = this._currentPrice();
            this.priceInEl.value = String(p.input);
            this.priceOutEl.value = String(p.output);
            this._priceDraft = { ...p };
            this.priceTipEl.textContent = '已恢复内置价目';
            this._refresh(false);
          }
        }),
        this.priceTipEl
      )
    ];
  }

  async afterMount() {
    this.records = await window.taixuan.usage.read().catch(() => []);
    this._refresh(false);
  }

  _scale() { return CONFIG.usageScales[this.scaleIdx]; }

  _currentPrice() {
    const eng = this.props.engine;
    return resolvePrice(eng.app, eng.settings.vendor, eng.settings.model);
  }

  /** 缩放：越界自动跨档；两端钳制（hour 禁止继续放大，year 禁止继续缩小） */
  _zoomBy(factor) {
    let z = this.zoom * factor;
    const last = CONFIG.usageScales.length - 1;

    if (z > ZOOM_MAX) {
      if (this.scaleIdx > 0) { this.scaleIdx--; z = 1; this.tabsEl.refresh(this._scale().key); }
      else z = ZOOM_MAX; // 最小尺度下的放大上限
    } else if (z < ZOOM_MIN) {
      if (this.scaleIdx < last) { this.scaleIdx++; z = 1; this.tabsEl.refresh(this._scale().key); }
      else z = ZOOM_MIN; // 最大尺度下的缩小上限
    }
    this.zoom = z;
    this._refresh(true);
  }

  _refresh(animated) {
    const eng = this.props.engine;
    const { rows, totals } = aggregate(this.records, this._scale().key, this.zoom, eng.app);

    this.tokenChart.setData(rows.map(r => ({ key: r.key, label: r.label, value: r.tokens })));
    this.costChart.setData(rows.map(r => ({ key: r.key, label: r.label, value: r.cost })));

    this.zoomLabel.textContent = `×${this.zoom.toFixed(1)}`;
    this.sumEl.innerHTML = '';
    this.sumEl.append(
      h('div', { class: 'usage-sum-item' },
        h('i', null, '窗口合计 token'), h('b', null, fmtTokens(totals.tokens))),
      h('div', { class: 'usage-sum-item' },
        h('i', null, '窗口预估花费'), h('b', null, fmtCost(totals.cost))),
      h('div', { class: 'usage-sum-item' },
        h('i', null, 'API 调用次数'), h('b', null, String(totals.count))),
      h('div', { class: 'usage-sum-item' },
        h('i', null, '时间尺度'), h('b', null, `${this._scale().label} · ${rows.length} 桶`))
    );

    if (animated) {
      for (const el of [this.tokenChart.el, this.costChart.el]) {
        el.classList.remove('bc-pop');
        void el.offsetWidth;
        el.classList.add('bc-pop');
      }
    }
  }
}
