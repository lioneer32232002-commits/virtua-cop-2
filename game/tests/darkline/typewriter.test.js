import { describe, it, expect, vi } from 'vitest'
import { typedCount, createTypewriter } from '../../src/darkline/ui/typewriter.js'

describe('typedCount', () => {
  it('scales with elapsed × cps and clamps at len', () => {
    expect(typedCount(100, 0, 40)).toBe(0)
    expect(typedCount(100, 1, 40)).toBe(40)
    expect(typedCount(100, 10, 40)).toBe(100)
  })
})

describe('createTypewriter', () => {
  it('types progressively via step(dt) and fires onDone at the end', () => {
    const el = document.createElement('p')
    const onDone = vi.fn()
    const tw = createTypewriter({ cps: 10 })
    tw.start(el, 'HELLO', { onDone })
    expect(tw.active).toBe(true)
    tw.step(0.25)                                  // 2.5 字 → 2
    expect(el.textContent).toBe('HE')
    expect(el.classList.contains('typing')).toBe(true)
    tw.step(10)
    expect(el.textContent).toBe('HELLO')
    expect(tw.active).toBe(false)
    expect(el.classList.contains('typing')).toBe(false)
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('finish() completes instantly (N 跳過打字)', () => {
    const el = document.createElement('p')
    const tw = createTypewriter({ cps: 10 })
    tw.start(el, '密電解碼')
    tw.finish()
    expect(el.textContent).toBe('密電解碼')
    expect(tw.active).toBe(false)
  })
  it('empty text is done immediately', () => {
    const el = document.createElement('p')
    const tw = createTypewriter()
    tw.start(el, '')
    expect(tw.active).toBe(false)
  })
  it('prefers-reduced-motion → start 即直出全文（無動畫）', () => {
    const orig = globalThis.matchMedia
    try {
      globalThis.matchMedia = () => ({ matches: true })
      const el = document.createElement('p')
      const tw = createTypewriter({ cps: 10 })
      tw.start(el, 'HELLO')
      expect(el.textContent).toBe('HELLO')
      expect(el.classList.contains('typing')).toBe(false)
      expect(tw.active).toBe(false)
    } finally {
      if (orig === undefined) delete globalThis.matchMedia
      else globalThis.matchMedia = orig
    }
  })
  it('動畫中重新 start → 從 0 重打新文字', () => {
    const el = document.createElement('p')
    const tw = createTypewriter({ cps: 10 })
    tw.start(el, 'HELLO')
    tw.step(0.25)                                  // 打到一半
    tw.start(el, 'NEW TEXT')                       // 重新開始
    expect(el.textContent).toBe('')                // 從 0 重打
    expect(tw.active).toBe(true)
    tw.step(10)
    expect(el.textContent).toBe('NEW TEXT')
  })
  it('double finish() 冪等：onDone 只 fire 一次', () => {
    const el = document.createElement('p')
    const onDone = vi.fn()
    const tw = createTypewriter({ cps: 10 })
    tw.start(el, 'HELLO', { onDone })
    tw.finish()
    tw.finish()
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('onTick fires per step while new characters land (uiTick 掛點)', () => {
    const el = document.createElement('p')
    const onTick = vi.fn()
    const tw = createTypewriter({ cps: 10 })   // 10 cps → 每步 0.5s 打 5 字，遠超節流門檻
    tw.start(el, 'HELLO WORLD', { onTick })
    tw.step(0.5)   // +5 字
    expect(onTick).toHaveBeenCalledTimes(1)
    tw.step(0.5)   // +5 字
    expect(onTick).toHaveBeenCalledTimes(2)
  })

  it('onTick 節流：同一步內字數不足 3 且時間 <45ms 時不重複 tick', () => {
    const el = document.createElement('p')
    const onTick = vi.fn()
    const tw = createTypewriter({ cps: 45 })   // ~22ms/字
    tw.start(el, 'ABCDEFGHIJ', { onTick })
    tw.step(0.03)   // ~1.35 字 → 1 字，但 30ms < 45ms 且 <3 字 → 不 tick
    expect(onTick).not.toHaveBeenCalled()
    tw.step(0.03)   // 累計 ~60ms/2.7 字 → 觸發（時間門檻）
    expect(onTick).toHaveBeenCalledOnce()
  })

  it('finish() 跳完打字不補發 onTick（不噴一串）', () => {
    const el = document.createElement('p')
    const onTick = vi.fn()
    const tw = createTypewriter({ cps: 10 })
    tw.start(el, 'HELLO', { onTick })
    tw.step(0.1)                 // 觸發一次 tick
    const before = onTick.mock.calls.length
    tw.finish()                  // N 跳完
    expect(onTick.mock.calls.length).toBe(before)
    expect(el.textContent).toBe('HELLO')
  })

  it('沒傳 onTick 時 step() 照常運作（可選依賴）', () => {
    const el = document.createElement('p')
    const tw = createTypewriter({ cps: 10 })
    expect(() => { tw.start(el, 'HELLO'); tw.step(1) }).not.toThrow()
    expect(el.textContent).toBe('HELLO')
  })
})
