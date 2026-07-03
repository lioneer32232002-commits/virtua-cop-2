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
})
