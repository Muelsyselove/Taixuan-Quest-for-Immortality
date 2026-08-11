// 战斗引擎：系统驱动的回合制战斗
// 触发：AI 在事件 JSON 中给出 combat 信号（敌人信息 + 先手权）→ 系统接管流程
// 敌方行动：每回合由 AI 代理决策（未配置 AI 时用本地策略兜底）
//
// 三层结算架构：
//   效果层（fx.js EFFECTS）——所有非直接伤害效果的原子实现（毒/灼烧/回春/眩晕/次数盾/屏障/反伤/化形/增益减益/造物/格挡）
//   buff 层（fx.js mkBuff/applyBuff）——buff 由不限种类数量的效果组成，可叠加、可限叠加上限
//   技能层（skills.js / 存档专属）——技能的蓝耗与结构化效果（伤害倍率/治疗倍率/屏障倍率/护盾层数/buff 及持续）
import { CONFIG } from './config.js';
import { mkBuff, applyBuff, buffLabel } from './fx.js';

export class CombatEngine {
  /**
   * @param {GameStore} store
   * @param {NarrativeEngine} ai  用于代理敌方决策
   */
  constructor(store, ai) {
    this.store = store;
    this.ai = ai;
  }

  get c() { return this.store.state.combat; }

  /* ================= 生命周期 ================= */

  /** AI 信号触发战斗：{ enemy:{name,desc,hp,atk,pdef,mdef,skills[]}, playerFirst } */
  start(signal) {
    const s = this.store.state;
    if (this.c) return; // 已在战斗中

    const scale = 1 + s.realmIndex * 0.8; // 敌人随境界缩放（本地兜底用，AI 一般已给合适数值）
    const e = signal.enemy || {};
    const enemy = {
      name: e.name || '无名之辈',
      desc: e.desc || '',
      hp: Math.max(1, Math.round(e.hp ?? 60 * scale)),
      maxHp: Math.max(1, Math.round(e.hp ?? 60 * scale)),
      atk: Math.max(1, Math.round(e.atk ?? 8 * scale)),
      pdef: Math.max(0, Math.round(e.pdef ?? 3 * scale)),
      mdef: Math.max(0, Math.round(e.mdef ?? 3 * scale)),
      skills: Array.isArray(e.skills) && e.skills.length ? e.skills : [{ name: '猛击', desc: '奋力一击', mult: 1.4 }]
    };

    const playerFirst = signal.playerFirst !== false; // 默认我方先手
    const spar = !!signal.spar; // 切磋：点到为止，不致死
    this.store.set({
      combat: {
        enemy,
        playerFirst,
        spar,
        round: 1,
        phase: playerFirst ? 'player' : 'enemy',
        buffs: { player: [], enemy: [] }, // buff 层实例：[{name,effects[],turns,stackable,maxStacks,stacks}]
        log: [{ side: 'sys', text: spar
          ? `【${enemy.name}】邀你切磋较艺——点到为止，${playerFirst ? '你拱手先出一招！' : '对方抢先进招！'}`
          : `遭遇【${enemy.name}】——${enemy.desc}${playerFirst ? '你抢得先机！' : '对方来势汹汹，抢先出手！'}` }],
        result: null
      }
    });
    this.store.pushHistory(spar ? `与【${enemy.name}】切磋较艺` : `与【${enemy.name}】狭路相逢，战！`, 'combat');

    if (!playerFirst) this._enemyTurn();
  }

  _end(result) {
    const c = this.c;
    this.store.set({ combat: { ...c, phase: 'over', result } });
    const s = this.store.state;

    if (result === 'win') {
      const gain = Math.round(c.enemy.maxHp * 0.35 + c.enemy.atk * 2);
      this.store.pushHistory(c.spar ? `切磋胜出【${c.enemy.name}】一筹，修为 +${gain}` : `力挫【${c.enemy.name}】，修为 +${gain}`, 'combat');
      this.store.applyEffects({ cultivation: gain });
      // 战利品：本地掉落表掷骰（切磋无战利品）
      if (!c.spar) {
        const loot = this._rollLoot();
        if (loot) this.store.addItem(loot);
      }
    } else if (result === 'lose') {
      if (c.spar) {
        this.store.pushHistory(`切磋不敌【${c.enemy.name}】，拱手认输——点到为止，无伤大雅`, 'combat');
      } else {
        this.store.pushHistory(`不敌【${c.enemy.name}】，重伤遁走`, 'death');
        this.store.applyEffects({ hp: -s.maxHp }); // 触发轮回判定
      }
    } else if (result === 'flee') {
      this.store.pushHistory(`自【${c.enemy.name}】手下脱身而去`, 'combat');
    }
    // 战斗遗留的 hp/mp 已直接落在角色面板上；3 秒后由 UI 关闭战斗界面
  }

