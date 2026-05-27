using System;
using UnityEngine;

namespace VirtuaCop2
{
    public class PlayerController : MonoBehaviour
    {
        public static PlayerController Instance { get; private set; }

        [SerializeField] private float maxHealth    = 5f;     // hearts
        [SerializeField] private int   fallbackContinues = 3; // overridden by DifficultyService.Active.continuesAtStart

        public float Health    { get; private set; }
        public int   Continues { get; private set; }

        public event Action<float> OnHealthChanged;
        public event Action OnDeath;
        public event Action OnGameOver;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void Initialize()
        {
            Health    = maxHealth;
            Continues = DifficultyService.Active?.continuesAtStart ?? fallbackContinues;
            OnHealthChanged?.Invoke(Health);
        }

        /// Single "hit" — damage taken is read from DifficultyService.Active (in hearts).
        /// Public surface stays parameterless because the original API took int amount=1.
        public void TakeDamage()
        {
            TakeDamageHearts(DifficultyService.Active?.playerDamagePerHit ?? 1f);
        }

        // Legacy parameterised callers (e.g. EnemyController) keep working.
        public void TakeDamage(int amount)
        {
            TakeDamageHearts(amount * (DifficultyService.Active?.playerDamagePerHit ?? 1f));
        }

        public void TakeDamageHearts(float hearts)
        {
            if (Health <= 0f) return;
            Health = Mathf.Max(0f, Health - hearts);
            OnHealthChanged?.Invoke(Health);

            if (Health > 0f) return;

            if (Continues > 0) OnDeath?.Invoke();
            else               OnGameOver?.Invoke();
        }

        public bool UseContinue()
        {
            if (Continues <= 0) return false;
            Continues--;
            Health = maxHealth;
            OnHealthChanged?.Invoke(Health);
            return true;
        }
    }
}
