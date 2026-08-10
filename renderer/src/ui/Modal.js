// 通用模态框基类：遮罩 + 面板 + 头部 + 关闭，子类填充 body/footer
import { Component, h, icon } from '../core/component.js';

export class Modal extends Component {
  /** 子类覆盖：标题/图标/面板额外 class */
  get modalTitle() { return ''; }
  get modalIcon() { return 'spark'; }
  get modalClass() { return ''; }

  /** 子类覆盖：返回主体内容（HTMLElement 或数组） */
  body() { return null; }
  /** 子类可选：返回底部操作区 */
  footer() { return null; }

  render() {
    this.bodyEl = h('div', { class: 'modal-body-c' }, ...[].concat(this.body() ?? []));
    const foot = this.footer();
    const mask = h('div', {
      class: 'modal-mask',
      onclick: (e) => { if (e.target === mask) this.close(); }
    },
      h('div', { class: `modal ${this.modalClass}` },
        h('header', { class: 'panel-head' },
          icon(this.modalIcon, 16),
          h('span', { class: 'panel-title' }, this.modalTitle),
          h('button', { class: 'modal-close', onclick: () => this.close() }, '×')
        ),
        this.bodyEl,
        foot ? h('footer', { class: 'modal-foot-c' }, ...[].concat(foot)) : null
      )
    );
    this.el = mask;
    return mask;
  }

  close() { this.destroy(); }
}
