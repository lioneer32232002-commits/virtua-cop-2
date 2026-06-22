import { describe, it, expect } from 'vitest'
import { clampPixelRatio, DEFAULT_CINEMATIC, resolveCinematic } from '../../src/render/cinematicConfig.js'

describe('clampPixelRatio', () => {
  it('clamps to max 2 by default', () => {
    expect(clampPixelRatio(3)).toBe(2)
    expect(clampPixelRatio(1.5)).toBe(1.5)
  })
  it('honours a custom max', () => {
    expect(clampPixelRatio(3, 1.5)).toBe(1.5)
  })
  it('falls back to 1 for bad input', () => {
    expect(clampPixelRatio(0)).toBe(1)
    expect(clampPixelRatio(NaN)).toBe(1)
    expect(clampPixelRatio(undefined)).toBe(1)
  })
})

describe('cinematic config', () => {
  it('exposes sane defaults in range', () => {
    expect(DEFAULT_CINEMATIC.bloom.luminanceThreshold).toBeGreaterThan(0)
    expect(DEFAULT_CINEMATIC.bloom.luminanceThreshold).toBeLessThan(1)
    expect(DEFAULT_CINEMATIC.toneMapping).toBe('ACES_FILMIC')
    expect(DEFAULT_CINEMATIC.vignette.darkness).toBeGreaterThan(0)
  })
  it('deep-merges overrides without mutating the default', () => {
    const r = resolveCinematic({ bloom: { intensity: 2 } })
    expect(r.bloom.intensity).toBe(2)
    expect(r.bloom.luminanceThreshold).toBe(DEFAULT_CINEMATIC.bloom.luminanceThreshold)
    expect(r.vignette.darkness).toBe(DEFAULT_CINEMATIC.vignette.darkness)
    expect(DEFAULT_CINEMATIC.bloom.intensity).not.toBe(2)
  })
})
