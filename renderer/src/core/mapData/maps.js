// ============================================================
// 地图数据 · 地图结构定义
// 层级：
//   world   大世界地图节点（区域/宗门入口）
//   region  二级地图（点击大世界节点进入）
//   scene   场景（三级，见 scenes.js）
// ============================================================

/* ==================== 大世界地图（一级地图） ==================== */

export const WORLD_MAP = {
  minZoom: 0.25,
  maxZoom: 3,
  nodes: [
    // 宗门节点
    { id: 'qingyun',  name: '青云门',   x: 200, y: 150, kind: 'sect', sect: 'qingyun', region: 'central' },
    { id: 'fentian',  name: '焚天谷',   x: 800, y: 500, kind: 'sect', sect: 'fentian', region: 'south' },
    { id: 'xuanbing', name: '玄冰宫',   x: 150, y: 500, kind: 'sect', sect: 'xuanbing', region: 'north' },
    { id: 'wanshou',  name: '万兽山',   x: 600, y: 300, kind: 'sect', sect: 'wanshou', region: 'east' },
    { id: 'youming',  name: '幽冥教',   x: 850, y: 200, kind: 'danger', sect: 'youming', region: 'dark' },
    { id: 'tianjian', name: '天剑宗',   x: 400, y: 100, kind: 'sect', sect: 'tianjian', region: 'west' },
    { id: 'miaomu',   name: '妙木宗',   x: 300, y: 550, kind: 'sect', sect: 'miaomu', region: 'south' },
    { id: 'leishen',  name: '雷神殿',   x: 700, y: 80,  kind: 'sect', sect: 'leishen', region: 'sky' },
    // 野外节点
    { id: 'wild_fangshi', name: '散修坊市', x: 500, y: 400, kind: 'city', region: 'central' },
    { id: 'wild_mishi',   name: '迷雾森林', x: 100, y: 300, kind: 'wild', region: 'west' },
    { id: 'wild_duanya',  name: '断魂崖',   x: 900, y: 350, kind: 'danger', region: 'east' }
  ],
  edges: [
    ['qingyun', 'tianjian'], ['qingyun', 'wild_fangshi'], ['qingyun', 'miaomu'],
    ['tianjian', 'leishen'], ['leishen', 'youming'], ['youming', 'wild_duanya'],
    ['wild_duanya', 'fentian'], ['fentian', 'wild_fangshi'], ['wild_fangshi', 'wanshou'],
    ['wanshou', 'wild_mishi'], ['wild_mishi', 'xuanbing'], ['xuanbing', 'miaomu'],
    ['wanshou', 'youming']
  ]
};

/* ==================== 二级地图（宗门/区域内部） ==================== */

export const REGION_MAPS = {
  qingyun: {
    id: 'qingyun', name: '青云门', type: 'sect',
    desc: '正道领袖青云门，仙气缭绕，灵峰环绕。',
    scenes: ['qy_dadian', 'qy_liandan', 'qy_liangong', 'qy_houyuan', 'qy_biguan'],
    // 场景在大地图上的相对位置（用于二级地图展示）
    positions: {
      qy_dadian:  { x: 400, y: 200 },
      qy_liandan: { x: 200, y: 350 },
      qy_liangong:{ x: 600, y: 350 },
      qy_houyuan: { x: 300, y: 500 },
      qy_biguan:  { x: 500, y: 500 }
    }
  },
  fentian: {
    id: 'fentian', name: '焚天谷', type: 'sect',
    desc: '地火涌动的炼器圣地。',
    scenes: ['ft_ronglu', 'ft_huoyan'],
    positions: {
      ft_ronglu: { x: 300, y: 300 },
      ft_huoyan: { x: 500, y: 400 }
    }
  },
  xuanbing: {
    id: 'xuanbing', name: '玄冰宫', type: 'sect',
    desc: '冰天雪地中的水晶宫殿。',
    scenes: ['xb_bingdian', 'xb_cangshu'],
    positions: {
      xb_bingdian: { x: 400, y: 250 },
      xb_cangshu: { x: 300, y: 450 }
    }
  },
  wanshou: {
    id: 'wanshou', name: '万兽山', type: 'sect',
    desc: '灵兽汇聚的山林。',
    scenes: ['ws_shouyuan'],
    positions: {
      ws_shouyuan: { x: 400, y: 350 }
    }
  },
  youming: {
    id: 'youming', name: '幽冥教', type: 'sect',
    desc: '阴森恐怖的魔教总坛。',
    scenes: ['ym_mingdian', 'ym_guihuo'],
    positions: {
      ym_mingdian: { x: 400, y: 250 },
      ym_guihuo: { x: 300, y: 450 }
    }
  },
  tianjian: {
    id: 'tianjian', name: '天剑宗', type: 'sect',
    desc: '剑气冲霄的剑修圣地。',
    scenes: ['tj_jianchi'],
    positions: {
      tj_jianchi: { x: 400, y: 350 }
    }
  },
  miaomu: {
    id: 'miaomu', name: '妙木宗', type: 'sect',
    desc: '药香四溢的丹修圣地。',
    scenes: ['mm_yaowang'],
    positions: {
      mm_yaowang: { x: 400, y: 350 }
    }
  },
  leishen: {
    id: 'leishen', name: '雷神殿', type: 'sect',
    desc: '雷霆环绕的雷修圣地。',
    scenes: ['ls_leidian'],
    positions: {
      ls_leidian: { x: 400, y: 350 }
    }
  },
  wild_fangshi: {
    id: 'wild_fangshi', name: '散修坊市', type: 'city',
    desc: '散修聚集的自由交易之地。',
    scenes: ['wild_fangshi'],
    positions: {
      wild_fangshi: { x: 400, y: 350 }
    }
  },
  wild_mishi: {
    id: 'wild_mishi', name: '迷雾森林', type: 'wild',
    desc: '危机与机缘并存的迷雾森林。',
    scenes: ['wild_mishi'],
    positions: {
      wild_mishi: { x: 400, y: 350 }
    }
  },
  wild_duanya: {
    id: 'wild_duanya', name: '断魂崖', type: 'wild',
    desc: '险峻的断崖，常有修士陨落。',
    scenes: ['wild_duanya'],
    positions: {
      wild_duanya: { x: 400, y: 350 }
    }
  }
};
