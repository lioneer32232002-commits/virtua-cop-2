# Handoff — Stage 4 Play-mode Debug

**Date:** 2026-05-27 evening
**Branch state:** `feat/stage4-presidential-office` pushed to GitHub, 31 commits, NOT merged
**Deployed URL:** https://virtua-cop-2.wizard32232002.workers.dev (= `main`)

---

## TL;DR

Stage 1–4 implementation is code-complete and all CI builds pass. However, the **deployed game has visible Play-mode bugs** (pink Boss, no enemies emerging, suspicious camera position). These bugs exist on `main` already and were not introduced by Stage 4 work — they slipped through because Stage 1–3 was only ever verified in batch mode, never in Play mode.

The previous session's brainstorming/spec/plan/implementation chain is all done. **Next session's job is Play-mode debugging.**

---

## What's Done

### `main` branch (live)
- T01–T20 of the original Virtua Cop 2 spec
- 3 stages (Stage 1/2/3), HUD, weapons, scoring, continue/ranking, audio placeholders
- CI deploy via `wrangler deploy` + Worker static assets — green
- Code lives in Unity 2022.3.62f3 LTS, Cinemachine + Timeline, all asset-generation runs via `MasterSetup.RunAll` in batch mode

### `feat/stage4-presidential-office` branch (pushed, not merged)
Implemented top-to-bottom via the [subagent-driven-development skill](../../../.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/subagent-driven-development/SKILL.md). 31 commits across 9 phases. Each phase ended with a combined spec+code review by an independent subagent.

| Phase | Range | What |
|---|---|---|
| 1 | `e8fb772`..`197ec91` | Difficulty system (enum, SO, service, 3 generated .asset files, half-heart HUD, EnemyController override, EnemySpawner wiring, BossController scaling, MasterSetup hook) |
| 2 | `41ac4ce`..`5c64ad0` | Minimal Main Menu (`MainMenuController` + scene generator + 3 difficulty buttons, build index 0) |
| 3 | `6b626c2` | Refactor `StageSetup.cs` 847 lines → `StageBuildHelpers.cs` + `Stages/Stage{1,2,3}Cfg.cs` — verified zero behavior change via sorted m_Name/m_LocalPosition set equality |
| 4 | `9b58c18`..`f7e674a` | Stage4 base: `Boss4SwitchSignal`, `Stage4Cfg.cs` (7-waypoint dolly, 3 waves), `Stage4_Main.playable` (markers at 3/8/14/22/30s) |
| 5 | `c89ada5`..`6908cf8` | Interactions: `DestructibleCover`, `DroppingChandelier`, prefabs, `customPostBuild` hook places 3 barricades + chandelier + 2 explosive barrels + conference table + ROC flag + 2 chairs |
| 6 | `6e333eb`..`8f3e552` | Boss C: `CeilingDebris`, `TraitorAgent` FSM (2s reveal + phase 2 mini-wave + phase 3 debris), Boss4_C prefab, `boss4c_assist` wave |
| 7 | `9c29ade`..`082dab4` | Boss A + VIP: `HostageController`, `BossAPhase3`, Boss4_A prefab (with weak points on layer 13), VIP_President prefab |
| 8 | `bd6080a`..`d48e2c7` | `BossSequencer` chains Boss-C → Boss-A; Stage4Cfg replaces placeholder boss with `Enemy_Boss_4_C.prefab`, pre-places VIP, replaces `StageBossLink` with `BossSequencer` |
| 9 | `71329a4`..`e9704ca` | Audio: 6 synthesised placeholders (bgm_stage4 + bgm_boss_final + 4 sfx), `AudioManager.bgmStage4`/`bgmBossFinal`, MasterSetup integration |

Spec: [`docs/superpowers/specs/2026-05-27-stage4-presidential-office-design.md`](../specs/2026-05-27-stage4-presidential-office-design.md)
Plan: [`docs/superpowers/plans/2026-05-27-stage4-presidential-office-plan.md`](../plans/2026-05-27-stage4-presidential-office-plan.md)

