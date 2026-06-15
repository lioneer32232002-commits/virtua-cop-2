// game/src/darkline/core/PlayerState.js
// darkline 玩家戰鬥狀態：薄包裝 production GameManager，重用其 health/ammo/takeDamage/
// consumeAmmo/reload（VC2 已測過的戰鬥規則），但加 darkline 要的可注入 maxHealth/maxAmmo
// （M1911 = 7 發）。狀態機（MENU/PLAYING/DEAD）也一併沿用，供 game-over 判斷。
import { GameManager, GameState } from '../../GameManager.js'

export { GameState }

export class PlayerState {
  constructor({ maxHealth = 5, maxAmmo = 7 } = {}) {
    this.gm = new GameManager()
    this.gm.maxHealth = maxHealth
    this.gm.health = maxHealth
    this.gm.maxAmmo = maxAmmo
    this.gm.ammo = maxAmmo
  }

  get health() { return this.gm.health }
  get maxHealth() { return this.gm.maxHealth }
  get ammo() { return this.gm.ammo }
  get maxAmmo() { return this.gm.maxAmmo }
  get state() { return this.gm.state }
  get isDead() { return this.gm.state === GameState.DEAD }

  /** @param {number} amount @returns {boolean} true if this damage killed the player */
  takeDamage(amount) {
    const dead = this.gm.takeDamage(amount)
    if (dead) this.gm.onPlayerDead()
    return dead
  }

  /** @returns {boolean} true if a round was available and consumed */
  consumeAmmo() { return this.gm.consumeAmmo() }

  reload() { this.gm.reload() }
}
