// 主界面模式卡片：图标 + 标题 + 描述 + 角标（配置驱动，CONFIG.modes）
import { h, icon } from '../core/component.js';

export function ModeCard({ icon: ic, title, desc, badge = '', available = true, onClick }) {
  return h('button', {
    class: `menu-card ${available ? '' : 'disabled'}`,
    disabled: available ? null : 'disabled',
    onclick: available ? onClick : null
  },
    badge ? h('span', { class: 'menu-card-badge' }, badge) : null,
    h('span', { class: 'menu-card-icon' }, icon(ic, 26)),
    h('span', { class: 'menu-card-title' }, title),
    h('span', { class: 'menu-card-desc' }, desc)
  );
}
