// Assets/Scripts/Game/HelicopterBattle.cs
using UnityEngine;

namespace VirtuaCop2
{
    public class HelicopterBattle : MonoBehaviour
    {
        [SerializeField] private EnemyController[] gunmen;   // 3 gunman slots

        private int defeatedCount = 0;
        private bool battleEnded = false;

        void Start()
        {
            if (gunmen == null || gunmen.Length == 0) return;
            foreach (var g in gunmen)
            {
                if (g != null)
                    g.OnDied += OnGunmanDefeated;
            }
        }

        private void OnGunmanDefeated(EnemyController enemy)
        {
            defeatedCount++;
            if (!battleEnded && defeatedCount >= gunmen.Length)
            {
                battleEnded = true;
                EnemySpawner.Instance?.TriggerWaveCleared();
            }
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
