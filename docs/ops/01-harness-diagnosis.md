# A — Harness 快速診斷（本專案實測，2026-07-03）

> 這份是後面所有 ops 檔的地基。列本專案 harness 目前**最漏 token／最容易失焦／最容易出錯**的前三名，各附證據與具體修法。
> 取材＝本 repo 實測（CLAUDE.md、`~/.claude/…/memory/`、`docs/HANDOFF-*`、root `HANDOFF.md`、`ROADMAP.md`、已知坑）。
> 讀者＝之後接手的模型（可能比寫這份的弱）。每條都給「弱模型可照做的判準」，不要只讀不改。

---

## 🥇 第一名（最漏 token）：memory 索引把整本變更史塞進「每 session 必載」的一行

**證據（實測數字）：**
- `~/.claude/projects/…/memory/MEMORY.md` 的第一個索引項（`project_virtua_cop_2`）是**單行約 8,000 字**的 run-on 變更史，從 2026-06-15 pivot 一路寫到 07-03。
- 這個檔是 memory 系統**每個 session 自動載入**的索引 → 每次對話開場就付掉 ~2,000 tokens 的密集歷史散文。
- 它指向的 `project_virtua_cop_2.md` 本身 **71,308 字**（單一「一則記憶」塞成 71KB changelog，違反 memory 系統「一檔一則事實」的設計）。
- 內容**九成是已落 repo 的歷史**（commit SHA、各 Phase 完成紀錄）——ROADMAP、`docs/HANDOFF-*`、git log 都有，且更權威。

**為何是 token 黑洞：** 每 session 都重付一次，且大部分是「過去做完的事」，對「現在要做什麼」幫助極低。弱模型還會被迫解析這團才敢動手。

**具體修法：**
1. **MEMORY.md 每個索引項壓成真正的一行**（≤120 字）：一句話 + 指向 repo 權威檔。範例見本目錄 `05-maintenance-protocol.md`。
2. **當前狀態不寫進 memory**，寫進 repo：進行中的工作看 `ROADMAP.md` 尾 + 最新 `docs/HANDOFF-*.md`。memory 只留「不會從 code/git 看出來的偏好與教訓」。
3. 已做的一次性清理：本次已把 MEMORY.md 那行壓短、備份在 `docs/ops/_backup/MEMORY.md.2026-07-03.bak`。

**弱模型判準：** 你要往 memory 寫東西前問自己「這件事 repo 裡（ROADMAP/HANDOFF/commit/CLAUDE.md）查得到嗎？」查得到就**不要**寫進 memory；查不到才寫，而且寫成獨立一則、索引只放一行。

---

## 🥈 第二名（最容易失焦／被誤導）：狀態散在 ≥6 個地方，且有「看起來權威的過期檔」

**證據：**
- root `HANDOFF.md` 停在 **2026-06-11 Session 6**，講的是「忠實度路線、GLB 提取、unlit 渲染」——**這些在 06-15 DARKLINE pivot 後已全部放棄**。它 166 行、檔名醒目、放在根目錄，弱模型很可能當成現況來讀 → 整個方向讀錯。
- 同時「真正的現況」散在：`docs/HANDOFF-2026-07-02-*.md`、`ROADMAP.md` 尾、`START-HERE.md`、`CLAUDE.md`、memory 那團。六處講同一件事，沒有單一權威。

**為何失焦：** 弱模型不知道哪個是準的，保險起見全讀 → 燒 token；更糟是信了過期的那份 → 做錯方向。

**具體修法：**
1. **單一權威指標**：`ROADMAP.md` 尾＝路線現況；**日期最新的 `docs/HANDOFF-*.md`**＝接續點。其餘檔頂端都要標「非權威，看 X」。
2. 本次已對 root `HANDOFF.md` 頂端加**過期橫幅**指向最新 handoff（備份 `docs/ops/_backup/HANDOFF.root.2026-07-03.bak`）。
3. **每份 HANDOFF 檔名帶日期**（現有慣例），接手一律取日期最新那份，不讀舊的。

**弱模型判準：** 讀任何「現況/進度」敘述前，先看它的**日期或最後 commit**。若比 `git log -1` 舊很多、或和 ROADMAP 尾衝突 → 當它過期，以 ROADMAP 尾 + 最新 HANDOFF 為準，並回報使用者「X 檔看起來過期了」。

---

## 🥉 第三名（最容易出錯／重複踩同一個坑）：環境坑分散，弱模型會花 token 重新發現

**證據（本專案真實會咬人的坑）：**
- **preview 隱藏視窗 rAF 凍結** → three.js 動畫/sprite 不動、截圖是死畫面。看視覺**一律走 Electron + CDP**（`electron/README.md`、`electron/shot.cjs`）。
- **CDP 截圖 -32000「Unable to capture screenshot」**：Electron 視窗非前景時 `Page.captureScreenshot` 會失敗 → 要加 `captureBeyondViewport:true`（本次 07-03 新踩，解法在最新 HANDOFF）。
- **assets gitignored**：`game/public/assets/*`、字型原始檔等不進版控，新 clone/worktree 要手動補；缺檔時 build/preview 會怪。
- **OneDrive 鎖檔**：工作副本在 OneDrive 底下，worktree 刪不動要 `rm -rf`；**不要用 OneDrive 同步到另一台機器**（會弄壞 git，有前科）。
- **雙審成本**：subagent-driven 每 task 含 spec+quality 雙審約 15–20 萬 tokens。機械性 task 可降單審（見 `02-model-dispatch.md`）。
- **不要 `taskkill /IM electron.exe`**：Claude 桌面本身也是 Electron，會一起被殺；關 debug 視窗走 CDP `Browser.close`。

**為何出錯：** 這些不會從 code 看出來，弱模型會用「一般常識」去做（開 preview 截圖、taskkill、以為 assets 在 repo）→ 卡住或誤殺，來回燒 token。

**具體修法：**
1. 上面這份就是「別再踩」清單——**動視覺驗證/清理進程/新環境前先讀它**（CLAUDE.md 有路由指到這裡）。
2. 視覺驗證的**唯一正確路徑**：`cd game && PORT=5180 npm run dev` → `cd electron && DARKLINE_PORT=5180 DARKLINE_DEBUG_PORT=9222 npm start` → `node electron/shot.cjs`（或加 `captureBeyondViewport` 的變體）。細節 `electron/README.md`。
3. 新坑踩到 → 寫回 `project_vc2_env_gotchas`（memory）+ 這份清單，格式見 `05-maintenance-protocol.md`。

**弱模型判準：** 你若打算「開 preview 截圖看畫面」「taskkill 進程」「假設某資產在 repo 裡」——**停**，先確認這份清單沒有相反規則。三者本專案都有專門解法。

---

## 這份怎麼被用

- CLAUDE.md 有一行路由指到 `docs/ops/`；接手模型應在**開場**掃一遍本檔（很短）。
- 後面 `02`~`06` 的規則若和這份的判準衝突，以更具體的那條為準，並回報使用者。
