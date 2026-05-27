// Assets/Editor/Stages/Stage3Cfg.cs
using Cinemachine;
using UnityEngine;
using VirtuaCop2;

public static class Stage3Cfg
{
    public static StageBuildHelpers.StageCfg Build() => new StageBuildHelpers.StageCfg
    {
        stageIndex        = 3,
        scenePath         = StageBuildHelpers.ScenesDir + "/Stage3.unity",
        timelinePath      = StageBuildHelpers.TimelineDir + "/Stage3_Main.playable",
        bossPrefabPath    = StageBuildHelpers.EnemiesDir + "/Enemy_Boss_3.prefab",
        bossArenaPos      = new Vector3(0f, 0.5f, 75f),
        includeHelicopter = true,
        includeBarrels    = true,
        groundColor       = new Color(0.18f, 0.20f, 0.28f),
        groundCenter      = new Vector3(0f, 0f, 35f),
        groundScale       = new Vector3(18f, 1f, 30f),
        dollyWaypoints    = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,  18f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 3f, 1.6f,  35f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(-2f, 1.6f,  55f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.8f,  72f) },
        },
        waves = new[]
        {
            new StageBuildHelpers.WaveCfg
            {
                id = "wave1",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 2f, 1f, 12f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-2f, 1f, 16f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3( 4f, 1f, 20f) },
                },
            },
            new StageBuildHelpers.WaveCfg
            {
                id = "wave2",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3( 0f, 1f, 38f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-3f, 1f, 42f) },
                },
            },
            new StageBuildHelpers.WaveCfg
            {
                id = "wave3",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 3f, 1f, 58f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-3f, 1f, 62f) },
                },
            },
        },
    };
}
