// Assets/Editor/PrefabSetup.cs
// Programmatically generate all gameplay prefabs (enemies, bosses, innocent,
// weapon pickups, explosive barrel, helicopter). Run via:
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod PrefabSetup.CreateAllPrefabs -quit -logFile <log>
using UnityEditor;
using UnityEngine;
using VirtuaCop2;

public static class PrefabSetup
{
    private const string PrefabsRoot  = "Assets/Prefabs";
    private const string EnemiesDir   = PrefabsRoot + "/Enemies";
    private const string WeaponsDir   = PrefabsRoot + "/Weapons";
    private const string EnvDir       = PrefabsRoot + "/Environment";

    private const int LayerEnemyBody    = 8;
    private const int LayerEnemyHead    = 9;
    private const int LayerEnemyWeapon  = 10;
    private const int LayerInnocent     = 11;
    private const int LayerWeaponPickup = 12;
    private const int LayerBossWeak     = 13;

    public static void CreateAllPrefabs()
    {
        Debug.Log("[PrefabSetup] Creating all prefabs...");

        EnsureFolder(PrefabsRoot);
        EnsureFolder(EnemiesDir);
        EnsureFolder(WeaponsDir);
        EnsureFolder(EnvDir);

        // Enemies
        CreateEnemyPrefab(EnemyType.Grunt,  new Color(0.85f, 0.20f, 0.20f), false);
        CreateEnemyPrefab(EnemyType.Gunman, new Color(0.20f, 0.45f, 0.85f), true);
        CreateEnemyPrefab(EnemyType.Heavy,  new Color(0.30f, 0.30f, 0.35f), false);
        CreateEnemyPrefab(EnemyType.Fast,   new Color(0.95f, 0.75f, 0.10f), false);

        // Bosses
        CreateBoss1Prefab();
        CreateBoss2Prefab();
        CreateBoss3Prefab();

        // Innocent
        CreateInnocentPrefab();

        // Weapon pickups
        CreatePickupPrefab(WeaponType.MachineGun, new Color(0.10f, 0.85f, 0.40f));
        CreatePickupPrefab(WeaponType.Shotgun,    new Color(0.85f, 0.40f, 0.10f));

        // Explosive barrel
        CreateExplosiveBarrelPrefab();

        // Helicopter
        CreateHelicopterPrefab();

        AssetDatabase.SaveAssets();
        Debug.Log("[PrefabSetup] All prefabs created.");
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;
        var parent = System.IO.Path.GetDirectoryName(path).Replace('\\', '/');
        var name   = System.IO.Path.GetFileName(path);
        if (!AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, name);
    }

    private static Material MakeMaterial(Color color)
    {
        var mat = new Material(Shader.Find("Standard")) { color = color };
        return mat;
    }

    // -------------------------------------------------------------------
    // Enemy prefabs
    // -------------------------------------------------------------------

    private static void CreateEnemyPrefab(EnemyType type, Color bodyColor, bool hasWeapon)
    {
        var root = new GameObject($"Enemy_{type}");
        root.transform.position = Vector3.zero;

        // Body (capsule)
        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "BodyHitBox";
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0f, 1.0f, 0f);
        body.transform.localScale    = new Vector3(0.7f, 0.9f, 0.7f);
        body.layer = LayerEnemyBody;
        body.GetComponent<Renderer>().sharedMaterial = MakeMaterial(bodyColor);

