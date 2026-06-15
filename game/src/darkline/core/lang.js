import zh from '../../locales/zh.json'
import en from '../../locales/en.json'

const DICTS = { zh, en }
export const LANGS = ['zh', 'en']

// 語言選擇：?lang= query 優先 > localStorage 存的 > fallback。未知碼忽略。
export function pickLang({ query, stored, fallback = 'zh' } = {}) {
  if (LANGS.includes(query)) return query
  if (LANGS.includes(stored)) return stored
  return fallback
}

// 取字典物件；未知語言回 zh（安全 fallback）。
export function dictFor(lang) {
  return DICTS[lang] ?? DICTS.zh
}
