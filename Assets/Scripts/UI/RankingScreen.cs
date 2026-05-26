// Assets/Scripts/UI/RankingScreen.cs
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace VirtuaCop2
{
    public class RankingScreen : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI[] rankEntries;  // 5 entries: "1. AAA  123456"
        [SerializeField] private TMP_InputField    nameInput;    // max 3 chars
        [SerializeField] private Button            confirmButton;

        private const string PrefKeyPrefix = "Rank_";
        private const int    MaxEntries    = 5;

        void OnEnable()
        {
            nameInput.characterLimit = 3;
            nameInput.text           = "AAA";
            confirmButton.onClick.AddListener(SaveScore);
            RefreshDisplay();
        }

        void OnDisable() => confirmButton.onClick.RemoveListener(SaveScore);

        private void SaveScore()
        {
            string name  = nameInput.text.ToUpper().PadRight(3, '_')[..3];
            int    score = ScoringSystem.Instance.TotalScore;

            // Load existing, insert, sort, save top 5
            var entries = LoadEntries();
            entries.Add((name, score));
            entries.Sort((a, b) => b.score.CompareTo(a.score));
            if (entries.Count > MaxEntries) entries.RemoveRange(MaxEntries, entries.Count - MaxEntries);

            for (int i = 0; i < entries.Count; i++)
            {
                PlayerPrefs.SetString($"{PrefKeyPrefix}{i}_name",  entries[i].name);
                PlayerPrefs.SetInt   ($"{PrefKeyPrefix}{i}_score", entries[i].score);
            }
            PlayerPrefs.Save();

            RefreshDisplay();
            GameManager.Instance.LoadMainMenu();
        }

        private System.Collections.Generic.List<(string name, int score)> LoadEntries()
        {
            var list = new System.Collections.Generic.List<(string, int)>();
            for (int i = 0; i < MaxEntries; i++)
            {
                if (!PlayerPrefs.HasKey($"{PrefKeyPrefix}{i}_name")) break;
                list.Add((
                    PlayerPrefs.GetString($"{PrefKeyPrefix}{i}_name"),
                    PlayerPrefs.GetInt   ($"{PrefKeyPrefix}{i}_score")
                ));
            }
            return list;
        }

        private void RefreshDisplay()
        {
            if (rankEntries == null || rankEntries.Length == 0) return;
            var entries = LoadEntries();
            for (int i = 0; i < rankEntries.Length; i++)
            {
                if (i < entries.Count)
                    rankEntries[i].text = $"{i + 1}. {entries[i].name}  {entries[i].score:D6}";
                else
                    rankEntries[i].text = $"{i + 1}. ---  000000";
            }
        }
    }
}
