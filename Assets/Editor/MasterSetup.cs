// Assets/Editor/MasterSetup.cs
// Runs the full content-generation pipeline in correct order:
//   prefabs → signals → timelines → audio → stages
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod MasterSetup.RunAll -quit -logFile <log>
using UnityEditor;
using UnityEngine;

public static class MasterSetup
{
    public static void RunAll()
    {
        Debug.Log("====== [MasterSetup] RunAll START ======");

        try
        {
            DifficultySettingsSetup.CreateAll();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            PrefabSetup.CreateAllPrefabs();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Stage4PrefabSetup.CreateAll();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            SignalSetup.CreateAllSignals();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            TimelineSetup.CreateAllTimelines();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            AudioSetup.GeneratePlaceholderAudio();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Stage4AudioSetup.GenerateAll();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            StageSetup.CreateAllStages();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            MainMenuSetup.CreateMainMenu();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("====== [MasterSetup] RunAll SUCCESS ======");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[MasterSetup] FAILED: {ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}");
            throw;
        }
    }
}
