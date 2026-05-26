# Virtua Cop 2 Web Remake — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a faithful Unity 2022 LTS WebGL remake of Virtua Cop 2 (Sega, 1995) — 3 stages with branching paths, rail camera, mouse shooting, enemy AI, and auto-deploy to Cloudflare Pages via GitHub Actions.

**Architecture:** Cinemachine Dolly Track + Unity Timeline drive the rail movement and enemy wave timing. Game logic (scoring, weapons, health) lives in MonoBehaviour singletons with testable pure-C# calculation helpers. GameManager holds the global state machine. EnemySpawner receives Timeline Signals to spawn waves; StageDirector handles clear-point detection and branch switching.

**Tech Stack:** Unity 2022 LTS, Cinemachine 2.x, Unity Timeline, Unity Test Framework (UTF), game-ci v4, Cloudflare Pages

---

## File Map

| File | Responsibility |
|------|----------------|
| `Assets/Scripts/Game/GameManager.cs` | Global state machine, scene loading |
| `Assets/Scripts/Game/PlayerController.cs` | Health (5 slots), continues (3), damage events |
| `Assets/Scripts/Game/WeaponSystem.cs` | Weapon switching, ammo, fire rate, reload |
| `Assets/Scripts/Game/ScoringCalculator.cs` | Pure-C# scoring math — testable |
| `Assets/Scripts/Game/ScoringSystem.cs` | MonoBehaviour wrapper, score state |
| `Assets/Scripts/Game/EnemyController.cs` | FSM: Hidden→Emerging→Aiming→Firing→Dead |
| `Assets/Scripts/Game/InnocentController.cs` | Bystander emerge/disappear, hit penalty |
| `Assets/Scripts/Game/EnemySpawner.cs` | Timeline Signal receiver, object pool, wave clear event |
| `Assets/Scripts/Game/InputManager.cs` | Mouse Raycast, fire, reload trigger |
| `Assets/Scripts/Game/RailController.cs` | CinemachineTrackedDolly speed / pause / resume |
| `Assets/Scripts/Game/StageDirector.cs` | PlayableDirector management, clear-point timing, branching |
| `Assets/Scripts/Game/BossController.cs` | Multi-phase HP, weak-point Colliders, phase events |
| `Assets/Scripts/UI/HUDManager.cs` | Crosshair, health sprites, ammo text, score, reload bar |
| `Assets/Scripts/UI/ScreenManager.cs` | GameState → screen visibility mapping |
| `Assets/Scripts/UI/ContinueScreen.cs` | 10 s countdown, Yes/No buttons |
| `Assets/Scripts/UI/RankingScreen.cs` | Top-5 display, 3-char name entry, PlayerPrefs save |
| `Assets/Scripts/Game/VirtuaCop2Scripts.asmdef` | Assembly definition for game scripts |
| `Assets/Tests/EditMode/VirtuaCop2Tests.asmdef` | Test assembly definition |
| `Assets/Tests/EditMode/ScoringCalculatorTests.cs` | EditMode unit tests |
| `Assets/Tests/EditMode/WeaponDataTests.cs` | EditMode unit tests |

---

## Task 1: Unity Project Setup (Manual — Unity Hub)

**Files:** `ProjectSettings/ProjectSettings.asset` (modified by Unity), `Packages/manifest.json`

- [ ] **Step 1: Create project in Unity Hub**

  Open Unity Hub → New Project → Core → **Unity 2022.3 LTS** → Location: `C:\Users\oneda\OneDrive\02_創作\14_AI TEST\VirtuaCop2` → Project name: **VirtuaCop2** → Create.

  > Unity creates `Assets/`, `Packages/`, `ProjectSettings/` inside the folder. The `.gitignore` and docs already committed are unaffected.

- [ ] **Step 2: Install packages via Package Manager**

  Window → Package Manager → Unity Registry:
  - **Cinemachine** → Install (latest 2.x)
  - **Timeline** → Install (if not already present)
  - **Unity Test Framework** → Install

- [ ] **Step 3: Configure WebGL build target**

  File → Build Settings → WebGL → Switch Platform.

- [ ] **Step 4: Configure WebGL Player Settings**

  Edit → Project Settings → Player → WebGL tab:
  - **Other Settings → Auto Graphics API: OFF** → manually add WebGL 2.0
  - **Publishing Settings → Decompression Fallback: ON**
  - **Publishing Settings → Compression Format: Gzip**

- [ ] **Step 5: Set Physics layers**

  Edit → Project Settings → Tags and Layers → Layers:
  - Layer 8: `EnemyBody`
  - Layer 9: `EnemyHead`
  - Layer 10: `EnemyWeapon`
  - Layer 11: `Innocent`
  - Layer 12: `WeaponPickup`
  - Layer 13: `BossWeakPoint`

- [ ] **Step 6: Create scene files**

  File → New Scene (Basic 3D) → Save As `Assets/Scenes/MainMenu.unity`  
  Repeat for `Stage1.unity`, `Stage2.unity`, `Stage3.unity`.

- [ ] **Step 7: Commit initial Unity project**

  ```bash
  cd "C:\Users\oneda\OneDrive\02_創作\14_AI TEST\VirtuaCop2"
  git add Assets/ Packages/ ProjectSettings/ UserSettings/
  git commit -m "feat: add Unity 2022 LTS project with WebGL config and Cinemachine"
  git push
  ```

---

## Task 2: Assembly Definitions & Test Infrastructure

**Files:**
- Create: `Assets/Scripts/Game/VirtuaCop2Scripts.asmdef`
- Create: `Assets/Tests/EditMode/VirtuaCop2Tests.asmdef`
- Create: `Assets/Tests/EditMode/ScoringCalculatorTests.cs` (placeholder)

- [ ] **Step 1: Create game scripts assembly definition**

  In Unity: Assets → Scripts → Game → right-click → Create → Assembly Definition → name it `VirtuaCop2Scripts`.

  Or create the file directly:

  ```json
  // Assets/Scripts/Game/VirtuaCop2Scripts.asmdef
  {
      "name": "VirtuaCop2Scripts",
      "rootNamespace": "VirtuaCop2",
      "references": [],
      "includePlatforms": [],
      "excludePlatforms": [],
      "allowUnsafeCode": false,
      "overrideReferences": false,
      "precompiledReferences": [],
      "autoReferenced": true,
      "defineConstraints": [],
      "versionDefines": [],
      "noEngineReferences": false
  }
  ```

- [ ] **Step 2: Create test assembly definition**

  Create folder `Assets/Tests/EditMode/`, then create:

  ```json
  // Assets/Tests/EditMode/VirtuaCop2Tests.asmdef
  {
      "name": "VirtuaCop2Tests",
      "rootNamespace": "VirtuaCop2.Tests",
      "references": [
          "VirtuaCop2Scripts",
          "UnityEngine.TestRunner",
          "UnityEditor.TestRunner"
      ],
      "includePlatforms": ["Editor"],
      "excludePlatforms": [],
      "allowUnsafeCode": false,
      "overrideReferences": true,
      "precompiledReferences": ["nunit.framework.dll"],
      "autoReferenced": false,
      "defineConstraints": ["UNITY_INCLUDE_TESTS"],
      "versionDefines": [],
      "noEngineReferences": false
  }
  ```

- [ ] **Step 3: Create placeholder test to verify pipeline**

  ```csharp
  // Assets/Tests/EditMode/ScoringCalculatorTests.cs
  using NUnit.Framework;
  using VirtuaCop2;

  namespace VirtuaCop2.Tests
  {
      public class ScoringCalculatorTests
      {
          [Test]
          public void Placeholder_AlwaysPasses()
          {
              Assert.IsTrue(true);
          }
      }
  }
  ```

- [ ] **Step 4: Run tests to verify setup**

  Window → General → Test Runner → EditMode → Run All.  
  Expected: 1 test passes (green).

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/Game/VirtuaCop2Scripts.asmdef Assets/Tests/
  git commit -m "feat: add assembly definitions and UTF test infrastructure"
  git push
  ```

---

## Task 3: CI/CD — GitHub Secrets & Cloudflare Pages Project

**Files:** `.github/workflows/build-deploy.yml` (already committed — verify only)

- [ ] **Step 1: Set GitHub Secrets**

  GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

  | Name | Value |
  |------|-------|
  | `UNITY_EMAIL` | Your Unity account email |
  | `UNITY_PASSWORD` | Your Unity account password |
  | `CLOUDFLARE_API_TOKEN` | (created in Step 2) |
  | `CLOUDFLARE_ACCOUNT_ID` | (from Cloudflare dashboard) |

- [ ] **Step 2: Create Cloudflare Pages project**

  Cloudflare Dashboard → Pages → Create a project → **Direct Upload** (not Git-connected — GitHub Actions will push via API).  
  Project name: `virtua-cop-2` → Deploy (upload a placeholder `index.html` to complete wizard).

- [ ] **Step 3: Create Cloudflare API Token**

  Cloudflare Dashboard → My Profile → API Tokens → Create Token → Use template **Edit Cloudflare Pages** → Account: your account → Zone Resources: All zones → Create Token.  
  Copy the token → paste into GitHub Secret `CLOUDFLARE_API_TOKEN`.

- [ ] **Step 4: Get Cloudflare Account ID**

  Cloudflare Dashboard → right-side panel → Account ID (copy) → paste into GitHub Secret `CLOUDFLARE_ACCOUNT_ID`.

- [ ] **Step 5: Verify workflow file**

  Confirm `.github/workflows/build-deploy.yml` exists with correct `projectName: virtua-cop-2` and `directory: build/WebGL/VirtuaCop2`.

  > First successful build will happen after Task 21. Skip manual trigger for now.

---

## Task 4: GameManager

**Files:**
- Create: `Assets/Scripts/Game/GameManager.cs`

- [ ] **Step 1: Write GameManager**

  ```csharp
  // Assets/Scripts/Game/GameManager.cs
  using System;
  using UnityEngine;
  using UnityEngine.SceneManagement;

  namespace VirtuaCop2
  {
      public enum GameState
      {
          MainMenu,
          Playing,
          ClearPoint,   // Timeline paused, clearing wave
          StageClear,
          Continue,
          GameOver,
          Ranking,
          Ending
      }

      public class GameManager : MonoBehaviour
      {
          public static GameManager Instance { get; private set; }

          public GameState State { get; private set; } = GameState.MainMenu;

          public event Action<GameState> OnStateChanged;

          // Stage time limits in seconds (for clear bonus calculation)
          public static readonly float[] StageTimeLimits = { 180f, 200f, 220f };

          private float stageStartTime;

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
              DontDestroyOnLoad(gameObject);
          }

          public void SetState(GameState newState)
          {
              State = newState;
              OnStateChanged?.Invoke(newState);
          }

          public void StartStage(int stageIndex)
          {
              stageStartTime = Time.time;
              SetState(GameState.Playing);
              SceneManager.LoadScene($"Stage{stageIndex}");
          }

          public void LoadMainMenu()
          {
              SetState(GameState.MainMenu);
              SceneManager.LoadScene("MainMenu");
          }

          public float GetElapsedStageTime() => Time.time - stageStartTime;

          public float GetRemainingStageTime(int stageIndex)
          {
              float limit = StageTimeLimits[Mathf.Clamp(stageIndex - 1, 0, 2)];
              return Mathf.Max(0f, limit - GetElapsedStageTime());
          }
      }
  }
  ```

- [ ] **Step 2: Add GameManager to MainMenu scene**

  Open `Assets/Scenes/MainMenu.unity` → Create Empty GameObject → name it `GameManager` → Add Component → `GameManager`.

- [ ] **Step 3: Verify in Play mode**

  Press Play → open Console → confirm no errors. Stop Play.

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/Game/GameManager.cs Assets/Scenes/
  git commit -m "feat: add GameManager with global state machine and scene loading"
  git push
  ```

