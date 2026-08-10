// 可复用 UI 原子组件：按钮 / 页签 / 表单域 / 分段选择器 / 空态
import { h } from '../core/component.js';

/** 按钮：variant: gold | ghost | danger */
export function Button({ label, variant = 'ghost', icon: iconNode = null, disabled = false, onClick, class: cls = '', title = '' }) {
  return h('button', {
    class: `btn ${variant} ${cls}`.trim(),
    disabled: disabled ? 'disabled' : null,
    title: title || null,
    onclick: onClick
  }, iconNode, label);
}

/** 页签条：tabs=[{key,label}]，active，onChange(key) */
export function Tabs({ tabs, active, onChange, class: cls = '' }) {
  const el = h('div', { class: `ui-tabs ${cls}`.trim() });
  const render = () => {
    el.innerHTML = '';
    for (const t of tabs) {
      el.appendChild(h('button', {
        class: `ui-tab ${active === t.key ? 'active' : ''}`,
        onclick: () => { if (active !== t.key) { active = t.key; onChange?.(t.key); render(); } }
      }, t.label));
    }
  };
  render();
  el.refresh = (next) => { active = next; render(); };
  return el;
}

/** 表单域：label + 控件 + 提示 */
export function FormField({ label, control, tip = '' }) {
  return h('label', { class: 'ui-field' },
    h('span', { class: 'ui-field-label' }, label),
    control,
    tip ? h('span', { class: 'ui-field-tip' }, tip) : null
  );
}

/** 文本输入 */
export function TextInput({ value = '', placeholder = '', maxlength = 60, type = 'text', onChange }) {
  const el = h('input', { class: 'set-input', type, value, placeholder, maxlength: String(maxlength) });
  el.addEventListener('input', () => onChange?.(el.value));
  return el;
}

/** 下拉选择：options=[{key,label}] */
export function Select({ options, value, onChange }) {
  const el = h('select', { class: 'set-input' },
    options.map(o => h('option', { value: o.key, selected: o.key === value ? 'selected' : null }, o.label))
  );
  el.addEventListener('change', () => onChange?.(el.value));
  return el;
}

/** 滑块（带数值气泡） */
export function Slider({ min = 0, max = 1, step = 0.05, value = 0.5, fmt = (v) => v, onChange }) {
  const bubble = h('span', { class: 'ui-slider-val' }, fmt(value));
  const range = h('input', { class: 'ui-slider', type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  range.addEventListener('input', () => {
    const v = parseFloat(range.value);
    bubble.textContent = fmt(v);
    onChange?.(v);
  });
  return h('div', { class: 'ui-slider-wrap' }, range, bubble);
}

/** 开关 */
export function Toggle({ checked = false, onChange }) {
  const el = h('button', {
    class: `ui-toggle ${checked ? 'on' : ''}`,
    type: 'button',
    onclick: () => { checked = !checked; el.classList.toggle('on', checked); onChange?.(checked); }
  }, h('i', null));
  return el;
}

/** 空态提示 */
export function EmptyState({ text = '空空如也', sub = '' }) {
  return h('div', { class: 'inv-empty ui-empty' }, text, sub ? h('small', null, sub) : null);
}
