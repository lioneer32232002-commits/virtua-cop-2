# Virtua Cop 2 — Web Remake

Virtua Cop 2（1995）的個人重製版，使用 Unity 2022 LTS 建置並以 WebGL 部署於 Cloudflare Pages。

## 技術堆疊

- **Unity 2022 LTS** — WebGL 建置目標
- **Cinemachine + Timeline** — 鐵軌式鏡頭與關卡時序
- **GitHub Actions + game-ci** — 自動化建置
- **Cloudflare Pages** — 靜態託管

## 開發設定

1. 使用 Unity 2022 LTS 開啟此資料夾作為專案
2. 安裝 Packages：Cinemachine、Timeline
3. Build Settings → 切換至 WebGL 平台
4. Player Settings → WebGL → 啟用 Decompression Fallback

## 部署設定（GitHub Secrets）

| Secret | 說明 |
|--------|------|
| `UNITY_EMAIL` | Unity 帳號 Email |
| `UNITY_PASSWORD` | Unity 帳號密碼 |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages 部署用 Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 帳號 ID |

## 設計文件

[docs/superpowers/specs/2026-05-26-virtua-cop-2-design.md](docs/superpowers/specs/2026-05-26-virtua-cop-2-design.md)
