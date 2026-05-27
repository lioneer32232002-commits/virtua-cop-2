# Stage 4: Presidential Office (仿台灣總統府) — Design Spec

**Status:** Draft pending user review
**Author:** Claude (Opus 4.7) with user brainstorming session 2026-05-27
**Predecessor:** [2026-05-26 base game design](2026-05-26-virtua-cop-2-design.md) (Stage 1–3 complete)

---

## 1. Overview

Add a single new on-rails shooter stage themed after Taiwan's Presidential Office, plus a minimal Main Menu with a difficulty selector. The stage features a sequential two-boss climax (traitor agent → hostage-taker) and three new environmental interactions. The visual style stays low-poly primitives matching Stage 1–3, but the camera pacing, dolly flow, and signal timing must feel as fluid as the original Virtua Cop 2.

**Out of scope** (deferred to later specs):
- Stage 5 / Stage 6 originals
- Stage Select screen, Options sub-menus, Credits
- Dynamic Rank difficulty (we ship a static Easy/Normal/Hard selector instead)
- High-fidelity art assets

---

## 2. Theme and Visual Direction

- **Theme:** Recognisable-by-silhouette evocation of the ROC Presidential Office: red-brick palette, central clock tower outline, symmetrical façade. Not photoreal.
- **Color palette:**
  - Primary: `#a04030` red brick, `#b85040` mid brick, `#c86050` accent
  - Ground: `#2a2520` dark slate
  - Interior: `#3a2a25` walnut, `#9a7050` polished column
  - Courtyard: `#1f2820` lawn green, `#4080a0` fountain water
- **Iconography on backdrop:**
  - Central tower silhouette over the entrance archway
  - Large ROC flag panel behind the boss arena (red field + blue canton + white sun)
- **Visual fidelity:** all geometry remains `GameObject.CreatePrimitive(...)` primitives (Cube / Plane / Capsule / Cylinder) plus solid-color materials, matching Stage 1–3.

---

## 3. Stage Layout

One continuous Cinemachine dolly track runs through four sub-zones into a boss room, in this order:

| # | Zone | Length (m) | Wave / Beat | Time on Timeline |
|---|---|---|---|---|
| 1 | 前廣場 / 牌樓 (Front Plaza / Archway) | z=0 → z=18 | wave1 (3–4 雜兵 from behind 拒馬) | t=0 → t=8s |
| 2 | 大廳 / 樓梯 (Main Hall / Staircase) | z=18 → z=38 | wave2 (4–5 槍手 from pillars + stair) | t=8s → t=18s |
| — | ClearPoint | z=38 | camera pauses until wave2 cleared | t=18s |
| 3 | 中庭迴廊 (Courtyard Cloister) | z=38 → z=60 | wave3 (Fast + Heavy + 1 平民, fountain center) | t=18s → t=30s |
| 4 | 會議廳 (Conference Hall, Boss Arena) | z=60 → z=78 | sequential boss (C → A) | t=30s → boss end |

**Timeline length:** ~32 s before boss (up from 25 s in Stage 1–3 — one extra zone justifies the extra time). Boss fight is gameplay-driven, not timeline-driven, same as Stage 1–3.

**Dolly waypoints (z, y, x rough):**

```
(0, 1.6, 0)      → spawn
(0, 1.6, 12)     → through archway
(2, 1.7, 22)     → past pillars, mid hall
(-2, 1.7, 36)    → atop staircase, ClearPoint
(0, 1.8, 50)     → entering courtyard, around fountain
(0, 1.8, 68)     → into conference hall
(0, 1.8, 78)     → boss arena center
```

**Boss arena anchor:** large flat-shaded ROC flag panel (2 m × 1.4 m) at z = 80, behind the conference table. Conference table = scaled brown cylinder. Two chairs = scaled cubes.

---

## 4. Bosses — Sequential Two-Phase Encounter

The boss room hosts **two consecutive bosses**. Killing Boss-C triggers Boss-A's entrance; killing Boss-A triggers `StageDirector.OnStageEnd()`.

### 4.1 Boss C — 叛變特勤 (Traitor Agent) [enters first]

