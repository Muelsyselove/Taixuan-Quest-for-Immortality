// ============================================================
// 地图数据 · NPC 数据
// 功能型NPC：function 对应 FACILITY_TYPES 的 key
// 非功能NPC：function 为 null，仅提供对话
// ============================================================

export const NPCS = {
  /* ---------- 青云门（混元·正道领袖） ---------- */
  qy_zhangmen: {
    id: 'qy_zhangmen', name: '清虚子', identity: '青云门掌门', gender: 'male',
    relation: '宗门领袖', affinity: 50, function: 'menpai',
    personality: '威严持重，心怀天下', likes: '有潜力的后辈、宗门荣誉',
    sect: 'qingyun'
  },
  qy_danshi: {
    id: 'qy_danshi', name: '白芷', identity: '炼丹长老', gender: 'female',
    relation: '丹道前辈', affinity: 30, function: 'liandan',
    personality: '温柔细致，醉心丹道', likes: '珍稀草药、丹方古籍',
    sect: 'qingyun'
  },
  qy_shiku: {
    id: 'qy_shiku', name: '石敢当', identity: '传功长老', gender: 'male',
    relation: '传功恩师', affinity: 40, function: 'liangong',
    personality: '豪爽直率，好为人师', likes: '勤奋弟子、切磋比试',
    sect: 'qingyun'
  },
  qy_jishi: {
    id: 'qy_jishi', name: '小桃', identity: '膳房杂役', gender: 'female',
    relation: '杂役', affinity: 10, function: null,
    personality: '活泼好动，消息灵通', likes: '美食、八卦',
    sect: 'qingyun'
  },

  /* ---------- 焚天谷（火系·炼器） ---------- */
  ft_zhangmen: {
    id: 'ft_zhangmen', name: '炎无极', identity: '焚天谷主', gender: 'male',
    relation: '宗门领袖', affinity: 30, function: 'menpai',
    personality: '暴躁易怒，崇尚力量', likes: '强者、极品炼器材料',
    sect: 'fentian'
  },
  ft_qishi: {
    id: 'ft_qishi', name: '欧冶子', identity: '炼器大师', gender: 'male',
    relation: '器道宗师', affinity: 40, function: 'liangong',
    personality: '沉默寡言，专注铸剑', likes: '稀有矿石、好剑',
    sect: 'fentian'
  },
  ft_huoling: {
    id: 'ft_huoling', name: '火灵儿', identity: '内门弟子', gender: 'female',
    relation: '同门', affinity: 20, function: 'leitai',
    personality: '火辣热情，争强好胜', likes: '比武、火焰法术',
    sect: 'fentian'
  },

  /* ---------- 玄冰宫（水系·法修） ---------- */
  xb_gongzhu: {
    id: 'xb_gongzhu', name: '寒月仙子', identity: '玄冰宫主', gender: 'female',
    relation: '宗门领袖', affinity: 25, function: 'menpai',
    personality: '冷若冰霜，不苟言笑', likes: '冰系功法、清净之地',
    sect: 'xuanbing'
  },
  xb_shuijing: {
    id: 'xb_shuijing', name: '水镜先生', identity: '传功长老', gender: 'male',
    relation: '阵法大师', affinity: 35, function: 'cangshu',
    personality: '博学多才，喜欢考校后辈', likes: '阵法典籍、聪慧弟子',
    sect: 'xuanbing'
  },

  /* ---------- 万兽山（土系·御兽） ---------- */
  ws_shanzhu: {
    id: 'ws_shanzhu', name: '兽皇', identity: '万兽山主', gender: 'male',
    relation: '宗门领袖', affinity: 35, function: 'menpai',
    personality: '粗犷豪迈，与兽为友', likes: '强大妖兽、美酒',
    sect: 'wanshou'
  },
  ws_yushou: {
    id: 'ws_yushou', name: '灵珊', identity: '御兽长老', gender: 'female',
    relation: '御兽导师', affinity: 30, function: 'liangong',
    personality: '温柔善良，爱护灵兽', likes: '可爱灵兽、自然',
    sect: 'wanshou'
  },

  /* ---------- 幽冥教（阴系·魂修·邪道） ---------- */
  ym_jiaozhu: {
    id: 'ym_jiaozhu', name: '幽冥教主', identity: '幽冥教主', gender: 'male',
    relation: '魔道巨擘', affinity: 0, function: 'menpai',
    personality: '阴鸷狠辣，野心勃勃', likes: '生魂、力量',
    sect: 'youming'
  },
  ym_guiyi: {
    id: 'ym_guiyi', name: '鬼医', identity: '幽冥教长老', gender: 'male',
    relation: '邪修', affinity: 10, function: 'liandan',
    personality: '古怪孤僻，医术通神', likes: '尸体、罕见毒物',
    sect: 'youming'
  },

  /* ---------- 天剑宗（金系·剑修） ---------- */
  tj_jianzhu: {
    id: 'tj_jianzhu', name: '剑二十三', identity: '天剑宗主', gender: 'male',
    relation: '剑道魁首', affinity: 45, function: 'menpai',
    personality: '孤高绝世，剑心通明', likes: '剑道、挑战强者',
    sect: 'tianjian'
  },
  tj_jianchi: {
    id: 'tj_jianchi', name: '剑痴', identity: '执法长老', gender: 'male',
    relation: '执法者', affinity: 20, function: 'leitai',
    personality: '嗜剑如命，不近人情', likes: '名剑、剑法对决',
    sect: 'tianjian'
  },

  /* ---------- 妙木宗（木系·丹修） ---------- */
  mm_zongzhu: {
    id: 'mm_zongzhu', name: '青帝', identity: '妙木宗主', gender: 'male',
    relation: '丹道至尊', affinity: 40, function: 'menpai',
    personality: '慈祥和蔼，悲天悯人', likes: '救治病患、培育灵植',
    sect: 'miaomu'
  },
  mm_yaotong: {
    id: 'mm_yaotong', name: '茯苓', identity: '药童', gender: 'female',
    relation: '药童', affinity: 25, function: 'danfang',
    personality: '天真烂漫，辨识百草', likes: '草药、小动物',
    sect: 'miaomu'
  },

  /* ---------- 雷神殿（阳系·雷修） ---------- */
  ls_dianzhu: {
    id: 'ls_dianzhu', name: '雷震子', identity: '雷神殿主', gender: 'male',
    relation: '雷道至尊', affinity: 35, function: 'menpai',
    personality: '刚正不阿，嫉恶如仇', likes: '正义、雷法',
    sect: 'leishen'
  },
  ls_leiying: {
    id: 'ls_leiying', name: '雷影', identity: '首席弟子', gender: 'male',
    relation: '首席', affinity: 30, function: 'leitai',
    personality: '高傲自信，雷厉风行', likes: '速度、战斗',
    sect: 'leishen'
  },

  /* ---------- 散修聚集（无宗门） ---------- */
  ss_yaoren: {
    id: 'ss_yaoren', name: '药人', identity: '流浪药师', gender: 'male',
    relation: '游方医者', affinity: 15, function: 'danfang',
    personality: '神秘莫测，亦正亦邪', likes: '珍稀药材、交换',
    sect: null
  },
  ss_kuanggong: {
    id: 'ss_kuanggong', name: '狂刀', identity: '散修刀客', gender: 'male',
    relation: '散修', affinity: 20, function: 'leitai',
    personality: '狂放不羁，刀法狂野', likes: '美酒、强敌',
    sect: null
  },
  ss_baixiao: {
    id: 'ss_baixiao', name: '百晓生', identity: '情报贩子', gender: 'male',
    relation: '消息灵通人士', affinity: 10, function: 'fangshi',
    personality: '圆滑世故，见钱眼开', likes: '银元、秘密',
    sect: null
  }
};
