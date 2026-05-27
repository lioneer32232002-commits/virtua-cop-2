// Assets/Editor/Stages/Stage2Cfg.cs
using Cinemachine;
using UnityEngine;
using VirtuaCop2;

public static class Stage2Cfg
{
    public static StageBuildHelpers.StageCfg Build() => new StageBuildHelpers.StageCfg
    {
        stageIndex        = 2,
        scenePath         = StageBuildHelpers.ScenesDir + "/Stage2.unity",
        timelinePath      = StageBuildHelpers.TimelineDir + "/Stage2_Main.playable",
        bossPrefabPath    = StageBuildHelpers.EnemiesDir + "/Enemy_Boss_2.prefab",
        bossArenaPos      = new Vector3(0f, 0.5f, 70f),
        includeHelicopter = false,
        includeBarrels    = false,
        groundColor       = new Color(0.25f, 0.22f, 0.20f),
        groundCenter      = new Vector3(0f, 0f, 30f),
        groundScale       = new Vector3(15f, 1f, 25f),
        dollyWaypoints    = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 2f, 1.6f,  18f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(-2f, 1.6f,  35f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 2.0f,  55f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 2.0f,  68f) },
        },
        waves = new[]
        {
            new StageBuildHelpers.WaveCfg
            {
                id = "wave1",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 2f, 1f, 10f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(-3f, 1f, 14f) },
                    new StageBuildHelpers.WaveEntryCfg { isInnocent = true,       position = new Vector3( 0f, 1f, 12f) },
                },
            },
            new StageBuildHelpers.WaveCfg
            {
                id = "wave2",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3( 3f, 1f, 28f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3(-3f, 1f, 32f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 0f, 1f, 36f) },
                },
            },
            new StageBuildHelpers.WaveCfg
            {
                id = "wave3",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3( 4f, 1f, 50f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3(-4f, 1f, 55f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 0f, 1f, 60f) },
                },
            },
        },
    };
}