  _rollLoot() {
    const table = CONFIG.fallback.loot;
    if (Math.random() > 0.6) return null;
    const base = table[Math.floor(Math.random() * table.length)];
    return { ...base };
  }

  /* ================= buff 层操作 ================= */

  _buffsOf(side) { return this.c.buffs[side]; }

  _setBuffs(side, list) {
    const c = this.c;
    this.store.set({ combat: { ...c, buffs: { ...c.buffs, [side]: list } } });
  }

  /** 施加 buff（叠加规则见 fx.applyBuff） */
  _applySideBuff(side, buff) {
    this._setBuffs(side, applyBuff(this._buffsOf(side), buff));
  }

  _hasFx(side, key) {
    return this._buffsOf(side).some(b => b.effects.some(e => e.key === key));
  }

  /** 某侧指定效果参数的合计（value/pct 类随 stacks 乘算） */
  _fxSum(side, key, prop) {
    let sum = 0;
    for (const b of this._buffsOf(side)) {
      for (const e of b.effects) {
        if (e.key === key && typeof e[prop] === 'number') sum += e[prop] * (b.stacks || 1);
      }
    }
    return sum;
  }

  /** 移除含指定效果的所有 buff（如格挡生效一次即消） */
  _removeFx(side, key) {
    this._setBuffs(side, this._buffsOf(side).filter(b => !b.effects.some(e => e.key === key)));
  }

  /* ================= 效果层派生数值 ================= */

  /** 战斗内属性倍率：增益/减益效果（pct 加算，下限 0.2） */
  _statMult(side, stat) {
    let pct = 0;
    for (const b of this._buffsOf(side)) {
      for (const e of b.effects) {
        if (e.stat !== stat) continue;
        if (e.key === 'statUp') pct += (e.pct ?? 0) * (b.stacks || 1);
        if (e.key === 'statDown') pct -= (e.pct ?? 0) * (b.stacks || 1);
      }
    }
    return Math.max(0.2, 1 + pct);
  }

  _effAtk(side) {
    const base = side === 'player' ? this.store.effStat('atk') : this.c.enemy.atk;
    return base * this._statMult(side, 'atk');
  }

  _effDef(side) {
    const base = side === 'player' ? this.store.effStat('pdef') : this.c.enemy.pdef;
    return base * this._statMult(side, 'pdef');
  }

  /** 化形闪避概率：buff 化形效果 + 玩家常驻闪避（上限 80%） */
  _dodgeChance(side) {
    let p = this._fxSum(side, 'dodge', 'pct');
    if (side === 'player') p += this.store.combatMods().dodge;
    return Math.max(0, Math.min(0.8, p));
  }

  /** 会心率：基础 + 玩家常驻 + buff 增益/减益（0~90%） */
  _critChance(side) {
    let p = CONFIG.combat.critChance + this._statMultCritDelta(side);
    if (side === 'player') p += this.store.combatMods().crit;
    return Math.max(0, Math.min(0.9, p));
  }

  _statMultCritDelta(side) {
    let pct = 0;
    for (const b of this._buffsOf(side)) {
      for (const e of b.effects) {
        if (e.stat !== 'crit') continue;
        if (e.key === 'statUp') pct += (e.pct ?? 0) * (b.stacks || 1);
        if (e.key === 'statDown') pct -= (e.pct ?? 0) * (b.stacks || 1);
      }
    }
    return pct;
  }

  /** 反伤比例：buff 反伤效果 + 玩家常驻反伤 */
  _counterPct(side) {
    let p = this._fxSum(side, 'counter', 'pct');
    if (side === 'player') p += this.store.combatMods().counterPct;
    return p;
  }

  /* ================= 回合开始结算（效果层 tick） ================= */

