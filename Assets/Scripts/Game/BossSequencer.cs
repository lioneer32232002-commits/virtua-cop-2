using System.Collections;
using UnityEngine;

namespace VirtuaCop2
{
    /// Chains a first boss to a second boss: on first OnDefeated, spawns the second
    /// boss after `delayBetween` seconds, then routes second OnDefeated to
    /// StageDirector.OnStageEnd. Replaces StageBossLink for Stage 4.
    public class BossSequencer : MonoBehaviour
    {
        [SerializeField] private BossController firstBoss;
        [SerializeField] private GameObject     secondBossPrefab;
        [SerializeField] private Transform      secondBossSpawnPoint;
        [SerializeField] private float          delayBetween = 1.5f;
        [SerializeField] private Transform      vipInstance;        // pre-placed in scene; will be re-parented under second boss
        [SerializeField] private Vector3        vipParentOffset = new Vector3(0.6f, 0, 0);

        void Start()
        {
            if (firstBoss != null) firstBoss.OnDefeated += OnFirstDefeated;
        }

        void OnDestroy()
        {
            if (firstBoss != null) firstBoss.OnDefeated -= OnFirstDefeated;
        }

        private void OnFirstDefeated()
        {
            StartCoroutine(SpawnSecond());
        }

        private IEnumerator SpawnSecond()
        {
            yield return new WaitForSeconds(delayBetween);

            if (secondBossPrefab == null) yield break;
            var pos = secondBossSpawnPoint != null ? secondBossSpawnPoint.position : transform.position;
            var go  = Instantiate(secondBossPrefab, pos, Quaternion.identity);

            var secondBoss = go.GetComponent<BossController>();
            var hostageCtl = vipInstance != null ? vipInstance.GetComponent<HostageController>() : null;
            if (hostageCtl != null)
            {
                vipInstance.SetParent(go.transform, true);
                hostageCtl.AttachTo(go.transform, vipParentOffset);
                var phase3 = go.GetComponent<BossAPhase3>();
                if (phase3 != null) phase3.AssignVip(hostageCtl);
            }

            if (secondBoss != null) secondBoss.OnDefeated += () => StageDirector.Instance?.OnStageEnd();
        }
    }
}
