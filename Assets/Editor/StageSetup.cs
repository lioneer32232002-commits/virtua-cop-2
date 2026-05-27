// Assets/Editor/StageSetup.cs
// Programmatically build Stage1.unity. Run via:
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod StageSetup.CreateStage1 -quit
using System.Collections.Generic;
using Cinemachine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using VirtuaCop2;

public static class StageSetup
{
    private const string ScenesDir = "Assets/Scenes";
    private const string Stage1Path = ScenesDir + "/Stage1.unity";

    public static void CreateStage1()
    {
        Debug.Log("[StageSetup] Creating Stage1.unity...");

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        BuildEnvironment();
        var path = BuildDollyTrack();
        BuildCameraRig(path);
        BuildGameSystems();
        BuildHud();
        BuildPlaceholderEnemies();

        // Lighting basics so scene isn't pitch-black
        RenderSettings.ambientMode      = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight     = new Color(0.4f, 0.4f, 0.45f);
        RenderSettings.skybox           = null;

        // Save
        if (!AssetDatabase.IsValidFolder(ScenesDir))
            AssetDatabase.CreateFolder("Assets", "Scenes");
        EditorSceneManager.SaveScene(scene, Stage1Path);
        Debug.Log("[StageSetup] Stage1.unity saved at " + Stage1Path);

        // Register in build settings
        EditorBuildSettings.scenes = new[]
        {
            new EditorBuildSettingsScene(Stage1Path, true),
        };
        Debug.Log("[StageSetup] Build settings scenes updated.");
    }

    private static void BuildEnvironment()
    {
        var light = new GameObject("Directional Light").AddComponent<Light>();
        light.type            = LightType.Directional;
        light.intensity       = 1.1f;
        light.transform.SetPositionAndRotation(new Vector3(0, 10, 0), Quaternion.Euler(50f, -30f, 0f));

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.localScale = new Vector3(20, 1, 20);
        var groundMat = new Material(Shader.Find("Standard")) { color = new Color(0.35f, 0.35f, 0.4f) };
        ground.GetComponent<Renderer>().sharedMaterial = groundMat;
    }

    private static CinemachineSmoothPath BuildDollyTrack()
    {
        var go = new GameObject("DollyTrack");
        var path = go.AddComponent<CinemachineSmoothPath>();
        path.m_Waypoints = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,  15f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 5f, 1.6f,  30f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(10f, 1.6f,  45f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(15f, 1.8f,  60f) }, // boss arena
        };
        path.m_Looped     = false;
        path.InvalidateDistanceCache();
        return path;
    }

    private static void BuildCameraRig(CinemachineSmoothPath path)
    {
        // Main Camera: holds Cinemachine Brain + InputManager (RequireComponent(Camera))
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

        // Virtual Camera on dolly
        var vcamGo = new GameObject("CM vcam1");
        var vcam   = vcamGo.AddComponent<CinemachineVirtualCamera>();
        vcam.m_Lens.FieldOfView = 60f;
        var dolly  = vcam.AddCinemachineComponent<CinemachineTrackedDolly>();
        dolly.m_Path           = path;
        dolly.m_PathPosition   = 0f;
        dolly.m_AutoDolly.m_Enabled = false;
        vcamGo.AddComponent<RailController>();
    }

    private static void BuildGameSystems()
    {
        var sys = new GameObject("GameSystems");

        sys.AddComponent<GameManager>();
        sys.AddComponent<PlayerController>();
        sys.AddComponent<WeaponSystem>();
        sys.AddComponent<ScoringSystem>();
        sys.AddComponent<EnemySpawner>();
        sys.AddComponent<StageDirector>();

        var audio = sys.AddComponent<AudioManager>();
        var music = sys.AddComponent<AudioSource>();
        var sfx   = sys.AddComponent<AudioSource>();
        music.playOnAwake = false; music.loop = true;
        sfx.playOnAwake   = false; sfx.loop   = false;

        // Wire AudioManager's source refs via SerializedObject (private SerializeFields)
        var so = new SerializedObject(audio);
        so.FindProperty("musicSource").objectReferenceValue = music;
        so.FindProperty("sfxSource").objectReferenceValue   = sfx;
        so.ApplyModifiedPropertiesWithoutUndo();
    }

    private static void BuildHud()
    {
        var canvasGo = new GameObject("HUD Canvas");
        var canvas   = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 10;
        canvasGo.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasGo.AddComponent<GraphicRaycaster>();
        canvasGo.AddComponent<HUDManager>();
        // UI children (crosshair, hearts, score text, etc.) are placeholder — wire later.
    }

    private static void BuildPlaceholderEnemies()
    {
        int layerEnemyBody = LayerMask.NameToLayer("EnemyBody");
        var enemiesRoot = new GameObject("Enemies").transform;
        var positions = new[]
        {
            new Vector3( 3f, 0.5f,  8f),
            new Vector3(-3f, 0.5f, 12f),
            new Vector3( 4f, 0.5f, 22f),
            new Vector3(-2f, 0.5f, 28f),
            new Vector3( 6f, 0.5f, 38f),
        };
        for (int i = 0; i < positions.Length; i++)
        {
            var c = GameObject.CreatePrimitive(PrimitiveType.Cube);
            c.name = $"EnemyPlaceholder_{i}";
            c.transform.SetParent(enemiesRoot);
            c.transform.position = positions[i];
            if (layerEnemyBody >= 0) c.layer = layerEnemyBody;
            var mat = new Material(Shader.Find("Standard")) { color = new Color(0.7f, 0.2f, 0.2f) };
            c.GetComponent<Renderer>().sharedMaterial = mat;
        }
    }
}
