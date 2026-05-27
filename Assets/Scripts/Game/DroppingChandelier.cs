using System.Collections;
using UnityEngine;

namespace VirtuaCop2
{
    /// Chandelier that takes 1 hit to break the chain, falls 2 m over 0.4 s, then
    /// applies AoE damage to enemies within radius. Reuses the AoE pattern from
    /// ExplosiveBarrel but with a falling-animation lead-in.
    [RequireComponent(typeof(Collider))]
    public class DroppingChandelier : MonoBehaviour
    {
        [SerializeField] private float fallDistance = 2.5f;
        [SerializeField] private float fallDuration = 0.4f;
        [SerializeField] private float aoeRadius    = 4.0f;
        [SerializeField] private LayerMask enemyMask = ~0;
        [SerializeField] private AudioClip crashSfx;
        [SerializeField] private GameObject chainVisual; // optional cylinder going up

        private bool _triggered;

        public void OnHit()
        {
            if (_triggered) return;
            _triggered = true;
            if (chainVisual != null) chainVisual.SetActive(false);
            StartCoroutine(FallThenExplode());
        }

        private IEnumerator FallThenExplode()
        {
            float t = 0f;
            var start = transform.position;
            var end   = start + Vector3.down * fallDistance;
            while (t < fallDuration)
            {
                t += Time.deltaTime;
                transform.position = Vector3.Lerp(start, end, t / fallDuration);
                yield return null;
            }
            transform.position = end;

            if (crashSfx != null && AudioManager.Instance != null)
                AudioManager.Instance.PlayOneShot(crashSfx);

            var hits = Physics.OverlapSphere(transform.position, aoeRadius, enemyMask);
            foreach (var h in hits)
            {
                var enemy = h.GetComponent<EnemyController>();
                if (enemy != null) enemy.OnHit(HitZone.Head); // instant kill via headshot path
            }
        }
    }
}
