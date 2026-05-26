using System.Collections;
using UnityEngine;

namespace VirtuaCop2
{
    public class InnocentController : MonoBehaviour
    {
        [SerializeField] private float visibleDuration = 3f;

        public bool IsAlive { get; private set; } = true;

        public void Emerge()
        {
            IsAlive = true;
            gameObject.SetActive(true);
            StartCoroutine(AppearSequence());
        }

        private IEnumerator AppearSequence()
        {
            yield return new WaitForSeconds(0.5f);
            yield return new WaitForSeconds(visibleDuration);
            Flee();
        }

        private void Flee()
        {
            IsAlive = false;
            gameObject.SetActive(false);
        }

        public void OnShot()
        {
            if (!IsAlive) return;
            IsAlive = false;
            StopAllCoroutines();
            PlayerController.Instance?.TakeDamage(1);
            HUDManager.Instance?.TriggerInnocentFlash();
            ScoringSystem.Instance?.ResetCombo();
            AudioManager.Instance?.PlayInnocent();
            gameObject.SetActive(false);
        }
    }
}
