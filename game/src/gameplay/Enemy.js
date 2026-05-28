export const EnemyState = Object.freeze({
  IDLE:      'idle',
  EMERGING:  'emerging',
  VISIBLE:   'visible',
  ATTACKING: 'attacking',
  DYING:     'dying',
  DEAD:      'dead',
})

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
    this.state = EnemyState.IDLE
    this._timer = 0
    /** @type {import('three').Mesh|null} Three.js mesh — null during tests */
    this.mesh = null
    this.onDamageDealt = null // () => void — set by EnemyManager
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
        if (this._timer >= this.attackInterval) {
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

  /** @param {number} damage */
  hit(damage) {
    if (this.state === EnemyState.DEAD || this.state === EnemyState.DYING) return
    this.hp -= damage
    if (this.hp <= 0) {
      this.hp = 0
      this.state = EnemyState.DYING
      this._timer = 0
    }
  }

  isDead() { return this.state === EnemyState.DEAD }
  isActive() { return this.state !== EnemyState.IDLE && !this.isDead() }

  emerge() {
    if (this.state !== EnemyState.IDLE) return
    this.state = EnemyState.EMERGING
    this._timer = 0
  }
}
