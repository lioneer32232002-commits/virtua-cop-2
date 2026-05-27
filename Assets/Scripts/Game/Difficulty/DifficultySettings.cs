using UnityEngine;

namespace VirtuaCop2
{
    [CreateAssetMenu(fileName = "DifficultySettings", menuName = "VirtuaCop2/Difficulty Settings")]
    public class DifficultySettings : ScriptableObject
    {
        public DifficultyLevel level = DifficultyLevel.Normal;
        public float enemyHpMul         = 1.0f;
        public float enemyAimingMul     = 1.0f;   // higher = slower fire
        public float playerDamagePerHit = 1.0f;   // in hearts (0.5, 1, 2)
        public int   continuesAtStart   = 3;
        public float bossHpMul          = 1.0f;
    }
}
