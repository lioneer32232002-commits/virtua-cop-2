import { describe, it, expect } from 'vitest'
import { Sequencer, SEGMENTS } from '../../../src/darkline/m0/Sequencer.js'

describe('Sequencer', () => {
  it('starts at briefing', () => {
    expect(new Sequencer().current).toBe('briefing')
  })
  it('advances through the fixed order', () => {
    const s = new Sequencer()
    expect(SEGMENTS).toEqual(['briefing', 'rail', 'free', 'done'])
    s.next(); expect(s.current).toBe('rail')
    s.next(); expect(s.current).toBe('free')
    s.next(); expect(s.current).toBe('done')
  })
  it('fires onEnter with the new segment', () => {
    const seen = []
    const s = new Sequencer({ onEnter: seg => seen.push(seg) })
    s.next(); s.next()
    expect(seen).toEqual(['rail', 'free'])
  })
  it('reports done', () => {
    const s = new Sequencer()
    s.next(); s.next(); s.next()
    expect(s.isDone).toBe(true)
  })
})
