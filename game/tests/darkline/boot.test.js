// boot gate：fonts/frame/assets 三信號都到 + 最短顯示時長 → ready。純狀態機、時間注入。
import { describe, it, expect } from 'vitest'
import { createBootGate } from '../../src/darkline/ui/boot.js'

describe('createBootGate', () => {
  it('is not ready until every signal has arrived', () => {
    const g = createBootGate({ minMs: 900 })
    g.begin(0)
    g.signal('fonts'); g.signal('frame')
    expect(g.ready(2000)).toBe(false)      // assets 未到
    g.signal('assets')
    expect(g.ready(2000)).toBe(true)
  })
  it('holds until minMs even when signals are instant (電報開場要吃得到一眼)', () => {
    const g = createBootGate({ minMs: 900 })
    g.begin(100)
    g.signal('fonts'); g.signal('frame'); g.signal('assets')
    expect(g.ready(500)).toBe(false)       // 只過了 400ms
    expect(g.ready(1000)).toBe(true)       // 過了 900ms
  })
  it('is never ready before begin()', () => {
    const g = createBootGate()
    g.signal('fonts'); g.signal('frame'); g.signal('assets')
    expect(g.ready(99999)).toBe(false)
  })
})
