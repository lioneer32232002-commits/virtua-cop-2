// game/src/darkline/ui/menu.js
// 最簡選單（M2 Phase 2）：標題 + 開始任務 + 繼續（有存檔才亮）+ 語言切換（中文/English）。
// 純 DOM、接 callback；語言/存檔判斷交給整合層（darkline.js），這裡不碰 localStorage/URL。
// 切換語言＝呼叫 onLang(code)，由整合層寫 storage + reload 帶 ?lang=（最簡、免逐字重建）。

function button(label, onClick, cls = 'menu-btn') {
  const b = document.createElement('button')
  b.className = cls
  b.textContent = label
  b.addEventListener('click', onClick)
  return b
}

// mountMenu(el, opts) → { hide() }
//   el        : #menu 容器（會被清空後填入）
//   i18n      : I18n 實例（已依當前語言建好字典）
//   lang      : 當前語言碼（'zh'|'en'），用來標示語言鈕 active
//   hasSave   : 是否有存檔點（控「繼續」可用）
//   onStart   : 點「開始任務」
//   onContinue: 點「繼續」（hasSave 為 false 時不會觸發）
//   onLang    : 點語言鈕，帶目標語言碼（與當前相同時不觸發）
export function mountMenu(el, { i18n, lang, hasSave, onStart, onContinue, onLang }) {
  el.innerHTML = ''
  el.classList.remove('hidden')

  const title = document.createElement('h1')
  title.className = 'menu-title'
  title.textContent = i18n.t('menu.title')

  const start = button(i18n.t('menu.start'), () => onStart())

  const cont = button(i18n.t('menu.continue'), () => { if (hasSave) onContinue() })
  if (!hasSave) { cont.classList.add('disabled'); cont.disabled = true }

  // 語言鈕：語言名稱用各自語系顯示（不隨 UI 語言翻譯），當前語言標 active。
  const langRow = document.createElement('div')
  langRow.className = 'menu-lang'
  for (const [code, label] of [['zh', '中文'], ['en', 'English']]) {
    const b = button(label, () => { if (code !== lang) onLang(code) })
    if (code === lang) b.classList.add('active')
    langRow.append(b)
  }

  el.append(title, start, cont, langRow)

  return {
    hide() { el.classList.add('hidden'); el.innerHTML = '' },
  }
}
