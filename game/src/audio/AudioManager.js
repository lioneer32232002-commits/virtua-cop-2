import { SE_FILES, AUDIO_BASE } from './se-manifest.js'

const MUTE_KEY = 'darkline.mute'

export class AudioManager {
  /** @type {AudioContext|null} */ ctx = null
  /** @type {Map<string, AudioBuffer>} decoded real SE clips, by logical name */
  buffers = new Map()
  base = AUDIO_BASE
  muted = false

  /** @param {{ storage?: Storage|null }} [opts] storage defaults to localStorage; pass null to disable persistence (tests). */
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage
    this.muted = this.storage?.getItem(MUTE_KEY) === '1'
  }

  /** Flip mute, persist to storage, return the new state. */
  toggleMute() {
    this.muted = !this.muted
    this.storage?.setItem(MUTE_KEY, this.muted ? '1' : '0')
    return this.muted
  }

  _ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  /**
   * Load the extracted original SE clips (local dev only). Each missing file
   * (404 in the public deploy, where /assets/audio is absent) is skipped, so the
   * synth placeholders keep playing. Safe to call once at boot.
   * @returns {Promise<number>} how many clips were loaded
   */
  async loadSamples(files = SE_FILES, base = this.base) {
    this._ensureCtx()
    await Promise.all(Object.entries(files).map(async ([name, file]) => {
      try {
        const res = await fetch(base + file)
        if (!res.ok) return
        this.buffers.set(name, await this.ctx.decodeAudioData(await res.arrayBuffer()))
      } catch { /* keep synth fallback */ }
    }))
    return this.buffers.size
  }

  /**
   * Play a loaded real clip by logical name. Returns false if not loaded, so
   * callers fall back to their synth placeholder. When muted, returns true
   * without touching buffers/ctx — the "sample played" outcome, so callers
   * don't fall through to _beep() and double-fire a (silent) synth sound.
   * @returns {boolean}
   */
  _playSample(name, gain = 0.6) {
    if (this.muted) return true
    const buf = this.buffers.get(name)
    if (!buf) return false
    this._ensureCtx()
    const src = this.ctx.createBufferSource()
    const g = this.ctx.createGain()
    src.buffer = buf
    g.gain.value = gain
    src.connect(g)
    g.connect(this.ctx.destination)
    src.start()
    return true
  }

  /** Dev helper: audition any extracted WAV by file name to map the clips by ear. */
  async audition(file) {
    this._ensureCtx()
    const res = await fetch(this.base + file)
    const src = this.ctx.createBufferSource()
    src.buffer = await this.ctx.decodeAudioData(await res.arrayBuffer())
    src.connect(this.ctx.destination)
    src.start()
  }

  /**
   * @param {{ freq: number, type?: OscillatorType, duration: number, decay?: number, level?: number }} opts
   */
  _beep({ freq, type = 'sawtooth', duration, decay = duration, level = 0.3 }) {
    if (this.muted) return
    this._ensureCtx()
    const osc  = this.ctx.createOscillator()
    const gainNode = this.ctx.createGain()
    osc.connect(gainNode)
    gainNode.connect(this.ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gainNode.gain.setValueAtTime(level, this.ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay)
    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + duration)
  }

  gunshot() {
    if (this._playSample('gunshot')) return
    this._beep({ freq: 180, type: 'sawtooth', duration: 0.12, decay: 0.1 })
    setTimeout(() => this._beep({ freq: 80, type: 'square', duration: 0.05, decay: 0.04 }), 20)
  }

  enemyHit() {
    if (this._playSample('enemyHit')) return
    this._beep({ freq: 440, type: 'triangle', duration: 0.08, decay: 0.07 })
  }

  enemyDeath() {
    this._beep({ freq: 220, type: 'sawtooth', duration: 0.25, decay: 0.2 })
    setTimeout(() => this._beep({ freq: 110, type: 'sawtooth', duration: 0.2, decay: 0.18 }), 80)
  }

  playerHit() {
    if (this._playSample('playerHit')) return
    this._beep({ freq: 100, type: 'square', duration: 0.3, decay: 0.25 })
  }

  reload() {
    if (this._playSample('reload')) return
    this._beep({ freq: 300, type: 'square', duration: 0.1, decay: 0.08 })
  }

  card() {
    if (this._playSample('card')) return
    this._beep({ freq: 880, type: 'sine', duration: 0.15, decay: 0.12 })
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

  /** 解碼成功：借用 clearPoint() 的琶音（同一種「達成」音色，免多造一套）。 */
  decodeSolved() {
    this.clearPoint()
  }

  /** 解碼失敗：低頻短促雙 beep（自行合成，無對應樣本）。 */
  decodeFail() {
    this._beep({ freq: 150, type: 'square', duration: 0.08, decay: 0.07 })
    setTimeout(() => this._beep({ freq: 120, type: 'square', duration: 0.08, decay: 0.07 }), 90)
  }

  /** 打字機逐字 tick：極短、極低 gain 的高頻聲，呼叫端（typewriter）自行節流。 */
  uiTick() {
    this._beep({ freq: 2400, type: 'sine', duration: 0.02, decay: 0.02, level: 0.05 })
  }
}
