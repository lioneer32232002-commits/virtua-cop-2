// game/tests/darkline/mission-config.test.js
import { describe, it, expect } from 'vitest'
import { SEGMENTS, SEGMENT_MODES, MISSION } from '../../src/darkline/mission/missions/first-island-chain.js'
import { savePayloadFor } from '../../src/darkline/mission/SeamController.js'

describe('mission segment table', () => {
  it('has the 5 M1 beats in order', () => {
    expect(SEGMENTS).toEqual(['briefing', 'rail1', 'free', 'rail2boss', 'ending'])
  })
  it('declares a valid camera+input mode for every segment', () => {
    for (const seg of SEGMENTS) {
      const m = SEGMENT_MODES[seg]
      expect(['rail', 'free', 'none']).toContain(m.camera)
      expect(['cursor', 'pointerlock', 'none']).toContain(m.input)
    }
  })
  it('uses free pointer-lock for the free segment and cursor for rails', () => {
    expect(SEGMENT_MODES.free).toMatchObject({ camera: 'free', input: 'pointerlock' })
    expect(SEGMENT_MODES.rail1).toMatchObject({ camera: 'rail', input: 'cursor' })
    expect(SEGMENT_MODES.rail2boss).toMatchObject({ camera: 'rail', input: 'cursor' })
  })
  it('exposes briefing/ending text keys', () => {
    expect(MISSION.briefingKey).toBe('brief.body')
    expect(MISSION.endingKey).toBe('ending.body')
  })
})

describe('savePayloadFor', () => {
  it('builds a checkpoint payload only for segments flagged save', () => {
    expect(savePayloadFor('free', 1500)).toEqual({ segment: 'free', score: 1500 })
  })
  it('returns null for segments not flagged save', () => {
    expect(savePayloadFor('briefing', 0)).toBeNull()
  })
})
