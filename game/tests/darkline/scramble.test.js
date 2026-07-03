// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { SCRAMBLE_CHARSET, scrambleFrame, createScramble } from '../../src/darkline/intel/scramble.js'

const rng0 = () => 0   // 決定性 rng：永遠取 charset[0]

describe('scrambleFrame', () => {
  it('t=0 全亂碼（空白除外）、t=1 全明文', () => {
    const plain = 'PIER THREE'
    const s0 = scrambleFrame(plain, 0, rng0)
    expect(s0).not.toBe(plain)
    expect(s0[4]).toBe(' ')                          // 空白不亂
    expect(s0[0]).toBe(SCRAMBLE_CHARSET[0])          // rng 可注入 → 決定性
    expect(scrambleFrame(plain, 1, rng0)).toBe(plain)
  })
  it('鎖定由左至右單調前進', () => {
    const plain = 'ABCDEFGHIJ'
    expect(scrambleFrame(plain, 0.5, rng0).slice(0, 5)).toBe('ABCDE')
    expect(scrambleFrame(plain, 0.8, rng0).slice(0, 8)).toBe('ABCDEFGH')
  })
})

describe('createScramble', () => {
  it('step(dt) 收斂到明文、加 ok、fire onDone', () => {
    const el = document.createElement('div')
    let doneCount = 0
    const sc = createScramble({ duration: 1, rng: rng0 })
    sc.start(el, 'DARKLINE', { onDone: () => doneCount++ })
    expect(sc.active).toBe(true)
    expect(el.classList.contains('converging')).toBe(true)
    sc.step(0.5)
    expect(el.textContent.slice(0, 4)).toBe('DARK')   // 前半已鎖
    expect(el.textContent).not.toBe('DARKLINE')
    sc.step(1)
    expect(el.textContent).toBe('DARKLINE')
    expect(el.classList.contains('converging')).toBe(false)
    expect(el.classList.contains('ok')).toBe(true)
    expect(sc.active).toBe(false)
    expect(doneCount).toBe(1)
  })
  it('prefers-reduced-motion → start 即明文 + ok（無動畫直出）', () => {
    const orig = globalThis.matchMedia
    try {
      globalThis.matchMedia = () => ({ matches: true })
      const el = document.createElement('div')
      const onDone = vi.fn()
      const sc = createScramble({ duration: 1, rng: rng0 })
      sc.start(el, 'DARKLINE', { onDone })
      expect(el.textContent).toBe('DARKLINE')
      expect(el.classList.contains('converging')).toBe(false)
      expect(el.classList.contains('ok')).toBe(true)
      expect(sc.active).toBe(false)
      expect(onDone).toHaveBeenCalledOnce()
    } finally {
      if (orig === undefined) delete globalThis.matchMedia
      else globalThis.matchMedia = orig
    }
  })
  it('double finish() 冪等：onDone 恰 fire 一次', () => {
    const el = document.createElement('div')
    const onDone = vi.fn()
    const sc = createScramble({ duration: 1, rng: rng0 })
    sc.start(el, 'DARKLINE', { onDone })
    sc.finish()
    sc.finish()
    expect(onDone).toHaveBeenCalledOnce()
  })
})
