// Assets/Editor/DifficultySettingsSetup.cs
// Generates Resources/Difficulty/DifficultySettings_{Easy,Normal,Hard}.asset.
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod DifficultySettingsSetup.CreateAll -quit -logFile <log>
using System.IO;
using UnityEditor;
using UnityEngine;
using VirtuaCop2;

public static class DifficultySettingsSetup
{
    private const string ResourcesDir = "Assets/Resources";
    private const string SubDir       = "Difficulty";

    public static void CreateAll()
    {
        EnsureFolder(ResourcesDir);
        EnsureFolder($"{ResourcesDir}/{SubDir}");

        Create(DifficultyLevel.Easy, new()
        {
            enemyHpMul         = 0.7f,
            enemyAimingMul     = 1.4f,
            playerDamagePerHit = 0.5f,
            continuesAtStart   = 5,
            bossHpMul          = 0.7f,
        });

        Create(DifficultyLevel.Normal, new()
        {
            enemyHpMul         = 1.0f,
            enemyAimingMul     = 1.0f,
            playerDamagePerHit = 1.0f,
            continuesAtStart   = 3,
            bossHpMul          = 1.0f,
        });

        Create(DifficultyLevel.Hard, new()
        {
            enemyHpMul         = 1.4f,
            enemyAimingMul     = 0.7f,
            playerDamagePerHit = 2.0f,
            continuesAtStart   = 1,
            bossHpMul          = 1.4f,
        });

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[DifficultySettingsSetup] All 3 DifficultySettings assets created.");
    }

    private struct Payload
    {
        public float enemyHpMul;
        public float enemyAimingMul;
        public float playerDamagePerHit;
        public int   continuesAtStart;
        public float bossHpMul;
    }

    private static void Create(DifficultyLevel level, Payload p)
    {
        var path = $"{ResourcesDir}/{SubDir}/DifficultySettings_{level}.asset";
        var asset = AssetDatabase.LoadAssetAtPath<DifficultySettings>(path);
        if (asset == null)
        {
            asset = ScriptableObject.CreateInstance<DifficultySettings>();
            AssetDatabase.CreateAsset(asset, path);
        }
        asset.level              = level;
        asset.enemyHpMul         = p.enemyHpMul;
        asset.enemyAimingMul     = p.enemyAimingMul;
        asset.playerDamagePerHit = p.playerDamagePerHit;
        asset.continuesAtStart   = p.continuesAtStart;
        asset.bossHpMul          = p.bossHpMul;
        EditorUtility.SetDirty(asset);
        Debug.Log($"[DifficultySettingsSetup] {path} written (hp×{p.enemyHpMul}, aim×{p.enemyAimingMul}, dmg={p.playerDamagePerHit}♥, cont={p.continuesAtStart}, bossHp×{p.bossHpMul}).");
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;
        var parent = Path.GetDirectoryName(path).Replace('\\', '/');
        var name   = Path.GetFileName(path);
        if (!AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, name);
    }
}
