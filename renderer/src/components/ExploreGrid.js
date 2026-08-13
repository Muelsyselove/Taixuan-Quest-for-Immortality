// 探索格子地图（V2.4）：10×10 迷雾格阵
// 玩家初始左下角，右上角为区域入口；空地/战斗/采集/奇遇/云游商人各有效果。
// 每行进一步耗时 2 月；战斗格未清除不可越过（不胜则被拦回原地）；
// 离开不记录位置，下次进入重置。
import { Component, h, icon } from '../core/component.js';
import { SCENES } from '../core/mapData.js';
import { EXPLORE_CELLS, rollExploreEnemy } from '../core/explore.js';
import { TIME_COST } from '../core/time.js';

// 格子类型 → 样式类与色泽
const CELL_CLS = {
  empty:    { cls: 't-empty',    color: '#9a937f' },
  battle:   { cls: 't-battle',   color: '#e35d6a' },
  gather:   { cls: 't-gather',   color: '#6fcf7f' },
  qiyu:     { cls: 't-qiyu',     color: '#b07fe8' },
  merchant: { cls: 't-merchant', color: '#e8a34f' },
  exit:     { cls: 't-exit',     color: '#f4d98c' }
};

export class ExploreGrid extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { sceneId, combat, audio, onExit(), onToast(text), onMerchant() }
    this._battle = null;  // 进行中的格子战斗 { x, y, prev }
    this._busy = false;   // 格子事件处理中（锁移动）
  }

  watch() { return ['explore', 'combat', 'dead']; }

  render() {
    this.gridEl = h('div', { class: 'ex-grid' });
    this.headEl = h('div', { class: 'ex-head' });
    this.tipEl = h('div', { class: 'ex-tip' });

    const legend = h('div', { class: 'ex-legend' },
      Object.values(EXPLORE_CELLS).map(def =>
        h('span', { class: 'ex-legend-item' },
          h('i', { class: `ex-cell-ico ${CELL_CLS[def.key].cls}` }, def.glyph),
          def.label))
    );

    this.el = h('section', { class: 'panel explore-panel' },
      this.headEl,
      h('div', { class: 'ex-stage' },
        h('div', { class: 'ex-mist' }),
        this.gridEl
      ),
      this.tipEl,
      legend,
      h('div', { class: 'ex-actions' },
        h('button', {
          class: 'btn ghost',
          onclick: () => this._leave()
        }, icon('send', 14), '离开此地（探寻进度不存档，再入重置）')
      )
    );
    return this.el;
  }

  afterMount() {
    // 进入探索：同场景续探复用，否则生成新格阵
    this.store.enterExplore(this.props.sceneId);
    // 监听战斗落幕：胜负决定格子去留
    this._unsubCombat = this.store.subscribe(['combat'], () => this._onCombatOver());
    this.update();
  }

  update() {
    const ex = this.store.state.explore;
    const scene = SCENES[this.props.sceneId];
    this._renderHead(ex, scene);
    this._renderGrid(ex);
  }

  /* ---------------- 头部信息 ---------------- */
  _renderHead(ex, scene) {
    this.headEl.innerHTML = '';
    if (!ex) return;
    const done = ex.done;
    this.headEl.append(
      h('div', { class: 'ex-title' },
        icon('lotus', 15),
        h('b', null, `${scene?.name ?? ''} · 深处探寻`),
        done ? h('span', { class: 'ex-done-tag' }, '此行圆满') : null
      ),
      h('div', { class: 'ex-sub' }, `每行进一步耗时 ${TIME_COST.exploreStep} 月 · 战斗格未清剿不可越过 · 出口在右上`)
    );
  }

  /* ---------------- 格阵 ---------------- */
  _renderGrid(ex) {
    if (!ex) {
      this.gridEl.innerHTML = '';
      this._cells = null;
      this.gridEl.appendChild(h('div', { class: 'inv-empty' }, '雾霭散尽，探寻已了。'));
      return;
    }
    const { size, cells, player } = ex;
    // 首次渲染创建并缓存全部格子节点；后续状态推送仅就地更新 class/文本
    if (!this._cells || this._cells.length !== size * size) {
      this.gridEl.innerHTML = '';
      this._cells = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const ico = h('span', { class: 'ex-fog-dot' }, '？');
          const btn = h('button', { class: 'ex-cell', onclick: () => this._tap(x, y) }, ico);
          this._cells.push({ btn, ico, x, y });
          this.gridEl.appendChild(btn);
        }
      }
    }
    for (const c of this._cells) this._paintCell(ex, cells[c.y][c.x], c);
    // 提示
    const cell = cells[player.y][player.x];
    const def = EXPLORE_CELLS[cell.type] ?? EXPLORE_CELLS.empty;
    this.tipEl.innerHTML = '';
    if (ex.done) {
      this.tipEl.appendChild(h('span', { class: 'ex-tip-done' }, '已抵达区域入口——点击「离开此地」结束此次探寻。'));
    } else if (cell.type === 'merchant' && !this._busy) {
      this.tipEl.append(
          h('span', null, '云游商人在此歇脚，担上皆是坊市难寻的珍品。'),
          h('button', { class: 'btn gold sm ex-trade-btn', onclick: () => this.props.onMerchant?.() }, '与商人交易')
      );
    } else {
      this.tipEl.appendChild(h('span', null, `脚下：${def.label}——${def.desc}`));
    }
  }

  /** 就地更新单个缓存格子的样式与文本 */
  _paintCell(ex, cell, c) {
    const { player } = ex;
    const { btn, ico, x, y } = c;
    const isPlayer = player.x === x && player.y === y;
    const seen = cell.visited;
    const def = EXPLORE_CELLS[cell.type] ?? EXPLORE_CELLS.empty;
    const style = CELL_CLS[cell.type] ?? CELL_CLS.empty;
    const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
    const adjacent = dist === 1;
    const blocked = cell.type === 'battle' && !cell.cleared;

    const cls = ['ex-cell', style.cls];
    if (!seen) cls.push('fog');
    if (isPlayer) cls.push('here');
    if (cell.cleared) cls.push('cleared');
    if (adjacent && seen && !ex.done && !this._busy) cls.push('reachable');
    if (cell.type === 'exit') cls.push('exit-cell');
    btn.className = cls.join(' ');
    btn.title = !seen ? '迷雾未散' : blocked ? `${def.label}——未清剿，踏入即战` : `${def.label}——${def.desc}`;

    if (isPlayer) {
      ico.className = 'ex-player';
      ico.textContent = '我';
      ico.style.color = '';
    } else if (seen) {
      ico.className = `ex-cell-ico ${style.cls}`;
      ico.style.color = style.color;
      ico.textContent = cell.cleared && cell.type !== 'exit' ? '✓' : def.glyph;
    } else {
      ico.className = 'ex-fog-dot';
      ico.textContent = '？';
      ico.style.color = '';
    }
  }

  /* ---------------- 移动与格子事件 ---------------- */
  _tap(x, y) {
    const ex = this.store.state.explore;
    if (!ex || ex.done || this._busy) return;
    if (this.store.state.combat) return; // 战斗中锁盘
    const dist = Math.abs(x - ex.player.x) + Math.abs(y - ex.player.y);
    if (dist !== 1) {
      this.props.onToast?.('只能移向相邻的格子');
      return;
    }
    const r = this.store.exploreMove(x, y);
    if (!r.ok) { this.props.onToast?.(r.reason); return; }
    if (r.died) return; // 寿元尽，陨落遮罩兜底
    this.props.audio?.click?.();
    this._enterCell(r.cell, x, y, r.prev);
  }

  _enterCell(cell, x, y, prev) {
    switch (cell.type) {
      case 'battle':
        if (!cell.cleared) this._startBattle(x, y, prev);
        break;
      case 'gather':
        if (!cell.cleared) {
          const r = this.store.exploreGather();
          this.store.clearExploreCell(x, y);
          this.props.onToast?.(`采集灵草：${r.text}`);
          this.props.audio?.chime?.();
        }
        break;
      case 'qiyu':
        if (!cell.cleared) {
          const r = this.store.exploreQiyu();
          if (r.kind === 'combat') {
            this.props.onToast?.(r.text);
            this._startBattle(x, y, prev);
          } else {
            this.store.clearExploreCell(x, y);
            this.props.onToast?.(`奇遇：${r.text}`);
            this.props.audio?.chime?.();
          }
        }
        break;
      case 'merchant':
        // 商人常驻，可反复交易（tip 区出现交易按钮）
        this.props.audio?.chime?.();
        break;
      case 'exit': {
        // 抵达区域入口：本次探索圆满，赠予机缘
        const silver = 120 + Math.floor(Math.random() * 240);
        this.store.gainWealth({ silver });
        this.store.completeExplore();
        this.props.onToast?.(`抵达区域入口，探寻圆满——拾得遗珠 ${silver} 银元`);
        this.props.audio?.chime?.();
        break;
      }
    }
  }

  /* ---------------- 战斗接线 ---------------- */
  _startBattle(x, y, prev) {
    const enemy = rollExploreEnemy(this.props.sceneId, this.store.state.realmIndex);
    this._battle = { x, y, prev };
    this.props.audio?.hit?.();
    this.props.combat.start({ enemy, playerFirst: Math.random() < 0.6 });
  }

  _onCombatOver() {
    const c = this.store.state.combat;
    if (!this._battle) return;
    if (!c || c.phase !== 'over') return;
    const { x, y, prev } = this._battle;
    this._battle = null;
    if (c.result === 'win') {
      this.store.clearExploreCell(x, y);
      this.props.onToast?.('妖邪伏诛，此格已清——可通行无阻');
    } else {
      // 败走/遁走：被拦回原地（无法越过战斗节点）
      this.store.exploreBounce(prev);
      this.props.onToast?.('未能胜过妖邪，被拦回原地');
    }
  }

  _leave() {
    if (this.store.state.combat) return;
    this.store.exitExplore();
    this.props.onExit?.();
  }

  destroy() {
    this._unsubCombat?.();
    super.destroy();
  }
}
