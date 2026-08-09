// 山河舆图：纯 SVG 地图，支持 25%~400% 缩放（滚轮/按钮）与拖拽平移
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';

const NS = 'http://www.w3.org/2000/svg';
const KIND_STYLE = {
  sect:   { glyph: '宗', cls: 'node-sect'   },
  city:   { glyph: '城', cls: 'node-city'   },
  wild:   { glyph: '野', cls: 'node-wild'   },
  danger: { glyph: '凶', cls: 'node-danger' }
};

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export class MapView extends Component {
  constructor(store, props) {
    super(store, props);
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  watch() { return ['location']; }

  render() {
    this.nodeEls = new Map();

    const svg = svgEl('svg', { viewBox: '0 0 1000 640', class: 'map-svg', preserveAspectRatio: 'xMidYMid meet' });
    this.svg = svg;

    // 视口层（缩放/平移作用于它）
    this.viewport = svgEl('g', { class: 'map-viewport' });
    svg.appendChild(this.viewport);

    // 渐变与滤镜定义
    const defs = svgEl('defs');
    defs.innerHTML = `
      <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d8b25c" stop-opacity=".15"/>
        <stop offset=".5" stop-color="#d8b25c" stop-opacity=".55"/>
        <stop offset="1" stop-color="#d8b25c" stop-opacity=".15"/>
      </linearGradient>
      <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
    svg.appendChild(defs);

    // 装饰：淡墨等高线山形
    const deco = svgEl('g', { class: 'map-deco', opacity: '0.16' });
    for (let i = 0; i < 6; i++) {
      const cx = 120 + i * 150, cy = 90 + (i % 3) * 180;
      deco.appendChild(svgEl('path', {
        d: `M${cx - 46} ${cy} L${cx} ${cy - 38} L${cx + 46} ${cy} M${cx - 22} ${cy} L${cx + 8} ${cy - 20} L${cx + 30} ${cy}`,
        fill: 'none', stroke: '#7fb3a8', 'stroke-width': '2', 'stroke-linejoin': 'round'
      }));
    }
    this.viewport.appendChild(deco);

    // 路径层
    const edgeLayer = svgEl('g', { class: 'map-edges' });
    for (const [a, b] of CONFIG.map.edges) {
      const na = CONFIG.map.nodes.find(n => n.id === a);
      const nb = CONFIG.map.nodes.find(n => n.id === b);
      const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2 - 26;
      edgeLayer.appendChild(svgEl('path', {
        d: `M${na.x} ${na.y} Q${mx} ${my} ${nb.x} ${nb.y}`,
        fill: 'none', stroke: 'url(#edgeGrad)', 'stroke-width': '2', 'stroke-dasharray': '5 7',
        class: 'map-edge'
      }));
    }
    this.viewport.appendChild(edgeLayer);

    // 节点层
    const nodeLayer = svgEl('g', { class: 'map-nodes' });
    for (const node of CONFIG.map.nodes) {
      const style = KIND_STYLE[node.kind] || KIND_STYLE.wild;
      const g = svgEl('g', { class: `map-node ${style.cls}`, transform: `translate(${node.x}, ${node.y})` });
      const halo = svgEl('circle', { r: '26', class: 'node-halo', fill: 'none' });
      const body = svgEl('circle', { r: '15', class: 'node-body' });
      const glyph = svgEl('text', { class: 'node-glyph', 'text-anchor': 'middle', dy: '5' });
      glyph.textContent = style.glyph;
      const label = svgEl('text', { class: 'node-label', 'text-anchor': 'middle', dy: '38' });
      label.textContent = node.name;
      g.append(halo, body, glyph, label);
      nodeLayer.appendChild(g);
      this.nodeEls.set(node.id, g);
    }
    this.viewport.appendChild(nodeLayer);

    // 行者标记
    this.marker = svgEl('g', { class: 'map-marker', filter: 'url(#softGlow)' });
    this.marker.innerHTML = `
      <circle r="5" fill="#f4d98c"/>
      <circle r="11" fill="none" stroke="#f4d98c" stroke-width="1.4" class="marker-ring"/>`;
    this.viewport.appendChild(this.marker);

    this.locText = h('div', { class: 'map-location' });
    this.zoomText = h('span', { class: 'map-zoom-label' }, '100%');

    // 缩放工具条
    const zoomBar = h('div', { class: 'map-zoom-bar' },
      h('button', { class: 'map-zoom-btn', onclick: () => this._zoomBy(1 / 1.25) }, '−'),
      this.zoomText,
      h('button', { class: 'map-zoom-btn', onclick: () => this._zoomBy(1.25) }, '+'),
      h('button', { class: 'map-zoom-btn reset', title: '复位', onclick: () => this._resetView() }, '⌂')
    );

    // 交互：滚轮缩放 + 拖拽平移
    const wrap = h('div', { class: 'map-wrap' }, svg, zoomBar);
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e);
    }, { passive: false });
    this._bindDrag(wrap);

    this.el = h('section', { class: 'panel map-panel' },
      h('header', { class: 'panel-head' },
        icon('spark', 16),
        h('span', { class: 'panel-title' }, '山河舆图')
      ),
      wrap,
      this.locText
    );
    return this.el;
  }

  afterMount() { this.update(); this._applyView(); }

  /* ---------- 缩放 / 平移 ---------- */

  _zoomBy(factor, e) {
    const min = CONFIG.map.minZoom, max = CONFIG.map.maxZoom;
    const next = Math.min(max, Math.max(min, this.zoom * factor));
    if (next === this.zoom) return;

    // 以鼠标位置为锚点缩放（无事件时以中心为锚点）
    const rect = this.svg.getBoundingClientRect();
    const cx = e ? ((e.clientX - rect.left) / rect.width) * 1000 : 500;
    const cy = e ? ((e.clientY - rect.top) / rect.height) * 640 : 320;
    this.pan.x = cx - ((cx - this.pan.x) / this.zoom) * next;
    this.pan.y = cy - ((cy - this.pan.y) / this.zoom) * next;
    this.zoom = next;
    this._applyView();
  }

  _bindDrag(el) {
    let dragging = false, last = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return; // 不抢占按钮点击（指针捕获会吞掉 click）
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = this.svg.getBoundingClientRect();
      this.pan.x += ((e.clientX - last.x) / rect.width) * 1000;
      this.pan.y += ((e.clientY - last.y) / rect.height) * 640;
      last = { x: e.clientX, y: e.clientY };
      this._applyView();
    });
    const stop = () => { dragging = false; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }

  _applyView() {
    this.viewport.setAttribute('transform', `translate(${this.pan.x}, ${this.pan.y}) scale(${this.zoom})`);
    this.zoomText.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  _resetView() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this._applyView();
  }

  /* ---------- 状态 ---------- */

  update() {
    const loc = this.store.state.location;
    for (const [id, g] of this.nodeEls) {
      g.classList.toggle('is-here', id === loc);
    }
    const node = CONFIG.map.nodes.find(n => n.id === loc);
    if (node) {
      this.marker.style.transition = 'transform 1.1s cubic-bezier(.22,1,.36,1)';
      this.marker.style.transform = `translate(${node.x}px, ${node.y}px)`;
      this.locText.innerHTML = `<span class="loc-dot"></span>当前所在 · <b>${node.name}</b>`;
    }
  }
}
