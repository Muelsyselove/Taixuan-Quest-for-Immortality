// 轻量组件基类：所有 UI 组件继承此类
// 约定：render() 返回 HTMLElement；update() 响应状态变化；mount(parent) 挂载
export class Component {
  constructor(store, props = {}) {
    this.store = store;
    this.props = props;
    this.el = null;
    this._unsub = null;
  }

  render() {
    throw new Error('Component.render() 未实现');
  }

  // 子类可覆盖：声明关心的状态片段，变化时自动调用 update()
  watch() {
    return [];
  }

  update() {}

  mount(parent) {
    this.el = this.render();
    parent.appendChild(this.el);
    const keys = this.watch();
    if (keys.length) {
      this._unsub = this.store.subscribe(keys, () => this.update());
    }
    this.afterMount?.();
    return this.el;
  }

  destroy() {
    this._unsub?.();
    this.el?.remove();
  }
}

// DOM 构建助手：h('div', {class:'x', onclick:fn}, ...children)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(9)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

// SVG 图标库（描边风格，线性渐变镀金）
export const ICONS = {
  heart:   'M12 21s-7.5-4.9-9.8-9.2C.4 8.6 2.3 4.9 6 4.4c2.2-.3 4.1.9 6 3 1.9-2.1 3.8-3.3 6-3 3.7.5 5.6 4.2 3.8 7.4C19.5 16.1 12 21 12 21z',
  drop:    'M12 3c3.5 4.2 6 7.4 6 10.5A6 6 0 0 1 6 13.5C6 10.4 8.5 7.2 12 3z',
  sword:   'M4 20l6.5-6.5M14 4l6 6-8.5 8.5-3-3L14 4zm3 3l-2-2M7 13l4 4',
  shield:  'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  talisman:'M7 3h10v18l-5-4-5 4V3zm3 5h4m-4 4h4',
  lotus:   'M12 20c-4 0-7-2.5-7-6 2 0 4 .7 5.2 2C9.7 13.5 9 10.6 9.4 8c1.6.8 2.6 2 2.6 2S12.6 7 15 5.5c.4 3-.9 6.4-2.7 8.5 1.2-1 3-1.6 4.7-1.5 0 4-2 7.5-5 7.5z',
  scroll:  'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6m0-18a2 2 0 0 0-2 2v14a2 2 0 0 1 2 2m0-18v18m4-13h6m-6 4h6',
  spark:   'M12 2l2 7 7 1-5.5 4.5L17 22l-5-4-5 4 1.5-7.5L3 10l7-1 2-7z',
  yinyang: 'M12 3a9 9 0 1 0 0 18 4.5 4.5 0 0 1 0-9 4.5 4.5 0 0 0 0-9zm0 3.7a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm0 9.6a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z',
  send:    'M4 12l16-7-5 16-3.5-6.5L4 12zm7.5 2.5L20 5',
  brush:   'M4 20c2-4 4-6 7-7l7-7 2 2-7 7c-1 3-3 5-7 7l-2-2zm8.5-8.5l2 2'
};

export function icon(name, size = 18) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('class', 'icon');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICONS[name] || ICONS.spark);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  return svg;
}