        // Head (sphere)
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "HeadHitBox";
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0f, 2.0f, 0f);
        head.transform.localScale    = new Vector3(0.55f, 0.55f, 0.55f);
        head.layer = LayerEnemyHead;
        head.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.80f, 0.70f));

        // Weapon hitbox (only for Gunman)
        Transform weaponHold = null;
        if (hasWeapon)
        {
            var weapon = GameObject.CreatePrimitive(PrimitiveType.Cube);
            weapon.name = "WeaponHitBox";
            weapon.transform.SetParent(root.transform, false);
            weapon.transform.localPosition = new Vector3(0.45f, 1.3f, 0.3f);
            weapon.transform.localScale    = new Vector3(0.25f, 0.15f, 0.45f);
            weapon.layer = LayerEnemyWeapon;
            weapon.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.20f, 0.20f, 0.20f));
            weaponHold = weapon.transform;
        }

        // Controller component
        var ctrl = root.AddComponent<EnemyController>();
        var so = new SerializedObject(ctrl);
        so.FindProperty("enemyType").enumValueIndex = (int)type;
        if (weaponHold != null)
            so.FindProperty("weaponHoldPoint").objectReferenceValue = weaponHold;
        so.ApplyModifiedPropertiesWithoutUndo();

        // Save prefab
        var path = $"{EnemiesDir}/Enemy_{type}.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }

    // -------------------------------------------------------------------
    // Boss prefabs
    // -------------------------------------------------------------------

    private static void CreateBoss1Prefab()
    {
        var root = new GameObject("Enemy_Boss_1");

        // Larger body (Heavy armor)
        var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
        body.name = "BodyHitBox";
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0f, 1.2f, 0f);
        body.transform.localScale    = new Vector3(1.5f, 2.4f, 1.0f);
        body.layer = LayerEnemyBody;
        body.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.20f, 0.20f, 0.25f));

        // Head — weak point
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "HeadWeakPoint";
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0f, 2.7f, 0f);
        head.transform.localScale    = new Vector3(0.75f, 0.75f, 0.75f);
        head.layer = LayerBossWeak;
        head.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.30f, 0.30f));

        // Legs — weak point (2 cubes)
        for (int i = 0; i < 2; i++)
        {
            var leg = GameObject.CreatePrimitive(PrimitiveType.Cube);
            leg.name = $"LegWeakPoint_{i}";
            leg.transform.SetParent(root.transform, false);
            leg.transform.localPosition = new Vector3(i == 0 ? -0.4f : 0.4f, 0.4f, 0f);
            leg.transform.localScale    = new Vector3(0.4f, 0.8f, 0.4f);
            leg.layer = LayerBossWeak;
            leg.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.30f, 0.30f));
        }

        var boss = root.AddComponent<BossController>();
        var so = new SerializedObject(boss);
        so.FindProperty("maxHealth").intValue          = 20;
        so.FindProperty("phase2Threshold").floatValue  = 0.5f;
        so.FindProperty("phase3Threshold").floatValue  = 0.3f;
        so.ApplyModifiedPropertiesWithoutUndo();

        var path = $"{EnemiesDir}/Enemy_Boss_1.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }

    private static void CreateBoss2Prefab()
    {
        var root = new GameObject("Enemy_Boss_2");

        // Slim, fast swordsman
        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "BodyHitBox";
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0f, 1.1f, 0f);
        body.transform.localScale    = new Vector3(0.6f, 1.0f, 0.6f);
        body.layer = LayerBossWeak;   // entire body is weak (no armor)
        body.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.55f, 0.10f, 0.55f));

        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "HeadWeakPoint";
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0f, 2.3f, 0f);
        head.transform.localScale    = new Vector3(0.55f, 0.55f, 0.55f);
        head.layer = LayerBossWeak;
        head.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.80f, 0.70f));

        var boss = root.AddComponent<BossController>();
        var so = new SerializedObject(boss);
        so.FindProperty("maxHealth").intValue          = 15;
        so.FindProperty("phase2Threshold").floatValue  = 0.4f;
        so.FindProperty("phase3Threshold").floatValue  = 0.0f;
        so.ApplyModifiedPropertiesWithoutUndo();

        var path = $"{EnemiesDir}/Enemy_Boss_2.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }

    private static void CreateBoss3Prefab()
    {
        var root = new GameObject("Enemy_Boss_3");

        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "BodyHitBox";
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0f, 1.2f, 0f);
        body.transform.localScale    = new Vector3(0.85f, 1.1f, 0.85f);
        body.layer = LayerEnemyBody;
        body.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.10f, 0.10f, 0.10f));

        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "HeadHitBox";
        head.transform.SetParent(root.transform, false);
        head.transform.localPosition = new Vector3(0f, 2.5f, 0f);
        head.transform.localScale    = new Vector3(0.6f, 0.6f, 0.6f);
        head.layer = LayerEnemyHead;
        head.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.80f, 0.70f));

        // Gun hand — phase-3 weak point
        var gunHand = GameObject.CreatePrimitive(PrimitiveType.Cube);
        gunHand.name = "GunHandWeakPoint";
        gunHand.transform.SetParent(root.transform, false);
        gunHand.transform.localPosition = new Vector3(0.5f, 1.4f, 0.3f);
        gunHand.transform.localScale    = new Vector3(0.3f, 0.2f, 0.5f);
        gunHand.layer = LayerBossWeak;
        gunHand.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.30f, 0.30f));

        var boss = root.AddComponent<BossController>();
        var so = new SerializedObject(boss);
        so.FindProperty("maxHealth").intValue                = 30;
        so.FindProperty("phase2Threshold").floatValue        = 0.6f;
        so.FindProperty("phase3Threshold").floatValue        = 0.3f;
        so.FindProperty("weakPointHitsToInterrupt").intValue = 3;
        so.ApplyModifiedPropertiesWithoutUndo();

        var path = $"{EnemiesDir}/Enemy_Boss_3.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }

    // -------------------------------------------------------------------
    // Innocent
    // -------------------------------------------------------------------

    private static void CreateInnocentPrefab()
    {
        var root = new GameObject("Innocent_Civilian");

        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "Body";
        body.transform.SetParent(root.transform, false);
        body.transform.localPosition = new Vector3(0f, 1.0f, 0f);
        body.transform.localScale    = new Vector3(0.65f, 0.9f, 0.65f);
        body.layer = LayerInnocent;
        body.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.95f, 0.30f));

        root.AddComponent<InnocentController>();

        var path = $"{PrefabsRoot}/Innocent_Civilian.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }

    // -------------------------------------------------------------------
    // Weapon pickups
    // -------------------------------------------------------------------

    private static void CreatePickupPrefab(WeaponType type, Color color)
    {
        var root = GameObject.CreatePrimitive(PrimitiveType.Cube);
        root.name = $"Pickup_{type}";
        root.transform.localScale = new Vector3(0.4f, 0.2f, 0.7f);
        root.layer = LayerWeaponPickup;
        root.GetComponent<Renderer>().sharedMaterial = MakeMaterial(color);

        var pickup = root.AddComponent<WeaponPickup>();
        var so = new SerializedObject(pickup);
        so.FindProperty("weaponType").enumValueIndex = (int)type;
        so.ApplyModifiedPropertiesWithoutUndo();

        var path = $"{WeaponsDir}/Pickup_{type}.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }

    // -------------------------------------------------------------------
    // Explosive barrel
    // -------------------------------------------------------------------

    private static void CreateExplosiveBarrelPrefab()
    {
        var root = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        root.name = "ExplosiveBarrel";
        root.transform.localScale = new Vector3(0.7f, 0.8f, 0.7f);
        root.layer = LayerEnemyBody;   // shootable via EnemyBody layer
        root.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.85f, 0.30f, 0.10f));
        root.AddComponent<ExplosiveBarrel>();

        var path = $"{EnvDir}/ExplosiveBarrel.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }

    // -------------------------------------------------------------------
    // Helicopter (3 Gunman slots)
    // -------------------------------------------------------------------

    private static void CreateHelicopterPrefab()
    {
        var root = new GameObject("Helicopter");

        // Body (cube)
        var heliBody = GameObject.CreatePrimitive(PrimitiveType.Cube);
        heliBody.name = "HeliBody";
        heliBody.transform.SetParent(root.transform, false);
        heliBody.transform.localPosition = new Vector3(0f, 4f, 0f);
        heliBody.transform.localScale    = new Vector3(3.5f, 1.4f, 1.6f);
        heliBody.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.25f, 0.30f, 0.30f));

        // Rotor (thin cube on top)
        var rotor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rotor.name = "Rotor";
        rotor.transform.SetParent(root.transform, false);
        rotor.transform.localPosition = new Vector3(0f, 4.9f, 0f);
        rotor.transform.localScale    = new Vector3(5f, 0.05f, 0.2f);
        rotor.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.10f, 0.10f, 0.10f));

        // 3 Gunman slots — each a child with EnemyController (Gunman type)
        var gunmen = new EnemyController[3];
        var gunmenPositions = new[]
        {
            new Vector3(-1.2f, 3.6f, 0.7f),
            new Vector3( 0f,   3.6f, 0.7f),
            new Vector3( 1.2f, 3.6f, 0.7f),
        };

        for (int i = 0; i < 3; i++)
        {
            var slot = new GameObject($"GunmanSlot_{i}");
            slot.transform.SetParent(root.transform, false);
            slot.transform.localPosition = gunmenPositions[i];

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "BodyHitBox";
            body.transform.SetParent(slot.transform, false);
            body.transform.localScale = new Vector3(0.55f, 0.7f, 0.55f);
            body.layer = LayerEnemyBody;
            body.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.20f, 0.45f, 0.85f));

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "HeadHitBox";
            head.transform.SetParent(slot.transform, false);
            head.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            head.transform.localScale    = new Vector3(0.45f, 0.45f, 0.45f);
            head.layer = LayerEnemyHead;
            head.GetComponent<Renderer>().sharedMaterial = MakeMaterial(new Color(0.95f, 0.80f, 0.70f));

            var ctrl = slot.AddComponent<EnemyController>();
            var so = new SerializedObject(ctrl);
            so.FindProperty("enemyType").enumValueIndex = (int)EnemyType.Gunman;
            so.ApplyModifiedPropertiesWithoutUndo();
            gunmen[i] = ctrl;
        }

        var helicopter = root.AddComponent<HelicopterBattle>();
        var heliSo = new SerializedObject(helicopter);
        var arr = heliSo.FindProperty("gunmen");
        arr.arraySize = 3;
        for (int i = 0; i < 3; i++)
            arr.GetArrayElementAtIndex(i).objectReferenceValue = gunmen[i];
        heliSo.ApplyModifiedPropertiesWithoutUndo();

        var path = $"{EnemiesDir}/Helicopter.prefab";
        PrefabUtility.SaveAsPrefabAsset(root, path);
        Object.DestroyImmediate(root);
        Debug.Log($"[PrefabSetup] {path}");
    }
}
