// AI 设置弹窗：厂商选择 + API Key + 模型（支持在线拉取最新模型列表）
import { h } from '../core/component.js';
import { Modal } from '../ui/Modal.js';
import { CONFIG } from '../core/config.js';

export class SettingsModal extends Modal {
  get modalTitle() { return '接入 AI · 国内厂商'; }
  get modalIcon() { return 'spark'; }
  get modalClass() { return 'settings-modal'; }

  body() {
    const eng = this.props.engine;
    this._draft = { ...eng.settings };
    this._models = [];

    /* 厂商选择 */
    this.vendorSel = h('select', { class: 'set-input' },
      CONFIG.vendors.map(v => h('option', {
        value: v.key,
        selected: v.key === this._draft.vendor ? 'selected' : null
      }, v.name))
    );
    this.vendorSel.addEventListener('change', () => {
      const v = CONFIG.vendors.find(x => x.key === this.vendorSel.value);
      this._draft.vendor = v.key;
      this._draft.baseUrl = v.baseUrl;
      this._draft.model = v.models[0] || '';
      this.baseUrlInput.value = v.baseUrl;
      this.baseUrlInput.disabled = v.key !== 'custom';
      this.hintEl.textContent = v.hint;
      this._fillModels(v.models);
    });

    /* Base URL */
    this.baseUrlInput = h('input', {
      class: 'set-input', type: 'text',
      value: this._draft.baseUrl,
      disabled: this._draft.vendor !== 'custom' ? 'disabled' : null
    });
    this.baseUrlInput.addEventListener('change', () => (this._draft.baseUrl = this.baseUrlInput.value.trim()));

    /* Key */
    this.keyInput = h('input', { class: 'set-input', type: 'password', value: this._draft.apiKey, placeholder: 'sk-...' });
    this.keyInput.addEventListener('change', () => (this._draft.apiKey = this.keyInput.value.trim()));

    /* 模型 */
    this.modelSel = h('select', { class: 'set-input' });
    this.modelCustom = h('input', { class: 'set-input', type: 'text', placeholder: '或手动输入模型名…', value: this._draft.model });
    this.modelCustom.addEventListener('change', () => (this._draft.model = this.modelCustom.value.trim()));
    this.fetchBtn = h('button', {
      class: 'btn ghost',
      onclick: async () => {
        this.fetchBtn.textContent = '拉取中…';
        this.fetchBtn.disabled = true;
        Object.assign(this._draft, { baseUrl: this.baseUrlInput.value.trim(), apiKey: this.keyInput.value.trim() });
        const resp = await window.taixuan.ai.models({ baseUrl: this._draft.baseUrl, apiKey: this._draft.apiKey });
        this.fetchBtn.textContent = '在线拉取模型';
        this.fetchBtn.disabled = false;
        if (resp?.ok && resp.models.length) this._fillModels(resp.models);
        else this.hintEl.textContent = `拉取失败：${resp?.error ?? '无可用模型'}（已使用内置列表）`;
      }
    }, '在线拉取模型');

    /* Temperature */
    this.tempInput = h('input', { class: 'set-input', type: 'number', min: '0', max: '2', step: '0.1', value: this._draft.temperature });
    this.tempInput.addEventListener('change', () => {
      const v = parseFloat(this.tempInput.value);
      this._draft.temperature = Number.isFinite(v) ? Math.min(2, Math.max(0, v)) : 1;
    });

    const curVendor = CONFIG.vendors.find(v => v.key === this._draft.vendor) ?? CONFIG.vendors[0];
    this.hintEl = h('p', { class: 'set-tip' }, curVendor.hint);

    const bodyEl = h('div', { class: 'set-body' },
      h('label', { class: 'set-field' }, h('span', null, '厂商'), this.vendorSel),
      h('label', { class: 'set-field' }, h('span', null, '接口地址'), this.baseUrlInput),
      h('label', { class: 'set-field' }, h('span', null, 'API Key'), this.keyInput),
      h('label', { class: 'set-field' }, h('span', null, '模型'), this.modelSel),
      h('div', { class: 'set-row' }, this.modelCustom, this.fetchBtn),
      h('label', { class: 'set-field' }, h('span', null, '随机性 Temperature'), this.tempInput),
      this.hintEl
    );
    this._fillModels(curVendor.models.length ? curVendor.models : (this._draft.model ? [this._draft.model] : []));
    return bodyEl;
  }

  footer() {
    const eng = this.props.engine;
    return h('div', { class: 'set-foot' },
      h('button', { class: 'btn ghost', onclick: () => this.close() }, '取消'),
      h('button', {
        class: 'btn gold',
        onclick: async () => {
          this._draft.model = this.modelCustom.value.trim() || this._draft.model;
          this._draft.apiKey = this.keyInput.value.trim();
          this._draft.baseUrl = this.baseUrlInput.value.trim();
          await eng.saveSettings(this._draft);
          this.props.onSaved?.();
          this.close();
        }
      }, '保存')
    );
  }

  _fillModels(models) {
    this._models = models;
    this.modelSel.innerHTML = '';
    if (!models.length) {
      this.modelSel.appendChild(h('option', { value: '' }, '（请手动输入模型名）'));
      return;
    }
    for (const m of models) {
      this.modelSel.appendChild(h('option', {
        value: m,
        selected: m === this._draft.model ? 'selected' : null
      }, m));
    }
    this.modelSel.onchange = () => {
      this._draft.model = this.modelSel.value;
      this.modelCustom.value = this.modelSel.value;
    };
    // 默认选中
    if (!models.includes(this._draft.model)) {
      this._draft.model = models[0];
      this.modelSel.value = models[0];
    }
    this.modelCustom.value = this._draft.model;
  }
}
