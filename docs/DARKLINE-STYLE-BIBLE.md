# DARKLINE 風格聖經（Style Bible）— 視覺/美術/動效/流暢感 單一權威

> 2026-07-03 由 Phase A/B/C 已定案內容整併。**任何模型（Opus/Sonnet/其他）做視覺、美術、UI、動效工作前必讀本檔。**
> 細節出處：M3 spec `docs/superpowers/specs/2026-06-22-darkline-m3-visual-layer-design.md`、Phase C plan、`docs/HANDOFF-*.md`（最新一份）、1953 美術參考（main 分支 docs）。本檔與程式碼衝突時，以程式碼現值為準並回報。

## 0. 一句話定位

1953 台北兩岸諜報。**風格化 2.5D**：塊狀平塗 3D 街景（unlit）＋ 2D sprite 人物 billboard ＋ 電影感 dusk 後處理 ＋ 琥珀電報 UI。北極星＝**Awwwards 等級的 craft**（對標 Abeto《Messenger》：靠精緻與優化贏，非擬真）。

## 1. 鐵律（違反＝錯，不是風格選擇）

1. **Keeper 街景不可重建**：`OriginalEnvironment.js` 的 unlit `shadedBox` 面分色＋dusk palette＋亮窗＋路燈是用戶定案資產，所有升質**疊在上面**。共用詞彙在 `scene/streetKit.js`。
2. **不做**：真 3D、PBR、高解析貼圖、寫實光影——與風格化 2.5D 定位相違。
3. **霧色＝地平線色**：遠景必須乾淨溶入天空（`sky.js` 測試有守衛）。動天空/霧必重驗遠樓淡出無硬邊。
4. **UI 一律吃 design token**（`game/index.html` `:root` 的 `--dl-*`），不寫裸色值——tokens guard 測試會擋。
5. **資產紀律**：原始檔（字型 TTF/sprite 原圖）gitignored、只 commit 處理後小檔；一律 OFL/自產；登 `CREDITS.md`；首載 gzip 有 **CI 硬上限 1465KB**（`npm run check:size`）。
6. **決定性動效**：所有動畫都要能在 jsdom 無真時間測試——stepper 由 GameLoop 餵 `step(dt)`（打字機/scramble/boot gate），或 GSAP 用 `gsap.updateRoot` 手動推。`prefers-reduced-motion` 一律即時完成。
7. **視覺驗證走 Electron CDP**（`electron/README.md`＋`shot.cjs`）——隱藏 preview 視窗 rAF 凍結不可用。**最終對味＝用戶親判**，模型不代判。

## 2. 效能/流暢感規格（量化，送件門檻）

| 指標 | 目標 | 現值/機制 |
|---|---|---|
| 幀率 | **60fps，frame-time p95 < 16.6ms 持續 30s**（參考機：integrated-GPU 筆電 @1080p） | 未正式量測——送件前必補 |
| LCP | **< 1.5s**（boot 文字為 LCP 元素，靜態 HTML＋系統字 fallback 立即繪） | boot 機制已上（C4） |
| 首載體積 | gzip **< 1465KB**（CI fail 線），目標遠低於此 | 現值 ~307KB |
| pixelRatio | `min(devicePixelRatio, 2)` clamp | 已落地（Renderer cinematic） |
| 後處理成本 | 合併單一 EffectPass＋半解析度 bloom＋SMAA | 已落地（Phase A） |

## 3. 色彩系統

**UI（單一來源＝`game/index.html` `:root`）**：
- 琥珀家族：主 `#e8c87a`（--dl-amber，電報磷光）／亮 `#ffe6a8`（成功/早相位）／次 `#c8b074`／註腳 `#b59a5e`；半透明一律 `rgba(var(--dl-amber-rgb),α)`
- 紙白 `#f4e2b0`（--dl-paper，選單/按鈕框）；警示紅 `#ff4a3a`（--dl-red，受擊/末相位/boss）
- 深底：`rgba(6,7,10,.95)`（--dl-intel-bg）／`#0a0a12`（--dl-intel-bg-solid）
- 質感：掃描線 `--dl-scanline`、光暈 `--dl-glow`/`--dl-glow-strong`、`--dl-ease` cubic-bezier(.22,1,.36,1)、`--dl-dur` 240ms

**場景（`render/sky.js` 預設）**：
- `DUSK_TAIPEI`＝暖橘 dusk（台北街景/巷弄）；`DUSK_HARBOR`＝冷海霾（碼頭 boss 段）；per-segment 用 `setAtmosphere` 換色
- 情緒基調：1953 黃昏、霓虹雨後、琥珀-noir；bloom 只咬亮窗/路燈/槍口/解碼琥珀（亮度門檻，非選物件）

