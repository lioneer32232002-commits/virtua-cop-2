import { EnemyManager, resolveEnemy, zoneOfHit, driftDirectionFromYaw, isBehindCamera } from '../src/gameplay/EnemyManager.js'

vi.mock('three', () => ({
  Mesh: class {
    constructor() {
      this.position = { x: 0, y: 0, z: 0, set: () => {} }
      this.visible = true
      this.userData = {}
      this.rotation = { y: 0 }
      this.traverse = (cb) => cb(this)
    }
  },
  BoxGeometry: class {},
  MeshBasicMaterial: class {},
  Color: class {},
}))

describe('EnemyManager', () => {
  function makeManager() {
    const scene = { add: vi.fn(), remove: vi.fn() }
    return new EnemyManager(scene)
  }

  it('starts with no enemies', () => {
    const mgr = makeManager()
    expect(mgr.enemies).toHaveLength(0)
  })

  it('spawns enemies from wave data', () => {
    const mgr = makeManager()
    mgr.spawnWave([
      { type: 'grunt',  position: [5, 0, -10], hp: 1 },
      { type: 'gunman', position: [-5, 0, -10], hp: 2 },
    ])
    expect(mgr.enemies).toHaveLength(2)
  })

  it('removes dead enemies after update', () => {
    const mgr = makeManager()
    mgr.spawnWave([{ type: 'grunt', position: [0, 0, -10], hp: 1 }])
    const enemy = mgr.enemies[0]
    enemy.state = 'dead'
    mgr.update(0.1)
    expect(mgr.enemies).toHaveLength(0)
  })

  it('removes despawned (left) enemies after update, like dead ones', () => {
    const mgr = makeManager()
    mgr.spawnWave([{ type: 'innocent', position: [0, 0, -5], hp: 1 }])
    mgr.enemies[0].despawn()                 // civilian ran off — not a death
    mgr.update(0.1)
    expect(mgr.enemies).toHaveLength(0)
  })

  it('a disarmed enemy that flees stops blocking the clear point (aliveCount → 0)', () => {
    const mgr = makeManager()
    mgr.spawnWave([{ type: 'gunman', position: [0, 0, -5], hp: 2 }])
    const e = mgr.enemies[0]
    e.state = 'visible'
    e.hit(1, 'hand')                         // justice shot → disarmed, still alive
    expect(mgr.aliveCount()).toBe(1)         // still hostile, holds the node
    mgr.update(6)                            // it staggers, runs, then despawns
    expect(mgr.enemies).toHaveLength(0)
    expect(mgr.aliveCount()).toBe(0)         // node can now resume
  })

  it('dying enemy visibility is driven by its own timer, not Date.now()', () => {
    // A wall-clock flicker returns the same value for two calls made in the
    // same millisecond, so it cannot produce different visibilities for two
    // different timer values — a timer-driven flicker can.
    const mgr = makeManager()
    mgr.spawnWave([{ type: 'grunt', position: [0, 0, -5], hp: 1 }])
    const e = mgr.enemies[0]
    e.state = 'dying'

    e._timer = 0.05          // sin(0.05 * RATE) > 0  → visible
    mgr.update(0)
    expect(e.mesh.visible).toBe(true)

    e._timer = 0.15          // sin(0.15 * RATE) < 0  → hidden
    mgr.update(0)
    expect(e.mesh.visible).toBe(false)
  })

  it('aliveCount returns non-dead enemies', () => {
    const mgr = makeManager()
    mgr.spawnWave([
      { type: 'grunt', position: [0, 0, -5], hp: 1 },
      { type: 'grunt', position: [2, 0, -5], hp: 1 },
    ])
    mgr.enemies[0].state = 'dead'
    expect(mgr.aliveCount()).toBe(1)
  })

  it('aliveCount excludes innocents so a clear point is not deadlocked by a civilian', () => {
    const mgr = makeManager()
    mgr.spawnWave([
      { type: 'grunt',    position: [0, 0, -5], hp: 1 },
      { type: 'innocent', position: [2, 0, -5], hp: 1 },
    ])
    // Kill the only hostile; the innocent is still alive but must not gate progression.
    mgr.enemies.find(e => e.type === 'grunt').state = 'dead'
    expect(mgr.aliveCount()).toBe(0)
  })

  it('clear() removes all enemies from scene', () => {
    const mgr = makeManager()
    mgr.spawnWave([{ type: 'grunt', position: [0, 0, -5], hp: 1 }])
    mgr.clear()
    expect(mgr.enemies).toHaveLength(0)
  })
})

