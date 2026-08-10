// 选择卡片：角色选择与存档选择共用的条目组件
// dashed=true 时为虚线行动卡（新建角色 / 开启新程）
import { h, icon } from '../core/component.js';

export function PickCard({ icon: ic = '', title, lines = [], badge = '', dashed = false, onClick, onDelete }) {
  return h('div', { class: `pick-card ${dashed ? 'dashed' : ''}`, onclick: onClick },
    onDelete ? h('button', {
      class: 'pick-del', title: '删除',
      onclick: (e) => { e.stopPropagation(); onDelete(e.currentTarget); }
    }, '×') : null,
    ic ? h('span', { class: 'pick-icon' }, icon(ic, 20)) : null,
    h('b', { class: 'pick-title' }, title),
    ...lines.map(l => h('span', { class: 'pick-line' }, l)),
    badge ? h('span', { class: 'pick-badge' }, badge) : null
  );
}

/** 两段式删除确认：首次点击武装（1.6s 内再次点击才执行） */
export function armDelete(btn, fn) {
  if (btn.classList.contains('armed')) {
    btn.classList.remove('armed');
    btn.textContent = '×';
    fn();
    return;
  }
  btn.classList.add('armed');
  btn.textContent = '确';
  setTimeout(() => { btn.classList.remove('armed'); btn.textContent = '×'; }, 1600);
}
