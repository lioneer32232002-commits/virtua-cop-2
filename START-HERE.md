# START HERE — 新機器/新環境接手指南（DARKLINE）

> **給讀到這份檔案的 Claude**：如果你在一台新電腦上被要求「接手/繼續做這個遊戲」，照下面步驟自動執行，過程中不需要用戶操作終端機。

## Claude 自動接手步驟

1. 確認這台機器有 git（`git --version`）；沒有就先幫用戶安裝。
2. **不要在這個 OneDrive 資料夾裡開發**（OneDrive 鎖檔/半同步會弄壞 git，本專案有前科）。到非 OneDrive 的本機路徑（建議 `C:\dev`，沒有就建立）執行：
   ```
   git clone https://github.com/lioneer32232002-commits/DARKLINE.git
   cd DARKLINE
   ```
   （repo 2026-07-15 由舊名 `virtua-cop-2` 改名，舊網址自動重導向。分支以「最近有 commit 的那條」為準：`git log --all --oneline -5` 確認——剛併完＝`main`，開發中＝該 feature branch。）
3. 讀 clone 下來的 `CLAUDE.md`（專案規則）＋ 日期最新的 `docs/HANDOFF-*.md`（進度快照與接續點；2026-07-02 當下＝`docs/HANDOFF-2026-07-02-m3c-quality-direction.md`）。
4. 向用戶簡報「目前進度＋下一步」，確認後在 **clone 出來的資料夾**繼續開發；每個工作段 commit + push 回 GitHub（跨機器同步一律走 GitHub，不走 OneDrive）。
5. 若要 push 而未登入 GitHub：引導用戶跑一次 `gh auth login`。
6. 字型工具首次使用會提示缺原始檔（gitignored）：照錯誤訊息印出的 curl 指令下載即可。

## 給用戶（人類）的最短路徑

在那台電腦打開 Claude Code（在哪個資料夾開都行），貼這一句：

（舊 OneDrive 工作副本 `02_創作/14_AI TEST/VirtuaCop2` 已於 2026-07-15 封存，**不要**再從那裡接手；直接貼下面這句：）

> 幫我接手 DARKLINE 遊戲：clone https://github.com/lioneer32232002-commits/DARKLINE.git 到非 OneDrive 的本機資料夾（慣例 `C:\dev\DARKLINE`）、checkout 最近有 commit 的分支、讀 CLAUDE.md 和最新的 docs/HANDOFF-*.md，然後跟我簡報接續點。gitignored 素材照 CLAUDE.md「跨機器接手」第 4 點從 OneDrive 資產包補。

## 常見誤區（上次真實發生）

- ❌ 停在 `main` 分支找進度——最新工作在 feature branch 上，main 只有較舊的里程碑。
- ❌ 以為 Claude 會記得之前的事——Claude 記憶是機器本地的，換電腦歸零；一切以 repo 內文件為準。
- ❌ 找「VirtuaCop3」——不存在 v3；遊戲本體已 pivot 成《暗線 DARKLINE》，repo 也已改名 `DARKLINE`（2026-07-15，舊名 `virtua-cop-2` 網址自動重導向）。
