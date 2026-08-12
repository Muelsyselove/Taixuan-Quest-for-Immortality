// 地图模式场景视图：场景绘卷（精美贴图）+ NPC 名录 + 功能设施
import { Component, h, icon } from '../core/component.js';
import { SCENES, getNPCsByScene, getFacilitiesByScene } from '../core/mapData.js';

// 场景贴图：按场景底色（scene.bg）生成精美绘卷（AI 文生图），渐变遮罩保证文字可读
const tex = (prompt) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=landscape_16_9`;

const SCENE_BGS = {
  hall_gold:     { c: ['#2a2118', '#171208'], glyph: '殿', tex: tex('majestic golden cultivation sect grand hall interior, ornate carved pillars, glowing lanterns, incense smoke, chinese xianxia fantasy, detailed game background art, atmospheric lighting') },
  hall_ice:      { c: ['#16222e', '#0a121a'], glyph: '冰', tex: tex('crystalline ice palace hall, frozen lotus throne, translucent ice pillars, soft blue glow, snowflakes drifting, chinese xianxia fantasy game background art') },
  hall_dark:     { c: ['#1b1020', '#0a060e'], glyph: '冥', tex: tex('dark demonic cult grand hall, purple ghostly flames, obsidian throne, eerie green mist, sinister banners, chinese dark fantasy game background art') },
  hall_wood:     { c: ['#14201a', '#0a120c'], glyph: '药', tex: tex('ancient wooden medicine king hall, hanging dried herbs, bronze medicine cauldron, warm green light, shelves of pill bottles, chinese xianxia fantasy game background art') },
  workshop_green:{ c: ['#1a2416', '#0d120a'], glyph: '丹', tex: tex('alchemy workshop with glowing pill furnace, green spiritual flames, herb bundles and jade mortar, floating sparks, chinese xianxia fantasy game background art') },
  workshop_fire: { c: ['#2a1610', '#140a06'], glyph: '铸', tex: tex('fiery weapon forging workshop, molten lava channels, giant anvil and hanging swords, orange fire glow and embers, chinese xianxia fantasy game background art') },
  field_earth:   { c: ['#241f14', '#12100a'], glyph: '武', tex: tex('vast martial arts training ground at dawn, stone dummies and weapon racks, dust in golden sunlight, mountains in distance, chinese xianxia fantasy game background art') },
  field_sword:   { c: ['#1c1e26', '#0d0e13'], glyph: '剑', tex: tex('legendary sword pool with countless ancient swords stuck in stone, cold moonlight, sword aura rising like mist, chinese xianxia fantasy game background art') },
  field_thunder: { c: ['#1e1c2a', '#0e0d15'], glyph: '雷', tex: tex('thunder pool sacred ground, lightning bolts striking purple storm clouds, electric arcs over ancient pillars, chinese xianxia fantasy game background art') },
  garden_green:  { c: ['#16241a', '#0a120d'], glyph: '园', tex: tex('lush spiritual herb garden on mountain terrace, glowing medicinal plants, morning mist and fireflies, small stream, chinese xianxia fantasy game background art') },
  garden_beast:  { c: ['#201d12', '#100e08'], glyph: '兽', tex: tex('mystical spirit beast valley, giant ancient trees, glowing eyes of beasts in shadows, warm dusk light, chinese xianxia fantasy game background art') },
  cave_dark:     { c: ['#14161c', '#08090d'], glyph: '窟', tex: tex('quiet dark meditation cave, faint glowing spirit stones embedded in rock walls, single beam of light from above, chinese xianxia fantasy game background art') },
  cave_fire:     { c: ['#26120c', '#120806'], glyph: '焰', tex: tex('volcanic cave with underground lava river, red glow on stalactites, rising heat haze and embers, chinese xianxia fantasy game background art') },
  cave_ice:      { c: ['#12202a', '#081016'], glyph: '寒', tex: tex('frozen ice cave library, ancient scrolls on ice shelves, blue crystal light refracting, frost patterns, chinese xianxia fantasy game background art') },
  cave_ghost:    { c: ['#101c16', '#060d0a'], glyph: '鬼', tex: tex('ghostly cave with drifting green will-o-wisp flames, skulls and strange runes, dark toxic mist, chinese dark fantasy game background art') },
  market_bustle: { c: ['#262016', '#131008'], glyph: '集', tex: tex('bustling cultivator street market at dusk, red lanterns, stalls selling pills and talismans, crowds in robes, chinese xianxia fantasy game background art') },
  forest_mist:   { c: ['#141e1c', '#090f0e'], glyph: '雾', tex: tex('mysterious mist-shrouded ancient forest, towering trees fading into white fog, faint glowing herbs and spirit lights, chinese xianxia fantasy game background art') },
  cliff_danger:  { c: ['#221418', '#100a0c'], glyph: '崖', tex: tex('perilous precipice cliff edge above abyss, broken chains and plank road, blood-red sunset storm clouds, vultures circling, chinese xianxia fantasy game background art') },
  market_gold:   { c: ['#26200e', '#131006'], glyph: '银', tex: tex('grand gold and silver trading house interior, abacus and scales on counters, ledgers and coin stacks, warm candlelight, merchants arguing prices, chinese xianxia fantasy game background art') },
  default:       { c: ['#1a1d24', '#0c0e12'], glyph: '境', tex: tex('ethereal immortal realm landscape, floating mountains and waterfalls, sea of clouds, cranes flying, chinese xianxia fantasy game background art') }
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
    const bg = SCENE_BGS[scene.bg] ?? SCENE_BGS.default;
    const npcs = getNPCsByScene(scene.id);
    const facilities = getFacilitiesByScene(scene.id);
    const isWild = scene.type === 'wild';

    this.bodyEl.appendChild(
      h('div', { class: 'scene-stage' },
        // 场景绘卷（贴图 + 渐变遮罩 + 雾霭）
        h('div', {
          class: 'scene-canvas textured',
          style: {
            backgroundColor: bg.c[1],
            backgroundImage: `linear-gradient(to bottom, rgba(9,11,15,.30), rgba(9,11,15,.72) 78%), url("${bg.tex}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%'
          }
        },
          h('div', { class: 'scene-glyph' }, bg.glyph),
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
              class: 'fac-btn gather', title: '步入深处探寻——10×10 格子地图：战斗/采集/奇遇/云游商人，每步耗时 2 月',
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
