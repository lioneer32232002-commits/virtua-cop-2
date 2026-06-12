import { EnemyManager, resolveEnemy, zoneOfHit } from '../src/gameplay/EnemyManager.js'

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