describe('EnemyManager enemy projectiles', () => {
  function firingManager(rng) {
    const scene = { add: vi.fn(), remove: vi.fn() }
    const mgr = new EnemyManager(scene)
    mgr.rng = rng                              // deterministic hit/miss roll
    const hits = []
    mgr.onEnemyAttack = (d) => hits.push(d)
    mgr.spawnWave([{ type: 'grunt', position: [0, 0, -10], hp: 9 }])
    const e = mgr.enemies[0]
    e.state = 'visible'
    e._timer = 0
    return { mgr, e, hits }
  }

  it('fires a projectile when the lock expires, dealing no damage on the spot', () => {
    const { mgr, e, hits } = firingManager(() => 0)    // would hit
    e._timer = e.attackInterval                        // primed to fire next tick
    mgr.update(0.01)
    expect(e.state).toBe('attacking')
    expect(mgr.projectiles).toHaveLength(1)
    expect(hits).toHaveLength(0)                       // damage waits for arrival
  })

  it('applies damage once a hitting projectile arrives', () => {
    const { mgr, e, hits } = firingManager(() => 0)    // always hit
    e._timer = e.attackInterval
    mgr.update(0.01)                                   // fire
    expect(hits).toHaveLength(0)
    mgr.update(0.5)                                    // 0.4s flight elapses → arrival
    expect(hits).toEqual([1])
    expect(mgr.projectiles).toHaveLength(0)            // retired after arrival
  })

  it('a missing projectile arrives but costs no life', () => {
    const { mgr, e, hits } = firingManager(() => 0.99) // always miss
    e._timer = e.attackInterval
    mgr.update(0.01)
    mgr.update(0.5)
    expect(hits).toHaveLength(0)
    expect(mgr.projectiles).toHaveLength(0)
  })

  it('killing the firer mid-flight cancels its projectile (no damage)', () => {
    const { mgr, e, hits } = firingManager(() => 0)    // would hit
    e._timer = e.attackInterval
    mgr.update(0.01)                                   // fire
    expect(mgr.projectiles).toHaveLength(1)
    e.hit(99)                                          // killed → DYING
    mgr.update(0.5)                                    // would have arrived...
    expect(hits).toHaveLength(0)                       // ...but the shot was cancelled
    expect(mgr.projectiles).toHaveLength(0)
  })
})

describe('resolveEnemy', () => {
  it('returns enemyRef when the object itself carries it', () => {
    const enemy = { type: 'grunt' }
    const mesh = { userData: { enemyRef: enemy }, parent: null }
    expect(resolveEnemy(mesh)).toBe(enemy)
  })

  it('walks up the parent chain to find enemyRef on an ancestor group', () => {
    const enemy = { type: 'gunman' }
    const group = { userData: { enemyRef: enemy }, parent: null }
    const childMesh = { userData: {}, parent: group }
    const grandChild = { userData: {}, parent: childMesh }
    expect(resolveEnemy(grandChild)).toBe(enemy)
  })

  it('returns null when no ancestor carries an enemyRef', () => {
    const group = { userData: {}, parent: null }
    const child = { userData: {}, parent: group }
    expect(resolveEnemy(child)).toBe(null)
  })

  it('returns null for a nullish object', () => {
    expect(resolveEnemy(null)).toBe(null)
  })
})

describe('zoneOfHit', () => {
  it('reads the hit zone tagged on the struck mesh', () => {
    expect(zoneOfHit({ userData: { zone: 'head' }, parent: null })).toBe('head')
  })

  it('walks up to an ancestor that carries a zone', () => {
    const part = { userData: { zone: 'hand' }, parent: null }
    const child = { userData: {}, parent: part }
    expect(zoneOfHit(child)).toBe('hand')
  })

  it('defaults to body when nothing is tagged', () => {
    expect(zoneOfHit({ userData: {}, parent: null })).toBe('body')
    expect(zoneOfHit(null)).toBe('body')
  })
})

describe('isBehindCamera', () => {
  // camera at origin, yaw 0 → faces world -z, so "behind" is +z
  it('an enemy well behind the camera (beyond the margin) is behind', () => {
    expect(isBehindCamera({ x: 0, z: 5 }, { x: 0, z: 0 }, 0, 3)).toBe(true)
  })

  it('an enemy just behind but within the margin is not yet behind', () => {
    expect(isBehindCamera({ x: 0, z: 2 }, { x: 0, z: 0 }, 0, 3)).toBe(false)
  })

  it('a clear-point node enemy stays ahead of the (stationary) camera, never culled', () => {
    // node enemy spawned ahead (-z) of the camera; camera paused → always in front
    expect(isBehindCamera({ x: 0, z: -12 }, { x: 0, z: 0 }, 0, 3)).toBe(false)
    // and the same holds when the camera faces a different yaw
    expect(isBehindCamera({ x: -12, z: 0 }, { x: 0, z: 0 }, Math.PI / 2, 3)).toBe(false)
  })
})

describe('driftDirectionFromYaw', () => {
  it('yaw 0 → right vector points along world +x', () => {
    const d = driftDirectionFromYaw(0)
    expect(d.x).toBeCloseTo(1)
    expect(d.z).toBeCloseTo(0)
  })

  it('yaw 90° → right vector rotates to world -z (camera-relative)', () => {
    const d = driftDirectionFromYaw(Math.PI / 2)
    expect(d.x).toBeCloseTo(0)
    expect(d.z).toBeCloseTo(-1)
  })
})
