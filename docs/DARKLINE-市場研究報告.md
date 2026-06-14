# 《暗線 / DARKLINE — First Island Chain》市場研究報告

> 產出日期：2026-06-14 ｜ 對象：個人 + AI 工具開發的原創、可商業化「兩岸諜報軌道射擊」（on-rails / light-gun shooter，three.js 網頁引擎，類 Virtua Cop / House of the Dead 的 lock-on 爆頭手感）
> 方法：deep-research harness（6 路平行搜尋 → 抓 30 來源 → 抽 132 條主張 → 三票對抗式查證 25 條 → 存活 20 條、合成 10 條）＋ 定向補抓 7 個 Part B 史料來源
> **所有真實事件僅作靈感。報告中人名/地名/組織若用於遊戲，一律虛構化以規避形象權、誹謗與平台審核。**

---

## 結論先行（TL;DR）

**值得做，但要當「精品小品」做，不是商業豪賭。** 三句話：

1. **類型還活著，但天花板不高。** on-rails/光槍與諜報戰術敘事在 PC/VR 仍有商業活力，但旗艦級也只到十萬套等級（House of the Dead: Remake 估 10–20 萬套），小團隊光槍作常落在 0–2 萬套、上線數年後線上同時僅個位數人。把它當「能回本的個人作品」評估，不要當「會大賣」。
2. **平台＝Steam（PC）優先。** three.js 網頁遊戲可用 Electron/NW.js + `steamworks.js`（MIT、維護中）整合 Steamworks 上架 Steam，路徑確認可行；VR 大環境 2025–26 轉弱（連 Pistol Whip 的 Cloudhead 都在 2026 初大裁員），手機資料不足。Web 版可當免費試玩/導流，但收費主場放 Steam。
3. **題材是雙面刃：差異化強，但中國市場風險極高。** 兩岸諜報踩中國三大政治紅線（台灣/西藏/天安門），《還願 Devotion》前車之鑑明確（下架 + 發行商被吊照）。**結論＝從第一天就放棄中國市場、全面虛構化、主打台灣/海外華語/全球玩家**，把地緣張力當賣點而非把真實政治當訴求。

---

# Part A — 市場可行性

## 1. 競品與銷量級距

> 註：以下擁有者數字皆為 SteamSpy 統計**估計**，誤差帶寬大（2018 後失去 Steam API 直連、精度下降），僅供**量級**判斷，非精確數字。價格為查證時的正常基準價，會隨特賣波動。

| 作品 | 類型 | 定價 | 銷量級距（估） | 評價輪廓 | 對 DARKLINE 的意義 |
|---|---|---|---|---|---|
| **House of the Dead: Remake** | On-Rails Shooter（Steam 官方標籤） | NT$378 / US$24.99 | **10–20 萬套** | ~1,300–2,600 則評論 | 最直接對標（軌道+爆頭）。當代旗艦光槍作的**天花板≈低至中六位數套數**，非百萬級 |
| **Phantom Doctrine** | 冷戰諜報戰術 | — | **20–50 萬套** | ~4,664 則評論、74% "Mostly Positive" | 最貼題材（冷戰諜報）的**敘事類型天花板參照** |
| **Crisis Brigade 2 Reloaded**（前 Crisis VRigade 2） | 小團隊 VR 光槍 | — | **0–2 萬套** | 長尾極稀薄：歷史尖峰同時在線僅 14 人（2024-05-25）、近期常態 1–3 人 | **小團隊光槍作的下限**＝最殘酷的對標 |
| **Pistol Whip**（Cloudhead Games） | VR 節奏射擊 | — | （未取精確值） | — | 證明 VR 光槍/節奏**存在可自籌獲利的商業模式**（見下） |

**判讀：**
- on-rails/光槍類型**仍有商業活力但天花板偏低**——當代旗艦也只到十萬套等級，個人/小團隊更現實的是萬套以下。
- 諜報敘事（Phantom Doctrine）級距比純光槍高一截（20–50 萬套），暗示**「諜報敘事 + 軌道射擊動作」的混血定位，比純光槍更有想像空間**——這正好是 DARKLINE 的設計方向（戰場層＝軌道射擊，任務間＝情報/解謎）。
- **Pistol Whip 案例**：Cloudhead Games 2021/1 公開表示「沒有創投、沒有董事會，完全靠自己」且已獲利到對未來數年有信心（RoadToVR 訪談）。**證明這個細分市場存在可行商業模式**。但⚠️**時效警示**：這是 2021 年初時點陳述，VR 大環境後續轉弱，該團隊**2026 年初裁員約七成**——不可外推為當前 VR 市場健康。

