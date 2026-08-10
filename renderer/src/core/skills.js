// ============================================================
// 技能层（Skill Layer）：预配置技能库
// 主动/被动技能不再由 AI 凭空生成，全部在此注册；
// AI 仅能在剧情需要时为当前存档注册专属技能（见 store.registerCustomSkill）。
//
// 主动技能字段：
//   name/desc/root/cost      名称/描写/属性(jin|mu|shui|huo|tu|wu=无属性)/耗蓝
//   mult                     直接伤害倍率（基于攻击）
//   healMult                 治疗倍率（基于攻击）
//   mpGain                   立即恢复法力
//   shieldLayers             次数盾层数（金系侧重）
//   barrierMult              屏障（血量盾）倍率，基于攻击（金系侧重）
//   buffs[]                  施加的状态：{ target:'self'|'enemy', name, turns,
//                              stackable?, maxStacks?, effects:[效果层参数] }
//                              burn/summon 效果可用 mult（施加时按施术者攻击快照为 value）
// 被动技能字段：
//   mods                     常驻加成：atk/pdef/mdef/maxHp/maxMp（固定值）、
//                            atkPct/pdefPct/mdefPct（比例）、crit/dodge/counterPct、
//                            hpRegen/mpRegen（战斗回合回复）、cultivationPct（修为加成）
//
// 各系侧重（在全面的同时有所侧重）：
//   金——次数盾/屏障/反伤；木——中毒/治疗/控制；水——增益/减益/化形闪避；
//   火——高额伤害/灼烧；土——召唤造物辅助；无——所有灵根皆可学习的通用术法
// ============================================================
import { STAT_LABELS } from './fx.js';

/* ---------------- 金 ---------------- */
const JIN_ACTIVE = [
  { name: '寸芒',       desc: '寸许金芒，迅疾无匹', cost: 8,  mult: 1.3 },
  { name: '金刃斩',     desc: '凝金气为刃，无坚不摧', cost: 10, mult: 1.6 },
  { name: '锵鸣退敌',   desc: '金铁锵鸣，声夺敌志', cost: 11, mult: 1.2, buffs: [{ target: 'enemy', name: '胆寒', turns: 2, effects: [{ key: 'statDown', stat: 'atk', pct: 0.2 }] }] },
  { name: '破甲剑气',   desc: '剑气凌冽，专破护体罡气', cost: 14, mult: 2.0, buffs: [{ target: 'enemy', name: '破甲', turns: 2, effects: [{ key: 'statDown', stat: 'pdef', pct: 0.15 }] }] },
  { name: '金戈铁马',   desc: '金戈交击，以杀止杀', cost: 13, mult: 1.4, buffs: [{ target: 'self', name: '反刃', turns: 2, effects: [{ key: 'counter', pct: 0.2 }] }] },
  { name: '折戟沉沙',   desc: '折戟之势，伤中蓄力', cost: 13, mult: 1.5, healMult: 0.3 },
  { name: '金虹贯日',   desc: '金虹一道，贯日而过', cost: 16, mult: 1.9, barrierMult: 0.5 },
  { name: '剑狱镇魂',   desc: '剑狱森然，镇魂慑魄', cost: 18, mult: 2.3 },
  { name: '万剑归宗',   desc: '万剑齐发，归于一心', cost: 22, mult: 2.6 },
  { name: '太白金精斩', desc: '太白星精所铸，斩金断玉', cost: 25, mult: 2.8, shieldLayers: 1 },
  { name: '庚金护体',   desc: '庚金之气绕体，刀枪难入', cost: 10, shieldLayers: 1, buffs: [{ target: 'self', name: '庚金罡气', turns: 2, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.2 }] }] },
  { name: '金钟罩',     desc: '金钟倒扣，万法不侵', cost: 12, shieldLayers: 2 },
  { name: '铁索横江',   desc: '铁索横空，拒之门外', cost: 12, shieldLayers: 1, barrierMult: 0.4 },
  { name: '琉璃金屏',   desc: '琉璃光屏，金碧交辉', cost: 14, barrierMult: 0.9, shieldLayers: 1 },
  { name: '不动明王障', desc: '明王法相，岿然不动', cost: 16, barrierMult: 1.2 },
  { name: '金城汤池',   desc: '金城汤池，固若金汤', cost: 18, barrierMult: 1.6 },
  { name: '反刃符',     desc: '符化反刃，伤敌者自伤', cost: 12, buffs: [{ target: 'self', name: '反刃', turns: 3, effects: [{ key: 'counter', pct: 0.3 }] }] },
  { name: '针锋相对',   desc: '针尖麦芒，寸步不让', cost: 15, buffs: [{ target: 'self', name: '锋芒反震', turns: 2, effects: [{ key: 'counter', pct: 0.5 }] }] },
  { name: '千锤百炼',   desc: '千锤百炼，肉身如铁', cost: 12, buffs: [{ target: 'self', name: '百炼之躯', turns: 3, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.3 }] }] },
  { name: '锋锐无匹',   desc: '锋芒毕露，锐不可当', cost: 12, buffs: [{ target: 'self', name: '锋锐', turns: 3, effects: [{ key: 'statUp', stat: 'atk', pct: 0.25 }] }] }
];
const JIN_PASSIVE = [
  { name: '金肌玉骨', desc: '肌肤如金，骨骼似玉，物防 +4', mods: { pdef: 4 } },
  { name: '剑心通明', desc: '剑心澄澈，攻击 +3', mods: { atk: 3 } },
  { name: '百战金身', desc: '百战不殆，生命上限 +18', mods: { maxHp: 18 } },
  { name: '反震诀',   desc: '劲力反震，常驻反伤 10%', mods: { counterPct: 0.10 } },
  { name: '钟灵毓秀', desc: '金声玉振，法防 +3', mods: { mdef: 3 } },
  { name: '庚金诀',   desc: '庚金内炼，攻击 +2、物防 +2', mods: { atk: 2, pdef: 2 } },
  { name: '铁壁功',   desc: '身如铁壁，物防 +3、生命上限 +8', mods: { pdef: 3, maxHp: 8 } },
  { name: '砺锋',     desc: '常砺其锋，会心率 +5%', mods: { crit: 0.05 } },
  { name: '金汤之固', desc: '气脉沉凝，战斗每回合回血 2', mods: { hpRegen: 2 } },
  { name: '藏锋守拙', desc: '大巧若拙，物防 +2、法防 +2', mods: { pdef: 2, mdef: 2 } }
];

