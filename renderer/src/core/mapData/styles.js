// ============================================================
// 地图数据 · 灵根风格与宗门设施常量
// ============================================================

/* ==================== 灵根/风格标签 ==================== */
export const SECT_STYLES = {
  jin:   { label: '金系', color: '#d8b25c', focus: '剑修/体修，重杀伐与防御' },
  mu:    { label: '木系', color: '#6fcf7f', focus: '丹修/医修，重生机与控制' },
  shui:  { label: '水系', color: '#5aa9e6', focus: '法修/幻修，重变化与增益' },
  huo:   { label: '火系', color: '#e35d6a', focus: '火修/炼器，重爆发与毁灭' },
  tu:    { label: '土系', color: '#c08a5a', focus: '阵修/御兽，重防御与召唤' },
  yin:   { label: '阴系', color: '#b07fe8', focus: '魂修/鬼修，重精神与诅咒' },
  yang:  { label: '阳系', color: '#f4d98c', focus: '雷修/剑修，重速度与正义' },
  hunyuan: { label: '混元', color: '#7fb3a8', focus: '五行兼修，博采众长' }
};

/* ==================== 宗门设施（通用功能场景） ==================== */
export const FACILITY_TYPES = {
  biguan:   { label: '闭关室', icon: 'yinyang', desc: '闭关修炼，消耗时间提升修为', canCultivate: true },
  cangshu:  { label: '藏书阁', icon: 'scroll', desc: '研读功法典籍，可领悟技能', canLearn: true },
  liandan:  { label: '炼丹房', icon: 'drop', desc: '炼制丹药，需消耗草药', canAlchemy: true },
  liangong: { label: '练功房', icon: 'sword', desc: '切磋演练，提升战斗技巧', canTrain: true },
  leitai:   { label: '擂台', icon: 'spark', desc: '与同门或来客切磋比试', canDuel: true },
  fangshi:  { label: '坊市', icon: 'talisman', desc: '交易买卖，兑换货币', canTrade: true },
  danfang:  { label: '丹房', icon: 'drop', desc: '购买丹药与草药', canBuyPill: true },
  qiju:     { label: '起居', icon: 'heart', desc: '休息恢复，与道侣相处', canRest: true },
  menpai:   { label: '宗门大殿', icon: 'yinyang', desc: '宗门事务，接取任务', canQuest: true }
};
