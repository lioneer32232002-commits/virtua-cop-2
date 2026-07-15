# CLAUDE.md — DARKLINE 專案指令

> 對話一律**繁體中文**（程式碼/路徑/commit 訊息保留英文）。

## 專案定位（30 秒上手）

本專案是原創遊戲 **《暗線 / DARKLINE — First Island Chain》**（由 Virtua Cop 2 重製鷹架 pivot 而來）：1953 台北兩岸諜報、**半軌道+半自由**的 **2D sprite** 射擊冒險。three.js + Vite，程式在 `game/`。

**權威文件（有疑問先讀這些，不要憑記憶）：**
- 設計 spec：`docs/superpowers/specs/2026-06-15-darkline-first-island-chain-design.md`
- **風格聖經（視覺/美術/動效/流暢感規格）：`docs/DARKLINE-STYLE-BIBLE.md`——做任何視覺/UI/美術工作前必讀**
- 路線/進度：`ROADMAP.md`（最新狀態看末尾「設計 pivot」節）
- **最新交接/進度：repo 內 `docs/HANDOFF-*.md` 取日期最新的一份**（可能在開發分支上，見下節）
- **運作制度（怎麼工作：派工/驗證/判斷/踩坑防雷）：`docs/ops/00-INDEX.md`——開場掃 `docs/ops/01`（本專案最漏 token／失焦／易錯前三名）**

**開發指令：** `cd game && npm run dev`（Vite）｜`cd game && npm test`（Vitest）｜**本機真實視窗看 sprite**（Electron 桌面視窗，rAF 不凍結；含 Claude CDP 截圖驗證）：見 `electron/README.md`。

## 🔀 跨機器/新環境接手必讀

1. **先實查最新進度在哪條分支**：開發走 feature branch、完成即併回 main（**分支名會過期，別信本檔或舊 HANDOFF 寫死的名字，一律實查**）。新環境第一件事：
   `git fetch --all && git branch -r`，`git log --all --oneline -5` 看**哪條分支有最新 commit 就 checkout 那條**（剛併完＝main；開發中＝該 feature branch），再找日期最新的 `docs/HANDOFF-*.md` 讀接續點。（2026-07-09 現況：`feat/milestone-e-art` 已併回 main 並刪除；下個工作從 main 開新 feature branch。）
2. **Claude 的記憶不跨機器**：Claude Code 的 memory 存各機器本地（`~/.claude/projects/…`），換機器＝歸零。一切耐久紀錄以 **repo 內文件**為準（CLAUDE.md／ROADMAP／specs／plans／HANDOFF-*）；session 收尾要交接時，把狀態寫進 repo 並 **push**，不要只寫記憶。
3. **不要用 OneDrive 同步工作副本到另一台機器**（鎖檔/半同步會弄壞 git，已有前科）——每台機器各自 `git clone https://github.com/lioneer32232002-commits/DARKLINE.git` 到**本機路徑**（慣例 `C:\dev\DARKLINE`；不要放 OneDrive 底下）。（repo 2026-07-15 由舊名 `virtua-cop-2` 改名而來，舊網址 GitHub 會自動重導向。）
4. **gitignored 素材從 OneDrive 資產包補**（2026-07-15 建立）：clone 完把 OneDrive `02_創作\14_AI TEST\DARKLINE-assets\game\` 底下三個目錄（`public/assets`、`public/m0`、`fonts-src`）複製到 clone 的相同相對路徑，再 `npm install && npm test` 驗證。詳見該資料夾的 `README-RESTORE.md`。素材有更新記得回拷。（舊工作副本 `OneDrive\02_創作\14_AI TEST\VirtuaCop2` 已於 2026-07-15 遷出、僅作封存，內含未搬的 VC2 原版檔案；不要再從那裡開 session。）

**模型（2026-07-15 用戶更新，取代 06-16「一律 Opus」）：** 主 session 若是 **Fable**＝指揮＋審查＋驗證，**不下場寫碼**；實作/機械活一律派 subagent 給**其它模型**（照 `docs/ops/02` 艦隊階梯：一般實作 Opus 或 Sonnet、機械批次 Haiku），動機＝**省額度**（用戶原話：不然額度很快燒完）。品味/對味判斷仍留給用戶。派工/驗證/升降級的紀律見 `docs/ops/02-model-dispatch.md`，判斷/完成/停損 rubric 見 `docs/ops/03-judgment-rubrics.md`（此政策若改，先同步這兩處）。

## 觸發語：「審查最新進度」（或「審一下」「review 最新」之類）

當用戶說類似「**審查最新進度**」的話，這是要你對最近完成的一個 Phase/工作段做**獨立 code review**。照以下步驟（**用 Opus 新 session**——Fable 已退役，審查改由 Opus 乾淨 session 讀 diff）：

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
