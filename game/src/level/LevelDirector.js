export class LevelDirector {
  elapsed = 0
  paused = false
  _wavesFired = new Set()
  _bossFired = false
  _completeFired = false

  /**
   * @param {object} level - validated level data from LevelLoader
   * @param {{
   *   onSpawnWave?: (wave: object) => void,
   *   onClearPoint?: () => void,
   *   onBoss?: (boss: object) => void,
   *   onComplete?: () => void,
   * }} callbacks
   */
  constructor(level, callbacks) {
    this.level = level
    this.cb = callbacks
    this._clearPointsFired = new Set()
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this.paused || this._completeFired) return
    this.elapsed += dt

    // waves
    for (let i = 0; i < this.level.waves.length; i++) {
      const wave = this.level.waves[i]
      if (!this._wavesFired.has(i) && this.elapsed >= wave.time) {
        this._wavesFired.add(i)
        this.cb.onSpawnWave?.(wave)
      }
    }

    // clear points
    for (let i = 0; i < (this.level.clearPoints ?? []).length; i++) {
      const t = this.level.clearPoints[i]
      if (!this._clearPointsFired.has(i) && this.elapsed >= t) {
        this._clearPointsFired.add(i)
        this.paused = true
        this.cb.onClearPoint?.()
        return // stop advancing until resumed
      }
    }

    // boss
    if (!this._bossFired && this.level.boss && this.elapsed >= this.level.boss.time) {
      this._bossFired = true
      this.cb.onBoss?.(this.level.boss)
    }

    // complete
    if (!this._completeFired && this.elapsed >= this.level.duration) {
      this._completeFired = true
      this.cb.onComplete?.()
    }
  }

  resume() {
    this.paused = false
  }

  reset() {
    this.elapsed = 0
    this.paused = false
    this._wavesFired.clear()
    this._clearPointsFired.clear()
    this._bossFired = false
    this._completeFired = false
  }
}
