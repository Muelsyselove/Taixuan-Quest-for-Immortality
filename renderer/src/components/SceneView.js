// 地图模式场景视图：场景绘卷 + NPC 名录 + 功能设施
import { Component, h, icon } from '../core/component.js';
import { SCENES, getNPCsByScene, getFacilitiesByScene } from '../core/mapData.js';

// 场景背景绘卷（数据驱动：scene.bg → 渐变层叠），组件只读取
const SCENE_BGS = {
  hall_gold:     ['#2a2118', '#171208', '殿'],
  hall_ice:      ['#16222e', '#0a121a', '冰'],
  hall_dark:     ['#1b1020', '#0a060e', '冥'],
  hall_wood:     ['#14201a', '#0a120c', '药'],
  workshop_green:['#1a2416', '#0d120a', '丹'],
  workshop_fire: ['#2a1610', '#140a06', '铸'],
  field_earth:   ['#241f14', '#12100a', '武'],
  field_sword:   ['#1c1e26', '#0d0e13', '剑'],
  field_thunder: ['#1e1c2a', '#0e0d15', '雷'],
  garden_green:  ['#16241a', '#0a120d', '园'],
  garden_beast:  ['#201d12', '#100e08', '兽'],
  cave_dark:     ['#14161c', '#08090d', '窟'],
  cave_fire:     ['#26120c', '#120806', '焰'],
  cave_ice:      ['#12202a', '#081016', '寒'],
  cave_ghost:    ['#101c16', '#060d0a', '鬼'],
  market_bustle: ['#262016', '#131008', '集'],
  forest_mist:   ['#141e1c', '#090f0e', '雾'],
  cliff_danger:  ['#221418', '#100a0c', '崖'],
  default:       ['#1a1d24', '#0c0e12', '境']
};

export class SceneView extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { sceneId, onTalk(npc), onFacility(facilityKey), onGather(), onExit() }
  }

  watch() { return ['mapLocation', 'sect']; }

  render() {
    this.bodyEl = h('div', { class: 'scene-body' });
    this.el = h('section', { class: 'panel scene-panel' }, this.bodyEl);
    return this.el;
  }

  afterMount() { this.update(); }

  update() {
    const scene = SCENES[this.props.sceneId];
    this.bodyEl.innerHTML = '';
    if (!scene) return;
    const [c1, c2, glyph] = SCENE_BGS[scene.bg] ?? SCENE_BGS.default;
    const npcs = getNPCsByScene(scene.id);
    const facilities = getFacilitiesByScene(scene.id);
    const isWild = scene.type === 'wild';

    this.bodyEl.appendChild(
      h('div', { class: 'scene-stage' },
        // 场景绘卷
        h('div', {
          class: 'scene-canvas',
          style: { background: `radial-gradient(ellipse at 50% 30%, ${c1}, ${c2} 78%)` }
        },
          h('div', { class: 'scene-glyph' }, glyph),
          h('div', { class: 'scene-mist' }),
          h('div', { class: 'scene-title' },
            h('div', { class: 'scene-name' }, scene.name),
            h('div', { class: 'scene-desc' }, scene.desc)
          )
        ),

        // NPC 名录
        npcs.length ? h('div', { class: 'scene-npcs' },
          h('div', { class: 'scene-sec-title' }, '此地人物'),
          h('div', { class: 'scene-npc-row' },
            npcs.map(npc => h('button', {
              class: 'npc-chip',
              onclick: () => this.props.onTalk?.(npc)
            },
              h('span', { class: `npc-seal ${npc.gender}` }, npc.name[0]),
              h('span', { class: 'npc-chip-text' },
                h('b', null, npc.name),
                h('i', null, npc.function
                  ? `${npc.identity} · ${getFacilitiesByScene(scene.id).find(f => f.key === npc.function)?.label ?? ''}`
                  : npc.identity)
              )
            ))
          )
        ) : null,

        // 功能设施
        h('div', { class: 'scene-facilities' },
          h('div', { class: 'scene-sec-title' }, '可为之事'),
          h('div', { class: 'scene-fac-row' },
            facilities.map(f => h('button', {
              class: 'fac-btn', title: f.desc,
              onclick: () => this.props.onFacility?.(f.key)
            }, icon(f.icon, 15), h('span', null, f.label))),
            isWild ? h('button', {
              class: 'fac-btn gather', title: '探寻草药与机缘（耗时一月）',
              onclick: () => this.props.onGather?.()
            }, icon('lotus', 15), h('span', null, '探寻')) : null,
            h('button', { class: 'fac-btn leave', onclick: () => this.props.onExit?.() },
              icon('send', 15), h('span', null, '离开'))
          )
        )
      )
    );
  }
}
