// Assets/Editor/Stage4PrefabSetup.cs
// Generates Stage4-specific prefabs (chandelier, barricade). Bosses come later (Phase 6-7).
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod Stage4PrefabSetup.CreateAll -quit -logFile <log>
using UnityEditor;
using UnityEngine;
using VirtuaCop2;

public static class Stage4PrefabSetup
{
    private const string EnvDir = "Assets/Prefabs/Environment";

    public static void CreateAll()
    {
        EnsureFolder(EnvDir);
        EnsureFolder("Assets/Prefabs/Enemies");
        CreateChandelier();
        CreateBarricade();
        CreateBoss4C();
        CreateBoss4A();
        CreateVIP();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[Stage4PrefabSetup] Stage 4 environment prefabs done.");
    }

    private static void CreateChandelier()
    {
        var path = $"{EnvDir}/Chandelier.prefab";
        var root = new GameObject("Chandelier");

        var center = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        center.name = "Bulb_Center";
        center.transform.SetParent(root.transform, false);
        center.transform.localScale = new Vector3(0.5f, 0.5f, 0.5f);
        Recolor(center, new Color(1f, 0.9f, 0.4f));

        for (int i = 0; i < 5; i++)
        {
            float ang = i * Mathf.PI * 2f / 5f;
            var bulb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            bulb.name = $"Bulb_{i}";
            bulb.transform.SetParent(root.transform, false);
            bulb.transform.localPosition = new Vector3(Mathf.Cos(ang) * 0.6f, -0.1f, Mathf.Sin(ang) * 0.6f);
            bulb.transform.localScale = new Vector3(0.35f, 0.35f, 0.35f);
            Recolor(bulb, new Color(1f, 0.85f, 0.3f));
        }

        var col = root.AddComponent<SphereCollider>();
        col.radius = 0.9f;
        col.isTrigger = false;

        var chain = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        chain.name = "Chain";
        chain.transform.SetParent(root.transform, false);
        chain.transform.localPosition = new Vector3(0, 1.5f, 0);
        chain.transform.localScale    = new Vector3(0.05f, 1.5f, 0.05f);
        Recolor(chain, new Color(0.3f, 0.3f, 0.3f));
        Object.DestroyImmediate(chain.GetComponent<Collider>());

        var drop = root.AddComponent<DroppingChandelier>();
        var so   = new SerializedObject(drop);
        so.FindProperty("chainVisual").objectReferenceValue = chain;
        so.ApplyModifiedPropertiesWithoutUndo();

        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[Stage4PrefabSetup] {path}");
    }

    private static void CreateBarricade()
    {
        var path = $"{EnvDir}/DestructibleBarricade.prefab";
        var root = new GameObject("DestructibleBarricade");

        var p1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        p1.name = "PlankX";
        p1.transform.SetParent(root.transform, false);
        p1.transform.localPosition = new Vector3(0, 0.4f, 0);
        p1.transform.localScale    = new Vector3(1.4f, 0.12f, 0.12f);
        Recolor(p1, new Color(0.45f, 0.30f, 0.18f));
        Object.DestroyImmediate(p1.GetComponent<Collider>());

        var p2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        p2.name = "PlankSlash";
        p2.transform.SetParent(root.transform, false);
        p2.transform.localPosition = new Vector3(0, 0.4f, 0);
        p2.transform.localRotation = Quaternion.Euler(0, 0, 45);
        p2.transform.localScale    = new Vector3(1.6f, 0.12f, 0.12f);
        Recolor(p2, new Color(0.45f, 0.30f, 0.18f));
        Object.DestroyImmediate(p2.GetComponent<Collider>());

        var col = root.AddComponent<BoxCollider>();
        col.center = new Vector3(0, 0.4f, 0);
        col.size   = new Vector3(1.6f, 0.8f, 0.4f);

        root.AddComponent<DestructibleCover>();

        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[Stage4PrefabSetup] {path}");
    }

