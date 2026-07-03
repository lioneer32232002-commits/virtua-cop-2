// zh/en 字典鍵集合全等守衛（文案兩邊都要有，防單邊漏鍵 tofu/英文殘留）。
// 注意：feat/first-act-narrative 分支有同路徑同用途的守衛，合併時任取一版即可。
import { describe, it, expect } from 'vitest'
import zh from '../../src/locales/zh.json'
import en from '../../src/locales/en.json'

describe('i18n key alignment', () => {
  it('zh/en expose identical key sets', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })
})
