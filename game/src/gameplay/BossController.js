/**
 * Tracks a boss enemy's health and drives its multi-phase behaviour. The boss is
 * a normal Enemy (its hp drops as it's shot); this watches the hp fraction, splits
 * the fight into N phases, and fires onPhase once each time a new phase begins
 * (e.g. to spawn reinforcements or escalate). Also exposes hpFraction for the bar.
 */
export class BossController {
  /**
   * @param {{ hp: number }} boss the boss enemy
   * @param {{ phases?: number, onPhase?: (phase: number) => void }} [opts]
   */
  constructor(boss, { phases = 3, onPhase = null } = {}) {
    this.boss = boss
    this.maxHp = boss.hp
    this.phases = phases
    this.onPhase = onPhase
    this.phase = 1
  }

  /** @returns {number} remaining health as a 0..1 fraction (never negative). */
  get hpFraction() {
    return Math.max(0, this.boss.hp / this.maxHp)
  }

  /**
   * Recompute the current phase from the boss's health and fire onPhase on each
   * new transition. Call once per frame while the boss is alive.
   * @returns {number} the current phase (1..phases)
   */
  update() {
    const frac = this.hpFraction
    const p = Math.min(this.phases, Math.max(1, this.phases - Math.ceil(frac * this.phases) + 1))
    if (p > this.phase) {
      this.phase = p
      this.onPhase?.(p)
    }
    return this.phase
  }
}
