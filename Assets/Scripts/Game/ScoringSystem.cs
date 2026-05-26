using System;
using UnityEngine;

namespace VirtuaCop2
{
    public class ScoringSystem : MonoBehaviour
    {
        public static ScoringSystem Instance { get; private set; }

        public int TotalScore { get; private set; }
        public int ComboCount { get; private set; }
        public int HiScore    { get; private set; }

        public event Action<int> OnScoreChanged;

        private const string HiScoreKey = "HiScore";

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void Initialize()
        {
            TotalScore = 0;
            ComboCount = 0;
            HiScore    = PlayerPrefs.GetInt(HiScoreKey, 0);
            OnScoreChanged?.Invoke(TotalScore);
        }

        public void AddKill(KillType killType, float timeAfterEmerge)
        {
            ComboCount++;
            int points = ScoringCalculator.CalculateKillScore(killType, timeAfterEmerge)
                       + ScoringCalculator.CalculateComboBonus(ComboCount);
            AddScore(points);
        }

        public void ResetCombo() => ComboCount = 0;

        public void AddStageClearBonus(int remainingHealth, float remainingSeconds)
        {
            AddScore(ScoringCalculator.CalculateStageClearBonus(remainingHealth, remainingSeconds));
        }

        private void AddScore(int points)
        {
            TotalScore += points;
            if (TotalScore > HiScore)
            {
                HiScore = TotalScore;
                PlayerPrefs.SetInt(HiScoreKey, HiScore);
            }
            OnScoreChanged?.Invoke(TotalScore);
        }

        public void Reset()
        {
            TotalScore = 0;
            ComboCount = 0;
        }
    }
}
