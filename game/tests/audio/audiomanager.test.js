// game/tests/audio/audiomanager.test.js
// jsdom 沒有 AudioContext → 用最小假物件頂真實合成路徑（gunshot 等），其餘測試改
// spy 內部方法（_beep/_playSample/_ensureCtx/clearPoint），避免每條測試都要造假 Web Audio 節點。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioManager } from '../../src/audio/AudioManager.js'

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  }
}

class FakeParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeOsc {
  frequency = { value: 0 }
  type = 'sine'
  connect() {}
  start() {}
  stop() {}
}
class FakeGainNode {
  gain = new FakeParam()
  connect() {}
}
class FakeBufferSource {
  buffer = null
  connect() {}
  start() {}
}
class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  createOscillator() { return new FakeOsc() }
  createGain() { return new FakeGainNode() }
  createBufferSource() { return new FakeBufferSource() }
  async decodeAudioData() { return {} }
  resume() {}
}

// jsdom 沒有 AudioContext；除了 mute-gating 測試（斷言「連 ctx 都沒碰」不需要它），其餘
// 只要走到未 muted 的 _beep()/_playSample() 就會建 ctx，故全域頂一個假的。
beforeEach(() => { vi.stubGlobal('AudioContext', FakeAudioContext) })
afterEach(() => { vi.unstubAllGlobals() })

describe('AudioManager — mute state', () => {
  it('defaults to unmuted when storage has no value', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    expect(a.muted).toBe(false)
  })

  it('reads muted=true back from storage at construction', () => {
    const a = new AudioManager({ storage: fakeStorage({ 'darkline.mute': '1' }) })
    expect(a.muted).toBe(true)
  })

  it('treats any non-"1" stored value as unmuted', () => {
    const a = new AudioManager({ storage: fakeStorage({ 'darkline.mute': '0' }) })
    expect(a.muted).toBe(false)
  })

  it('toggleMute flips state, persists to storage, and returns the new state', () => {
    const st = fakeStorage()
    const a = new AudioManager({ storage: st })
    expect(a.toggleMute()).toBe(true)
    expect(st.getItem('darkline.mute')).toBe('1')
    expect(a.muted).toBe(true)
    expect(a.toggleMute()).toBe(false)
    expect(st.getItem('darkline.mute')).toBe('0')
    expect(a.muted).toBe(false)
  })

  it('round-trips through a fresh instance sharing the same storage', () => {
    const st = fakeStorage()
    new AudioManager({ storage: st }).toggleMute()   // mute, discard instance
    const b = new AudioManager({ storage: st })
    expect(b.muted).toBe(true)
  })

  it('does not throw when storage is unavailable (e.g. null)', () => {
    const a = new AudioManager({ storage: null })
    expect(a.muted).toBe(false)
    expect(() => a.toggleMute()).not.toThrow()
    expect(a.muted).toBe(true)
  })
})

describe('AudioManager — mute gates playback', () => {
  it('_beep is a no-op when muted (never touches the AudioContext)', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    a.muted = true
    const ensure = vi.spyOn(a, '_ensureCtx')
    a.gunshot()
    expect(ensure).not.toHaveBeenCalled()
    expect(a.ctx).toBeNull()
  })

  it('_playSample returns true when muted even without a loaded buffer, so callers do not fall back to _beep', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    a.muted = true
    const beep = vi.spyOn(a, '_beep')
    expect(a._playSample('gunshot')).toBe(true)
    expect(beep).not.toHaveBeenCalled()
  })

  it('unmuted _playSample still returns false with no loaded buffer, so the caller falls back to _beep', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    expect(a._playSample('gunshot')).toBe(false)
  })
})

describe('AudioManager — new SFX methods', () => {
  it('decodeSolved() delegates to the clearPoint() arpeggio', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    // mockImplementation：只斷言委派關係，不讓 clearPoint 的 4 個 real setTimeout 溢出到測試外
    // （clearPoint 本身另有測試覆蓋其 beep 排程細節，這裡不重複驗證）。
    const clearPoint = vi.spyOn(a, 'clearPoint').mockImplementation(() => {})
    a.decodeSolved()
    expect(clearPoint).toHaveBeenCalledOnce()
  })

  it('decodeFail() synthesizes a low, short double-beep via _beep', () => {
    vi.useFakeTimers()
    try {
      const a = new AudioManager({ storage: fakeStorage() })
      const beep = vi.spyOn(a, '_beep')
      a.decodeFail()
      expect(beep).toHaveBeenCalledTimes(1)
      vi.runAllTimers()
      expect(beep).toHaveBeenCalledTimes(2)
      for (const [opts] of beep.mock.calls) {
        expect(opts.freq).toBeLessThan(300)      // 低頻
        expect(opts.duration).toBeLessThanOrEqual(0.1)   // 短促
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('uiTick() is short, quiet and high-pitched', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    const beep = vi.spyOn(a, '_beep')
    a.uiTick()
    expect(beep).toHaveBeenCalledOnce()
    const opts = beep.mock.calls[0][0]
    expect(opts.freq).toBeGreaterThan(1000)          // 高頻
    expect(opts.duration).toBeLessThanOrEqual(0.05)   // 極短
    expect(opts.level).toBeLessThanOrEqual(0.1)       // 極低 gain
  })

  it('uiTick() is muted-gated like every other sound', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    a.muted = true
    const ensure = vi.spyOn(a, '_ensureCtx')
    a.uiTick()
    expect(ensure).not.toHaveBeenCalled()
  })

  it('existing methods are unaffected: gunshot() still does the two-stage synth fallback', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    const beep = vi.spyOn(a, '_beep')
    vi.useFakeTimers()
    try {
      a.gunshot()
      expect(beep).toHaveBeenCalledTimes(1)
      vi.runAllTimers()
      expect(beep).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('AudioManager — end-to-end synth path with a fake AudioContext', () => {
  it('gunshot() creates an AudioContext and plays when unmuted', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    expect(() => a.gunshot()).not.toThrow()
    expect(a.ctx).toBeInstanceOf(FakeAudioContext)
  })

  it('muted gunshot() never creates an AudioContext', () => {
    const a = new AudioManager({ storage: fakeStorage() })
    a.muted = true
    a.gunshot()
    expect(a.ctx).toBeNull()
  })
})
