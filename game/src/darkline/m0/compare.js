// 丟棄式驗收頁：把幾張 Gemini 敵人原圖，各過 M0 管線（去背+量化），原圖/處理後並排，
// 供肉眼判斷「多張是否被收斂成同一風格」（Phase A 檢查點未知數 ①）。
import { processToCanvas, loadImage } from './buildSprite.js'

const FILES = ['enemy.png', 'enemy2.png', 'enemy3.png']
const out = document.getElementById('out')
out.textContent = ''

for (const f of FILES) {
  const row = document.createElement('div'); row.className = 'row'

  let img
  try { img = await loadImage('m0/' + f) }
  catch { const e = document.createElement('div'); e.textContent = `（${f} 載入失敗）`; row.appendChild(e); out.appendChild(row); continue }

  // 原圖縮圖
  const oc = document.createElement('canvas'); oc.width = oc.height = 96
  oc.getContext('2d').drawImage(img, 0, 0, 96, 96)
  // 過 M0 管線
  const pc = processToCanvas(img)

  const cellOrig = document.createElement('div'); cellOrig.className = 'cell'
  cellOrig.appendChild(oc)
  const l1 = document.createElement('div'); l1.className = 'lbl'; l1.textContent = f; cellOrig.appendChild(l1)

  const arrow = document.createElement('div'); arrow.className = 'arrow'; arrow.textContent = '→'

  const cellProc = document.createElement('div'); cellProc.className = 'cell'
  cellProc.appendChild(pc)
  const l2 = document.createElement('div'); l2.className = 'lbl'; l2.textContent = '過管線'; cellProc.appendChild(l2)

  row.appendChild(cellOrig); row.appendChild(arrow); row.appendChild(cellProc)
  out.appendChild(row)
}
