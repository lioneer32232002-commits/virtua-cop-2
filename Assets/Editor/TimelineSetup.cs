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
        CreateStageMainTimeline(4, "Stage4_Main", new[] { 3.0, 8.0, 14.0, 22.0, 30.0 });

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[TimelineSetup] Done.");
    }

    private static readonly double[] DefaultMarkerTimes = { 3.0, 8.0, 12.0, 18.0, 25.0 };

    private static void CreateStageMainTimeline(int stageIndex, string fileName, double[] markerTimes = null)
    {
        var times = markerTimes ?? DefaultMarkerTimes;
        var path = $"{TimelineDir}/{fileName}.playable";

        // Always recreate to ensure correct structure
        var existing = AssetDatabase.LoadAssetAtPath<TimelineAsset>(path);
        if (existing != null)
            AssetDatabase.DeleteAsset(path);

        var timeline = ScriptableObject.CreateInstance<TimelineAsset>();
        timeline.name = fileName;

        // Create the .playable asset first so CreateTrack / CreateMarker register sub-assets
        AssetDatabase.CreateAsset(timeline, path);

        // SignalTrack — CreateTrack automatically adds the track as a sub-asset
        var sigTrack = timeline.CreateTrack<SignalTrack>(null, "Signals");

        AddSignalMarker(sigTrack, timeline, times[0], "Wave1Signal");
        AddSignalMarker(sigTrack, timeline, times[1], "Wave2Signal");
        AddSignalMarker(sigTrack, timeline, times[2], "ClearPointSignal");
        AddSignalMarker(sigTrack, timeline, times[3], "Wave3Signal");
        AddSignalMarker(sigTrack, timeline, times[4], "StageEndSignal");

        EditorUtility.SetDirty(sigTrack);
        EditorUtility.SetDirty(timeline);
        AssetDatabase.SaveAssets();
        AssetDatabase.ImportAsset(path);
        Debug.Log($"[TimelineSetup] {path}");
    }

    private static void AddSignalMarker(SignalTrack track, TimelineAsset timeline, double time, string signalAssetName)
    {
        var signal = SignalSetup.Load(signalAssetName);
        if (signal == null)
        {
            Debug.LogWarning($"[TimelineSetup] Missing SignalAsset '{signalAssetName}'. Run SignalSetup.CreateAllSignals first.");
            return;
        }
        var emitter = track.CreateMarker<SignalEmitter>(time);
        // SignalEmitter is a ScriptableObject; CreateMarker auto-adds to track but
        // we still need to persist its SignalAsset reference via SetDirty.
        emitter.asset       = signal;
        emitter.retroactive = false;
        emitter.emitOnce    = true;
        EditorUtility.SetDirty(emitter);
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
