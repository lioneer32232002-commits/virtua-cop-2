// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mountDecodePanel } from '../../src/darkline/intel/DecodePanel.js'
import { makePuzzle } from '../../src/darkline/intel/decode.js'
import { I18n } from '../../src/darkline/core/i18n.js'

const i18n = new I18n({
  'decode.title': '密電解碼',
  'decode.cipher': '攔截電文：',
  'decode.aim': '對位 密文 {c} 解出 {a}',
  'decode.confirm': '確認解碼',
  'decode.fail': '對位錯誤，重新對位',
  'decode.needkey': '缺密碼鑰匙',
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

  it('open shows the cipher and the aim window, and hides the full plaintext', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    panel.open(puzzle, { keyFound: true })
    expect(panel.isOpen).toBe(true)
    expect(el.classList.contains('hidden')).toBe(false)
    expect(el.querySelector('.decode-cipher').textContent).toContain(puzzle.cipher)
    expect(el.querySelector('.decode-aim').textContent).toContain(puzzle.crib.cipher)
    expect(el.querySelector('.decode-reveal').textContent).toBe('')   // 解出前不顯示全文
  })

  it('rotating the dial updates the aim window but does not reveal or solve', () => {
    const { el, panel } = setup()
    panel.open(makePuzzle(5, FRAG), { keyFound: true })   // seed 5 → shift 6
    const before = el.querySelector('.decode-aim').textContent
    el.querySelector('.decode-right').click()
    expect(el.querySelector('.decode-aim').textContent).not.toBe(before)
    expect(el.querySelector('.decode-reveal').textContent).toBe('')
    expect(el.querySelector('.decode-status').textContent).toBe('')
  })

  it('confirming while misaligned shows the fail status and does not solve', () => {
    const { el, panel } = setup()
    let solves = 0
    panel.open(makePuzzle(5, FRAG), { keyFound: true, onSolve: () => solves++ })
    el.querySelector('.decode-confirm').click()   // dial 0, not aligned
    expect(solves).toBe(0)
    expect(el.querySelector('.decode-status').textContent).toContain('對位錯誤')
    expect(el.querySelector('.decode-reveal').textContent).toBe('')
  })

  it('confirming when aligned solves once, reveals the plaintext and the clue', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)   // shift 6
    let solves = 0; let revealed = null
    panel.open(puzzle, { keyFound: true, onSolve: txt => { solves++; revealed = txt } })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    expect(solves).toBe(0)   // 已對齊，但還沒按確認
    el.querySelector('.decode-confirm').click()
    expect(solves).toBe(1)
    expect(revealed).toBe('THE LIST SAILS NORTH')
    expect(el.querySelector('.decode-reveal').textContent).toBe('THE LIST SAILS NORTH')
    expect(el.querySelector('.decode-status').textContent).toContain('解碼成功')
    expect(el.querySelector('.decode-status').textContent).toContain('名單往北方送')
  })

  it('does not re-fire onSolve after solved', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    let solves = 0
    panel.open(puzzle, { keyFound: true, onSolve: () => solves++ })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    el.querySelector('.decode-confirm').click()
    el.querySelector('.decode-confirm').click()   // 再按確認
    el.querySelector('.decode-right').click()      // 再轉
    expect(solves).toBe(1)
  })

  it('shows the need-key hint without the key and hides it with the key', () => {
    const { el, panel } = setup()
    panel.open(makePuzzle(5, FRAG), { keyFound: false })
    expect(el.querySelector('.decode-needkey').textContent).toContain('缺密碼鑰匙')
    panel.close()
    panel.open(makePuzzle(5, FRAG), { keyFound: true })
    expect(el.querySelector('.decode-needkey').textContent).toBe('')
  })

  it('Enter confirms and Escape closes', () => {
    const { el, panel } = setup()
    const puzzle = makePuzzle(5, FRAG)
    let solves = 0; let closed = 0
    panel.open(puzzle, { keyFound: true, onSolve: () => solves++, onClose: () => closed++ })
    for (let i = 0; i < puzzle.answer; i++) el.querySelector('.decode-right').click()
    window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Enter' }))
    expect(solves).toBe(1)
    window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'Escape' }))
    expect(panel.isOpen).toBe(false)
    expect(closed).toBe(1)
  })

  it('close hides the panel and fires onClose', () => {
    const { el, panel } = setup()
    let closed = 0
    panel.open(makePuzzle(5, FRAG), { keyFound: true, onClose: () => closed++ })
    panel.close()
    expect(panel.isOpen).toBe(false)
    expect(el.classList.contains('hidden')).toBe(true)
    expect(closed).toBe(1)
  })
})
