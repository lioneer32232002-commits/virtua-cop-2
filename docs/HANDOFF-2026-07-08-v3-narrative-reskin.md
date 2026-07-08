# 交接紀錄：v3 敘事換皮 landed（自己人出賣／林建國／戚將軍／隱性靈魂）（2026-07-08）

> 最新接續點。先讀 `CLAUDE.md` → `docs/ops/00-INDEX.md` → 本檔。
> 由 Opus 4.8 session 收尾。狀態以 repo 為準、**已 push**。**工作在分支 `feat/milestone-e-art`（未併 main）**。
> 承上一份：`docs/HANDOFF-2026-07-07-milestone-e3-fire-telegraph.md`（E3 開火 tell）。本 session 從美術線切回**敘事線**。

## 1. 這個 session 做了什麼

用戶說「請繼續遊戲設計」。定位後發現**敘事線比 07-07 交接寫的「內容分工待辦」成熟太多**：2026-06-17 就已鎖定整套 v3（見既有 `docs/DARKLINE-首部曲劇情串接-戚將軍線.md`），卻停在「等你 sign-off → writing-plans」，且**遊戲裡的實際文案還是舊故事**（林沂／老周／北方搶名單）。本 session 把 v3 敘事**真正落地進遊戲**，並先用 deep-research 加厚史實地基。

**成果＝遊戲內簡報/結尾/故事卡/解碼字串，從舊故事整套換成 v3。** 8 個 commit（`cd81eef`→`4fa8f49`）：

| commit | 內容 |
|---|---|
| `cd81eef` | docs：deep-research 加厚 1953 腐敗考據（劇情候選 §1B）＋v3 簡報結尾**文案草稿**（中英，用戶 07-08 判過語氣/種子/題眼）＋換皮**實作計畫** |
| `6cc1d10` | 開場簡報 → v3（種子①名字雙關：老聶點「建國」真意） |
| `2499111` | 結尾 → v3（將軍玫瑰、種子③、題眼「名字要靠你帶走」、1996 鉤子） |
| `949c3e0` | 下車／趕赴碼頭卡 → v3（死法＝「依法」查封、線頭指回蕭敬之） |
| `bf0b9ff` | decode/scrap 字串 → 自己人出賣框架（**機制不動**，保留 `{c}/{p}`） |
| `01d87a0` | 種子②河堤可選字卡＋自由段 fire-once 觸發＋恢復 pointerlock（含 `npm run fonts:build` 重生 CJK 子集，119.7KB） |
| `d69913e` | 迴歸守衛（殘留 林沂/老周/Lin Yi/Old Zhou 即紅；斷言 Chien-kuo gloss） |
| `4fa8f49` | 修河堤觸發區座標（原座標在西牆外＝永不觸發 → 移進可行走口袋） |

**測試 323/323 綠**（318＋5 守衛）。**Electron CDP 實測**：簡報/結尾 v3 中文字零 tofu、河堤卡在 free 段觸發渲染（截圖存 session scratchpad）。

## 2. 技術重點（別重踩）

- **內容家＝i18n 兩檔**：`game/src/locales/zh.json` + `en.json`（唯一敘事字串來源）。**鍵對齊守衛** `tests/darkline/lang.test.js`（`Object.keys(en)===Object.keys(zh)`）——加鍵一定雙語同加。
- **改文案觸發 tofu 守衛**：新增 v3 CJK 字 → `glyphs.test.js` 預算/tofu 守衛紅 → 照守則 `cd game && npm run fonts:build`（gitignored `fonts-src/` 在本機有）。新 `dl-cjk.woff2` 119.7KB（< 300KB §6 預算）。
- **種子②河堤卡**（`darkline.js` free loop ~572）：`if (!free.riverbankShown && inside(free.riverbankTrigger, cam))` → `showStoryCard(..., () => setInputMode('pointerlock'))`。fire-once flag＋演完 N 收卡**重取 pointerlock**（N 是使用者手勢，`requestPointerLock` 可用）。座標 `AlleyScene.js` layout `riverbankTrigger:{x[-2.3,-1.6] z[-11,-9.5]}`＝西牆邊、第一攤位(OB1 z[-8,-6.5])下方可行走口袋（clamp 0.3 → 玩家最西 x=-2.2 進得去）。**教訓：觸發區座標要對照 `buildAlleyLayout` 的 segments/obstacles/clamp 半徑，別憑感覺放（原座標壓牆外＝永不觸發，preview 才抓到）。**
- **專有名詞（威妥瑪＝1953 對味，定於**文案草稿檔**的對照表）**：林建國/Lin Chien-kuo（取代 林沂/Lin Yi）、老聶/Old Nieh（取代 老周/Old Zhou）、蕭敬之/Hsiao Ching-chih、戚定遠將軍/General Chi Ting-yuan、內勤科/the Domestic Affairs Section。**西緣＝沿用既有 en.json「West-Marches Trading Co.」**（不擅改上線譯名；我一度自創 Western Reach 已撤回）。代號「暗線」EN＝**Darkline**（咬合遊戲標題＝起源）。
- **1953 考據硬點（deep-research，跨三部曲護欄，寫在 `劇情候選.md §1B`）**：在台情治主幹真名＝**國防部保密局**（1955/3 才改情報局、1985 才有軍情局）→ 用虛構「內勤科」是正解。**禁用詞**：情報局/軍情局/警備總部（此時非主體）/黑金（80-90 詞）。否證清單（切勿寫）：吳國楨案≠「整肅政學系」；「1950/11 合併軍統中統成立政委會」時間主體皆錯。**地名**：榮町等＝有意識選用的日治通稱、非錯置（見 `1953台北街景考據.md`；用戶原則「路名可虛擬、建築要對」）。

