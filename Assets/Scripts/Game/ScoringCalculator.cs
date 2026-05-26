using System.Collections.Generic;
using UnityEngine;

namespace VirtuaCop2
{
    public enum KillType { Body, HeadShot, Disarm }

    public static class ScoringCalculator
    {
        public static readonly Dictionary<KillType, int> BasePoints = new()
        {
            [KillType.Body]    = 100,
            [KillType.HeadShot]= 300,
            [KillType.Disarm]  = 500,
        };

        public const float SpeedBonusWindow     = 1f;
        public const float SpeedBonusMultiplier = 2f;
        public const int   ComboThreshold       = 5;
        public const int   ComboBonus           = 1000;

        public static int CalculateKillScore(KillType killType, float timeAfterEmerge)
        {
            int   baseScore  = BasePoints[killType];
            float multiplier = (timeAfterEmerge <= SpeedBonusWindow)
                ? SpeedBonusMultiplier : 1f;
            return Mathf.RoundToInt(baseScore * multiplier);
        }

        public static int CalculateStageClearBonus(int remainingHealth, float remainingSeconds)
        {
            return remainingHealth * 1000 + Mathf.RoundToInt(remainingSeconds * 10f);
        }

        public static int CalculateComboBonus(int comboCount)
        {
            return (comboCount > 0 && comboCount % ComboThreshold == 0) ? ComboBonus : 0;
        }
    }
}
