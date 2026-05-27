using UnityEngine;

namespace VirtuaCop2
{
    /// Wooden cover that takes a few bullets to break. Player can shoot it to clear LoS
    /// or enemies behind it can use it as a partial shield. Tactical only — no damage.
    [RequireComponent(typeof(Collider))]
    public class DestructibleCover : MonoBehaviour
    {
        [SerializeField] private int hp = 3;
        [SerializeField] private GameObject visualRoot;     // optional separate visual GO to deactivate
        [SerializeField] private AudioClip  hitSfx;         // optional
        [SerializeField] private AudioClip  breakSfx;       // optional

        private int _hp;

        void Awake() => _hp = hp;

        /// Called by InputManager when the player's ray hits this collider.
        public void OnHit()
        {
            if (_hp <= 0) return;
            _hp--;
            if (hitSfx != null && AudioManager.Instance != null)
                AudioManager.Instance.PlayOneShot(hitSfx);

            if (_hp <= 0) Break();
        }

        private void Break()
        {
            if (breakSfx != null && AudioManager.Instance != null)
                AudioManager.Instance.PlayOneShot(breakSfx);
            if (visualRoot != null) visualRoot.SetActive(false);
            else                    gameObject.SetActive(false);
        }
    }
}
