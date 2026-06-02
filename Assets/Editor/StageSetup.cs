// Assets/Editor/StageSetup.cs
// Programmatically builds Stage1/Stage2/Stage3 scenes with full wiring:
// environment, dolly track, camera rig, game systems, wave config,
// HUD canvas children, signal receivers, timeline binding, audio refs.
//
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod StageSetup.CreateAllStages -quit -logFile <log>
using System.Collections.Generic;
using Cinemachine;
using UnityEditor;
using UnityEditor.Events;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.Playables;
using UnityEngine.SceneManagement;
using UnityEngine.Timeline;
using UnityEngine.UI;
using VirtuaCop2;

public static class StageSetup
{
    private const string ScenesDir   = "Assets/Scenes";
    private const string PrefabsRoot = "Assets/Prefabs";
    private const string EnemiesDir  = PrefabsRoot + "/Enemies";
    private const string WeaponsDir  = PrefabsRoot + "/Weapons";
    private const string EnvDir      = PrefabsRoot + "/Environment";
    private const string TimelineDir = "Assets/Timeline";
    private const string SignalsDir  = TimelineDir + "/Signals";
    private const string AudioRoot   = "Assets/Audio";
    private const string SfxDir      = AudioRoot + "/SFX";
    private const string BgmDir      = AudioRoot + "/BGM";

    private const int LayerEnemyBody = 8;
    private const int LayerInnocent  = 11;
    private const int LayerWeaponPickup = 12;
    private const int LayerBossWeak  = 13;

    // -------------------------------------------------------------------
    // Stage configuration
    // -------------------------------------------------------------------

    private class WaveEntryCfg
    {
        public bool      isInnocent;
        public EnemyType type;
        public Vector3   position;
    }

    private class WaveCfg
    {
        public string         id;
        public WaveEntryCfg[] entries;
    }

    private class StageCfg
    {
        public int                stageIndex;
        public string             scenePath;
        public string             timelinePath;
        public string             bossPrefabPath;
        public Vector3            bossArenaPos;
        public bool               includeHelicopter;
        public bool               includeBarrels;
        public Color              groundColor;
        public Vector3            groundCenter;
        public Vector3            groundScale;
        public CinemachineSmoothPath.Waypoint[] dollyWaypoints;
        public WaveCfg[]          waves;
    }

    // -------------------------------------------------------------------
    // Public batch-mode entry points
    // -------------------------------------------------------------------

    public static void CreateAllStages()
    {
        Debug.Log("[StageSetup] Creating all stages...");
        var s1 = BuildStage(BuildStage1Cfg());
        var s2 = BuildStage(BuildStage2Cfg());
        var s3 = BuildStage(BuildStage3Cfg());
        UpdateBuildSettings(s1, s2, s3);
        Debug.Log("[StageSetup] All stages saved.");
    }

    public static void CreateStage1() { BuildStage(BuildStage1Cfg()); UpdateBuildSettings(BuildStage1Cfg().scenePath); }
    public static void CreateStage2() { BuildStage(BuildStage2Cfg()); UpdateBuildSettings(BuildStage2Cfg().scenePath); }
    public static void CreateStage3() { BuildStage(BuildStage3Cfg()); UpdateBuildSettings(BuildStage3Cfg().scenePath); }

    private static void UpdateBuildSettings(params string[] paths)
    {
        var list = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
        foreach (var p in paths)
        {
            if (string.IsNullOrEmpty(p)) continue;
            bool exists = list.Exists(s => s.path == p);
            if (!exists) list.Add(new EditorBuildSettingsScene(p, true));
        }
        EditorBuildSettings.scenes = list.ToArray();
    }

    // -------------------------------------------------------------------
    // Stage configs
    // -------------------------------------------------------------------

