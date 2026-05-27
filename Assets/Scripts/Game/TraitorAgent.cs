using System.Collections;
using UnityEngine;

namespace VirtuaCop2
{
    /// Boss-C: stands at attention for 2 s (looking like a friendly), red-flashes,
    /// then becomes aggressive. Subscribes to BossController.OnPhaseChanged for
    /// phase-2 mini-wave and phase-3 ceiling debris triggers.
    [RequireComponent(typeof(BossController))]
    public class TraitorAgent : MonoBehaviour
    {
        [SerializeField] private Renderer   bodyRenderer;            // tinted on reveal
        [SerializeField] private float      revealDelay = 2f;
        [SerializeField] private string     phase2WaveId = "boss4c_assist";
        [SerializeField] private CeilingDebris[] debrisChunks;       // scene refs, placed by Stage4Cfg

        private BossController _boss;
        private bool _revealed;

        void Awake()
        {
            _boss = GetComponent<BossController>();
            _boss.OnPhaseChanged += HandlePhaseChanged;
        }

        void OnDestroy()
        {
            if (_boss != null) _boss.OnPhaseChanged -= HandlePhaseChanged;
        }

        void Start()
        {
            StartCoroutine(RevealRoutine());
        }

        private IEnumerator RevealRoutine()
        {
            // Friendly stance
            if (bodyRenderer != null) bodyRenderer.material.color = new Color(0.85f, 0.85f, 0.85f);
            yield return new WaitForSeconds(revealDelay);

            // Red rim cue
            if (bodyRenderer != null) bodyRenderer.material.color = new Color(0.85f, 0.20f, 0.20f);
            _revealed = true;
        }

        private void HandlePhaseChanged(int newPhase)
        {
            if (newPhase == 2)
            {
                EnemySpawner.Instance?.SpawnWave(phase2WaveId);
            }
            else if (newPhase == 3)
            {
                if (debrisChunks == null) return;
                foreach (var d in debrisChunks)
                    if (d != null) d.TriggerFall();
            }
        }
    }
}
