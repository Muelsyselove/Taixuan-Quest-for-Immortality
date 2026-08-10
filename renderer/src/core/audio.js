// 程序化音效引擎：WebAudio 合成，无外部音频资源
// 音量/静音由应用设置驱动（saveAppSettings → onAppSettings → audio.apply）
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.6;
    this.muted = false;
  }

  /** 应用音量/静音设置（立即生效） */
  apply({ volume, muted } = {}) {
    if (typeof volume === 'number') this.volume = Math.max(0, Math.min(1, volume));
    if (typeof muted === 'boolean') this.muted = muted;
    this._applyGain();
  }

  _applyGain() {
    if (this.master) {
      const target = this.muted ? 0 : this.volume * 0.4;
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
    }
  }

  /** 懒创建（需用户手势后方可发声） */
  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this._applyGain();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** 基础音色：振荡器 + 指数衰减包络 */
  _tone(freq, dur = 0.12, { type = 'sine', gain = 1, delay = 0, slide = 0 } = {}) {
    const ctx = this._ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5 * gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /** 界面点击：短促木鱼音 */
  click() { this._tone(660, 0.07, { type: 'triangle', gain: 0.7 }); }

  /** 抉择落子：沉稳一扣 */
  choose() { this._tone(392, 0.1, { type: 'triangle', gain: 0.8 }); this._tone(523, 0.12, { type: 'sine', gain: 0.5, delay: 0.05 }); }

  /** 突破/祥瑞：上行琶音 */
  chime() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.22, { type: 'sine', gain: 0.6, delay: i * 0.08 }));
  }

  /** 战斗遭遇：低沉一击 */
  hit() { this._tone(160, 0.18, { type: 'sawtooth', gain: 0.5, slide: -80 }); this._tone(80, 0.22, { type: 'sine', gain: 0.8, delay: 0.02 }); }

  /** 陨落/凶兆：下行滑音 */
  fall() { this._tone(320, 0.5, { type: 'sine', gain: 0.6, slide: -220 }); }
}
