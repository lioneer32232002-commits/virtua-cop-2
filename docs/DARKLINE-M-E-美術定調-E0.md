# Milestone E 美術定調 — E0：四陣營剪影視覺語言（已對味）

> 產出：2026-07-04 ｜ 狀態：**E0 定調＝用戶 2026-07-04 對味通過**（四陣營剪影一眼可讀方案）。
> 權威依據：`docs/DARKLINE-STYLE-BIBLE.md` §3/§7、`docs/DARKLINE-年代考據-服裝用品武器美術.md` §1/§4/§5。本檔是 Milestone E 的定稿入口；實作若與此衝突，以本檔＋STYLE-BIBLE 為準並回報。
> 首部曲題材風控：全面虛構化、不指名真實機關、武器型號原創化（spec §13）。

## 0. 一句話定位

Milestone E＝把「幾何佔位＋單張佔位 billboard」升成 **authored 2.5D sprite**。核心設計軸＝**用剪影講主題**：
> 「**你怕的敵人拿衝鋒槍，真正做掉你的人拿一把藏在西裝裡的左輪。**」（考據 §4）

所以敵我不靠顏色分、靠**帽型＋武器剪影**分——逆光、遠距、彈鼓煙硝下都要讀得出來（STYLE-BIBLE §7「剪影可讀＝sprite 鐵則」）。

## 1. 四陣營剪影系統（E0 定稿）

| 陣營 | 帽型（一眼記號） | 身形／服裝 | 武器剪影 | 玩法語意 | 現有佔位對應 |
|---|---|---|---|---|---|
| **內勤科秘密警察**（真反派） | **呢帽 fedora** | 暗色西裝／中山裝長身、看似路人 | **看不見**（.38 左輪藏於西裝／內袋） | 敵·真凶（誤把他當平民＝主題陷阱） | `enemy.png`（fedora 便衣）＝種子 |
| **北方滲透網**（明面敵／boss 雜兵） | 蘇式船形／棉軍帽 | 橄欖綠棉軍裝、厚實 | **PPSh-41 彈鼓**（強蘇式圓鼓剪影） | 敵·明面（玩家「以為的敵人」） | `enemy3.png`（軍裝步槍）＝種子，需彈鼓化 |
| **將軍美械新軍**（友方） | **圓頂 M1 鋼盔** | 卡其美械裝具、X 背帶 | M1 Garand（長槍、**無鼓**＝跟北方分野） | 友軍·勿擊（誤擊＝違 justice 語意、扣分） | 無，需新生 |
| **街坊平民**（背景／自由段） | 無帽／盤髮 | **旗袍**細身（女）／布衫呢帽（男） | 空手（或菜籃、報紙等道具） | 中立·誤擊扣分 | 無，需新生 |

**剪影分野備忘**：北方 vs 新軍最易混（都軍裝長槍）→ 靠**帽（棉軍帽 vs 圓鋼盔）＋彈鼓（有 vs 無）**強制分開。內勤科 vs 平民男（都可戴呢帽）→ 靠**身形（挺西裝 vs 鬆布衫）＋姿態（冷硬 vs 鬆）**分；內勤科的「像路人」是設計，不是 bug。

## 2. 主角（林建國）——不需 billboard

一人稱視角，維持既有 **M1911 view-model**（primitive 剪影＋後座力，STYLE-BIBLE §7）。所以不進剪影列。E4 再考慮升質（手部／套筒後座）。

## 3. 調色 accent 分配（全部取自 `DARKLINE_PALETTE`，24 色）

生成後一律過 `palette.js` 量化到這 24 色，故 image-gen 只需「大致對」；下列是各陣營的**簽名 accent**（引導剪影的主色，非硬約束）：

| 陣營 | 主色（palette 內） | accent |
|---|---|---|
| 內勤科 | `#0a0a0e` / `#1a181c`（近黑西裝＝沉入夜色） | 冷青領帶 `#3a4c5c` |
| 北方 | `#283c32` / `#46604c`（橄欖綠） | 暖褐槍托 `#4e4028`、鋼青彈鼓 |
| 新軍 | `#806c3c` / `#b49c54`（卡其） | 冷鋼鋼盔 `#5c7080`／`#3a4c5c` |
| 平民 | 旗袍磚紅 `#782822` / `#a8402e` | 麥稈膚 `#967860`、盤髮近黑 `#141210` |

整體調性＝「上色老照片／月份牌」暖褐＋局部青綠（STYLE-BIBLE §3、考據 §5.1，用戶已認可 Duke3D 街景暖調 keeper）。

## 4. image-gen prompt 模板（E1 用；套 Gemini 生圖守則）

