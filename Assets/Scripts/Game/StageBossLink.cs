// Assets/Scripts/Game/StageBossLink.cs
using UnityEngine;

namespace VirtuaCop2
{
    /// <summary>
    /// Wires a BossController's OnDefeated event to StageDirector.OnStageEnd().
    /// Place on the same GameObject as the boss (or sibling) and assign the boss reference.
    /// </summary>
    public class StageBossLink : MonoBehaviour
    {
        [SerializeField] private BossController boss;

        void Start()
        {
            if (boss != null)
                boss.OnDefeated += HandleBossDefeated;
        }

        void OnDestroy()
        {
            if (boss != null)
                boss.OnDefeated -= HandleBossDefeated;
        }

        private void HandleBossDefeated()
        {
            StageDirector.Instance?.OnStageEnd();
        }
    }
}