    private static StageCfg BuildStage1Cfg() => new StageCfg
    {
        stageIndex     = 1,
        scenePath      = ScenesDir + "/Stage1.unity",
        timelinePath   = TimelineDir + "/Stage1_Main.playable",
        bossPrefabPath = EnemiesDir + "/Enemy_Boss_1.prefab",
        bossArenaPos   = new Vector3(15f, 0.5f, 65f),
        includeHelicopter = false,
        includeBarrels    = false,
        groundColor    = new Color(0.35f, 0.35f, 0.40f),
        groundCenter   = new Vector3(0f, 0f, 30f),
        groundScale    = new Vector3(20f, 1f, 20f),
        dollyWaypoints = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,  15f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 5f, 1.6f,  30f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(10f, 1.6f,  45f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(15f, 1.8f,  60f) },
        },
        waves = new[]
        {
            new WaveCfg
            {
                id = "wave1",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3( 3f, 1f,  8f) },
                    new WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3(-3f, 1f, 10f) },
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 4f, 1f, 14f) },
                },
            },
            new WaveCfg
            {
                id = "wave2",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3(-2f, 1f, 22f) },
                    new WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3( 5f, 1f, 26f) },
                    new WaveEntryCfg { isInnocent = true,       position = new Vector3( 0f, 1f, 24f) },
                },
            },
            new WaveCfg
            {
                id = "wave3",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 8f, 1f, 40f) },
                    new WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3(12f, 1f, 45f) },
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(10f, 1f, 50f) },
                },
            },
        },
    };

    private static StageCfg BuildStage2Cfg() => new StageCfg
    {
        stageIndex     = 2,
        scenePath      = ScenesDir + "/Stage2.unity",
        timelinePath   = TimelineDir + "/Stage2_Main.playable",
        bossPrefabPath = EnemiesDir + "/Enemy_Boss_2.prefab",
        bossArenaPos   = new Vector3(0f, 0.5f, 70f),
        includeHelicopter = false,
        includeBarrels    = false,
        groundColor    = new Color(0.25f, 0.22f, 0.20f),
        groundCenter   = new Vector3(0f, 0f, 30f),
        groundScale    = new Vector3(15f, 1f, 25f),
        dollyWaypoints = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 2f, 1.6f,  18f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(-2f, 1.6f,  35f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 2.0f,  55f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 2.0f,  68f) },
        },
        waves = new[]
        {
            new WaveCfg
            {
                id = "wave1",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 2f, 1f, 10f) },
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-3f, 1f, 14f) },
                    new WaveEntryCfg { isInnocent = true,       position = new Vector3( 0f, 1f, 12f) },
                },
            },
            new WaveCfg
            {
                id = "wave2",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3( 3f, 1f, 28f) },
                    new WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3(-3f, 1f, 32f) },
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 0f, 1f, 36f) },
                },
            },
            new WaveCfg
            {
                id = "wave3",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 4f, 1f, 50f) },
                    new WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3(-4f, 1f, 55f) },
                    new WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 0f, 1f, 60f) },
                },
            },
        },
    };

    private static StageCfg BuildStage3Cfg() => new StageCfg
    {
        stageIndex     = 3,
        scenePath      = ScenesDir + "/Stage3.unity",
        timelinePath   = TimelineDir + "/Stage3_Main.playable",
        bossPrefabPath = EnemiesDir + "/Enemy_Boss_3.prefab",
        bossArenaPos   = new Vector3(0f, 0.5f, 75f),
        includeHelicopter = true,
        includeBarrels    = true,
        groundColor    = new Color(0.18f, 0.20f, 0.28f),
        groundCenter   = new Vector3(0f, 0f, 35f),
        groundScale    = new Vector3(18f, 1f, 30f),
        dollyWaypoints = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,  18f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 3f, 1.6f,  35f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(-2f, 1.6f,  55f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.8f,  72f) },
        },
        waves = new[]
        {
            new WaveCfg
            {
                id = "wave1",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 2f, 1f, 12f) },
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-2f, 1f, 16f) },
                    new WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3( 4f, 1f, 20f) },
                },
            },
            new WaveCfg
            {
                id = "wave2",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3( 0f, 1f, 38f) },
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-3f, 1f, 42f) },
                },
            },
            new WaveCfg
            {
                id = "wave3",
                entries = new[]
                {
                    new WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 3f, 1f, 58f) },
                    new WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-3f, 1f, 62f) },
                },
            },
        },
    };

    // -------------------------------------------------------------------
    // Build pipeline
    // -------------------------------------------------------------------

    private static string BuildStage(StageCfg cfg)
    {
        Debug.Log($"[StageSetup] Building {cfg.scenePath}...");

        EnsureFolder(ScenesDir);

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        BuildEnvironment(cfg);
        var path = BuildDollyTrack(cfg);
        BuildCameraRig(path);

        var (gameSystems, spawner, director, audio) = BuildGameSystems(cfg);
        var hud = BuildHudCanvas();
        BuildSpawnPointsAndWireWaves(cfg, gameSystems, spawner);
        WirePrefabsToSpawner(spawner);
        WireBoss(cfg, gameSystems);
        if (cfg.includeHelicopter) BuildHelicopter(cfg);
        if (cfg.includeBarrels)    BuildExplosiveBarrels(cfg);
        BuildTimelineDirector(cfg, director, spawner);
        WireAudio(audio, cfg.stageIndex);

        // Lighting basics
        RenderSettings.ambientMode  = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.4f, 0.4f, 0.45f);
        RenderSettings.skybox       = null;

        EditorSceneManager.MarkSceneDirty(scene);
        EditorSceneManager.SaveScene(scene, cfg.scenePath);
        Debug.Log($"[StageSetup] {cfg.scenePath} saved.");
        return cfg.scenePath;
    }

    // -------------------------------------------------------------------
    // Environment
    // -------------------------------------------------------------------

    private static void BuildEnvironment(StageCfg cfg)
    {
        var lightGo = new GameObject("Directional Light");
        var light   = lightGo.AddComponent<Light>();
        light.type      = LightType.Directional;
        light.intensity = 1.1f;
        light.transform.SetPositionAndRotation(new Vector3(0f, 10f, 0f), Quaternion.Euler(50f, -30f, 0f));

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.position   = cfg.groundCenter;
        ground.transform.localScale = cfg.groundScale;
        var mat = MaterialFactory.GetOrCreate(cfg.groundColor);
        ground.GetComponent<Renderer>().sharedMaterial = mat;

        // Boss arena marker (visual cube)
        var arena = GameObject.CreatePrimitive(PrimitiveType.Cube);
        arena.name = "BossArenaMarker";
        arena.transform.position   = cfg.bossArenaPos + new Vector3(0f, -0.4f, 0f);
        arena.transform.localScale = new Vector3(8f, 0.2f, 8f);
        var arenaMat = MaterialFactory.GetOrCreate(new Color(0.55f, 0.20f, 0.20f));
        arena.GetComponent<Renderer>().sharedMaterial = arenaMat;
    }

    private static CinemachineSmoothPath BuildDollyTrack(StageCfg cfg)
    {
        var go   = new GameObject("DollyTrack");
        var path = go.AddComponent<CinemachineSmoothPath>();
        path.m_Waypoints = cfg.dollyWaypoints;
        path.m_Looped    = false;
        path.InvalidateDistanceCache();
        return path;
    }

    private static void BuildCameraRig(CinemachineSmoothPath path)
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        var cam = camGo.AddComponent<Camera>();
        cam.clearFlags      = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.05f, 0.05f, 0.08f);
        cam.nearClipPlane   = 0.1f;
        cam.farClipPlane    = 200f;
        camGo.AddComponent<AudioListener>();
        camGo.AddComponent<CinemachineBrain>();
        camGo.AddComponent<InputManager>();

        var vcamGo = new GameObject("CM vcam1");
        var vcam   = vcamGo.AddComponent<CinemachineVirtualCamera>();
        vcam.m_Lens.FieldOfView = 60f;
        var dolly  = vcam.AddCinemachineComponent<CinemachineTrackedDolly>();
        dolly.m_Path             = path;
        dolly.m_PathPosition     = 0f;
        dolly.m_AutoDolly.m_Enabled = false;
        vcamGo.AddComponent<RailController>();
    }

    // -------------------------------------------------------------------
    // Game systems (singletons in one GO)
    // -------------------------------------------------------------------

    private static (GameObject root, EnemySpawner spawner, StageDirector director, AudioManager audio)
        BuildGameSystems(StageCfg cfg)
    {
        var sys = new GameObject("GameSystems");

        sys.AddComponent<GameManager>();
        sys.AddComponent<PlayerController>();
        sys.AddComponent<WeaponSystem>();
        sys.AddComponent<ScoringSystem>();
        var spawner   = sys.AddComponent<EnemySpawner>();
        var director  = sys.AddComponent<StageDirector>();
        var audio     = sys.AddComponent<AudioManager>();

        var music = sys.AddComponent<AudioSource>();
        var sfx   = sys.AddComponent<AudioSource>();
        music.playOnAwake = false; music.loop = true;
        sfx.playOnAwake   = false; sfx.loop   = false;

        // Wire AudioManager source refs
        var aso = new SerializedObject(audio);
        aso.FindProperty("musicSource").objectReferenceValue = music;
        aso.FindProperty("sfxSource").objectReferenceValue   = sfx;
        aso.ApplyModifiedPropertiesWithoutUndo();

        // Wire StageDirector stageIndex
        var dso = new SerializedObject(director);
        dso.FindProperty("stageIndex").intValue       = cfg.stageIndex;
        dso.FindProperty("branchThreshold").floatValue = 30f;
        dso.ApplyModifiedPropertiesWithoutUndo();

        return (sys, spawner, director, audio);
    }

    // -------------------------------------------------------------------
    // Spawn points + wave config + signal receivers
    // -------------------------------------------------------------------

    private static void BuildSpawnPointsAndWireWaves(StageCfg cfg, GameObject gameSystems, EnemySpawner spawner)
    {
        var spRoot = new GameObject("SpawnPoints");

        // Create Transform per wave entry, group under spRoot
        var transformPerEntry = new Dictionary<(int wave, int entry), Transform>();
        for (int w = 0; w < cfg.waves.Length; w++)
        {
            var wave = cfg.waves[w];
            var waveGo = new GameObject(wave.id);
            waveGo.transform.SetParent(spRoot.transform, false);
            for (int e = 0; e < wave.entries.Length; e++)
            {
                var entry = wave.entries[e];
                var name  = entry.isInnocent
                    ? $"sp_{wave.id}_innocent_{e:D2}"
                    : $"sp_{wave.id}_{entry.type}_{e:D2}";
                var sp = new GameObject(name);
                sp.transform.SetParent(waveGo.transform, false);
                sp.transform.position = entry.position;
                transformPerEntry[(w, e)] = sp.transform;
            }
        }

        // Configure EnemySpawner.waves via SerializedObject
        var so = new SerializedObject(spawner);
        var wavesProp = so.FindProperty("waves");
        wavesProp.arraySize = cfg.waves.Length;
        for (int w = 0; w < cfg.waves.Length; w++)
        {
            var waveProp = wavesProp.GetArrayElementAtIndex(w);
            waveProp.FindPropertyRelative("id").stringValue = cfg.waves[w].id;
            var entriesProp = waveProp.FindPropertyRelative("entries");
            entriesProp.arraySize = cfg.waves[w].entries.Length;
            for (int e = 0; e < cfg.waves[w].entries.Length; e++)
            {
                var entryProp = entriesProp.GetArrayElementAtIndex(e);
                entryProp.FindPropertyRelative("isInnocent").boolValue       = cfg.waves[w].entries[e].isInnocent;
                entryProp.FindPropertyRelative("type").enumValueIndex        = (int)cfg.waves[w].entries[e].type;
                entryProp.FindPropertyRelative("spawnPoint").objectReferenceValue = transformPerEntry[(w, e)];
            }
        }
        so.ApplyModifiedPropertiesWithoutUndo();
    }

    // -------------------------------------------------------------------
    // Prefab wiring on EnemySpawner
    // -------------------------------------------------------------------

    private static void WirePrefabsToSpawner(EnemySpawner spawner)
    {
        var grunt   = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemiesDir}/Enemy_Grunt.prefab");
        var gunman  = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemiesDir}/Enemy_Gunman.prefab");
        var heavy   = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemiesDir}/Enemy_Heavy.prefab");
        var fast    = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemiesDir}/Enemy_Fast.prefab");
        var innocent= AssetDatabase.LoadAssetAtPath<GameObject>($"{PrefabsRoot}/Innocent_Civilian.prefab");

        var so = new SerializedObject(spawner);
        var arr = so.FindProperty("enemyPrefabs");
        arr.arraySize = 4;
        arr.GetArrayElementAtIndex((int)EnemyType.Grunt ).objectReferenceValue = grunt;
        arr.GetArrayElementAtIndex((int)EnemyType.Gunman).objectReferenceValue = gunman;
        arr.GetArrayElementAtIndex((int)EnemyType.Heavy ).objectReferenceValue = heavy;
        arr.GetArrayElementAtIndex((int)EnemyType.Fast  ).objectReferenceValue = fast;
        so.FindProperty("innocentPrefab").objectReferenceValue = innocent;
        so.ApplyModifiedPropertiesWithoutUndo();
    }

    // -------------------------------------------------------------------
    // Boss instance + link
    // -------------------------------------------------------------------

    private static void WireBoss(StageCfg cfg, GameObject gameSystems)
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(cfg.bossPrefabPath);
        if (prefab == null)
        {
            Debug.LogWarning($"[StageSetup] Boss prefab missing: {cfg.bossPrefabPath}");
            return;
        }
        var inst = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
        inst.transform.position = cfg.bossArenaPos;
        inst.name = $"Boss_Stage{cfg.stageIndex}";

        // Add StageBossLink → wires boss death to StageDirector.OnStageEnd
        var bossCtrl = inst.GetComponent<BossController>();
        var link = inst.AddComponent<StageBossLink>();
        var so = new SerializedObject(link);
        so.FindProperty("boss").objectReferenceValue = bossCtrl;
        so.ApplyModifiedPropertiesWithoutUndo();
    }

    private static void BuildHelicopter(StageCfg cfg)
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnemiesDir}/Helicopter.prefab");
        if (prefab == null) return;
        var inst = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
        inst.transform.position = new Vector3(0f, 0f, 50f);
    }

    private static void BuildExplosiveBarrels(StageCfg cfg)
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"{EnvDir}/ExplosiveBarrel.prefab");
        if (prefab == null) return;
        var positions = new[]
        {
            new Vector3( 3f, 0.4f, 28f),
            new Vector3(-3f, 0.4f, 32f),
            new Vector3( 2f, 0.4f, 40f),
        };
        var root = new GameObject("Barrels");
        foreach (var p in positions)
        {
            var inst = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            inst.transform.position = p;
            inst.transform.SetParent(root.transform, true);
        }
    }

    // -------------------------------------------------------------------
    // Timeline + PlayableDirector + SignalReceivers
    // -------------------------------------------------------------------

    private static void BuildTimelineDirector(StageCfg cfg, StageDirector director, EnemySpawner spawner)
    {
        var timeline = AssetDatabase.LoadAssetAtPath<TimelineAsset>(cfg.timelinePath);
        if (timeline == null)
        {
            Debug.LogWarning($"[StageSetup] Timeline missing: {cfg.timelinePath}");
            return;
        }

        var pdGo = new GameObject("StageTimeline");
        var pd   = pdGo.AddComponent<PlayableDirector>();
        pd.playableAsset = timeline;
        pd.playOnAwake   = false;
        pd.timeUpdateMode = DirectorUpdateMode.GameTime;

        // Bind PlayableDirector to StageDirector.mainTimeline
        var dso = new SerializedObject(director);
        dso.FindProperty("mainTimeline").objectReferenceValue   = pd;
        dso.FindProperty("routeATimeline").objectReferenceValue = null;
        dso.FindProperty("routeBTimeline").objectReferenceValue = null;
        dso.ApplyModifiedPropertiesWithoutUndo();

        // Signal Receiver: on EnemySpawner GO (== GameSystems) for SpawnWave
        AddSpawnerSignalReceiver(spawner);
        // Signal Receiver: on StageDirector GO (same GameSystems) for OnClearPointReached/OnStageEnd
        AddDirectorSignalReceiver(director);

        // SignalTrack broadcasts emitters to its track binding. With no binding,
        // Unity Timeline falls back to the PlayableDirector's own GameObject
        // (StageTimeline) — but our SignalReceiver lives on GameSystems, so the
        // emitters fire into the void. Explicitly bind the track to the receiver.
        var receiver = spawner.gameObject.GetComponent<SignalReceiver>();
        foreach (var track in timeline.GetOutputTracks())
        {
            if (track is UnityEngine.Timeline.SignalTrack)
                pd.SetGenericBinding(track, receiver);
        }
    }

    private static void AddSpawnerSignalReceiver(EnemySpawner spawner)
    {
        var receiver = spawner.gameObject.GetComponent<SignalReceiver>();
        if (receiver == null) receiver = spawner.gameObject.AddComponent<SignalReceiver>();

        AddStringReaction(receiver, "Wave1Signal", spawner, nameof(EnemySpawner.SpawnWave), "wave1");
        AddStringReaction(receiver, "Wave2Signal", spawner, nameof(EnemySpawner.SpawnWave), "wave2");
        AddStringReaction(receiver, "Wave3Signal", spawner, nameof(EnemySpawner.SpawnWave), "wave3");
    }

    private static void AddDirectorSignalReceiver(StageDirector director)
    {
        var receiver = director.gameObject.GetComponent<SignalReceiver>();
        if (receiver == null) receiver = director.gameObject.AddComponent<SignalReceiver>();

        AddNoArgReaction(receiver, "ClearPointSignal", director, nameof(StageDirector.OnClearPointReached));
        AddNoArgReaction(receiver, "StageEndSignal",   director, nameof(StageDirector.OnStageEnd));
    }

    private static void AddNoArgReaction(SignalReceiver receiver, string signalName, MonoBehaviour target, string methodName)
    {
        var signal = AssetDatabase.LoadAssetAtPath<SignalAsset>($"{SignalsDir}/{signalName}.signal");
        if (signal == null)
        {
            Debug.LogWarning($"[StageSetup] Signal asset missing: {signalName}");
            return;
        }
        var evt = new UnityEvent();
        var method = target.GetType().GetMethod(methodName);
        var action = (UnityAction)System.Delegate.CreateDelegate(typeof(UnityAction), target, method);
        UnityEventTools.AddPersistentListener(evt, action);
        receiver.AddReaction(signal, evt);
    }

    private static void AddStringReaction(SignalReceiver receiver, string signalName, MonoBehaviour target, string methodName, string argValue)
    {
        var signal = AssetDatabase.LoadAssetAtPath<SignalAsset>($"{SignalsDir}/{signalName}.signal");
        if (signal == null)
        {
            Debug.LogWarning($"[StageSetup] Signal asset missing: {signalName}");
            return;
        }
        var evt = new UnityEvent();
        var method = target.GetType().GetMethod(methodName, new[] { typeof(string) });
        var action = (UnityAction<string>)System.Delegate.CreateDelegate(typeof(UnityAction<string>), target, method);
        UnityEventTools.AddStringPersistentListener(evt, action, argValue);
        receiver.AddReaction(signal, evt);
    }

    // -------------------------------------------------------------------
    // HUD Canvas with full children, wired
    // -------------------------------------------------------------------

    private static GameObject BuildHudCanvas()
    {
        var canvasGo = new GameObject("HUD Canvas");
        var canvas   = canvasGo.AddComponent<Canvas>();
        canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 10;
        var scaler = canvasGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode             = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution     = new Vector2(1920f, 1080f);
        scaler.matchWidthOrHeight      = 0.5f;
        canvasGo.AddComponent<GraphicRaycaster>();
        var hud = canvasGo.AddComponent<HUDManager>();

        // Built-in resources
        var uiSprite = Resources.GetBuiltinResource<Sprite>("UI/Skin/UISprite.psd");
        var font     = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        if (font == null) font = Resources.GetBuiltinResource<Font>("Arial.ttf");

        // Crosshair
        var crosshair = MakeUI("Crosshair", canvasGo.transform);
        crosshair.GetComponent<RectTransform>().sizeDelta = new Vector2(48, 48);
        var crossImg = crosshair.AddComponent<Image>();
        crossImg.sprite = uiSprite;
        crossImg.color  = new Color(1f, 1f, 1f, 0.9f);
        crossImg.type   = Image.Type.Sliced;

        // Health row (5 hearts, bottom-left)
        var healthRow = MakeUI("HealthRow", canvasGo.transform);
        var hrt = healthRow.GetComponent<RectTransform>();
        hrt.anchorMin = new Vector2(0, 0);
        hrt.anchorMax = new Vector2(0, 0);
        hrt.pivot     = new Vector2(0, 0);
        hrt.anchoredPosition = new Vector2(40, 40);
        hrt.sizeDelta = new Vector2(360, 60);
        var hg = healthRow.AddComponent<HorizontalLayoutGroup>();
        hg.spacing = 8;
        hg.childForceExpandHeight = false;
        hg.childForceExpandWidth  = false;
        var slots = new Image[5];
        for (int i = 0; i < 5; i++)
        {
            var heart = MakeUI($"Heart_{i}", healthRow.transform);
            heart.GetComponent<RectTransform>().sizeDelta = new Vector2(60, 60);
            var img = heart.AddComponent<Image>();
            img.sprite = uiSprite;
            img.color  = new Color(0.95f, 0.25f, 0.25f);
            img.type   = Image.Type.Sliced;
            slots[i] = img;
        }

        // Weapon label (bottom-right area)
        var weaponLabel = MakeUI("WeaponLabel", canvasGo.transform);
        var wlrt = weaponLabel.GetComponent<RectTransform>();
        wlrt.anchorMin = new Vector2(1, 0);
        wlrt.anchorMax = new Vector2(1, 0);
        wlrt.pivot     = new Vector2(1, 0);
        wlrt.anchoredPosition = new Vector2(-200, 70);
        wlrt.sizeDelta = new Vector2(200, 50);
        var weaponText = weaponLabel.AddComponent<Text>();
        weaponText.font     = font;
        weaponText.fontSize = 36;
        weaponText.alignment = TextAnchor.MiddleRight;
        weaponText.color    = Color.white;
        weaponText.text     = "PISTOL";

        // Ammo text (right of weapon)
        var ammoGo = MakeUI("AmmoText", canvasGo.transform);
        var art = ammoGo.GetComponent<RectTransform>();
        art.anchorMin = new Vector2(1, 0);
        art.anchorMax = new Vector2(1, 0);
        art.pivot     = new Vector2(1, 0);
        art.anchoredPosition = new Vector2(-40, 70);
        art.sizeDelta = new Vector2(150, 50);
        var ammoText = ammoGo.AddComponent<Text>();
        ammoText.font     = font;
        ammoText.fontSize = 48;
        ammoText.fontStyle = FontStyle.Bold;
        ammoText.alignment = TextAnchor.MiddleRight;
        ammoText.color    = new Color(1f, 0.9f, 0.3f);
        ammoText.text     = "10";

        // Reload bar (centered, hidden by default)
        var reloadBar = MakeUI("ReloadBar", canvasGo.transform);
        var rbrt = reloadBar.GetComponent<RectTransform>();
        rbrt.anchorMin = new Vector2(0.5f, 0.5f);
        rbrt.anchorMax = new Vector2(0.5f, 0.5f);
        rbrt.pivot     = new Vector2(0.5f, 0.5f);
        rbrt.anchoredPosition = new Vector2(0, -80);
        rbrt.sizeDelta = new Vector2(300, 24);
        var bgImg = reloadBar.AddComponent<Image>();
        bgImg.sprite = uiSprite;
        bgImg.color  = new Color(0, 0, 0, 0.55f);
        bgImg.type   = Image.Type.Sliced;

        var reloadFillGo = MakeUI("ReloadFill", reloadBar.transform);
        var rfrt = reloadFillGo.GetComponent<RectTransform>();
        rfrt.anchorMin = new Vector2(0, 0);
        rfrt.anchorMax = new Vector2(1, 1);
        rfrt.offsetMin = new Vector2(2, 2);
        rfrt.offsetMax = new Vector2(-2, -2);
        var fillImg = reloadFillGo.AddComponent<Image>();
        fillImg.sprite = uiSprite;
        fillImg.color  = new Color(1f, 0.65f, 0.15f);
        fillImg.type   = Image.Type.Filled;
        fillImg.fillMethod = Image.FillMethod.Horizontal;
        fillImg.fillAmount = 0f;
        reloadBar.SetActive(false);

        // Score (top-left)
        var scoreGo = MakeUI("ScoreText", canvasGo.transform);
        var srt = scoreGo.GetComponent<RectTransform>();
        srt.anchorMin = new Vector2(0, 1);
        srt.anchorMax = new Vector2(0, 1);
        srt.pivot     = new Vector2(0, 1);
        srt.anchoredPosition = new Vector2(40, -30);
        srt.sizeDelta = new Vector2(400, 60);
        var scoreText = scoreGo.AddComponent<Text>();
        scoreText.font     = font;
        scoreText.fontSize = 36;
        scoreText.fontStyle = FontStyle.Bold;
        scoreText.color    = Color.white;
        scoreText.text     = "SCORE: 000000";
        scoreText.alignment = TextAnchor.UpperLeft;

        // Hi-Score (top-right)
        var hiScoreGo = MakeUI("HiScoreText", canvasGo.transform);
        var hrt2 = hiScoreGo.GetComponent<RectTransform>();
        hrt2.anchorMin = new Vector2(1, 1);
        hrt2.anchorMax = new Vector2(1, 1);
        hrt2.pivot     = new Vector2(1, 1);
        hrt2.anchoredPosition = new Vector2(-40, -30);
        hrt2.sizeDelta = new Vector2(400, 60);
        var hiText = hiScoreGo.AddComponent<Text>();
        hiText.font     = font;
        hiText.fontSize = 36;
        hiText.fontStyle = FontStyle.Bold;
        hiText.color    = new Color(1f, 0.9f, 0.3f);
        hiText.text     = "HI: 000000";
        hiText.alignment = TextAnchor.UpperRight;

        // Continue text (bottom-left below hearts)
        var contGo = MakeUI("ContinueText", canvasGo.transform);
        var crt = contGo.GetComponent<RectTransform>();
        crt.anchorMin = new Vector2(0, 0);
        crt.anchorMax = new Vector2(0, 0);
        crt.pivot     = new Vector2(0, 0);
        crt.anchoredPosition = new Vector2(40, 110);
        crt.sizeDelta = new Vector2(300, 40);
        var contText = contGo.AddComponent<Text>();
        contText.font     = font;
        contText.fontSize = 24;
        contText.color    = new Color(1f, 1f, 1f, 0.9f);
        contText.text     = "CONTINUE: 3";

        // Innocent flash panel (full-screen, alpha 0)
        var flashGo = MakeUI("InnocentFlashPanel", canvasGo.transform);
        var frt = flashGo.GetComponent<RectTransform>();
        frt.anchorMin = new Vector2(0, 0);
        frt.anchorMax = new Vector2(1, 1);
        frt.offsetMin = Vector2.zero;
        frt.offsetMax = Vector2.zero;
        var flashImg = flashGo.AddComponent<Image>();
        flashImg.color = new Color(1f, 0f, 0f, 0f);
        flashImg.raycastTarget = false;

        // Wire HUDManager SerializeFields
        var so = new SerializedObject(hud);
        so.FindProperty("crosshair").objectReferenceValue = crosshair.GetComponent<RectTransform>();

        var healthArr = so.FindProperty("healthSlots");
        healthArr.arraySize = 5;
        for (int i = 0; i < 5; i++)
            healthArr.GetArrayElementAtIndex(i).objectReferenceValue = slots[i];
        so.FindProperty("heartFull").objectReferenceValue  = uiSprite;
        so.FindProperty("heartEmpty").objectReferenceValue = uiSprite;

        so.FindProperty("weaponLabel").objectReferenceValue = weaponText;
        so.FindProperty("ammoText").objectReferenceValue    = ammoText;
        so.FindProperty("reloadBar").objectReferenceValue   = reloadBar;
        so.FindProperty("reloadFill").objectReferenceValue  = fillImg;

        so.FindProperty("scoreText").objectReferenceValue   = scoreText;
        so.FindProperty("hiScoreText").objectReferenceValue = hiText;
        so.FindProperty("continueText").objectReferenceValue = contText;
        so.FindProperty("innocentFlashPanel").objectReferenceValue = flashImg;
        so.ApplyModifiedPropertiesWithoutUndo();

        return canvasGo;
    }

    private static GameObject MakeUI(string name, Transform parent)
    {
        var go = new GameObject(name, typeof(RectTransform));
        go.transform.SetParent(parent, false);
        return go;
    }

    // -------------------------------------------------------------------
    // Audio wiring
    // -------------------------------------------------------------------

    private static void WireAudio(AudioManager audio, int stageIndex)
    {
        var so = new SerializedObject(audio);

        AudioClip Load(string path) => AssetDatabase.LoadAssetAtPath<AudioClip>(path);

        so.FindProperty("bgmStage1").objectReferenceValue = Load($"{BgmDir}/bgm_stage1.wav");
        so.FindProperty("bgmStage2").objectReferenceValue = Load($"{BgmDir}/bgm_stage2.wav");
        so.FindProperty("bgmStage3").objectReferenceValue = Load($"{BgmDir}/bgm_stage3.wav");
        so.FindProperty("bgmBoss").objectReferenceValue   = Load($"{BgmDir}/bgm_boss.wav");

        so.FindProperty("sfxPistol").objectReferenceValue     = Load($"{SfxDir}/sfx_pistol.wav");
        so.FindProperty("sfxMachineGun").objectReferenceValue = Load($"{SfxDir}/sfx_machinegun.wav");
        so.FindProperty("sfxShotgun").objectReferenceValue    = Load($"{SfxDir}/sfx_shotgun.wav");
        so.FindProperty("sfxReload").objectReferenceValue     = Load($"{SfxDir}/sfx_reload.wav");
        so.FindProperty("sfxEnemyDeath").objectReferenceValue = Load($"{SfxDir}/sfx_enemy_death.wav");
        so.FindProperty("sfxPlayerHit").objectReferenceValue  = Load($"{SfxDir}/sfx_player_hit.wav");
        so.FindProperty("sfxInnocent").objectReferenceValue   = Load($"{SfxDir}/sfx_innocent_hit.wav");

        so.ApplyModifiedPropertiesWithoutUndo();
    }

    // -------------------------------------------------------------------
    // Folder helper
    // -------------------------------------------------------------------

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;
        var parent = System.IO.Path.GetDirectoryName(path).Replace('\\', '/');
        var name   = System.IO.Path.GetFileName(path);
        if (!AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, name);
    }
}
