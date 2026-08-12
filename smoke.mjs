// 冒烟验证：拆分后的模块完整性与数据引用闭环（不依赖 Electron/DOM）
import { SECT_STYLES, FACILITY_TYPES, NPCS, SCENES, SECTS, WORLD_MAP, REGION_MAPS,
         getSect, getScene, getNPC, getRegion, getScenesBySect, getNPCsByScene,
         getFacilitiesByScene, getSectStyleLabel, canJoinSect } from './renderer/src/core/mapData.js';
import { GameStore } from './renderer/src/core/store.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL:', msg); } };

/* ---------- mapData 聚合入口 ---------- */
ok(Object.keys(SECT_STYLES).length === 8, 'SECT_STYLES 应有 8 系');
ok(Object.keys(FACILITY_TYPES).length === 10, 'FACILITY_TYPES 应有 10 类设施');
ok(Object.keys(SECTS).length === 8, 'SECTS 应有 8 宗门');
ok(WORLD_MAP.nodes.length > 0 && WORLD_MAP.edges.length > 0, 'WORLD_MAP 非空');

/* ---------- 引用闭环：宗门→场景→NPC/设施 ---------- */
for (const [sid, sect] of Object.entries(SECTS)) {
  ok(SECT_STYLES[sect.style], `宗门 ${sid} 的 style ${sect.style} 应在 SECT_STYLES 中`);
  for (const sceneId of sect.scenes) ok(SCENES[sceneId], `宗门 ${sid} 引用了不存在的场景 ${sceneId}`);
}
for (const [scid, scene] of Object.entries(SCENES)) {
  for (const nid of scene.npcs) ok(NPCS[nid], `场景 ${scid} 引用了不存在的 NPC ${nid}`);
  for (const f of scene.facilities) ok(FACILITY_TYPES[f], `场景 ${scid} 引用了不存在的设施 ${f}`);
}
for (const [nid, npc] of Object.entries(NPCS)) {
  if (npc.sect) ok(SECTS[npc.sect], `NPC ${nid} 的 sect ${npc.sect} 不存在`);
  if (npc.function) ok(FACILITY_TYPES[npc.function], `NPC ${nid} 的 function ${npc.function} 不存在`);
}
for (const [a, b] of WORLD_MAP.edges) {
  ok(WORLD_MAP.nodes.some(n => n.id === a), `边端点 ${a} 不存在`);
  ok(WORLD_MAP.nodes.some(n => n.id === b), `边端点 ${b} 不存在`);
}
for (const [rid, region] of Object.entries(REGION_MAPS)) {
  for (const scid of region.scenes) {
    ok(SCENES[scid], `区域 ${rid} 引用了不存在的场景 ${scid}`);
    ok(region.positions[scid], `区域 ${rid} 缺少场景 ${scid} 的坐标`);
  }
}
// 大世界宗门节点与 SECTS 一一对应
for (const n of WORLD_MAP.nodes.filter(n => n.sect)) {
  ok(SECTS[n.sect], `世界节点 ${n.id} 的 sect ${n.sect} 不存在`);
  ok(REGION_MAPS[n.id], `世界节点 ${n.id} 缺少对应二级地图`);
}

/* ---------- 查询工具 ---------- */
ok(getSect('qingyun')?.name === '青云门', 'getSect');
ok(getScene('qy_dadian')?.name === '青云大殿', 'getScene');
ok(getNPC('qy_zhangmen')?.name === '清虚子', 'getNPC');
ok(getRegion('qingyun')?.scenes.length === 5, 'getRegion');
ok(getScenesBySect('qingyun').length === 5, 'getScenesBySect');
ok(getNPCsByScene('qy_dadian')[0]?.name === '清虚子', 'getNPCsByScene');
ok(getFacilitiesByScene('qy_dadian')[0]?.label === '宗门大殿', 'getFacilitiesByScene');
ok(getSectStyleLabel('jin').label === '金系', 'getSectStyleLabel');
ok(getSectStyleLabel('nonexist').label === '混元', 'getSectStyleLabel 兜底');
ok(canJoinSect('qingyun', { realmIndex: 0 }).ok === true, 'canJoinSect 青云门无门槛');
ok(canJoinSect('xuanbing', { realmIndex: 1, gender: 'male' }).ok === false, 'canJoinSect 玄冰宫拒男修');
ok(canJoinSect('youming', { realmIndex: 2, evil: false }).ok === false, 'canJoinSect 幽冥教需邪修');

/* ---------- GameStore 领域混入完整性 ---------- */
const store = new GameStore();
const expected = [
  // skills
  'grantSkill', '_learnSkill', '_learnTalent', 'registerCustomSkill', 'addBuff',
  // items
  'addItem', 'useItem',
  // relations
  'upsertRelation',
  // mapMode
  'setMapLocation', 'advanceMapTime', 'travelTo', 'mapCultivate', 'mapRest', 'mapTrain',
  'mapStudy', 'mapQuest', 'mapGatherHerbs', 'addHerb', 'mapAlchemy', 'mapBreakthrough',
  // wealth
  'gainWealth', 'canPay', 'payWealth', 'exchangeSilverToSpirit', 'exchangeSpiritToSilver',
  'buyMapItem', 'sellMapItem', 'joinSect',
  // persistence
  'serializeDomains', 'serialize', 'deserializeDomains', 'deserialize', 'reset',
  // 内核
  'applyEffects', 'effStat', 'cultivationMult', 'combatMods', 'setEvent', 'pushHistory',
  'nextDay', 'setLocation', 'snapshot', 'subscribe', 'get', 'set'
];
for (const m of expected) ok(typeof store[m] === 'function', `GameStore 缺少方法 ${m}`);

/* ---------- 领域方法行为冒烟 ---------- */
store.state.mode = 'map';
store.setMapLocation({ world: 'qingyun' });
ok(store.state.mapLocation.world === 'qingyun', 'setMapLocation 生效');
ok(store.state.mapLocation.region === null, 'setMapLocation 默认补 null');

const before = store.state.items.length;
const item = store.addItem({ name: '聚气丹', rarity: 'jingliang', category: 'dan', usable: true });
ok(item && store.state.items.length === before + 1, 'addItem 生效');
ok(item.rarity === 'jingliang', 'addItem 保留合法品质');
const bad = store.addItem({ name: '异物', rarity: 'not_a_rarity', category: 'not_a_cat' });
ok(bad.rarity === 'pingfan' && bad.category === 'qiwu', 'addItem 非法品质/分类兜底');

store.upsertRelation({ name: '清虚子', identity: '青云门掌门', affinity: 50 });
ok(store.state.relations.length === 1, 'upsertRelation 新建');
store.upsertRelation({ name: '清虚子', affinity: 999 });
ok(store.state.relations.length === 1 && store.state.relations[0].affinity === 100, 'upsertRelation 合并且钳制上限100');

// 存档往返：分域序列化 → 反序列化
store.state.wealth = { silver: 100, spirit: 5 };
const files = store.serializeDomains();
const store2 = new GameStore();
ok(store2.deserializeDomains(files) === true, 'deserializeDomains 往返');
ok(store2.state.wealth.silver === 100 && store2.state.wealth.spirit === 5, '存档往返财富一致');
ok(store2.state.relations[0]?.name === '清虚子', '存档往返关系一致');

if (failed) { console.error(`\n${failed} 项失败`); process.exit(1); }
console.log('全部冒烟断言通过 ✓');
