# 交接紀錄：Arena2「師父救不回」＋Boss「假鐵證」兩拍演出 — 已設計＋已計畫，待實作（2026-07-08b）

> 最新接續點。先讀 `CLAUDE.md` → `docs/ops/00-INDEX.md` → 本檔。
> 由 Opus 4.8 session 收尾。狀態以 repo 為準、**已 push**。**工作在分支 `feat/milestone-e-art`（未併 main）**。
> 承上一份：`docs/HANDOFF-2026-07-08-v3-narrative-reskin.md`（v3 敘事換皮）。本 session 只做**設計＋計畫**，未動程式碼。

## 1. 這個 session 做了什麼（TL;DR）

用戶說「繼續清單上的遊戲開發」。兩個成果：

**A) 校正一個過時交接：decode-gating 其實早就 landed。**
上一份交接（07-08 §4）把「decode-gating spec → writing-plans → 實作」列為待辦、§3 還寫「該 spec 尚未走 writing-plans／機制未重做」——**這兩句都是錯的**。實查本分支：
- plan `docs/superpowers/plans/2026-06-17-darkline-decode-gating-story-beats.md` **早已存在且全實作**（commit `846ffd9`→`03a5988`→`a1ef3bb`），還超額做了 scramble-converge 揭曉演出（`0866a44`/`27e4c54`，`src/darkline/intel/scramble.js`）。
- `cribMappingAt`、對位窗＋確認制＋缺鑰提示 DecodePanel、scrap 拾取/`takeScrap`/`keyFound`/E 鍵分流、故事卡 seam 全部在 code 裡。
- 相關 42 測試綠（decode 18／decodepanel 10／scramble 5／cards 2／alley 7）。
- **plan 檔的 checkbox 全是 `- [ ]` 沒更新**＝誤導來源。**教訓：接手別信交接 prose 的「下一步」，先 grep code／git log 對照。**（已寫進記憶 [[project-vc2-env-gotchas]] 旁的新記憶 `project_vc2_stale_handoff_lesson`。）

**B) 選定並設計「Arena2/Boss 兩拍演出」（下一步實作對象）。**
戚將軍線 v3 六拍裡缺演出的兩拍——拍3「師父救不回」、拍5 Boss「假鐵證」。走完整 brainstorm → spec → writing-plans：
- **spec**（`8419670`）：`docs/superpowers/specs/2026-07-08-darkline-arena2-boss-beats-design.md`
- **plan**（`0aa7e00`）：`docs/superpowers/plans/2026-07-08-darkline-arena2-boss-beats.md`
- 用戶已在 spec 複審時**認可兩張卡的草稿文案**（見下 §3）。

本 session 的 3 個 commit 全是 docs：`8419670`(spec)、`0aa7e00`(plan)、以及本交接。**零程式碼改動 → 測試仍 323/323**（沿用 07-08 基線）。

## 2. 設計決策（brainstorm 已鎖，2026-07-08）

- **拍3 老聶救不回 ＝ A1**：不新增 segment/AI/sprite。用既有故事卡 seam。rail1 清完 → **獨立一張短「師父救不回」卡** →(N)→ 既有下車卡 →(N)→ free。rail1 追認為「Arena1＋2 伏擊」，老聶清場後才被內勤科「依法」帶走（用講的、克蘭西冷調）。
- **「押走剪影」加料 ＝ 不做**（列入日後 E1 sprite 線，要新老聶/內勤科資產才到位）。
- **拍5 Boss 假鐵證 ＝ B1**：rail2boss 清 boss → **一張「假鐵證」轉折卡** →(N)→ ending。與 `card.embark`（伏筆）、`ending.body`（尾聲）串成「伏筆→當下重擊→反思」三段。
- **關鍵領悟**：07-08 v3 換皮已把兩拍的**文字大多寫進現有字串**（embark 伏筆、ending 餘波）；缺的只是**當下重擊的節點時機**＝這兩張新卡。

## 3. 已認可的文案（用戶 spec 複審時點頭）

