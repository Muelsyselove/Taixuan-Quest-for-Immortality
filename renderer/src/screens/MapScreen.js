// 地图模式主界面：三级导航状态机（大世界 → 区域 → 场景）+ 过场动画 + 布局整合
// 布局：左 个人面板｜中 主视图（地图/场景）｜右 游历状态 + 迷你大世界 + 史册
// 导航由 store.state.mapLocation 驱动：{ world, region, scene }
//   region == null        → 主视图 = 大世界地图
//   region 设且 scene 空  → 主视图 = 二级地图（区域/宗门内部）
//   scene 设              → 主视图 = 场景绘卷
import { Component, h, icon } from '../core/component.js';
import { SECTS, SCENES, NPCS } from '../core/mapData.js';
import { CharacterPanel } from '../components/CharacterPanel.js';
import { WorldMap } from '../components/WorldMap.js';
import { RegionMap } from '../components/RegionMap.js';
import { SceneView } from '../components/SceneView.js';
import { MapStatus } from '../components/MapStatus.js';
import { HistoryLog } from '../components/HistoryLog.js';
import { CombatOverlay } from '../components/CombatOverlay.js';
import { NpcDialog } from '../components/NpcDialog.js';
import { SectModal } from '../components/SectModal.js';
import { CultivateModal } from '../components/CultivateModal.js';
import { AlchemyModal } from '../components/AlchemyModal.js';
import { ShopModal } from '../components/ShopModal.js';
import { StockMarketModal } from '../components/StockMarketModal.js';
import { ExploreGrid } from '../components/ExploreGrid.js';
import { BreakthroughModal } from '../components/BreakthroughModal.js';
import { SettingsModal } from '../components/SettingsModal.js';
import { InventoryModal } from '../components/InventoryModal.js';
import { SkillsModal } from '../components/SkillsModal.js';
import { RelationsModal } from '../components/RelationsModal.js';
import { SaveLoadModal } from '../components/SaveLoadModal.js';
import { UsageModal } from '../components/UsageModal.js';

