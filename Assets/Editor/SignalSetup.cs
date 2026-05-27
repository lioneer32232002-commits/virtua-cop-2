// Assets/Editor/SignalSetup.cs
// Generates SignalAsset ScriptableObjects used by Timeline SignalTracks.
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod SignalSetup.CreateAllSignals -quit -logFile <log>
using UnityEditor;
using UnityEngine;
using UnityEngine.Timeline;

public static class SignalSetup
{
    private const string TimelineDir = "Assets/Timeline";
    private const string SignalsDir  = TimelineDir + "/Signals";

    public static readonly string[] SignalNames =
    {
        "Wave1Signal",
        "Wave2Signal",
        "Wave3Signal",
        "ClearPointSignal",
        "StageEndSignal",
        "Boss4SwitchSignal",
    };

    public static void CreateAllSignals()
    {
        Debug.Log("[SignalSetup] Creating signal assets...");
        EnsureFolder(TimelineDir);
        EnsureFolder(SignalsDir);

        foreach (var name in SignalNames)
        {
            var path = $"{SignalsDir}/{name}.signal";
            var existing = AssetDatabase.LoadAssetAtPath<SignalAsset>(path);
            if (existing != null)
            {
                Debug.Log($"[SignalSetup] {path} exists, skipping");
                continue;
            }
            var asset = ScriptableObject.CreateInstance<SignalAsset>();
            AssetDatabase.CreateAsset(asset, path);
            Debug.Log($"[SignalSetup] {path}");
        }

        AssetDatabase.SaveAssets();
        Debug.Log("[SignalSetup] Done.");
    }

    public static SignalAsset Load(string name)
    {
        return AssetDatabase.LoadAssetAtPath<SignalAsset>($"{SignalsDir}/{name}.signal");
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;
        var parent = System.IO.Path.GetDirectoryName(path).Replace('\\', '/');
        var name   = System.IO.Path.GetFileName(path);
        if (!AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, name);
    }
}