    private static void CreateBoss4C()
    {
        var path = "Assets/Prefabs/Enemies/Enemy_Boss_4_C.prefab";
        var root = new GameObject("Enemy_Boss_4_C");
        root.layer = 8; // EnemyBody

        // Body capsule
        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "Body";
        body.layer = 8;
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0, 1f, 0);
        body.transform.localScale    = new Vector3(0.6f, 1f, 0.6f);
        var bodyRend = body.GetComponent<Renderer>();
        bodyRend.sharedMaterial = new Material(Shader.Find("Standard")) { color = new Color(0.18f, 0.20f, 0.28f) };

        // Head sphere
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "Head";
        head.layer = 8;
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0, 2.1f, 0);
        head.transform.localScale    = new Vector3(0.4f, 0.4f, 0.4f);
        Recolor(head, new Color(0.92f, 0.78f, 0.62f));

        var boss = root.AddComponent<BossController>();
        var bso  = new UnityEditor.SerializedObject(boss);
        bso.FindProperty("maxHealth").intValue = 18;
        bso.ApplyModifiedPropertiesWithoutUndo();

        var traitor = root.AddComponent<TraitorAgent>();
        var tso = new UnityEditor.SerializedObject(traitor);
        tso.FindProperty("bodyRenderer").objectReferenceValue = bodyRend;
        tso.ApplyModifiedPropertiesWithoutUndo();

        UnityEditor.PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[Stage4PrefabSetup] {path}");
    }

    private static void CreateBoss4A()
    {
        var path = "Assets/Prefabs/Enemies/Enemy_Boss_4_A.prefab";
        var root = new GameObject("Enemy_Boss_4_A");
        root.layer = 8;

        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "Body";
        body.layer = 8;
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0, 1f, 0);
        body.transform.localScale    = new Vector3(0.7f, 1f, 0.7f);
        Recolor(body, new Color(0.10f, 0.10f, 0.12f));

        // Head — wears mask (dark) — on BossWeakPoint layer
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "Head";
        head.layer = 13; // BossWeakPoint
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0, 2.1f, 0);
        head.transform.localScale    = new Vector3(0.42f, 0.42f, 0.42f);
        Recolor(head, new Color(0.18f, 0.18f, 0.22f));

        // Pistol hand — also weak point
        var hand = GameObject.CreatePrimitive(PrimitiveType.Cube);
        hand.name = "PistolHand";
        hand.layer = 13;
        hand.transform.SetParent(root.transform, false);
        hand.transform.localPosition = new Vector3(0.4f, 1.4f, 0.3f);
        hand.transform.localScale    = new Vector3(0.18f, 0.18f, 0.45f);
        Recolor(hand, new Color(0.2f, 0.2f, 0.22f));

        var boss = root.AddComponent<BossController>();
        var bso  = new UnityEditor.SerializedObject(boss);
        bso.FindProperty("maxHealth").intValue = 25;
        bso.ApplyModifiedPropertiesWithoutUndo();

        root.AddComponent<BossAPhase3>();

        UnityEditor.PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[Stage4PrefabSetup] {path}");
    }

    private static void CreateVIP()
    {
        var path = "Assets/Prefabs/VIP_President.prefab";
        var root = new GameObject("VIP_President");
        root.layer = 11; // Innocent

        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "Body";
        body.layer = 11;
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0, 1f, 0);
        body.transform.localScale    = new Vector3(0.55f, 1f, 0.55f);
        Recolor(body, new Color(0.85f, 0.78f, 0.65f));

        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "Head";
        head.layer = 11;
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0, 2.1f, 0);
        head.transform.localScale    = new Vector3(0.4f, 0.4f, 0.4f);
        Recolor(head, new Color(0.95f, 0.82f, 0.68f));

        root.AddComponent<HostageController>();

        UnityEditor.PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[Stage4PrefabSetup] {path}");
    }

    private static void Recolor(GameObject go, Color c)
    {
        var r = go.GetComponent<Renderer>();
        if (r == null) return;
        var mat = new Material(Shader.Find("Standard")) { color = c };
        r.sharedMaterial = mat;
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
