// GSAP 時間軸決定性測試：卸掉內建 ticker、用 gsap.updateRoot(秒) 手動推時間（GSAP 官方做法）。
import { describe, it, expect, beforeAll } from 'vitest'
import { gsap } from 'gsap'
import { mountTransition } from '../../src/darkline/ui/transition.js'

beforeAll(() => {
  gsap.ticker.remove(gsap.updateRoot)
  gsap.updateRoot(0)
})

describe('mountTransition', () => {
  it('cover() resolves once the wipe fully covers; reveal() clears it', async () => {
    const host = document.createElement('div')
    const t = mountTransition(host)
    expect(t.isCovered).toBe(false)

    let covered = false
    t.cover({ duration: 0.3 }).then(() => { covered = true })
    gsap.updateRoot(0.1)
    expect(host.classList.contains('active')).toBe(true)   // wipe 進行中即遮擋
    expect(t.isCovered).toBe(false)                        // onComplete 才翻 true（進行中仍未覆蓋完成）
    gsap.updateRoot(0.5)
    await Promise.resolve()                                 // flush promise
    expect(covered).toBe(true)
    expect(t.isCovered).toBe(true)

    let revealed = false
    t.reveal({ duration: 0.3 }).then(() => { revealed = true })
    gsap.updateRoot(1.0)
    await Promise.resolve()
    expect(revealed).toBe(true)
    expect(t.isCovered).toBe(false)
    expect(host.classList.contains('active')).toBe(false)
  })
})
