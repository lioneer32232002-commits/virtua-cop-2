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

**這是刻意的決策**：本 repo 與其 Cloudflare 部署皆為**公開**，提取自原版遊戲的 GLB 屬原廠衍生資產，**不主動納入公開版控或公開散布**（Git LFS 也會公開散布，同樣排除）。

因此分成兩種體驗：

| | 原版模型 | 說明 |
|---|---|---|
| **線上公開版** | ❌ fallback | `StageEnvironment` 找不到 GLB → 退回灰色樓房 fallback、敵人為色塊。CI 不提取/上傳資產，這是預期行為。 |
| **本機完整版** | ✅ 完整 | 自行用 `tools/extract-stage-assets/` 提取後放進 `game/public/assets/stage1/`（等），Vite 即會載入。 |

> 換言之：想要完整原版體驗請在本機跑；公開部署維持 fallback，避免在公開網站散布原廠資產。

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
