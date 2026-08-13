// 冒烟验证：拆分后的模块完整性与数据引用闭环（不依赖 Electron/DOM）
import { SECT_STYLES, FACILITY_TYPES, NPCS, SCENES, SECTS, WORLD_MAP, REGION_MAPS,
         getSect, getScene, getNPC, getRegion, getScenesBySect, getNPCsByScene,
         getFacilitiesByScene, getSectStyleLabel, canJoinSect } from './renderer/src/core/mapData.js';
import { GameStore } from './renderer/src/core/store.js';
import { advanceTime } from './renderer/src/core/time.js';
import { CombatEngine } from './renderer/src/core/combat.js';

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
ok(canJoinSect('tianjian', { realmIndex: 2, affinity: { tianjian: 30 }, activeSkills: [] }).ok === false, 'canJoinSect 天剑宗需金系剑法');
ok(canJoinSect('tianjian', { realmIndex: 2, affinity: { tianjian: 30 }, activeSkills: [{ root: 'jin' }] }).ok === true, 'canJoinSect 金系剑法可入天剑宗');

/* ---------- time：年月换算 ---------- */
{
  const t = advanceTime({ year: 1, month: 1 }, 0.5);
  ok(t.year === 1 && t.month === 2, 'advanceTime 分数月取整');
  const t2 = advanceTime({ year: 1, month: 12 }, 1);
  ok(t2.year === 2 && t2.month === 1, 'advanceTime 跨年进位');
  const t3 = advanceTime({ year: 3, month: 6 }, -5);
  ok(t3.year === 3 && t3.month === 6, 'advanceTime 负数月钳制为 0');
}

