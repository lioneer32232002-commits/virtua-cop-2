// game/src/darkline/core/cards.js
// 簡報/結尾/故事卡 純文字 overlay 填字（走 i18n）。vars 供故事卡內插（如紙片的鑰匙 {c}/{p}）。
// 注入 element（含 h1/p 子節點）讓它可測。
export function renderCard(el, i18n, titleKey, bodyKey, vars) {
  el.querySelector('h1').textContent = i18n.t(titleKey)
  el.querySelector('p').textContent = i18n.t(bodyKey, vars)
}
