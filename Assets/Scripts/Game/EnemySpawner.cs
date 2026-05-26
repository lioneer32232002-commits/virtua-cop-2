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

        public void SpawnEnemy(string enemyTypeName, Transform spawnPoint)
        {
            if (!Enum.TryParse(enemyTypeName, out EnemyType type)) return;
            var enemy = GetFromPool(type, spawnPoint);
            activeEnemies.Add(enemy);
            aliveCount++;
            enemy.OnDied += OnEnemyDied;
            enemy.Emerge();
        }

        public void SpawnInnocent(Transform spawnPoint)
        {
            var go       = Instantiate(innocentPrefab, spawnPoint.position, spawnPoint.rotation);
            var innocent = go.GetComponent<InnocentController>();
            activeInnocents.Add(innocent);
            innocent.Emerge();
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
            var go          = Instantiate(enemyPrefabs[prefabIndex], spawnPoint.position, spawnPoint.rotation);
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
    }
}
