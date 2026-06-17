// 情報解碼小遊戲：凱撒轉盤密碼（1953 冷戰諜報「密電解碼」）。
// 玩家轉動轉盤選一個位移，把攔截到的密電解回明文；crib 給一個已知對應字母把答案釘死，
// 屬 MVP 級（一步即解）。純邏輯、決定性（無 Math.random），方便 TDD 與 UI 共用。

const A = 'A'.charCodeAt(0)

// 把 0..25 取模（處理負數）。
function mod26(n) { return ((n % 26) + 26) % 26 }

// 把文字每個 A-Z 字母位移 k（其餘字元原樣保留）。負位移＝反向解密。
export function caesarShift(text, k) {
  const s = mod26(k)
  let out = ''
  for (const ch of text) {
    const c = ch.charCodeAt(0)
    if (c >= A && c < A + 26) out += String.fromCharCode(A + ((c - A + s) % 26))
    else out += ch
  }
  return out
}

// 預設密電明文池（暗號式英文電文，語言無關 → 中英版皆可直接顯示；
// 解出後的「線索解讀」走 i18n，文案在 locales，由 Phase 4 Task 4.3 定稿、用戶判對味）。
export const DEFAULT_FRAGMENTS = [
  'THE LIST SAILS NORTH',
  'HARBOR DROP AT DAWN',
  'DARKLINE ROSTER IS REAL',
]

// 取第一個 A-Z 字母（給 crib 用）。
function firstLetter(text) {
  for (const ch of text) {
    const c = ch.charCodeAt(0)
    if (c >= A && c < A + 26) return ch
  }
  return text[0] ?? ''
}

// 由 seed 決定性地生成一道謎題。opts.fragments 可注入（測試/內容分離）。
// 回傳狀態：{ cipher 密電, plain 明文, answer 加密位移(隱藏), dial 目前轉盤, crib 已知對應 }。
export function makePuzzle(seed, { fragments = DEFAULT_FRAGMENTS } = {}) {
  // 取池索引：seed % len（處理負 seed），fragments 可多於 26 項。
  const chosen = fragments[((seed % fragments.length) + fragments.length) % fragments.length]
  const answer = (((seed % 25) + 25) % 25) + 1   // 1..25，永不為 0（保證有被打亂）
  const cipher = caesarShift(chosen, answer)
  const crib = { cipher: firstLetter(cipher), plain: firstLetter(chosen) }
  return { cipher, plain: chosen, answer, dial: 0, crib }
}

// 玩家把轉盤轉到 input（會夾進 0..25）。回傳新狀態（不可變）。
export function applyGuess(state, input) {
  return { ...state, dial: mod26(input) }
}

// 用目前轉盤把密電解出來的預覽文字。
export function previewText(state) {
  return caesarShift(state.cipher, -state.dial)
}

// 解出 = 預覽文字等於明文。
export function isSolved(state) {
  return previewText(state) === state.plain
}

// 當前轉盤下，crib 密文字母被解出的明文字母。對位窗用：玩家把它轉到等於紙片給的
// crib.plain（明文鑰匙）時即對齊。等同 isSolved，但只揭露單一字母、不洩漏全文。
export function cribMappingAt(state) {
  return caesarShift(state.crib.cipher, -state.dial)
}
