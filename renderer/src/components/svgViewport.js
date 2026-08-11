// SVG 地图视口：封装缩放（滚轮/按钮）、拖拽平移与缩放工具条
// WorldMap / MapView 共用；RegionMap 等仅需 svgEl 的可单独引入
import { h } from '../core/component.js';

export const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export class SvgViewport {
  /**
   * @param {SVGSVGElement} svg 根 <svg>
   * @param {SVGGElement} viewport 缩放/平移作用的 <g>
   * @param {{width:number, height:number, minZoom:number, maxZoom:number}} opts viewBox 尺寸与缩放范围
   */
  constructor(svg, viewport, { width, height, minZoom, maxZoom }) {
    this.svg = svg;
    this.viewport = viewport;
    this.width = width;
    this.height = height;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.zoomText = h('span', { class: 'map-zoom-label' }, '100%');
  }

  /** 绑定滚轮缩放 + 拖拽平移到容器元素 */
  bind(wrap) {
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e);
    }, { passive: false });
    this._bindDrag(wrap);
  }

  /** 缩放工具条（− / 百分比 / + / 复位） */
  zoomBar() {
    return h('div', { class: 'map-zoom-bar' },
      h('button', { class: 'map-zoom-btn', onclick: () => this.zoomBy(1 / 1.25) }, '−'),
      this.zoomText,
      h('button', { class: 'map-zoom-btn', onclick: () => this.zoomBy(1.25) }, '+'),
      h('button', { class: 'map-zoom-btn reset', title: '复位', onclick: () => this.reset() }, '⌂')
    );
  }

  /** 以鼠标位置为锚点缩放（无事件时以画布中心为锚点） */
  zoomBy(factor, e) {
    const next = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    if (next === this.zoom) return;
    const rect = this.svg.getBoundingClientRect();
    const cx = e ? ((e.clientX - rect.left) / rect.width) * this.width : this.width / 2;
    const cy = e ? ((e.clientY - rect.top) / rect.height) * this.height : this.height / 2;
    this.pan.x = cx - ((cx - this.pan.x) / this.zoom) * next;
    this.pan.y = cy - ((cy - this.pan.y) / this.zoom) * next;
    this.zoom = next;
    this.apply();
  }

  _bindDrag(el) {
    let dragging = false, captured = false, last = null, pid = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return; // 不抢占按钮点击
      dragging = true; captured = false;
      last = { x: e.clientX, y: e.clientY };
      pid = e.pointerId;
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      // 位移超过阈值才判定拖拽并捕获指针——pointerdown 即捕获会把 click 重定向到容器，吞掉节点点击
      if (!captured) {
        if (Math.hypot(e.clientX - last.x, e.clientY - last.y) < 4) return;
        captured = true;
        try { el.setPointerCapture(pid); } catch { /* 指针已释放则忽略 */ }
      }
      const rect = this.svg.getBoundingClientRect();
      this.pan.x += ((e.clientX - last.x) / rect.width) * this.width;
      this.pan.y += ((e.clientY - last.y) / rect.height) * this.height;
      last = { x: e.clientX, y: e.clientY };
      this.apply();
    });
    const stop = () => { dragging = false; captured = false; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }

  apply() {
    this.viewport.setAttribute('transform', `translate(${this.pan.x}, ${this.pan.y}) scale(${this.zoom})`);
    this.zoomText.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  reset() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.apply();
  }
}