`card.mentor`（師父）：
> 槍聲停了。榮町的騎樓下，煙還沒散。／我回頭找老聶——只看見兩個內勤科的人，架著他往巷子那頭走。他沒掙扎，只回頭看了我一眼。／不是子彈。是一紙拘票，一句「依法偵辦」。他們不殺他，他們要他簽字。／第一次，我背脊發涼：獵我們的人，也許不在北方。就在我背後。

`card.frame`（鐵證）：
> 北方的人倒下了。碼頭的汽笛還在響，這一仗，我贏了。／可清點現場時我懂了：我的網、我的槍、我和北方在同一個碼頭交火——這一切，正被內勤科寫成另一份卷宗。／「林建國的線，與北方接頭。」／我親手替他們，補上了最後一塊鐵證。贏了這一仗，只剩一半。

（英譯在 spec §3/§4。改字不動鍵。）

## 4. 下一步：跑 plan（用戶指示「晚點開新 session 跑」）

讀 plan `docs/superpowers/plans/2026-07-08-darkline-arena2-boss-beats.md`，**建議 inline 執行**（executing-plans；計畫小、Task1–3 高耦合、Task2/4 要用戶判對味＋Claude 做 CDP 驗）。4 個 task：

1. **Task 1**：`tests/darkline/lang.test.js` 加「兩卡存在＋§13 禁用詞」守衛（先紅）。
2. **Task 2**：`locales/{zh,en}.json` 加 `card.mentor.*`／`card.frame.*`（扁平鍵、雙語對齊、文案見 §3）。
3. **Task 3**：`darkline.js` 的 `enterRail` `onComplete`（行 276-279）改：rail1 串接 mentor→dropoff；rail2boss 插 frame。
4. **Task 4**：字型條件重生（`glyphs.test.js` 若紅跑 `npm run fonts:build`）＋ Electron CDP 端到端驗（`jumpTo('rail1')`/`jumpTo('rail2boss')` 觸發兩接縫、中文零 tofu、N 串接）＋ 用戶對味關卡 ＋ 收尾（含順手修本交接的先前錯述、標 ROADMAP）。

## 5. 技術重點（別重踩）

- **i18n 扁平鍵**：`"card.mentor.title"` 這種、非巢狀。加鍵**雙語同步**（`lang.test.js` 對齊守衛 `Object.keys(en)===Object.keys(zh)`）。en 字串內雙引號要 `\"` 逸出。
- **故事卡 seam 已存在**：`showStoryCard(title, body, vars, onContinue)` + `pendingCard`（GameLoop 暫停閘、N 收卡）。`onContinue` 內再開卡＝天然串接（拍3 就靠這串 mentor→dropoff）。
- **CJK 字型 tofu 守衛**：新卡帶新漢字可能觸發 `glyphs.test.js` 紅 → `cd game && npm run fonts:build`（gitignored `fonts-src/` 本機有，子集 < 300KB）。
- **視覺驗證走 Electron CDP**（preview 隱藏視窗凍 rAF）：見 `electron/README.md`、`electron/shot.cjs`。關視窗用 CDP `Browser.close`，**別** `taskkill /IM electron.exe`（殺 Claude 桌面）。
- **§13 禁用詞**（deep-research 護欄）：情報局／軍情局／警備總部／黑金／國民黨／黃埔——Task 1 守衛會擋。威妥瑪專名：老聶/Old Nieh、內勤科/Domestic Affairs Section、林建國/Lin Chien-kuo、蕭敬之/Hsiao Ching-chih；`榮町/Eiraku-chō`＝日治通稱（有意）。

## 6. 待處理/風險備忘

- **孤兒交接錯述**：`HANDOFF-2026-07-08-v3-narrative-reskin.md` §3/§4 對 decode-gating 的描述過時（見本檔 §1A）。plan Task 4 Step 5 會順手修，未修前以本檔為準。
- **dev server / Electron**：本 session 未啟（純 docs），無殘留背景程序。
- 分支 `feat/milestone-e-art` 現含 E3 美術＋v3 敘事＋decode-gating＋（待做）兩拍演出，之後是乾淨收尾點，可考慮併回 main（另有 07-03 `integrate/first-act-on-m3` 也等併）。
