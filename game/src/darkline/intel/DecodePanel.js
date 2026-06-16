// 情報解碼面板（DOM overlay）。把已測的 decode.js（凱撒轉盤密碼）接成可玩 UI：
// 顯示攔截電文 + 已知對應(crib)，玩家用 ◀ ▶（或 ← →）轉動轉盤位移，預覽即時更新；
// 對齊到正解時自動判定成功、揭露線索、呼叫 onSolve（只一次）。pointerlock 的暫解除/復原
// 由整合層（darkline.js）在 open/onClose 時管。
import { applyGuess, previewText, isSolved } from './decode.js'

export function mountDecodePanel(container, { i18n }) {
  container.innerHTML = ''
  container.classList.add('hidden')

  const card = el('div', 'decode-card')
  const title = el('h2', 'decode-title')
  const cipherEl = el('div', 'decode-cipher')
  const cribEl = el('div', 'decode-crib')
  const dialRow = el('div', 'decode-dial')
  const left = btn('◀', 'decode-btn decode-left')
  const shiftEl = el('span', 'decode-shift')
  const right = btn('▶', 'decode-btn decode-right')
  dialRow.append(left, shiftEl, right)
  const previewEl = el('div', 'decode-preview')
  const hintEl = el('div', 'decode-hint')
  const statusEl = el('div', 'decode-status')
  const closeBtn = btn('', 'decode-btn decode-close')
  card.append(title, cipherEl, cribEl, dialRow, previewEl, hintEl, statusEl, closeBtn)
  container.append(card)

  let state = null
  let onSolve = null
  let onClose = null
  let solved = false
  let open = false

  function render() {
    title.textContent = i18n.t('decode.title')
    cipherEl.textContent = i18n.t('decode.cipher') + ' ' + state.cipher
    cribEl.textContent = i18n.t('decode.crib', { c: state.crib.cipher, p: state.crib.plain })
    shiftEl.textContent = '+' + state.dial
    previewEl.textContent = previewText(state)
    hintEl.textContent = solved ? '' : i18n.t('decode.hint')
  }

  function rotate(delta) {
    if (!open || solved) return
    state = applyGuess(state, state.dial + delta)
    render()
    if (isSolved(state)) markSolved()
  }

  function markSolved() {
    solved = true
    previewEl.classList.add('ok')
    statusEl.textContent = i18n.t('decode.solved') + ' ' + i18n.t('decode.clue')
    hintEl.textContent = ''
    onSolve?.(previewText(state))
  }

  left.addEventListener('click', () => rotate(-1))
  right.addEventListener('click', () => rotate(1))
  closeBtn.addEventListener('click', () => api.close())

  function onKey(e) {
    if (!open) return
    if (e.code === 'ArrowLeft') { e.preventDefault(); rotate(-1) }
    else if (e.code === 'ArrowRight') { e.preventDefault(); rotate(1) }
    else if (e.code === 'Escape') { e.preventDefault(); api.close() }
  }
  window.addEventListener('keydown', onKey)

  const api = {
    get isOpen() { return open },
    open(puzzle, opts = {}) {
      state = puzzle
      onSolve = opts.onSolve
      onClose = opts.onClose
      solved = false
      previewEl.classList.remove('ok')
      statusEl.textContent = ''
      closeBtn.textContent = i18n.t('decode.close')
      render()
      open = true
      container.classList.remove('hidden')
    },
    close() {
      if (!open) return
      open = false
      container.classList.add('hidden')
      onClose?.()
    },
  }
  return api
}

function el(tag, cls) {
  const e = document.createElement(tag)
  e.className = cls
  return e
}
function btn(label, cls) {
  const b = document.createElement('button')
  b.className = cls
  b.textContent = label
  return b
}