export class MapScreen extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { engine, combat, saves, mist, audio, char, onExit }
    this._kids = [];
    this._mainKid = null;   // 当前主视图组件
    this._miniKid = null;   // 迷你大世界组件
    this._level = null;     // 当前层级 world | region | scene
    this._npcDialog = null;
    this._transitioning = false;
  }

  render() {
    const tool = (key, label, ic, onClick) =>
      h('button', { class: 'gt-btn', 'data-t': key, title: label, onclick: onClick },
        icon(ic, 14), h('span', null, label));

    // 过场雾纱：切换主视图时淡入淡出
    this.veilEl = h('div', { class: 'map-veil' });
    this.mainEl = h('div', { class: 'map-main-stage' });
    this.miniEl = h('div', { class: 'map-mini-stage' });
    this.toastEl = h('div', { class: 'map-toast' });
    this.deadEl = h('div', { class: 'map-dead-host' });

    this.el = h('div', { class: 'screen map-screen' },
      h('div', { class: 'game-toolbar' },
        h('div', { class: 'gt-left' },
          tool('home', '主页', 'yinyang', () => this.props.onExit?.()),
          h('span', { class: 'gt-char' }, `${this.props.char?.name ?? ''} · 地图模式`)
        ),
        h('div', { class: 'gt-right' },
          tool('yinshi', '银市', 'talisman', () => this._openRemoteStock()),
          tool('saves', '存档', 'scroll', () => this._openSaves()),
          tool('relations', '关系', 'heart', () => new RelationsModal(this.store, { engine: this.props.engine }).mount(document.body)),
          tool('usage', '算盘', 'spark', () => new UsageModal(this.store, { engine: this.props.engine }).mount(document.body)),
          tool('ai', 'AI', 'talisman', () => new SettingsModal(this.store, { engine: this.props.engine }).mount(document.body))
        )
      ),
      h('main', { id: 'layout', class: 'map-layout' },
        h('div', { id: 'col-left' }),
        h('div', { id: 'col-center', class: 'map-center' }, this.mainEl, this.veilEl),
        h('div', { id: 'col-right', class: 'map-right' }, this.miniEl)
      ),
      this.toastEl,
      this.deadEl
    );
    return this.el;
  }

  afterMount() {
    const store = this.store;
    const $ = (sel) => this.el.querySelector(sel);
    const kid = (c, parent) => { c.mount(parent); this._kids.push(c); return c; };

    kid(new CharacterPanel(store, {
      onOpenSkills: () => new SkillsModal(store).mount(document.body),
      onOpenInventory: () => new InventoryModal(store).mount(document.body),
      onOpenRelations: () => new RelationsModal(store).mount(document.body)
    }), $('#col-left'));

    kid(new MapStatus(store, {
      onBreakthrough: () => new BreakthroughModal(store, { audio: this.props.audio }).mount(document.body)
    }), this.el.querySelector('.map-right'));

    kid(new HistoryLog(store), this.el.querySelector('.map-right'));

    // 战斗覆盖层（切磋/遭遇战）
    kid(new CombatOverlay(store, { combat: this.props.combat }), this.el);

    // 初始位置：新开局落足青云门山门外（主视图 = 大世界）
    if (!store.state.mapLocation) {
      store.setMapLocation({ world: 'qingyun', region: null, scene: null });
    }
    this._renderMain(false);
    this._renderMini();
    this._renderDead();

    // 外部状态变化（读档/陨落/进出探索）时同步视图
    this._unsubLoc = store.subscribe(['mapLocation'], () => this._renderMain(true));
    this._unsubExplore = store.subscribe(['explore'], () => this._renderMain(false));
    this._unsubDead = store.subscribe(['dead'], () => this._renderDead());
  }

  /* ==================== 三级导航状态机 ==================== */

  _levelOf() {
    const loc = this.store.state.mapLocation ?? {};
    if (loc.scene) return 'scene';
    if (loc.region) return 'region';
    return 'world';
  }

  /** 当前主视图种类：场景级若正探索格子地图则为 explore */
  _viewOf() {
    if (this._levelOf() === 'scene' && this.store.state.explore) return 'explore';
    return this._levelOf();
  }

  /** 主视图渲染（animate=true 时走过场动画） */
  _renderMain(animate) {
    if (this._transitioning) return; // 过场结束时会按最新状态补一次渲染，不会丢导航
    if (this._viewOf() === this._level && this._mainKid) { this._renderMini(); return; } // 同级移动仅刷新侧栏

    const swap = () => {
      if (!this.el.isConnected) return; // 切屏销毁后幽灵定时器不再换景
      // 换景时刻重读最新状态，避免用过场开始前捕获的旧位置渲染
      const view = this._viewOf();
      const loc = this.store.state.mapLocation ?? {};
      this._mainKid?.destroy();
      this._mainKid = null;
      this.mainEl.innerHTML = '';
      this._level = view;

      if (view === 'world') {
        this._mainKid = new WorldMap(this.store, {
          onEnterRegion: (id) => this._enterRegion(id)
        });
      } else if (view === 'region') {
        this._mainKid = new RegionMap(this.store, {
          regionId: loc.region,
          onEnterScene: (sceneId) => this._enterScene(sceneId),
          onBackWorld: () => this._backToWorld()
        });
      } else if (view === 'explore') {
        this._mainKid = new ExploreGrid(this.store, {
          sceneId: this.store.state.explore.sceneId,
          combat: this.props.combat,
          audio: this.props.audio,
          onToast: (t) => this._toast(t),
          onMerchant: () => new ShopModal(this.store, { merchant: true }).mount(document.body),
          onExit: () => this._renderMain(true)
        });
      } else {
        this._mainKid = new SceneView(this.store, {
          sceneId: loc.scene,
          onTalk: (npc) => this._talk(npc),
          onFacility: (key) => this._facility(key),
          onGather: () => this._gather(),
          onExit: () => this._exitScene()
        });
      }
      this._mainKid.mount(this.mainEl);
      this.mainEl.dataset.level = view; // CSS 按层级给不同入场动画
      this._renderMini();
    };

    if (!animate || !this._mainKid) { swap(); return; }
    // 过场：雾纱淡入 → 换景 → 雾纱淡出
    this._transitioning = true;
    this.veilEl.classList.add('on');
    this.props.audio?.click?.();
    this._transT1 = setTimeout(() => {
      swap();
      this.veilEl.classList.remove('on');
      this.veilEl.classList.add('off');
      this._transT2 = setTimeout(() => {
        this.veilEl.classList.remove('off');
        this._transitioning = false;
        // 过场期间被拦截的导航：状态与视图不一致时按最新状态补渲染
        if (this._viewOf() !== this._level) this._renderMain(true);
      }, 420);
    }, 260);
  }

  /** 迷你大世界：身处区域/场景时于侧栏展开（与大世界入场动画不同） */
  _renderMini() {
    const level = this._levelOf();
    const need = level !== 'world';
    if (need && !this._miniKid) {
      this.miniEl.innerHTML = '';
      this._miniKid = new WorldMap(this.store, {
        onEnterRegion: (id) => this._enterRegion(id)
      });
      this._miniKid.mount(this.miniEl);
      this._miniKid.el.classList.add('mini-world'); // 侧栏展开动画
    } else if (!need && this._miniKid) {
      this._miniKid.destroy();
      this._miniKid = null;
      this.miniEl.innerHTML = '';
    }
  }

  /* ---------- 导航动作 ---------- */

  /** 大世界节点点击：异地赶路（耗时1月）/ 原地直入区域 */
  _enterRegion(worldId) {
    const loc = this.store.state.mapLocation ?? {};
    if (loc.world === worldId && loc.region === worldId) return;
    if (loc.world === worldId) {
      this.store.setMapLocation({ world: worldId, region: worldId, scene: null });
      this._renderMain(true);
      return;
    }
    const res = this.store.travelTo(worldId);
    if (res.died) { this._renderMain(false); return; }
    if (res.moved) this.props.mist?.pulse?.();
    this._renderMain(true);
  }

  _enterScene(sceneId) {
    const loc = this.store.state.mapLocation ?? {};
    this.store.setMapLocation({ ...loc, scene: sceneId });
    this._renderMain(true);
  }

  _exitScene() {
    const loc = this.store.state.mapLocation ?? {};
    this.store.setMapLocation({ ...loc, scene: null });
    this._renderMain(true);
  }

  _backToWorld() {
    const loc = this.store.state.mapLocation ?? {};
    this.store.setMapLocation({ world: loc.world, region: null, scene: null });
    this._renderMain(true);
  }

  /* ==================== 场景交互 ==================== */

  /** 功能设施 → 对应系统 */
  _facility(key) {
    const store = this.store;
    const s = store.state;
    const loc = s.mapLocation ?? {};
    const scene = SCENES[loc.scene];
    switch (key) {
      case 'biguan':
        new CultivateModal(store, { place: scene?.name, audio: this.props.audio }).mount(document.body);
        break;
      case 'cangshu': {
        const r = store.mapStudy();
        if (!r.died) this._toast(r.learned ? `研读典籍，领悟【${r.learned}】` : '研读典籍一月，温故知新，修为 +30');
        break;
      }
      case 'liandan':
        new AlchemyModal(store).mount(document.body);
        break;
      case 'liangong': {
        const r = store.mapTrain();
        if (r.ok === false) this._toast(r.reason);
        else if (!r.died) this._toast('练功房苦练一月，攻防有所精进');
        break;
      }
      case 'leitai': this._duel(); break;
      case 'fangshi':
        // 坊市五铺并列：综合商店 / 草药房 / 丹药房 / 法宝阁 / 功法楼
        new ShopModal(store, {}).mount(document.body);
        break;
      case 'danfang':
        // 药铺：草药房 + 丹药房
        new ShopModal(store, { shops: ['herb', 'dan'], shop: 'herb' }).mount(document.body);
        break;
      case 'yinshi':
        // 银市交易行（就地操盘）
        new StockMarketModal(store, {}).mount(document.body);
        break;
      case 'qiju':
        store.mapRest();
        this._toast('安歇休整，气血法力尽复');
        this.props.audio?.chime?.();
        break;
      case 'menpai': {
        const sectId = loc.region;
        if (SECTS[sectId]) new SectModal(store, { sectId, audio: this.props.audio }).mount(document.body);
        break;
      }
    }
  }

  /** 擂台切磋：点到为止，不致死 */
  _duel() {
    const s = this.store.state;
    const loc = s.mapLocation ?? {};
    const scene = SCENES[loc.scene];
    // 优先以场景内擂台功能 NPC 为对手，否则生成同境幻影
    const npcId = scene?.npcs?.find(id => NPCS[id]?.function === 'leitai') ?? scene?.npcs?.[0];
    const npc = npcId ? NPCS[npcId] : null;
    const scale = 1 + s.realmIndex * 0.6;
    const enemy = npc
      ? { name: npc.name, desc: `${npc.identity} · 切磋较艺`, hp: Math.round(s.maxHp * 0.9), atk: Math.round(s.atk * 0.95), pdef: s.pdef, mdef: s.mdef, skills: [{ name: '试招', desc: '点到为止的一击', mult: 1.35 }] }
      : { name: '同门幻影', desc: '练功幻化出的对手', hp: Math.round(80 * scale), atk: Math.round(10 * scale), pdef: Math.round(4 * scale), mdef: Math.round(3 * scale), skills: [{ name: '试招', desc: '', mult: 1.3 }] };
    this.props.audio?.hit?.();
    this.props.combat.start({ enemy, playerFirst: true, spar: true });
  }

  /** 野外探寻：进入 10×10 探索格子地图（每步 2 月，离开重置） */
  _gather() {
    const store = this.store;
    const loc = store.state.mapLocation ?? {};
    if (!loc.scene) return;
    store.enterExplore(loc.scene); // explore 订阅会切换主视图为格子地图
    this.props.mist?.pulse?.();
  }

  /** 远程银市：持天慧符方可随时操盘，否则需亲赴银市 */
  _openRemoteStock() {
    const store = this.store;
    if (store.canRemoteStock()) {
      new StockMarketModal(store, { remote: true }).mount(document.body);
    } else {
      this._toast('需持【天慧符】方可远程操盘银市——或亲赴银市交易行');
    }
  }

  /** NPC 对话：AI 寒暄 + 固定话题 + 自由攀谈 */
  _talk(npc) {
    if (this._npcDialog) return;
    this.props.audio?.click?.();
    this._npcDialog = new NpcDialog(this.store, {
      npc,
      engine: this.props.engine,
      onClose: () => { this._npcDialog = null; },
      onAction: (action, n) => this._npcAction(action, n)
    });
    this._npcDialog.mount(document.body);
  }

  /** NPC 固定话题 → 对应功能 */
  _npcAction(action, npc) {
    const store = this.store;
    const loc = store.state.mapLocation ?? {};
    switch (action) {
      case 'quest':
      case 'join': {
        const sectId = npc.sect ?? loc.region;
        if (SECTS[sectId]) new SectModal(store, { sectId, audio: this.props.audio }).mount(document.body);
        break;
      }
      case 'alchemy': new AlchemyModal(store).mount(document.body); break;
      case 'shop':
        // 按 NPC 功能开店：药铺只营草药丹药，坊市五铺齐备
        if (npc.function === 'danfang') new ShopModal(store, { shops: ['herb', 'dan'], shop: 'herb' }).mount(document.body);
        else new ShopModal(store, {}).mount(document.body);
        break;
      case 'yinshi': new StockMarketModal(store, {}).mount(document.body); break;
      case 'duel': this._npcDialog?._close(); this._duel(); break;
      case 'train': {
        const r = store.mapTrain();
        if (r.ok === false) this._toast(r.reason);
        break;
      }
      case 'study': {
        const r = store.mapStudy();
        if (!r.died) this._toast(r.learned ? `研读典籍，领悟【${r.learned}】` : '研读典籍一月，修为 +30');
        break;
      }
      case 'cultivate':
        new CultivateModal(store, { place: SCENES[loc.scene]?.name, audio: this.props.audio }).mount(document.body);
        break;
      case 'rest':
        store.mapRest();
        this._toast('安歇休整，气血法力尽复');
        break;
    }
  }

  /* ==================== 陨落 / 读档 / 提示 ==================== */

  /** 寿元尽 → 陨落遮罩（地图模式终局） */
  _renderDead() {
    const dead = this.store.state.dead;
    this.deadEl.innerHTML = '';
    if (!dead) return;
    this.props.audio?.fall?.();
    this.deadEl.appendChild(
      h('div', { class: 'dead-mask' },
        h('div', { class: 'dead-card panel' },
          h('div', { class: 'dead-glyph' }, '殒'),
          h('div', { class: 'dead-title' }, '寿元已尽 · 坐化陨落'),
          h('p', { class: 'dead-text' }, `道友一生修行，止于${dead.at ? `第${dead.at.year}年${dead.at.month}月` : '此世'}。太玄大陆烟波浩渺，长生路上又多一抔黄土。`),
          h('div', { class: 'dead-actions' },
            h('button', { class: 'btn gold', onclick: () => this.props.onExit?.() }, '尘归尘土归土')
          )
        )
      )
    );
  }

  _openSaves() {
    const { saves, char } = this.props;
    new SaveLoadModal(this.store, {
      saves,
      onLoad: () => {
        // 读档后：位置域已恢复，重绘主视图（跨模式存档由 main.js 入口分发兜底）
        if (!this.store.state.mapLocation) {
          this.store.setMapLocation({ world: 'qingyun', region: null, scene: null });
        }
        this._level = null;
        this._renderMain(false);
        this._renderDead();
      },
      onRestart: async () => {
        const rec = await window.taixuan.chars.read(char.id).catch(() => null);
        this.store.reset(rec?.setup || {});
        this.store.set({ mode: 'map' });
        this.store.setMapLocation({ world: 'qingyun', region: null, scene: null });
        this._level = null;
        this._renderMain(false);
        saves.autoSave();
      }
    }).mount(document.body);
  }

  /** 轻提示：底部浮签，2.4s 自隐 */
  _toast(text) {
    if (!text) return;
    const el = h('div', { class: 'map-toast-item' }, text);
    this.toastEl.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2000);
    setTimeout(() => el.remove(), 2500);
  }

  destroy() {
    clearTimeout(this._transT1);
    clearTimeout(this._transT2);
    this._unsubLoc?.();
    this._unsubExplore?.();
    this._unsubDead?.();
    this._mainKid?.destroy();
    this._miniKid?.destroy();
    this._npcDialog?.destroy();
    for (const k of this._kids) k.destroy?.();
    this._kids = [];
    super.destroy();
  }
}