**Lock-on 圈（玩法語意，class 名不可改）**：green（早，×3 分）→ 琥珀亮 / yellow（中，×2）→ 琥珀 / red（末，×1）→ 警示紅。

## 4. 字型系統

- **Latin**：'DL Telegraph'＝Cutive Mono（OFL 打字機體），ASCII 子集 woff2（≤40KB）
- **CJK**：'DL Intel CJK'＝Noto Serif TC 思源宋（OFL），glyph allow-list 子集、wght pin 400（≤300KB）
- 堆疊統一走 `--dl-font` token；`font-display:swap`
- **管線**：文案改動→tofu guard 紅→`cd game && npm run fonts:build`（原始 TTF gitignored，缺檔時工具會印 curl 下載指令）→ commit 重生的 `game/public/darkline/fonts/`
- code 直寫的 user-facing 非 ASCII 字（不經 locale）要手動加進 `tools/glyph-allowlist.mjs` 的 `LITERALS`
- 已知待驗：700 字重是 faux-bold（子集只有 400）——用戶 Electron 看糊不糊再決定加 700 instance

## 5. UI 語言（諜報電報）

美學關鍵詞：電傳打字機等寬體、琥珀磷光、CRT 掃描線（含飄移/偶爾閃爍）、寬字距 caps、檔案/情報卷宗（dossier）、clearance 章（命條＝dog-ear 章票）、機密文件紙白。**禁止**：街機金 `#ffe000`、Arial Black、emoji、現代扁平風。
z-index 地圖：hud 5 / crosshair 6 / overlay 8 / decode 9 / menu 10 / transition 11 / boot 12 / holding 13。

## 6. 動效原則與現值

| 動效 | 現值 | 備註 |
|---|---|---|
| 段落轉場 | 琥珀 wipe：cover 0.35s / reveal 0.45s，power2.inOut（GSAP） | 走 `advanceSegment()`，蓋住場景拆建 |
| 字卡 | 打字機 45 cps，N 第一下跳完 | GameLoop 餵 dt |
| 解碼揭曉（**hero moment**） | scramble 收斂 1.4s，左→右鎖定、空白不亂、Esc 第一下跳完 | **6 顆調校旋鈕見 handoff §3**（churn 節流 15-25Hz 最優先試） |
| boot | 最短顯示 900ms，fonts+frame+assets 三信號 | 淡出 0.6s |
| 卡片淡入 | .fade 0.6s | 既有 |

新動效一律沿用此模式：純 stepper＋可注入時間/rng＋TDD。

## 7. Sprite / 美術內容（M3 之後的最大缺口＝Milestone E）

- 現行管線：`tools/sprite-pipeline`（flood-fill 去背→despeckle→aspect-fit→**DARKLINE 調色盤量化**→128px）；敵人＝單張 billboard，部位判定用 `billboardZone`
- 1953 考據基準：服裝/道具/武器/街景參考見 main 分支 `docs(art)` 兩份文件（`51cec53`/`deda5e9`），**時代錯置守則在內**（不可出現不屬於 1953 的物件）
- E 里程碑（未開）：style bible 視覺定調→多角度 sheet→動畫。流程＝Claude 產候選、**用戶判對味拍板**（CLAUDE.md 內容創作分工）
- 主角 M1911 view model＝primitive 剪影＋後座力（刻意風格化，不必寫實）

## 8. 手感（沿 VC2 光槍基因）

rail 段＝純手瞄光槍（無磁吸）＋lock-on 倒數圈＋justice shot（繳械）＋射落彈丸；free 段＝pointerlock＋輕磁吸＋計時換彈。**手感層貼近原版 VC2，內容全原創**。改打擊感/節奏屬玩法軸——先看 ROADMAP 的耐玩度待議節，不要順手改。

## 9. 給接手模型的工作守則（濃縮）

1. 對話繁中；TDD；subagent-driven＋審查（機械 task 單審可、craft task 建議雙審）；逐 task commit+push。
2. Plan/spec 是權威——發現其中的錯，連文件一起修。
3. 題材風控（首部曲 spec §13）：全面虛構化、主題式影射可、對象式影射（指名現實政黨領導人）不可。
4. 「對不對味」永遠是用戶的裁決；模型負責候選與證據。
5. 質感優先序（用戶未另指示時）：E sprite 升質 > B5 harbor 水面/點綴 > 音效 > 耐玩度 > A4/A5 可選 > 送件 F+效能實測。
