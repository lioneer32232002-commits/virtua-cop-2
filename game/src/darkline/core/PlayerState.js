// game/src/darkline/core/PlayerState.js
// darkline 玩家戰鬥狀態：薄包裝 production GameManager（health/ammo/takeDamage/
// consumeAmmo/reload），加 darkline 要的可注入 maxHealth/maxAmmo（M1911 = 7 發）。
// free 段另加「備彈匣 + 換彈計時」：rail 用瞬間 reload()，free 用 startReload()/
// updateReload()（耗 1 備彈匣 + reloadTime 秒）。
import { GameManager, GameState } from '../../GameManager.js'

export { GameState }

export class PlayerState {
  constructor({ maxHealth = 5, maxAmmo = 7, reserveMags = 0, reloadTime = 1.0 } = {}) {
    this.gm = new GameManager()
    this.gm.maxHealth = maxHealth
    this.gm.health = maxHealth
    this.gm.maxAmmo = maxAmmo
    this.gm.ammo = maxAmmo
    this.reserveMags = reserveMags
    this.reloadTime = reloadTime
    this.reloading = false
    this.reloadTimer = 0
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

  /** rail 段：瞬間補滿，不耗備彈匣（街機光槍手感）。 */
  reload() { this.gm.reload() }

  /** free 段：開始一次計時換彈。回 true＝成功啟動（有備彈、未滿、未在換彈中）。 */
  startReload() {
    if (this.reloading) return false
    if (this.ammo >= this.maxAmmo) return false
    if (this.reserveMags <= 0) return false
    this.reloading = true
    this.reloadTimer = this.reloadTime
    return true
  }

  /** free 段：推進換彈計時；到時補滿當前匣並耗掉一個備彈匣。 */
  updateReload(dt) {
    if (!this.reloading) return
    this.reloadTimer -= dt
    if (this.reloadTimer <= 0) {
      this.gm.reload()
      this.reserveMags -= 1
      this.reloading = false
      this.reloadTimer = 0
    }
  }

  /** 撿彈夾：增加備彈匣。 */
  addMag(n = 1) { this.reserveMags += n }
}
