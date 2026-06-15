// game/tests/darkline/sequencer.test.js
import { describe, it, expect } from 'vitest'
import { MissionSequencer } from '../../src/darkline/mission/MissionSequencer.js'

const SEGS = ['briefing', 'rail1', 'free', 'rail2boss', 'ending']

describe('MissionSequencer', () => {
  it('starts at the first segment', () => {
    expect(new MissionSequencer(SEGS).current).toBe('briefing')
  })
  it('advances through the segment list', () => {
    const s = new MissionSequencer(SEGS)
    s.next(); expect(s.current).toBe('rail1')
    s.next(); expect(s.current).toBe('free')
  })
  it('fires onExit(from) then onEnter(to) in order on each advance', () => {
    const log = []
    const s = new MissionSequencer(SEGS, {
      onExit: seg => log.push(`exit:${seg}`),
      onEnter: seg => log.push(`enter:${seg}`),
    })
    s.next()
    expect(log).toEqual(['exit:briefing', 'enter:rail1'])
  })
  it('reports done at the last segment and next() is a no-op there', () => {
    const s = new MissionSequencer(SEGS)
    s.next(); s.next(); s.next(); s.next()
    expect(s.current).toBe('ending')
    expect(s.isDone).toBe(true)
    s.next()
    expect(s.current).toBe('ending')
  })
  it('throws on an empty segment list', () => {
    expect(() => new MissionSequencer([])).toThrow()
  })
  it('jumpTo sets the segment and fires onEnter(target) once, with no onExit/intermediate', () => {
    const log = []
    const s = new MissionSequencer(SEGS, {
      onExit: seg => log.push(`exit:${seg}`),
      onEnter: seg => log.push(`enter:${seg}`),
    })
    s.jumpTo('rail2boss')
    expect(s.current).toBe('rail2boss')
    expect(log).toEqual(['enter:rail2boss'])   // 只進目標段，不跑中間段
  })
  it('jumpTo throws on an unknown segment', () => {
    expect(() => new MissionSequencer(SEGS).jumpTo('nope')).toThrow()
  })
})
