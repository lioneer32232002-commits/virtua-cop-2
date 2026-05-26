# Virtua Cop 2 Web Remake — Design Spec
**Date:** 2026-05-26  
**Engine:** Unity 2022 LTS (WebGL)  
**Deploy:** GitHub (Public) → GitHub Actions → Cloudflare Pages

---

## 1. 目標

完整重現 Virtua Cop 2（Sega, 1995）的核心遊戲體驗，包含三大關卡、分支路線、武器系統、敵人 AI 與得分機制，以 Unity WebGL 建置後部署於 Cloudflare Pages 靜態託管。遊戲為個人使用，不對外公開網址。

---

## 2. 技術堆疊

| 項目 | 選擇 | 理由 |
|------|------|------|
| 引擎 | Unity 2022 LTS | WebGL 支援完整、Cinemachine + Timeline 成熟 |
| 鏡頭軌道 | Cinemachine Dolly Track | 精確重現鐵軌式鏡頭移動 |
| 關卡時序 | Unity Timeline | 控制鏡頭節奏、敵人出現時間點、場景事件 |
| 輸入 | 滑鼠（Mouse） | 最接近光槍原版體驗 |
| 畫面風格 | 低多邊形 Retro 3D | 忠實重現 Sega Model 2 時代風格 |
| CI/CD | GitHub Actions + game-ci | 公開 Repo 免費無限建置時間 |
| 託管 | Cloudflare Pages | 免費方案無限頻寬，靜態部署 |

---

## 3. 目錄結構

```
VirtuaCop2/
├── Assets/
│   ├── Scripts/
│   │   ├── Game/
│   │   │   ├── GameManager.cs          # 遊戲全域狀態機（標題/遊戲中/Game Over）
│   │   │   ├── RailController.cs       # Cinemachine Dolly 軌道推進控制
│   │   │   ├── StageDirector.cs        # Timeline 播放、清場點判斷、分支切換
│   │   │   ├── EnemyController.cs      # 敵人 AI 狀態機
│   │   │   ├── EnemySpawner.cs         # Timeline Signal 接收、敵人生成
│   │   │   ├── InnocentController.cs   # 無辜市民行為
│   │   │   ├── PlayerController.cs     # 玩家血量、繼續次數
│   │   │   ├── WeaponSystem.cs         # 武器切換、彈藥、換彈
│   │   │   ├── InputManager.cs         # 滑鼠 Raycast、換彈偵測
│   │   │   ├── ScoringSystem.cs        # 得分、加成計算
│   │   │   └── BossController.cs       # Boss 多段式 AI
│   │   └── UI/
│   │       ├── HUDManager.cs           # 血量條、彈藥、準星、分數
│   │       ├── ScreenManager.cs        # 標題/Stage Clear/Game Over/Ranking
│   │       └── ContinueScreen.cs       # Continue 倒數畫面
│   ├── Scenes/
│   │   ├── MainMenu.unity
│   │   ├── Stage1.unity
│   │   ├── Stage2.unity
│   │   └── Stage3.unity
│   ├── Timeline/
│   │   ├── Stage1_Main.playable        # Stage 1 主幹 Timeline
│   │   ├── Stage1_RouteA.playable      # Stage 1 A 路分支
│   │   ├── Stage1_RouteB.playable      # Stage 1 B 路分支
│   │   ├── Stage1_Boss.playable
│   │   ├── Stage2_Main.playable
│   │   ├── Stage2_RouteA.playable
│   │   ├── Stage2_RouteB.playable
│   │   ├── Stage2_Boss.playable
│   │   ├── Stage3_Main.playable
│   │   ├── Stage3_RouteA.playable
│   │   ├── Stage3_RouteB.playable
│   │   └── Stage3_Boss.playable
│   ├── Prefabs/
│   │   ├── Enemies/
│   │   │   ├── Enemy_Grunt.prefab      # 基本雜兵
│   │   │   ├── Enemy_Gunman.prefab     # 持槍敵人
│   │   │   ├── Enemy_HeavyArmor.prefab # 重裝甲兵
│   │   │   ├── Enemy_Fast.prefab       # 快速型
│   │   │   └── Enemy_Boss_[1-3].prefab
│   │   ├── Weapons/
│   │   │   ├── Pickup_MachineGun.prefab
│   │   │   └── Pickup_Shotgun.prefab
│   │   └── Environment/
│   ├── Models/                          # 低多邊形 .fbx 模型
│   ├── Audio/
│   │   ├── BGM/
│   │   └── SFX/
│   └── UI/
│       └── Sprites/                     # HUD 圖示、準星、血量框
├── .github/
│   └── workflows/
│       └── build-deploy.yml
└── ProjectSettings/
    └── (WebGL 設定：Decompression Fallback ON)
```

