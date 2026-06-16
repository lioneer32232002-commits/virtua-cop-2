const { app, BrowserWindow } = require('electron')
const path = require('path')

// Claude 端看 sprite：設 DARKLINE_DEBUG_PORT（例 9222）開 CDP remote debugging，
// 再用 shot.cjs 連進來截真實畫面 —— 繞開 Claude preview 隱藏視窗 rAF 凍結、
// 看不到動畫/sprite 的限制（Electron 視窗 rAF 正常）。流程見 electron/README.md。
// appendSwitch 必須在 app ready 前呼叫，故放 module 頂層。
if (process.env.DARKLINE_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env.DARKLINE_DEBUG_PORT)
}

// 本機真實視窗看 sprite。
// 為何走 dev server 而非 loadFile(dist)：
//   1) Electron 桌面視窗 backgroundThrottling:false → rAF 不凍結，動畫/sprite 真的會動，
//      不像 Claude preview 的隱藏視窗會停影格。
//   2) 敵 sprite 走絕對路徑 /darkline/sprites/*.png（見 first-island-chain.js），
//      只有 http(dev server) 解析得到；file:// 會把它當檔案系統根 → 404，sprite 全空。
// 預設接 Vite dev server 的 darkline 入口；先 `cd game && npm run dev` 再 `cd electron && npm start`。
//   - DARKLINE_URL    完整覆寫載入網址（換 entry / 換機器 IP 給另一台本機連時用）
//   - DARKLINE_PORT   只覆寫 dev server port（預設 5173，對齊 vite.config）
//   - DARKLINE_FILE   設任意值 → 改載 dist/darkline.html（離線打包用；注意 sprite 會 404）
//   - DARKLINE_DEVTOOLS 設任意值 → 開 DevTools
const DEV_URL =
  process.env.DARKLINE_URL ||
  `http://localhost:${process.env.DARKLINE_PORT || 5173}/darkline.html`

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#000',
    webPreferences: { backgroundThrottling: false },
  })

  if (process.env.DARKLINE_FILE) {
    win.loadFile(path.join(__dirname, '..', 'game', 'dist', 'darkline.html'))
  } else {
    win.loadURL(DEV_URL)
  }

  // dev server 沒起來時別只給白屏：印出原因，方便排查。
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[darkline] 載入失敗 ${code} ${desc} → ${url}`)
    console.error('[darkline] dev server 起了嗎？先在 game/ 跑 `npm run dev`。')
  })

  if (process.env.DARKLINE_DEVTOOLS) win.webContents.openDevTools()
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