/* ---------------- 木 ---------------- */
const MU_ACTIVE = [
  { name: '藤鞭挞',     desc: '灵藤如鞭，抽打敌身', cost: 9,  mult: 1.4 },
  { name: '万叶飞刀',   desc: '落叶皆成利刃', cost: 12, mult: 1.7 },
  { name: '落英缤纷',   desc: '落英如雨，柔美中暗藏杀机', cost: 13, mult: 1.8 },
  { name: '青藤缚',     desc: '青藤破土，缠敌伤敌', cost: 10, mult: 1.3, buffs: [{ target: 'enemy', name: '缠绕', turns: 1, effects: [{ key: 'stun' }] }] },
  { name: '绞杀藤',     desc: '毒藤绞杀，动弹不得', cost: 14, mult: 1.5, buffs: [{ target: 'enemy', name: '绞缠', turns: 1, effects: [{ key: 'stun' }] }] },
  { name: '一叶障目',   desc: '一叶蔽目，不见泰山', cost: 11, buffs: [{ target: 'enemy', name: '障目', turns: 1, effects: [{ key: 'stun' }] }] },
  { name: '腐心毒雾',   desc: '毒雾弥漫，侵心蚀骨', cost: 12, mult: 1.0, buffs: [{ target: 'enemy', name: '中毒', turns: 3, effects: [{ key: 'poison', pct: 0.05 }] }] },
  { name: '鸩羽千夜',   desc: '鸩羽之毒，夜夜噬心', cost: 15, mult: 1.2, buffs: [{ target: 'enemy', name: '鸩毒', turns: 3, stackable: true, maxStacks: 2, effects: [{ key: 'poison', pct: 0.06 }] }] },
  { name: '寄生种子',   desc: '种子寄生，暗吸精血', cost: 11, mult: 0.8, buffs: [{ target: 'enemy', name: '寄生', turns: 4, effects: [{ key: 'poison', pct: 0.04 }] }] },
  { name: '万毒噬心',   desc: '万毒齐发，噬心断肠', cost: 20, mult: 1.6, buffs: [{ target: 'enemy', name: '万毒', turns: 3, effects: [{ key: 'poison', pct: 0.08 }] }] },
  { name: '木魅之咒',   desc: '木魅低语，气力渐衰', cost: 13, buffs: [{ target: 'enemy', name: '衰弱', turns: 3, effects: [{ key: 'statDown', stat: 'atk', pct: 0.25 }] }] },
  { name: '枯木逢春',   desc: '枯木逢春，伤势尽愈', cost: 14, healMult: 1.5 },
  { name: '回春妙手',   desc: '妙手回春，生机绵绵', cost: 13, healMult: 1.2, buffs: [{ target: 'self', name: '回春', turns: 3, effects: [{ key: 'regen', pct: 0.04 }] }] },
  { name: '花雨愈',     desc: '花雨纷飞，疗愈八方', cost: 18, healMult: 2.0 },
  { name: '青帝长生诀', desc: '青帝敕令，长生不灭', cost: 25, healMult: 2.2, buffs: [{ target: 'self', name: '长生', turns: 3, effects: [{ key: 'regen', pct: 0.05 }] }] },
  { name: '生生不息',   desc: '木灵生生，绵延不息', cost: 16, buffs: [{ target: 'self', name: '不息', turns: 4, effects: [{ key: 'regen', pct: 0.06 }] }] },
  { name: '春风化雨',   desc: '春风化雨，润物无声', cost: 15, healMult: 1.0, buffs: [{ target: 'self', name: '化雨', turns: 2, effects: [{ key: 'regen', pct: 0.03 }] }] },
  { name: '荆棘甲',     desc: '荆棘覆体，触者流血', cost: 12, buffs: [{ target: 'self', name: '荆棘', turns: 3, effects: [{ key: 'counter', pct: 0.25 }] }] },
  { name: '盘根错节',   desc: '盘根错节，稳如古树', cost: 12, buffs: [{ target: 'self', name: '盘根', turns: 3, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.3 }] }] },
  { name: '古木灵壁',   desc: '古木化壁，护佑己身', cost: 18, barrierMult: 1.0 }
];
const MU_PASSIVE = [
  { name: '草木之心', desc: '与草木同心，战斗每回合回血 3', mods: { hpRegen: 3 } },
  { name: '青囊经',   desc: '青囊医典，生命上限 +15', mods: { maxHp: 15 } },
  { name: '毒经',     desc: '谙熟百毒，攻击 +2', mods: { atk: 2 } },
  { name: '灵根吐纳', desc: '吐纳灵息，战斗每回合回蓝 3', mods: { mpRegen: 3 } },
  { name: '春生诀',   desc: '春气生发，生命上限 +10、每回合回血 1', mods: { maxHp: 10, hpRegen: 1 } },
  { name: '百毒不侵体', desc: '百毒难侵，法防 +3', mods: { mdef: 3 } },
  { name: '木灵护体', desc: '木灵环绕，物防 +2、每回合回血 2', mods: { pdef: 2, hpRegen: 2 } },
  { name: '妙手仁心', desc: '仁心仁术，攻击 +2（治疗亦增）', mods: { atk: 2 } },
  { name: '藤蔓缠身', desc: '藤蔓随身，常驻反伤 8%', mods: { counterPct: 0.08 } },
  { name: '长生功',   desc: '长生久视，生命上限 +20', mods: { maxHp: 20 } }
];

