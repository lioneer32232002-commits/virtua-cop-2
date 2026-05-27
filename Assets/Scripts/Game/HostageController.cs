using UnityEngine;

namespace VirtuaCop2
{
    /// VIP attached to Boss-A. Follows boss with offset until Phase 3, then drops to ground.
    /// Hitting the VIP while attached triggers a score+heart penalty.
    public class HostageController : MonoBehaviour
    {
        [SerializeField] private Transform boss;             // parent boss transform
        [SerializeField] private Vector3   offset = new Vector3(0.6f, 0, 0);  // left of boss
        [SerializeField] private int       scorePenalty = 5000;

        public bool Released { get; private set; }

        void LateUpdate()
        {
            if (Released || boss == null) return;
            transform.position = boss.position + offset;
            transform.rotation = boss.rotation;
        }

        public void Release(Vector3 safePos)
        {
            Released = true;
            transform.SetParent(null, true);
            transform.position = safePos;
        }

        public void AttachTo(Transform newBoss, Vector3 newOffset)
        {
            boss   = newBoss;
            offset = newOffset;
            Released = false;
        }

        /// Called by InputManager on Innocent-layer ray hit while VIP is attached.
        public void OnHitWhileAttached()
        {
            if (Released) return;
            ScoringSystem.Instance?.AddPenalty(scorePenalty);
            PlayerController.Instance?.TakeDamage();
            HUDManager.Instance?.TriggerInnocentFlash();
        }
    }
}
