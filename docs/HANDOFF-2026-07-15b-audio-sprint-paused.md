# 交接：比賽衝刺（音效）暫停點 — 額度用罄先存檔（2026-07-15 下午）

> 承 `docs/HANDOFF-2026-07-15-keyn-fix-ported.md`。本檔＝音效工作段的「已探查、未實作」快照。

## 決策現況

- **目標賽事定案：台北電玩展 Indie Game Award 2027**（報名 7/1–8/19、免費、收開發中 demo、評審含 Narrative；官網 `tgs.tca.org.tw/indie_award_e.php` 已核實）。次選 IGF 2027（約 10 月截止）。Vibe Jam/各 game jam 不收既有作品，不適用。
- **模型政策已更新並同步**（CLAUDE.md 模型節＋ops/02 附錄）：Fable＝指揮/審查不寫碼，實作派其它模型，省額度。
- **投件前差距排序**：①音效（全無→本段目標）②E3 windup 手感（待用戶實玩）③門面素材（截圖/trailer/介紹頁）④全流程 polish pass。

## 音效段已探查（未寫任何碼）

- **spec 已有定調**（first-island-chain design spec §配樂方針，~139 行）：ambient-led＋點放式極簡；環境音必須（1950s 台北街聲/槍聲/腳步）；音樂只在選單/簡報/Boss/結尾點放；自由段留白。素材源：Kenney/freesound CC0、incompetech/OGA CC-BY（記 CREDITS）。
- **孤兒模組現成可用**：`game/src/audio/AudioManager.js`＋`se-manifest.js` 已存在但零呼叫——8 方法（gunshot/enemyHit/enemyDeath/playerHit/reload/card/clearPoint/stageClear），合成 beep fallback＋`loadSamples()` 載真實 WAV（404 自動跳過、保留合成音）。已親讀確認介面。
- **版權紅線**：`game/public/assets/audio/` 的 85 個 VC2 提取 WAV 是版權素材、gitignored、**絕不進部署/比賽 build**——比賽 build 一律合成音或 CC0 替換。
- **接線 hook 點對照表**（Explore 已掃，實作 dispatch 直接用）：玩家受擊 `darkline.js:147`、死亡 `:154`、rail 開火 `:164`、free 開火 `:172`、換彈 `:166/:175/:487`、射落 `:428/:466`、Justice Shot `:434/:473`、敵死 `:436/:474`、敵彈命中 `:228`、打字機 `ui/typewriter.js:17`（呼叫端 `darkline.js:544`）、字卡 `:100`、翻頁 `:137`、解碼開 `:370`、解碼成敗/關 `DecodePanel.js:69/:58/:73`、拾取 E 鍵 `:397-408`、game over `:159`。選單音的掛點未定位（選單掛載在 `darkline.js:342` `mountMenu`）。

## 下一步（重置後從這裡接）

1. **派 implementer subagent**（sonnet 或 opus，非 Fable）：把 AudioManager 接線進上表 hook 點——實例化＋首次使用者手勢 resume（autoplay 政策）、射擊/命中/敵死/受擊/換彈/字卡/解碼各事件、M 鍵靜音、decode 事件可先映射 card/clearPoint 或最小擴充；純邏輯 TDD、打字機 tick 要節流防洗版。合成音先頂全場（合法、比賽可用）。
2. Fable 審 diff＋Electron CDP 驗證（有聲驗證看 console/AudioContext state 即可，別靠耳朵）。
3. 音效候選清單（CC0 連結、不下載）＋IGA 報名材料草稿 → 等用戶下午拍板。

## 環境

- 無背景程序殘留。工作樹乾淨（本 commit 後）。
