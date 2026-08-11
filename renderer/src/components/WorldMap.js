// 地图模式大地图：世界地图（一级），支持点击进入区域/宗门
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { WORLD_MAP, REGION_MAPS, SECTS, getSectStyleLabel } from '../core/mapData.js';

const NS = 'http://www.w3.org/2000/svg';
const KIND_STYLE = {
  sect:   { glyph: '宗', cls: 'node-sect'   },
  city:   { glyph: '市', cls: 'node-city'   },
  wild:   { glyph: '野', cls: 'node-wild'   },
  danger: { glyph: '凶', cls: 'node-danger' }
};

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export class WorldMap extends Component {
  constructor(store, props) {
    super(store, props);
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  watch() { return ['mapLocation']; }

  render() {
    this.nodeEls = new Map();

    const svg = svgEl('svg', { viewBox: '0 0 1000 600', class: 'map-svg world-map', preserveAspectRatio: 'xMidYMid meet' });
    this.svg = svg;

    // 视口层
    this.viewport = svgEl('g', { class: 'map-viewport' });
    svg.appendChild(this.viewport);

    // 渐变与滤镜
    const defs = svgEl('defs');
    defs.innerHTML = `
      <linearGradient id="worldEdgeGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d8b25c" stop-opacity=".15"/>
        <stop offset=".5" stop-color="#d8b25c" stop-opacity=".55"/>
        <stop offset="1" stop-color="#d8b25c" stop-opacity=".15"/>
      </linearGradient>
      <filter id="worldGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="8" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
    svg.appendChild(defs);

    // 装饰：云雾
    const deco = svgEl('g', { class: 'map-deco', opacity: '0.12' });
    for (let i = 0; i < 8; i++) {
      const cx = 100 + i * 120, cy = 80 + (i % 4) * 140;
      deco.appendChild(svgEl('ellipse', {
        cx, cy, rx: 60 + Math.random() * 40, ry: 20 + Math.random() * 15,
        fill: '#7fb3a8', opacity: 0.3
      }));
    }
    this.viewport.appendChild(deco);

    // 路径层
    const edgeLayer = svgEl('g', { class: 'map-edges' });
    for (const [a, b] of WORLD_MAP.edges) {
      const na = WORLD_MAP.nodes.find(n => n.id === a);
      const nb = WORLD_MAP.nodes.find(n => n.id === b);
      if (!na || !nb) continue;
      const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2 - 30;
      edgeLayer.appendChild(svgEl('path', {
        d: `M${na.x} ${na.y} Q${mx} ${my} ${nb.x} ${nb.y}`,
        fill: 'none', stroke: 'url(#worldEdgeGrad)', 'stroke-width': '2', 'stroke-dasharray': '6 8',
        class: 'map-edge'
      }));
    }
    this.viewport.appendChild(edgeLayer);

    // 节点层
    const nodeLayer = svgEl('g', { class: 'map-nodes' });
    for (const node of WORLD_MAP.nodes) {
      const style = KIND_STYLE[node.kind] || KIND_STYLE.wild;
      const g = svgEl('g', {
        class: `map-node world-node ${style.cls}`,
        transform: `translate(${node.x}, ${node.y})`,
        'data-id': node.id,
        style: 'cursor: pointer'
      });

      // 宗门节点显示风格标签
      let subLabel = '';
      if (node.sect) {
        const sect = SECTS[node.sect];
        if (sect) {
          const styleDef = getSectStyleLabel(sect.style);
          subLabel = styleDef.label;
        }
      }

      const halo = svgEl('circle', { r: '32', class: 'node-halo', fill: 'none' });
      const body = svgEl('circle', { r: '18', class: 'node-body', filter: 'url(#worldGlow)' });
      const glyph = svgEl('text', { class: 'node-glyph', 'text-anchor': 'middle', dy: '6' });
      glyph.textContent = style.glyph;
      const label = svgEl('text', { class: 'node-label', 'text-anchor': 'middle', dy: '42' });
      label.textContent = node.name;
      g.append(halo, body, glyph, label);

      // 宗门风格标签
      if (subLabel) {
        const sub = svgEl('text', { class: 'node-sublabel', 'text-anchor': 'middle', dy: '56' });
        sub.textContent = subLabel;
        g.appendChild(sub);
      }

      // 点击进入区域
      g.addEventListener('click', () => this._enterRegion(node.id));
      nodeLayer.appendChild(g);
      this.nodeEls.set(node.id, g);
    }
    this.viewport.appendChild(nodeLayer);

    // 当前位置标记
    this.marker = svgEl('g', { class: 'map-marker', filter: 'url(#worldGlow)' });
    this.marker.innerHTML = `
      <circle r="6" fill="#f4d98c"/>
      <circle r="14" fill="none" stroke="#f4d98c" stroke-width="1.5" class="marker-ring"/>`;
    this.viewport.appendChild(this.marker);

    // 缩放工具条
    this.zoomText = h('span', { class: 'map-zoom-label' }, '100%');
    const zoomBar = h('div', { class: 'map-zoom-bar' },
      h('button', { class: 'map-zoom-btn', onclick: () => this._zoomBy(1 / 1.25) }, '−'),
      this.zoomText,
      h('button', { class: 'map-zoom-btn', onclick: () => this._zoomBy(1.25) }, '+'),
      h('button', { class: 'map-zoom-btn reset', title: '复位', onclick: () => this._resetView() }, '⌂')
    );

    // 交互
    const wrap = h('div', { class: 'map-wrap world-map-wrap' }, svg, zoomBar);
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e);
    }, { passive: false });
    this._bindDrag(wrap);

    this.el = h('section', { class: 'panel world-map-panel' },
      h('header', { class: 'panel-head' },
        icon('spark', 16),
        h('span', { class: 'panel-title' }, '太玄大陆')
      ),
      wrap
    );
    return this.el;
  }

  afterMount() { this.update(); this._applyView(); }

  _zoomBy(factor, e) {
    const min = WORLD_MAP.minZoom, max = WORLD_MAP.maxZoom;
    const next = Math.min(max, Math.max(min, this.zoom * factor));
    if (next === this.zoom) return;
    const rect = this.svg.getBoundingClientRect();
    const cx = e ? ((e.clientX - rect.left) / rect.width) * 1000 : 500;
    const cy = e ? ((e.clientY - rect.top) / rect.height) * 600 : 300;
    this.pan.x = cx - ((cx - this.pan.x) / this.zoom) * next;
    this.pan.y = cy - ((cy - this.pan.y) / this.zoom) * next;
    this.zoom = next;
    this._applyView();
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
      this.pan.x += ((e.clientX - last.x) / rect.width) * 1000;
      this.pan.y += ((e.clientY - last.y) / rect.height) * 600;
      last = { x: e.clientX, y: e.clientY };
      this._applyView();
    });
    const stop = () => { dragging = false; captured = false; el.classList.remove('dragging'); };
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

  _enterRegion(regionId) {
    this.props.onEnterRegion?.(regionId);
  }

  update() {
    const loc = this.store.state.mapLocation;
    const worldId = loc?.world || 'qingyun';
    for (const [id, g] of this.nodeEls) {
      g.classList.toggle('is-here', id === worldId);
    }
    const node = WORLD_MAP.nodes.find(n => n.id === worldId);
    if (node) {
      this.marker.style.transition = 'transform 1.2s cubic-bezier(.22,1,.36,1)';
      this.marker.style.transform = `translate(${node.x}px, ${node.y}px)`;
    }
  }
}
