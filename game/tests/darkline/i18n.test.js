// game/tests/darkline/i18n.test.js
import { describe, it, expect } from 'vitest'
import { translate, I18n } from '../../src/darkline/core/i18n.js'

const DICT = { 'hud.score': '分數', 'card.justice': 'JUSTICE SHOT', 'brief.line': '攔截 {name} 的交接' }

describe('translate', () => {
  it('returns the string for a known key', () => {
    expect(translate(DICT, 'hud.score')).toBe('分數')
  })
  it('echoes the key when missing (so a forgotten string is visible, not blank)', () => {
    expect(translate(DICT, 'nope.missing')).toBe('nope.missing')
  })
  it('interpolates {vars}', () => {
    expect(translate(DICT, 'brief.line', { name: '老周' })).toBe('攔截 老周 的交接')
  })
})

describe('I18n', () => {
  it('t() wraps translate over an instance dict', () => {
    const i = new I18n(DICT)
    expect(i.t('card.justice')).toBe('JUSTICE SHOT')
    expect(i.t('missing')).toBe('missing')
  })
})
