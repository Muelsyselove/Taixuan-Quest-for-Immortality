// ============================================================
// 探索系统（V2.4）：10×10 格子地图
// 玩家初始在左下角，右上角为下一区域入口；不同格子效果不同
// （空地 / 战斗 / 采集 / 奇遇 / 云游商人），无法越过未清除的战斗格。
// 每进入一格消耗 2 个月；离开探索区域不记录位置，下次进入重置。
// ============================================================

export const EXPLORE_SIZE = 10;

// 格子类型定义（icon 为单字印）
export const EXPLORE_CELLS = {
  empty:    { key: 'empty',    label: '空地',   glyph: '·',  desc: '一览无余的空地' },
  battle:   { key: 'battle',   label: '妖邪盘踞', glyph: '战', desc: '妖邪盘踞于此，未清剿前无法越过' },
  gather:   { key: 'gather',   label: '灵草丛生', glyph: '草', desc: '灵草丛生，可采集草药' },
  qiyu:     { key: 'qiyu',     label: '奇遇',   glyph: '缘',  desc: '似有机缘隐现' },
  merchant: { key: 'merchant', label: '云游商人', glyph: '商', desc: '云游商人在此歇脚，售有坊市难寻的珍品' },
  exit:     { key: 'exit',     label: '区域入口', glyph: '门', desc: '通往下一区域的入口' }
};

// 各探索场景的格子配比（weight 越大越多）
const SCENE_PROFILES = {
  wild_mishi:  { battle: 0.16, gather: 0.22, qiyu: 0.13, merchant: 0.05, enemyPool: 'forest' },
  wild_duanya: { battle: 0.26, gather: 0.14, qiyu: 0.14, merchant: 0.05, enemyPool: 'cliff' },
  default:     { battle: 0.18, gather: 0.20, qiyu: 0.12, merchant: 0.05, enemyPool: 'forest' }
};

// 探索遭遇的妖邪（按场景风味，属性随玩家境界缩放）
const ENEMY_POOLS = {
  forest: [
    { name: '雾中行尸', desc: '迷雾中游荡的行尸，浑身湿漉漉的。', hp: 80, atk: 11, pdef: 4, mdef: 3, skills: [{ name: '腐爪', desc: '腐朽之爪', mult: 1.4 }] },
    { name: '迷魂藤妖', desc: '藏于雾中的藤妖，枝条悄无声息。', hp: 95, atk: 10, pdef: 5, mdef: 5, skills: [{ name: '缠枝', desc: '缠人枝条', mult: 1.35 }] },
    { name: '赤瞳狼妖', desc: '双目赤红的低阶妖兽，獠牙滴着涎水。', hp: 70, atk: 12, pdef: 3, mdef: 2, skills: [{ name: '裂爪', desc: '撕裂之击', mult: 1.4 }] }
  ],
  cliff: [
    { name: '怨魂剑修', desc: '陨落于此的剑修怨魂，剑意未散。', hp: 100, atk: 14, pdef: 5, mdef: 6, skills: [{ name: '怨剑', desc: '怨念之剑', mult: 1.5 }] },
    { name: '崖魈', desc: '攀附绝壁的凶兽，来去如风。', hp: 85, atk: 13, pdef: 4, mdef: 3, skills: [{ name: '扑杀', desc: '凌空扑杀', mult: 1.45 }] },
    { name: '黑风劫修', desc: '蒙面劫修，专修阴损的黑风掌。', hp: 90, atk: 12, pdef: 5, mdef: 4, skills: [{ name: '黑风掌', desc: '阴风蚀骨', mult: 1.5 }] }
  ]
};

/** 掷出该格的敌人（按玩家境界缩放） */
export function rollExploreEnemy(sceneId, realmIndex = 0) {
  const pool = ENEMY_POOLS[(SCENE_PROFILES[sceneId] ?? SCENE_PROFILES.default).enemyPool];
  const base = pool[Math.floor(Math.random() * pool.length)];
  const scale = 1 + realmIndex * 0.6;
  return {
    ...base,
    hp: Math.round(base.hp * scale),
    atk: Math.round(base.atk * scale),
    pdef: Math.round(base.pdef * scale),
    mdef: Math.round(base.mdef * scale)
  };
}

/**
 * 生成探索格子地图
 * @returns {{sceneId, size, cells, player, exit, done}}
 *   cells[y][x] = { type, cleared, visited }；坐标 x:0..9 左→右，y:0..9 上→下
 *   玩家初始左下角 (0,9)，出口右上角 (9,0)
 */
export function generateExploreGrid(sceneId) {
  const size = EXPLORE_SIZE;
  const profile = SCENE_PROFILES[sceneId] ?? SCENE_PROFILES.default;
  const cells = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: 'empty', cleared: false, visited: false }))
  );

  // 1) 先铺一条自左下至右上的可达走廊（只向右/向上，偶有迂回），走廊内不放战斗格
  const corridor = new Set();
  let cx = 0, cy = size - 1;
  corridor.add(`${cx},${cy}`);
  while (cx < size - 1 || cy > 0) {
    const moves = [];
    if (cx < size - 1) moves.push([cx + 1, cy]);
    if (cy > 0) moves.push([cx, cy - 1]);
    // 少量迂回：向左/向下走一步再折返，让路径更自然
    if (Math.random() < 0.18) {
      if (cx > 0 && !corridor.has(`${cx - 1},${cy}`)) moves.push([cx - 1, cy]);
      if (cy < size - 1 && !corridor.has(`${cx},${cy + 1}`)) moves.push([cx, cy + 1]);
    }
    const [nx, ny] = moves[Math.floor(Math.random() * moves.length)];
    cx = nx; cy = ny;
    corridor.add(`${cx},${cy}`);
  }

  // 2) 非走廊格按配比撒布事件
  let merchantCount = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (corridor.has(`${x},${y}`)) continue;
      const roll = Math.random();
      let acc = 0;
      let type = 'empty';
      for (const k of ['battle', 'gather', 'qiyu', 'merchant']) {
        acc += profile[k];
        if (roll < acc) { type = k; break; }
      }
      cells[y][x].type = type;
      if (type === 'merchant') merchantCount++;
    }
  }
  // 保证至少有一名云游商人
  if (!merchantCount) {
    const candidates = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (!corridor.has(`${x},${y}`) && cells[y][x].type !== 'battle') candidates.push([x, y]);
    }
    if (candidates.length) {
      const [mx, my] = candidates[Math.floor(Math.random() * candidates.length)];
      cells[my][mx].type = 'merchant';
    }
  }

  // 3) 出口与起点
  cells[0][size - 1].type = 'exit';
  cells[size - 1][0].type = 'empty';
  cells[size - 1][0].visited = true;

  return {
    sceneId,
    size,
    cells,
    player: { x: 0, y: size - 1 },
    exit: { x: size - 1, y: 0 },
    done: false
  };
}

/** 以玩家为中心揭开迷雾（自身与四邻格可见） */
export function revealAround(explore) {
  const { cells, player, size } = explore;
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = player.x + dx, y = player.y + dy;
    if (x >= 0 && x < size && y >= 0 && y < size) cells[y][x].visited = true;
  }
  // 出口始终可见（远行指引）
  cells[explore.exit.y][explore.exit.x].visited = true;
  return cells;
}

/** 判断格子是否可通行（战斗格未清除不可越过） */
export function isCellPassable(cell) {
  return cell.type !== 'battle' || cell.cleared;
}
