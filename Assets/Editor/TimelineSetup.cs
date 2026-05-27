// Assets/Editor/TimelineSetup.cs
// Generates TimelineAsset .playable files containing a SignalTrack with markers
// at fixed times (Wave1, Wave2, ClearPoint, Wave3, StageEnd).
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod TimelineSetup.CreateAllTimelines -quit -logFile <log>
using UnityEditor;
using UnityEngine;
using UnityEngine.Timeline;

public static class TimelineSetup
{
    private const string TimelineDir = "Assets/Timeline";

    public static void CreateAllTimelines()
    {
        Debug.Log("[TimelineSetup] Creating Timeline assets...");
        EnsureFolder(TimelineDir);

        // Each Timeline shares the same layout: SignalTrack with 5 markers.
        // Per-scene EnemySpawner.waves configures different content.
        CreateStageMainTimeline(1, "Stage1_Main");
        CreateStageMainTimeline(2, "Stage2_Main");
        CreateStageMainTimeline(3, "Stage3_Main");

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[TimelineSetup] Done.");
    }

    private static void CreateStageMainTimeline(int stageIndex, string fileName)
    {
        var path = $"{TimelineDir}/{fileName}.playable";

        // Always recreate to ensure correct structure
        var existing = AssetDatabase.LoadAssetAtPath<TimelineAsset>(path);
        if (existing != null)
            AssetDatabase.DeleteAsset(path);

        var timeline = ScriptableObject.CreateInstance<TimelineAsset>();
        timeline.name = fileName;

        // SignalTrack — fires events for EnemySpawner / StageDirector
        var sigTrack = timeline.CreateTrack<SignalTrack>(null, "Signals");

        AddSignalMarker(sigTrack,  3.0, "Wave1Signal");
        AddSignalMarker(sigTrack,  8.0, "Wave2Signal");
        AddSignalMarker(sigTrack, 12.0, "ClearPointSignal");
        AddSignalMarker(sigTrack, 18.0, "Wave3Signal");
        AddSignalMarker(sigTrack, 25.0, "StageEndSignal");

        AssetDatabase.CreateAsset(timeline, path);

        // SignalTrack must be added as a child asset
        AssetDatabase.AddObjectToAsset(sigTrack, timeline);

        AssetDatabase.ImportAsset(path);
        Debug.Log($"[TimelineSetup] {path}");
    }

    private static void AddSignalMarker(SignalTrack track, double time, string signalAssetName)
    {
        var signal = SignalSetup.Load(signalAssetName);
        if (signal == null)
        {
            Debug.LogWarning($"[TimelineSetup] Missing SignalAsset '{signalAssetName}'. Run SignalSetup.CreateAllSignals first.");
            return;
        }
        var emitter = track.CreateMarker<SignalEmitter>(time);
        emitter.asset = signal;
        emitter.retroactive = false;
        emitter.emitOnce    = true;
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
