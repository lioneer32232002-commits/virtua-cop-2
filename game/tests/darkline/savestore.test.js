// game/tests/darkline/savestore.test.js
import { describe, it, expect } from 'vitest'
import { SaveStore } from '../../src/darkline/core/SaveStore.js'

function fakeStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  }
}

describe('SaveStore', () => {
  it('round-trips a checkpoint', () => {
    const s = new SaveStore(fakeStorage())
    s.save({ segment: 'free', score: 1200 })
    expect(s.load()).toEqual({ segment: 'free', score: 1200 })
  })
  it('returns null when empty', () => {
    expect(new SaveStore(fakeStorage()).load()).toBeNull()
  })
  it('clears a save', () => {
    const s = new SaveStore(fakeStorage())
    s.save({ segment: 'rail2boss', score: 0 })
    s.clear()
    expect(s.load()).toBeNull()
  })
})
