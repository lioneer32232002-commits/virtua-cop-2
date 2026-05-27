// Assets/Scripts/Game/BossController.cs
using System;
using UnityEngine;

namespace VirtuaCop2
{
    public class BossController : MonoBehaviour
    {
        [SerializeField] private int   maxHealth        = 20;
        [SerializeField] private float phase2Threshold  = 0.5f;  // 50% HP
        [SerializeField] private float phase3Threshold  = 0.3f;  // 30% HP
        [SerializeField] private int   weakPointHitsToInterrupt = 3; // Stage 3 boss only

        public int  CurrentHealth { get; private set; }
        public int  CurrentPhase  { get; private set; } = 1;

        public event Action<int> OnPhaseChanged;    // arg: new phase (2 or 3)
        public event Action      OnDefeated;

        private int weakPointHitCount = 0;

        void Awake()
        {
            var d = DifficultyService.Active;
            float mul = d != null ? d.bossHpMul : 1f;
            maxHealth     = Mathf.Max(1, Mathf.RoundToInt(maxHealth * mul));
            CurrentHealth = maxHealth;
        }

        public void TakeDamage(int amount = 1)
        {
            if (CurrentHealth <= 0) return;
            CurrentHealth -= amount;

            ScoringSystem.Instance?.AddKill(KillType.Body, 0f);

            if (CurrentHealth <= 0) { Defeated(); return; }

            float ratio = (float)CurrentHealth / maxHealth;

            if (CurrentPhase == 1 && ratio <= phase2Threshold)
                TransitionToPhase(2);
            else if (CurrentPhase == 2 && ratio <= phase3Threshold)
                TransitionToPhase(3);
        }

        // Called by InputManager for BossWeakPoint layer hits
        public void OnWeakPointHit()
        {
            TakeDamage(1);
            weakPointHitCount++;

            if (CurrentPhase == 3 && weakPointHitCount >= weakPointHitsToInterrupt)
            {
                weakPointHitCount = 0;
                // Interrupt boss charge: trigger animation via event
                OnPhaseChanged?.Invoke(-1);   // -1 = interrupt signal
            }
        }

        private void TransitionToPhase(int phase)
        {
            CurrentPhase = phase;
            OnPhaseChanged?.Invoke(phase);
        }

        private void Defeated()
        {
            CurrentPhase = 0;
            OnDefeated?.Invoke();
        }
    }
}
