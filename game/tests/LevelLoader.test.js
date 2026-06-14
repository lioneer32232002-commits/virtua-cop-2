import { LevelLoader } from '../src/level/LevelLoader.js'
import stage1 from '../src/level/levels/stage1.json'

describe('LevelLoader', () => {
  it('loads and validates stage1', () => {
    const data = LevelLoader.validate(stage1)
    expect(data.id).toBe('stage1')
    expect(data.railPath.length).toBeGreaterThan(2)
    expect(data.waves.length).toBeGreaterThan(0)
    expect(typeof data.duration).toBe('number')
  })

  it('throws on missing id', () => {
    const { id: _id, ...noId } = stage1
    expect(() => LevelLoader.validate(noId)).toThrow('id')
  })

  it('throws on missing railPath', () => {
    const { railPath: _rp, ...noPath } = stage1
    expect(() => LevelLoader.validate(noPath)).toThrow('railPath')
  })

  it('throws on railPath with fewer than 3 points', () => {
    expect(() => LevelLoader.validate({ ...stage1, railPath: [[0,0,0],[1,1,1]] })).toThrow('railPath')
  })

  it('wave enemies have required fields', () => {
    const data = LevelLoader.validate(stage1)
    for (const wave of data.waves) {
      for (const enemy of wave.enemies) {
        expect(enemy.type).toBeTruthy()
        expect(Array.isArray(enemy.position)).toBe(true)
        expect(typeof enemy.hp).toBe('number')
      }
    }
  })
})

describe('LevelLoader discovery', () => {
  it('loads a discovered level by id', async () => {
    const data = await LevelLoader.load('stage1')
    expect(data.id).toBe('stage1')
  })

  it('throws on an unknown id', async () => {
    await expect(LevelLoader.load('nope')).rejects.toThrow('Unknown level')
  })

  it('lists the base stages first, then custom levels', () => {
    const ids = LevelLoader.list().map(l => l.id)
    expect(ids).toContain('stage1')
    expect(ids).toContain('stage2')
    expect(ids).toContain('stage3')
    // base stages precede any non-stage (custom) level
    const firstCustom = ids.findIndex(id => !id.startsWith('stage'))
    if (firstCustom !== -1) {
      const lastStage = ids.map(id => id.startsWith('stage')).lastIndexOf(true)
      expect(lastStage).toBeLessThan(firstCustom)
    }
  })

  it('discovers the example custom level and its baseStage reuse', async () => {
    const ids = LevelLoader.list().map(l => l.id)
    expect(ids).toContain('custom1')
    const custom = await LevelLoader.load('custom1')
    expect(custom.baseStage).toBe('stage1')
  })

  it('discovers the fully-original level (no baseStage → procedural env)', async () => {
    const ids = LevelLoader.list().map(l => l.id)
    expect(ids).toContain('downtown1')
    const dt = await LevelLoader.load('downtown1')
    expect(dt.baseStage).toBeUndefined()        // no SEGA geometry reuse
    expect(dt.environment.type).toBe('downtown') // selects the procedural builder
    expect(dt.railPath.length).toBeGreaterThan(2)
  })
})
