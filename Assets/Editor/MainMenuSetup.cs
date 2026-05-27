// Assets/Editor/MainMenuSetup.cs
// Builds Assets/Scenes/MainMenu.unity programmatically.
//   Unity.exe -batchmode -nographics -projectPath <p> -executeMethod MainMenuSetup.CreateMainMenu -quit -logFile <log>
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using VirtuaCop2;

public static class MainMenuSetup
{
    private const string ScenePath = "Assets/Scenes/MainMenu.unity";

    public static void CreateMainMenu()
    {
        Debug.Log("[MainMenuSetup] Building MainMenu scene...");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // Camera (solid color background)
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        var cam = camGo.AddComponent<Camera>();
        cam.clearFlags      = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.04f, 0.05f, 0.08f);
        camGo.AddComponent<AudioListener>();

        // EventSystem so UI buttons fire
        var es = new GameObject("EventSystem");
        es.AddComponent<UnityEngine.EventSystems.EventSystem>();
        es.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();

        // Canvas + Scaler
        var canvasGo = new GameObject("MenuCanvas");
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 10;
        var scaler = canvasGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode             = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution     = new Vector2(1920f, 1080f);
        scaler.matchWidthOrHeight      = 0.5f;
        canvasGo.AddComponent<GraphicRaycaster>();
        var controller = canvasGo.AddComponent<MainMenuController>();

        var uiSprite = Resources.GetBuiltinResource<Sprite>("UI/Skin/UISprite.psd");
        var font     = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        if (font == null) font = Resources.GetBuiltinResource<Font>("Arial.ttf");

        // Title
        var title = MakeUI("Title", canvasGo.transform);
        var trt = title.GetComponent<RectTransform>();
        trt.anchorMin = new Vector2(0.5f, 1f);
        trt.anchorMax = new Vector2(0.5f, 1f);
        trt.pivot     = new Vector2(0.5f, 1f);
        trt.anchoredPosition = new Vector2(0, -160);
        trt.sizeDelta = new Vector2(1200, 100);
        var titleText = title.AddComponent<Text>();
        titleText.font     = font;
        titleText.fontSize = 84;
        titleText.fontStyle = FontStyle.Bold;
        titleText.alignment = TextAnchor.MiddleCenter;
        titleText.color    = new Color(1f, 0.9f, 0.6f);
        titleText.text     = "VIRTUA COP 2 — REMAKE";

        // Subtitle
        var sub = MakeUI("Subtitle", canvasGo.transform);
        var srt = sub.GetComponent<RectTransform>();
        srt.anchorMin = new Vector2(0.5f, 1f);
        srt.anchorMax = new Vector2(0.5f, 1f);
        srt.pivot     = new Vector2(0.5f, 1f);
        srt.anchoredPosition = new Vector2(0, -290);
        srt.sizeDelta = new Vector2(800, 50);
        var subText = sub.AddComponent<Text>();
        subText.font     = font;
        subText.fontSize = 36;
        subText.alignment = TextAnchor.MiddleCenter;
        subText.color    = Color.white;
        subText.text     = "SELECT DIFFICULTY";

        // 3 buttons centered horizontally
        var (easy,   easyBtn)   = MakeButton("EasyButton",   "EASY",   new Color(0.30f, 0.70f, 0.40f), canvasGo.transform, font, uiSprite, new Vector2(-320, -50));
        var (normal, normalBtn) = MakeButton("NormalButton", "NORMAL", new Color(0.30f, 0.45f, 0.85f), canvasGo.transform, font, uiSprite, new Vector2(   0, -50));
        var (hard,   hardBtn)   = MakeButton("HardButton",   "HARD",   new Color(0.85f, 0.30f, 0.30f), canvasGo.transform, font, uiSprite, new Vector2( 320, -50));

        // Hint
        var hint = MakeUI("Hint", canvasGo.transform);
        var hrt = hint.GetComponent<RectTransform>();
        hrt.anchorMin = new Vector2(0.5f, 0f);
        hrt.anchorMax = new Vector2(0.5f, 0f);
        hrt.pivot     = new Vector2(0.5f, 0f);
        hrt.anchoredPosition = new Vector2(0, 60);
        hrt.sizeDelta = new Vector2(900, 40);
        var hintText = hint.AddComponent<Text>();
        hintText.font     = font;
        hintText.fontSize = 22;
        hintText.alignment = TextAnchor.MiddleCenter;
        hintText.color    = new Color(0.8f, 0.8f, 0.8f);
        hintText.text     = "EASY: 5 conts | NORMAL: 3 conts | HARD: 1 cont";

        // Wire to controller
        var so = new SerializedObject(controller);
        so.FindProperty("easyButton").objectReferenceValue   = easyBtn;
        so.FindProperty("normalButton").objectReferenceValue = normalBtn;
        so.FindProperty("hardButton").objectReferenceValue   = hardBtn;
        so.ApplyModifiedPropertiesWithoutUndo();

        // Lighting
        RenderSettings.ambientMode  = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.4f, 0.4f, 0.45f);

        EditorSceneManager.MarkSceneDirty(scene);
        EnsureScenesFolder();
        EditorSceneManager.SaveScene(scene, ScenePath);

        AddSceneToBuildSettingsAtIndex(ScenePath, 0);

        Debug.Log($"[MainMenuSetup] {ScenePath} saved and registered at build index 0.");
    }

    private static (GameObject go, Button btn) MakeButton(string name, string label, Color bg, Transform parent, Font font, Sprite uiSprite, Vector2 pos)
    {
        var go = MakeUI(name, parent);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = new Vector2(0.5f, 0.5f);
        rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot     = new Vector2(0.5f, 0.5f);
        rt.anchoredPosition = pos;
        rt.sizeDelta = new Vector2(280, 110);

        var img = go.AddComponent<Image>();
        img.sprite = uiSprite;
        img.color  = bg;
        img.type   = Image.Type.Sliced;

        var btn = go.AddComponent<Button>();
        var colors = btn.colors;
        colors.normalColor   = Color.white;
        colors.highlightedColor = new Color(1f, 1f, 1f, 0.85f);
        colors.pressedColor  = new Color(0.7f, 0.7f, 0.7f, 1f);
        btn.colors = colors;

        var labelGo = MakeUI("Label", go.transform);
        var lrt = labelGo.GetComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero;
        lrt.anchorMax = Vector2.one;
        lrt.offsetMin = Vector2.zero;
        lrt.offsetMax = Vector2.zero;
        var t = labelGo.AddComponent<Text>();
        t.font      = font;
        t.fontSize  = 48;
        t.fontStyle = FontStyle.Bold;
        t.alignment = TextAnchor.MiddleCenter;
        t.color     = Color.white;
        t.text      = label;
        t.raycastTarget = false;

        return (go, btn);
    }

    private static GameObject MakeUI(string name, Transform parent)
    {
        var go = new GameObject(name, typeof(RectTransform));
        go.transform.SetParent(parent, false);
        return go;
    }

    private static void EnsureScenesFolder()
    {
        if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            AssetDatabase.CreateFolder("Assets", "Scenes");
    }

    private static void AddSceneToBuildSettingsAtIndex(string path, int index)
    {
        var list = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
        list.RemoveAll(s => s.path == path);
        list.Insert(Mathf.Clamp(index, 0, list.Count), new EditorBuildSettingsScene(path, true));
        EditorBuildSettings.scenes = list.ToArray();
    }
}
