# docs/ops/ — 運作制度（給每個接手模型）

> 這套檔把「強模型的判斷力」外化成弱模型可照跑的規則。CLAUDE.md 路由到這裡。
> **開場先掃 `01`（很短）**；派工/驗證/維護時查對應檔。原則衝突時，以更具體的判準為準並回報使用者。
> 建立於 2026-07-03（Opus 4.8，M3 Phase C 收尾後）。維護規則見 `05`。

| 檔 | 是什麼 | 何時讀 |
|---|---|---|
| [`01-harness-diagnosis.md`](01-harness-diagnosis.md) | 本專案最漏 token/失焦/易錯前三名 + 修法 | **開場必掃**；動視覺驗證/清進程/新環境前 |
| [`02-model-dispatch.md`](02-model-dispatch.md) | 指揮官不下場、派工三件套、model/effort、升降級、驗證不自驗 | 要派 subagent 時 |
| [`03-judgment-rubrics.md`](03-judgment-rubrics.md) | 何時升級/算完成/該問使用者/該換路/品質底線（各附正反例） | 卡判斷、要宣稱完成時 |
| [`04-delegation-templates.md`](04-delegation-templates.md) | 搜尋/實作/重構/研究/審查 的派工模板（填空即用） | 寫 dispatch prompt 時 |
| [`05-maintenance-protocol.md`](05-maintenance-protocol.md) | 這些檔怎麼安全更新、踩坑寫哪、多長要精簡 | 收尾、要改 ops/CLAUDE.md/memory 時 |
| [`06-letter-to-future-sessions.md`](06-letter-to-future-sessions.md) | 前一任的叮嚀 + 制度最可能怎麼爛掉 | 首次接手讀一次，之後只追加 |
| `_backup/` | 改既有檔前的備份副本 | 需回溯時 |

**一句話心法（詳見 `06`）：** 把狀態推進 repo、把對味留給使用者、把踩到的坑趁熱寫回。
