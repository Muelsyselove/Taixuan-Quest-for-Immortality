// 人物关系谱：姓名 / 身份 / 关系 / 好感度（-100 ~ 100 双色量条）
// V2.4：持天慧符可与任何已结识之人远程传讯（仅对话）；
//       祭炼天慧通灵宝后可设「自动嘘寒问暖」（好感窗口一到即代为传讯）。
import { Modal } from '../ui/Modal.js';
import { EmptyState, Toggle } from '../ui/controls.js';
import { h, icon } from '../core/component.js';
import { NPCS } from '../core/mapData.js';
import { NpcDialog } from './NpcDialog.js';

const TIERS = [
  { min: 80, label: '生死至交', color: '#f4d98c' },
  { min: 40, label: '意气相投', color: '#d8b25c' },
  { min: 10, label: '友善', color: '#7fb3a8' },
  { min: -9, label: '萍水相逢', color: '#9a937f' },
  { min: -39, label: '心生嫌隙', color: '#c08a5a' },
  { min: -79, label: '势同水火', color: '#e35d6a' },
  { min: -100, label: '不共戴天', color: '#ff4d5e' }
];
const tierOf = (v) => TIERS.find(t => v >= t.min);

/** 由关系记录还原 NPC 档案（远程传讯用；无档者拟一介散修形象） */
function npcOf(rel) {
  const found = Object.values(NPCS).find(n => n.name === rel.name);
  return found ?? {
    id: `rel-${rel.name}`, name: rel.name, identity: rel.identity,
    gender: 'male', relation: rel.relation, affinity: rel.affinity,
    function: null, personality: '高深莫测', likes: '未明'
  };
}

export class RelationsModal extends Modal {
  get modalTitle() { return '人物关系谱'; }
  get modalIcon() { return 'yinyang'; }
  get modalClass() { return 'relations-modal'; }

  watch() { return ['relations', 'tianhui', 'relationChatAt']; }

  body() {
    this.headEl = h('div', { class: 'rel-tianhui' });
    this.listEl = h('div', { class: 'rel-list' });
    return [this.headEl, this.listEl];
  }

  afterMount() { this.update(); }

  update() {
    const s = this.store.state;
    const th = s.tianhui;

    // 天慧符功能区：通灵宝 → 自动嘘寒问暖开关
    this.headEl.innerHTML = '';
    if (th?.tongling) {
      this.headEl.appendChild(h('div', { class: 'rel-tianhui-row' },
        icon('talisman', 14),
        h('span', { class: 'rel-tianhui-label' }, '天慧通灵 · 自动嘘寒问暖'),
        Toggle({
          checked: !!th.autoGreet,
          onChange: (on) => this.store.setAutoGreet(on)
        }),
        h('span', { class: 'rel-tianhui-tip' }, '好感窗口一到，即代为向诸位故人传讯问安')
      ));
    } else if (th?.owned) {
      this.headEl.appendChild(h('div', { class: 'rel-tianhui-row dim' },
        icon('talisman', 14),
        h('span', { class: 'rel-tianhui-tip' }, '天慧符已解锁远程传讯；祭炼天慧通灵宝后可自动嘘寒问暖')
      ));
    }

    const list = [...s.relations].sort((a, b) => b.affinity - a.affinity);
    this.listEl.innerHTML = '';
    if (!list.length) {
      this.listEl.appendChild(EmptyState({ text: '江湖偌大，尚未结识任何人。', sub: '剧情中登场的人物会自动登记在此' }));
      return;
    }
    for (const r of list) this.listEl.appendChild(this._card(r, !!th?.owned));
  }

  _card(r, canRemote) {
    const tier = tierOf(r.affinity);
    const pct = Math.abs(r.affinity); // 量条长度
    const positive = r.affinity >= 0;
    const chatOpen = canRemote && this.store.canChatAffinity?.(r.name);
    return h('div', { class: 'rel-card' },
      h('div', { class: 'rel-head' },
        h('b', { class: 'rel-name' }, r.name),
        h('span', { class: 'rel-tier', style: { color: tier.color, borderColor: tier.color } }, tier.label)
      ),
      h('div', { class: 'rel-meta' },
        h('span', { class: 'rel-identity' }, r.identity),
        h('i', { class: 'rel-divider' }, '·'),
        h('span', { class: 'rel-relation' }, r.relation)
      ),
      h('div', { class: 'rel-bar' },
        h('span', { class: 'rel-bar-mid' }),
        h('span', {
          class: `rel-bar-fill ${positive ? 'pos' : 'neg'}`,
          style: {
            [positive ? 'left' : 'right']: '50%',
            width: `${pct / 2}%`,
            background: tier.color
          }
        }),
        h('span', { class: 'rel-bar-val', style: { color: tier.color } }, String(r.affinity))
      ),
      h('div', { class: 'rel-foot' },
        h('span', { class: 'rel-day' }, `第${r.day}日相识`),
        canRemote ? h('button', {
          class: 'rel-chat-btn',
          title: chatOpen ? '天慧传讯——自由对话可增好感' : '天慧传讯（好感窗口未至，仍可亲话家常）',
          onclick: () => this._remoteChat(r)
        }, icon('send', 12), chatOpen ? '传讯 · 可增好感' : '传讯') : null
      )
    );
  }

  /** 天慧符远程传讯：仅对话，无实际功能 */
  _remoteChat(r) {
    if (!this.props.engine) return;
    new NpcDialog(this.store, {
      npc: npcOf(r),
      engine: this.props.engine,
      remote: true
    }).mount(document.body);
  }
}