---

## Task 5: PlayerController

**Files:**
- Create: `Assets/Scripts/Game/PlayerController.cs`

- [ ] **Step 1: Write PlayerController**

  ```csharp
  // Assets/Scripts/Game/PlayerController.cs
  using System;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class PlayerController : MonoBehaviour
      {
          public static PlayerController Instance { get; private set; }

          [SerializeField] private int maxHealth = 5;
          [SerializeField] private int maxContinues = 3;

          public int Health { get; private set; }
          public int Continues { get; private set; }

          public event Action<int> OnHealthChanged;   // arg: new health value
          public event Action OnDeath;                 // health hit 0, continue available
          public event Action OnGameOver;              // continues exhausted

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
          }

          public void Initialize()
          {
              Health = maxHealth;
              Continues = maxContinues;
              OnHealthChanged?.Invoke(Health);
          }

          public void TakeDamage(int amount = 1)
          {
              if (Health <= 0) return;
              Health = Mathf.Max(0, Health - amount);
              OnHealthChanged?.Invoke(Health);

              if (Health > 0) return;

              if (Continues > 0)
                  OnDeath?.Invoke();
              else
                  OnGameOver?.Invoke();
          }

          // Returns false if no continues left
          public bool UseContinue()
          {
              if (Continues <= 0) return false;
              Continues--;
              Health = maxHealth;
              OnHealthChanged?.Invoke(Health);
              return true;
          }
      }
  }
  ```

- [ ] **Step 2: Add to Stage1 scene**

  Open `Stage1.unity` → Create Empty → `PlayerController` → Add Component → `PlayerController`.

- [ ] **Step 3: Manual test via Console**

  Add temporary Start() to call `Initialize()` and print Health. Play → confirm Health = 5 in Console. Remove temp code.

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/Game/PlayerController.cs Assets/Scenes/Stage1.unity
  git commit -m "feat: add PlayerController with health and continue system"
  git push
  ```

---

## Task 6: WeaponSystem

**Files:**
- Create: `Assets/Scripts/Game/WeaponSystem.cs`

- [ ] **Step 1: Write WeaponSystem**

  ```csharp
  // Assets/Scripts/Game/WeaponSystem.cs
  using System;
  using System.Collections;
  using System.Collections.Generic;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public enum WeaponType { Pistol, MachineGun, Shotgun }

      [Serializable]
      public class WeaponData
      {
          public WeaponType type;
          public int maxAmmo;
          public float fireRate;   // min seconds between shots
          public int pellets;      // raycast count (shotgun = 5)
          public float spreadAngle; // degrees for shotgun pellets
      }

      public class WeaponSystem : MonoBehaviour
      {
          public static WeaponSystem Instance { get; private set; }

          public static readonly Dictionary<WeaponType, WeaponData> Stats = new()
          {
              [WeaponType.Pistol]     = new WeaponData { type = WeaponType.Pistol,     maxAmmo = 10, fireRate = 0.30f, pellets = 1, spreadAngle = 0f   },
              [WeaponType.MachineGun] = new WeaponData { type = WeaponType.MachineGun, maxAmmo = 30, fireRate = 0.08f, pellets = 1, spreadAngle = 0f   },
              [WeaponType.Shotgun]    = new WeaponData { type = WeaponType.Shotgun,    maxAmmo =  6, fireRate = 0.60f, pellets = 5, spreadAngle = 4f   },
          };

          private const float ReloadDuration = 1.2f;

          public WeaponType CurrentWeapon { get; private set; } = WeaponType.Pistol;
          public int CurrentAmmo { get; private set; }
          public bool IsReloading { get; private set; }

          public event Action<WeaponType, int> OnWeaponChanged;
          public event Action<int>             OnAmmoChanged;
          public event Action                  OnReloadStart;
          public event Action                  OnReloadEnd;

          private float lastFireTime = -999f;

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
          }

          public void Initialize()
          {
              CurrentWeapon = WeaponType.Pistol;
              CurrentAmmo   = Stats[WeaponType.Pistol].maxAmmo;
              IsReloading   = false;
              OnWeaponChanged?.Invoke(CurrentWeapon, CurrentAmmo);
          }

          // Returns true if a shot was fired (caller should raycast)
          public bool TryFire()
          {
              if (IsReloading) return false;
              if (CurrentAmmo <= 0) { StartReload(); return false; }

              var data = Stats[CurrentWeapon];
              if (Time.time - lastFireTime < data.fireRate) return false;

              lastFireTime = Time.time;
              CurrentAmmo--;
              OnAmmoChanged?.Invoke(CurrentAmmo);

              if (CurrentAmmo <= 0 && CurrentWeapon != WeaponType.Pistol)
                  SwitchToPistol();

              return true;
          }

          public void StartReload()
          {
              if (IsReloading) return;
              IsReloading = true;
              OnReloadStart?.Invoke();
              StartCoroutine(ReloadCoroutine());
          }

          private IEnumerator ReloadCoroutine()
          {
              yield return new WaitForSeconds(ReloadDuration);
              CurrentAmmo = Stats[CurrentWeapon].maxAmmo;
              IsReloading = false;
              OnReloadEnd?.Invoke();
              OnAmmoChanged?.Invoke(CurrentAmmo);
          }

          public void PickUpWeapon(WeaponType type)
          {
              if (type == WeaponType.Pistol) return;
              StopAllCoroutines();
              IsReloading   = false;
              CurrentWeapon = type;
              CurrentAmmo   = Stats[type].maxAmmo;
              OnWeaponChanged?.Invoke(CurrentWeapon, CurrentAmmo);
          }

          private void SwitchToPistol()
          {
              CurrentWeapon = WeaponType.Pistol;
              CurrentAmmo   = Stats[WeaponType.Pistol].maxAmmo;
              OnWeaponChanged?.Invoke(CurrentWeapon, CurrentAmmo);
          }
      }
  }
  ```

- [ ] **Step 2: Write WeaponData EditMode tests**

  ```csharp
  // Assets/Tests/EditMode/WeaponDataTests.cs
  using NUnit.Framework;
  using VirtuaCop2;

  namespace VirtuaCop2.Tests
  {
      public class WeaponDataTests
      {
          [Test]
          public void Pistol_Has10Ammo()
          {
              Assert.AreEqual(10, WeaponSystem.Stats[WeaponType.Pistol].maxAmmo);
          }

          [Test]
          public void MachineGun_Has30Ammo()
          {
              Assert.AreEqual(30, WeaponSystem.Stats[WeaponType.MachineGun].maxAmmo);
          }

          [Test]
          public void Shotgun_Has5Pellets()
          {
              Assert.AreEqual(5, WeaponSystem.Stats[WeaponType.Shotgun].pellets);
          }

          [Test]
          public void MachineGun_FireRateFasterThanPistol()
          {
              Assert.Less(
                  WeaponSystem.Stats[WeaponType.MachineGun].fireRate,
                  WeaponSystem.Stats[WeaponType.Pistol].fireRate
              );
          }
      }
  }
  ```

- [ ] **Step 3: Run tests**

  Window → Test Runner → EditMode → Run All.  
  Expected: WeaponDataTests — 4 tests pass.

- [ ] **Step 4: Add WeaponSystem to Stage1 scene**

  Stage1.unity → Create Empty → `WeaponSystem` → Add Component → `WeaponSystem`.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/Game/WeaponSystem.cs Assets/Tests/EditMode/WeaponDataTests.cs
  git commit -m "feat: add WeaponSystem with three weapon types and ammo logic"
  git push
  ```

---

## Task 7: ScoringSystem

**Files:**
- Create: `Assets/Scripts/Game/ScoringCalculator.cs`
- Create: `Assets/Scripts/Game/ScoringSystem.cs`
- Create: `Assets/Tests/EditMode/ScoringCalculatorTests.cs`

