// 地图模式大地图：世界地图（一级），支持点击进入区域/宗门
import { Component, h, icon } from '../core/component.js';
import { WORLD_MAP, SECTS, getSectStyleLabel } from '../core/mapData.js';
import { SvgViewport, svgEl } from './svgViewport.js';

const KIND_STYLE = {
  sect:   { glyph: '宗', cls: 'node-sect'   },
  city:   { glyph: '市', cls: 'node-city'   },
  wild:   { glyph: '野', cls: 'node-wild'   },
  danger: { glyph: '凶', cls: 'node-danger' }
};

export class WorldMap extends Component {
  constructor(store, props) {
    super(store, props);
    // 主图与迷你图双实例共存时 SVG defs id 会冲突，故按实例加唯一后缀
    this._uid = Math.random().toString(36).slice(2, 7);
  }

  watch() { return ['mapLocation']; }

  render() {
    this.nodeEls = new Map();

    const svg = svgEl('svg', { viewBox: '0 0 1000 600', class: 'map-svg world-map', preserveAspectRatio: 'xMidYMid meet' });

    // 视口层（缩放/平移作用于它）
    const viewport = svgEl('g', { class: 'map-viewport' });
    svg.appendChild(viewport);
    this.vp = new SvgViewport(svg, viewport, {
      width: 1000, height: 600,
      minZoom: WORLD_MAP.minZoom, maxZoom: WORLD_MAP.maxZoom
    });

    // 渐变与滤镜
    const defs = svgEl('defs');
    defs.innerHTML = `
      <linearGradient id="worldEdgeGrad-${this._uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d8b25c" stop-opacity=".15"/>
        <stop offset=".5" stop-color="#d8b25c" stop-opacity=".55"/>
        <stop offset="1" stop-color="#d8b25c" stop-opacity=".15"/>
      </linearGradient>
      <filter id="worldGlow-${this._uid}" x="-80%" y="-80%" width="260%" height="260%">
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
    viewport.appendChild(deco);

    // 路径层
    const edgeLayer = svgEl('g', { class: 'map-edges' });
    for (const [a, b] of WORLD_MAP.edges) {
      const na = WORLD_MAP.nodes.find(n => n.id === a);
      const nb = WORLD_MAP.nodes.find(n => n.id === b);
      if (!na || !nb) continue;
      const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2 - 30;
      edgeLayer.appendChild(svgEl('path', {
        d: `M${na.x} ${na.y} Q${mx} ${my} ${nb.x} ${nb.y}`,
        fill: 'none', stroke: `url(#worldEdgeGrad-${this._uid})`, 'stroke-width': '2', 'stroke-dasharray': '6 8',
        class: 'map-edge'
      }));
    }
    viewport.appendChild(edgeLayer);

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
      const body = svgEl('circle', { r: '18', class: 'node-body', filter: `url(#worldGlow-${this._uid})` });
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
      g.addEventListener('click', () => this.props.onEnterRegion?.(node.id));
      nodeLayer.appendChild(g);
      this.nodeEls.set(node.id, g);
    }
    viewport.appendChild(nodeLayer);

    // 当前位置标记
    this.marker = svgEl('g', { class: 'map-marker', filter: `url(#worldGlow-${this._uid})` });
    this.marker.innerHTML = `
      <circle r="6" fill="#f4d98c"/>
      <circle r="14" fill="none" stroke="#f4d98c" stroke-width="1.5" class="marker-ring"/>`;
    viewport.appendChild(this.marker);

    // 交互：滚轮缩放 + 拖拽平移
    const wrap = h('div', { class: 'map-wrap world-map-wrap' }, svg, this.vp.zoomBar());
    this.vp.bind(wrap);

    this.el = h('section', { class: 'panel world-map-panel' },
      h('header', { class: 'panel-head' },
        icon('spark', 16),
        h('span', { class: 'panel-title' }, '太玄大陆')
      ),
      wrap
    );
    return this.el;
  }

  afterMount() { this.update(); this.vp.apply(); }

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
