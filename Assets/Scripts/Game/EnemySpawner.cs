using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Playables;

namespace VirtuaCop2
{
    public class EnemySpawner : MonoBehaviour
    {
        public static EnemySpawner Instance { get; private set; }

        [SerializeField] private GameObject[] enemyPrefabs;
        [SerializeField] private GameObject   innocentPrefab;

        [Serializable]
        public class WaveEntry
        {
            public bool      isInnocent;
            public EnemyType type;
            public Transform spawnPoint;
        }

        [Serializable]
        public class Wave
        {
            public string      id;
            public WaveEntry[] entries;
        }

        [SerializeField] private Wave[] waves;

        private readonly Dictionary<EnemyType, Queue<EnemyController>> pool = new();
        private readonly List<EnemyController>    activeEnemies   = new();
        private readonly List<InnocentController> activeInnocents = new();

        private int aliveCount = 0;

        public event Action OnWaveCleared;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;

            foreach (EnemyType t in Enum.GetValues(typeof(EnemyType)))
                pool[t] = new Queue<EnemyController>();
        }

        public void SpawnWave(string waveId)
        {
            if (waves == null) return;
            foreach (var wave in waves)
            {
                if (wave.id != waveId) continue;
                foreach (var entry in wave.entries)
                {
                    if (entry.spawnPoint == null) continue;
                    if (entry.isInnocent)
                        SpawnInnocentInternal(entry.spawnPoint);
                    else
                        SpawnEnemyInternal(entry.type, entry.spawnPoint);
                }
                return;
            }
        }

        public void SpawnEnemy(string enemyTypeName, Transform spawnPoint)
        {
            if (!Enum.TryParse(enemyTypeName, out EnemyType type)) return;
            SpawnEnemyInternal(type, spawnPoint);
        }

        public void SpawnInnocent(Transform spawnPoint)
        {
            SpawnInnocentInternal(spawnPoint);
        }

        private void SpawnEnemyInternal(EnemyType type, Transform spawnPoint)
        {
            var enemy = GetFromPool(type, spawnPoint);
            if (enemy == null) return;
            activeEnemies.Add(enemy);
            aliveCount++;
            enemy.OnDied += OnEnemyDied;

            var d = DifficultyService.Active;
            float hpMul     = d != null ? d.enemyHpMul    : 1f;
            float aimingMul = d != null ? d.enemyAimingMul : 1f;
            enemy.Initialize(hpMul, aimingMul);

            enemy.Emerge();
        }

        private void SpawnInnocentInternal(Transform spawnPoint)
        {
            if (innocentPrefab == null) return;
            var go       = Instantiate(innocentPrefab, spawnPoint.position, spawnPoint.rotation);
            var innocent = go.GetComponent<InnocentController>();
            if (innocent != null)
            {
                activeInnocents.Add(innocent);
                innocent.Emerge();
            }
        }

        private void OnEnemyDied(EnemyController enemy)
        {
            enemy.OnDied -= OnEnemyDied;
            activeEnemies.Remove(enemy);
            ReturnToPool(enemy);
            aliveCount = Mathf.Max(0, aliveCount - 1);

            if (aliveCount == 0)
                OnWaveCleared?.Invoke();
        }

        private EnemyController GetFromPool(EnemyType type, Transform spawnPoint)
        {
            if (pool[type].Count > 0)
            {
                var pooled = pool[type].Dequeue();
                pooled.transform.SetPositionAndRotation(spawnPoint.position, spawnPoint.rotation);
                pooled.gameObject.SetActive(true);
                return pooled;
            }

            int prefabIndex = (int)type;
            if (enemyPrefabs == null || prefabIndex < 0 || prefabIndex >= enemyPrefabs.Length) return null;
            var prefab = enemyPrefabs[prefabIndex];
            if (prefab == null) return null;
            var go = Instantiate(prefab, spawnPoint.position, spawnPoint.rotation);
            return go.GetComponent<EnemyController>();
        }

        private void ReturnToPool(EnemyController enemy)
        {
            pool[enemy.Type].Enqueue(enemy);
        }

        public void ClearAllActiveEnemies()
        {
            foreach (var e in activeEnemies)
            {
                e.OnDied -= OnEnemyDied;
                e.gameObject.SetActive(false);
                ReturnToPool(e);
            }
            activeEnemies.Clear();
            aliveCount = 0;
        }

        /// <summary>
        /// Allows external systems (e.g. HelicopterBattle) to fire the OnWaveCleared event
        /// without tracking aliveCount themselves.
        /// </summary>
        public void TriggerWaveCleared()
        {
            OnWaveCleared?.Invoke();
        }
    }
}
