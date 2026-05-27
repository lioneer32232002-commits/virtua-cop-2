// Assets/Editor/BatchSetup.cs
// Run via:
//   Unity.exe -batchmode -nographics -projectPath <path> -executeMethod BatchSetup.ConfigureProject -quit
using UnityEditor;
using UnityEditor.Build;
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
        PlayerSettings.WebGL.template              = "PROJECT:Default";
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
}