---

## 4. 核心玩法系統

### 4.1 鐵軌系統（Rail）

- **Cinemachine Dolly Track** 定義鏡頭路徑曲線
- **PlayableDirector** 控制 Timeline 播放／暫停
- **清場點（ClearPoint）**：Timeline Signal 觸發 `StageDirector.OnClearPoint()`
  - 所有本波敵人存活數 = 0 → `PlayableDirector.Resume()`
  - 否則 Timeline 暫停，等待清場
- **分支切換**：清場點結束時依本段清場速度決定下一條 Timeline

```csharp
void OnClearPoint(float clearTime, float threshold) {
    if (clearTime < threshold)
        SwitchToTimeline(routeA_Director);
    else
        SwitchToTimeline(routeB_Director);
}
```

### 4.2 射擊系統

- `InputManager` 每幀從攝影機向滑鼠螢幕座標發出 **Physics.Raycast**
- 左鍵按下 → `WeaponSystem.Fire()`
- **命中判定層級（Hit Zone）**：每個敵人 Prefab 掛三個 Collider
  - `HeadHitBox` → 即死 + 頭爆特效
  - `WeaponHitBox` → 繳械：武器 Prefab 從手部彈出，觸地後可撿取
  - `BodyHitBox` → 普通傷害，扣除敵人血量
- **換彈偵測**：
  - 按 `R` 鍵
  - 或滑鼠移出螢幕邊界（`Input.mousePosition` 超出 Screen 範圍）

### 4.3 武器系統

| 武器 | 彈數 | 射速 | 取得 |
|------|------|------|------|
| 手槍（Pistol） | 10 發 | 半自動 | 預設；任何武器用完後自動換回 |
| 機關槍（Machine Gun） | 30 發 | 全自動（0.08s/發） | 射擊掉落的 Machine Gun Pickup |
| 霰彈槍（Shotgun） | 6 發 | 半自動，5 顆散射 Raycast | 射擊掉落的 Shotgun Pickup |

- 武器繳械後 `Pickup` Prefab 以物理拋物線落地，2 秒後若未撿取則消失
- 手槍彈夾無限，但每次換彈有 1.2 秒硬直動畫

### 4.4 敵人 AI 狀態機

```
Hidden → Emerging（0.5s 動畫）→ Aiming（1.5–3s，依敵人類型）→ Firing → Dead | Retreat
```

| 狀態 | 說明 |
|------|------|
| Hidden | 在掩體後，不可被射擊 |
| Emerging | 從門/窗/牆角冒出動畫，可被射擊但不還擊 |
| Aiming | **玩家射擊窗口**；敵人對準玩家，時間到即開火 |
| Firing | 發射子彈傷害玩家（−1 血格），接著重回 Aiming 或進入 Hidden |
| Dead | 死亡動畫，屍體留場景 2 秒後 Deactivate |

**敵人類型與瞄準時間：**

| 類型 | Aiming 時間 | 血量 | 特性 |
|------|------------|------|------|
| Grunt（雜兵） | 2.5s | 1 hit | 基本型 |
| Gunman（槍手） | 2.0s | 1 hit | 持槍，可繳械 |
| Heavy（重裝） | 3.0s | 3 hits | 防彈衣：只有頭/腿有效 |
| Fast（快速型） | 1.2s | 1 hit | 快速左右移動 |

