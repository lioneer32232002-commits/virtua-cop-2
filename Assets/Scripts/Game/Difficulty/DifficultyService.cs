using UnityEngine;

namespace VirtuaCop2
{
    /// Static accessor for the currently selected difficulty.
    /// Reads from PlayerPrefs and loads the matching ScriptableObject from Resources.
    /// Falls back to Normal if storage is missing or asset load fails.
    public static class DifficultyService
    {
        private const string PrefKey = "difficulty";

        private static DifficultySettings _active;

        public static DifficultySettings Active
        {
            get
            {
                if (_active == null) Initialize();
                return _active;
            }
        }

        public static void Initialize()
        {
            int stored = PlayerPrefs.GetInt(PrefKey, (int)DifficultyLevel.Normal);
            var level  = (DifficultyLevel)Mathf.Clamp(stored, 0, 2);
            _active    = LoadAsset(level) ?? LoadAsset(DifficultyLevel.Normal);
            if (_active == null)
            {
                Debug.LogWarning("[DifficultyService] No DifficultySettings asset found in Resources/Difficulty/, using runtime defaults.");
                _active = ScriptableObject.CreateInstance<DifficultySettings>();
            }
        }

        public static void Apply(DifficultyLevel level)
        {
            PlayerPrefs.SetInt(PrefKey, (int)level);
            PlayerPrefs.Save();
            _active = LoadAsset(level) ?? _active;
        }

        private static DifficultySettings LoadAsset(DifficultyLevel level)
        {
            return Resources.Load<DifficultySettings>($"Difficulty/DifficultySettings_{level}");
        }
    }
}
