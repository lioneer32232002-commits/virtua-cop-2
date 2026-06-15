# Handoff — 2026-05-28 Play-mode Fix Continuation

**Previous session date:** 2026-05-27 evening (overnight autonomous run)
**Branch:** `fix/playmode-bugs` (off `main`)
**PR:** [Draft #2](https://github.com/lioneer32232002-commits/virtua-cop-2/pull/2)
**Stage 4 branch (still un-merged):** `feat/stage4-presidential-office`

---

## TL;DR

Last night while you were away I diagnosed and fixed the four Play-mode bugs blocking Stage 1. All four are committed to `fix/playmode-bugs` and pushed as a **Draft PR** (intentionally draft — not merged, no deploy triggered yet). Stage 1 now plays end-to-end in the Editor: dark-red Boss, camera dollies, enemies spawn at t=3s, hearts deplete.

**Today's work:** verify in Editor → merge to main → CI deploys → rebase Stage 4 → port the same fixes into Stage 4-only files → second PR → merge Stage 4.

---

## What's Fixed (PR #2)

| # | Bug | Root cause | Fix location |
|---|---|---|---|
| 1 | Pink Boss + all enemies magenta | `new Material(Shader.Find("Standard"))` not persisted as asset → shader ref lost on prefab serialisation | new [`Assets/Editor/MaterialFactory.cs`](Assets/Editor/MaterialFactory.cs) + call sites in PrefabSetup/StageSetup |
| 2 | Camera frozen at first waypoint | `Mathf.Min(..., 1f)` clamp wrong for `PathUnits` mode | [`Assets/Scripts/Game/RailController.cs:28-37`](Assets/Scripts/Game/RailController.cs) |
| 3 | Timeline finished on frame 0 (no marker ever fired) | Default `BasedOnClips` duration mode + marker-only track = 0s duration | [`Assets/Editor/TimelineSetup.cs:53-60`](Assets/Editor/TimelineSetup.cs) |
| 4 | Wave signals fired into the void | `SignalTrack` had no binding → fell back to PlayableDirector's GO, but receiver lives on GameSystems | [`Assets/Editor/StageSetup.cs:557-567`](Assets/Editor/StageSetup.cs) — `pd.SetGenericBinding(track, receiver)` |

**Verification done in Editor Play mode** (the previous workflow's gap — CI batch builds passed all four, but the bugs were obvious the second Play was pressed). Editor.log captured `[EnemySpawner.SpawnWave] CALLED waveId=wave1` then `wave2` at the expected timestamps.

---

## Next Steps (in order)

### 1. Reviewer verification (5 min) — **YOU**
Open `Assets/Scenes/Stage1.unity` in Editor, press Play, confirm:
- Boss is dark grey-blue with red head, NOT pink
- Camera moves forward over the first ~10s
- At t≈3s, 3 enemies appear (2 grunts, 1 gunman)
- Hearts on HUD go from 5 red to 2 red + 3 grey as enemies attack

If Play looks right → mark PR ready-for-review → merge.

### 2. CI deploy (~5 min after merge)
Merge triggers `.github/workflows/build-deploy.yml`. WebGL build via game-ci, deploy via wrangler. Watch for green CI, then visit https://virtua-cop-2.wizard32232002.workers.dev and confirm the same fixes work in browser.

### 3. Rebase Stage 4 (10–30 min) — **needs human judgement**
```bash
git checkout feat/stage4-presidential-office
git rebase main      # main now has the fix
```

There **will** be conflicts in:
- `Assets/Editor/StageSetup.cs` — main's signal-binding loop wasn't there when Stage 4 branched
- `Assets/Scenes/Stage{1,2,3}.unity` + `Assets/Timeline/*.playable` + many prefabs — both branches regenerated these from batch. Easiest resolution: `git checkout --theirs Assets/Scenes/* Assets/Timeline/* Assets/Prefabs/*` (take Stage 4's versions), then re-run `MasterSetup.RunAll` to regenerate with the merged fix code.

### 4. Port fixes to Stage 4-only files (15–20 min)
Stage 4 branch has **its own** Shader.Find call sites that this PR did NOT touch (because those files don't exist on main):

| File | Lines | Action |
|---|---|---|
| `Assets/Editor/Stage4PrefabSetup.cs` | 117, 220 | `new Material(Shader.Find("Standard"))` → `MaterialFactory.GetOrCreate(...)` |
| `Assets/Editor/Stages/Stage4Cfg.cs` | 212 | same |
| `Assets/Editor/StageBuildHelpers.cs` | 141, 149 | same (Stage 4 refactored ground/arena into this helper) |

Also: Stage 4 has its own timeline (`Stage4_Main.playable`) — verify that `TimelineSetup` fix from this PR also applies to it (should, since it's the same `CreateStageMainTimeline` method).

Also: Stage 4 builds a separate stage Director — make sure the `SignalTrack` binding logic from this PR catches the Stage 4 timeline too. The new loop in `BuildTimelineDirector` is generic over `timeline.GetOutputTracks()` so it should auto-apply.

### 5. Re-batch + Stage 4 Editor Play verify
```bash
# With Unity closed:
Unity.exe -batchmode -nographics -projectPath . -executeMethod MasterSetup.RunAll -quit -logFile -
```

Then open `Stage4.unity` in Editor, Play, run the 16-item checklist in [the Stage 4 spec section 9](docs/superpowers/specs/2026-05-27-stage4-presidential-office-design.md).

### 6. PR Stage 4 → main, second deploy

---

## Useful Context I Learned The Hard Way Last Night

### Unity won't auto-refresh `.cs` changes reliably under OneDrive

When I edited `.cs` files while Unity was running, neither `Ctrl+R` (Refresh) nor `Assets → Refresh` menu triggered domain reload. Console stayed empty even though Debug.Log was clearly in the file on disk. **Solution that always works: close Unity entirely, then reopen.** Costs ~60s but is reliable. (Could also try Edit → Preferences → General → Auto Refresh checkbox — I didn't verify.)

### Unity command-line launch on Chinese/space paths

`Start-Process -ArgumentList @("-projectPath", $proj)` (PowerShell array form) corrupts paths with spaces and Chinese characters — Unity sees `02_?萎?` and splits on the space. Fix: pass as a **single quoted string**:
```powershell
$argstr = "-projectPath `"$proj`""
Start-Process -FilePath $exe -ArgumentList $argstr
```

### Scene YAML diffs look huge

The regenerated `Stage1.unity` etc. have ~3700-line diffs not because of behaviour changes but because batch-regenerated fileIDs reshuffle. The actual *meaningful* diff is in the `m_SceneBindings` + a handful of property values. Don't be alarmed.

### Computer-use permission

I granted via `request_access` for "Unity" early in the session (full tier). Tomorrow's session will need to do the same — permissions don't persist across sessions.

---

## Task State (carried from previous session)

- [x] Phase 1: 觀察 Play-mode 行為
- [x] Phase 2-3: 形成假設 + 最小驗證
- [x] Phase 4: 在 main 分支實作修正 ← this PR
- [ ] 部署修正後的 main, 瀏覽器驗證 ← **next** — needs you to merge
- [ ] Rebase feat/stage4-presidential-office 到修正後的 main
- [ ] 開 PR 合 Stage 4 進 main, 最終部署驗證

---

## Quick Start for New Session

```
讀 docs/superpowers/handoffs/2026-05-28-playmode-fix-handoff.md

我要驗證昨晚的 fix branch (PR #2)，然後 merge + rebase Stage 4。
請用 systematic-debugging skill 跟 verification-before-completion skill。
```
