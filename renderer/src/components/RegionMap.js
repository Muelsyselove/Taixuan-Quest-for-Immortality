// 地图模式二级地图：宗门/区域内部场景分布，点击进入场景
import { Component, h, icon } from '../core/component.js';
import { REGION_MAPS, SCENES, getSectStyleLabel, SECTS } from '../core/mapData.js';
import { svgEl } from './svgViewport.js';

// 场景类型 → 字印
const TYPE_GLYPH = {
  hall: '殿', workshop: '坊', training: '武', garden: '园',
  cave: '窟', library: '书', market: '市', wild: '野'
};

// props: { regionId, onEnterScene(sceneId), onBackWorld() }
export class RegionMap extends Component {
  watch() { return ['mapLocation']; }

  render() {
    const region = REGION_MAPS[this.props.regionId];
    if (!region) {
      this.el = h('section', { class: 'panel region-map-panel' }, '未知区域');
      return this.el;
    }
    const sect = SECTS[region.id];
    const styleDef = sect ? getSectStyleLabel(sect.style) : null;
    this.nodeEls = new Map();

    const svg = svgEl('svg', { viewBox: '0 0 800 600', class: 'map-svg region-map', preserveAspectRatio: 'xMidYMid meet' });

    const defs = svgEl('defs');
    defs.innerHTML = `
      <radialGradient id="regionGlow" cx="50%" cy="42%" r="65%">
        <stop offset="0" stop-color="#d8b25c" stop-opacity=".10"/>
        <stop offset=".7" stop-color="#7fb3a8" stop-opacity=".05"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <filter id="regionNodeGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
    svg.appendChild(defs);
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: 800, height: 600, fill: 'url(#regionGlow)' }));

    // 装饰：灵峰轮廓
    const deco = svgEl('g', { class: 'region-deco', opacity: '0.14' });
    for (let i = 0; i < 5; i++) {
      const bx = 80 + i * 160, bh = 90 + (i % 3) * 45;
      deco.appendChild(svgEl('path', {
        d: `M${bx - 90} 600 L${bx} ${600 - bh * 2.2} L${bx + 90} 600 Z`,
        fill: '#7fb3a8', opacity: 0.35
      }));
    }
    svg.appendChild(deco);

    // 场景连线（以首个场景为中心辐射）
    const ids = region.scenes;
    const center = region.positions[ids[0]];
    const linkLayer = svgEl('g', { class: 'map-edges' });
    if (center) {
      for (const id of ids.slice(1)) {
        const p = region.positions[id];
        if (!p) continue;
        linkLayer.appendChild(svgEl('path', {
          d: `M${center.x} ${center.y} Q${(center.x + p.x) / 2} ${(center.y + p.y) / 2 - 36} ${p.x} ${p.y}`,
          fill: 'none', stroke: 'rgba(216,178,92,.35)', 'stroke-width': '1.6', 'stroke-dasharray': '4 7',
          class: 'map-edge'
        }));
      }
    }
    svg.appendChild(linkLayer);

    // 场景节点
    const nodeLayer = svgEl('g', { class: 'map-nodes' });
    for (const sceneId of ids) {
      const scene = SCENES[sceneId];
      const pos = region.positions[sceneId];
      if (!scene || !pos) continue;
      const g = svgEl('g', {
        class: 'map-node region-node',
        transform: `translate(${pos.x}, ${pos.y})`,
        'data-id': sceneId,
        style: 'cursor: pointer'
      });
      const halo = svgEl('circle', { r: '30', class: 'node-halo', fill: 'none' });
      const body = svgEl('circle', { r: '20', class: 'node-body', filter: 'url(#regionNodeGlow)' });
      const glyph = svgEl('text', { class: 'node-glyph', 'text-anchor': 'middle', dy: '7' });
      glyph.textContent = TYPE_GLYPH[scene.type] ?? '境';
      const label = svgEl('text', { class: 'node-label', 'text-anchor': 'middle', dy: '46' });
      label.textContent = scene.name;
      const sub = svgEl('text', { class: 'node-sublabel', 'text-anchor': 'middle', dy: '62' });
      sub.textContent = scene.npcs.length ? `${scene.npcs.length} 人在此` : '空无一人';
      g.append(halo, body, glyph, label, sub);
      g.addEventListener('click', () => this.props.onEnterScene?.(sceneId));
      nodeLayer.appendChild(g);
      this.nodeEls.set(sceneId, g);
    }
    svg.appendChild(nodeLayer);

    this.el = h('section', { class: 'panel region-map-panel' },
      h('header', { class: 'panel-head' },
        icon('lotus', 16),
        h('span', { class: 'panel-title' }, region.name),
        styleDef ? h('span', { class: 'region-style-tag', style: { color: styleDef.color, borderColor: styleDef.color } }, styleDef.label) : null,
        h('button', { class: 'region-back', title: '返回大世界', onclick: () => this.props.onBackWorld?.() }, '‹ 大世界')
      ),
      h('div', { class: 'region-desc' }, region.desc),
      h('div', { class: 'map-wrap region-map-wrap' }, svg)
    );
    return this.el;
  }

  update() {
    const sceneId = this.store.state.mapLocation?.scene;
    for (const [id, g] of this.nodeEls) g.classList.toggle('is-here', id === sceneId);
  }
}