**無辜市民（Innocent）**：混於敵人出現動線中，Emerging 動畫完成後若未立即判定為敵人則標記為 Innocent；射中扣玩家血並顯示警示。

### 4.5 血量與繼續系統

- 玩家血量：**5 格**（原版設定）
- 扣血來源：敵人命中 −1 格 / 誤射市民 −1 格
- 血量 = 0 → 進入 **Continue 畫面**（10 秒倒數）
- Continue 次數：**3 次**（用完 → Game Over，顯示最終分數與 Ranking）
- Continue 後從當前 Section 開始點重新開始，保留分數

### 4.6 得分系統

| 事件 | 基礎分 |
|------|--------|
| 擊殺（Body） | 100 |
| 擊殺（Head Shot） | 300 |
| 繳械擊殺 | 500 |
| 快速擊殺（Aiming 開始後 1 秒內） | ×2 加成 |
| Combo（連續不間斷擊殺） | 每 5 連擊 +1,000 |
| 誤射市民 | 0 分（扣血） |
| 關卡通關獎分 | 剩餘血格 × 1,000 + 剩餘秒數 × 10（每關設定時間上限：Stage1=180s, Stage2=200s, Stage3=220s；超時不扣分，僅無時間加成）|

---

## 5. 關卡結構

### Stage 1：街頭（City Streets）
```
開場鏡頭：警車追逐場景（純演出，無互動）
Section 1：街道正面槍戰（10 敵人，2 市民）
清場點 A → 快（< 30s）：地下停車場（密閉，多掩體）
清場點 A → 慢（≥ 30s）：市集街道（開闊，多市民）
Section 2（A/B 分支）：各 12 敵人
Section 3：大樓入口廣場（15 敵人，收斂回主線）
Boss：重裝甲兵
  - Phase 1：繞柱移動，定期停下瞄準
  - Phase 2（血量 < 50%）：使用手榴彈，需先射彈破壞
  弱點：頭部（即死）/ 腿部（2 hit）
```

### Stage 2：大樓（Building Interior）
```
開場鏡頭：乘電梯上樓
Section 1：大廳 + 走廊（12 敵人，3 市民）
清場點 B → 快：施工區鷹架（垂直空間，敵人從上方攻擊）
清場點 B → 慢：開放式辦公室（桌椅掩體，密集敵人）
Section 2（A/B 分支）：各 15 敵人
Section 3：頂樓入口（10 敵人）
Boss：快速型刀客
  - Phase 1：高速左右衝刺，停下瞄準
  - Phase 2（血量 < 40%）：投擲刀（需射擊偏轉），瞬間突刺
  弱點：身體任意部位（但移動快，需預判）
```

### Stage 3：港口（Harbor & Ship）
```
開場鏡頭：碼頭夜景
Section 1：倉庫外 + 碼頭（12 敵人）
清場點 C → 快：甲板（開放，直升機懸停在固定位置，從艙門探出的槍手輪流射擊；射中槍手 3 次後直升機離去，視為清場）
清場點 C → 慢：機房（爆炸桶掩體，射中桶範圍爆炸傷害敵人）
Section 2（A/B 分支）：各 14 敵人
Section 3：艦橋走廊（8 敵人）
最終 Boss：首領，三段式
  Phase 1：手槍對決，正面交火，偶爾躲側牆
  Phase 2（血量 < 60%）：召喚 2 名護衛 + 投擲手雷（需先清護衛）
  Phase 3（血量 < 30%）：衝刺肉搏，需射擊持槍手中斷（3 次成功 → 觸發結局動畫）
```

---

## 6. HUD 介面

Unity WebGL Canvas（Screen Space - Overlay）：

