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
    <div id="hud-card"></div>
    <div id="boss-bar"><div id="boss-bar-fill"></div></div>
    <div id="hud-top-left">
      <div id="hud-score-panel">
        <span id="hud-score-label">SCORE</span>
        <span id="score">00000000</span>
      </div>
      <div id="health-bar"></div>
    </div>
    <div id="hud-bottom-right">
      <div id="ammo-bar"></div>
      <div id="reserve-mags"></div>
    </div>
  `
    const style = document.createElement('style')
    style.textContent = `
    /* SCORE — 電報體琥珀 */
    #hud-top-left { position: absolute; top: 12px; left: 20px; display: flex; flex-direction: column; gap: 6px; }
    #hud-score-panel {
      font: 700 18px var(--dl-font);
      letter-spacing: .18em;
      text-shadow: 1px 1px 0 #000, var(--dl-glow);
    }
    #hud-score-label { color: var(--dl-amber-dim); margin-right: 8px; }
    #score { color: var(--dl-amber-bright); }

    /* Lives — clearance 章（純 CSS 琥珀章票，dog-ear 缺角），不再依賴 ★ glyph */
    #health-bar { display: flex; gap: 5px; }
    .life {
      width: 14px; height: 19px; box-sizing: border-box;
      border: 1px solid var(--dl-amber);
      clip-path: polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 76%);
    }
    .life.full  { background: var(--dl-amber); box-shadow: var(--dl-glow); }
    .life.empty { opacity: .28; }

    /* Ammo — 琥珀彈匣格 */
    #hud-bottom-right { position: absolute; bottom: 20px; right: 20px; }
    #ammo-bar { display: flex; gap: 4px; align-items: center; }
    .ammo-slot {
      width: 8px; height: 20px; border-radius: 1px;
      border: 1px solid #000; box-sizing: border-box;
    }
    .ammo-slot.full  { background: var(--dl-amber); box-shadow: var(--dl-glow); }
    .ammo-slot.empty { background: #2c2c30; }
    #reserve-mags { color: var(--dl-amber); font: 12px var(--dl-font); letter-spacing: .12em; margin-top: 4px; text-align: right; }
    #reserve-mags.reloading { color: var(--dl-red); }

    /* Title cards — tracked amber telegraph caps（去街機紅描邊） */
    #hud-card {
      position: absolute; top: 38%; left: 0; right: 0;
      text-align: center; pointer-events: none;
      font: 700 38px var(--dl-font);
      letter-spacing: .3em; color: var(--dl-amber);
      text-shadow: 2px 2px 0 #000, var(--dl-glow-strong);
      opacity: 0; transform: scale(0.92);
      transition: opacity var(--dl-dur) var(--dl-ease), transform var(--dl-dur) var(--dl-ease);
    }
    #hud-card.active { opacity: 1; transform: scale(1); }

    /* Boss bar — 琥珀框 + 紅情報填充 */
    #boss-bar {
      position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
      width: 56%; height: 14px; border: 1px solid var(--dl-amber); border-radius: 2px;
      background: var(--dl-intel-bg-solid); box-shadow: var(--dl-glow);
      display: none;
    }
    #boss-bar.active { display: block; }
    #boss-bar-fill {
      height: 100%; width: 100%;
      background: linear-gradient(#ff6a5a, var(--dl-red));
      transition: width 120ms ease-out;
    }

    /* Lock-on rings — 琥珀-紅情報配色（相位語意不變：green=早/×3、yellow=中、red=末） */
    #lock-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .lock-ring {
      position: absolute; box-sizing: border-box;
      border: 2px solid currentColor; border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 6px currentColor;
      opacity: 0.9;
    }
    .lock-ring.green  { color: var(--dl-amber-bright); }
    .lock-ring.yellow { color: var(--dl-amber); }
    .lock-ring.red    { color: var(--dl-red); }

    /* Damage flash —（維持紅暈） */
    #damage-flash {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(220,0,0,0.6) 100%);
      opacity: 0; transition: opacity 220ms ease-out;
    }
    #damage-flash.active { opacity: 1; transition: opacity 40ms ease-in; }

    /* Crosshair hit flash — index.html 準心是簡單圓圈：hit＝紅框+紅光（修掉舊 pseudo 十字與 ring 子節點的幽靈 selector） */
    #crosshair.hit { border-color: var(--dl-red) !important; box-shadow: 0 0 10px var(--dl-red); }
  `
    container.appendChild(style)

    // Reuse the crosshair already in index.html (moved by InputManager)
    this._crosshair = document.getElementById('crosshair')

    this._renderLives()
    this._renderBullets()
  }

  _renderLives() {
    const bar = this._container.querySelector('#health-bar')
    if (!bar) return
    bar.innerHTML = ''
    for (let i = 0; i < this.maxHealth; i++) {
      const span = document.createElement('span')
      span.className = 'life ' + (i < this.health ? 'full' : 'empty')
      bar.appendChild(span)
    }
  }

  _renderBullets() {
    const bar = this._container.querySelector('#ammo-bar')
    if (!bar) return
    bar.innerHTML = ''
    for (let i = 0; i < this.maxAmmo; i++) {
      const span = document.createElement('span')
      span.className = 'ammo-slot ' + (i < this.ammo ? 'full' : 'empty')
      bar.appendChild(span)
    }
  }

  /** @param {number} hp */
  setHealth(hp) {
    this.health = Math.max(0, Math.min(this.maxHealth, hp))
    this._renderLives()
  }

  /** @param {number} ammo */
  setAmmo(ammo) {
    this.ammo = Math.max(0, ammo)
    this._renderBullets()
  }

  /** free 段：顯示備彈匣數（rail 不呼叫 → 維持空白）。 */
  setReserve(n) {
    const el = this._container.querySelector('#reserve-mags')
    if (el) el.textContent = '◖ ×' + Math.max(0, n)
  }

  /** free 段：換彈中/無彈提示。 */
  setReloading(on) {
    const el = this._container.querySelector('#reserve-mags')
    if (el) el.classList.toggle('reloading', !!on)
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
   * phase and sized to frame the target (bigger enemy / closer = bigger ring),
   * shrinking as the lock counts down. Falls back to a remaining-only size when
   * the caller doesn't supply a target size.
   * @param {{ x: number, y: number, phase: 'green'|'yellow'|'red', remaining: number, size?: number }[]} locks
   */
  updateLockOns(locks) {
    const overlay = this._container.querySelector('#lock-overlay')
    if (!overlay) return
    overlay.innerHTML = ''
    for (const l of locks) {
      const ring = document.createElement('div')
      ring.className = 'lock-ring ' + l.phase
      const remaining = Math.max(0, Math.min(1, l.remaining))
      // size 給定（依目標 bbox 投影大小）→ 框住敵人、隨倒數略收縮（boss 大圈、grunt 小圈）；
      // 未給 → 退回舊的純倒數尺寸（40–100px）。
      const size = (l.size != null)
        ? Math.max(24, l.size * (0.72 + 0.28 * remaining))
        : 40 + remaining * 60
      ring.style.left = l.x + 'px'
      ring.style.top = l.y + 'px'
      ring.style.width = size + 'px'
      ring.style.height = size + 'px'
      overlay.appendChild(ring)
    }
  }

  /**
   * Flash a centred title card (JUSTICE SHOT / STAGE n START / STAGE CLEAR).
   * @param {string} text
   * @param {number} [duration] ms before it fades out (default 1400)
   */
  showCard(text, duration = 1400) {
    const card = this._container.querySelector('#hud-card')
    if (!card) return
    card.textContent = text
    card.classList.add('active')
    clearTimeout(this._cardTimer)
    this._cardTimer = setTimeout(() => { card.classList.remove('active') }, duration)
  }

  /**
   * Show/update the boss health bar.
   * @param {number} hp current boss hp
   * @param {number} maxHp full boss hp
   */
  setBossBar(hp, maxHp) {
    const bar = this._container.querySelector('#boss-bar')
    const fill = this._container.querySelector('#boss-bar-fill')
    if (!bar || !fill) return
    bar.classList.add('active')
    const pct = Math.max(0, Math.min(1, maxHp ? hp / maxHp : 0)) * 100
    fill.style.width = pct + '%'
  }

  /** Hide the boss health bar (boss defeated or stage left). */
  hideBossBar() {
    const bar = this._container.querySelector('#boss-bar')
    if (bar) bar.classList.remove('active')
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
