import { describe, it, expect } from 'vitest'
import { renderCard } from '../../src/darkline/core/cards.js'
import { I18n } from '../../src/darkline/core/i18n.js'

const i18n = new I18n({ 'ending.title': '任務完成', 'ending.body': '名單到手了。' })

describe('renderCard', () => {
  it('fills a card element with translated title + body', () => {
    const store = { h1: { textContent: '' }, p: { textContent: '' } }
    const el = { querySelector: sel => (sel === 'h1' ? store.h1 : store.p) }
    renderCard(el, i18n, 'ending.title', 'ending.body')
    expect(store.h1.textContent).toBe('任務完成')
    expect(store.p.textContent).toContain('名單到手了。')
  })
})