```
┌─────────────────────────────────┐
│  SCORE: 000000        HI: 999999│
│                                 │
│              [+]                │  ← 準星（跟隨滑鼠）
│                                 │
│  ♥♥♥♥♥           🔫 PISTOL 10  │
│  CONTINUE: 3                    │
└─────────────────────────────────┘
```

- 準星：SVG 十字線，CSS transform 跟隨 `Input.mousePosition`
- 血量：5 個心形 Sprite，扣血時閃爍紅色
- 武器圖示 + 剩餘彈數
- 換彈時中央顯示 **RELOAD** 文字 + 動畫條
- 誤射市民時全畫面短暫紅色 Flash

---

## 7. 畫面流程

```
MainMenu → [STAGE 1] → Stage Clear → [STAGE 2] → Stage Clear
        → [STAGE 3] → Ending → Ranking → MainMenu

任意時點血量歸零 → Continue 畫面（10s倒數）
                 → Continue 剩餘次數 -1，從 Section 頭重來
                 → Continue = 0 → Game Over → Ranking → MainMenu
```

---

## 8. 資產策略

- **3D 模型**：Blender 製作低多邊形風格（< 500 面/人物）；參考 [re-virtua-cop-2](https://github.com/jevarg/re-virtua-cop-2) 逆向工程資料作為造型依據
- **貼圖**：128×128 或 256×256，低解析度仿 Sega Model 2 風格
- **音效**：重新製作（8-bit 或低位元風格槍聲、腳步聲）
- **BGM**：原版曲風（電子 + 打擊樂）重新編曲
- **檔案數量控制**：目標 < 15,000 個檔案（Cloudflare Pages 免費上限 20,000）

---

## 9. 部署流程

### GitHub Actions Workflow（`.github/workflows/build-deploy.yml`）

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - name: Activate Unity License
        uses: game-ci/unity-activate@v2
        env:
          UNITY_EMAIL: ${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}

      - name: Build WebGL
        uses: game-ci/unity-builder@v4
        env:
          UNITY_EMAIL: ${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
        with:
          targetPlatform: WebGL
          buildName: VirtuaCop2

      - name: Return Unity License
        uses: game-ci/unity-return-license@v2
        if: always()
        env:
          UNITY_EMAIL: ${{ secrets.UNITY_EMAIL }}
          UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: virtua-cop-2
          directory: build/WebGL/VirtuaCop2
```

### 必要的 GitHub Secrets

| Secret 名稱 | 說明 |
|-------------|------|
| `UNITY_EMAIL` | Unity 帳號 Email |
| `UNITY_PASSWORD` | Unity 帳號密碼 |
| `CLOUDFLARE_API_TOKEN` | CF Pages 部署用 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 帳號 ID |

### Unity 專案 WebGL 設定
- Project Settings → Player → WebGL
  - **Decompression Fallback：ON**（避免某些瀏覽器無法解壓）
  - **Auto Graphics API：OFF**，手動選 WebGL 2.0
  - Compression Format：Gzip

---

## 10. 資料持久化

- **高分記錄**：Unity WebGL 的 `PlayerPrefs` 對應瀏覽器 `localStorage`，儲存 Top 5 分數與名字縮寫（3 字元，原版風格）
- **Continue 次數**：僅存於 Session（ScriptableObject），關閉瀏覽器即重置
- **設定**（音量）：`PlayerPrefs` 儲存，跨 Session 保留

---

## 11. 參考資源

| 資源 | 用途 |
|------|------|
| [jevarg/re-virtua-cop-2](https://github.com/jevarg/re-virtua-cop-2) | 原版關卡資料、敵人位置、模型結構參考 |
| [VCop2 Asset Explorer](https://jevarg.github.io/re-virtua-cop-2/) | 瀏覽原版場景資料 |
| [Zesix/rail-hunter](https://github.com/Zesix/rail-hunter) | Unity Timeline 軌道射擊架構參考 |
| [game-ci docs](https://game.ci/docs/github/getting-started/) | Unity CI/CD 設定 |
| [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) | 免費方案限制確認 |