/* ---------------- 水 ---------------- */
const SHUI_ACTIVE = [
  { name: '水刃',       desc: '柔水成刃，无孔不入', cost: 8,  mult: 1.3 },
  { name: '寒冰刺',     desc: '寒水凝刺，透骨三分', cost: 10, mult: 1.6 },
  { name: '怒涛卷',     desc: '狂澜骤起，席卷敌身', cost: 14, mult: 2.0 },
  { name: '惊涛拍岸',   desc: '惊涛裂岸，气势夺人', cost: 15, mult: 1.7, buffs: [{ target: 'enemy', name: '气夺', turns: 2, effects: [{ key: 'statDown', stat: 'atk', pct: 0.15 }] }] },
  { name: '沧海横流',   desc: '沧海横流，尽显本色', cost: 18, mult: 2.3 },
  { name: '翻江倒海',   desc: '翻江倒海，势不可当', cost: 20, mult: 2.5 },
  { name: '一元重水',   desc: '一元重水，滴重千钧', cost: 22, mult: 2.7 },
  { name: '冰魄寒光',   desc: '冰魄寒光，冻筋蚀骨', cost: 13, mult: 1.4, buffs: [{ target: 'enemy', name: '冻僵', turns: 2, effects: [{ key: 'statDown', stat: 'atk', pct: 0.2 }] }] },
  { name: '弱水三千',   desc: '弱水蚀甲，鹅毛不浮', cost: 12, buffs: [{ target: 'enemy', name: '蚀甲', turns: 3, effects: [{ key: 'statDown', stat: 'pdef', pct: 0.25 }] }] },
  { name: '蚀骨寒潭',   desc: '寒潭蚀骨，灵护尽散', cost: 13, buffs: [{ target: 'enemy', name: '蚀灵', turns: 3, effects: [{ key: 'statDown', stat: 'mdef', pct: 0.3 }] }] },
  { name: '冰河封冻',   desc: '冰河封冻，千里凝寒', cost: 16, mult: 1.5, buffs: [{ target: 'enemy', name: '冰封', turns: 1, effects: [{ key: 'stun' }] }] },
  { name: '云雾隐身',   desc: '云雾绕体，身形隐没', cost: 10, buffs: [{ target: 'self', name: '雾隐', turns: 2, effects: [{ key: 'dodge', pct: 0.25 }] }] },
  { name: '镜水诀',     desc: '水镜映影，真幻难辨', cost: 12, buffs: [{ target: 'self', name: '镜影', turns: 2, effects: [{ key: 'dodge', pct: 0.3 }] }] },
  { name: '水月化身',   desc: '水中捞月，化身无形', cost: 15, buffs: [{ target: 'self', name: '水月化形', turns: 2, effects: [{ key: 'dodge', pct: 0.45 }] }] },
  { name: '镜花水月',   desc: '镜花水月，万法皆空', cost: 16, buffs: [{ target: 'self', name: '空明化形', turns: 1, effects: [{ key: 'dodge', pct: 0.6 }] }] },
  { name: '甘霖普降',   desc: '甘霖普降，身心俱振', cost: 14, healMult: 1.0, buffs: [{ target: 'self', name: '甘霖', turns: 3, effects: [{ key: 'statUp', stat: 'atk', pct: 0.2 }] }] },
  { name: '潮汐之力',   desc: '潮汐加身，力如潮涌', cost: 12, buffs: [{ target: 'self', name: '潮汐', turns: 3, effects: [{ key: 'statUp', stat: 'atk', pct: 0.3 }] }] },
  { name: '玄冰铠甲',   desc: '玄冰为铠，坚不可摧', cost: 13, buffs: [{ target: 'self', name: '玄冰甲', turns: 3, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.35 }] }] },
  { name: '细水长流',   desc: '细水长流，绵延不绝', cost: 11, buffs: [{ target: 'self', name: '细流', turns: 3, effects: [{ key: 'regen', pct: 0.04 }, { key: 'mpRegen', value: 3 }] }] },
  { name: '冰棱镜',     desc: '冰棱成镜，寒光反照', cost: 12, barrierMult: 0.4, buffs: [{ target: 'self', name: '冰镜', turns: 2, effects: [{ key: 'counter', pct: 0.2 }] }] }
];
const SHUI_PASSIVE = [
  { name: '上善若水', desc: '上善若水，法防 +4', mods: { mdef: 4 } },
  { name: '流水不腐', desc: '流水不腐，每回合回血 2、回蓝 2', mods: { hpRegen: 2, mpRegen: 2 } },
  { name: '冰肌玉骨', desc: '冰肌玉骨，物防 +3', mods: { pdef: 3 } },
  { name: '心如止水', desc: '心如止水，会心率 +4%', mods: { crit: 0.04 } },
  { name: '海纳百川', desc: '海纳百川，法力上限 +15', mods: { maxMp: 15 } },
  { name: '潮汐诀',   desc: '潮汐暗涌，攻击 +3', mods: { atk: 3 } },
  { name: '化形诀',   desc: '善化其形，常驻闪避 +5%', mods: { dodge: 0.05 } },
  { name: '寒潭映月', desc: '寒潭映月，法防 +2、法力上限 +8', mods: { mdef: 2, maxMp: 8 } },
  { name: '润物无声', desc: '润物无声，每回合回血 1、修为获取 +5%', mods: { hpRegen: 1, cultivationPct: 0.05 } },
  { name: '深渊之力', desc: '深渊之力，攻击 +2、法防 +2', mods: { atk: 2, mdef: 2 } }
];

