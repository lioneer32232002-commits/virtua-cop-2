// Assets/Editor/MaterialFactory.cs
// Creates and caches Material assets keyed by colour hex. Persisting materials
// as .mat files (instead of runtime-created Material instances) is what makes
// Renderer.sharedMaterial survive prefab/scene serialisation — without this,
// every generated material loses its shader reference at load time and shows
// as the magenta "shader missing" placeholder in both Editor and WebGL builds.
using UnityEditor;
using UnityEngine;

public static class MaterialFactory
{
    private const string MaterialsRoot      = "Assets/Materials";
    private const string GeneratedFolder    = MaterialsRoot + "/Generated";

    public static Material GetOrCreate(Color color)
    {
        EnsureFolder(MaterialsRoot);
        EnsureFolder(GeneratedFolder);

        var hex  = ColorUtility.ToHtmlStringRGB(color);
        var path = $"{GeneratedFolder}/Mat_{hex}.mat";

        var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (existing != null)
        {
            if (existing.shader == null) existing.shader = Shader.Find("Standard");
            return existing;
        }

        var mat = new Material(Shader.Find("Standard")) { color = color };
        AssetDatabase.CreateAsset(mat, path);
        return mat;
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
