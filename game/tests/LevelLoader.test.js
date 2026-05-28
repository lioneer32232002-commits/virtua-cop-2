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