/* ---------------- 火 ---------------- */
const HUO_ACTIVE = [
  { name: '炽焰冲击',   desc: '炽焰突袭，快若流星', cost: 9,  mult: 1.4 },
  { name: '火蛇狂舞',   desc: '火蛇狂舞，噬敌不休', cost: 13, mult: 1.7 },
  { name: '御火诀',     desc: '焚尽八荒之火', cost: 12, mult: 1.8 },
  { name: '火舞旋风',   desc: '火舞旋风，卷敌入焰', cost: 12, mult: 1.55 },
  { name: '烈阳焚空',   desc: '烈阳当空，烈焰焚敌', cost: 15, mult: 2.1 },
  { name: '天火流星',   desc: '天火坠星，势不可挡', cost: 17, mult: 2.3 },
  { name: '焚天煮海',   desc: '焚天煮海，乾坤俱赤', cost: 20, mult: 2.6 },
  { name: '红莲业火',   desc: '红莲业火，焚尽罪业', cost: 22, mult: 2.8 },
  { name: '九阳燎原',   desc: '九阳齐出，燎原万里', cost: 25, mult: 3.0 },
  { name: '星火燎原',   desc: '星火一点，燎原千里', cost: 10, mult: 1.5, buffs: [{ target: 'enemy', name: '灼烧', turns: 2, effects: [{ key: 'burn', mult: 0.3 }] }] },
  { name: '烽火连城',   desc: '烽火连燃，城郭俱焚', cost: 14, mult: 1.6, buffs: [{ target: 'enemy', name: '灼烧', turns: 2, effects: [{ key: 'burn', mult: 0.25 }] }] },
  { name: '焚心似火',   desc: '焚心之火，由内而外', cost: 13, mult: 1.4, buffs: [{ target: 'enemy', name: '焚心', turns: 2, effects: [{ key: 'burn', mult: 0.35 }] }] },
  { name: '熔岩爆裂',   desc: '熔岩迸裂，灼浪滔天', cost: 15, mult: 1.9, buffs: [{ target: 'enemy', name: '灼烧', turns: 2, effects: [{ key: 'burn', mult: 0.2 }] }] },
  { name: '三昧真火',   desc: '三昧真火，神魂俱焚', cost: 18, mult: 2.2, buffs: [{ target: 'enemy', name: '真火灼烧', turns: 3, stackable: true, maxStacks: 2, effects: [{ key: 'burn', mult: 0.4 }] }] },
  { name: '燎原之势',   desc: '借燎原之势，焰威更盛', cost: 12, buffs: [{ target: 'self', name: '燎原', turns: 3, effects: [{ key: 'statUp', stat: 'atk', pct: 0.25 }] }] },
  { name: '大日金焰',   desc: '大日金焰，光耀九霄', cost: 21, mult: 2.4, buffs: [{ target: 'self', name: '金焰', turns: 2, effects: [{ key: 'statUp', stat: 'atk', pct: 0.15 }] }] },
  { name: '烛龙之眼',   desc: '烛龙开目，洞察秋毫', cost: 11, mult: 1.2, buffs: [{ target: 'self', name: '烛照', turns: 3, effects: [{ key: 'statUp', stat: 'crit', pct: 0.15 }] }] },
  { name: '爆裂符',     desc: '爆裂符出，破甲碎石', cost: 16, mult: 2.0, buffs: [{ target: 'enemy', name: '裂甲', turns: 2, effects: [{ key: 'statDown', stat: 'pdef', pct: 0.15 }] }] },
  { name: '丹火护体',   desc: '丹火绕体，攻守兼备', cost: 12, barrierMult: 0.6, buffs: [{ target: 'self', name: '丹火', turns: 2, effects: [{ key: 'counter', pct: 0.15 }] }] },
  { name: '浴火重生',   desc: '浴火重生，涅槃而愈', cost: 20, healMult: 1.5 }
];
const HUO_PASSIVE = [
  { name: '炎阳体',   desc: '炎阳之体，攻击 +4', mods: { atk: 4 } },
  { name: '火灵脉',   desc: '火灵之脉，法力上限 +12、攻击 +1', mods: { maxMp: 12, atk: 1 } },
  { name: '烈炎诀',   desc: '烈炎焚空，攻击 +3', mods: { atk: 3 } },
  { name: '焚心决',   desc: '焚心以赴，会心率 +6%', mods: { crit: 0.06 } },
  { name: '浴火诀',   desc: '浴火弥坚，每回合回血 2、攻击 +1', mods: { hpRegen: 2, atk: 1 } },
  { name: '朱雀之血', desc: '朱雀血脉，生命上限 +12、攻击 +2', mods: { maxHp: 12, atk: 2 } },
  { name: '星火诀',   desc: '星火不灭，攻击 +2、会心率 +3%', mods: { atk: 2, crit: 0.03 } },
  { name: '赤焰护体', desc: '赤焰护体，物防 +2、常驻反伤 6%', mods: { pdef: 2, counterPct: 0.06 } },
  { name: '炎帝传承', desc: '炎帝传承，攻击 +5', mods: { atk: 5 } },
  { name: '不灭之火', desc: '心火不灭，每回合回血 1、生命上限 +8', mods: { hpRegen: 1, maxHp: 8 } }
];

