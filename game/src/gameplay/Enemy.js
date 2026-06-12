export const EnemyState = Object.freeze({
  IDLE:      'idle',
  EMERGING:  'emerging',
  VISIBLE:   'visible',
  ATTACKING: 'attacking',
  DYING:     'dying',
  DEAD:      'dead',
})

// Lock-on ring colour thresholds, as a fraction of the lock-on window
// (attackInterval): green until 60%, yellow until 85%, red for the final
// warning before the enemy fires.
const LOCK_YELLOW_AT = 0.6
const LOCK_RED_AT = 0.85

export class Enemy {
  static DYING_DURATION = 0.5

  /**
   * @param {{ type: string, hp: number, emergeTime: number, attackInterval: number }} config
   */
  constructor(config) {
    this.type = config.type
    this.hp = config.hp
    this.emergeTime = config.emergeTime
    this.attackInterval = config.attackInterval
    /** @type {number|null} Seconds visible before leaving (civilians run away); null = never. */
    this.lifetime = config.lifetime ?? null
    /** @type {boolean} Marked to be removed without a death (left / culled). */
    this.gone = false
    this.state = EnemyState.IDLE
    this._timer = 0
    /** @type {import('three').Mesh|null} Three.js mesh — null during tests */
    this.mesh = null
    this.onDamageDealt = null // () => void — set by EnemyManager
    /** @type {number|null} Score multiplier captured at the lethal hit (null until killed). */
    this.killMultiplier = null
    /** @type {boolean} Set by a hand/weapon hit; a disarmed enemy never fires. */
    this.disarmed = false
    /** @type {boolean} True once a justice shot (hand/weapon hit) lands. */
    this.justiceShot = false
  }

  /** @param {number} dt seconds */
  update(dt) {
    this._timer += dt
    switch (this.state) {
      case EnemyState.EMERGING:
        if (this._timer >= this.emergeTime) {
          this.state = EnemyState.VISIBLE
          this._timer = 0
        }
        break
      case EnemyState.VISIBLE:
        // Civilians (and any lifetime-bound enemy) leave after their window.
        if (this.lifetime != null && this._timer >= this.lifetime) {
          this.despawn()
          break
        }
        // A disarmed enemy (justice shot) keeps its pose but never fires.
        if (!this.disarmed && this._timer >= this.attackInterval) {
          this.state = EnemyState.ATTACKING
          this._timer = 0
          if (this.onDamageDealt) this.onDamageDealt()
        }
        break
      case EnemyState.ATTACKING:
        // return to visible after short attack pose (0.3s)
        if (this._timer >= 0.3) {
          this.state = EnemyState.VISIBLE
          this._timer = 0
        }
        break
      case EnemyState.DYING:
        if (this._timer >= Enemy.DYING_DURATION) {
          this.state = EnemyState.DEAD
        }
        break
    }
  }

  /**
   * @param {number} damage
   * @param {'head'|'body'|'hand'} [zone] hit location: head = instant kill
   *   (bosses excepted), hand = justice shot (disarm), body/omitted = normal damage.
   */
  hit(damage, zone) {
    if (this.state === EnemyState.DEAD || this.state === EnemyState.DYING) return
    if (zone === 'hand') {
      this.disarmed = true
      this.justiceShot = true
    }
    this.hp -= damage
    // Headshots instakill, but a boss has to be worn down by its hp.
    if (zone === 'head' && this.type !== 'boss') this.hp = 0
    if (this.hp <= 0) {
      // Capture the score multiplier from the lock phase at the lethal hit,
      // before the state change clears it: green ×3, yellow ×2, red/none ×1.
      // A kill landed while still emerging is the fastest shot of all → top tier.
      const phase = this.state === EnemyState.EMERGING ? 'green' : this.lockPhase
      this.killMultiplier = phase === 'green' ? 3 : phase === 'yellow' ? 2 : 1
      this.hp = 0
      this.state = EnemyState.DYING
      this._timer = 0
    }
  }

  /**
   * Lock-on ring colour while the enemy is acquiring its shot, or null when no
   * ring should show (not yet visible / already firing / dying). Drives the HUD
   * ring and the kill-score multiplier.
   * @returns {'green'|'yellow'|'red'|null}
   */
  get lockPhase() {
    if (this.disarmed) return null   // neutralised — no threat ring
    if (this.state !== EnemyState.VISIBLE) return null
    const f = this._timer / this.attackInterval
    if (f < LOCK_YELLOW_AT) return 'green'
    if (f < LOCK_RED_AT) return 'yellow'
    return 'red'
  }

  /**
   * Fraction of the lock-on window still remaining (1 = just acquired, 0 = about
   * to fire), or 0 when there is no active lock. Drives the HUD ring's shrink.
   * @returns {number}
   */
  get lockRemaining() {
    if (this.lockPhase === null) return 0
    return Math.max(0, Math.min(1, 1 - this._timer / this.attackInterval))
  }

  isDead() { return this.state === EnemyState.DEAD }
  isActive() { return this.state !== EnemyState.IDLE && !this.isDead() }

  /** Mark this enemy to leave the field without a death (civilian ran off / culled). */
  despawn() { this.gone = true }

  /** Whether EnemyManager should remove this enemy (killed or gone). */
  shouldRemove() { return this.isDead() || this.gone }

  emerge() {
    if (this.state !== EnemyState.IDLE) return
    this.state = EnemyState.EMERGING
    this._timer = 0
  }
}
