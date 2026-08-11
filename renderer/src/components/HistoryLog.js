// 史册：历史事件卷轴，最新在上
import { Component, h, icon } from '../core/component.js';

export class HistoryLog extends Component {
  watch() { return ['history']; }

  render() {
    this.listEl = h('div', { class: 'history-list' });
    this.el = h('section', { class: 'panel history-panel' },
      h('header', { class: 'panel-head' },
        icon('scroll', 16),
        h('span', { class: 'panel-title' }, '史册')
      ),
      this.listEl
    );
    return this.el;
  }

  update() {
    const history = this.store.state.history;
    this.listEl.innerHTML = '';
    if (!history.length) {
      this.listEl.appendChild(h('div', { class: 'history-empty' }, '尚无记载，落笔即是第一页。'));
      return;
    }
    for (const item of [...history].reverse().slice(0, 60)) {
      // 地图模式以年/月计（pushHistory 已写入 when），对话模式以日计
      this.listEl.appendChild(
        h('div', { class: `history-item kind-${item.kind}` },
          h('span', { class: 'history-day' }, item.when ?? `第${item.day}日`),
          h('span', { class: 'history-text' }, item.text)
        )
      );
    }
  }
}
