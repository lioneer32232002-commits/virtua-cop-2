using UnityEngine;

namespace VirtuaCop2
{
    /// Attached to Boss-A to handle VIP release in Phase 3.
    [RequireComponent(typeof(BossController))]
    public class BossAPhase3 : MonoBehaviour
    {
        [SerializeField] private HostageController vip;
        [SerializeField] private Vector3 vipSafePosOffset = new Vector3(0, 0, -3f);

        private BossController _boss;

        void Awake()
        {
            _boss = GetComponent<BossController>();
            _boss.OnPhaseChanged += OnPhaseChanged;
        }

        void OnDestroy()
        {
            if (_boss != null) _boss.OnPhaseChanged -= OnPhaseChanged;
        }

        private void OnPhaseChanged(int phase)
        {
            if (phase == 3 && vip != null && !vip.Released)
            {
                vip.Release(transform.position + vipSafePosOffset);
            }
        }

        public void AssignVip(HostageController v) { vip = v; }
    }
}
