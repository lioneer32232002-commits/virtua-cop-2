# electron — 本機真實視窗看 sprite

DARKLINE 是 three.js 遊戲，平常 `cd game && npm run dev` 在瀏覽器看就好。
這個 Electron 殼專門解一個問題：**在真實桌面視窗看 sprite/動畫**。

## 為什麼需要它

- **Claude preview 的隱藏視窗 rAF 凍結** → 看不到動畫、sprite 不動。真實視窗才看得到。
- **敵 sprite 走絕對路徑** `/darkline/sprites/*.png`（見 `game/src/darkline/mission/missions/first-island-chain.js`）。
  只有 **dev server（http）** 解析得到；`file://` 載 `dist/` 會把它當磁碟根 → 404、sprite 全空。

→ 所以 `main.cjs` **預設接 Vite dev server 的 `/`（暗線首頁）**，不是載 `dist/`。

## 怎麼跑（兩個終端）

```powershell
# 終端 1：dev server（記下實際 port，5173/5174 被占會跳號，例如 5175）
cd game ; npm run dev

# 終端 2：Electron 真實視窗（port 要對齊上面的 dev server）
cd electron ; $env:DARKLINE_PORT=5175 ; npm start
```

視窗開在選單 → 點「開始任務」→ 連按兩次 **N**（debug 跳段 briefing→rail1→free）→ free 段就能看到敵 sprite。

### 環境變數（main.cjs）

| 變數 | 作用 |
|---|---|
| `DARKLINE_PORT` | dev server port（預設 5173，對齊 `vite.config.js`） |
| `DARKLINE_URL` | 完整覆寫載入網址（換 entry，或填本機區網 IP 給**另一台機器**連） |
| `DARKLINE_FILE` | 設任意值 → 改載 `dist/index.html`（離線打包用；⚠️ 絕對路徑 sprite 會 404） |
| `DARKLINE_DEBUG_PORT` | 設 port（例 `9222`）→ 開 CDP remote debugging，給 `shot.cjs` 用 |
| `DARKLINE_DEVTOOLS` | 設任意值 → 開 DevTools |

## 讓 Claude 也看得到（CDP 截圖）

Electron 視窗 rAF 不凍結，所以透過 CDP（Chrome DevTools Protocol）截到的是**會動的真實畫面**——
這是繞開 preview 限制、讓 Claude 驗證 sprite「對不對味」的辦法。

```powershell
# 起帶 debug port 的視窗（dev server 要先在跑）
cd electron ; $env:DARKLINE_DEBUG_PORT=9222 ; $env:DARKLINE_PORT=5175 ; npm start

# 截一張；evalExpr 可選，這裡直接跳到有 sprite 的 free 段
node shot.cjs free.png 3500 "document.getElementById('menu').classList.add('hidden'); window.__dl.seq.jumpTo('free')"
```

`shot.cjs <out.png> [waitMs] [evalExpr]`：連 `DARKLINE_DEBUG_PORT`（預設 9222）→ 可選跑一段 JS → 等 `waitMs` → 截圖存檔。

### 遊戲內 debug hook（`game/src/darkline/darkline.js`）

- `window.__dl`：暴露 `seq` / `free` / `renderer` / `hud` 等，可在 console 或 CDP evaluate 操控。
- 按 **N**：`seq.next()` 跳下一段（無條件，不必清波）。
- `window.__dl.seq.jumpTo('free')`：直接跳到敵 sprite 所在的 free 段。

## ⚠️ 關閉 debug 視窗

別用 `taskkill /IM electron.exe` —— Claude 桌面版本身也是 Electron，全殺會連它一起關掉。

最可靠是用 CDP 讓它自己乾淨退出（不依賴程序名/命令列、不會誤殺）：

```powershell
node -e "fetch('http://localhost:9222/json/version').then(r=>r.json()).then(v=>{const ws=new WebSocket(v.webSocketDebuggerUrl);ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Browser.close'})))})"
```

（GUI 時直接關視窗也行：`window-all-closed` → `app.quit()`。
注意：用 `DARKLINE_DEBUG_PORT` env 起時 9222 是 `appendSwitch` 加的，main 程序
commandline **不含** 該字串，所以用 `CommandLine -like '*9222*'` 過濾去 kill 並不可靠。）
