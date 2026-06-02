# Virtua Cop 2 — Web Remake

Virtua Cop 2（1995）的個人重製版。**目前主線為 Three.js 版本**（`game/`），以 Vite 建置並部署到 Cloudflare（Workers static assets）。

> `Assets/`、`ProjectSettings/`、`Packages/` 是早期的 Unity 原型，**已不再是建置/部署目標**，僅保留作參考。請勿以 Unity 專案的角度理解此 repo 的線上版本。

## 技術堆疊（現行）

- **Three.js**（`three@^0.168`）— WebGL 渲染、軌道式鏡頭、raycast 射擊
- **Vite** — dev server 與 production build
- **Vitest** — 單元測試
- **GitHub Actions + Cloudflare Wrangler** — `main` push 自動 build & deploy（見 [.github/workflows/build-deploy.yml](.github/workflows/build-deploy.yml)）

## 開發設定

```bash
cd game
npm install
npm run dev      # Vite dev server（通常 http://localhost:5175）
npm test         # Vitest，全部應通過
npm run build    # 產出 game/dist/
```

## ⚠️ 3D 資產（重要）

關卡/敵人模型（`game/public/assets/**/*.glb`、`camera.bin`）由 `tools/extract-stage-assets/` 從**原版遊戲 BIN 檔**提取，並透過 `game/.gitignore` **排除在版控之外**。

因此：

- **clone 後直接 build/部署，線上版不會有任何原版模型** — `StageEnvironment` 會 404 退回灰色 fallback 地板，敵人退回色塊。
- CI（`build-deploy.yml`）**不包含**提取或上傳資產的步驟。

要讓部署版含原版模型，需擇一處理（尚未實作）：

1. 以 **Git LFS** 將提取後的 `.glb` / `.bin` 納入版控；或
2. CI 從私有儲存（Cloudflare R2 / GitHub Release artifact）拉取資產後再 build；或
3. build 後手動把資產上傳至 Cloudflare。

本機開發時，把提取好的資產放進 `game/public/assets/stage1/`（等）即可被 Vite 載入。

## 部署設定（GitHub Secrets）

| Secret | 說明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare 部署用 Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 帳號 ID |

## 文件

- 交接筆記：[HANDOFF.md](HANDOFF.md)
- 設計文件：[docs/superpowers/specs/](docs/superpowers/specs/)、計畫：[docs/superpowers/plans/](docs/superpowers/plans/)
</content>
</invoke>
