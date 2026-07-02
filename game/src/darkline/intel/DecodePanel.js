// 情報解碼面板（DOM overlay）。凱撒轉盤密碼的「部分提示＋確認制」UI：
// 顯示攔截電文 + 對位窗（密文某字母 → 當前轉盤把它解出的字母），玩家轉動轉盤把對位窗
// 對到「紙片」給的明文鑰匙，按「確認」才判定。解出前不顯示全文（撤即時 preview，修
// 「看到英文就破」）。未拾鑰匙紙片時顯示軟提示（仍可嘗試，無硬閘）。pointerlock 的
// 暫解除/復原由整合層（darkline.js）在 open/onClose 時管。
import { applyGuess, cribMappingAt, previewText, isSolved } from './decode.js'
import { createScramble } from './scramble.js'

export function mountDecodePanel(container, { i18n }) {
  container.innerHTML = ''
  container.classList.add('hidden')

  const card = el('div', 'decode-card')
  const title = el('h2', 'decode-title')
  const cipherEl = el('div', 'decode-cipher')
  const aimEl = el('div', 'decode-aim')
  const dialRow = el('div', 'decode-dial')
  const left = btn('◀', 'decode-btn decode-left')
  const shiftEl = el('span', 'decode-shift')
  const right = btn('▶', 'decode-btn decode-right')
  dialRow.append(left, shiftEl, right)
  const revealEl = el('div', 'decode-reveal')
  const needkeyEl = el('div', 'decode-needkey')
  const statusEl = el('div', 'decode-status')
  const confirmBtn = btn('', 'decode-btn decode-confirm')
  const closeBtn = btn('', 'decode-btn decode-close')
  card.append(title, cipherEl, aimEl, dialRow, revealEl, needkeyEl, statusEl, confirmBtn, closeBtn)
  container.append(card)

  let state = null
  let onSolve = null
  let onClose = null
  let solved = false
  let open = false
  let keyFound = false
  const scramble = createScramble()

  function render() {
    title.textContent = i18n.t('decode.title')
    cipherEl.textContent = i18n.t('decode.cipher') + ' ' + state.cipher
    aimEl.textContent = i18n.t('decode.aim', { c: state.crib.cipher, a: cribMappingAt(state) })
    shiftEl.textContent = '+' + state.dial
    if (!solved) revealEl.textContent = ''   // 已解時不覆蓋（scramble 動畫中的內容）
    needkeyEl.textContent = (!keyFound && !solved) ? i18n.t('decode.needkey') : ''
  }

  function rotate(delta) {
    if (!open || solved) return
    state = applyGuess(state, state.dial + delta)
    statusEl.textContent = ''   // 轉動即清掉上次「對位錯誤」
    render()
  }

  // 確認制：對齊（dial===answer，等同把 crib 對到正解）才解；否則軟性失敗、可一直再試。
  function tryConfirm() {
    if (!open || solved) return
    if (isSolved(state)) markSolved()
    else statusEl.textContent = i18n.t('decode.fail')
  }

  function markSolved() {
    solved = true
    needkeyEl.textContent = ''
    // 招牌時刻：亂碼收斂成明文，收斂完成那一刻才點亮 ok + 揭露 clue（演出）；
    // onSolve（計分/旗標）立即觸發，遊戲狀態不等動畫。
    scramble.start(revealEl, previewText(state), {
      onDone: () => { statusEl.textContent = i18n.t('decode.solved') + ' ' + i18n.t('decode.clue') },
    })
    onSolve?.(previewText(state))
  }

  left.addEventListener('click', () => rotate(-1))
  right.addEventListener('click', () => rotate(1))
  confirmBtn.addEventListener('click', () => tryConfirm())
  closeBtn.addEventListener('click', () => api.close())

  function onKey(e) {
    if (!open) return
    if (e.code === 'ArrowLeft') { e.preventDefault(); rotate(-1) }
    else if (e.code === 'ArrowRight') { e.preventDefault(); rotate(1) }
    else if (e.code === 'Enter') { e.preventDefault(); tryConfirm() }
    else if (e.code === 'Escape') { e.preventDefault(); api.close() }
  }
  window.addEventListener('keydown', onKey)

  const api = {
    get isOpen() { return open },
    open(puzzle, opts = {}) {
      state = puzzle
      onSolve = opts.onSolve
      onClose = opts.onClose
      keyFound = !!opts.keyFound
      solved = false
      revealEl.classList.remove('ok')
      revealEl.classList.remove('converging')
      statusEl.textContent = ''
      confirmBtn.textContent = i18n.t('decode.confirm')
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
    step(dt) { scramble.step(dt) },   // GameLoop 在 decode.isOpen 時餵 dt（推收斂演出）
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
