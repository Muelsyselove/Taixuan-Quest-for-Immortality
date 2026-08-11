// ============================================================
// 地图数据 · 场景数据
// 每个场景可含：NPC列表、可交互功能、场景描述、场景类型
// ============================================================

export const SCENES = {
  /* ---------- 青云门场景 ---------- */
  qy_dadian: {
    id: 'qy_dadian', name: '青云大殿', type: 'hall',
    desc: '青云门主殿，庄严肃穆，掌门清虚子在此处理宗门事务。',
    npcs: ['qy_zhangmen'],
    facilities: ['menpai'],
    bg: 'hall_gold'
  },
  qy_liandan: {
    id: 'qy_liandan', name: '炼丹房', type: 'workshop',
    desc: '药香四溢的丹房，白芷长老常年在此炼丹。',
    npcs: ['qy_danshi'],
    facilities: ['liandan', 'danfang'],
    bg: 'workshop_green'
  },
  qy_liangong: {
    id: 'qy_liangong', name: '演武场', type: 'training',
    desc: '宽阔的演武场，石敢当长老在此指导弟子修炼。',
    npcs: ['qy_shiku'],
    facilities: ['liangong', 'leitai'],
    bg: 'field_earth'
  },
  qy_houyuan: {
    id: 'qy_houyuan', name: '后山药园', type: 'garden',
    desc: '种植着各种灵药的后山，小桃常来此玩耍。',
    npcs: ['qy_jishi'],
    facilities: ['qiju'],
    bg: 'garden_green'
  },
  qy_biguan: {
    id: 'qy_biguan', name: '闭关室', type: 'cave',
    desc: '幽静的闭关石室，灵气浓郁，适合闭关突破。',
    npcs: [],
    facilities: ['biguan'],
    bg: 'cave_dark'
  },

  /* ---------- 焚天谷场景 ---------- */
  ft_ronglu: {
    id: 'ft_ronglu', name: '熔炉殿', type: 'workshop',
    desc: '烈焰熊熊的炼器之地，欧冶子在此铸造神兵。',
    npcs: ['ft_zhangmen', 'ft_qishi'],
    facilities: ['menpai', 'liangong'],
    bg: 'workshop_fire'
  },
  ft_huoyan: {
    id: 'ft_huoyan', name: '火焰窟', type: 'cave',
    desc: '地火涌动的洞窟，火灵儿常在此修炼火系法术。',
    npcs: ['ft_huoling'],
    facilities: ['biguan', 'leitai'],
    bg: 'cave_fire'
  },

  /* ---------- 玄冰宫场景 ---------- */
  xb_bingdian: {
    id: 'xb_bingdian', name: '冰晶大殿', type: 'hall',
    desc: '晶莹剔透的冰宫，寒月仙子高坐冰莲之上。',
    npcs: ['xb_gongzhu'],
    facilities: ['menpai'],
    bg: 'hall_ice'
  },
  xb_cangshu: {
    id: 'xb_cangshu', name: '藏经冰窟', type: 'library',
    desc: '收藏着无数水系功法的冰窟，水镜先生在此整理典籍。',
    npcs: ['xb_shuijing'],
    facilities: ['cangshu'],
    bg: 'cave_ice'
  },

  /* ---------- 万兽山场景 ---------- */
  ws_shouyuan: {
    id: 'ws_shouyuan', name: '万兽园', type: 'garden',
    desc: '各种灵兽栖息的山林，兽皇与灵珊在此照料灵兽。',
    npcs: ['ws_shanzhu', 'ws_yushou'],
    facilities: ['menpai', 'liangong'],
    bg: 'garden_beast'
  },

  /* ---------- 幽冥教场景 ---------- */
  ym_mingdian: {
    id: 'ym_mingdian', name: '幽冥大殿', type: 'hall',
    desc: '阴森恐怖的魔教总坛，幽冥教主在此修炼魔功。',
    npcs: ['ym_jiaozhu'],
    facilities: ['menpai'],
    bg: 'hall_dark'
  },
  ym_guihuo: {
    id: 'ym_guihuo', name: '鬼火窟', type: 'cave',
    desc: '鬼火幽幽的洞窟，鬼医在此研究毒术与医术。',
    npcs: ['ym_guiyi'],
    facilities: ['liandan', 'cangshu'],
    bg: 'cave_ghost'
  },

  /* ---------- 天剑宗场景 ---------- */
  tj_jianchi: {
    id: 'tj_jianchi', name: '剑池', type: 'training',
    desc: '插满古剑的剑池，剑二十三与剑痴在此论剑。',
    npcs: ['tj_jianzhu', 'tj_jianchi'],
    facilities: ['menpai', 'leitai', 'liangong'],
    bg: 'field_sword'
  },

  /* ---------- 妙木宗场景 ---------- */
  mm_yaowang: {
    id: 'mm_yaowang', name: '药王殿', type: 'hall',
    desc: '供奉药王的殿堂，青帝在此传授丹道。',
    npcs: ['mm_zongzhu', 'mm_yaotong'],
    facilities: ['menpai', 'liandan', 'danfang'],
    bg: 'hall_wood'
  },

  /* ---------- 雷神殿场景 ---------- */
  ls_leidian: {
    id: 'ls_leidian', name: '雷池', type: 'training',
    desc: '雷霆环绕的圣池，雷震子与雷影在此修炼雷法。',
    npcs: ['ls_dianzhu', 'ls_leiying'],
    facilities: ['menpai', 'biguan', 'leitai'],
    bg: 'field_thunder'
  },

  /* ---------- 野外/散修场景 ---------- */
  wild_fangshi: {
    id: 'wild_fangshi', name: '散修坊市', type: 'market',
    desc: '散修聚集的交易场所，三教九流汇聚于此。',
    npcs: ['ss_yaoren', 'ss_kuanggong', 'ss_baixiao'],
    facilities: ['fangshi', 'danfang', 'leitai'],
    bg: 'market_bustle'
  },
  wild_mishi: {
    id: 'wild_mishi', name: '迷雾森林', type: 'wild',
    desc: '常年被迷雾笼罩的森林，传说有上古传承。',
    npcs: [],
    facilities: [],
    bg: 'forest_mist'
  },
  wild_duanya: {
    id: 'wild_duanya', name: '断魂崖', type: 'wild',
    desc: '险峻的断崖，常有修士在此陨落，怨气冲天。',
    npcs: [],
    facilities: [],
    bg: 'cliff_danger'
  }
};
