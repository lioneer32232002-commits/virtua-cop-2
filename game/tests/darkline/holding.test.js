import { describe, it, expect } from 'vitest'
import { renderHolding } from '../../src/darkline/ui/holding.js'
import { I18n } from '../../src/darkline/core/i18n.js'
import zh from '../../src/locales/zh.json'

describe('renderHolding', () => {
  it('fills the holding screen from i18n (designed 直向持機畫面，非破版)', () => {
    const el = document.createElement('div')
    renderHolding(el, new I18n(zh))
    expect(el.querySelector('.holding-title').textContent).toBe(zh['holding.title'])
    expect(el.querySelector('.holding-body').textContent).toBe(zh['holding.body'])
    expect(el.querySelector('.holding-rotate').textContent).toBe(zh['holding.rotate'])
  })
})
