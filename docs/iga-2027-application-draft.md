# 台北電玩展 Indie Game Award 2027 — 報名材料草稿（2026-07-15）

> 給用戶審「對不對味」用。報名網址 `tgs.tca.org.tw/indie_award_e.php`，**截止 2026-08-19**，免費。
> 送出表單、註冊帳號＝用戶親自做（對外動作）；本檔＝可直接貼的填空材料＋待辦清單。

## 基本欄位

| 欄位 | 值 |
|---|---|
| 遊戲名稱 | 暗線 DARKLINE — First Island Chain |
| 開發者 | （用戶決定：個人名義/工作室名） |
| 國家/地區 | 台灣 |
| 類型 | 敘事射擊冒險（Rail shooter × 諜報 noir adventure） |
| 平台 | 瀏覽器（PC，免安裝） |
| 狀態 | 開發中（可玩垂直切片，2026 持續更新） |
| Demo 連結 | ⚠️ 建議先把 Cloudflare Worker 改名（現為 `virtua-cop-2.wizard32232002.workers.dev`，投件前應換成 `darkline` 開頭的正式網址——舊網址會失效，趁還沒對外沒有包袱） |

## 遊戲簡介（短版，~100 字，中）

一九五三年，停火墨跡未乾的台北。你是情報網裡最不起眼的聯絡員，在軌道射擊與自由調查交錯的雨夜裡，追一份不該存在的名單——直到你發現，獵殺自己人的，不是對岸。半軌道半自由的 2D sprite 諜報射擊，光槍街機手感 × 電報字卡敘事。

## 遊戲簡介（短版，EN）

Taipei, 1953. The ceasefire ink is barely dry. You are the most unremarkable courier in an intelligence network, chasing a list that should not exist through rain-soaked arcades and telegraph-lit safehouses — until you learn the hunt on your own people isn't coming from across the strait. A hybrid rail-shooter / free-roam espionage adventure in 2D sprites: light-gun arcade feel crossed with typewriter-noir storytelling.

## 敘事 pitch（評審 Narrative 項用，~200 字，中）

DARKLINE 把冷戰台北寫成一個「每盞燈背後都有人在聽」的城市。玩法即敘事：軌道段是任務的身不由己，自由段是調查的孤獨；凱撒密碼解碼小遊戲讓玩家親手「讀出」劇情轉折——電文解開的那一刻，玩家和主角同時明白真正的敵人是誰。師父被自己人帶走、鐵證是刑求逼出的口供、將軍晚景在賣玫瑰——全面虛構化的 1953，說的是忠誠與背叛的普世題。結尾把名單封進留給 1996 年的死信箱：「島嶼會再被收緊。到那天，先回頭看看自己人。」

## 開發特色（宣傳角度，酌用）

- 全程 AI 協作開發（Claude Code 寫碼與敘事草稿、AI 生成 sprite 美術、人類把關品味與史觀）——與 2026 vibe coding 得獎潮同路數，但題材是罕見的台灣本土諜報 noir。
- 極輕量：整包 <1MB gzip，免安裝、點開即玩。
- 中英雙語完整支援（含 CJK 子集字型工程）。

## 投件前待辦（材料上傳窗 8/26–9/2）

- [ ] Worker 改名 → 正式 demo URL（用戶拍板後一個 commit 的事）
- [ ] 截圖 8–10 張（Electron CDP 可產；選卡面/戰鬥/解碼面板/結尾各段）
- [ ] 遊玩影片 60–90 秒（需錄製工具，待討論）
- [ ] 音效換裝 CC0 素材（候選清單見 `docs/audio-candidates-2026-07-15.md`，用戶試聽拍板）
- [ ] E3 windup 手感定稿（用戶實玩）
- [ ] 用戶親自：官網註冊＋送出表單（8/19 前）
