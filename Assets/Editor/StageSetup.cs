// Assets/Editor/StageSetup.cs
// Thin orchestrator. Per-stage configurations live in Assets/Editor/Stages/*.cs.
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod StageSetup.CreateAllStages -quit -logFile <log>
using UnityEngine;

public static class StageSetup
{
    public static void CreateAllStages()
    {
        Debug.Log("[StageSetup] Creating all stages...");
        var s1 = StageBuildHelpers.BuildStage(Stage1Cfg.Build());
        var s2 = StageBuildHelpers.BuildStage(Stage2Cfg.Build());
        var s3 = StageBuildHelpers.BuildStage(Stage3Cfg.Build());
        StageBuildHelpers.UpdateBuildSettings(s1, s2, s3);
        Debug.Log("[StageSetup] All stages saved.");
    }

    public static void CreateStage1() { var p = Stage1Cfg.Build(); StageBuildHelpers.BuildStage(p); StageBuildHelpers.UpdateBuildSettings(p.scenePath); }
    public static void CreateStage2() { var p = Stage2Cfg.Build(); StageBuildHelpers.BuildStage(p); StageBuildHelpers.UpdateBuildSettings(p.scenePath); }
    public static void CreateStage3() { var p = Stage3Cfg.Build(); StageBuildHelpers.BuildStage(p); StageBuildHelpers.UpdateBuildSettings(p.scenePath); }
}
