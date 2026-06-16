// CDP 截圖：連到帶 remote-debugging-port 的 Electron，截真實畫面。
// 因為 Electron 視窗 rAF 不凍結（不像 Claude preview 的隱藏視窗），截到的是會動的
// 畫面 —— 這是讓「Claude」也能驗證 sprite 進遊戲、判斷風格的辦法。
//
// 前置：先起帶 debug port 的視窗（dev server 要先在跑）：
//   cd game     ; npm run dev                                 # 記下實際 port（5173 被占會跳號）
//   cd electron ; $env:DARKLINE_DEBUG_PORT=9222 ; $env:DARKLINE_PORT=<devPort> ; npm start
//
// 用法：
//   node shot.cjs <out.png> [waitMs] [evalExpr]
//   - port 由 env DARKLINE_DEBUG_PORT 決定（預設 9222）
//   - evalExpr 在截圖前用 Runtime.evaluate 跑。跳到有敵 sprite 的 free 段：
//       node shot.cjs free.png 3500 "document.getElementById('menu').classList.add('hidden'); window.__dl.seq.jumpTo('free')"
const fs = require('fs')
const PORT = process.env.DARKLINE_DEBUG_PORT || 9222
const OUT = process.argv[2] || 'shot.png'
const WAIT = Number(process.argv[3] || 1500)
const EVAL = process.argv[4] || ''

;(async () => {
  const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json()
  const page = list.find(t => t.type === 'page')
  if (!page) { console.error('no page target:', JSON.stringify(list)); process.exit(1) }
  console.error('target:', page.url)

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) =>
    new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  })
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })

  await send('Page.enable')
  if (EVAL) {
    const ev = await send('Runtime.evaluate', { expression: EVAL, awaitPromise: true, returnByValue: true })
    console.error('eval:', JSON.stringify(ev.result?.result ?? ev.result?.exceptionDetails ?? ev.result))
  }
  await new Promise(r => setTimeout(r, WAIT))
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (!shot.result || !shot.result.data) { console.error('capture failed:', JSON.stringify(shot)); process.exit(1) }
  fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'))
  console.error('wrote', OUT, 'bytes:', Buffer.from(shot.result.data, 'base64').length)
  ws.close()
  process.exit(0)
})().catch(e => { console.error('ERR', e); process.exit(1) })
