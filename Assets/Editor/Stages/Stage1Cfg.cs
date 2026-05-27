// Assets/Editor/Stages/Stage1Cfg.cs
using Cinemachine;
using UnityEngine;
using VirtuaCop2;

public static class Stage1Cfg
{
    public static StageBuildHelpers.StageCfg Build() => new StageBuildHelpers.StageCfg
    {
        stageIndex        = 1,
        scenePath         = StageBuildHelpers.ScenesDir + "/Stage1.unity",
        timelinePath      = StageBuildHelpers.TimelineDir + "/Stage1_Main.playable",
        bossPrefabPath    = StageBuildHelpers.EnemiesDir + "/Enemy_Boss_1.prefab",
        bossArenaPos      = new Vector3(15f, 0.5f, 65f),
        includeHelicopter = false,
        includeBarrels    = false,
        groundColor       = new Color(0.35f, 0.35f, 0.40f),
        groundCenter      = new Vector3(0f, 0f, 30f),
        groundScale       = new Vector3(20f, 1f, 20f),
        dollyWaypoints    = new[]
        {
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,   0f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 0f, 1.6f,  15f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3( 5f, 1.6f,  30f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(10f, 1.6f,  45f) },
            new CinemachineSmoothPath.Waypoint { position = new Vector3(15f, 1.8f,  60f) },
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
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Heavy,  position = new Vector3(-2f, 1f, 22f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Grunt,  position = new Vector3( 5f, 1f, 26f) },
                    new StageBuildHelpers.WaveEntryCfg { isInnocent = true,       position = new Vector3( 0f, 1f, 24f) },
                },
            },
            new StageBuildHelpers.WaveCfg
            {
                id = "wave3",
                entries = new[]
                {
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3( 8f, 1f, 40f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Fast,   position = new Vector3(12f, 1f, 45f) },
                    new StageBuildHelpers.WaveEntryCfg { type = EnemyType.Gunman, position = new Vector3(10f, 1f, 50f) },
                },
            },
        },
    };
}
