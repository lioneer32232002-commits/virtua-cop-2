// Assets/Scripts/Game/HelicopterBattle.cs
using UnityEngine;

namespace VirtuaCop2
{
    public class HelicopterBattle : MonoBehaviour
    {
        [SerializeField] private EnemyController[] gunmen;   // 3 gunman slots

        private int defeatedCount = 0;

        void Start()
        {
            foreach (var g in gunmen)
            {
                if (g != null)
                    g.OnDied += OnGunmanDefeated;
            }
        }

        private void OnGunmanDefeated(EnemyController enemy)
        {
            defeatedCount++;
            if (defeatedCount >= gunmen.Length)
                EnemySpawner.Instance?.TriggerWaveCleared();
        }

        void OnDestroy()
        {
            foreach (var g in gunmen)
            {
                if (g != null)
                    g.OnDied -= OnGunmanDefeated;
            }
        }
    }
}
