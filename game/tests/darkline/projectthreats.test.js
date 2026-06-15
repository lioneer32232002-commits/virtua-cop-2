import { describe, it, expect } from 'vitest'
import { projectThreats, phaseClass } from '../../src/darkline/combat/projectThreats.js'

describe('phaseClass', () => {
  it('maps lockPhase enum to css class (pass-through)', () => {
    expect(phaseClass('green')).toBe('green')
    expect(phaseClass('yellow')).toBe('yellow')
    expect(phaseClass('red')).toBe('red')
  })
})

describe('projectThreats', () => {
  // 假投影器：敵帶 _ndc → 回該 NDC；否則 null（模擬無 mesh / 相機後方）
  const project = e => (e._ndc ? { x: e._ndc[0], y: e._ndc[1] } : null)

  it('returns one ring (screen px) for the locked enemy, excludes the unlocked', () => {
    const enemies = [
      { lockPhase: 'green', lockRemaining: 0.8, _ndc: [0, 0] },
      { lockPhase: null, lockRemaining: 0, _ndc: [0.5, 0.5] },   // 無鎖 → 排除
    ]
    const out = projectThreats(enemies, project, { width: 800, height: 600 })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ phase: 'green', remaining: 0.8 })
    expect(out[0].x).toBeCloseTo(400, 5)   // ndc x=0 → 水平中心
    expect(out[0].y).toBeCloseTo(300, 5)   // ndc y=0 → 垂直中心
  })

  it('maps NDC corners to the right screen pixels', () => {
    const out = projectThreats(
      [{ lockPhase: 'red', lockRemaining: 1, _ndc: [-1, 1] }],   // 左上角
      project, { width: 800, height: 600 },
    )
    expect(out[0].x).toBeCloseTo(0, 5)
    expect(out[0].y).toBeCloseTo(0, 5)
  })

  it('skips enemies that project to null (no mesh / behind camera)', () => {
    const out = projectThreats(
      [{ lockPhase: 'red', lockRemaining: 1, _ndc: null }],
      project, { width: 800, height: 600 },
    )
    expect(out).toHaveLength(0)
  })
})
