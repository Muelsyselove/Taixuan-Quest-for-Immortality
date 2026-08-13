// 当前事件面板：打字机呈现叙事文本
import { Component, h, icon } from '../core/component.js';

export class EventPanel extends Component {
  constructor(store, props) {
    super(store, props);
    this._typeTimer = null;
    this._pauseT = null;
    this._shownText = '';
  }

  watch() { return ['event', 'busy', 'aiReady', 'day']; }

  render() {
    this.dayBadge = h('span', { class: 'event-day' }, '第 一 日');
    this.textEl = h('div', { class: 'event-text' });
    this.hintEl = h('div', { class: 'event-hint' });

    this.el = h('section', { class: 'panel event-panel' },
      h('header', { class: 'panel-head' },
        icon('scroll', 16),
        h('span', { class: 'panel-title' }, '当前事件'),
        this.dayBadge
      ),
      h('div', { class: 'event-body' },
        h('div', { class: 'event-ornament', html: this._ornament() }),
        this.textEl,
        this.hintEl
      )
    );
    return this.el;
  }

  _ornament() {
    // SVG 分隔纹饰：云雷纹短章
    return `<svg viewBox="0 0 200 12" width="160" height="10" aria-hidden="true">
      <path d="M0 6h70M130 6h70" stroke="currentColor" stroke-width="1" opacity=".5"/>
      <path d="M85 6c0-3 4-3 4 0s4 3 4 0 4-3 4 0 4 3 4 0 4-3 4 0" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="100" cy="6" r="1.6" fill="currentColor"/>
    </svg>`;
  }

  update() {
    const s = this.store.state;
    this.dayBadge.textContent = `第 ${this._cn(s.day)} 日`;

    if (s.busy) {
      this.hintEl.innerHTML = '<span class="thinking"><i></i><i></i><i></i>天道推演中…</span>';
      return;
    }
    this.hintEl.innerHTML = s.aiReady ? '' : '<span class="no-ai">未接入 AI · 本地机缘模式中（点击右上角 ⚙ 配置 API）</span>';

    const ev = s.event;
    const text = ev ? ev.event : '万籁俱寂，灵雾未散。你的道途尚未启笔……';
    // 文本未变时跳过打字机重播（busy/aiReady/day 变化不打扰已呈现文本）
    if (text === this._shownText) return;
    this._typewrite(text);
  }

  _cn(n) {
    const d = '零一二三四五六七八九';
    if (n <= 10) return n === 10 ? '十' : d[n];
    if (n < 20) return '十' + d[n % 10];
    if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
    return String(n);
  }

  _typewrite(text) {
    this._shownText = text;
    clearInterval(this._typeTimer);
    clearTimeout(this._pauseT);
    this.textEl.textContent = '';
    let i = 0;
    this._typeTimer = setInterval(() => {
      // 每次吐 1~2 字，标点后略顿
      const ch = text[i];
      this.textEl.textContent += ch;
      i++;
      if (i >= text.length) return clearInterval(this._typeTimer);
      if ('。！？；…—'.includes(ch)) {
        clearInterval(this._typeTimer);
        this._pauseT = setTimeout(() => this._resume(text, i), 260);
      }
    }, 34);
  }

  _resume(text, i) {
    this._typeTimer = setInterval(() => {
      const ch = text[i];
      this.textEl.textContent += ch;
      i++;
      if (i >= text.length) return clearInterval(this._typeTimer);
      if ('。！？；…—'.includes(ch)) {
        clearInterval(this._typeTimer);
        this._pauseT = setTimeout(() => this._resume(text, i), 260);
      }
    }, 34);
  }

  destroy() {
    clearInterval(this._typeTimer);
    clearTimeout(this._pauseT);
    super.destroy();
  }
}
