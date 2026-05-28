export class AudioManager {
  /** @type {AudioContext|null} */ ctx = null

  _ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  /**
   * @param {{ freq: number, type?: OscillatorType, duration: number, decay?: number }} opts
   */
  _beep({ freq, type = 'sawtooth', duration, decay = duration }) {
    this._ensureCtx()
    const osc  = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay)
    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + duration)
  }

  gunshot() {
    this._beep({ freq: 180, type: 'sawtooth', duration: 0.12, decay: 0.1 })
    setTimeout(() => this._beep({ freq: 80, type: 'square', duration: 0.05, decay: 0.04 }), 20)
  }

  enemyHit() {
    this._beep({ freq: 440, type: 'triangle', duration: 0.08, decay: 0.07 })
  }

  enemyDeath() {
    this._beep({ freq: 220, type: 'sawtooth', duration: 0.25, decay: 0.2 })
    setTimeout(() => this._beep({ freq: 110, type: 'sawtooth', duration: 0.2, decay: 0.18 }), 80)
  }

  playerHit() {
    this._beep({ freq: 100, type: 'square', duration: 0.3, decay: 0.25 })
  }

  clearPoint() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._beep({ freq: f, type: 'sine', duration: 0.2, decay: 0.18 }), i * 80)
    })
  }

  stageClear() {
    [523, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this._beep({ freq: f, type: 'square', duration: 0.18, decay: 0.15 }), i * 120)
    })
  }
}