- [ ] **Step 1: Write ScoringCalculator (pure C# — testable)**

  ```csharp
  // Assets/Scripts/Game/ScoringCalculator.cs
  using System.Collections.Generic;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public enum KillType { Body, HeadShot, Disarm }

      public static class ScoringCalculator
      {
          public static readonly Dictionary<KillType, int> BasePoints = new()
          {
              [KillType.Body]    = 100,
              [KillType.HeadShot]= 300,
              [KillType.Disarm]  = 500,
          };

          public const float SpeedBonusWindow      = 1f;
          public const float SpeedBonusMultiplier  = 2f;
          public const int   ComboThreshold        = 5;
          public const int   ComboBonus            = 1000;

          public static int CalculateKillScore(KillType killType, float timeAfterEmerge)
          {
              int   baseScore  = BasePoints[killType];
              float multiplier = (timeAfterEmerge <= SpeedBonusWindow)
                  ? SpeedBonusMultiplier : 1f;
              return Mathf.RoundToInt(baseScore * multiplier);
          }

          public static int CalculateStageClearBonus(int remainingHealth, float remainingSeconds)
          {
              return remainingHealth * 1000 + Mathf.RoundToInt(remainingSeconds * 10f);
          }

          public static int CalculateComboBonus(int comboCount)
          {
              return (comboCount > 0 && comboCount % ComboThreshold == 0) ? ComboBonus : 0;
          }
      }
  }
  ```

- [ ] **Step 2: Write ScoringSystem MonoBehaviour**

  ```csharp
  // Assets/Scripts/Game/ScoringSystem.cs
  using System;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class ScoringSystem : MonoBehaviour
      {
          public static ScoringSystem Instance { get; private set; }

          public int TotalScore  { get; private set; }
          public int ComboCount  { get; private set; }
          public int HiScore     { get; private set; }

          public event Action<int> OnScoreChanged;

          private const string HiScoreKey = "HiScore";

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
          }

          public void Initialize()
          {
              TotalScore = 0;
              ComboCount = 0;
              HiScore    = PlayerPrefs.GetInt(HiScoreKey, 0);
              OnScoreChanged?.Invoke(TotalScore);
          }

          public void AddKill(KillType killType, float timeAfterEmerge)
          {
              ComboCount++;
              int points = ScoringCalculator.CalculateKillScore(killType, timeAfterEmerge)
                         + ScoringCalculator.CalculateComboBonus(ComboCount);
              AddScore(points);
          }

          public void ResetCombo() => ComboCount = 0;

          public void AddStageClearBonus(int remainingHealth, float remainingSeconds)
          {
              AddScore(ScoringCalculator.CalculateStageClearBonus(remainingHealth, remainingSeconds));
          }

          private void AddScore(int points)
          {
              TotalScore += points;
              if (TotalScore > HiScore)
              {
                  HiScore = TotalScore;
                  PlayerPrefs.SetInt(HiScoreKey, HiScore);
              }
              OnScoreChanged?.Invoke(TotalScore);
          }

          public void Reset()
          {
              TotalScore = 0;
              ComboCount = 0;
          }
      }
  }
  ```

- [ ] **Step 3: Write ScoringCalculator tests**

  ```csharp
  // Assets/Tests/EditMode/ScoringCalculatorTests.cs
  using NUnit.Framework;
  using VirtuaCop2;

  namespace VirtuaCop2.Tests
  {
      public class ScoringCalculatorTests
      {
          [Test]
          public void BodyKill_Returns100()
          {
              int score = ScoringCalculator.CalculateKillScore(KillType.Body, 5f);
              Assert.AreEqual(100, score);
          }

          [Test]
          public void HeadShot_Returns300()
          {
              int score = ScoringCalculator.CalculateKillScore(KillType.HeadShot, 5f);
              Assert.AreEqual(300, score);
          }

          [Test]
          public void Disarm_Returns500()
          {
              int score = ScoringCalculator.CalculateKillScore(KillType.Disarm, 5f);
              Assert.AreEqual(500, score);
          }

          [Test]
          public void SpeedBonus_Within1s_DoublesScore()
          {
              int score = ScoringCalculator.CalculateKillScore(KillType.Body, 0.5f);
              Assert.AreEqual(200, score);
          }

          [Test]
          public void SpeedBonus_Exactly1s_DoublesScore()
          {
              int score = ScoringCalculator.CalculateKillScore(KillType.Body, 1f);
              Assert.AreEqual(200, score);
          }

          [Test]
          public void SpeedBonus_After1s_NoBonus()
          {
              int score = ScoringCalculator.CalculateKillScore(KillType.Body, 1.1f);
              Assert.AreEqual(100, score);
          }

          [Test]
          public void StageClearBonus_FullHealth_MaxTime()
          {
              int bonus = ScoringCalculator.CalculateStageClearBonus(5, 180f);
              Assert.AreEqual(5000 + 1800, bonus);  // 5*1000 + 180*10
          }

          [Test]
          public void StageClearBonus_ZeroHealth_ZeroTime()
          {
              int bonus = ScoringCalculator.CalculateStageClearBonus(0, 0f);
              Assert.AreEqual(0, bonus);
          }

          [Test]
          public void ComboBonus_Every5Kills_Adds1000()
          {
              Assert.AreEqual(1000, ScoringCalculator.CalculateComboBonus(5));
              Assert.AreEqual(1000, ScoringCalculator.CalculateComboBonus(10));
          }

          [Test]
          public void ComboBonus_NonMultipleOf5_Returns0()
          {
              Assert.AreEqual(0, ScoringCalculator.CalculateComboBonus(3));
              Assert.AreEqual(0, ScoringCalculator.CalculateComboBonus(7));
          }
      }
  }
  ```

- [ ] **Step 4: Run tests**

  Window → Test Runner → EditMode → Run All.  
  Expected: 10 scoring tests + 4 weapon tests = 14 pass.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/Game/ScoringCalculator.cs Assets/Scripts/Game/ScoringSystem.cs Assets/Tests/EditMode/ScoringCalculatorTests.cs
  git commit -m "feat: add ScoringSystem with speed bonus, combo, and stage clear bonus"
  git push
  ```

---

## Task 8: EnemyController

**Files:**
- Create: `Assets/Scripts/Game/EnemyController.cs`

- [ ] **Step 1: Write EnemyController state machine**

  ```csharp
  // Assets/Scripts/Game/EnemyController.cs
  using System;
  using System.Collections;
  using System.Collections.Generic;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public enum EnemyState { Hidden, Emerging, Aiming, Firing, Dead }
      public enum EnemyType  { Grunt, Gunman, Heavy, Fast }
      public enum HitZone    { Body, Head, Weapon }

      [Serializable]
      public class EnemyTypeConfig
      {
          public EnemyType type;
          public float     aimingDuration;
          public int       health;
          public bool      hasWeapon;
          public bool      bodyArmorHead;   // Heavy: only head/leg effective
      }

      public class EnemyController : MonoBehaviour
      {
          public static readonly Dictionary<EnemyType, EnemyTypeConfig> TypeConfig = new()
          {
              [EnemyType.Grunt]  = new EnemyTypeConfig { type = EnemyType.Grunt,  aimingDuration = 2.5f, health = 1, hasWeapon = false, bodyArmorHead = false },
              [EnemyType.Gunman] = new EnemyTypeConfig { type = EnemyType.Gunman, aimingDuration = 2.0f, health = 1, hasWeapon = true,  bodyArmorHead = false },
              [EnemyType.Heavy]  = new EnemyTypeConfig { type = EnemyType.Heavy,  aimingDuration = 3.0f, health = 3, hasWeapon = false, bodyArmorHead = true  },
              [EnemyType.Fast]   = new EnemyTypeConfig { type = EnemyType.Fast,   aimingDuration = 1.2f, health = 1, hasWeapon = false, bodyArmorHead = false },
          };

          [SerializeField] private EnemyType  enemyType = EnemyType.Grunt;
          [SerializeField] private float      emergeDuration = 0.5f;
          [SerializeField] private GameObject weaponPickupPrefab;
          [SerializeField] private Transform  weaponHoldPoint;

          public EnemyState State      { get; private set; } = EnemyState.Hidden;
          public EnemyType  Type       => enemyType;
          public float      EmergeTime { get; private set; }

          private int       currentHealth;
          private Coroutine activeCoroutine;

          public event Action<EnemyController> OnDied;

          void Awake() => currentHealth = TypeConfig[enemyType].health;

          public void Emerge()
          {
              if (State != EnemyState.Hidden) return;
              activeCoroutine = StartCoroutine(EmergeSequence());
          }

          private IEnumerator EmergeSequence()
          {
              SetState(EnemyState.Emerging);
              yield return new WaitForSeconds(emergeDuration);

              EmergeTime = Time.time;
              SetState(EnemyState.Aiming);

              float aimDuration = TypeConfig[enemyType].aimingDuration;
              yield return new WaitForSeconds(aimDuration);

              // Fire at player
              SetState(EnemyState.Firing);
              PlayerController.Instance?.TakeDamage(1);
              yield return new WaitForSeconds(0.3f);

              // Cycle: Aim again
              SetState(EnemyState.Aiming);
              activeCoroutine = StartCoroutine(LoopAimFire());
          }

          private IEnumerator LoopAimFire()
          {
              while (State != EnemyState.Dead)
              {
                  yield return new WaitForSeconds(TypeConfig[enemyType].aimingDuration);
                  if (State == EnemyState.Dead) yield break;
                  SetState(EnemyState.Firing);
                  PlayerController.Instance?.TakeDamage(1);
                  yield return new WaitForSeconds(0.3f);
                  if (State != EnemyState.Dead) SetState(EnemyState.Aiming);
              }
          }

          public void OnHit(HitZone zone)
          {
              if (State == EnemyState.Dead || State == EnemyState.Hidden) return;

              var cfg = TypeConfig[enemyType];

              switch (zone)
              {
                  case HitZone.Head:
                      Kill(KillType.HeadShot);
                      break;

                  case HitZone.Weapon:
                      if (cfg.hasWeapon)
                          Disarm();
                      else
                          ApplyBodyDamage(cfg);
                      break;

                  case HitZone.Body:
                      if (!cfg.bodyArmorHead)     // Heavy armor blocks body shots
                          ApplyBodyDamage(cfg);
                      break;
              }
          }

          private void ApplyBodyDamage(EnemyTypeConfig cfg)
          {
              currentHealth--;
              if (currentHealth <= 0) Kill(KillType.Body);
          }

          private void Disarm()
          {
              if (weaponPickupPrefab != null && weaponHoldPoint != null)
                  Instantiate(weaponPickupPrefab, weaponHoldPoint.position, Quaternion.identity);
              Kill(KillType.Disarm);
          }

          private void Kill(KillType killType)
          {
              if (activeCoroutine != null) StopCoroutine(activeCoroutine);
              SetState(EnemyState.Dead);

              float timeAfterEmerge = Time.time - EmergeTime;
              ScoringSystem.Instance?.AddKill(killType, timeAfterEmerge);
              OnDied?.Invoke(this);

              StartCoroutine(DieSequence());
          }

          private IEnumerator DieSequence()
          {
              yield return new WaitForSeconds(2f);
              gameObject.SetActive(false);
          }

          private void SetState(EnemyState newState) => State = newState;
      }
  }
  ```

- [ ] **Step 2: Create Enemy prefabs (Manual in Unity)**

  Assets → Prefabs → Enemies → Create empty prefab → `Enemy_Grunt.prefab`.  
  Add EnemyController component → set EnemyType = Grunt.  
  Add 3 child GameObjects as Colliders:
  - `HeadHitBox` → Box Collider → Layer: `EnemyHead`
  - `WeaponHitBox` → Box Collider → Layer: `EnemyWeapon` (only for Gunman)
  - `BodyHitBox` → Box Collider → Layer: `EnemyBody`

  Repeat for `Enemy_Gunman`, `Enemy_HeavyArmor`, `Enemy_Fast` with correct EnemyType.

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Game/EnemyController.cs Assets/Prefabs/
  git commit -m "feat: add EnemyController FSM with hit zones and armor logic"
  git push
  ```

