// ============================================================
// 地图模式数据层（聚合入口）：大世界 → 宗门/区域 → 场景 三级结构
// 所有数据在 mapData/ 目录下按域注册，此处统一转发并提供查询工具
// 组件只读取不硬编码
//
// 层级：
//   world   大世界地图节点（区域/宗门入口）      → mapData/maps.js
//   region  二级地图（点击大世界节点进入）       → mapData/maps.js
//   scene   场景（三级，可含NPC、功能交互）      → mapData/scenes.js
//
// NPC 字段：name/identity/gender/relation/affinity/function/personality/likes
// 宗门字段：name/style(修炼倾向)/scenes(场景列表)/facilities(功能设施)
// ============================================================

import { SECT_STYLES, FACILITY_TYPES } from './mapData/styles.js';
import { NPCS } from './mapData/npcs.js';
import { SCENES } from './mapData/scenes.js';
import { SECTS } from './mapData/sects.js';
import { WORLD_MAP, REGION_MAPS } from './mapData/maps.js';

export { SECT_STYLES, FACILITY_TYPES, NPCS, SCENES, SECTS, WORLD_MAP, REGION_MAPS };

/* ==================== 查询工具函数 ==================== */

export function getSect(id) { return SECTS[id]; }
export function getScene(id) { return SCENES[id]; }
export function getNPC(id) { return NPCS[id]; }
export function getRegion(id) { return REGION_MAPS[id]; }

export function getScenesBySect(sectId) {
  const sect = SECTS[sectId];
  return sect ? sect.scenes.map(id => SCENES[id]).filter(Boolean) : [];
}

export function getNPCsByScene(sceneId) {
  const scene = SCENES[sceneId];
  return scene ? scene.npcs.map(id => NPCS[id]).filter(Boolean) : [];
}

export function getFacilitiesByScene(sceneId) {
  const scene = SCENES[sceneId];
  return scene ? scene.facilities.map(key => ({ key, ...FACILITY_TYPES[key] })) : [];
}

/** 获取宗门风格标签 */
export function getSectStyleLabel(styleKey) {
  return SECT_STYLES[styleKey] || SECT_STYLES.hunyuan;
}

/** 检查玩家是否满足加入宗门条件 */
export function canJoinSect(sectId, playerState) {
  const sect = SECTS[sectId];
  if (!sect) return { ok: false, reason: '宗门不存在' };
  const req = sect.requirements;
  if (playerState.realmIndex < req.realm) return { ok: false, reason: `需达到${['炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'][req.realm]}期` };
  if (req.affinity > 0 && (playerState.affinity?.[sectId] ?? 0) < req.affinity) return { ok: false, reason: `需好感度${req.affinity}以上` };
  if (req.gender && playerState.gender !== req.gender) return { ok: false, reason: '性别不符' };
  if (req.evil && !playerState.evil) return { ok: false, reason: '需为邪修' };
  if (req.righteous && playerState.evil) return { ok: false, reason: '邪修不可入' };
  return { ok: true };
}