---

## What's Broken (the reason for this handoff)

User opened the deployed URL and saw:

1. **Pink/magenta Boss capsule** at the boss arena. Classic "Unity missing-shader magenta" appearance.
2. **No enemies emerging** at wave1 (which should fire at t=3s via Timeline marker → Signal → `EnemySpawner.SpawnWave("wave1")`).
3. **Camera positioning suspicious** — boss appears too close, suggesting either:
   - Dolly track started at end position (z=60) rather than start (z=0), OR
   - `RailController` advanced too fast / instantly
4. **HUD works** (SCORE, HI, CONTINUE: 3, 5 hearts, PISTOL all display correctly). So `PlayerController.Initialize()` runs (sets Continues=3).

These are all on `main` — not introduced by Stage 4 work. Stage 4 inherits the same foundations, so the same bugs will appear once Stage 4 deploys.

---

## Diagnosis Hypotheses (UNTESTED — verify before fixing)

### Hypothesis 1: Standard shader stripped from WebGL build
**Evidence:** Pink Boss = Unity "shader missing" indicator. Materials generated via `new Material(Shader.Find("Standard"))` may have lost shader reference during WebGL build's shader-stripping pass.

**But:** Ground is grey, not pink — Standard *is* in the build for the ground material. So why does Ground work but Boss not?

**Likely subhypothesis:** Ground material is created and saved into the **scene file** (Stage1.unity has its own material reference). Boss capsule materials might be created during `PrefabSetup` and saved into the **prefab** (Enemy_Boss_1.prefab), and Unity's build pipeline strips differently between scene-resident vs prefab-resident materials.