/* ---------------- 土 ---------------- */
const TU_ACTIVE = [
  { name: '土龙弹',     desc: '凝土为弹，疾射而出', cost: 8,  mult: 1.3 },
  { name: '落岩击',     desc: '巨石自天而落', cost: 10, mult: 1.6 },
  { name: '地龙翻身',   desc: '大地震颤，地龙突袭', cost: 14, mult: 2.0 },
  { name: '地裂崩',     desc: '大地开裂，崩石穿空', cost: 16, mult: 2.1 },
  { name: '陨石天降',   desc: '陨石天降，威势惊人', cost: 19, mult: 2.4 },
  { name: '山崩地裂',   desc: '山崩地裂，万物倾颓', cost: 22, mult: 2.7 },
  { name: '尘沙障',     desc: '飞沙走石，伤敌蔽目', cost: 12, mult: 1.3, buffs: [{ target: 'enemy', name: '蔽目', turns: 2, effects: [{ key: 'statDown', stat: 'atk', pct: 0.15 }] }] },
  { name: '飞砂走石',   desc: '飞砂走石，迷人眼目', cost: 11, mult: 1.4, buffs: [{ target: 'enemy', name: '迷眼', turns: 1, effects: [{ key: 'stun' }] }] },
  { name: '五岳镇形',   desc: '五岳齐压，镇敌身形', cost: 17, mult: 1.5, buffs: [{ target: 'enemy', name: '镇压', turns: 1, effects: [{ key: 'stun' }] }] },
  { name: '石傀召唤',   desc: '聚石为傀，代主而战', cost: 15, buffs: [{ target: 'self', name: '石傀儡', turns: 3, effects: [{ key: 'summon', mult: 0.5 }] }] },
  { name: '土俑卫士',   desc: '土俑执戈，护主攻敌', cost: 18, buffs: [{ target: 'self', name: '土俑卫士', turns: 3, effects: [{ key: 'summon', mult: 0.7 }] }] },
  { name: '双傀戏',     desc: '双傀齐出，戏敌于鼓掌', cost: 20, buffs: [{ target: 'self', name: '双傀儡', turns: 3, stackable: true, maxStacks: 2, effects: [{ key: 'summon', mult: 0.5 }] }] },
  { name: '山神敕令',   desc: '山神敕令，巨石灵将听令', cost: 25, buffs: [{ target: 'self', name: '石灵将', turns: 4, effects: [{ key: 'summon', mult: 1.0 }] }] },
  { name: '岩铠术',     desc: '岩石为铠，坚若山岳', cost: 12, buffs: [{ target: 'self', name: '岩铠', turns: 3, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.4 }] }] },
  { name: '石肤术',     desc: '肤如顽石，刀剑难伤', cost: 9,  buffs: [{ target: 'self', name: '石肤', turns: 2, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.25 }] }] },
  { name: '大地壁垒',   desc: '大地隆起，化为壁垒', cost: 14, barrierMult: 1.1 },
  { name: '厚土载物',   desc: '厚土载物，休养固防', cost: 13, healMult: 0.8, buffs: [{ target: 'self', name: '厚土', turns: 2, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.2 }] }] },
  { name: '泥沼陷',     desc: '泥沼深陷，步履维艰', cost: 12, buffs: [{ target: 'enemy', name: '泥沼', turns: 3, effects: [{ key: 'statDown', stat: 'pdef', pct: 0.2 }] }] },
  { name: '陶偶替身',   desc: '陶偶代受，金蝉脱壳', cost: 16, buffs: [{ target: 'self', name: '陶偶替身', turns: 2, effects: [{ key: 'dodge', pct: 0.35 }] }] },
  { name: '地脉汲取',   desc: '汲取地脉，生机回涌', cost: 12, buffs: [{ target: 'self', name: '地脉', turns: 3, effects: [{ key: 'regen', pct: 0.04 }] }] }
];
const TU_PASSIVE = [
  { name: '大地之躯', desc: '大地之躯，生命上限 +20', mods: { maxHp: 20 } },
  { name: '岩心',     desc: '心如磐岩，物防 +4', mods: { pdef: 4 } },
  { name: '厚土功',   desc: '厚土之功，物防 +2、生命上限 +10', mods: { pdef: 2, maxHp: 10 } },
  { name: '地脉通',   desc: '地脉畅通，每回合回蓝 2', mods: { mpRegen: 2 } },
  { name: '山岳之势', desc: '山岳之势，攻击 +3', mods: { atk: 3 } },
  { name: '泥丸守一', desc: '泥丸守一，法防 +3', mods: { mdef: 3 } },
  { name: '奠基诀',   desc: '道基夯实，生命上限 +12、物防 +1', mods: { maxHp: 12, pdef: 1 } },
  { name: '载物之德', desc: '载物之德，每回合回血 2', mods: { hpRegen: 2 } },
  { name: '岩崩劲',   desc: '岩崩之劲，攻击 +2、物防 +2', mods: { atk: 2, pdef: 2 } },
  { name: '傀儡师',   desc: '精研傀儡，攻击 +2（造物亦强）', mods: { atk: 2 } }
];

