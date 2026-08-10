// 柱形图组件：DOM 柱状 + CSS 过渡，数据变化时平滑动画
// - 柱子以 key 追踪：旧柱更新高度（CSS transition 平滑插值），新柱从 0 生长，消失柱收缩退场
// - 堆叠模式：row.parts = [{value, color, label}] 时柱内按段堆叠（自下而上），图例在表头
import { h } from '../core/component.js';

export class BarChart {
  /**
   * @param opts { title, format(v), color(css background), empty, legend?[{label,color}] }
   */
  constructor(opts = {}) {
    this.opts = { format: (v) => String(v), color: 'var(--gold)', ...opts };
    this._bars = new Map(); // key -> {wrap, fill, val, value}
    this._max = 0;

    this.plotEl = h('div', { class: 'bc-plot' });
    this.gridEl = h('div', { class: 'bc-grid' },
      [1, 0.75, 0.5, 0.25].map(p => h('i', { key: p, style: { bottom: `${p * 100}%` } }))
    );
    this.maxEl = h('span', { class: 'bc-max' }, '');
    this.legendEl = this.opts.legend?.length
      ? h('span', { class: 'bc-legend' },
          this.opts.legend.map(l => h('i', null, h('em', { style: { background: l.color } }), l.label)))
      : null;
    this.axisEl = h('div', { class: 'bc-axis' });

    this.el = h('div', { class: 'barchart' },
      h('div', { class: 'bc-head' },
        h('span', { class: 'bc-title' }, this.opts.title || ''),
        this.legendEl,
        this.maxEl
      ),
      h('div', { class: 'bc-stage' }, this.gridEl, this.plotEl),
      this.axisEl
    );
  }

  /**
   * @param rows [{key, label, value, parts?[{value,color,label}]}] 按时间从左到右
   * parts 存在时为堆叠柱（value 应等于 parts 之和）
   */
  setData(rows) {
    const max = Math.max(1e-9, ...rows.map(r => r.value));
    this._max = max * 1.08; // 峰值微超量程，视觉上不顶格
    this.maxEl.textContent = max > 1e-9 ? `峰值 ${this.opts.format(max)}` : (this.opts.empty || '暂无数据');

    const seen = new Set();
    const n = Math.max(1, rows.length);
    const w = 100 / n;

    rows.forEach((row, i) => {
      seen.add(row.key);
      let bar = this._bars.get(row.key);
      if (!bar) {
        const fill = h('div', { class: 'bc-fill', style: { background: this.opts.color, height: '0%' } });
        const val = h('div', { class: 'bc-val' });
        const wrap = h('div', { class: 'bc-bar', style: { opacity: '0' } }, val, fill);
        bar = { wrap, fill, val, value: 0 };
        this._bars.set(row.key, bar);
        this.plotEl.appendChild(wrap);
        requestAnimationFrame(() => { wrap.style.opacity = '1'; });
      }
      bar.wrap.style.left = `${(i * w).toFixed(4)}%`;
      bar.wrap.style.width = `${w.toFixed(4)}%`;

      // 悬停明细：堆叠柱列出各段
      if (row.parts?.length) {
        const detail = row.parts.filter(p => p.value > 0)
          .map(p => `${p.label} ${this.opts.format(p.value)}`).join('　');
        bar.wrap.title = `${row.label}：${this.opts.format(row.value)}${detail ? `（${detail}）` : ''}`;
      } else {
        bar.wrap.title = `${row.label}：${this.opts.format(row.value)}`;
      }
      bar.val.textContent = row.value > 0 ? this.opts.format(row.value) : '';

      // 堆叠段重建（段数少，直接重建保证颜色/顺序一致）
      if (row.parts) {
        bar.fill.style.background = 'none';
        bar.fill.innerHTML = '';
        for (const p of row.parts) {
          if (p.value <= 0) continue;
          bar.fill.appendChild(h('i', {
            class: 'bc-seg',
            style: { height: `${(p.value / Math.max(1e-9, row.value)) * 100}%`, background: p.color },
            title: `${p.label} ${this.opts.format(p.value)}`
          }));
        }
      } else if (bar.fill.style.background !== this.opts.color) {
        bar.fill.style.background = this.opts.color;
        bar.fill.innerHTML = '';
      }

      const target = (row.value / this._max) * 100;
      bar.value = row.value;
      // rAF 保证从旧高度向新高度过渡
      requestAnimationFrame(() => { bar.fill.style.height = `${target}%`; });
      bar.wrap.classList.toggle('is-zero', row.value <= 0);
    });

    // 退场：收缩后移除
    for (const [key, bar] of this._bars) {
      if (seen.has(key)) continue;
      this._bars.delete(key);
      bar.fill.style.height = '0%';
      bar.wrap.style.opacity = '0';
      setTimeout(() => bar.wrap.remove(), 450);
    }

    // 轴标签：首/中/尾
    this.axisEl.innerHTML = '';
    if (rows.length) {
      const picks = new Set([0, Math.floor(rows.length / 2), rows.length - 1]);
      for (const idx of picks) {
        this.axisEl.appendChild(h('span', null, rows[idx].label));
      }
    }
  }
}
