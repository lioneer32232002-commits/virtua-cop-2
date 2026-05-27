// Assets/Editor/Stages/Stage4Cfg.cs
using Cinemachine;
using UnityEngine;
using VirtuaCop2;

public static class Stage4Cfg
{
    public static StageBuildHelpers.StageCfg Build() => new StageBuildHelpers.StageCfg
    {
        stageIndex        = 4,
        scenePath         = StageBuildHelpers.ScenesDir + "/Stage4.unity",
        timelinePath      = StageBuildHelpers.TimelineDir + "/Stage4_Main.playable",
        bossPrefabPath    = StageBuildHelpers.EnemiesDir + "/Enemy_Boss_1.prefab", // PLACEHOLDER; replaced in Phase 8
        bossArenaPos      = new Vector3(0f, 0.5f, 78f),
        includeHelicopter = false,
        includeBarrels    = false, // explosive barrels added separately in Phase 5
        groundColor       = new Color(0.18f, 0.16f, 0.14f),
        groundCenter      = new Vector3(0f, 0f, 40f),
        groundScale       = new Vector3(22f, 1f, 40f),
        dollyWaypoints    = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,  12f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 2f, 1.7f,  22f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(-2f, 1.7f,  36f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.8f,  50f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.8f,  68f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.8f,  78f) },
        },
        waves = new[]
        {
            new StageBuildHelpers.WaveCfg
            {
                id = "wave1",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3( 3f, 1f,  8f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3(-3f, 1f, 10f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 4f, 1f, 14f) },
                },
            },
            new StageBuildHelpers.WaveCfg
            {
                id = "wave2",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 4f, 1f, 22f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-4f, 1f, 26f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3( 0f, 1f, 32f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 3f, 1f, 36f) },
                },
            },
            new StageBuildHelpers.WaveCfg
            {
                id = "wave3",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 5f, 1f, 50f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3(-3f, 1f, 54f) },
                    new StageBuildHelpers.WaveEntryCfg { isInnocent = true,       position = new Vector3( 0f, 1f, 56f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 4f, 1f, 60f) },
                },
            },
        },
        customPostBuild = PlaceInteractions,
    };

    private static void PlaceInteractions()
    {
        var barricadePrefab = UnityEditor.AssetDatabase.LoadAssetAtPath<GameObject>(
            StageBuildHelpers.EnvDir + "/DestructibleBarricade.prefab");
        var chandelierPrefab = UnityEditor.AssetDatabase.LoadAssetAtPath<GameObject>(
            StageBuildHelpers.EnvDir + "/Chandelier.prefab");
        var barrelPrefab = UnityEditor.AssetDatabase.LoadAssetAtPath<GameObject>(
            StageBuildHelpers.EnvDir + "/ExplosiveBarrel.prefab");

        var root = new GameObject("Stage4_Interactions");

        // Barricades in front plaza (z = 5-12)
        var barricadePositions = new[]
        {
            new Vector3( 2f, 0f,  6f),
            new Vector3(-2f, 0f,  9f),
            new Vector3( 0f, 0f, 12f),
        };
        foreach (var p in barricadePositions)
        {
            if (barricadePrefab == null) break;
            var go = (GameObject)UnityEditor.PrefabUtility.InstantiatePrefab(barricadePrefab);
            go.transform.position = p;
            go.transform.SetParent(root.transform, true);
        }

        // Chandelier in main hall (z = 26)
        if (chandelierPrefab != null)
        {
            var go = (GameObject)UnityEditor.PrefabUtility.InstantiatePrefab(chandelierPrefab);
            go.name = "Stage4_Chandelier";
            go.transform.position = new Vector3(0f, 3f, 26f);
            go.transform.SetParent(root.transform, true);
        }

        // Explosive barrels flanking boss arena (z = 76-78)
        if (barrelPrefab != null)
        {
            var positions = new[]
            {
                new Vector3(-3f, 0.4f, 76f),
                new Vector3( 3f, 0.4f, 76f),
            };
            foreach (var p in positions)
            {
                var go = (GameObject)UnityEditor.PrefabUtility.InstantiatePrefab(barrelPrefab);
                go.transform.position = p;
                go.transform.SetParent(root.transform, true);
            }
        }

        // Boss arena decorations (spec section 3): conference table, ROC flag, 2 chairs.
        var table = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        table.name = "ConferenceTable";
        table.transform.position   = new Vector3(0f, 0.5f, 78f);
        table.transform.localScale = new Vector3(4f, 0.5f, 4f);
        Recolor(table, new Color(0.30f, 0.18f, 0.10f));
        table.transform.SetParent(root.transform, true);

        var flag = GameObject.CreatePrimitive(PrimitiveType.Cube);
        flag.name = "ROCFlag";
        flag.transform.position   = new Vector3(0f, 2.5f, 82f);
        flag.transform.localScale = new Vector3(4f, 2.8f, 0.1f);
        Recolor(flag, new Color(0.78f, 0.18f, 0.18f));
        flag.transform.SetParent(root.transform, true);

        var canton = GameObject.CreatePrimitive(PrimitiveType.Cube);
        canton.name = "ROCFlag_Canton";
        canton.transform.position   = new Vector3(-1.3f, 3.5f, 81.95f);
        canton.transform.localScale = new Vector3(1.4f, 0.8f, 0.05f);
        Recolor(canton, new Color(0.10f, 0.20f, 0.55f));
        canton.transform.SetParent(root.transform, true);

        var sun = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        sun.name = "ROCFlag_Sun";
        sun.transform.position   = new Vector3(-1.3f, 3.5f, 81.92f);
        sun.transform.localScale = new Vector3(0.5f, 0.5f, 0.05f);
        Recolor(sun, Color.white);
        sun.transform.SetParent(root.transform, true);

        foreach (var p in new[] { new Vector3(-4.5f, 0.6f, 78f), new Vector3(4.5f, 0.6f, 78f) })
        {
            var chair = GameObject.CreatePrimitive(PrimitiveType.Cube);
            chair.name = "Chair";
            chair.transform.position   = p;
            chair.transform.localScale = new Vector3(0.8f, 1.2f, 0.8f);
            Recolor(chair, new Color(0.20f, 0.12f, 0.08f));
            chair.transform.SetParent(root.transform, true);
        }
    }

    // Local helper, same as Stage4PrefabSetup.Recolor
    private static void Recolor(GameObject go, Color c)
    {
        var r = go.GetComponent<Renderer>();
        if (r == null) return;
        r.sharedMaterial = new Material(Shader.Find("Standard")) { color = c };
    }
}