/* ---------------- 无属性（所有灵根可学） ---------------- */
const WU_ACTIVE = [
  { name: '气剑指',     desc: '凝气于指，点石成穴', cost: 7,  mult: 1.3 },
  { name: '基础剑诀',   desc: '大道至简，剑诀筑基', cost: 8,  mult: 1.4 },
  { name: '铁掌',       desc: '铁掌开碑，刚猛无俦', cost: 9,  mult: 1.45 },
  { name: '灵力冲击',   desc: '灵力外放，直冲敌窍', cost: 10, mult: 1.6 },
  { name: '凝神一击',   desc: '凝神聚气，一击制胜', cost: 12, mult: 1.7 },
  { name: '破空斩',     desc: '斩破虚空，剑气纵横', cost: 14, mult: 2.0 },
  { name: '万钧',       desc: '万钧之力，泰山压顶', cost: 16, mult: 2.2 },
  { name: '小须弥剑',   desc: '须弥藏芥，剑蕴乾坤', cost: 18, mult: 2.4 },
  { name: '太虚一剑',   desc: '太虚一剑，万法归一', cost: 22, mult: 2.8 },
  { name: '聚气术',     desc: '吐纳聚气，法力回涌', cost: 0,  mpGain: 20 },
  { name: '养元功',     desc: '养元固本，气血双调', cost: 8,  healMult: 0.5, mpGain: 8 },
  { name: '吐纳回春',   desc: '吐故纳新，春回气海', cost: 10, healMult: 0.6 },
  { name: '回元术',     desc: '回元归一，伤势尽复', cost: 13, healMult: 1.1 },
  { name: '护身罡气',   desc: '罡气护体，风雨不侵', cost: 10, barrierMult: 0.7 },
  { name: '灵盾术',     desc: '灵力成盾，挡灾一次', cost: 12, shieldLayers: 1 },
  { name: '清风步',     desc: '清风拂身，步履飘忽', cost: 10, buffs: [{ target: 'self', name: '清风', turns: 2, effects: [{ key: 'dodge', pct: 0.2 }] }] },
  { name: '无影脚',     desc: '无影无形，踢云纵雾', cost: 10, mult: 1.5, buffs: [{ target: 'self', name: '无影', turns: 1, effects: [{ key: 'dodge', pct: 0.15 }] }] },
  { name: '御风诀',     desc: '御风而行，攻势更疾', cost: 11, buffs: [{ target: 'self', name: '御风', turns: 3, effects: [{ key: 'statUp', stat: 'atk', pct: 0.15 }] }] },
  { name: '金刚禅唱',   desc: '禅唱铮铮，内外兼固', cost: 14, buffs: [{ target: 'self', name: '禅唱', turns: 2, effects: [{ key: 'statUp', stat: 'pdef', pct: 0.25 }, { key: 'statUp', stat: 'mdef', pct: 0.25 }] }] },
  { name: '定身符',     desc: '定身符出，身形立滞', cost: 13, buffs: [{ target: 'enemy', name: '定身', turns: 1, effects: [{ key: 'stun' }] }] }
];
const WU_PASSIVE = [
  { name: '吐纳术',   desc: '呼吸吐纳，每回合回血 1、回蓝 1', mods: { hpRegen: 1, mpRegen: 1 } },
  { name: '铁布衫',   desc: '皮肉坚韧，物防 +2', mods: { pdef: 2 } },
  { name: '清心诀',   desc: '心境澄明，法防 +2', mods: { mdef: 2 } },
  { name: '凝神气',   desc: '神气内守，攻击 +2', mods: { atk: 2 } },
  { name: '轻身术',   desc: '身形如风，常驻闪避 +3%', mods: { dodge: 0.03 } },
  { name: '回春功',   desc: '气血悠长，生命上限 +10', mods: { maxHp: 10 } },
  { name: '听涛诀',   desc: '感知敏锐，会心率 +3%', mods: { crit: 0.03 } },
  { name: '龟息术',   desc: '气息绵长，每回合回血 2', mods: { hpRegen: 2 } },
  { name: '抱元守一', desc: '抱元守一，法力上限 +10', mods: { maxMp: 10 } },
  { name: '五气朝元', desc: '五气朝元，全维小增（攻/防/法防 +1，生命 +5）', mods: { atk: 1, pdef: 1, mdef: 1, maxHp: 5 } }
];

