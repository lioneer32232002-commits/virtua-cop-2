import { describe, it, expect } from 'vitest'
import zh from '../../src/locales/zh.json'
import en from '../../src/locales/en.json'

function flatKeys(obj, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatKeys(v, key))
    else out.push(key)
  }
  return out.sort()
}

describe('i18n key alignment', () => {
  it('zh and en have identical key sets', () => {
    expect(flatKeys(en)).toEqual(flatKeys(zh))
  })
})