---

## Task 9: InnocentController

**Files:**
- Create: `Assets/Scripts/Game/InnocentController.cs`

- [ ] **Step 1: Write InnocentController**

  ```csharp
  // Assets/Scripts/Game/InnocentController.cs
  using System.Collections;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class InnocentController : MonoBehaviour
      {
          [SerializeField] private float visibleDuration = 3f;

          public bool IsAlive { get; private set; } = true;

          // Called by EnemySpawner via Timeline Signal
          public void Emerge()
          {
              IsAlive = true;
              gameObject.SetActive(true);
              StartCoroutine(AppearSequence());
          }

          private IEnumerator AppearSequence()
          {
              // Brief emerge animation time
              yield return new WaitForSeconds(0.5f);
              // Visible window
              yield return new WaitForSeconds(visibleDuration);
              Flee();
          }

          private void Flee()
          {
              IsAlive = false;
              gameObject.SetActive(false);
          }

          // Called by InputManager on raycast hit (Layer: Innocent)
          public void OnShot()
          {
              if (!IsAlive) return;
              IsAlive = false;
              StopAllCoroutines();
              PlayerController.Instance?.TakeDamage(1);
              HUDManager.Instance?.TriggerInnocentFlash();
              ScoringSystem.Instance?.ResetCombo();
              gameObject.SetActive(false);
          }
      }
  }
  ```

- [ ] **Step 2: Create Innocent prefab**

  Assets → Prefabs → Create → `Innocent_Civilian.prefab`.  
  Add InnocentController. Add Collider → Layer: `Innocent`.

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Game/InnocentController.cs Assets/Prefabs/Innocent_Civilian.prefab
  git commit -m "feat: add InnocentController with damage penalty on shot"
  git push
  ```

---

## Task 10: EnemySpawner & Object Pool

**Files:**
- Create: `Assets/Scripts/Game/EnemySpawner.cs`

- [ ] **Step 1: Write EnemySpawner**

  ```csharp
  // Assets/Scripts/Game/EnemySpawner.cs
  using System;
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.Playables;

  namespace VirtuaCop2
  {
      // Attach to a GameObject in stage scene.
      // Timeline Signal Receivers call SpawnEnemy() / SpawnInnocent() by name.
      public class EnemySpawner : MonoBehaviour
      {
          public static EnemySpawner Instance { get; private set; }

          [SerializeField] private GameObject[] enemyPrefabs;     // index = EnemyType int
          [SerializeField] private GameObject   innocentPrefab;

          // Pool
          private readonly Dictionary<EnemyType, Queue<EnemyController>> pool = new();
          private readonly List<EnemyController>  activeEnemies    = new();
          private readonly List<InnocentController> activeInnocents = new();

          private int aliveCount = 0;

          public event Action OnWaveCleared;   // StageDirector listens to this

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;

              foreach (EnemyType t in Enum.GetValues(typeof(EnemyType)))
                  pool[t] = new Queue<EnemyController>();
          }

          // Called by Timeline Signal Receiver
          public void SpawnEnemy(string enemyTypeName, Transform spawnPoint)
          {
              if (!Enum.TryParse(enemyTypeName, out EnemyType type)) return;
              var enemy = GetFromPool(type, spawnPoint);
              activeEnemies.Add(enemy);
              aliveCount++;
              enemy.OnDied += OnEnemyDied;
              enemy.Emerge();
          }

          // Called by Timeline Signal Receiver
          public void SpawnInnocent(Transform spawnPoint)
          {
              var go      = Instantiate(innocentPrefab, spawnPoint.position, spawnPoint.rotation);
              var innocent = go.GetComponent<InnocentController>();
              activeInnocents.Add(innocent);
              innocent.Emerge();
          }

          private void OnEnemyDied(EnemyController enemy)
          {
              enemy.OnDied -= OnEnemyDied;
              activeEnemies.Remove(enemy);
              ReturnToPool(enemy);
              aliveCount = Mathf.Max(0, aliveCount - 1);

              if (aliveCount == 0)
                  OnWaveCleared?.Invoke();
          }

          private EnemyController GetFromPool(EnemyType type, Transform spawnPoint)
          {
              if (pool[type].Count > 0)
              {
                  var pooled = pool[type].Dequeue();
                  pooled.transform.SetPositionAndRotation(spawnPoint.position, spawnPoint.rotation);
                  pooled.gameObject.SetActive(true);
                  return pooled;
              }

              int    prefabIndex = (int)type;
              var    go          = Instantiate(enemyPrefabs[prefabIndex], spawnPoint.position, spawnPoint.rotation);
              return go.GetComponent<EnemyController>();
          }

          private void ReturnToPool(EnemyController enemy)
          {
              pool[enemy.Type].Enqueue(enemy);
          }

          public void ClearAllActiveEnemies()
          {
              foreach (var e in activeEnemies)
              {
                  e.OnDied -= OnEnemyDied;
                  e.gameObject.SetActive(false);
                  ReturnToPool(e);
              }
              activeEnemies.Clear();
              aliveCount = 0;
          }
      }
  }
  ```

- [ ] **Step 2: Create Timeline Signal Asset for enemy spawning**

  In Unity: Assets → Timeline → right-click → Create → Signal → `SpawnEnemySignal`.  
  (Signals are scriptable objects; the Signal Receiver on the EnemySpawner GameObject calls `SpawnEnemy(...)` when the signal fires on the Timeline.)

- [ ] **Step 3: Add EnemySpawner to Stage1 scene**

  Stage1.unity → Create Empty → `EnemySpawner` → Add Component → `EnemySpawner` → assign prefab array.

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/Game/EnemySpawner.cs Assets/Timeline/
  git commit -m "feat: add EnemySpawner with object pool and wave-cleared event"
  git push
  ```

---

## Task 11: InputManager

**Files:**
- Create: `Assets/Scripts/Game/InputManager.cs`

- [ ] **Step 1: Write InputManager**

  ```csharp
  // Assets/Scripts/Game/InputManager.cs
  using UnityEngine;

  namespace VirtuaCop2
  {
      [RequireComponent(typeof(Camera))]
      public class InputManager : MonoBehaviour
      {
          public static InputManager Instance { get; private set; }

          private Camera mainCam;

          // LayerMask constants (match Project Settings layers)
          private static readonly int LayerEnemyBody   = LayerMask.NameToLayer("EnemyBody");
          private static readonly int LayerEnemyHead   = LayerMask.NameToLayer("EnemyHead");
          private static readonly int LayerEnemyWeapon = LayerMask.NameToLayer("EnemyWeapon");
          private static readonly int LayerInnocent    = LayerMask.NameToLayer("Innocent");
          private static readonly int LayerWeaponPickup= LayerMask.NameToLayer("WeaponPickup");
          private static readonly int LayerBossWeak    = LayerMask.NameToLayer("BossWeakPoint");

          private static readonly LayerMask ShootableMask = (1 << LayerMask.NameToLayer("EnemyBody"))
              | (1 << LayerMask.NameToLayer("EnemyHead"))
              | (1 << LayerMask.NameToLayer("EnemyWeapon"))
              | (1 << LayerMask.NameToLayer("Innocent"))
              | (1 << LayerMask.NameToLayer("WeaponPickup"))
              | (1 << LayerMask.NameToLayer("BossWeakPoint"));

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
              mainCam  = GetComponent<Camera>();
          }

          void Update()
          {
              HandleReloadInput();

              if (Input.GetMouseButtonDown(0))
                  HandleFire();
          }

          private void HandleReloadInput()
          {
              if (Input.GetKeyDown(KeyCode.R))
              {
                  WeaponSystem.Instance?.StartReload();
                  return;
              }

              // Off-screen reload: mouse outside canvas bounds
              Vector3 mp = Input.mousePosition;
              bool offScreen = mp.x < 0 || mp.x > Screen.width || mp.y < 0 || mp.y > Screen.height;
              if (offScreen && Input.GetMouseButton(0))
                  WeaponSystem.Instance?.StartReload();
          }

          private void HandleFire()
          {
              if (WeaponSystem.Instance == null) return;

              var data = WeaponSystem.Instance.Stats[WeaponSystem.Instance.CurrentWeapon];

              for (int i = 0; i < data.pellets; i++)
              {
                  Vector3 screenPos = Input.mousePosition;

                  // Shotgun spread: offset each pellet ray
                  if (data.pellets > 1)
                  {
                      float spread = data.spreadAngle;
                      screenPos += new Vector3(
                          Random.Range(-spread, spread) * Screen.width  / 100f,
                          Random.Range(-spread, spread) * Screen.height / 100f,
                          0f);
                  }

                  Ray ray = mainCam.ScreenPointToRay(screenPos);

                  if (!Physics.Raycast(ray, out RaycastHit hit, 100f, ShootableMask))
                      continue;

                  int hitLayer = hit.collider.gameObject.layer;

                  if (hitLayer == LayerEnemyBody)
                      hit.collider.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Body);
                  else if (hitLayer == LayerEnemyHead)
                      hit.collider.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Head);
                  else if (hitLayer == LayerEnemyWeapon)
                      hit.collider.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Weapon);
                  else if (hitLayer == LayerInnocent)
                      hit.collider.GetComponent<InnocentController>()?.OnShot();
                  else if (hitLayer == LayerWeaponPickup)
                      hit.collider.GetComponent<WeaponPickup>()?.OnShot();
                  else if (hitLayer == LayerBossWeak)
                      hit.collider.GetComponentInParent<BossController>()?.OnWeakPointHit();
              }

              WeaponSystem.Instance.TryFire();
          }
      }
  }
  ```