/* ================= 库装配 ================= */

export const SKILL_LIBRARY = {
  jin:  { label: '金', active: JIN_ACTIVE,  passive: JIN_PASSIVE },
  mu:   { label: '木', active: MU_ACTIVE,   passive: MU_PASSIVE },
  shui: { label: '水', active: SHUI_ACTIVE, passive: SHUI_PASSIVE },
  huo:  { label: '火', active: HUO_ACTIVE,  passive: HUO_PASSIVE },
  tu:   { label: '土', active: TU_ACTIVE,   passive: TU_PASSIVE },
  wu:   { label: '无', active: WU_ACTIVE,   passive: WU_PASSIVE }
};

/** 全库查找技能定义 @returns {type:'active'|'passive', root, def} | null */
export function findSkill(name) {
  for (const [root, sec] of Object.entries(SKILL_LIBRARY)) {
    for (const type of ['active', 'passive']) {
      const hit = sec[type].find(s => s.name === name);
      if (hit) return { type, root, def: hit };
    }
  }
  return null;
}

/**
 * 按灵根过滤可学习列表
 * @param roots 已选灵根 key 数组；无属性(wu)技能所有灵根可学
 */
export function libraryFor(roots, type) {
  const keys = [...new Set([...roots, 'wu'])];
  return keys.flatMap(k =>
    (SKILL_LIBRARY[k]?.[type] ?? []).map(sk => ({ ...sk, root: k === 'wu' ? undefined : k }))
  );
}

