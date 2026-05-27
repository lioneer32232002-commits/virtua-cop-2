// Assets/Editor/BatchSetup.cs
// Run via:
//   Unity.exe -batchmode -nographics -projectPath <path> -executeMethod BatchSetup.ConfigureProject -quit
//   Unity.exe -batchmode -nographics -projectPath <path> -executeMethod BatchSetup.BuildWebGL -quit
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BatchSetup
{
    public static void ConfigureProject()
    {
        Debug.Log("[BatchSetup] Starting project configuration...");

        // 1) Switch to WebGL build target
        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
        {
            Debug.Log("[BatchSetup] Switching build target to WebGL...");
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
        }
        else
        {
            Debug.Log("[BatchSetup] Build target already WebGL.");
        }

        // 2) WebGL Player Settings
        PlayerSettings.WebGL.decompressionFallback = true;
        PlayerSettings.WebGL.compressionFormat     = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.linkerTarget          = WebGLLinkerTarget.Wasm;
        PlayerSettings.WebGL.memorySize            = 512;
        PlayerSettings.WebGL.exceptionSupport      = WebGLExceptionSupport.None;
        PlayerSettings.WebGL.template              = "APPLICATION:Default";
        Debug.Log("[BatchSetup] WebGL settings: decompressionFallback=true, format=Gzip, mem=512MB");

        // 3) General Player Settings
        PlayerSettings.companyName  = "VirtuaCop2";
        PlayerSettings.productName  = "Virtua Cop 2";
        PlayerSettings.colorSpace   = ColorSpace.Linear;
        PlayerSettings.SetApiCompatibilityLevel(NamedBuildTarget.WebGL, ApiCompatibilityLevel.NET_Standard);
        PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL, ScriptingImplementation.IL2CPP);

        // 4) Persist all changes
        AssetDatabase.SaveAssets();
        Debug.Log("[BatchSetup] Configuration complete. Saving project...");
    }

    public static void BuildWebGL()
    {
        Debug.Log("[BatchSetup] Starting WebGL build...");

        // Force-set Player settings that build depends on (idempotent)
        PlayerSettings.WebGL.decompressionFallback = true;
        PlayerSettings.WebGL.compressionFormat     = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.linkerTarget          = WebGLLinkerTarget.Wasm;
        PlayerSettings.WebGL.memorySize            = 512;
        PlayerSettings.WebGL.exceptionSupport      = WebGLExceptionSupport.None;
        PlayerSettings.WebGL.template              = "APPLICATION:Default";

        // Ensure WebGL is the active target
        if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);

        var scenes = EditorBuildSettings.scenes
            .Where(s => s.enabled)
            .Select(s => s.path)
            .ToArray();

        if (scenes.Length == 0)
        {
            Debug.LogError("[BatchSetup] No scenes in Build Settings.");
            EditorApplication.Exit(1);
            return;
        }

        Debug.Log($"[BatchSetup] Building {scenes.Length} scenes: {string.Join(", ", scenes)}");

        var outputPath = Path.Combine(Directory.GetCurrentDirectory(), "LocalBuild", "WebGL");
        if (Directory.Exists(outputPath)) Directory.Delete(outputPath, true);
        Directory.CreateDirectory(outputPath);

        var options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = outputPath,
            target = BuildTarget.WebGL,
            options = BuildOptions.None,
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildSummary summary = report.summary;

        Debug.Log($"[BatchSetup] Build result: {summary.result}, " +
                  $"size={summary.totalSize / (1024 * 1024)} MB, " +
                  $"errors={summary.totalErrors}, warnings={summary.totalWarnings}, " +
                  $"duration={summary.totalTime}");

        if (summary.result != BuildResult.Succeeded)
        {
            Debug.LogError($"[BatchSetup] WebGL build FAILED");
            EditorApplication.Exit(2);
            return;
        }

        // Count files
        int fileCount = Directory.GetFiles(outputPath, "*", SearchOption.AllDirectories).Length;
        Debug.Log($"[BatchSetup] WebGL build SUCCESS — output at {outputPath} ({fileCount} files)");
    }
}