- [ ] **Step 2: Create WeaponPickup script**

  ```csharp
  // Assets/Scripts/Game/WeaponPickup.cs
  using System.Collections;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class WeaponPickup : MonoBehaviour
      {
          [SerializeField] private WeaponType weaponType = WeaponType.MachineGun;
          [SerializeField] private float      lifeTime   = 2f;

          void Start() => StartCoroutine(AutoDestroy());

          private IEnumerator AutoDestroy()
          {
              yield return new WaitForSeconds(lifeTime);
              Destroy(gameObject);
          }

          public void OnShot()
          {
              WeaponSystem.Instance?.PickUpWeapon(weaponType);
              Destroy(gameObject);
          }
      }
  }
  ```

- [ ] **Step 3: Add InputManager to camera in Stage1**

  Stage1.unity → Main Camera → Add Component → `InputManager`.

- [ ] **Step 4: Manual play test**

  Play Stage1 → click in scene → confirm Console logs no null-ref errors. Stop Play.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/Game/InputManager.cs Assets/Scripts/Game/WeaponPickup.cs
  git commit -m "feat: add InputManager with raycast, hit zone routing, and reload detection"
  git push
  ```

---

## Task 12: RailController

**Files:**
- Create: `Assets/Scripts/Game/RailController.cs`

- [ ] **Step 1: Write RailController**

  ```csharp
  // Assets/Scripts/Game/RailController.cs
  using UnityEngine;
  using Cinemachine;

  namespace VirtuaCop2
  {
      // Attach to the GameObject that has CinemachineSmoothPath or
      // CinemachineTrackedDolly. Controls camera advance speed.
      [RequireComponent(typeof(CinemachineVirtualCamera))]
      public class RailController : MonoBehaviour
      {
          public static RailController Instance { get; private set; }

          [SerializeField] private float railSpeed = 0.05f;   // dolly position units/sec

          private CinemachineTrackedDolly dolly;
          private bool isPaused = false;

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
              var vcam = GetComponent<CinemachineVirtualCamera>();
              dolly    = vcam.GetCinemachineComponent<CinemachineTrackedDolly>();
          }

          void Update()
          {
              if (!isPaused && dolly != null)
                  dolly.m_PathPosition = Mathf.Min(dolly.m_PathPosition + railSpeed * Time.deltaTime, 1f);
          }

          public void Pause()  => isPaused = true;
          public void Resume() => isPaused = false;
          public void SetSpeed(float speed) => railSpeed = speed;
      }
  }
  ```

- [ ] **Step 2: Set up Cinemachine in Stage1 (Manual)**

  Stage1.unity:
  1. GameObject → Cinemachine → Dolly Camera with Track.
  2. Select the generated `CM vcam1` → Add Component → `RailController`.
  3. Select `CinemachineSmoothPath` (or `CinemachinePath`) → draw the rail path through the stage geometry.
  4. On CM vcam1 → Body → Tracked Dolly → Path = the path object above.

- [ ] **Step 3: Play test**

  Press Play → camera should move along the path. Adjust `railSpeed` in Inspector. Stop Play.

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/Game/RailController.cs Assets/Scenes/Stage1.unity
  git commit -m "feat: add RailController wrapping Cinemachine Dolly for rail movement"
  git push
  ```

---

## Task 13: StageDirector

**Files:**
- Create: `Assets/Scripts/Game/StageDirector.cs`

- [ ] **Step 1: Write StageDirector**

  ```csharp
  // Assets/Scripts/Game/StageDirector.cs
  using System;
  using UnityEngine;
  using UnityEngine.Playables;

  namespace VirtuaCop2
  {
      public class StageDirector : MonoBehaviour
      {
          public static StageDirector Instance { get; private set; }

          [SerializeField] private PlayableDirector mainTimeline;
          [SerializeField] private PlayableDirector routeATimeline;
          [SerializeField] private PlayableDirector routeBTimeline;
          [SerializeField] private int              stageIndex = 1;     // 1-3
          [SerializeField] private float            branchThreshold = 30f; // seconds

          private float   clearPointStartTime;
          private bool    inClearPoint = false;

          public event Action OnStageComplete;

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
          }

          void Start()
          {
              EnemySpawner.Instance.OnWaveCleared += HandleWaveCleared;
              PlayerController.Instance.Initialize();
              WeaponSystem.Instance.Initialize();
              ScoringSystem.Instance.Initialize();
              mainTimeline.Play();
          }

          // Called by Timeline Signal (via Signal Receiver on this GameObject)
          public void OnClearPointReached()
          {
              inClearPoint       = true;
              clearPointStartTime = Time.time;
              mainTimeline.Pause();
              RailController.Instance.Pause();
              // EnemySpawner will fire OnWaveCleared when aliveCount hits 0
          }

          private void HandleWaveCleared()
          {
              if (!inClearPoint) return;
              inClearPoint = false;

              float elapsed = Time.time - clearPointStartTime;
              bool  fastClear = elapsed < branchThreshold;

              RailController.Instance.Resume();

              if (routeATimeline != null && routeBTimeline != null)
              {
                  mainTimeline.Stop();
                  PlayableDirector chosen = fastClear ? routeATimeline : routeBTimeline;
                  chosen.Play();
                  // Hook the route timeline to return to main after it finishes
                  chosen.stopped += OnRouteTimelineFinished;
              }
              else
              {
                  mainTimeline.Resume();
              }
          }

          private void OnRouteTimelineFinished(PlayableDirector director)
          {
              director.stopped -= OnRouteTimelineFinished;
              mainTimeline.Play();
          }

          // Called by Timeline Signal at end of stage
          public void OnStageEnd()
          {
              float remaining = GameManager.Instance.GetRemainingStageTime(stageIndex);
              ScoringSystem.Instance.AddStageClearBonus(PlayerController.Instance.Health, remaining);
              OnStageComplete?.Invoke();
              GameManager.Instance.SetState(GameState.StageClear);
          }
      }
  }
  ```

- [ ] **Step 2: Connect in Stage1 scene (Manual)**

  Stage1.unity → Create Empty → `StageDirector` → Add Component → `StageDirector`.  
  Drag references: `mainTimeline`, `routeATimeline`, `routeBTimeline` (create these Timeline assets if not yet done).  
  Set `stageIndex = 1`, `branchThreshold = 30`.

  On the same `StageDirector` GameObject, add a **Signal Receiver** component:
  - Signal: `ClearPointSignal` → Reaction: call `StageDirector.OnClearPointReached()`
  - Signal: `StageEndSignal` → Reaction: call `StageDirector.OnStageEnd()`

- [ ] **Step 3: Play test**

  Press Play → Timeline advances → pause at clear point when ClearPointSignal fires → resume when no enemies remain. Stop Play.

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/Game/StageDirector.cs Assets/Scenes/Stage1.unity
  git commit -m "feat: add StageDirector with clear-point detection and timeline branching"
  git push
  ```

---

## Task 14: BossController

**Files:**
- Create: `Assets/Scripts/Game/BossController.cs`

- [ ] **Step 1: Write BossController**

  ```csharp
  // Assets/Scripts/Game/BossController.cs
  using System;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class BossController : MonoBehaviour
      {
          [SerializeField] private int   maxHealth        = 20;
          [SerializeField] private float phase2Threshold  = 0.5f;  // 50% HP
          [SerializeField] private float phase3Threshold  = 0.3f;  // 30% HP
          [SerializeField] private int   weakPointHitsToInterrupt = 3; // Stage 3 boss only

          public int  CurrentHealth { get; private set; }
          public int  CurrentPhase  { get; private set; } = 1;

          public event Action<int> OnPhaseChanged;    // arg: new phase (2 or 3)
          public event Action      OnDefeated;

          private int weakPointHitCount = 0;

          void Awake() => CurrentHealth = maxHealth;

          public void TakeDamage(int amount = 1)
          {
              if (CurrentHealth <= 0) return;
              CurrentHealth -= amount;

              ScoringSystem.Instance?.AddKill(KillType.Body, 0f);

              if (CurrentHealth <= 0) { Defeated(); return; }

              float ratio = (float)CurrentHealth / maxHealth;

              if (CurrentPhase == 1 && ratio <= phase2Threshold)
                  TransitionToPhase(2);
              else if (CurrentPhase == 2 && ratio <= phase3Threshold)
                  TransitionToPhase(3);
          }

          // Called by InputManager for BossWeakPoint layer hits
          public void OnWeakPointHit()
          {
              TakeDamage(1);
              weakPointHitCount++;

              if (CurrentPhase == 3 && weakPointHitCount >= weakPointHitsToInterrupt)
              {
                  weakPointHitCount = 0;
                  // Interrupt boss charge: trigger animation via event
                  OnPhaseChanged?.Invoke(-1);   // -1 = interrupt signal
              }
          }

          private void TransitionToPhase(int phase)
          {
              CurrentPhase = phase;
              OnPhaseChanged?.Invoke(phase);
          }

          private void Defeated()
          {
              CurrentPhase = 0;
              OnDefeated?.Invoke();
          }
      }
  }
  ```

- [ ] **Step 2: Create Boss prefabs (Manual)**

  For each stage, create a Boss prefab with:
  - `BossController` component
  - Multiple child Colliders on Layer `BossWeakPoint`
  - Animator for phase-transition animations
  - Listen to `OnPhaseChanged` to swap animation state

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Game/BossController.cs Assets/Prefabs/Enemies/
  git commit -m "feat: add BossController with multi-phase health and weak-point system"
  git push
  ```

