// game/tests/darkline/lang.test.js
import { describe, it, expect } from 'vitest'
import { pickLang, dictFor } from '../../src/darkline/core/lang.js'
import zh from '../../src/locales/zh.json'
import en from '../../src/locales/en.json'

describe('pickLang', () => {
  it('prefers explicit ?lang query', () => {
    expect(pickLang({ query: 'en', stored: 'zh' })).toBe('en')
  })
  it('falls back to stored when query is null', () => {
    expect(pickLang({ query: null, stored: 'en' })).toBe('en')
  })
  it('uses fallback default when both query and stored are null', () => {
    expect(pickLang({ query: null, stored: null, fallback: 'zh' })).toBe('zh')
  })
  it('ignores unknown lang codes and falls back', () => {
    expect(pickLang({ query: 'fr', stored: null, fallback: 'zh' })).toBe('zh')
  })
  it('ignores unknown stored lang and uses fallback', () => {
    expect(pickLang({ query: null, stored: 'fr', fallback: 'zh' })).toBe('zh')
  })
})

describe('dictFor', () => {
  it('returns en dict with correct menu.title', () => {
    const d = dictFor('en')
    expect(d['menu.title']).toBe('DARKLINE — First Island Chain')
  })
  it('returns zh dict for zh', () => {
    const d = dictFor('zh')
    expect(d['menu.title']).toBe('暗線 — 第一島鏈')
  })
  it('returns zh dict for unknown lang (safe fallback)', () => {
    const d = dictFor('fr')
    expect(d).toBe(dictFor('zh'))
  })
})

describe('key alignment guard', () => {
  it('en mirrors all keys of zh (no missing translations)', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('v3 narrative reskin — no stale proper nouns', () => {
  const blob = JSON.stringify(zh) + JSON.stringify(en)
  for (const stale of ['林沂', '老周', 'Lin Yi', 'Old Zhou']) {
    it(`contains no stale name: ${stale}`, () => {
      expect(blob).not.toContain(stale)
    })
  }
  it('opening names Lin Chien-kuo via the gloss line', () => {
    expect(en['brief.body2']).toContain('Chien-kuo')
  })
})

describe('Arena2/Boss beats — story cards present + §13 compliance', () => {
  const KEYS = ['card.mentor.title', 'card.mentor.body', 'card.frame.title', 'card.frame.body']
  // §13/deep-research 禁用詞（時代錯置或對象式影射）：不得出現在任一新卡的 zh/en。
  const FORBIDDEN = ['情報局', '軍情局', '警備總部', '黑金', '國民黨', '黃埔']

  for (const k of KEYS) {
    it(`zh and en both define ${k}`, () => {
      expect(zh[k]).toBeTruthy()
      expect(en[k]).toBeTruthy()
    })
  }
  it('mentor card names Old Nieh and the Domestic Affairs Section (zh)', () => {
    expect(zh['card.mentor.body']).toContain('老聶')
    expect(zh['card.mentor.body']).toContain('內勤科')
  })
  it('frame card names the Domestic Affairs Section (zh)', () => {
    expect(zh['card.frame.body']).toContain('內勤科')
  })
  it('neither card uses any §13 forbidden term (zh or en)', () => {
    const blob = KEYS.map(k => (zh[k] || '') + (en[k] || '')).join('')
    for (const term of FORBIDDEN) expect(blob).not.toContain(term)
  })
})