/* ---------- GameStore 领域混入完整性 ---------- */
const store = new GameStore();
const expected = [
  // skills
  'grantSkill', '_learnSkill', '_learnTalent', 'registerCustomSkill', 'addBuff', '_clampMods',
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

/* ---------- applyEffects：上限类效果补偿当前血/蓝 ---------- */
{
  const st = new GameStore();
  st.applyEffects({ maxHp: 20, maxMp: 10 });
  ok(st.state.maxHp === 120 && st.state.hp === 120, 'maxHp 上限提升并补偿当前生命');
  ok(st.state.maxMp === 70 && st.state.mp === 70, 'maxMp 上限提升并补偿当前法力');
}

/* ---------- applyEffects：非战斗致死原地轮回；切磋锁 1 血 ---------- */
{
  const st = new GameStore();
  st.set({ cultivation: 50 });
  st.applyEffects({ hp: -9999 });
  ok(st.state.hp === Math.round(st.effStat('maxHp') * 0.3), '非战斗致死 hp 回复三成');
  ok(st.state.cultivation === 35, '非战斗致死修为折损七成');
  ok(st.state.history.at(-1)?.kind === 'death', '非战斗致死记入史册');

  const spar = new GameStore();
  spar.state.combat = { spar: true };
  spar.applyEffects({ hp: -9999 });
  ok(spar.state.hp === 1, '切磋点到为止 hp 锁 1');
}

/* ---------- applyDeathPenalty：战斗落败统一结算 ---------- */
{
  const st = new GameStore();
  st.set({ hp: 0, cultivation: 100 });
  st.applyDeathPenalty();
  ok(st.state.hp === Math.round(st.effStat('maxHp') * 0.3), 'applyDeathPenalty hp 三成');
  ok(st.state.cultivation === 70, 'applyDeathPenalty 修为七成');
}

/* ---------- 史册截尾 ---------- */
{
  const st = new GameStore();
  for (let i = 0; i < 520; i++) st.pushHistory(`条目${i}`);
  ok(st.state.history.length === GameStore.HISTORY_MAX, '史册截尾至上限');
  ok(st.state.history.at(-1)?.text === '条目519', '史册截尾保留最新条目');
}

/* ---------- mods 钳制：比例 ±1 / 固定 ±50 ---------- */
{
  const st = new GameStore();
  st.grantSkill({ type: 'talent', name: '逆天悟性', mods: { crit: 5, atk: 999, cultivationPct: -9, hpRegen: 3 } });
  const t = st.state.talents.find(x => x.name === '逆天悟性');
  ok(t?.mods.crit === 1 && t?.mods.cultivationPct === -1, '天赋比例类 mods 钳制 ±1');
  ok(t?.mods.atk === 50 && t?.mods.hpRegen === 3, '天赋固定值 mods 钳制 ±50');

  st.registerCustomSkill({ type: 'passive', name: '蚀日心法', mods: { dodge: 8, mdef: -300 } });
  const sk = st.state.passiveSkills.find(x => x.name === '蚀日心法');
  ok(sk?.mods.dodge === 1 && sk?.mods.mdef === -50, '自定义被动 mods 钳制');

  st.addBuff({ name: '狂血', mods: { atkPct: 7 } });
  ok(st.state.buffs.find(b => b.name === '狂血')?.mods.atkPct === 1, '增益 mods 钳制');
}

/* ---------- mapBreakthrough：突破丹须匹配目标境界 ---------- */
{
  const st = new GameStore();
  st.state.mode = 'map';
  st.set({ cultivation: st.state.cultivationCap }); // 修为圆满
  const wrong = st.addItem({ name: '金丹', rarity: 'shishi', category: 'pill', breakthrough: 2, quality: 3 });
  const r1 = st.mapBreakthrough(wrong.id);
  ok(r1.ok === false && r1.reason.includes('不符'), '突破丹与境界不符被拒绝');
  ok(st.state.items.some(i => i.id === wrong.id), '被拒丹药保留背包');
  const r2 = st.mapBreakthrough('it-nonexist');
  ok(r2.ok === false, '不存在的丹药 id 被拒');
  const right = st.addItem({ name: '筑基丹', rarity: 'jingliang', category: 'pill', breakthrough: 1, quality: 3 });
  const r3 = st.mapBreakthrough(right.id);
  ok(r3.ok === true, '匹配突破丹进入突破流程');
  ok(!st.state.items.some(i => i.id === right.id), '服下丹药即消耗');
}

/* ---------- mapAlchemy：自炼突破丹不可售且丹成即入囊 ---------- */
{
  const st = new GameStore();
  st.state.mode = 'map';
  let pill = null;
  for (let i = 0; i < 40 && !pill; i++) {
    st.addHerb('ziyun', 2);
    st.addHerb('jiuyang', 2);
    const r = st.mapAlchemy('zhuji');
    if (r?.success) pill = st.state.items.find(it => it.name === '筑基丹');
  }
  ok(!!pill, '炼丹 40 次内应有成功');
  if (pill) {
    ok(pill.price === null, '自炼突破丹不可售');
    ok(pill.breakthrough === 1 && pill.usable === false, '突破丹字段完整');
  }
}

/* ---------- 战斗引擎：行动前置校验 + 回合流转 + 落败轮回 ---------- */
{
  const aiStub = { decideEnemyAction: async () => ({ action: 'attack' }) };
  const st = new GameStore();
  const ce = new CombatEngine(st, aiStub);
  ce.start({ enemy: { name: '试剑木人', hp: 30, atk: 3, pdef: 0, mdef: 0 }, playerFirst: true });
  ok(st.state.combat?.phase === 'player', '战斗创建进入玩家回合');

  // 前置校验：蓝耗不足直接驳回，不触发回合开始结算（mp 不变、phase 不变）
  const mpBefore = st.state.mp;
  await ce.playerAction({ type: 'skill', skill: { name: '空冥斩', cost: 999, mult: 2 } });
  ok(st.state.mp === mpBefore && st.state.combat?.phase === 'player', '法力不足技能驳回且不消耗回合');
  // 不存在的物品 id 驳回
  await ce.playerAction({ type: 'item', itemId: 'it-nonexist' });
  ok(st.state.combat?.phase === 'player', '无效物品行动驳回');

  for (let i = 0; i < 60 && st.state.combat?.phase === 'player'; i++) {
    await ce.playerAction({ type: 'attack' });
  }
  ok(st.state.combat?.phase === 'over' && st.state.combat?.result === 'win', '弱敌战斗可终结并获胜');

  // 落败：敌方先手高攻秒杀 → applyDeathPenalty 轮回结算（修为须低于上限，避免触发对话模式自动突破）
  const st2 = new GameStore();
  const ce2 = new CombatEngine(st2, aiStub);
  st2.set({ hp: 5, cultivation: 50 });
  ce2.start({ enemy: { name: '盖世魔头', hp: 9999, atk: 999, pdef: 999, mdef: 999 }, playerFirst: false });
  await new Promise(r => setTimeout(r, 20)); // start 内 _enemyTurn 未 await，让出事件循环
  ok(st2.state.combat?.result === 'lose', '不敌高攻敌人判负');
  ok(st2.state.hp === Math.round(st2.effStat('maxHp') * 0.3), '战斗落败 hp 回复三成');
  ok(st2.state.cultivation === 35, '战斗落败修为折损七成');
}

if (failed) { console.error(`\n${failed} 项失败`); process.exit(1); }
console.log('全部冒烟断言通过 ✓');