**Concept:** Player enters conference hall; a Secret Service agent stands at attention near the conference table, looking friendly (current `Innocent`-style colors: white shirt, dark suit). After 2 s (so player has time to register he is "safe"), he draws a pistol and attacks. The visual cue at draw is a 0.3 s red-rim flash on his body to make the transition fair.

**Phases (driven by existing `BossController`):**

- **Phase 1 (100 → 50 %):** Standing fire from cover (the conference table). Tracks player with pistol, ~1.2 shots/s.
- **Phase 2 (50 → 30 %):** Summons one mini-wave of 2 Gunmen from the side door (reuses `EnemySpawner.SpawnWave("boss4c_assist")`). Boss himself is briefly invulnerable (1.5 s) while taunting.
- **Phase 3 (< 30 %):** Triggers ceiling debris fall (3 plaster chunks drop along the dolly track — visual + AoE damage if player can't see them coming, but the SFX gives a 0.5 s warning). Boss becomes aggressive: 2 shots/s, weaves.

**Weak point:** torso (uses default body layer — no special weak point layer; he is a "fast medium" boss, not a tank).

**HP:** 18 (Easy: 13 / Normal: 18 / Hard: 25 — derived via `DifficultySettings.bossHpMul`).

**On defeat:** plays a 1.5 s collapse animation gap, then triggers Boss-A entrance from the rear door.

### 4.2 Boss A — 挾持人質的頭目 (Hostage-Taker) [enters second, final boss]

**Concept:** Side door slams open. The terrorist leader walks in pushing the President (VIP) ahead as a human shield. Pistol pressed to VIP's temple. Player must hit only the boss's **exposed weak points** (his head peeking over VIP's shoulder + his pistol hand). Hitting the VIP body causes large score penalty + 1 heart damage.

**Phases:**

- **Phase 1 (100 → 50 %):** Slow strafe left-to-right. VIP rigidly tied to boss position (offset Vector3(0.6, 0, 0)). Head pops out 0.7 s, retracts 0.5 s. Player has narrow firing window.
- **Phase 2 (50 → 30 %):** Boss starts crouch-walking, hides behind conference table at intervals (table is solid cover); reappears at unpredictable positions on table edges.
- **Phase 3 (< 30 %):** Panic — boss pushes VIP aside (VIP falls to floor at safe position, marked "Innocent OK" — no longer a hit penalty) and fires wildly. Standard boss combat for the last 30 %.

**Weak points (custom layers):**
- `BossWeakPoint` layer (slot 13, already exists): head capsule + pistol-hand capsule.
- Body capsule remains on default `EnemyBody` layer but is **hidden behind VIP collider** in Phase 1–2 (collider occlusion = no hit). Phase 3 the body becomes shootable.

**VIP (new `HostageController`):**
- Mounted as child of boss until Phase 3
- Has its own `Innocent` layer (slot 11) — hitting drains `ScoringSystem` heavily AND deals 1 heart of player damage
- Plays a scripted "thank you" voiceline (placeholder synthesised .wav) on stage end

**HP:** 25 (Easy: 18 / Normal: 25 / Hard: 35).

**On defeat:** `StageBossLink` → `StageDirector.OnStageEnd()` (existing wiring).

### 4.3 New Component: `BossSequencer`

A single MonoBehaviour on the boss-arena root that:

```csharp
[SerializeField] BossController firstBoss;
[SerializeField] GameObject     secondBossPrefab;
[SerializeField] Transform      secondBossSpawnPoint;
[SerializeField] float          delayBetween = 1.5f;
```

Subscribes to `firstBoss.OnDefeated`, waits `delayBetween`, instantiates `secondBossPrefab` at `secondBossSpawnPoint`, then wires `secondBoss.OnDefeated → StageDirector.OnStageEnd` (replaces the role of `StageBossLink`).

`StageBossLink` is left alone for Stage 1–3; Stage 4 uses `BossSequencer` instead.

---

## 5. Difficulty System (Easy / Normal / Hard)

### 5.1 Architecture

A new `DifficultySettings` ScriptableObject is created with three instances (`.asset` files). The active level is stored in `PlayerPrefs` under `"difficulty"` and is selectable from the Main Menu.

Game systems read the active settings on `Awake()` via a `DifficultyService` static singleton:

```csharp
public static class DifficultyService {
    public static DifficultySettings Active { get; private set; }
    public static void Apply(DifficultyLevel level) { ... saves to PlayerPrefs ... }
}
```

### 5.2 Multipliers

| Setting | Easy | Normal | Hard | Applied by |
|---|---|---|---|---|
| Enemy HP multiplier | 0.7× | 1.0× | 1.4× | `EnemySpawner.Spawn()` calls new `EnemyController.SetHealthOverride(int)` per instance |
| Enemy aiming-duration multiplier | 1.4× | 1.0× | 0.7× | `EnemyController.SetAimingOverride(float)` per instance (longer aim on Easy = slower fire) |
| Player damage per hit (hearts) | 0.5 | 1.0 | 2.0 | `PlayerController.TakeHit()` — half-hearts allowed |
| Continues remaining | 5 | 3 | 1 | `GameManager` initial value |
| Boss HP multiplier | 0.7× | 1.0× | 1.4× | `BossController.maxHealth` scaling in `Awake()` |

**Note on existing code:** `EnemyController` currently sources `health` and `aimingDuration` from a *static readonly* `TypeConfig` dictionary shared across all enemies. To support difficulty without mutating shared state, we add per-instance override fields (`int? healthOverride`, `float? aimingOverride`) that the spawner sets before `Awake`. The static dictionary stays as the baseline.

Boss HP **does** scale — keeping it static would make Hard mode anti-climactic given the rest of the run is harder. The multiplier is applied once in `Awake()`.

### 5.3 Saved/persistent

- `PlayerPrefs["difficulty"]` — int 0/1/2
- `PlayerPrefs["hiscore"]` — already used by `RankingScreen`, unchanged

---

## 6. Main Menu (Minimal)

A new `MainMenu.unity` scene, set as **build index 0**, with:

- **Title text** ("VIRTUA COP 2 — REMAKE") centered, large
- **Subtitle** ("SELECT DIFFICULTY") below
- **Three buttons** in a horizontal row: `EASY` / `NORMAL` / `HARD`
- On click: `DifficultyService.Apply(level); SceneManager.LoadScene("Stage1");`
- **Background:** dark gradient + faint dolly preview of Stage1 first 3 s (PlayableDirector cycling) — *stretch goal, drop if not trivial*
- Built via new `Assets/Editor/MainMenuSetup.cs`, registered in `MasterSetup.RunAll()`

End of stage flow: `RankingScreen` (existing) → button "BACK TO MENU" → `MainMenu`.

---

## 7. Special Interactions

### 7.1 拒馬 (Destructible Barricades) — Front Plaza

3 wooden cross-barricades placed across the plaza.

- **New component `DestructibleCover`:** has `int hp = 3`. On bullet hit, decrement; at 0, deactivate visual & collider, play "wood crack" SFX.
- Wave 1 enemies are positioned **behind** them. Players who shoot the cover open a clearer line of sight; tactically, shooting the cover wastes ammo.
- No gameplay penalty for ignoring; just adds player agency.

### 7.2 吊燈 (Drop Chandelier) — Main Hall

One chandelier hanging mid-hall (z ≈ 26, y = 3).

- **Reuses `ExplosiveBarrel` AoE logic**, but in a new prefab with chandelier visual (yellow cylinder cluster) and a chain (thin cylinder up to ceiling). Component renamed-via-derivation: new `DroppingChandelier : ExplosiveBarrel` overrides `OnDestroyed()` to fall (animate transform.y down for 0.4 s) then AoE-damage all enemies within radius 4 m.
- Tactical: kills all wave 2 enemies clustered beneath if timed right.

### 7.3 會議廳爆破桶 (Conference Hall Explosive Barrels) — Boss Arena

Two `ExplosiveBarrel` prefabs (reused from Stage 3), placed at the conference table's left/right ends.

- Shooting them deals heavy damage to Boss-C if he's near (Phase 1 / Phase 3 he's near the table; Phase 2 he's mobile).
- During Boss-A phase, shooting a barrel that's near the VIP **damages the VIP** instead of helping — adds risk/reward.

---

## 8. Architecture: File Split (Approach 2)

Current `Assets/Editor/StageSetup.cs` is 847 lines covering three hardcoded stages. Adding Stage 4 verbatim would push it past 1200 lines.

### 8.1 Refactor (no behavior change)

Split into:

```
Assets/Editor/
├── StageSetup.cs              # thin orchestrator + CreateAllStages() + CreateStageN() entry points
├── StageBuildHelpers.cs       # all the BuildEnvironment / BuildDollyTrack / BuildCameraRig / BuildGameSystems / BuildHudCanvas / WirePrefabsToSpawner / signal-reaction helpers
├── stages/
│   ├── Stage1Cfg.cs           # private static class with BuildCfg()
│   ├── Stage2Cfg.cs
│   ├── Stage3Cfg.cs
│   └── Stage4Cfg.cs           # NEW
```

Each `StageNCfg` exposes a single static method `public static StageCfg Build()` returning the same `StageCfg` struct used today. `StageSetup.CreateAllStages()` calls each and feeds the result to `StageBuildHelpers.BuildStage(cfg)`.

**Verification step (non-negotiable):** after the refactor, run `MasterSetup.RunAll` for stages 1–3 only on a temp branch and compare the resulting `.unity` and `.playable` files against the pre-refactor versions. Acceptable: identical except for asset GUIDs that Unity reshuffles on regeneration, and Unity's own scene-file ordering jitter. **Unacceptable:** any difference in transform positions, component values, signal wiring, or wave configs. Run Stage 1–3 manually in Play mode to spot-check before signing off the refactor.

### 8.2 New / changed code (full list)

**New runtime components** (`Assets/Scripts/Game/`):
- `BossSequencer.cs`
- `HostageController.cs`
- `TraitorAgent.cs` (FSM: Idle → Reveal → Combat → MiniWave → Debris → Defeated)
- `DestructibleCover.cs`
- `DroppingChandelier.cs` (extends or composes `ExplosiveBarrel`)
- `DifficultySettings.cs` (ScriptableObject)
- `DifficultyService.cs` (static)
- `CeilingDebris.cs` (simple gravity drop + AoE)
- `MainMenuController.cs`

**New editor scripts** (`Assets/Editor/`):
- `Stage4Cfg.cs`
- `MainMenuSetup.cs`
- `Stage4PrefabSetup.cs` — extends `PrefabSetup` with: `Enemy_Boss_4_C` (traitor), `Enemy_Boss_4_A` (hostage-taker), `VIP_President`, `Chandelier`, `DestructibleBarricade`, `CeilingDebrisChunk`
- `Stage4AudioSetup.cs` — synthesises new placeholders: `bgm_stage4.wav`, `bgm_boss_final.wav`, `sfx_wood_break.wav`, `sfx_chandelier_crash.wav`, `sfx_debris_fall.wav`, `sfx_vip_thanks.wav`
- `Stage4TimelineSetup.cs` — new `Stage4_Main.playable` with markers at 3s/8s/14s/22s/30s + a new `Boss4SwitchSignal`
- `DifficultySettingsSetup.cs` — generates the three `DifficultySettings_{Easy,Normal,Hard}.asset` files

**Modified existing code:**
- `MasterSetup.cs` — add calls to new setups; reorder to ensure prefabs exist before stages reference them
- `EnemyController` — add `SetHealthOverride(int)` and `SetAimingOverride(float)`; `Awake()` honours overrides if set, else falls back to `TypeConfig` baseline. `EnemySpawner.Spawn()` calls the setters before activating the enemy, multiplying baseline by `DifficultyService.Active.enemyHpMul` and `aimingDurationMul`.
- `BossController` — multiply `maxHealth` in `Awake` by `DifficultyService.Active.bossHpMul`
- `PlayerController` — `TakeHit()` reads `damagePerHit` from `DifficultyService.Active`
- `GameManager` — reads `continuesAtStart` from `DifficultyService.Active`
- `EnemySpawner` — add wave `"boss4c_assist"` config (used by `TraitorAgent.SummonAssist()`)

**New scenes:**
- `Assets/Scenes/MainMenu.unity` (build index 0)
- `Assets/Scenes/Stage4.unity` (build index 4 — Stage1/2/3 are 1/2/3)

---

## 9. Testing Approach

Play-mode testing is the only meaningful gate (batch-mode build verifies compile only).

**Smoke checklist:**

1. From a clean clone, run `MasterSetup.RunAll`; verify 0 compile errors, 0 warnings.
2. Open `Stage1.unity` → Play → confirm Stage 1 is unchanged (refactor regression check).
3. Open `Stage4.unity` → Play → camera advances through 4 zones smoothly.
4. Wave 1 enemies emerge from behind 拒馬; shooting a 拒馬 chips it down over 3 hits.
5. ClearPoint pauses camera at z=38 until wave 2 cleared.
6. Chandelier shootable, falls, AoE kills clustered wave 2 enemies if timed.
7. Wave 3 fountain area: 1 platform innocent — shoot penalty applies.
8. Conference hall: traitor agent stands still for 2 s, then attacks (red rim cue visible).
9. Traitor Phase 2 summons 2 gunmen from side door.
10. Traitor Phase 3 drops 3 plaster chunks with 0.5 s warning SFX.
11. Traitor defeated → 1.5 s gap → Boss A enters with VIP attached.
12. Hitting VIP body: −5000 score + 1 heart damage flash.
13. Hitting boss head/hand weak point: damage tick + crit SFX.
14. Phase 3 of Boss A: VIP drops to floor, stops being a hit penalty; boss body becomes shootable.
15. Boss A defeated → StageEnd → RankingScreen.
16. Difficulty: switch to Hard from menu, replay Stage 1; enemy HP visibly higher, player dies in 1 heart per hit (already lethal because Stage 1 takes 5 hits on Normal → 2.5 hits on Hard).

**No automated tests** — Unity batch-mode cannot drive shooting input. Manual playtest is the verification.

---

## 10. Risks & Open Questions

- **Refactor risk (Approach 2):** byte-identical regeneration of Stage 1–3 is essential. If the diff is non-trivial, we either accept it (and re-verify Stage 1–3 manually) or revert and switch to Approach 1.
- **VIP collider occlusion in Phase 1–2:** depends on `Physics.Raycast` from the bullet honouring the VIP collider as a layer-13 / layer-11 occluder. If hit registration ignores `Innocent` layer for occlusion, we need to put a duplicate "shield" collider on a layer that does block.
- **Difficulty scaling for Boss A weak points:** if Hard mode makes the head pop-out window too tight, the fight may feel unfair. Tune in playtest.
- **Half-heart damage on Easy:** existing `HUDManager.healthSlots` swaps `heartFull` ↔ `heartEmpty` sprite per slot. Half-hearts need a third sprite (`heartHalf`) AND health stored as float `0..5f` in `PlayerController`. Display logic: for slot i, full if `health ≥ i+1`, half if `i ≤ health < i+1` (and `health > i + 0.4f`), else empty. Half-heart sprite generated programmatically: copy `heartFull` with a vertical mask (right half black). Done in `Stage4PrefabSetup` (or `HUDManager` startup, whichever ends up simpler).

---

## 11. Implementation Order (preview — full plan goes in a separate writing-plans output)

1. Difficulty system (no UI yet) + half-heart HUD
2. Main Menu scene + scene-load flow
3. Stage 4 refactor groundwork (split files, verify Stage 1–3 byte-identical)
4. Stage 4 environment + dolly + waves 1–3
5. Special interactions: 拒馬 / 吊燈 / 爆破桶 wired into Stage 4
6. Boss C (traitor) + ceiling debris
7. Boss A (hostage-taker) + VIP follow + weak-point logic
8. `BossSequencer` wiring C → A
9. Audio placeholders + signal markers
10. End-to-end playtest pass

---

## 12. Acceptance Criteria

- All 10 implementation steps above pass their own verification.
- Stage 1–3 play identically to pre-Stage-4 build (manual A/B check).
- Difficulty selection on Main Menu correctly affects HP/fire rate/player damage/continues across all four stages.
- Stage 4 reaches `StageEnd` only after both bosses defeated; cannot accidentally skip Boss A.
- Hitting VIP in Phase 1–2 always triggers the score+heart penalty; never grants a "kill".
- Build settings include `MainMenu` at index 0 and `Stage4` at index 4.