**來源：** [HotD Remake Steam 頁](https://store.steampowered.com/app/1694600/THE_HOUSE_OF_THE_DEAD_Remake/)、[SteamSpy HotD](https://steamspy.com/app/1694600)、[SteamSpy Phantom Doctrine](https://steamspy.com/app/559100)、[SteamSpy Crisis Brigade 2](https://steamspy.com/app/1066180)、[RoadToVR Cloudhead 訪談](https://www.roadtovr.com/vr-lucrative-business-cloudhead-interview/)

## 2. 平台選擇：Steam（PC）優先

**技術路徑確認可行（高信心）：** three.js / HTML-JS 網頁遊戲可透過 **Electron 或 NW.js 包裝**、搭配 **`steamworks.js`**（GitHub `ceifa/steamworks.js`，**MIT 授權、維護中**——最近更新距查證僅 5 天、613 stars）整合 Steamworks SDK（成就、雲存檔、overlay）並上架 Steam。先前「steamworks.js 不再維護」之說係與已停更的前身 `greenworks` 混淆。**web-to-Steam 路徑對 DARKLINE 成立。**

**三平台比較（務實判斷）：**

| 平台 | 觸及/變現 | 競爭 | 對本作技術門檻 | 結論 |
|---|---|---|---|---|
| **Steam (PC)** | 一次性買斷成熟、付費玩家集中 | 極度擁擠（見 §4） | Electron + steamworks.js，**低**（已驗證） | ✅ **收費主場** |
| **VR** | 客單價高、Pistol Whip 證明可獲利 | 較小但**2025–26 轉弱** | WebXR 可行性/效能本輪未取得硬數據 | ⚠️ 機會但風險升，**非首發** |
| **手機** | 觸及最大、但變現靠內購/廣告 | 紅海 | three.js 網頁本就能開手機瀏覽器（`InputManager` 已抽象、待加觸控） | ➖ 資料不足，**當免費導流而非收費主場** |

**建議組合：** **Steam 收費版為主**（Electron 包裝）＋ **Web 免費試玩版導流**（同一份 three.js 程式碼，瀏覽器直開、社群分享門檻最低）。VR/手機列為原創化完成後的「之後再說」選項，不綁進首發。

**來源：** [steamworks.js (GitHub)](https://github.com/ceifa/steamworks.js)、[gamedevjs：用 Electron 把網頁遊戲上 Steam](https://gamedevjs.com/tutorials/publishing-web-games-on-steam-with-electron/)、[UploadVR：SteamVR 使用量](https://www.uploadvr.com/steamvr-near-record-use-december-2024/)

## 3. 題材市場空白與風險

**空白/機會：** 兩岸/冷戰亞洲諜報在主流遊戲市場**相對稀少**，差異化明確——尤其「韓戰駐台 → 1996 鎖台」這條台灣本位的冷戰史軸線，在軌道射擊類型幾乎無人做。對台灣/海外華語玩家有獨特情感共鳴，對全球玩家有異國冷戰諜報的新鮮感。

**風險（高，須嚴格管控）：** 兩岸題材直接踩中國市場**三大政治紅線（台灣、西藏、天安門）**。明確前車之鑑＝**《還願 Devotion》（赤燭遊戲）**：

- 時間線：2019/2/19 上線 →2/21 玩家發現遊戲內藏把「習近平」與「小熊維尼」並列暗藏侮辱的符咒 → 中國玩家**評論轟炸**使評價從「壓倒性好評」崩到「大多負評」→2/23 退出 Steam 中國 →2/25 **全球下架**（即使道歉、移除內容，仍無法重返中國市場）。
- **商業連帶**：發行商 **Indievent 與 Winking Skywalker 與赤燭切割**，中國政府 2019/7 以違反「相關法律」**吊銷 Indievent 營業執照**，赤燭須承擔發行商損失。
- ⚠️ 精確機制是「**開發商自行下架 + review-bomb + 發行商被吊照**」，並非官方明文點名禁令；但「敏感題材＝失去中國市場通路」的淨效果與教訓成立。

**通路現實：** 2021/12/25 起**全球版 Steam 在中國本土被封**，僅政府核准的 Steam China 仍運作，而 Steam China 上線時僅約 53 款、至 2021/12 約 103 款核准遊戲（對比全球十一萬款以上）。**對敏感題材而言，中國市場實質上不可達。**

**對策：** 不是「降低敏感度去討好中國」，而是**從第一天就把中國市場排除在商業模型外**——全面虛構化（「北方某情報機構」而非具名）、加「純屬虛構」免責、主打台灣 + 海外華語 + 全球市場。把這當**設計前提**，不要等被下架才反應。

**來源：** [SCMP：Taiwan, Tibet, Tiananmen 如何讓遊戲在中國被禁](https://www.scmp.com/tech/apps-social/article/2187763/taiwan-tibet-tiananmen-how-get-your-video-game-banned-china)、[Wikipedia: Devotion](https://en.wikipedia.org/wiki/Devotion_(video_game))、[MassivelyOP：全球版 Steam 在中國被封](https://massivelyop.com/2021/12/27/steams-global-version-appears-to-have-been-blocked-in-china/)

## 4. 務實回本與定位

**市場擁擠度（硬數據）：** 2024 年前九月（1/1–9/30）Steam 共 **13,007 款產品上架，其中 98.9% 為獨立作品**（SteamDB 全年約 19,000 款佐證量級）。**競爭極度擁擠**——能見度是最大瓶頸，不是技術。

⚠️ **重要的數據陷阱**：常被引用的「獨立遊戲佔 Steam 全遊戲營收 48%（近 40 億美元）」這個數字，被兩款**定義有爭議的偽獨立巨作**嚴重灌水——Black Myth: Wukong（約 $1B）+ Palworld（約 $500M）合計約佔該 $40 億的 **38%**。**排除後 2024 獨立成長僅約 11%。** 切勿用「48% 營收」論證「典型小型獨立作品很繁榮」——真正該記住的是「13,007 款上架、98.9% 為獨立」的**極度擁擠**面向。

**回本定位（務實結論）：**
- **定價**：對標 HotD Remake 的 US$24.99 偏高（那是有 SEGA IP 的旗艦）。個人小品**建議 US$9.99–14.99（NT$200–350）**區間，降低衝動購買門檻。
- **規模**：**不要堆量**。做一個**短而精、可一坐玩完（2–4 小時）、有強烈題材記憶點**的精品，勝過拖長的平庸內容。引擎與第一關（downtown1）已成形，邊際成本主要在美術與關卡。
- **行銷現實**：擁擠市場裡，**題材獨特性 + 視覺記憶點 + 可分享的 Web 試玩**是個人開發者最務實的能見度槓桿（買量不現實）。「台灣冷戰諜報軌道射擊」這個一句話定位本身就是行銷資產。
- **值不值得做**：**值得**——但成功定義是「做出一個有辨識度、能回本、可累積口碑與技術資產的精品」，而非「靠它大賺」。引擎/玩法/第一關沉沒成本已投入，繼續推進的邊際報酬合理。

**來源：** [Game World Observer：VG Insights 獨立遊戲營收報告](https://gameworldobserver.com/2024/10/16/indie-games-revenue-steam-vs-aaa-titles-vg-insights)

---

# Part B — 首部曲題材與考據（韓戰駐台起點 + 1996 伏筆）

> **全部僅作靈感。** 真實人物/組織須虛構化；史實程度逐項標註。

## 5. 韓戰時期（1950–1955）美軍駐台與第一島鏈

**戰略框架（高信心，可作開場史觀）：**
- 韓戰時期美軍 **MacArthur 將台灣形容為「不沉的航空母艦」（unsinkable aircraft carrier）**——出自美國國務院 FRUS 1950 福爾摩沙備忘錄。⚠️**兩點精確標註**：該備忘錄日期為 **1950/6/14**，比韓戰開打（6/25）早約 11 天；且此比喻**非 MacArthur 原創**（可追溯至二戰太平洋島嶼用法）。可作 DARKLINE「第一島鏈」副標的**史觀錨點**。
- **美軍顧問團 MAAG（Military Assistance Advisory Group）駐台**：1951 年成立，指揮官 **MG William C. Chase 於 1951/5/1 抵台**；初期授權約 134 員（67 陸軍/4 海軍/63 空軍，後加 13 陸戰隊）。**1957 年在台美國人達約 1 萬人，多數為 CIA、軍方人員及眷屬。** 1955 起美軍作戰部隊由「美軍協防台灣司令部（US Taiwan Defense Command）」指揮。第七艦隊協防台灣海峽。
- **時代質地**：美援、美軍顧問、第七艦隊巡弋台海、台灣作為冷戰前線。

**兩個可虛構化的真實諜報事件（首部曲故事素材）：**

**① 西方公司（Western Enterprises, Inc.）— CIA 在台前線（強烈推薦當主軸）**
- **史實程度**：核心存在已證實——美國陸軍特戰史（ARSOF）端點明確列出「**Western Enterprises 自台灣進行戰略情報與準軍事行動**」，是韓戰時期遠東四大 CIA 計畫之一；另證實一名 CIA 借調軍官（USMC 少校 Vincent R. "Dutch" Kramer）**從台灣調往韓國**協助訓練游擊幹部，佐證台灣的 CIA 既有據點。
- **可改編空間（大）**：該來源**未提供**營運細節（確切起訖、組織、對大陸的具體任務、人員、金流）——**這對虛構化反而是好事**：歷史骨架真實（CIA 以民間「貿易公司」為掩護，自台灣與外島支援國軍對大陸沿海的游擊突襲），血肉可自由填。**建議虛構為「西緣貿易公司」之類的掩護商號**，主角是該公司聘的「物流顧問」實為情報員。
- ⚠️ 須另查：若要更扎實，需找解密 CIA 檔案 / CAT（民航空運隊 Civil Air Transport）/ 西方公司的次級學術研究。但對遊戲而言**現有骨架已足夠當靈感**。

**② 反共義士（一二三自由日）— 高戲劇張力的人物素材**
- **史實程度（高）**：**約 14,000 名**人民志願軍戰俘（多為國共內戰中被俘的前國軍）**選擇赴台而非遣返中國**；1954/1/23 首度授予「反共義士」稱號 → 設立**「一二三自由日 / World Freedom Day」**紀念。極具畫面感的細節：他們**身上刺有反共標語與中華民國國旗刺青**作為效忠的肉體宣示。後擴及**駕機投誠的解放軍空軍**（給予金錢獎勵，換取對岸軍事技術情報）。解嚴後此稱號廢止。
- **可改編空間**：可作首部曲的**情感支線/伏筆**——一名身負刺青的「義士」其實是雙面身分；或主角任務涉及保護/識破一名投誠者。刺青、心戰、駕機投誠都是強烈的視覺與劇情元素。

**來源：** [Wikipedia: Unsinkable aircraft carrier](https://en.wikipedia.org/wiki/Unsinkable_aircraft_carrier)、[Wikipedia: MAAG](https://en.wikipedia.org/wiki/Military_Assistance_Advisory_Group)、[ARSOF：韓戰 CIA 準軍事行動](https://arsof-history.org/articles/v9n1_cia_paramilitary_page_1.html)、[Wikipedia: Anti-Communist Hero（反共義士）](https://en.wikipedia.org/wiki/Anti-Communist_Hero)、[Wikipedia: First Taiwan Strait Crisis](https://en.wikipedia.org/wiki/First_Taiwan_Strait_Crisis)

## 6. 1950 年代初台灣街景考據（3D 場景/貼圖參考）

**有國家級檔案可參考（高信心）：**
- **國家圖書館「臺灣記憶」— 臺北市老照片**：收錄 **782 件**影像。[檢索頁](https://tm.ncl.edu.tw/mapopenstreet?collection=C_TPEphoto&lang=chn)
- **Google Arts & Culture（國美館典藏）**：鄧南光等 1950–60s 台灣黑白照片。[1950s-60s 台灣黑白照](https://artsandculture.google.com/story/taiwan-1950s-1960s-in-black-and-while-photos/8AIyx12zQn9oJg)

**具體視覺元素（可直接餵 Gemini 生圖 / 建模參考）：**
- **建築**：日治時期遺留的**木造建築**為主、戰後被國民政府接收沿用；**騎樓（arcaded storefronts，有頂蓋走廊）**；傳統中文字招牌。
- **街道基礎設施**：水泥側溝、上覆剖半竹片（後改重水泥蓋板）；水泥垃圾箱沿街。
- **交通工具**：**三輪車（pedicab，政府配發、有帆布頂）**、ROC 司機駕駛的**美軍吉普**、腳踏車、公車、私家車（1954 Buick、1957 Chevy）、**冰淇淋腳踏車攤（白箱 + 遮棚）**。
- **招牌/商業**：中文字公車站牌（如「濟南路三段」）、傳統字體店招；**中山北路**的美國印記（如 Rose Marie 餐廳轉角店面）；小販賣塑膠水壺、中式撲克牌、甘蔗。
- **美軍存在**：**中山北路一帶**——軍事營區大門、方向指標、泳池/俱樂部/禮拜堂；穿制服士兵與平民混雜（MAAG 總部周邊）。

**人物服裝（高信心）：** **旗袍（qipao）與西式服裝並存**的過渡風貌（國美館鄧南光照片明確記錄「穿旗袍的女子」與「穿西式洋裝微笑的女子」同框）；加上美軍制服、國軍軍裝、平民布衫。

**來源：** [國圖臺灣記憶 臺北市老照片](https://tm.ncl.edu.tw/mapopenstreet?collection=C_TPEphoto&lang=chn)、[Google Arts & Culture](https://artsandculture.google.com/story/taiwan-1950s-1960s-in-black-and-while-photos/8AIyx12zQn9oJg)、[Taipei Air Station 部落格：1957–1960 台北](http://taipeiairstation.blogspot.com/2016/10/early-days-in-taipei-1957-1960.html)、[Medium：美軍文化下的臺北生活/中山北路](https://medium.com/%E9%87%91%E8%BB%8A%E6%96%87%E6%95%99%E5%9F%BA%E9%87%91%E6%9C%83/%E8%B7%A8%E6%96%87%E5%8C%96%E8%B5%B0%E8%AE%80-%E7%BE%8E%E8%BB%8D%E6%96%87%E5%8C%96%E4%B8%8B%E7%9A%84%E8%87%BA%E5%8C%97%E7%94%9F%E6%B4%BB-%E4%B8%AD%E5%B1%B1%E5%8C%97%E8%B7%AF%E7%9A%84%E7%BE%8E%E5%9C%8B%E5%8D%B0%E8%A8%98-b5771325ea3f)

## 7. 1950 年代武器考據（武器模型參考）

> 韓戰同期制式輕武器。遊戲中武器外觀可**參考但須做原創化處理**（型號是公共領域的歷史事實，但避免照搬特定品牌商標細節）。

**主角/友方（駐台美軍 + 國軍，美式裝備）：**
- 手槍：**M1911A1**（.45 ACP）— 首部曲主武器首選
- 步槍：**M1 Garand**（.30）、M1903 Springfield（M1903A4 狙擊）
- 卡賓槍：**M1 Carbine**（半自動）、**M2 Carbine**（可連發）
- 衝鋒槍：**Thompson**（M1928A1/M1/M1A1）、**M3A1「Grease Gun」**
- 自動步槍/機槍：M1918A2 **BAR**、M1919A4/A6、M1917A1、M2 .50 cal

**敵方（對岸/共方，蘇式裝備）：**
- 衝鋒槍：**PPSh-41「波波沙/burp gun」**、**Type 50（中國仿製 PPSh，僅 35 發彈匣）**、Type 49（北韓仿製）、PPS-43
- 步槍：**Mosin-Nagant M1891/30**（部分配 PU 狙擊鏡）、**M1944 卡賓槍（摺疊刺刀）**、遺留日製 Type 38/99
- 手槍：TT-33（托卡列夫，慣例配發）
- 機槍：**DP-27（大盤雞）**、Maxim M1910/30（水冷）、SG-43
- 反器材：PTRD-41 / PTRS-41
- 註：國共內戰後共軍也吸收了大量美製租借武器

**對 DARKLINE 的取捨：** 軌道射擊不需武器庫龐大。**首部曲主武器＝M1911A1 手槍**（對應現有玩家手槍 view model），敵人持 PPSh/Type 50「burp gun」即可建立鮮明的美 vs 蘇剪影對比。

**來源：** [American Rifleman：韓戰美軍輕武器](https://www.americanrifleman.org/content/the-forgotten-war-the-men-guns-of-korea-1950/)、[American Rifleman：韓戰共方輕武器](https://www.americanrifleman.org/content/communist-small-arms-of-the-korean-war/)

## 8. 1996 第三次台海危機（第二部曲背景）

**史實時間線（高信心）：**
- **整體**：1995/7/21 – 1996/3/23。導火線＝李登輝 1995/6 訪美（康乃爾大學演講），北京視為台獨訊號。
- **飛彈試射/目標區**：1995/7/21–28 首波（DF-15，台灣外海約 36 浬/70 浬）；**1996/3/8 第二波——飛彈落於基隆外海約 20 浬、高雄外海約 29 浬**（逾 70% 商船須經此兩港，航運受衝擊）。
- **軍演/鎖台**：1996/1–2 集結約 10 萬兵力；1996/3/12–20、3/18–25 大規模演習（形同模擬封鎖）。
- **美軍回應（雙航母）**：**USS Independence（CV-62）**（3/10 宣布駛向台海）+ **USS Nimitz（CVN-68）戰鬥群**（3/11 宣布通過台海）+ USS Belleau Wood 兩棲群。
- **首次總統直選**：**1996/3/23，李登輝當選**（台灣史上首次直接民選總統）。危機反而**幫李登輝民調 +5%**，由相對多數變絕對多數。

**可虛構化的情報側面（第二部曲「保護總統」鉤子）：** 鎖台軍演 + 飛彈危機 + 首次直選的氛圍下，「保護一位面臨外部軍事脅迫的民選元首」是天然的諜報動作劇高潮。可虛構：滲透、暗殺威脅、心戰、雙面間諜在選前最後關頭的對決。**主角可設定為首部曲（1950s）情報員的後代/傳承者**，把「暗線」這條諜報血脈跨越 46 年接起來。

**來源：** [Wikipedia: Third Taiwan Strait Crisis](https://en.wikipedia.org/wiki/Third_Taiwan_Strait_Crisis)、[故事 StoryStudio：1996 台海危機](https://storystudio.tw/article/gushi/military-crisis-in-the-taiwan-strait-in-1996-02)、[天下雜誌](https://www.cw.com.tw/article/5122255)、[維基：台灣海峽飛彈危機](https://zh.wikipedia.org/zh-tw/%E5%8F%B0%E7%81%A3%E6%B5%B7%E5%B3%BD%E9%A3%9B%E5%BD%88%E5%8D%B1%E6%A9%9F)

---

## 資料品質與保留（caveats）

1. **SteamSpy 擁有者數字為統計估計**，誤差帶寬大，2018 後精度下降；所有銷量級距僅供量級判斷。
2. **Steam 區域價格**會隨改價/特賣變動，NT$378 為查證時基準價。
3. **「獨立佔 48% 營收」被 Wukong/Palworld 灌水約 38%**，排除後 2024 獨立成長僅約 11%；勿用以論證「小型獨立繁榮」。
4. **Pistol Whip/Cloudhead 自籌獲利為 2021/1 時點**，VR 後續轉弱（該團隊 2026 初裁員約七成），不可外推當前 VR 健康。
5. **《還願》退出中國機制**精確而言是「開發商自行下架 + review-bomb + 發行商被吊照」，非官方明文點名禁令；但「敏感題材＝失去中國通路」淨效果成立。
6. **Steam 在中國被封**呈間歇/區域性，起因（DNS 污染/防火長城）未經官方證實。
7. **MacArthur「不沉航母」**備忘錄日期（1950/6/14）早於韓戰開打，且比喻非其原創——史觀使用須精確標註。
8. **手機平台與 WebXR/VR 效能**本輪未取得直接硬數據，三平台勝算排序的信心較 PC 結論低（但證據仍傾向 Steam PC 優先）。
9. **西方公司營運細節、特定在台諜報事件之精確史實程度**本輪未逐條深查；現有骨架足夠當靈感，若要更扎實需另查解密檔案。

## 被否決的主張（對抗式查證 kill，供透明）

- HotD Remake「1,287 則評論 / 69% 好評 / Mixed」具體數字未通過（1-2 否決）——故報告僅給「約 1,300–2,600 則評論」級距。
- 「1950s 台北巷弄三代同堂/門口小生意/晾衣/街頭藝人/童工」具體紋理（1-2 否決）——故場景描述以已證實的建築/交通/服裝為準。
- 「Cloudhead 為 25 人團隊、Pistol Whip 大半來自 Quest」（0-3 全否決）。
- 「獨立營收佔比較 2023 升 17 個百分點、較 2018 翻倍、首次接近 AA/AAA」（1-2 否決）。
- 「全球版 Steam 此前讓開發者觸及約 3000 萬中國用戶的灰色通路」（1-2 否決）。

---

*本報告由 deep-research harness + 定向補抓產出，所有來源為公開網路資料。供 DARKLINE 開發決策參考，非投資建議。題材使用務必遵守「真實事件僅作靈感、全面虛構化」原則。*
