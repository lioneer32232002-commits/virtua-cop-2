// game/src/darkline/core/cards.js
// 簡報/結尾純文字 overlay 填字（走 i18n）。M1 只填字 + 顯示；圖/演出留 M2。
// 注入 element（含 h1/p 子節點）讓它可測。
export function renderCard(el, i18n, titleKey, bodyKey) {
  el.querySelector('h1').textContent = i18n.t(titleKey)
  el.querySelector('p').textContent = i18n.t(bodyKey)
}
