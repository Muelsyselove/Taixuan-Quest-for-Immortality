// NPC 对话面板：AI 打招呼（首句）+ 固定话题（功能快捷）+ 自由输入
// V2.4：自由对话好感——与已结识 NPC 自由攀谈，每隔 3 个月好感 +2（仅自由对话）；
//       持天慧符可远程传讯（仅对话，无实际功能）。
import { h, icon } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { FACILITY_TYPES } from '../core/mapData.js';

// 功能 → 固定话题（点击进入对应系统）
const FUNCTION_TOPICS = {
  menpai:   [{ key: 'quest', label: '宗门事务' }, { key: 'join', label: '拜入宗门' }],
  liandan:  [{ key: 'alchemy', label: '请教炼丹' }],
  danfang:  [{ key: 'shop', label: '看看丹药' }],
  fangshi:  [{ key: 'shop', label: '看看货物' }],
  leitai:   [{ key: 'duel', label: '请教切磋' }],
  liangong: [{ key: 'train', label: '演武修行' }],
  cangshu:  [{ key: 'study', label: '研读典籍' }],
  biguan:   [{ key: 'cultivate', label: '闭关修炼' }],
  qiju:     [{ key: 'rest', label: '稍作休息' }],
  yinshi:   [{ key: 'yinshi', label: '银市行情' }]
};

// 定制布局（npc-mask/npc-dialog），保留自有 DOM，仅继承基类的 Esc 关闭与单例守卫
export class NpcDialog extends Modal {
  constructor(store, props) {
    super(store, props);
    // props: { npc, engine, remote?: boolean, onAction(actionKey, npc), onClose() }
    this.log = []; // { from:'npc'|'player'|'sys', text }
    this.thinking = false;
  }

  render() {
    const npc = this.props.npc;
    const remote = !!this.props.remote;
    this.logEl = h('div', { class: 'npc-log' });
    this.affinityEl = h('span', { class: 'npc-affinity' }, `好感 ${this._affinity()}`);
    this.inputEl = h('input', {
      class: 'npc-input', type: 'text', maxlength: 60,
      placeholder: remote ? '天慧传讯，随意攀谈……' : '随意攀谈……（每 3 个月自由对话可增好感）'
    });
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._send();
    });

    const fn = npc.function ? FACILITY_TYPES[npc.function] : null;
    // 远程传讯仅限对话，不提供实际功能话题
    const topics = remote ? [] : (FUNCTION_TOPICS[npc.function] ?? []);
    const chatOpen = this.store.canChatAffinity?.(npc.name);

    this.el = h('div', { class: 'npc-mask', onclick: (e) => { if (e.target === this.el) this._close(); } },
      h('div', { class: 'npc-dialog panel' },
        h('header', { class: 'panel-head' },
          h('span', { class: `npc-seal lg ${npc.gender}` }, npc.name[0]),
          h('div', { class: 'npc-head-text' },
            h('div', { class: 'npc-name' }, npc.name,
              remote ? h('span', { class: 'npc-remote-tag' }, '远程传讯') : null,
              this.affinityEl),
            h('div', { class: 'npc-identity' }, `${npc.identity} · ${npc.gender === 'female' ? '女' : '男'}${fn && !remote ? ` · ${fn.label}` : ''}`)
          ),
          h('button', { class: 'modal-close', onclick: () => this._close() }, '×')
        ),
        h('div', { class: 'npc-persona' },
          h('span', { class: 'npc-tag', title: '性格' }, npc.personality),
          h('span', { class: 'npc-tag', title: '喜好' }, `好：${npc.likes}`),
          this.store.state.mode === 'map' ? h('span', {
            class: `npc-tag ${chatOpen ? 'chat-open' : 'chat-cool'}`,
            title: '每隔 3 个月，自由对话可增好感（仅自由对话）'
          }, chatOpen ? '寒暄可增好感' : '好感窗口未至') : null
        ),
        this.logEl,
        topics.length ? h('div', { class: 'npc-topics' },
          topics.map(t => h('button', {
            class: 'npc-topic',
            onclick: () => this.props.onAction?.(t.key, npc)
          }, t.label))
        ) : null,
        h('div', { class: 'npc-compose' },
          this.inputEl,
          h('button', { class: 'npc-send', onclick: () => this._send() }, icon('send', 15))
        )
      )
    );
    return this.el;
  }

  afterMount() {
    const npc = this.props.npc;
    // 登记人物关系（复用关系系统；首见载入 NPC 基础好感）
    this.store.upsertRelation({
      name: npc.name, identity: npc.identity,
      relation: npc.relation, affinity: npc.affinity
    });
    // AI 生成见面首句（本地兜底见 engine._fallbackGreet）
    this._push('npc', '……');
    this.thinking = true;
    const greet = this.props.remote && this.props.engine.npcRemoteGreet
      ? this.props.engine.npcRemoteGreet(npc)
      : this.props.engine.npcGreet(npc);
    greet.then(text => {
      this.log[0].text = text;
      this.thinking = false;
      this._renderLog();
    }).catch(() => {
      // IPC 异常：首条占位改为默然，解锁输入
      this.log[0].text = '（对方默然不语）';
      this.thinking = false;
      this._renderLog();
    });
  }

  _affinity() {
    const rel = this.store.state.relations.find(r => r.name === this.props.npc.name);
    return rel?.affinity ?? this.props.npc.affinity;
  }

  _push(from, text) {
    this.log.push({ from, text });
    this._renderLog();
  }

  _renderLog() {
    this.logEl.innerHTML = '';
    for (const m of this.log.slice(-30)) {
      this.logEl.appendChild(h('div', { class: `npc-line from-${m.from}` },
        m.from === 'npc' ? h('b', null, `${this.props.npc.name}：`) : m.from === 'player' ? h('b', null, '你：') : null,
        h('span', { class: m.text === '……' ? 'npc-wait' : null }, m.text)
      ));
    }
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  async _send() {
    const text = this.inputEl.value.trim();
    if (!text || this.thinking) return;
    this.inputEl.value = '';
    this._push('player', text);
    this.thinking = true;
    this._push('npc', '……');
    let reply;
    try {
      reply = await this.props.engine.npcChat(this.props.npc, text, this.log);
    } catch (e) {
      reply = '……对方似未听闻。';
    } finally {
      this.thinking = false;
      this.log[this.log.length - 1].text = reply;
    }
    // V2.4：自由对话好感（每 3 个月限一次，仅自由对话触发）
    const g = this.store.tryChatAffinity?.(this.props.npc.name);
    if (g?.gained) {
      this.log.push({ from: 'sys', text: `※ 寒暄问暖，情谊渐笃——【${this.props.npc.name}】好感 +2` });
      this.affinityEl.textContent = `好感 ${this._affinity()}`;
    }
    this._renderLog();
  }

  // 基类 close 走 _close：确保 onClose 回调触发（挂载方清理引用）
  close() { this._close(); }

  _close() {
    this.props.onClose?.();
    this.destroy();
  }
}
