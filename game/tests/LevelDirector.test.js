import { LevelDirector } from '../src/level/LevelDirector.js'

const LEVEL = {
  id: 'test', duration: 30, railPath: [[0,0,0],[0,0,-5],[0,0,-10]],
  waves: [
    { time: 3,  enemies: [{ type: 'grunt', position: [0,0,-5], hp: 1 }] },
    { time: 10, enemies: [{ type: 'gunman', position: [0,0,-8], hp: 2 }] },
  ],
  clearPoints: [8],
  boss: { time: 20, type: 'boss', position: [0,0,-10], hp: 10 },
}

// Level without clearPoints — lets us reach boss and complete freely
const LEVEL_NO_CLEAR = { ...LEVEL, clearPoints: [] }

describe('LevelDirector', () => {
  it('triggers wave at correct time', () => {
    const spawned = []
    const dir = new LevelDirector(LEVEL, { onSpawnWave: (w) => spawned.push(w) })
    dir.update(2.9)
    expect(spawned).toHaveLength(0)
    dir.update(0.2) // t = 3.1
    expect(spawned).toHaveLength(1)
    expect(spawned[0].enemies[0].type).toBe('grunt')
  })

  it('does not double-trigger a wave', () => {
    const spawned = []
    const dir = new LevelDirector(LEVEL, { onSpawnWave: (w) => spawned.push(w) })
    dir.update(5)   // t=5, wave at t=3 fires
    dir.update(0.5) // t=5.5, still past t=3 but not past t=8 clearPoint or t=10 wave
    expect(spawned).toHaveLength(1) // wave at t=3 only fired once
  })

  it('pauses at clearPoint until resume() called', () => {
    let clearFired = false
    const dir = new LevelDirector(LEVEL, {
      onSpawnWave: () => {},
      onClearPoint: () => { clearFired = true },
    })
    dir.update(8.5) // past clearPoint at t=8
    expect(clearFired).toBe(true)
    expect(dir.paused).toBe(true)
    const tBefore = dir.elapsed
    dir.update(2)
    expect(dir.elapsed).toBeCloseTo(tBefore) // time did NOT advance
    dir.resume()
    dir.update(2)
    expect(dir.elapsed).toBeGreaterThan(tBefore) // time advances after resume
  })

  it('triggers boss at correct time', () => {
    let bossFired = null
    const dir = new LevelDirector(LEVEL_NO_CLEAR, {
      onSpawnWave: () => {},
      onBoss: (b) => { bossFired = b },
    })
    dir.update(21) // past boss time=20, no clearPoints to block
    expect(bossFired).not.toBeNull()
    expect(bossFired.type).toBe('boss')
  })

  it('fires onComplete when elapsed >= duration', () => {
    let done = false
    const dir = new LevelDirector(LEVEL_NO_CLEAR, {
      onSpawnWave: () => {},
      onComplete: () => { done = true },
    })
    dir.update(35) // past duration=30, no clearPoints to block
    expect(done).toBe(true)
  })
})
