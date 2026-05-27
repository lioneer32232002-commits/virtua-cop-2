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
    };
}
