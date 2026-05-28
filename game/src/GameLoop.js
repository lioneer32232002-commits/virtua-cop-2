export class GameLoop {
  /** @type {boolean} */ running = false
  /** @type {number} */ _lastTime = 0
  /** @type {(dt: number) => void} */ _onTick

  /** @param {(dt: number) => void} onTick - called each frame, dt in seconds */
  constructor(onTick) {
    this._onTick = onTick
    this._raf = null
  }

  start() {
    this.running = true
    this._lastTime = performance.now()
    this._raf = requestAnimationFrame((t) => this._tick(t))
  }

  stop() {
    this.running = false
    if (this._raf) cancelAnimationFrame(this._raf)
  }

  pause() {
    this.running = false
    if (this._raf) cancelAnimationFrame(this._raf)
  }

  resume() {
    if (this.running) return
    this.running = true
    this._lastTime = performance.now()
    this._raf = requestAnimationFrame((t) => this._tick(t))
  }

  /** @param {number} now - performance.now() ms timestamp */
  _tick(now) {
    const rawDt = (now - this._lastTime) / 1000
    const dt = Math.min(rawDt, 0.1) // cap at 100ms to prevent spiral of death
    this._lastTime = now
    this._onTick(dt)
    if (this.running) {
      this._raf = requestAnimationFrame((t) => this._tick(t))
    }
  }
}