---

## Task 15: HUDManager

**Files:**
- Create: `Assets/Scripts/UI/HUDManager.cs`

- [ ] **Step 1: Write HUDManager**

  ```csharp
  // Assets/Scripts/UI/HUDManager.cs
  using System.Collections;
  using TMPro;
  using UnityEngine;
  using UnityEngine.UI;

  namespace VirtuaCop2
  {
      public class HUDManager : MonoBehaviour
      {
          public static HUDManager Instance { get; private set; }

          [Header("Crosshair")]
          [SerializeField] private RectTransform crosshair;

          [Header("Health")]
          [SerializeField] private Image[] healthSlots;      // 5 heart sprites
          [SerializeField] private Sprite  heartFull;
          [SerializeField] private Sprite  heartEmpty;

          [Header("Weapon & Ammo")]
          [SerializeField] private TextMeshProUGUI weaponLabel;
          [SerializeField] private TextMeshProUGUI ammoText;
          [SerializeField] private GameObject      reloadBar;   // parent object
          [SerializeField] private Image           reloadFill;  // fill image

          [Header("Score")]
          [SerializeField] private TextMeshProUGUI scoreText;
          [SerializeField] private TextMeshProUGUI hiScoreText;

          [Header("Continue")]
          [SerializeField] private TextMeshProUGUI continueText;

          [Header("Flash")]
          [SerializeField] private Image innocentFlashPanel;   // full-screen red, alpha 0 normally

          private void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
          }

          void Start()
          {
              PlayerController.Instance.OnHealthChanged += UpdateHealth;
              WeaponSystem.Instance.OnWeaponChanged      += (t, a) => { UpdateWeaponLabel(t); UpdateAmmo(a); };
              WeaponSystem.Instance.OnAmmoChanged        += UpdateAmmo;
              WeaponSystem.Instance.OnReloadStart        += ShowReloadBar;
              WeaponSystem.Instance.OnReloadEnd          += HideReloadBar;
              ScoringSystem.Instance.OnScoreChanged      += UpdateScore;

              HideReloadBar();
              innocentFlashPanel.color = new Color(1, 0, 0, 0);
          }

          void Update()
          {
              // Move crosshair to mouse position
              crosshair.position = Input.mousePosition;
          }

          public void UpdateHealth(int health)
          {
              for (int i = 0; i < healthSlots.Length; i++)
                  healthSlots[i].sprite = (i < health) ? heartFull : heartEmpty;
          }

          public void UpdateWeaponLabel(WeaponType type)
          {
              weaponLabel.text = type switch
              {
                  WeaponType.Pistol     => "PISTOL",
                  WeaponType.MachineGun => "M.GUN",
                  WeaponType.Shotgun    => "SHOTGUN",
                  _                     => "?"
              };
          }

          public void UpdateAmmo(int ammo) => ammoText.text = ammo.ToString("D2");

          public void UpdateScore(int score)
          {
              scoreText.text   = score.ToString("D6");
              hiScoreText.text = ScoringSystem.Instance.HiScore.ToString("D6");
          }

          private void ShowReloadBar()
          {
              reloadBar.SetActive(true);
              StartCoroutine(AnimateReloadBar());
          }

          private void HideReloadBar()
          {
              StopCoroutine(nameof(AnimateReloadBar));
              reloadBar.SetActive(false);
          }

          private IEnumerator AnimateReloadBar()
          {
              float elapsed = 0f;
              float duration = 1.2f;  // must match WeaponSystem.ReloadDuration
              while (elapsed < duration)
              {
                  elapsed += Time.deltaTime;
                  reloadFill.fillAmount = elapsed / duration;
                  yield return null;
              }
          }

          public void TriggerInnocentFlash()
          {
              StopCoroutine(nameof(InnocentFlash));
              StartCoroutine(InnocentFlash());
          }

          private IEnumerator InnocentFlash()
          {
              innocentFlashPanel.color = new Color(1, 0, 0, 0.4f);
              yield return new WaitForSeconds(0.2f);
              innocentFlashPanel.color = new Color(1, 0, 0, 0f);
          }
      }
  }
  ```

- [ ] **Step 2: Build HUD Canvas (Manual in Unity)**

  Stage1.unity → GameObject → UI → Canvas (Screen Space – Overlay).  
  Add HUDManager component to Canvas.  
  Create children:
  - `Crosshair` — Image (crosshair sprite) → assign to `crosshair` field
  - `HealthRow` — 5× Image (heart) → assign to `healthSlots[0-4]`
  - `WeaponLabel`, `AmmoText` — TextMeshPro
  - `ReloadBar` — Slider or Image (fill) with parent GameObject
  - `ScoreText`, `HiScoreText` — TextMeshPro
  - `ContinueText` — TextMeshPro
  - `InnocentFlashPanel` — full-screen Image, alpha 0, color red

  Assign all references in Inspector.

- [ ] **Step 3: Install TextMeshPro**

  Window → Package Manager → TextMeshPro → Install → Import TMP Essential Resources.

- [ ] **Step 4: Play test**

  Press Play → move mouse → crosshair follows. Stop Play.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/UI/HUDManager.cs Assets/Scenes/Stage1.unity
  git commit -m "feat: add HUDManager with crosshair, health bar, ammo display, and reload bar"
  git push
  ```

---

## Task 16: ScreenManager

**Files:**
- Create: `Assets/Scripts/UI/ScreenManager.cs`
- Create: `Assets/Scripts/UI/ContinueScreen.cs`
- Create: `Assets/Scripts/UI/RankingScreen.cs`

- [ ] **Step 1: Write ScreenManager**

  ```csharp
  // Assets/Scripts/UI/ScreenManager.cs
  using System.Collections.Generic;
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class ScreenManager : MonoBehaviour
      {
          public static ScreenManager Instance { get; private set; }

          [SerializeField] private GameObject mainMenuScreen;
          [SerializeField] private GameObject hudScreen;
          [SerializeField] private GameObject stageClearScreen;
          [SerializeField] private GameObject continueScreen;
          [SerializeField] private GameObject gameOverScreen;
          [SerializeField] private GameObject rankingScreen;
          [SerializeField] private GameObject endingScreen;

          private Dictionary<GameState, GameObject> screenMap;

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;

              screenMap = new()
              {
                  [GameState.MainMenu]   = mainMenuScreen,
                  [GameState.Playing]    = hudScreen,
                  [GameState.ClearPoint] = hudScreen,
                  [GameState.StageClear] = stageClearScreen,
                  [GameState.Continue]   = continueScreen,
                  [GameState.GameOver]   = gameOverScreen,
                  [GameState.Ranking]    = rankingScreen,
                  [GameState.Ending]     = endingScreen,
              };
          }

          void Start()
          {
              GameManager.Instance.OnStateChanged += ShowScreenForState;
              ShowScreenForState(GameManager.Instance.State);

              PlayerController.Instance.OnDeath    += () => GameManager.Instance.SetState(GameState.Continue);
              PlayerController.Instance.OnGameOver += () => GameManager.Instance.SetState(GameState.GameOver);
          }

          private void ShowScreenForState(GameState state)
          {
              foreach (var kv in screenMap)
                  kv.Value?.SetActive(kv.Key == state);
          }
      }
  }
  ```

- [ ] **Step 2: Write ContinueScreen**

  ```csharp
  // Assets/Scripts/UI/ContinueScreen.cs
  using System.Collections;
  using TMPro;
  using UnityEngine;
  using UnityEngine.UI;

  namespace VirtuaCop2
  {
      public class ContinueScreen : MonoBehaviour
      {
          [SerializeField] private TextMeshProUGUI countdownText;
          [SerializeField] private Button          yesButton;
          [SerializeField] private Button          noButton;

          private const float CountdownDuration = 10f;

          void OnEnable()
          {
              yesButton.onClick.AddListener(OnYes);
              noButton.onClick.AddListener(OnNo);
              StartCoroutine(Countdown());
          }

          void OnDisable()
          {
              yesButton.onClick.RemoveListener(OnYes);
              noButton.onClick.RemoveListener(OnNo);
              StopAllCoroutines();
          }

          private IEnumerator Countdown()
          {
              float remaining = CountdownDuration;
              while (remaining > 0f)
              {
                  countdownText.text = Mathf.CeilToInt(remaining).ToString();
                  yield return new WaitForSeconds(0.1f);
                  remaining -= 0.1f;
              }
              // Auto-select No when countdown hits 0
              OnNo();
          }

          private void OnYes()
          {
              bool ok = PlayerController.Instance.UseContinue();
              if (!ok) { OnNo(); return; }
              GameManager.Instance.SetState(GameState.Playing);
          }

          private void OnNo()
          {
              GameManager.Instance.SetState(GameState.GameOver);
          }
      }
  }
  ```

- [ ] **Step 3: Write RankingScreen**

  ```csharp
  // Assets/Scripts/UI/RankingScreen.cs
  using TMPro;
  using UnityEngine;
  using UnityEngine.UI;

  namespace VirtuaCop2
  {
      public class RankingScreen : MonoBehaviour
      {
          [SerializeField] private TextMeshProUGUI[] rankEntries;  // 5 entries: "1. AAA  123456"
          [SerializeField] private TMP_InputField    nameInput;    // max 3 chars
          [SerializeField] private Button            confirmButton;

          private const string PrefKeyPrefix = "Rank_";
          private const int    MaxEntries    = 5;

          void OnEnable()
          {
              nameInput.characterLimit = 3;
              nameInput.text           = "AAA";
              confirmButton.onClick.AddListener(SaveScore);
              RefreshDisplay();
          }

          void OnDisable() => confirmButton.onClick.RemoveListener(SaveScore);

          private void SaveScore()
          {
              string name  = nameInput.text.ToUpper().PadRight(3, '_')[..3];
              int    score = ScoringSystem.Instance.TotalScore;

              // Load existing, insert, sort, save top 5
              var entries = LoadEntries();
              entries.Add((name, score));
              entries.Sort((a, b) => b.score.CompareTo(a.score));
              if (entries.Count > MaxEntries) entries.RemoveRange(MaxEntries, entries.Count - MaxEntries);

              for (int i = 0; i < entries.Count; i++)
              {
                  PlayerPrefs.SetString($"{PrefKeyPrefix}{i}_name",  entries[i].name);
                  PlayerPrefs.SetInt   ($"{PrefKeyPrefix}{i}_score", entries[i].score);
              }
              PlayerPrefs.Save();

              RefreshDisplay();
              GameManager.Instance.LoadMainMenu();
          }

          private System.Collections.Generic.List<(string name, int score)> LoadEntries()
          {
              var list = new System.Collections.Generic.List<(string, int)>();
              for (int i = 0; i < MaxEntries; i++)
              {
                  if (!PlayerPrefs.HasKey($"{PrefKeyPrefix}{i}_name")) break;
                  list.Add((
                      PlayerPrefs.GetString($"{PrefKeyPrefix}{i}_name"),
                      PlayerPrefs.GetInt   ($"{PrefKeyPrefix}{i}_score")
                  ));
              }
              return list;
          }

          private void RefreshDisplay()
          {
              var entries = LoadEntries();
              for (int i = 0; i < rankEntries.Length; i++)
              {
                  if (i < entries.Count)
                      rankEntries[i].text = $"{i + 1}. {entries[i].name}  {entries[i].score:D6}";
                  else
                      rankEntries[i].text = $"{i + 1}. ---  000000";
              }
          }
      }
  }
  ```

- [ ] **Step 4: Build UI screens in MainMenu scene (Manual)**

  MainMenu.unity → Canvas (Screen Space – Overlay):
  - `MainMenuScreen` — "PRESS START" button → `GameManager.Instance.StartStage(1)`
  - `StageClearScreen` — "STAGE CLEAR" text, auto-advance after 3s
  - `ContinueScreen` — countdown label, YES/NO buttons → add `ContinueScreen` component
  - `GameOverScreen` — "GAME OVER" text, "RANKING" button
  - `RankingScreen` — 5× rank entry labels, name input, confirm button → add `RankingScreen`
  - `EndingScreen` — congratulations text, "BACK TO TITLE" button

  Add `ScreenManager` component → assign all screen references.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/UI/
  git commit -m "feat: add ScreenManager, ContinueScreen (10s countdown), and RankingScreen with PlayerPrefs"
  git push
  ```

