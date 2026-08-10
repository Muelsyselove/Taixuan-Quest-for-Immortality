// 设置界面：画质 / 声音（主界面入口），以及 AI 接入与花费统计的快捷入口
import { Component, h, icon } from '../core/component.js';
import { CONFIG } from '../core/config.js';
import { FormField, Select, Slider, Toggle, Button } from '../ui/controls.js';
import { SettingsModal } from '../components/SettingsModal.js';
import { UsageModal } from '../components/UsageModal.js';

export class SettingsView extends Component {
  constructor(store, props) {
    super(store, props);
    // props: { engine, audio, onBack }
  }

  render() {
    const eng = this.props.engine;
    const app = eng.app;

    /* 画质 */
    this.qualityTipEl = h('span', { class: 'ui-field-tip' });
    const qualitySel = Select({
      options: CONFIG.qualityLevels.map(q => ({ key: q.key, label: q.label })),
      value: app.quality,
      onChange: (v) => this._apply({ quality: v })
    });
    this._syncQualityTip(app.quality);

    /* 声音 */
    const volSlider = Slider({
      min: 0, max: 1, step: 0.05, value: app.volume,
      fmt: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => this._apply({ volume: v })
    });
    const muteToggle = Toggle({
      checked: app.muted,
      onChange: (v) => this._apply({ muted: v })
    });

    /* AI 状态 */
    this.aiStatusEl = h('span', { class: 'ui-field-tip' });
    this._syncAiStatus();

    this.el = h('div', { class: 'screen settings-screen' },
      h('div', { class: 'settings-wrap' },
        h('div', { class: 'pick-head' },
          h('button', { class: 'pick-back', title: '返回主界面', onclick: () => { this.props.audio?.click(); this.props.onBack?.(); } }, '‹'),
          h('div', { class: 'pick-head-text' },
            h('div', { class: 'pick-title' }, '设置'),
            h('div', { class: 'pick-sub' }, '画质 · 声音 · AI 接入 · 花费')
          )
        ),

        h('div', { class: 'settings-card' },
          h('h3', null, '画质'),
          FormField({ label: '灵雾渲染精度', control: qualitySel, tip: '' }),
          this.qualityTipEl
        ),

        h('div', { class: 'settings-card' },
          h('h3', null, '声音'),
          FormField({ label: '主音量', control: volSlider }),
          FormField({ label: '静音', control: muteToggle, tip: '开启后所有音效静默' })
        ),

        h('div', { class: 'settings-card' },
          h('h3', null, 'AI 与花费'),
          h('div', { class: 'settings-row' },
            Button({
              label: 'AI 接入设置', variant: 'ghost', icon: icon('talisman', 14),
              onClick: () => new SettingsModal(this.store, {
                engine: eng,
                onSaved: () => this._syncAiStatus()
              }).mount(document.body)
            }),
            Button({
              label: '花费统计', variant: 'ghost', icon: icon('spark', 14),
              onClick: () => new UsageModal(this.store, { engine: eng }).mount(document.body)
            })
          ),
          this.aiStatusEl
        )
      )
    );
    return this.el;
  }

  /** 实时应用 + 防抖落盘 */
  _apply(patch) {
    const eng = this.props.engine;
    Object.assign(eng.app, patch);
    eng.onAppSettings?.(eng.app);
    if (patch.quality) this._syncQualityTip(patch.quality);
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => eng.saveAppSettings(patch), 300);
  }

  _syncQualityTip(key) {
    const q = CONFIG.qualityLevels.find(x => x.key === key) ?? CONFIG.qualityLevels[2];
    this.qualityTipEl.textContent = q.desc;
  }

  _syncAiStatus() {
    const eng = this.props.engine;
    this.aiStatusEl.textContent = this.store.state.aiReady
      ? `已接入 ${eng.settings.vendor} / ${eng.settings.model}`
      : '尚未接入 AI（本地机缘模式）';
  }
}
