# CLAUDE.md — DARKLINE 專案指令

> 對話一律**繁體中文**（程式碼/路徑/commit 訊息保留英文）。

## 專案定位（30 秒上手）

本專案是原創遊戲 **《暗線 / DARKLINE — First Island Chain》**（由 Virtua Cop 2 重製鷹架 pivot 而來）：1953 台北兩岸諜報、**半軌道+半自由**的 **2D sprite** 射擊冒險。three.js + Vite，程式在 `game/`。

**權威文件（有疑問先讀這些，不要憑記憶）：**
- 設計 spec：`docs/superpowers/specs/2026-06-15-darkline-first-island-chain-design.md`
- 當前實作計畫：`docs/superpowers/plans/2026-06-15-darkline-m0-vertical-slice.md`
- 路線/進度：`ROADMAP.md`（最新狀態看末尾「設計 pivot」節）

**開發指令：** `cd game && npm run dev`（Vite）｜`cd game && npm test`（Vitest）。

**模型分工：** 設計/劇情研究/M0 結果判讀/審查用 **Opus**；照計畫做的機械步驟（純邏輯模組、測試、JSON、檔案搬移、i18n）用 **Sonnet**。工作切細 session、每 Phase 可獨立驗收。

## 觸發語：「審查最新進度」（或「審一下」「review 最新」之類）

當用戶說類似「**審查最新進度**」的話，這是要你對最近完成的一個 Phase/工作段做**獨立 code review**。照以下步驟（**用 Opus**；若當前是 Sonnet，先提醒用戶切換）：

1. **定位最新進度**：讀 `ROADMAP.md` + 當前 plan 文件，並跑 `git log --oneline -15` 看最近 commit，判斷「最新完成的 Phase/Task」是哪一段、對應哪幾個 commit。不確定就直接問用戶「是指 Phase X 嗎」。
2. **取 diff**：`git diff <該段起點>..HEAD`（或該 Phase 的 commit 範圍）。
3. **對照 spec + plan 審**，重點四項：
   - ① 有沒有**偏離計畫**（漏步驟、改了介面、命名不一致）；
   - ② **正確性 bug**；
   - ③ **測試缺口**（純邏輯有沒有 TDD、邊角有沒有覆蓋）；
   - ④ 該 Phase 若有**檢查點判斷題**（如 sprite 風格收斂、自由段好不好玩、Electron 延遲），逐項給意見。
4. **簡明回報**：分「✅ 沒問題」「⚠️ 建議改」「🔴 必須改」三級，每條給 `檔案:行` 與具體理由；最後一句結論「**可進下一 Phase 嗎**」。
5. 審查只給意見**不直接改**，除非用戶說「順手修掉」。

> 為何獨立 session 審：審查者跟建構者共享 context 就會共享盲點；新 session 只讀 diff+計畫，乾淨眼睛、聚焦、省 token。詳見記憶 `feedback_content_workflow`。

## 內容創作分工

劇情/史實改編/美術/音效：用戶給大方向 → Claude 研究（必要時跑 deep-research 並全面虛構化）+ 產草稿/選候選 + 控風險 → **用戶判「對不對味」**。音效 Claude 依描述挑候選、用戶聽了拍板。題材風控見 spec §13（全面虛構化、放棄中國市場、不埋政治彩蛋）。
