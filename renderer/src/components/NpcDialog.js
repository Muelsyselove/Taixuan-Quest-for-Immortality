// NPC 对话面板：AI 打招呼（首句）+ 固定话题（功能快捷）+ 自由输入
import { Component, h, icon } from '../core/component.js';
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
  qiju:     [{ key: 'rest', label: '稍作休息' }]
};

export class NpcDialog extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { npc, engine, onAction(actionKey, npc), onClose() }
    this.log = []; // { from:'npc'|'player', text }
    this.thinking = false;
  }

  render() {
    const npc = this.props.npc;
    this.logEl = h('div', { class: 'npc-log' });
    this.inputEl = h('input', {
      class: 'npc-input', type: 'text', maxlength: 60,
      placeholder: '随意攀谈……（对话不提供实质性奖励）'
    });
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._send();
    });

    const fn = npc.function ? FACILITY_TYPES[npc.function] : null;
    const topics = (FUNCTION_TOPICS[npc.function] ?? []);

    this.el = h('div', { class: 'npc-mask', onclick: (e) => { if (e.target === this.el) this._close(); } },
      h('div', { class: 'npc-dialog panel' },
        h('header', { class: 'panel-head' },
          h('span', { class: `npc-seal lg ${npc.gender}` }, npc.name[0]),
          h('div', { class: 'npc-head-text' },
            h('div', { class: 'npc-name' }, npc.name,
              h('span', { class: 'npc-affinity' }, `好感 ${this._affinity()}`)),
            h('div', { class: 'npc-identity' }, `${npc.identity} · ${npc.gender === 'female' ? '女' : '男'}${fn ? ` · ${fn.label}` : ''}`)
          ),
          h('button', { class: 'modal-close', onclick: () => this._close() }, '×')
        ),
        h('div', { class: 'npc-persona' },
          h('span', { class: 'npc-tag', title: '性格' }, npc.personality),
          h('span', { class: 'npc-tag', title: '喜好' }, `好：${npc.likes}`)
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
    this.props.engine.npcGreet(npc).then(text => {
      this.log[0].text = text;
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
        m.from === 'npc' ? h('b', null, `${this.props.npc.name}：`) : h('b', null, '你：'),
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
    const reply = await this.props.engine.npcChat(this.props.npc, text, this.log);
    this.thinking = false;
    this.log[this.log.length - 1].text = reply;
    this._renderLog();
  }

  _close() {
    this.props.onClose?.();
    this.destroy();
  }
}
