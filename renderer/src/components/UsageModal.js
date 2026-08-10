// 花费统计弹窗：token 用量（输入/输出/缓存命中堆叠）+ 预估花费双柱形图
// 时间尺度：时/天/周/月/年；缩放越界自动切换更细/更粗尺度，两端各有缩放上限
import { Modal } from '../ui/Modal.js';
import { Tabs, Button, FormField, TextInput } from '../ui/controls.js';
import { BarChart } from '../ui/BarChart.js';
import { h } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { aggregate, fmtTokens, fmtCost, resolvePrice, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '../core/usageStats.js';

// 堆叠配色：缓存命中（鎏金）/ 输入未命中（青玉）/ 输出（水蓝）
const SEG = {
  hit: { key: 'hit', label: '缓存命中', color: 'linear-gradient(180deg,#f4d98c,#d8b25c)' },
  input: { key: 'input', label: '输入', color: 'linear-gradient(180deg,#9ad6c8,#7fb3a8)' },
  output: { key: 'output', label: '输出', color: 'linear-gradient(180deg,#8fc1f0,#5aa9e6)' }
};

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

    /* 双图：token 图为输入/输出/缓存命中堆叠 */
    this.tokenChart = new BarChart({
      title: 'Token 消耗', format: fmtTokens, empty: '该窗口无 token 消耗',
      legend: [SEG.hit, SEG.input, SEG.output].map(s => ({ label: s.label, color: s.color }))
    });
    this.costChart = new BarChart({ title: '预估花费', format: fmtCost, color: 'linear-gradient(180deg,#9ad6c8,#7fb3a8)', empty: '该窗口无花费' });

    /* 汇总 */
    this.sumEl = h('div', { class: 'usage-summary' });

    /* 单价设置（输入/输出/缓存命中） */
    const price = this._currentPrice();
    this._priceDraft = { ...price };
    this.priceInEl = TextInput({ type: 'number', value: String(price.input), maxlength: 8, onChange: (v) => { this._priceDraft.input = parseFloat(v); } });
    this.priceOutEl = TextInput({ type: 'number', value: String(price.output), maxlength: 8, onChange: (v) => { this._priceDraft.output = parseFloat(v); } });
    this.priceCacheEl = TextInput({ type: 'number', value: String(price.cache), maxlength: 8, onChange: (v) => { this._priceDraft.cache = parseFloat(v); } });
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
        FormField({ label: '缓存命中价', control: this.priceCacheEl }),
        Button({
          label: '应用单价', variant: 'gold', onClick: async () => {
            const ok = (v) => Number.isFinite(v) && v >= 0;
            await eng.saveAppSettings({
              priceInput: ok(this._priceDraft.input) ? this._priceDraft.input : null,
              priceOutput: ok(this._priceDraft.output) ? this._priceDraft.output : null,
              priceCache: ok(this._priceDraft.cache) ? this._priceDraft.cache : null
            });
            this.priceTipEl.textContent = '已应用自定义单价（清空输入框可恢复内置价目）';
            this._refresh(false);
          }
        }),
        Button({
          label: '恢复内置价目', variant: 'ghost', onClick: async () => {
            await eng.saveAppSettings({ priceInput: null, priceOutput: null, priceCache: null });
            const p = this._currentPrice();
            this.priceInEl.value = String(p.input);
            this.priceOutEl.value = String(p.output);
            this.priceCacheEl.value = String(p.cache);
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

    // 堆叠：缓存命中 / 输入未命中（含未拆分缓存属性的普通输入）/ 输出
    this.tokenChart.setData(rows.map(r => ({
      key: r.key, label: r.label, value: r.tokens,
      parts: [
        { ...SEG.hit, value: r.ch },
        { ...SEG.input, value: Math.max(0, r.pt - r.ch) },
        { ...SEG.output, value: r.ct }
      ]
    })));
    this.costChart.setData(rows.map(r => ({ key: r.key, label: r.label, value: r.cost })));

    this.zoomLabel.textContent = `×${this.zoom.toFixed(1)}`;
    this.sumEl.innerHTML = '';
    const items = [
      ['窗口合计 token', fmtTokens(totals.tokens)],
      ['输入 token', fmtTokens(totals.pt)],
      ['输出 token', fmtTokens(totals.ct)],
      ['缓存命中率', totals.hitRate == null ? '—' : `${(totals.hitRate * 100).toFixed(1)}%`],
      ['窗口预估花费', fmtCost(totals.cost)],
      ['API 调用次数', String(totals.count)],
      ['时间尺度', `${this._scale().label} · ${rows.length} 桶`]
    ];
    this.sumEl.append(...items.map(([label, val]) =>
      h('div', { class: 'usage-sum-item' }, h('i', null, label), h('b', null, val))
    ));

    if (animated) {
      for (const el of [this.tokenChart.el, this.costChart.el]) {
        el.classList.remove('bc-pop');
        void el.offsetWidth;
        el.classList.add('bc-pop');
      }
    }
  }
}
