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