  /**
   * 回合开始：结算 turnStart 相效果（毒/灼烧/回春/回蓝/造物）与玩家常驻回复。
   * 注意：此处只结算效果，不倒计时——倒计时在该方行动完毕后的 _tickEnd 统一递减。
   */
  _tickStart(side) {
    const c = this.c;
    if (!c) return;
    const isPlayer = side === 'player';
    const name = isPlayer ? '你' : `【${c.enemy.name}】`;
    const maxHp = isPlayer ? this.store.effStat('maxHp') : c.enemy.maxHp;
    let hpDelta = 0, mpDelta = 0, summonDmg = 0;

    for (const b of c.buffs[side]) {
      for (const e of b.effects) {
        const st = b.stacks || 1;
        switch (e.key) {
          case 'poison':  hpDelta -= Math.max(1, Math.round(maxHp * (e.pct ?? 0.05) * st)); break;
          case 'burn':    hpDelta -= Math.max(1, Math.round((e.value ?? 0) * st)); break;
          case 'regen':   hpDelta += Math.max(1, Math.round(maxHp * (e.pct ?? 0) * st)); break;
          case 'mpRegen': mpDelta += Math.round((e.value ?? 0) * st); break;
          case 'summon':  summonDmg += Math.max(1, Math.round((e.value ?? 0) * st)); break;
        }
      }
    }
    // 玩家常驻回复（被动/天赋 mods）
    if (isPlayer) {
      const cm = this.store.combatMods();
      hpDelta += cm.hpRegen;
      mpDelta += cm.mpRegen;
    }

    const notes = [];
    if (hpDelta) {
      if (isPlayer) this.store.applyEffects({ hp: hpDelta });
      else if (hpDelta < 0) this._hurtEnemy(-hpDelta);
      else this._healEnemy(hpDelta);
      notes.push(hpDelta < 0 ? `${name}受持续侵蚀，损失 ${-hpDelta} 点生命` : `${name}气血回涌，恢复 ${hpDelta} 点生命`);
    }
    if (mpDelta && isPlayer) {
      this.store.applyEffects({ mp: mpDelta });
      notes.push(`法力回涌 +${mpDelta}`);
    }
    if (summonDmg) {
      if (isPlayer) {
        this._hurtEnemy(summonDmg);
        notes.push(`麾下造物扑击敌身，造成 ${summonDmg} 点伤害`);
      } else {
        this.store.applyEffects({ hp: -summonDmg });
        notes.push(`敌方造物袭来，你受 ${summonDmg} 点伤害`);
      }
    }
    if (notes.length) this._log(side, notes.join('；'));
  }

  /** 行动完毕：buff 倒计时递减并清除到期 buff */
  _tickEnd(side) {
    const c = this.c;
    if (!c) return;
    this._setBuffs(side, c.buffs[side].map(b => ({ ...b, turns: b.turns - 1 })).filter(b => b.turns > 0));
  }

  /* ================= 伤害结算（defend / attacked 相效果） ================= */

  /** 消耗一层次数盾（先扣叠加层数，再扣效果层数，耗尽移除 buff）；返回是否成功抵消 */
  _consumeShield(side) {
    const buffs = [...this._buffsOf(side)];
    for (let i = 0; i < buffs.length; i++) {
      const b = buffs[i];
      const fx = b.effects.find(e => e.key === 'shield');
      if (!fx) continue;
      if ((b.stacks || 1) > 1) {
        buffs[i] = { ...b, stacks: b.stacks - 1 };
      } else if ((fx.layers ?? 1) > 1) {
        buffs[i] = { ...b, effects: b.effects.map(e => e.key === 'shield' ? { ...e, layers: e.layers - 1 } : e) };
      } else {
        buffs.splice(i, 1);
      }
      this._setBuffs(side, buffs);
      return true;
    }
    return false;
  }

  /** 屏障（血量盾）吸收伤害池；返回穿透后的剩余伤害 */
  _absorbBarrier(side, dmg) {
    const buffs = [...this._buffsOf(side)];
    for (let i = 0; i < buffs.length && dmg > 0; i++) {
      const b = buffs[i];
      const fx = b.effects.find(e => e.key === 'barrier');
      if (!fx || !(fx.value > 0)) continue;
      const absorbed = Math.min(fx.value, dmg);
      const left = fx.value - absorbed;
      dmg -= absorbed;
      if (left > 0) {
        buffs[i] = { ...b, effects: b.effects.map(e => e.key === 'barrier' ? { ...e, value: left } : e) };
      } else {
        buffs.splice(i, 1);
        i--;
      }
    }
    this._setBuffs(side, buffs);
    return dmg;
  }

