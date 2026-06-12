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
    <div id="lock-overlay"></div>
    <div id="damage-flash"></div>
    <div id="hud-score-panel">
      <span id="hud-score-label">SCORE</span>
      <span id="score">00000000</span>
    </div>
    <div id="hud-bottom-left">
      <div id="ammo-bar"></div>
      <div id="health-bar"></div>
    </div>
  `
    const style = document.createElement('style')
    style.textContent = `
    /* Score — top-right, yellow label + orange numbers, like original */
    #hud-score-panel {
      position: absolute; top: 12px; right: 20px;
      font: bold 20px 'Courier New', monospace;
      text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
      letter-spacing: 2px;
    }
    #hud-score-label { color: #ffe000; margin-right: 8px; }
    #score { color: #ff8800; }

    /* Bottom-left panel — ammo above hearts */
    #hud-bottom-left {
      position: absolute; bottom: 20px; left: 20px;
      display: flex; flex-direction: column; gap: 6px;
    }

    /* Ammo bullets */
    #ammo-bar { display: flex; gap: 3px; align-items: center; }
    .bullet { font-size: 18px; line-height: 1; }
    .bullet.full::before  { content: '●'; color: #ffe000; text-shadow: 1px 1px 0 #000; }
    .bullet.empty::before { content: '○'; color: #555; }

    /* Hearts */
    #health-bar { display: flex; gap: 4px; }
    .heart { font-size: 22px; line-height: 1; }
    .heart.full::before  { content: '♥'; color: #f33; text-shadow: 1px 1px 0 #000; }
    .heart.empty::before { content: '♡'; color: #555; }

    /* Lock-on rings — projected over enemies, colour by phase, shrink as the
       countdown runs out. Pointer-events off so they never block aiming. */
    #lock-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .lock-ring {
      position: absolute; box-sizing: border-box;
      border: 3px solid currentColor; border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 6px currentColor;
      opacity: 0.9;
    }
    .lock-ring.green  { color: #2ad24a; }
    .lock-ring.yellow { color: #ffd000; }
    .lock-ring.red    { color: #ff2a2a; }

    /* Damage flash — red edge vignette when an enemy fires and hits the player. */
    #damage-flash {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(220,0,0,0.6) 100%);
      opacity: 0; transition: opacity 220ms ease-out;
    }
    #damage-flash.active { opacity: 1; transition: opacity 40ms ease-in; }

    /* Crosshair hit flash */
    #crosshair.hit::before { background: #f44 !important; box-shadow: 0 54px 0 #f44 !important; }
    #crosshair.hit::after  { background: #f44 !important; box-shadow: 54px 0 0 #f44 !important; }
    #crosshair.hit .ring   { border-color: #f44 !important; }
  `
    container.appendChild(style)

    // Reuse the crosshair already in index.html (moved by InputManager)
    this._crosshair = document.getElementById('crosshair')

    this._renderHearts()
    this._renderBullets()
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

  _renderBullets() {
    const bar = this._container.querySelector('#ammo-bar')
    if (!bar) return
    bar.innerHTML = ''
    for (let i = 0; i < this.maxAmmo; i++) {
      const span = document.createElement('span')
      span.className = 'bullet ' + (i < this.ammo ? 'full' : 'empty')
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
    this._renderBullets()
  }

  /** @param {number} points */
  addScore(points) {
    this.score += points
    const el = this._container.querySelector('#score')
    if (el) el.textContent = String(this.score).padStart(8, '0')
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

  /**
   * Draw the lock-on rings for this frame. One ring per active lock, coloured by
   * phase and sized by remaining time (fuller ring = more time to shoot).
   * @param {{ x: number, y: number, phase: 'green'|'yellow'|'red', remaining: number }[]} locks
   */
  updateLockOns(locks) {
    const overlay = this._container.querySelector('#lock-overlay')
    if (!overlay) return
    overlay.innerHTML = ''
    for (const l of locks) {
      const ring = document.createElement('div')
      ring.className = 'lock-ring ' + l.phase
      const size = 22 + Math.max(0, Math.min(1, l.remaining)) * 46
      ring.style.left = l.x + 'px'
      ring.style.top = l.y + 'px'
      ring.style.width = size + 'px'
      ring.style.height = size + 'px'
      overlay.appendChild(ring)
    }
  }

  /** Flash the red damage vignette — the screen telegraph for taking an enemy shot. */
  flashDamage() {
    const el = this._container.querySelector('#damage-flash')
    if (!el) return
    el.classList.add('active')
    clearTimeout(this._damageTimer)
    this._damageTimer = setTimeout(() => { el.classList.remove('active') }, 120)
  }

  flashCrosshair() {
    if (!this._crosshair) return
    this._crosshair.classList.add('hit')
    clearTimeout(this._crosshairTimer)
    this._crosshairTimer = setTimeout(() => {
      this._crosshair.classList.remove('hit')
    }, 100)
  }
}