**Verify:** Open Unity, load Stage1 in Editor, Press Play. If Boss is grey in Editor but pink in WebGL → it's WebGL stripping. If Boss is pink in Editor too → it's a `PrefabSetup` bug (material didn't save to prefab properly).

**Fix path:**
- Add `Standard` (and any other used shaders) to **Project Settings → Graphics → Always Included Shaders**, OR
- Save the dynamically created materials as `.mat` assets in `Assets/Materials/` so Unity tracks shader dependencies properly, OR
- Use `Resources.Load<Shader>("...")` instead of `Shader.Find` for runtime-created materials

### Hypothesis 2: RailController dolly advance issue
**Evidence:** Boss seems close to camera even at scene start. `mainTimeline?.Play()` is called in `StageDirector.Start()` (verified at [`Assets/Scripts/Game/StageDirector.cs:42`](../../../Assets/Scripts/Game/StageDirector.cs)).

**Verify:** Open Stage1 in Editor, Press Play. Check the Inspector on `CM vcam1`:
- Does `Cinemachine Tracked Dolly → Path Position` advance from 0 over time?
- What's `RailController` actually doing on each frame? Read [`Assets/Scripts/Game/RailController.cs`](../../../Assets/Scripts/Game/RailController.cs) — never read in the previous session.

### Hypothesis 3: Wave Signals not firing
**Evidence:** Even if camera advanced, enemies should be visible at z=8/10/14. Timeline plays via `mainTimeline?.Play()`, but maybe the SignalReceiver wiring isn't actually triggering `SpawnWave`.

**Verify:** In Editor Play mode, with Console open, watch for any errors when t hits 3s. Check `EnemySpawner.SpawnWave` is reachable from the Signal → `UnityEventTools.AddStringPersistentListener` wired in `AddStringReaction` ([`StageBuildHelpers.cs`](../../../Assets/Editor/StageBuildHelpers.cs)).

**Suspicion:** Timeline marker serialisation requires `EditorUtility.SetDirty(emitter) + SetDirty(track) + SetDirty(timeline) + SaveAssets()` per the memory file's note 5. Worth checking `TimelineSetup.cs` does this correctly. If markers got stripped at save-time, no signals fire at runtime.

---

## Recommended Next Steps (in order)

1. **Open Unity, load Stage1.unity, Press Play.** Watch what happens. This 5-minute step disambiguates 80% of the hypotheses.

   - **If pink in Editor:** PrefabSetup material persistence bug. Investigate Enemy_Boss_1.prefab — does its Renderer.materials field show a valid Standard material, or null/missing?
   - **If grey in Editor:** WebGL shader stripping. Add Standard to Always Included Shaders + rebuild.

2. **Check camera advance in Editor.** Watch the Scene view; confirm dolly track is highlighted and a marker advances along it during play. If camera stays at start, RailController is broken — read it.

3. **Watch Console for errors at t=3s.** If signals are firing, you'll see EnemySpawner debug logs (or absence of them). If errors, fix the Timeline marker serialisation.

4. **Once Stage 1 plays correctly in Editor:**
   - Make any necessary fixes to runtime / shader configuration
   - Re-run `MasterSetup.RunAll`
   - Commit fixes to `main` (or a `fix/playmode-bugs` branch)
   - **Then** rebase `feat/stage4-presidential-office` on the fixes
   - Push, let CI redeploy, verify in browser
   - Manual playtest Stage 4 (16-item checklist in [spec section 9](../specs/2026-05-27-stage4-presidential-office-design.md))
   - Open PR, merge

5. **Out of scope for this debug pass** (but tracked):
   - `TraitorAgent._revealed` CS0414 warning (dead state, harmless)
   - 3 SFX using `Random.Range` without seed → non-deterministic rebuilds
   - `AudioManager.bgmBossFinal` field exists but no method plays it (need `PlayBossFinalBGM()` or similar)

---

## Useful Context for the New Session

**Critical project gotchas** (from `memory/project_virtua_cop_2.md`):
- Unity must be closed during batch runs (file-lock conflict). Check `Get-Process Unity`.
- Timeline marker serialisation needs `EditorUtility.SetDirty` on emitter + track + timeline + `AssetDatabase.SaveAssets()`. Otherwise markers vanish at runtime.
- SignalReceiver UnityEvent supports 0 or 1 arg only — use `UnityEventTools.AddStringPersistentListener` for 1-arg.
- `LayerMask.NameToLayer` in static initialiser fails during batch scene creation — always init in `Awake()`.
- WebGL template must be `APPLICATION:Default` (built-in); `PROJECT:Default` requires nonexistent folder.

**Deploy pipeline:**
- CI: `.github/workflows/build-deploy.yml` — Unity build via `game-ci/unity-builder@v4`, deploy via `cloudflare/wrangler-action@v3` calling `wrangler deploy`.
- `wrangler.toml` at repo root points `[assets].directory` at `build/WebGL/VirtuaCop2`.
- Worker name: `virtua-cop-2` — matches the unified Cloudflare Workers project the user created in dashboard.
- Cloudflare API token needs **Pages: Edit + Workers Scripts: Edit + Account Settings: Read**.

**Available skills:** `superpowers:systematic-debugging` is the right skill for the new session — it's designed for "encountering any bug, test failure, or unexpected behavior, before proposing fixes." Use it from the first message.

**No need to redo:**
- brainstorming (spec is approved)
- writing-plans (plan exists, mostly executed)
- The completed implementation work — just need Play-mode fixes layered on top.

---

## Quick Start for New Session

```
The previous session implemented Stage 4 (feat/stage4-presidential-office branch,
31 commits) but the deployed Stage 1 (on main) has visible Play-mode bugs that
were never caught because the original work was batch-mode-only.

Read docs/superpowers/handoffs/2026-05-27-stage4-playmode-debug.md for full context.

I need you to open Unity, Press Play on Stage1.unity, and tell me what you see.
Then we'll fix whatever's broken, redeploy main, then rebase + merge Stage 4.

Use the systematic-debugging skill.
```