  /**
   * 一次攻击的完整结算链：化形闪避 → 防御 → 会心 → 次数盾 → 屏障 → 格挡 → 扣血 → 反伤
   * @param atkSide 'player'|'enemy'
   * @param opts { atk 攻击方有效攻击, mult 倍率, label 招式描述 }
   */
  _strike(atkSide, { atk, mult, label }) {
    const c = this.c;
    const defSide = atkSide === 'player' ? 'enemy' : 'player';
    const atkName = atkSide === 'player' ? '你' : `【${c.enemy.name}】`;
    const defName = defSide === 'player' ? '你' : `【${c.enemy.name}】`;

    // 化形闪避
    if (Math.random() < this._dodgeChance(defSide)) {
      this._log(defSide, `${defName}身形化作虚影——${atkName}${label}落空了`);
      return;
    }

    const def = this._effDef(defSide);
    let dmg = Math.max(1, Math.round(atk * mult - def * 0.8));
    const crit = Math.random() < this._critChance(atkSide);
    if (crit) dmg = Math.round(dmg * CONFIG.combat.critMult);

    // 次数盾：每层完整抵消一次伤害
    if (this._consumeShield(defSide)) {
      this._log(defSide, `${defName}身前护盾灵光一闪，将${atkName}${label}尽数挡下`);
      return;
    }

    // 屏障：吸收伤害池
    const beforeBarrier = dmg;
    dmg = this._absorbBarrier(defSide, dmg);
    const absorbed = beforeBarrier - dmg;

    // 格挡：减伤一次
    let guarded = false;
    if (dmg > 0 && this._hasFx(defSide, 'guard')) {
      dmg = Math.max(1, Math.round(dmg * CONFIG.combat.guardReduce));
      this._removeFx(defSide, 'guard');
      guarded = true;
    }

    // 实际扣血
    if (dmg > 0) {
      if (defSide === 'enemy') this._hurtEnemy(dmg);
      else this.store.applyEffects({ hp: -dmg });
    }

    // 反伤
    let reflected = 0;
    const cpct = this._counterPct(defSide);
    if (dmg > 0 && cpct > 0) {
      reflected = Math.max(1, Math.round(dmg * cpct));
      if (atkSide === 'enemy') this._hurtEnemy(reflected);
      else this.store.applyEffects({ hp: -reflected });
    }

    const parts = [`${atkName}${label}`];
    if (dmg <= 0 && absorbed > 0) {
      this._log(defSide, `${parts[0]}——${defName}的屏障将 ${absorbed} 点伤害尽数吸收`);
      return;
    }
    if (absorbed) parts.push(`屏障吸收 ${absorbed} 点`);
    if (guarded) parts.push('被格挡卸力');
    parts.push(`${defName}受 ${dmg} 点伤害${crit ? '（会心一击！）' : ''}`);
    if (reflected) parts.push(`${defName}劲力反震，${atkName}受 ${reflected} 点反伤`);
    this._log(atkSide, parts.join('，'));
  }

  /* ================= 技能层结算 ================= */

