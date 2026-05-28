export const GameState = Object.freeze({
  MENU:        'menu',
  PLAYING:     'playing',
  CLEAR_POINT: 'clear_point',
  STAGE_CLEAR: 'stage_clear',
  DEAD:        'dead',
})

export class GameManager {
  state = GameState.MENU
  currentStage = null
  difficulty = 'normal'
  health = 5
  maxHealth = 5
  ammo = 6
  maxAmmo = 6

  startStage(stageId, difficulty) {
    this.currentStage = stageId
    this.difficulty = difficulty
    this.health = this.maxHealth
    this.ammo = this.maxAmmo
    this.state = GameState.PLAYING
  }

  onClearPoint() {
    if (this.state === GameState.PLAYING) this.state = GameState.CLEAR_POINT
  }

  onAllEnemiesDead() {
    if (this.state === GameState.CLEAR_POINT) this.state = GameState.PLAYING
  }

  onPlayerDead() {
    this.state = GameState.DEAD
  }

  onStageClear() {
    this.state = GameState.STAGE_CLEAR
  }

  toMenu() {
    this.state = GameState.MENU
    this.currentStage = null
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount)
    return this.health === 0
  }

  consumeAmmo() {
    if (this.ammo <= 0) return false
    this.ammo--
    return true
  }

  reload() { this.ammo = this.maxAmmo }
}