---

## Task 17: Stage 1 — Scene, Timeline & Content

**Files:** `Assets/Scenes/Stage1.unity`, `Assets/Timeline/Stage1_*.playable`

- [ ] **Step 1: Build stage geometry (Manual — placeholder)**

  Stage1.unity: Use Unity ProBuilder or primitive cubes to build placeholder geometry for:
  - Section 1: Street with walls, parked cars (spawn cover for 10 enemies)
  - Section 2A: Underground parking (dark, columns as cover)
  - Section 2B: Market street (wider, merchant stalls)
  - Section 3: Building entrance plaza

  All geometry uses low-poly materials with flat colours.

- [ ] **Step 2: Define Spawn Points (Manual)**

  Create empty GameObjects named `SpawnPoint_Enemy_01` through `_10` at cover positions.  
  Create `SpawnPoint_Innocent_01`, `_02`.

- [ ] **Step 3: Create Stage1_Main Timeline (Manual)**

  Assets → Timeline → right-click → Timeline → `Stage1_Main`.  
  Open Timeline window → tracks:

  | Track | Content |
  |-------|---------|
  | Cinemachine Track | bind to CM vcam1; animate dolly position |
  | Signal Track | at t=3s: `SpawnEnemySignal` (x6 enemies, Section 1 wave 1) |
  | Signal Track | at t=6s: `SpawnEnemySignal` (x4 enemies, Section 1 wave 2) |
  | Signal Track | at t=8s: `SpawnInnocentSignal` (x2 innocents) |
  | Signal Track | at t=10s: `ClearPointSignal` (pause, wait for clear) |
  | Signal Track | at t=END: `StageEndSignal` |
  | Activation Track | Environment objects (open doors, etc.) |

  Repeat structure for `Stage1_RouteA`, `Stage1_RouteB` (12 enemies each, different spawn points).

- [ ] **Step 4: Configure Signal Receivers (Manual)**

  On the `EnemySpawner` GameObject → Add Component → `Signal Receiver`:
  - SpawnEnemySignal → `EnemySpawner.SpawnEnemy("Grunt", spawnPoint)`
  - SpawnInnocentSignal → `EnemySpawner.SpawnInnocent(spawnPoint)`

  On the `StageDirector` GameObject → Signal Receiver:
  - ClearPointSignal → `StageDirector.OnClearPointReached()`
  - StageEndSignal → `StageDirector.OnStageEnd()`

- [ ] **Step 5: Create Stage 1 Boss encounter (Manual)**

  `Stage1_Boss.playable`:
  - Spawn `Enemy_Boss_1` (Heavy armor) at arena center
  - Signal at 50% HP threshold → phase 2 animation clip
  - StageEndSignal fires after Boss OnDefeated event

- [ ] **Step 6: Full play test**

  Press Play → walk through entire Stage 1:
  - [ ] Camera advances along rail
  - [ ] Timeline pauses at clear point
  - [ ] Enemies emerge and fire
  - [ ] Rail resumes after all enemies killed
  - [ ] Correct branch chosen based on clear speed
  - [ ] Boss spawns, phase 2 triggers at 50% HP
  - [ ] Stage Clear screen appears after boss defeated

- [ ] **Step 7: Commit**

  ```bash
  git add Assets/Scenes/Stage1.unity Assets/Timeline/Stage1_*.playable
  git commit -m "feat: Stage 1 — street scene with Timeline waves, branching, and heavy armor boss"
  git push
  ```

---

## Task 18: Stage 2 — Building Interior

**Files:** `Assets/Scenes/Stage2.unity`, `Assets/Timeline/Stage2_*.playable`

- [ ] **Step 1: Build geometry (Manual)**

  Stage2.unity: Placeholder geometry for:
  - Lobby (columns, reception desk)
  - Corridors (doorways as enemy spawn covers)
  - Section 2A: Scaffolding (vertical platforms; enemies appear above)
  - Section 2B: Open-plan office (cubicle walls)
  - Rooftop approach

- [ ] **Step 2: Spawn points & Timeline (Manual)**

  12 spawn points for Section 1 (3 innocents), 15 for Section 2A/B, 10 for Section 3.

  `Stage2_Main.playable` structure mirrors Stage 1 with `branchThreshold` = 30s.

- [ ] **Step 3: Stage 2 Boss — Fast Swordsman (Manual)**

  `Enemy_Boss_2` prefab:
  - BossController: `maxHealth = 15`, `phase2Threshold = 0.4f`
  - Animator: idle, sprint-left, sprint-right, slash, throw-knife
  - Phase 1: sprint left/right, stop to aim → `aimingDuration = 1.0f`
  - Phase 2: `OnPhaseChanged(2)` → enable Animator state "ThrowKnife"; throw knife collider fires `PlayerController.TakeDamage(1)` if not shot within 0.5s
  - WeakPoint: entire body (fast enemy, no armor)

