using System.Collections;
using UnityEngine;

namespace VirtuaCop2
{
    /// Plaster chunk that drops from ceiling with a 0.5 s telegraph SFX before falling.
    /// On hitting the ground (after fall) it AoE-damages the player if close.
    public class CeilingDebris : MonoBehaviour
    {
        [SerializeField] private float telegraphDelay = 0.5f;
        [SerializeField] private float fallSpeed      = 6f;
        [SerializeField] private float groundY        = 0.2f;
        [SerializeField] private float damageRadius   = 1.5f;
        [SerializeField] private AudioClip warningSfx;
        [SerializeField] private AudioClip impactSfx;

        public void TriggerFall()
        {
            StartCoroutine(FallSequence());
        }

        private IEnumerator FallSequence()
        {
            if (warningSfx != null && AudioManager.Instance != null)
                AudioManager.Instance.PlayOneShot(warningSfx);

            yield return new WaitForSeconds(telegraphDelay);

            while (transform.position.y > groundY)
            {
                transform.position += Vector3.down * fallSpeed * Time.deltaTime;
                yield return null;
            }

            if (impactSfx != null && AudioManager.Instance != null)
                AudioManager.Instance.PlayOneShot(impactSfx);

            // AoE damage to player if close
            if (PlayerController.Instance != null)
            {
                // No player position concept (rail shooter) — just check world distance to dolly head.
                var camera = Camera.main;
                if (camera != null && Vector3.Distance(camera.transform.position, transform.position) < damageRadius)
                    PlayerController.Instance.TakeDamage();
            }

            yield return new WaitForSeconds(2f);
            gameObject.SetActive(false);
        }
    }
}