## 3. 刻意切在範圍外（各自另開計畫，別混做）

換皮計畫（`docs/superpowers/plans/2026-07-08-darkline-v3-narrative-reskin.md`）頭部已標明：

- **decode 機制重做**（撤即時 preview／對位窗／紙片 pickup gating）＝歸 [`decode-gating spec`](superpowers/specs/2026-06-16-darkline-decode-gating-story-beats-design.md)，本 session 只換 decode **字串**、不動 UI 邏輯。**該 spec 尚未走 writing-plans。**
- **Arena 2「老聶救不回」演出** ＋ **Boss「真敵人/假鐵證」轉折演出**＝需新引擎演出（戚將軍線 v3 §6 拍3/拍5、§10）。本 session 只換既有卡片**文字**，**沒有**把 6 拍重新對映到引擎段落。

## 4. 下一步（用戶掌舵，優先序建議）

- **🎮 E3 windup 手感**（07-07 交接掛著、仍未驗）：要你實玩拍 `first-island-chain.js` 的 `ai.windup` 一個數字。
- **decode-gating spec → writing-plans → 實作**：把「一直轉到可讀」破綻堵掉、紙片鑰匙拾取、故事小卡。與本次已換的 decode 字串會再對一次（機制落地時可能再改字串）。
- **Arena 2 老聶救不回 ＋ Boss 假鐵證**兩段演出（要新引擎工作，非純文案）。
- **E1 續生其餘陣營 idle sprite**（北方滲透網/將軍新軍/街坊平民；prompt 在定調 doc §4，含 STRICT MATTE）。
- **併分支**：`feat/milestone-e-art` 現在同時有 E3 美術＋v3 敘事，是乾淨收尾點，可考慮併回 main（另有 07-03 `integrate/first-act-on-m3` 也等併）。

## 5. 待處理/風險備忘

- **⚠️ OneDrive 覆蓋疑慮（未解）**：session 開始時 git 快照顯示 `docs/DARKLINE-首部曲-簡報結尾文案-v3草稿.md` 在我開工前就以**未追蹤檔**存在，而我用 `Write` 直接寫它（沒先讀）。現檔內容全是本 session 草稿；**若原本該檔名下有別的內容，可能已被覆蓋**（git 追不回未追蹤檔，只能看 OneDrive 版本歷史）。用戶待查。
- **孤兒改動**：`劇情候選.md` 在 session 開始時已是 M（先前 session 未 commit 的改動），本次一併 commit 進 `cd81eef`（都是設計文件，保存無害）。
- **dev server 可能還開著**（本機 port 5173，本 session 驗證用）；Electron debug 視窗已 CDP 乾淨關閉。

## 6. 跑法／驗證備忘

- **視覺驗證走 Electron CDP**（preview 凍 rAF）：`cd game && npm run dev`（記 port）→ `cd electron && DARKLINE_DEBUG_PORT=9222 DARKLINE_PORT=<port> npm start`（背景，polling `curl localhost:9222/json/version`）→ `DARKLINE_DEBUG_PORT=9222 node electron/shot.cjs <out.png> <waitMs> "<evalExpr>"`。見 `electron/README.md`。
- **看某段文案**：`window.__dl.seq.jumpTo('briefing'|'ending')` 直接渲染該卡；`document.getElementById('menu').classList.add('hidden')` 先收選單。翻頁的合成 N 鍵不穩（打字機/handler 攔），驗渲染看第一頁即足。
- **驗河堤卡機制**（繞過走位）：jumpTo('free') 等 ~2.8s enterFree → eval 把 `window.__dl.free.riverbankTrigger` 暫放大到全場 → 下一幀觸發、截圖。真實觸發要走到西牆邊 z≈-10。
- **關 Electron**：用 CDP `Browser.close`（Node 內建 global WebSocket，**不要** `require('ws')`＝本機無該模組）；別 `taskkill /IM electron.exe`（會殺 Claude 桌面）。
