export class HUD {
  score = 0
  hiScore = 0
  health
  maxHealth
  ammo
  maxAmmo

  /**
   * @param {HTMLElement} container
   * @param {{ maxHealth: number, maxAmmo: number }} config
   */
  constructor(container, config) {
    this.maxHealth = config.maxHealth
    this.health = config.maxHealth
    this.maxAmmo = config.maxAmmo
    this.ammo = config.maxAmmo
    this._container = container
    this._build(container)
  }

  _build(container) {
    container.innerHTML = `
      <div id="hud-inner">
        <div id="health-bar"></div>
        <div id="ammo-bar">AMMO: <span id="ammo-count">${this.ammo}</span> / ${this.maxAmmo}</div>
        <div id="score-panel">
          SCORE <span id="score">00000</span> &nbsp; HI <span id="hi-score">00000</span>
        </div>
      </div>
    `
    const style = document.createElement('style')
    style.textContent = `
      #hud-inner { position:absolute; top:0; left:0; right:0; padding:8px 16px;
        display:flex; justify-content:space-between; align-items:center;
        color:#fff; font:bold 16px monospace; text-shadow:1px 1px 2px #000; }
      #health-bar { display:flex; gap:4px; }
      .heart { font-size:20px; }
      .heart.full::before { content:'♥'; color:#f44; }
      .heart.empty::before { content:'♡'; color:#888; }
    `
    container.appendChild(style)
    this._renderHearts()
  }

  _renderHearts() {
    const bar = this._container.querySelector('#health-bar')
    if (!bar) return
    bar.innerHTML = ''
    for (let i = 0; i < this.maxHealth; i++) {
      const span = document.createElement('span')
      span.className = 'heart ' + (i < this.health ? 'full' : 'empty')
      bar.appendChild(span)
    }
  }

  /** @param {number} hp */
  setHealth(hp) {
    this.health = Math.max(0, Math.min(this.maxHealth, hp))
    this._renderHearts()
  }

  /** @param {number} ammo */
  setAmmo(ammo) {
    this.ammo = Math.max(0, ammo)
    const el = this._container.querySelector('#ammo-count')
    if (el) el.textContent = String(this.ammo)
  }

  /** @param {number} points */
  addScore(points) {
    this.score += points
    const el = this._container.querySelector('#score')
    if (el) el.textContent = String(this.score).padStart(5, '0')
  }

  updateHiScore() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score
      const el = this._container.querySelector('#hi-score')
      if (el) el.textContent = String(this.hiScore).padStart(5, '0')
    }
  }

  reset(keepHiScore = true) {
    const prev = keepHiScore ? this.hiScore : 0
    this.score = 0
    this.hiScore = prev
    this.setHealth(this.maxHealth)
    this.setAmmo(this.maxAmmo)
    this.addScore(0)
  }
}
