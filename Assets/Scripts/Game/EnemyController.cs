using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace VirtuaCop2
{
    public enum EnemyState { Hidden, Emerging, Aiming, Firing, Dead }
    public enum EnemyType  { Grunt, Gunman, Heavy, Fast }
    public enum HitZone    { Body, Head, Weapon }

    [Serializable]
    public class EnemyTypeConfig
    {
        public EnemyType type;
        public float     aimingDuration;
        public int       health;
        public bool      hasWeapon;
        public bool      bodyArmorHead;
    }

    public class EnemyController : MonoBehaviour
    {
        public static readonly Dictionary<EnemyType, EnemyTypeConfig> TypeConfig = new()
        {
            [EnemyType.Grunt]  = new EnemyTypeConfig { type = EnemyType.Grunt,  aimingDuration = 2.5f, health = 1, hasWeapon = false, bodyArmorHead = false },
            [EnemyType.Gunman] = new EnemyTypeConfig { type = EnemyType.Gunman, aimingDuration = 2.0f, health = 1, hasWeapon = true,  bodyArmorHead = false },
            [EnemyType.Heavy]  = new EnemyTypeConfig { type = EnemyType.Heavy,  aimingDuration = 3.0f, health = 3, hasWeapon = false, bodyArmorHead = true  },
            [EnemyType.Fast]   = new EnemyTypeConfig { type = EnemyType.Fast,   aimingDuration = 1.2f, health = 1, hasWeapon = false, bodyArmorHead = false },
        };

        [SerializeField] private EnemyType  enemyType = EnemyType.Grunt;
        [SerializeField] private float      emergeDuration = 0.5f;
        [SerializeField] private GameObject weaponPickupPrefab;
        [SerializeField] private Transform  weaponHoldPoint;

        public EnemyState State      { get; private set; } = EnemyState.Hidden;
        public EnemyType  Type       => enemyType;
        public float      EmergeTime { get; private set; }

        private int       currentHealth;
        private Coroutine activeCoroutine;

        public event Action<EnemyController> OnDied;

        void Awake() => currentHealth = TypeConfig[enemyType].health;

        public void Emerge()
        {
            if (State != EnemyState.Hidden) return;
            activeCoroutine = StartCoroutine(EmergeSequence());
        }

        private IEnumerator EmergeSequence()
        {
            SetState(EnemyState.Emerging);
            yield return new WaitForSeconds(emergeDuration);

            EmergeTime = Time.time;
            SetState(EnemyState.Aiming);

            float aimDuration = TypeConfig[enemyType].aimingDuration;
            yield return new WaitForSeconds(aimDuration);

            SetState(EnemyState.Firing);
            PlayerController.Instance?.TakeDamage(1);
            yield return new WaitForSeconds(0.3f);

            SetState(EnemyState.Aiming);
            activeCoroutine = StartCoroutine(LoopAimFire());
        }

        private IEnumerator LoopAimFire()
        {
            while (State != EnemyState.Dead)
            {
                yield return new WaitForSeconds(TypeConfig[enemyType].aimingDuration);
                if (State == EnemyState.Dead) yield break;
                SetState(EnemyState.Firing);
                PlayerController.Instance?.TakeDamage(1);
                yield return new WaitForSeconds(0.3f);
                if (State != EnemyState.Dead) SetState(EnemyState.Aiming);
            }
        }

        public void OnHit(HitZone zone)
        {
            if (State == EnemyState.Dead || State == EnemyState.Hidden) return;

            var cfg = TypeConfig[enemyType];

            switch (zone)
            {
                case HitZone.Head:
                    Kill(KillType.HeadShot);
                    break;
                case HitZone.Weapon:
                    if (cfg.hasWeapon) Disarm();
                    else ApplyBodyDamage(cfg);
                    break;
                case HitZone.Body:
                    if (!cfg.bodyArmorHead)
                        ApplyBodyDamage(cfg);
                    break;
            }
        }

        private void ApplyBodyDamage(EnemyTypeConfig cfg)
        {
            currentHealth--;
            if (currentHealth <= 0) Kill(KillType.Body);
        }

        private void Disarm()
        {
            if (weaponPickupPrefab != null && weaponHoldPoint != null)
                Instantiate(weaponPickupPrefab, weaponHoldPoint.position, Quaternion.identity);
            Kill(KillType.Disarm);
        }

        private void Kill(KillType killType)
        {
            if (activeCoroutine != null) StopCoroutine(activeCoroutine);
            SetState(EnemyState.Dead);

            float timeAfterEmerge = Time.time - EmergeTime;
            ScoringSystem.Instance?.AddKill(killType, timeAfterEmerge);
            OnDied?.Invoke(this);

            StartCoroutine(DieSequence());
        }

        private IEnumerator DieSequence()
        {
            yield return new WaitForSeconds(2f);
            gameObject.SetActive(false);
        }

        private void SetState(EnemyState newState) => State = newState;
    }
}
