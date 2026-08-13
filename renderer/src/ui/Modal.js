// 通用模态框基类：遮罩 + 面板 + 头部 + 关闭，子类填充 body/footer
// 增强：Esc 关闭（仅最上层实例响应）+ 按构造器的单例守卫（重开同类先关旧实例）
import { Component, h, icon } from '../core/component.js';

// 单例登记：constructor → 存活实例（Map 保持插入序，用于判定最上层）
const _instances = new Map();

export class Modal extends Component {
  /** 子类覆盖：标题/图标/面板额外 class */
  get modalTitle() { return ''; }
  get modalIcon() { return 'spark'; }
  get modalClass() { return ''; }

  /** 子类覆盖：返回主体内容（HTMLElement 或数组） */
  body() { return null; }
  /** 子类可选：返回底部操作区 */
  footer() { return null; }
  /** 子类可选：头部追加内容（插于标题与关闭钮之间） */
  headerExtra() { return null; }

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
          ...[].concat(this.headerExtra() ?? []),
          h('button', { class: 'modal-close', onclick: () => this.close() }, '×')
        ),
        this.bodyEl,
        foot ? h('footer', { class: 'modal-foot-c' }, ...[].concat(foot)) : null
      )
    );
    this.el = mask;
    return mask;
  }

  mount(parent) {
    // 单例守卫：同类模态已有存活实例时先关闭旧的
    const prev = _instances.get(this.constructor);
    if (prev && prev !== this) prev.close();
    _instances.set(this.constructor, this);
    // Esc 关闭：destroy 时解绑；多层模态并存时仅最上层响应
    this._escHandler = (e) => {
      if (e.key !== 'Escape') return;
      if (Modal._topmost() !== this) return;
      this.close();
    };
    document.addEventListener('keydown', this._escHandler);
    return super.mount(parent);
  }

  /** 当前最上层的存活模态实例 */
  static _topmost() {
    let top = null;
    for (const inst of _instances.values()) {
      if (inst.el?.isConnected) top = inst;
    }
    return top;
  }

  close() { this.destroy(); }

  destroy() {
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
    if (_instances.get(this.constructor) === this) _instances.delete(this.constructor);
    super.destroy();
  }
}