  /**
   * 施展主动技能（敌我通用）：伤害/治疗/回蓝/次数盾/屏障/状态 buff
   * @param side 'player'|'enemy'
   * @param sk 技能层结构化定义（见 skills.js 字段约定）
   */
  _castSkill(side, sk) {
    const c = this.c;
    const foeSide = side === 'player' ? 'enemy' : 'player';
    const me = side === 'player' ? '你' : `【${c.enemy.name}】`;
    const atk = this._effAtk(side);
    const sub = [];

    // 直接伤害
    if (sk.mult) {
      this._strike(side, { atk, mult: sk.mult, label: `施展【${sk.name}】` });
    }
    // 治疗（基于攻击倍率）
    if (sk.healMult) {
      const heal = Math.max(1, Math.round(atk * sk.healMult));
      if (side === 'player') this.store.applyEffects({ hp: heal });
      else this._healEnemy(heal);
      sub.push(`${me}恢复 ${heal} 点生命`);
    }
    // 立即回蓝
    if (sk.mpGain && side === 'player') {
      this.store.applyEffects({ mp: sk.mpGain });
      sub.push(`法力回涌 +${sk.mpGain}`);
    }
    // 次数盾
    if (sk.shieldLayers) {
      this._applySideBuff(side, mkBuff(sk.name, [{ key: 'shield', layers: sk.shieldLayers }], { turns: 99, stackable: true, maxStacks: 9 }));
      sub.push(`${me}撑起 ${sk.shieldLayers} 层护盾`);
    }
    // 屏障（血量盾）
    if (sk.barrierMult) {
      const val = Math.max(1, Math.round(atk * sk.barrierMult));
      this._applySideBuff(side, mkBuff(sk.name, [{ key: 'barrier', value: val }], { turns: 99 }));
      sub.push(`${me}展开屏障（可吸收 ${val} 点伤害）`);
    }
    // 状态 buff：mult 类效果（灼烧/造物）按施术者当前攻击快照为 value
    for (const bd of sk.buffs ?? []) {
      const target = bd.target === 'enemy' ? foeSide : side;
      const effects = (bd.effects ?? []).map(e => {
        const fx = { ...e };
        if (typeof fx.mult === 'number') { fx.value = Math.max(1, Math.round(atk * fx.mult)); delete fx.mult; }
        return fx;
      });
      if (!effects.length) continue;
      this._applySideBuff(target, mkBuff(bd.name, effects, { turns: bd.turns, stackable: bd.stackable, maxStacks: bd.maxStacks }));
      const tName = target === 'player' ? '你' : `【${c.enemy.name}】`;
      sub.push(`${tName}身中【${bd.name}】（${bd.turns > 90 ? '当次' : bd.turns + '回合'}）`);
    }

    if (!sk.mult) {
      this._log(side, `${me}施展【${sk.name}】${sub.length ? '——' + sub.join('，') : ''}`);
    } else if (sub.length) {
      this._log(side, sub.join('，'));
    }
  }

  /* ================= 基础工具 ================= */

  _hurtEnemy(dmg) {
    const c = this.c;
    const hp = Math.max(0, c.enemy.hp - dmg);
    this.store.set({ combat: { ...c, enemy: { ...c.enemy, hp } } });
    return hp <= 0;
  }

  _healEnemy(v) {
    const c = this.c;
    const hp = Math.min(c.enemy.maxHp, c.enemy.hp + v);
    this.store.set({ combat: { ...c, enemy: { ...c.enemy, hp } } });
  }

  _log(side, text) {
    const c = this.c;
    this.store.set({ combat: { ...c, log: [...c.log, { side, text }] } });
  }

  _checkEnd() {
    const c = this.c;
    if (!c || c.phase === 'over') return true;
    if (c.enemy.hp <= 0) { this._end('win'); return true; }
    // 切磋：血线触 1 即判负（applyEffects 已将 hp 钳至 1，不致陨落）
    if (this.store.state.hp <= (c.spar ? 1 : 0)) { this._end('lose'); return true; }
    return false;
  }

  /* ================= 我方行动 ================= */

  /** @param action {type:'attack'|'skill'|'item'|'guard'|'flee'|'rest', skill?, itemId?} */
  async playerAction(action) {
    const c = this.c;
    if (!c || c.phase !== 'player') return;
    const s = this.store.state;

    this._tickStart('player');
    if (this._checkEnd()) return;

    if (this._hasFx('player', 'stun')) {
      this._log('sys', '你头晕目眩，无法行动！');
    } else {
      switch (action.type) {
        case 'attack':
          this._strike('player', { atk: this._effAtk('player'), mult: 1, label: '挥刃直取' });
          break;
        case 'skill': {
          const sk = action.skill;
          const cost = sk?.cost ?? 10;
          if (!sk || s.mp < cost) { this._log('sys', '法力不足，技能施展失败！'); return; }
          this.store.applyEffects({ mp: -cost });
          this._castSkill('player', sk);
          break;
        }
        case 'item': {
          const item = s.items.find(i => i.id === action.itemId);
          if (!item) return;
          this.store.useItem(item.id);
          this._log('player', `你取出【${item.name}】一服而下`);
          break;
        }
        case 'guard': {
          this._applySideBuff('player', mkBuff('格挡', [{ key: 'guard' }], { turns: 99 }));
          this._log('player', '你沉腰立马，凝神格挡');
          break;
        }
        case 'rest': {
          // 静息：恢复50%法力
          const maxMp = this.store.effStat('maxMp');
          const recover = Math.round(maxMp * 0.5);
          this.store.applyEffects({ mp: recover });
          this._log('player', `你静心调息，恢复 ${recover} 点法力（50%）`);
          break;
        }
        case 'flee': {
          if (Math.random() < CONFIG.combat.fleeChance) {
            this._log('sys', '你虚晃一招，抽身急退——脱身成功！');
            this._end('flee');
            return;
          }
          this._log('sys', '脱身失败，破绽已露！');
          break;
        }
      }
    }

    this._tickEnd('player');
    if (this._checkEnd()) return;
    // 转敌方
    this.store.set({ combat: { ...this.c, phase: 'enemy' } });
    await this._enemyTurn();
  }

