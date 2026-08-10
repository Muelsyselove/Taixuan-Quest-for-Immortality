// 主界面：模式入口（对话 / 探索 / 设置），组件化组装
import { Component, h } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { ModeCard } from '../components/ModeCard.js';

export class MainMenu extends Component {
  render() {
    this.el = h('div', { class: 'screen menu-screen' },
      h('div', { class: 'menu-hero' },
        h('div', { class: 'menu-seal', html: this._seal() }),
        h('h1', { class: 'menu-title' }, CONFIG.gameTitle),
        h('p', { class: 'menu-sub' }, CONFIG.gameSubtitle)
      ),
      h('div', { class: 'menu-cards' },
        CONFIG.modes.map(m => ModeCard({
          ...m,
          onClick: () => { this.props.audio?.click(); this.props.onMode?.(m.key); }
        }))
      ),
      h('div', { class: 'menu-foot' }, `太玄问道 · v${CONFIG.version}`)
    );
    return this.el;
  }

  _seal() {
    return `<svg viewBox="0 0 64 64" width="58" height="58" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M32 14v10M22 24h20M26 24c0 8-4 12-10 14M38 24c0 8 4 12 10 14M24 38h16v10H24z"
        fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
}