- [ ] **Step 4: Full play test**

  Press Play → run Stage 2 end-to-end. Verify branching and boss phases. Stop Play.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scenes/Stage2.unity Assets/Timeline/Stage2_*.playable
  git commit -m "feat: Stage 2 — building interior with scaffolding branch and swordsman boss"
  git push
  ```

---

## Task 19: Stage 3 — Harbor, Final Boss & Ending

**Files:** `Assets/Scenes/Stage3.unity`, `Assets/Timeline/Stage3_*.playable`

- [ ] **Step 1: Build geometry (Manual)**

  Stage3.unity: Harbor at night.
  - Section 1: Warehouse exterior + dock (12 enemies)
  - Section 2A: Ship deck (open; helicopter GameObject hovers at fixed position with 3 gunman children on Layer `EnemyWeapon`)
  - Section 2B: Engine room (explosive barrels as cover; barrel Rigidbody + `OnCollisionEnter` → `AoeExplosion` damages nearby enemies)
  - Section 3: Bridge corridor (8 enemies)

- [ ] **Step 2: Helicopter enemy (Manual)**

  Create `Helicopter` GameObject (static mesh, no movement):
  - 3 child `GunmanSlot` GameObjects with `EnemyController` (type=Gunman, hasWeapon=false, aimingDuration=2.5f)
  - Script `HelicopterBattle`: tracks how many gunmen defeated; when all 3 dead → fires `OnWaveCleared`

- [ ] **Step 3: Explosive barrel**

  ```csharp
  // Assets/Scripts/Game/ExplosiveBarrel.cs
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class ExplosiveBarrel : MonoBehaviour
      {
          [SerializeField] private float radius = 3f;
          [SerializeField] private int   damage = 1;

          // Called when shot (Layer: EnemyBody reused, or new layer)
          public void Explode()
          {
              Collider[] hits = Physics.OverlapSphere(transform.position, radius, LayerMask.GetMask("EnemyBody", "EnemyHead"));
              foreach (var c in hits)
                  c.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Body);

              Destroy(gameObject);
          }
      }
  }
  ```

- [ ] **Step 4: Final Boss — 3-Phase Crime Lord (Manual)**

  `Enemy_Boss_3` prefab:
  - `BossController`: `maxHealth = 30`, `phase2Threshold = 0.6f`, `phase3Threshold = 0.3f`, `weakPointHitsToInterrupt = 3`
  - Animator states: standoff, hide-behind-wall, throw-grenade, charge-sprint
  - Phase 1: Face player, aim-fire cycle (`aimingDuration = 2.0f`); occasionally step behind wall (Hidden state, re-emerges after 2s)
  - Phase 2: Spawn 2 `Enemy_Grunt` guards (EnemySpawner); throw grenade every 5s → grenade Collider on player position → `PlayerController.TakeDamage(1)` if not shot within 1s (grenade has `ExplosiveBarrel`-style AoE)
  - Phase 3: Charge sprint → BossWeakPoint (gun hand) → shoot 3× to interrupt → plays "boss defeated" anim → `OnDefeated?.Invoke()`

- [ ] **Step 5: Ending sequence**

  In `StageDirector` (Stage 3): after `OnStageEnd()`, set `GameState.Ending` instead of `StageClear`.  
  EndingScreen plays a cutscene (Timeline animation — heroes walk away).  
  After 5s → `GameState.Ranking`.

- [ ] **Step 6: Full play test — entire game**

  Start from MainMenu → Stage 1 → Stage 2 → Stage 3 → Ending → Ranking → back to MainMenu.
  - [ ] All 3 stages playable end-to-end
  - [ ] Scoring accumulates correctly across stages
  - [ ] Continue screen triggers on death
  - [ ] Game Over → Ranking → name entry → high score saved
  - [ ] High score persists after restarting Play mode

- [ ] **Step 7: Commit**

  ```bash
  git add Assets/Scenes/Stage3.unity Assets/Scripts/Game/ExplosiveBarrel.cs Assets/Timeline/Stage3_*.playable
  git commit -m "feat: Stage 3 — harbor, helicopter battle, explosive barrels, 3-phase final boss, ending"
  git push
  ```

---

## Task 20: Audio Integration

**Files:** `Assets/Audio/BGM/`, `Assets/Audio/SFX/`

- [ ] **Step 1: Import audio assets**

  Drop audio files into `Assets/Audio/BGM/` and `Assets/Audio/SFX/`.  
  Recommended formats: `.ogg` (best WebGL compression).

  | File | Usage |
  |------|-------|
  | `bgm_stage1.ogg` | Stage 1 loop |
  | `bgm_stage2.ogg` | Stage 2 loop |
  | `bgm_stage3.ogg` | Stage 3 loop |
  | `bgm_boss.ogg`   | Boss fight loop |
  | `sfx_gunshot_pistol.ogg` | Pistol fire |
  | `sfx_gunshot_machinegun.ogg` | MG fire |
  | `sfx_gunshot_shotgun.ogg` | Shotgun fire |
  | `sfx_reload.ogg` | Reload click |
  | `sfx_enemy_death.ogg` | Enemy die |
  | `sfx_player_hit.ogg` | Player takes damage |
  | `sfx_innocent_hit.ogg` | Innocent shot |

- [ ] **Step 2: Create AudioManager**

  ```csharp
  // Assets/Scripts/Game/AudioManager.cs
  using UnityEngine;

  namespace VirtuaCop2
  {
      public class AudioManager : MonoBehaviour
      {
          public static AudioManager Instance { get; private set; }

          [SerializeField] private AudioSource musicSource;
          [SerializeField] private AudioSource sfxSource;

          [Header("BGM")]
          [SerializeField] private AudioClip bgmStage1;
          [SerializeField] private AudioClip bgmStage2;
          [SerializeField] private AudioClip bgmStage3;
          [SerializeField] private AudioClip bgmBoss;

          [Header("SFX")]
          [SerializeField] private AudioClip sfxPistol;
          [SerializeField] private AudioClip sfxMachineGun;
          [SerializeField] private AudioClip sfxShotgun;
          [SerializeField] private AudioClip sfxReload;
          [SerializeField] private AudioClip sfxEnemyDeath;
          [SerializeField] private AudioClip sfxPlayerHit;
          [SerializeField] private AudioClip sfxInnocent;

          void Awake()
          {
              if (Instance != null) { Destroy(gameObject); return; }
              Instance = this;
              DontDestroyOnLoad(gameObject);
          }

          void Start()
          {
              WeaponSystem.Instance.OnAmmoChanged   += _ => PlaySFX(GetFireClip());
              WeaponSystem.Instance.OnReloadStart   += () => PlaySFX(sfxReload);
              PlayerController.Instance.OnHealthChanged += h => PlaySFX(sfxPlayerHit);
          }

          public void PlayBGM(int stageIndex)
          {
              AudioClip clip = stageIndex switch
              {
                  1 => bgmStage1,
                  2 => bgmStage2,
                  3 => bgmStage3,
                  _ => null
              };
              if (clip == null) return;
              musicSource.clip = clip;
              musicSource.loop = true;
              musicSource.Play();
          }

          public void PlayBossBGM()
          {
              musicSource.clip = bgmBoss;
              musicSource.loop = true;
              musicSource.Play();
          }

          public void PlaySFX(AudioClip clip)
          {
              if (clip != null) sfxSource.PlayOneShot(clip);
          }

          public void PlayEnemyDeath() => PlaySFX(sfxEnemyDeath);
          public void PlayInnocent()   => PlaySFX(sfxInnocent);

          private AudioClip GetFireClip() => WeaponSystem.Instance.CurrentWeapon switch
          {
              WeaponType.Pistol     => sfxPistol,
              WeaponType.MachineGun => sfxMachineGun,
              WeaponType.Shotgun    => sfxShotgun,
              _                     => null
          };
      }
  }
  ```

- [ ] **Step 3: Wire AudioManager into scenes**

  Add `AudioManager` GameObject (with 2 AudioSource components) to MainMenu scene (DontDestroyOnLoad).  
  Call `AudioManager.Instance.PlayBGM(1)` in `StageDirector.Start()` for each stage.  
  Call `PlayBossBGM()` in `BossController.OnPhaseChanged` handler.

- [ ] **Step 4: Play test audio**

  Press Play → confirm BGM plays, gunshot SFX fires on click, reload SFX triggers. Stop Play.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/Game/AudioManager.cs Assets/Audio/
  git commit -m "feat: add AudioManager with per-stage BGM and weapon/event SFX"
  git push
  ```

---

## Task 21: WebGL Build Verification & CI/CD Deploy

- [ ] **Step 1: Local WebGL build**

  Unity → File → Build Settings → WebGL → Build → select output folder `LocalBuild/`.  
  Expected: builds without errors in ~20–30 min.

- [ ] **Step 2: Verify in browser**

  Open `LocalBuild/index.html` in Chrome (requires local server):

  ```bash
  cd LocalBuild
  python -m http.server 8080
  ```

  Open `http://localhost:8080` → confirm game loads and plays in browser.

- [ ] **Step 3: Check file count**

  ```bash
  find LocalBuild -type f | wc -l
  ```

  Expected: under 15,000 files (Cloudflare Pages free limit: 20,000).

- [ ] **Step 4: Configure GitHub Actions secrets (if not done in Task 3)**

  Verify all 4 secrets exist: `UNITY_EMAIL`, `UNITY_PASSWORD`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

- [ ] **Step 5: Push to trigger CI/CD**

  ```bash
  git push origin main
  ```

- [ ] **Step 6: Monitor GitHub Actions**

  GitHub repo → Actions → watch the `Build and Deploy` workflow.  
  Expected stages:
  1. Activate Unity License (~1 min)
  2. Build WebGL (~25 min)
  3. Return Unity License
  4. Deploy to Cloudflare Pages (~1 min)

  Total: ~30 min. Should complete green.

- [ ] **Step 7: Verify Cloudflare Pages deployment**

  Cloudflare Dashboard → Pages → `virtua-cop-2` → deployment URL.  
  Open URL in browser → confirm game loads.

- [ ] **Step 8: Final commit**

  ```bash
  git add .
  git commit -m "feat: complete Virtua Cop 2 remake — all 3 stages, CI/CD verified on Cloudflare Pages"
  git push
  ```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 3 stages with A/B branching (Tasks 17–19)
- ✅ Rail system via Cinemachine + Timeline (Tasks 12–13)
- ✅ Mouse raycast + hit zones (Task 11)
- ✅ Pistol / MG / Shotgun + pickup (Tasks 6, 11)
- ✅ Enemy FSM (Grunt, Gunman, Heavy, Fast) (Task 8)
- ✅ Innocent bystanders with penalty (Task 9)
- ✅ Health 5 slots + 3 continues (Task 5)
- ✅ Scoring: body/head/disarm + speed bonus + combo (Task 7)
- ✅ Stage clear bonus with per-stage time limits (Task 7)
- ✅ Boss multi-phase (Stage 1 heavy, Stage 2 fast, Stage 3 3-phase) (Tasks 17–19)
- ✅ HUD: crosshair, health, ammo, score, hi-score, reload bar, innocent flash (Task 15)
- ✅ Continue screen 10s countdown (Task 16)
- ✅ Ranking screen + PlayerPrefs Top 5 (Task 16)
- ✅ GitHub Actions + game-ci + Cloudflare Pages (Tasks 3, 21)
- ✅ WebGL: Decompression Fallback ON, Gzip, WebGL 2.0 (Task 1)
- ✅ Audio (Task 20)
- ✅ Explosive barrels in Stage 3 (Task 19)
- ✅ Helicopter enemies in Stage 3 Route A (Task 19)
