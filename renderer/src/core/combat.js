// 战斗引擎：系统驱动的回合制战斗
// 触发：AI 在事件 JSON 中给出 combat 信号（敌人信息 + 先手权）→ 系统接管流程
// 敌方行动：每回合由 AI 代理决策（未配置 AI 时用本地策略兜底）
import { CONFIG } from './config.js';

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
    this.store.set({
      combat: {
        enemy,
        playerFirst,
        round: 1,
        phase: playerFirst ? 'player' : 'enemy',
        buffs: { player: [], enemy: [] },
        log: [{ side: 'sys', text: `遭遇【${enemy.name}】——${enemy.desc}${playerFirst ? '你抢得先机！' : '对方来势汹汹，抢先出手！'}` }],
        result: null
      }
    });
    this.store.pushHistory(`与【${enemy.name}】狭路相逢，战！`, 'combat');

    if (!playerFirst) this._enemyTurn();
  }

  _end(result) {
    const c = this.c;
    this.store.set({ combat: { ...c, phase: 'over', result } });
    const s = this.store.state;

    if (result === 'win') {
      const gain = Math.round(c.enemy.maxHp * 0.35 + c.enemy.atk * 2);
      this.store.pushHistory(`力挫【${c.enemy.name}】，修为 +${gain}`, 'combat');
      this.store.applyEffects({ cultivation: gain });
      // 战利品：本地掉落表掷骰
      const loot = this._rollLoot();
      if (loot) this.store.addItem(loot);
    } else if (result === 'lose') {
      this.store.pushHistory(`不敌【${c.enemy.name}】，重伤遁走`, 'death');
      this.store.applyEffects({ hp: -s.maxHp }); // 触发轮回判定
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

  /* ================= 数值结算 ================= */

  _buffsOf(side) { return this.c.buffs[side]; }

  _atkMult(side) {
    return 1 + 0.3 * this._buffsOf(side).filter(b => b.kind === 'atkUp').length;
  }

  _defBonus(side) {
    return 1 + 0.3 * this._buffsOf(side).filter(b => b.kind === 'defUp').length;
  }

  _isGuarding(side) {
    return this._buffsOf(side).some(b => b.kind === 'guard');
  }

  _isStunned(side) {
    return this._buffsOf(side).some(b => b.kind === 'stun');
  }

  /** 回合开始结算：毒/回复/状态倒计时 */
  _tickStart(side) {
    const c = this.c;
    const buffs = [...c.buffs[side]];
    const isPlayer = side === 'player';
    let hpDelta = 0;
    const maxHp = isPlayer ? this.store.state.maxHp : c.enemy.maxHp;

    for (const b of buffs) {
      if (b.kind === 'poison') {
        hpDelta -= Math.max(1, Math.round(maxHp * 0.05));
        this._log(side, `【${isPlayer ? '你' : c.enemy.name}】毒发，损失生命`);
      }
      if (b.kind === 'regen') {
        hpDelta += Math.max(1, Math.round(maxHp * 0.04));
        this._log(side, `【${isPlayer ? '你' : c.enemy.name}】气血回涌`);
      }
      b.turns -= 1;
    }
    // guard 只持续到下次行动
    const remain = buffs.filter(b => b.turns > 0 && b.kind !== 'guard');
    const guards = buffs.filter(b => b.kind === 'guard' && b.turns > 0);

    if (hpDelta) {
      if (isPlayer) this.store.applyEffects({ hp: hpDelta });
      else this._hurtEnemy(-hpDelta);
    }
    this.store.set({ combat: { ...this.c, buffs: { ...this.c.buffs, [side]: [...remain, ...guards] } } });
  }

  _calcDamage({ atk, mult }, defSide) {
    const c = this.c;
    const isPlayerDef = defSide === 'player';
    const defStat = isPlayerDef ? this.store.effStat('pdef') : c.enemy.pdef;
    const def = defStat * this._defBonus(defSide);
    let dmg = Math.max(1, Math.round(atk * mult - def * 0.8));
    let crit = false;
    if (Math.random() < CONFIG.combat.critChance) {
      dmg = Math.round(dmg * CONFIG.combat.critMult);
      crit = true;
    }
    if (this._isGuarding(defSide)) {
      dmg = Math.max(1, Math.round(dmg * CONFIG.combat.guardReduce));
      // 格挡生效一次即消
      this.store.set({
        combat: {
          ...this.c,
          buffs: { ...this.c.buffs, [defSide]: this.c.buffs[defSide].filter(b => b.kind !== 'guard') }
        }
      });
    }
    return { dmg, crit };
  }

  _hurtEnemy(dmg) {
    const c = this.c;
    const hp = Math.max(0, c.enemy.hp - dmg);
    this.store.set({ combat: { ...c, enemy: { ...c.enemy, hp } } });
    return hp <= 0;
  }

  _log(side, text) {
    const c = this.c;
    this.store.set({ combat: { ...c, log: [...c.log, { side, text }] } });
  }

  _checkEnd() {
    const c = this.c;
    if (!c || c.phase === 'over') return true;
    if (c.enemy.hp <= 0) { this._end('win'); return true; }
    if (this.store.state.hp <= 0) { this._end('lose'); return true; }
    return false;
  }

  /* ================= 我方行动 ================= */

  /** @param action {type:'attack'|'skill'|'item'|'guard'|'flee', skill?, itemId?} */
  async playerAction(action) {
    const c = this.c;
    if (!c || c.phase !== 'player') return;
    const s = this.store.state;

    this._tickStart('player');
    if (this._checkEnd()) return;

    if (this._isStunned('player')) {
      this._log('sys', '你头晕目眩，无法行动！');
      this.store.set({ combat: { ...this.c, buffs: { ...this.c.buffs, player: this.c.buffs.player.filter(b => b.kind !== 'stun') } } });
    } else {
      switch (action.type) {
        case 'attack': {
          const { dmg, crit } = this._calcDamage({ atk: this.store.effStat('atk') * this._atkMult('player'), mult: 1 }, 'enemy');
          this._hurtEnemy(dmg);
          this._log('player', `你挥刃直取，造成 ${dmg} 点伤害${crit ? '（会心一击！）' : ''}`);
          break;
        }
        case 'skill': {
          const sk = action.skill;
          if (!sk || s.mp < (sk.cost ?? 10)) { this._log('sys', '法力不足，技能施展失败！'); return; }
          this.store.applyEffects({ mp: -(sk.cost ?? 10) });
          const { dmg, crit } = this._calcDamage({ atk: this.store.effStat('atk') * this._atkMult('player'), mult: sk.mult ?? 1.5 }, 'enemy');
          this._hurtEnemy(dmg);
          this._log('player', `你掐诀施展【${sk.name}】，灵光暴涨，造成 ${dmg} 点伤害${crit ? '（会心一击！）' : ''}`);
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
          this.store.set({
            combat: { ...this.c, buffs: { ...this.c.buffs, player: [...this.c.buffs.player, { kind: 'guard', turns: 99 }] } }
          });
          this._log('player', '你沉腰立马，凝神格挡');
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
    if (this._isStunned('enemy')) {
      decision = { action: 'none', narration: `【${c.enemy.name}】被定住身形，动弹不得` };
      this.store.set({ combat: { ...this.c, buffs: { ...this.c.buffs, enemy: this.c.buffs.enemy.filter(b => b.kind !== 'stun') } } });
    } else {
      decision = await this.ai.decideEnemyAction(this._combatSnapshot());
    }

    const e = c.enemy;
    switch (decision.action) {
      case 'skill': {
        const sk = e.skills.find(x => x.name === decision.skill) || e.skills[0];
        const { dmg, crit } = this._calcDamage({ atk: e.atk * this._atkMult('enemy'), mult: sk.mult ?? 1.4 }, 'player');
        this.store.applyEffects({ hp: -dmg });
        this._log('enemy', decision.narration || `【${e.name}】施展【${sk.name}】，你受 ${dmg} 点伤害${crit ? '（会心！）' : ''}`);
        break;
      }
      case 'guard': {
        this.store.set({
          combat: { ...this.c, buffs: { ...this.c.buffs, enemy: [...this.c.buffs.enemy, { kind: 'guard', turns: 99 }] } }
        });
        this._log('enemy', decision.narration || `【${e.name}】收势凝神，摆出守御之姿`);
        break;
      }
      case 'none':
        this._log('enemy', decision.narration || '');
        break;
      case 'attack':
      default: {
        const { dmg, crit } = this._calcDamage({ atk: e.atk * this._atkMult('enemy'), mult: 1 }, 'player');
        this.store.applyEffects({ hp: -dmg });
        this._log('enemy', decision.narration || `【${e.name}】扑击而来，你受 ${dmg} 点伤害${crit ? '（会心！）' : ''}`);
      }
    }

    if (this._checkEnd()) return;
    // 回合推进
    this.store.set({ combat: { ...this.c, round: this.c.round + 1, phase: 'player' } });
  }

  _combatSnapshot() {
    const c = this.c;
    const s = this.store.state;
    const buffText = (arr) => arr.map(b => `${CONFIG.combat.buffKinds[b.kind]?.label}(${b.turns > 90 ? '本回合' : b.turns + '回合'})`).join('、') || '无';
    return {
      回合: c.round,
      敌方: {
        名称: c.enemy.name, 生命: `${c.enemy.hp}/${c.enemy.maxHp}`,
        攻击: c.enemy.atk, 物防: c.enemy.pdef,
        技能: c.enemy.skills.map(x => `${x.name}(倍率${x.mult})`),
        状态: buffText(c.buffs.enemy)
      },
      玩家: {
        境界: s.realm, 生命: `${s.hp}/${s.maxHp}`, 法力: `${s.mp}/${s.maxMp}`,
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
