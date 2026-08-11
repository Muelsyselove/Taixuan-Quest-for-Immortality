// ============================================================
// 地图数据 · 宗门数据（8大宗门）
// ============================================================

export const SECTS = {
  qingyun: {
    id: 'qingyun', name: '青云门', style: 'hunyuan',
    desc: '太玄大陆正道领袖，五行兼修，底蕴深厚。',
    scenes: ['qy_dadian', 'qy_liandan', 'qy_liangong', 'qy_houyuan', 'qy_biguan'],
    requirements: { realm: 0, affinity: 0 }, // 加入条件
    benefits: { cultivationBonus: 0.1, alchemyBonus: 0.1 }
  },
  fentian: {
    id: 'fentian', name: '焚天谷', style: 'huo',
    desc: '火系炼器宗门，以地火铸器，战力强悍。',
    scenes: ['ft_ronglu', 'ft_huoyan'],
    requirements: { realm: 1, affinity: 20 },
    benefits: { atkBonus: 0.15, forgeBonus: 0.2 }
  },
  xuanbing: {
    id: 'xuanbing', name: '玄冰宫', style: 'shui',
    desc: '水系法修圣地，冰系功法独步天下。',
    scenes: ['xb_bingdian', 'xb_cangshu'],
    requirements: { realm: 1, affinity: 20, gender: 'female' }, // 只收女修
    benefits: { mdefBonus: 0.15, waterSkillBonus: 0.2 }
  },
  wanshou: {
    id: 'wanshou', name: '万兽山', style: 'tu',
    desc: '御兽宗门，可与灵兽签订契约共同战斗。',
    scenes: ['ws_shouyuan'],
    requirements: { realm: 1, affinity: 15 },
    benefits: { summonBonus: 0.2, beastAffinity: true }
  },
  youming: {
    id: 'youming', name: '幽冥教', style: 'yin',
    desc: '魔道巨擘，魂修鬼道，行事诡秘狠辣。',
    scenes: ['ym_mingdian', 'ym_guihuo'],
    requirements: { realm: 2, affinity: -20, evil: true }, // 邪修宗门
    benefits: { darkSkillBonus: 0.25, soulHarvest: true }
  },
  tianjian: {
    id: 'tianjian', name: '天剑宗', style: 'jin',
    desc: '剑修圣地，一剑破万法，攻伐无双。',
    scenes: ['tj_jianchi'],
    requirements: { realm: 2, affinity: 30, swordSkill: true },
    benefits: { swordSkillBonus: 0.25, critBonus: 0.1 }
  },
  miaomu: {
    id: 'miaomu', name: '妙木宗', style: 'mu',
    desc: '丹修圣地，医术通神，济世救人。',
    scenes: ['mm_yaowang'],
    requirements: { realm: 1, affinity: 25 },
    benefits: { alchemyBonus: 0.25, healBonus: 0.2 }
  },
  leishen: {
    id: 'leishen', name: '雷神殿', style: 'yang',
    desc: '雷修圣地，代天刑罚，诛邪灭魔。',
    scenes: ['ls_leidian'],
    requirements: { realm: 2, affinity: 25, righteous: true },
    benefits: { thunderSkillBonus: 0.25, speedBonus: 0.15 }
  }
};
