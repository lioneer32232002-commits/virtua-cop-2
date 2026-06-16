// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mountDecodePanel } from '../../src/darkline/intel/DecodePanel.js'
import { makePuzzle } from '../../src/darkline/intel/decode.js'
import { I18n } from '../../src/darkline/core/i18n.js'

const i18n = new I18n({
  'decode.title': '密電解碼',
  'decode.cipher': '攔截電文：',
  'decode.crib': '已知：{c}={p}',
  'decode.hint': '轉動轉盤',
  'decode.solved': '解碼成功',
  'decode.clue': '名單往北方送',
  'decode.close': '收起',
})

const FRAG = { fragments: ['THE LIST SAILS NORTH'] }

function setup() {
  document.body.innerHTML = '<div id="decode"></div>'
  const el = document.getElementById('decode')
  return { el, panel: mountDecodePanel(el, { i18n }) }
}

describe('DecodePanel', () => {
  it('starts hidden and closed', () => {
    const { el, panel } = setup()
    expect(panel.isOpen).toBe(false)
    expect(el.classList.contains('hidden')).toBe(true)
  })

  it('open shows the panel with the cipher text and crib', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    panel.open(puzzle, {})
    expect(panel.isOpen).toBe(true)
    expect(el.classList.contains('hidden')).toBe(false)
    expect(el.querySelector('.decode-cipher').textContent).toContain(puzzle.cipher)
    expect(el.querySelector('.decode-crib').textContent).toContain(puzzle.crib.cipher)
  })

  it('rotating the dial updates the preview (without solving yet)', () => {
    const { el, panel } = setup()
    panel.open(makePuzzle(5, FRAG), {})   // seed 5 → shift 6, one step won't solve
    const before = el.querySelector('.decode-preview').textContent
    el.querySelector('.decode-right').click()
    expect(el.querySelector('.decode-preview').textContent).not.toBe(before)
    expect(el.querySelector('.decode-status').textContent).toBe('')
  })

  it('fires onSolve once when the dial reaches the answer and reveals the clue', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)   // shift 6
    let solves = 0; let revealed = null
    panel.open(puzzle, { onSolve: txt => { solves++; revealed = txt } })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    expect(solves).toBe(1)
    expect(revealed).toBe('THE LIST SAILS NORTH')
    expect(el.querySelector('.decode-preview').textContent).toBe('THE LIST SAILS NORTH')
    expect(el.querySelector('.decode-status').textContent).toContain('解碼成功')
    expect(el.querySelector('.decode-status').textContent).toContain('名單往北方送')
  })

  it('does not re-fire onSolve after solved (dial locks)', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    let solves = 0
    panel.open(puzzle, { onSolve: () => solves++ })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    el.querySelector('.decode-right').click()   // extra rotation after solve
    el.querySelector('.decode-left').click()
    expect(solves).toBe(1)
  })

  it('close hides the panel and fires onClose', () => {
    const { el, panel } = setup()
    let closed = 0
    panel.open(makePuzzle(5, FRAG), { onClose: () => closed++ })
    panel.close()
    expect(panel.isOpen).toBe(false)
    expect(el.classList.contains('hidden')).toBe(true)
    expect(closed).toBe(1)
  })

  it('Escape key closes the panel when open', () => {
    const { el, panel } = setup()
    let closed = 0
    panel.open(makePuzzle(5, FRAG), { onClose: () => closed++ })
    window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Escape' }))
    expect(panel.isOpen).toBe(false)
    expect(closed).toBe(1)
  })
})
