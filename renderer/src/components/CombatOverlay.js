// 战斗界面：全屏覆盖层，回合制交锋
import { Component, h, icon } from '../core/component.js';
import { buffLabel, buffColor, effectText, EFFECTS } from '../core/fx.js';
import { describeActive } from '../core/skills.js';

export class CombatOverlay extends Component {
  constructor(store, props) {
    super(store, props);
    // props.combat: CombatEngine
    this.mode = 'root'; // root | skill | item
  }

  watch() { return ['combat', 'hp', 'mp', 'items']; }

  render() {
    // 初始隐藏：无战斗时不拦截页面交互（update 会在战斗状态变化时切换显示）
    const mask = h('div', { class: 'combat-mask', style: { display: 'none' } });
    this.el = mask;
    return mask;
  }

  update() {
    const c = this.store.state.combat;
    if (!c) {
      this.el.style.display = 'none';
      this.el.innerHTML = '';
      return;
    }
    this.el.style.display = '';
    this.mode = 'root';
    this._render();
  }

  _render() {
    const c = this.store.state.combat;
    const s = this.store.state;
    const over = c.phase === 'over';

    this.el.innerHTML = '';
    this.el.appendChild(
      h('div', { class: 'combat-stage' },
        // 顶部：回合与先手
        h('div', { class: 'combat-top' },
          h('span', { class: 'combat-round' }, `第 ${c.round} 回合`),
          h('span', { class: 'combat-first' }, c.playerFirst ? '我方先手' : '敌方先手'),
          h('span', { class: 'combat-phase' }, over ? '战斗结束' : (c.phase === 'player' ? '轮到你行动' : '敌方行动中…'))
        ),

        // 对阵区
        h('div', { class: 'combat-arena' },
          this._fighter({
            name: s.name, sub: `${s.realm} · ${s.realmIndex + 1}重天`,
            hp: s.hp, maxHp: s.maxHp, mp: s.mp, maxMp: s.maxMp,
            buffs: c.buffs.player, side: 'player'
          }),
          h('div', { class: 'combat-vs', html: '<svg viewBox="0 0 60 60" width="54" height="54"><circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5"/><text x="30" y="39" text-anchor="middle" font-size="22" fill="currentColor" font-family="serif">斗</text></svg>' }),
          this._fighter({
            name: c.enemy.name, sub: c.enemy.desc,
            hp: c.enemy.hp, maxHp: c.enemy.maxHp,
            buffs: c.buffs.enemy, side: 'enemy'
          })
        ),

        // 战报
        h('div', { class: 'combat-log' },
          c.log.slice(-6).map(entry =>
            h('div', { class: `combat-log-line side-${entry.side}` }, entry.text)
          )
        ),

        // 行动区
        over
          ? h('div', { class: 'combat-actions' },
              h('div', { class: `combat-result res-${c.result}` },
                { win: '胜 · 敌已伏诛', lose: '败 · 重伤遁走', flee: '走 · 脱身而去' }[c.result]
              ),
              h('button', { class: 'btn gold', onclick: () => this.props.combat.dismiss() }, '收起战局')
            )
          : h('div', { class: 'combat-actions' },
              this._actionBar(c)
            )
      )
    );

    // 战报滚到底
    const log = this.el.querySelector('.combat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  _fighter({ name, sub, hp, maxHp, mp, maxMp, buffs, side }) {
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    return h('div', { class: `fighter fighter-${side}` },
      h('div', { class: 'fighter-name' }, name),
      h('div', { class: 'fighter-sub' }, sub),
      h('div', { class: 'fighter-bar' },
        h('span', { class: 'fighter-bar-fill hp', style: { width: `${pct}%` } })
      ),
      h('div', { class: 'fighter-hp' }, `${Math.max(0, hp)} / ${maxHp}`),
      mp != null ? h('div', { class: 'fighter-bar mp-bar' },
        h('span', { class: 'fighter-bar-fill mp', style: { width: `${Math.max(0, (mp / maxMp) * 100)}%` } })
      ) : null,
      buffs.length
        ? h('div', { class: 'fighter-buffs' },
            buffs.map(b => {
              const color = buffColor(b);
              const fxTip = (b.effects || []).map(e => `${EFFECTS[e.key]?.label ?? e.key}：${effectText(e)}`).join('；');
              return h('span', { class: 'buff-chip', style: { color, borderColor: color }, title: `${b.name}——${fxTip}` },
                buffLabel(b));
            })
          )
        : h('div', { class: 'fighter-buffs empty' }, '无状态')
    );
  }

  _actionBar(c) {
    const s = this.store.state;
    const disabled = c.phase !== 'player';
    const act = (action) => {
      if (disabled) return;
      this.props.combat.playerAction(action);
    };

    if (this.mode === 'skill') {
      return h('div', { class: 'combat-sub' },
        s.activeSkills.map(sk => h('button', {
          class: 'combat-btn',
          disabled: disabled || s.mp < (sk.cost ?? 10) ? 'disabled' : null,
          title: describeActive(sk),
          onclick: () => act({ type: 'skill', skill: sk })
        }, `${sk.name}（耗蓝${sk.cost ?? 10}）`)),
        h('button', { class: 'combat-btn back', onclick: () => { this.mode = 'root'; this._render(); } }, '← 返回')
      );
    }
    if (this.mode === 'item') {
      const usable = s.items.filter(i => i.usable);
      return h('div', { class: 'combat-sub' },
        usable.length
          ? usable.map(it => h('button', {
              class: 'combat-btn',
              disabled: disabled ? 'disabled' : null,
              onclick: () => act({ type: 'item', itemId: it.id })
            }, `${it.name}（${it.effect}）`))
          : h('div', { class: 'inv-empty' }, '无可用物品'),
        h('button', { class: 'combat-btn back', onclick: () => { this.mode = 'root'; this._render(); } }, '← 返回')
      );
    }
    return h('div', { class: 'combat-root-actions' },
      h('button', { class: 'combat-btn', disabled: disabled ? 'disabled' : null, onclick: () => act({ type: 'attack' }) }, '攻击'),
      h('button', { class: 'combat-btn', disabled: disabled ? 'disabled' : null, onclick: () => { this.mode = 'skill'; this._render(); } }, '技能'),
      h('button', { class: 'combat-btn', disabled: disabled ? 'disabled' : null, onclick: () => { this.mode = 'item'; this._render(); } }, '物品'),
      h('button', { class: 'combat-btn', disabled: disabled ? 'disabled' : null, onclick: () => act({ type: 'guard' }) }, '防御'),
      h('button', { class: 'combat-btn rest', disabled: disabled ? 'disabled' : null, onclick: () => act({ type: 'rest' }) }, '静息'),
      h('button', { class: 'combat-btn flee', disabled: disabled ? 'disabled' : null, onclick: () => act({ type: 'flee' }) }, '遁走')
    );
  }
}