/* ---------- 效果/技能文案生成（界面与 AI 目录共用） ---------- */

function fxBrief(e) {
  switch (e.key) {
    case 'poison':   return `中毒(每回合${Math.round((e.pct ?? 0) * 100)}%最大生命)`;
    case 'burn':     return `灼烧(攻×${e.mult ?? 0}/回合)`;
    case 'regen':    return `回春(每回合${Math.round((e.pct ?? 0) * 100)}%)`;
    case 'mpRegen':  return `回蓝${e.value}/回合`;
    case 'summon':   return `造物(攻×${e.mult ?? e.value ?? 0}/回合)`;
    case 'stun':     return '控制';
    case 'shield':   return `${e.layers ?? 1}层次数盾`;
    case 'barrier':  return `屏障${e.value ?? 0}`;
    case 'counter':  return `反伤${Math.round((e.pct ?? 0) * 100)}%`;
    case 'dodge':    return `化形闪避${Math.round((e.pct ?? 0) * 100)}%`;
    case 'guard':    return '格挡';
    case 'statUp':   return `${STAT_LABELS[e.stat] ?? e.stat}+${Math.round((e.pct ?? 0) * 100)}%`;
    case 'statDown': return `${STAT_LABELS[e.stat] ?? e.stat}-${Math.round((e.pct ?? 0) * 100)}%`;
    default:         return e.key;
  }
}

/** 主动技能结构化摘要：耗蓝/倍率/治疗/护盾/屏障/状态 */
export function describeActive(sk) {
  const parts = [`耗蓝${sk.cost ?? 10}`];
  if (sk.mult) parts.push(`伤害×${sk.mult}`);
  if (sk.healMult) parts.push(`治疗×${sk.healMult}`);
  if (sk.mpGain) parts.push(`回蓝${sk.mpGain}`);
  if (sk.shieldLayers) parts.push(`${sk.shieldLayers}层次数盾`);
  if (sk.barrierMult) parts.push(`屏障(攻×${sk.barrierMult})`);
  for (const b of sk.buffs ?? []) {
    const side = b.target === 'enemy' ? '敌' : '己';
    const fx = (b.effects ?? []).map(fxBrief).join('+');
    parts.push(`${side}【${b.name}】${b.turns}回合(${fx})${b.stackable ? `可叠${b.maxStacks}层` : ''}`);
  }
  return parts.join(' · ');
}

/** 被动技能结构化摘要（mods → 文案） */
export function describePassive(sk) {
  if (!sk.mods || !Object.keys(sk.mods).length) return sk.desc || '';
  const LABEL = {
    atk: '攻击', pdef: '物防', mdef: '法防', maxHp: '生命上限', maxMp: '法力上限',
    atkPct: '攻击', pdefPct: '物防', mdefPct: '法防',
    crit: '会心率', dodge: '闪避率', counterPct: '反伤',
    hpRegen: '每回合回血', mpRegen: '每回合回蓝', cultivationPct: '修为获取'
  };
  return Object.entries(sk.mods).map(([k, v]) => {
    const pct = k.endsWith('Pct') || k === 'crit' || k === 'dodge' || k === 'cultivationPct';
    return `${LABEL[k] ?? k}${v >= 0 ? '+' : ''}${pct ? Math.round(v * 100) + '%' : v}`;
  }).join('，');
}

/** AI 可读的技能库目录（needData: ["library"] 时回传） */
export function presentLibrary() {
  const out = {};
  for (const [root, sec] of Object.entries(SKILL_LIBRARY)) {
    out[sec.label] = {
      主动: sec.active.map(sk => `${sk.name}｜${describeActive(sk)}`),
      被动: sec.passive.map(sk => `${sk.name}｜${describePassive(sk)}`)
    };
  }
  return {
    文件: 'skill-library.json（系统功法库，非存档数据）',
    说明: '预配置技能库。授予玩家技能(grantSkill)必须从此库中按名称选取；仅当剧情确实需要库中不存在的技能时，才使用 registerSkill 创建存档专属技能。无属性技能所有灵根可学；属性技能需玩家拥有对应灵根。',
    技能库: out
  };
}