**共用前綴**（每則都貼）：
```
1953 Taipei film-noir stylized 2.5D game sprite, single full-body character,
front-facing, standing, plain flat neutral background (easy to key out),
even soft dusk lighting, muted amber-and-teal palette, clean readable silhouette,
matte flat shading, minimal specular highlights, NO rim light, NO glossy sheen,
NO ground shadow, NO cast shadow, NO drop shadow (transparent-ready),
NO text, NO logos, NO real brand marks, original fictional insignia only,
boomer-shooter sprite readability (Ion Fury / Blood era), not photoreal, not 3D-render glossy.
```
（守則：不寫「VC 風格」/SEGA 角色；武器**原創化**只取公共領域史實外形；生成後套調色盤量化，故不追高解析。
**⚠️ matte/無高光/無地面陰影 三條是硬性**——E1 首張內勤科實測：強白高光 rim-light 像素在 128px 近距離被後製放大成滿身白斑；地面投影陰影會殘留成腿間色塊。故一律要 matte、無投影。）

**① 內勤科秘密警察**
```
<共用前綴> + a plainclothes 1950s secret-police agent: dark tailored suit or Zhongshan
tunic, grey fedora hat, cold stern face, hands empty at sides (a small revolver
concealed under the jacket, NOT visible). Looks deceptively like an ordinary passerby.
Near-black MATTE suit with flat unshiny fabric, no bright fold highlights, thin cold-blue tie.
```

**② 北方滲透網雜兵**
```
<共用前綴> + a northern infiltrator soldier: olive-green quilted padded army coat,
soft peaked field cap, holding a WWII-era drum-magazine submachine gun (round drum
magazine prominent) across the chest. Sturdy build, Soviet-style silhouette. Original
weapon design, no real brand.
```

**③ 將軍美械新軍（友方）**
```
<共用前綴> + a friendly nationalist soldier in US-equipped gear: khaki uniform, round
US-style M1 steel helmet, X-shaped webbing straps, holding a long semi-auto rifle at
port arms (NO drum magazine). Clean modern-for-1953 American kit. Original weapon design.
```

**④ 街坊平民（女·旗袍 / 男·布衫 兩張）**
```
<共用前綴> + a 1953 Taipei civilian woman in a slim brick-red cheongsam (qipao),
mandarin collar, side slit, hair in a low bun, empty hands (or carrying a market
basket). Neutral bystander, non-threatening posture.
```
```
<共用前綴> + a 1953 Taipei civilian man in a loose grey cotton work shirt and felt
fedora, rolled sleeves, empty hands. Working-class bystander.
```

## 5. 處理管線（生圖 → 可提交 sprite）

```
cd tools/sprite-pipeline
npm install            # 一次
node process-sprite.mjs <raw.png ...> --size 128 --tolerance 60 --margin 8
# 輸出 → game/public/darkline/sprites/（保留 basename）
```
- raw 原圖放 `game/public/m0/`（gitignored）；只提交處理後小 PNG。
- 每張資產登 `/CREDITS.md`（IP 紀律，STYLE-BIBLE §1.5）。
- 命名建議：`agent.png`（內勤科）/`north.png`（北方）/`ally.png`（新軍）/`civ-f.png`/`civ-m.png`。過渡期沿用既有 `enemy*.png` 亦可，但 mission 檔要對應更新（現 `first-island-chain.js` 只引 `enemy3.png`）。

## 6. Milestone E 分期

- **E0 視覺定調** — 本檔，**已對味 2026-07-04**。
- **E1 敵/NPC 正面 billboard 定稿** — 依 §4 生 4~5 張正面圖 → §5 管線 → **用戶逐張對味**。〈下一步〉
- **E2 多角度 sheet** — 前/側/背（自由段 pointerlock 需側背面）、boss 特寫。
- **E3 動畫** — idle／走／開火／中彈／繳械（純 stepper＋TDD，STYLE-BIBLE §6）。
- **E4 主角 view-model 升質** — 手部＋套筒後座（可選）。
- **（並行）場景道具密度** — 考據 §2 小道具（搪瓷盆、三輪車、麵攤、招牌、月份牌）當 decal/低模鋪滿 streetKit，boomer-shooter 密度＝豐富感（Keeper 街景不重建、疊加）。

## 7. 風控守則（每張生圖都要過）
- **時代/地域錯置**：無「布拉吉／紅燈牌／飛鴿牌」等中國大陸 1950s 語境（考據 §1/§2 紅線）；招牌字樣留白或虛構。
- **武器**：型號取公共領域外形、**原創化**、不照搬特定商標細節。
- **全面虛構化**：不指名真實機關；「內勤科」是虛構代號。
- 三八式／南部手槍＝背景／雜牌質地，別當主戰武器（考據 §4 時代註記）。
