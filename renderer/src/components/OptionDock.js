// 选项坞：4 个预选项 + 自由输入
import { Component, h, icon } from '../core/component.js';

const HOTKEYS = ['壹', '贰', '叁', '肆'];

export class OptionDock extends Component {
  constructor(store, props) {
    super(store, props);
    // props.onChoose(actionText)
  }

  watch() { return ['event', 'busy']; }

  render() {
    this.gridEl = h('div', { class: 'option-grid' });
    this.inputEl = h('input', {
      class: 'option-input',
      type: 'text',
      placeholder: '或自由落笔，写下你的行动……（回车提交）',
      maxlength: 120,
      onkeydown: (e) => {
        if (e.key === 'Enter' && this.inputEl.value.trim()) {
          this._choose(this.inputEl.value.trim());
          this.inputEl.value = '';
        }
      }
    });
    this.sendBtn = h('button', {
      class: 'option-send',
      title: '提交行动',
      onclick: () => {
        if (this.inputEl.value.trim()) {
          this._choose(this.inputEl.value.trim());
          this.inputEl.value = '';
        }
      }
    }, icon('send', 16));

    this.el = h('section', { class: 'panel option-dock' },
      h('header', { class: 'panel-head' },
        icon('brush', 16),
        h('span', { class: 'panel-title' }, '抉择')
      ),
      this.gridEl,
      h('div', { class: 'option-free' }, this.inputEl, this.sendBtn)
    );

    this._keyHandler = (e) => {
      if (document.activeElement === this.inputEl) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) this.gridEl.children[idx]?.click();
    };
    window.addEventListener('keydown', this._keyHandler);
    return this.el;
  }

  _choose(text) {
    if (this.store.get('busy')) return;
    this.props.onChoose?.(text);
  }

  update() {
    const { event, busy } = this.store.state;
    this.gridEl.innerHTML = '';
    const options = event?.options ?? [];
    options.slice(0, 4).forEach((opt, i) => {
      const btn = h('button', {
        class: 'option-card',
        disabled: busy ? 'disabled' : null,
        style: { animationDelay: `${i * 90}ms` },
        onclick: () => this._choose(opt)
      },
        h('span', { class: 'option-key' }, HOTKEYS[i]),
        h('span', { class: 'option-label' }, opt)
      );
      this.gridEl.appendChild(btn);
    });
    this.inputEl.disabled = busy;
    this.sendBtn.disabled = busy;
  }

  destroy() {
    window.removeEventListener('keydown', this._keyHandler);
    super.destroy();
  }
}