  /* ================= 敌方行动（AI 代理） ================= */

  async _enemyTurn() {
    const c = this.c;
    if (!c || c.phase !== 'enemy') return;

    this._tickStart('enemy');
    if (this._checkEnd()) return;

    let decision = null;
    if (this._hasFx('enemy', 'stun')) {
      decision = { action: 'none', narration: `【${c.enemy.name}】被定住身形，动弹不得` };
    } else {
      decision = await this.ai.decideEnemyAction(this._combatSnapshot());
    }

    const e = this.c.enemy;
    switch (decision.action) {
      case 'skill': {
        const sk = e.skills.find(x => x.name === decision.skill) || e.skills[0];
        if (decision.narration) this._log('enemy', decision.narration);
        this._castSkill('enemy', { mult: 1.4, ...sk });
        break;
      }
      case 'guard': {
        this._applySideBuff('enemy', mkBuff('格挡', [{ key: 'guard' }], { turns: 99 }));
        this._log('enemy', decision.narration || `【${e.name}】收势凝神，摆出守御之姿`);
        break;
      }
      case 'rest': {
        // 敌方静息：恢复50%法力（敌方无蓝条，仅叙事）
        this._log('enemy', decision.narration || `【${e.name}】静心调息，气息渐稳`);
        break;
      }
      case 'none':
        if (decision.narration) this._log('enemy', decision.narration);
        break;
      case 'attack':
      default:
        if (decision.narration) this._log('enemy', decision.narration);
        this._strike('enemy', { atk: this._effAtk('enemy'), mult: 1, label: '扑击而来' });
    }

    this._tickEnd('enemy');
    if (this._checkEnd()) return;
    // 回合推进
    this.store.set({ combat: { ...this.c, round: this.c.round + 1, phase: 'player' } });
  }

  _combatSnapshot() {
    const c = this.c;
    const s = this.store.state;
    const buffText = (arr) => arr.map(buffLabel).join('、') || '无';
    const skillText = (sk) => {
      const parts = [];
      if (sk.mult) parts.push(`伤害×${sk.mult}`);
      if (sk.healMult) parts.push(`治疗×${sk.healMult}`);
      if (sk.shieldLayers) parts.push(`${sk.shieldLayers}层护盾`);
      if (sk.barrierMult) parts.push(`屏障×${sk.barrierMult}`);
      if (sk.buffs?.length) parts.push(`状态:${sk.buffs.map(b => b.name).join('/')}`);
      return parts.length ? `${sk.name}(${parts.join('，')})` : sk.name;
    };
    return {
      回合: c.round,
      敌方: {
        名称: c.enemy.name, 生命: `${c.enemy.hp}/${c.enemy.maxHp}`,
        攻击: c.enemy.atk, 物防: c.enemy.pdef,
        技能: c.enemy.skills.map(skillText),
        状态: buffText(c.buffs.enemy)
      },
      玩家: {
        境界: s.realm, 生命: `${s.hp}/${this.store.effStat('maxHp')}`, 法力: `${s.mp}/${this.store.effStat('maxMp')}`,
        攻击: this.store.effStat('atk'), 物防: this.store.effStat('pdef'), 法防: this.store.effStat('mdef'),
        状态: buffText(c.buffs.player)
      }
    };
  }

  /** 战斗结束确认（UI 调用）：清理战斗状态 */
  dismiss() {
    if (this.c?.phase === 'over') this.store.set({ combat: null });
  }
}
