using System;
using UnityEngine;

namespace VirtuaCop2
{
    public class PlayerController : MonoBehaviour
    {
        public static PlayerController Instance { get; private set; }

        [SerializeField] private int maxHealth = 5;
        [SerializeField] private int maxContinues = 3;

        public int Health { get; private set; }
        public int Continues { get; private set; }

        public event Action<int> OnHealthChanged;
        public event Action OnDeath;
        public event Action OnGameOver;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void Initialize()
        {
            Health = maxHealth;
            Continues = maxContinues;
            OnHealthChanged?.Invoke(Health);
        }

        public void TakeDamage(int amount = 1)
        {
            if (Health <= 0) return;
            Health = Mathf.Max(0, Health - amount);
            OnHealthChanged?.Invoke(Health);

            if (Health > 0) return;

            if (Continues > 0)
                OnDeath?.Invoke();
            else
                OnGameOver?.Invoke();
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
