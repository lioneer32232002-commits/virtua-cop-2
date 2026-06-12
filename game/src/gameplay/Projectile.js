// Enemy bullets fly visibly toward the camera and only deal damage on arrival —
// the original's behaviour, replacing the old hitscan (instant, always-hit)
// model. The hit/miss verdict is decided at fire time so it stays deterministic
// and testable; update() merely advances the flight.

export const PROJECTILE_SPEED = 25   // world units/sec
export const MIN_FLIGHT = 0.4        // seconds — a close shot still reads as flight
export const MAX_FLIGHT = 1.0        // seconds — a distant shot doesn't crawl forever

// Placeholder hit rates per difficulty. The original's exact probabilities are
// unknown (待考證) — these are tunable stand-ins. See ROADMAP C.
export const HIT_RATE_BY_DIFFICULTY = Object.freeze({ easy: 0.5, normal: 0.7, hard: 0.9 })

/** Flight time for a shot of the given distance, clamped to [MIN, MAX]. */
export function flightTimeFor(distance, speed = PROJECTILE_SPEED) {
  return Math.max(MIN_FLIGHT, Math.min(MAX_FLIGHT, distance / speed))
}

/** Decide a hit at fire time. rng() in [0,1); injectable for deterministic tests. */
export function rollHit(hitRate, rng = Math.random) {
  return rng() < hitRate
}

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export class Projectile {
  /**
   * @param {{ origin: {x,y,z}, target: {x,y,z}, willHit: boolean, speed?: number }} cfg
   */
  constructor({ origin, target, willHit, speed = PROJECTILE_SPEED }) {
    this.origin = origin
    this.target = target
    this.willHit = willHit
    this.flightTime = flightTimeFor(distance(origin, target), speed)
    this.elapsed = 0
    this.arrived = false
    this.cancelled = false
    /** @type {boolean} Set by EnemyManager once it has applied the arrival. */
    this.resolved = false
    /** @type {import('./Enemy.js').Enemy|null} Firing enemy; its death cancels the shot. */
    this.owner = null
    /** @type {import('three').Object3D|null} Visual, attached by EnemyManager (cut 2). */
    this.mesh = null
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this.arrived || this.cancelled) return
    this.elapsed += dt
    if (this.elapsed >= this.flightTime) this.arrived = true
  }

  /** Abort the shot (firer killed/despawned mid-flight). */
  cancel() { this.cancelled = true }

  /** Fraction of the flight completed, 0→1 (clamped). Drives the visual. */
  get progress() { return Math.max(0, Math.min(1, this.elapsed / this.flightTime)) }

  /** Current world position, lerped origin→target by progress. */
  get position() {
    const t = this.progress
    return {
      x: this.origin.x + (this.target.x - this.origin.x) * t,
      y: this.origin.y + (this.target.y - this.origin.y) * t,
      z: this.origin.z + (this.target.z - this.origin.z) * t,
    }
  }

  /** Whether EnemyManager should retire this projectile (arrived or cancelled). */
  isDone() { return this.arrived || this.cancelled }
}
