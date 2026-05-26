// Assets/Scripts/UI/ContinueScreen.cs
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace VirtuaCop2
{
    public class ContinueScreen : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI countdownText;
        [SerializeField] private Button          yesButton;
        [SerializeField] private Button          noButton;

        private const float CountdownDuration = 10f;

        void OnEnable()
        {
            yesButton.onClick.AddListener(OnYes);
            noButton.onClick.AddListener(OnNo);
            StartCoroutine(Countdown());
        }

        void OnDisable()
        {
            yesButton.onClick.RemoveListener(OnYes);
            noButton.onClick.RemoveListener(OnNo);
            StopAllCoroutines();
        }

        private IEnumerator Countdown()
        {
            float remaining = CountdownDuration;
            while (remaining > 0f)
            {
                countdownText.text = Mathf.CeilToInt(remaining).ToString();
                yield return new WaitForSeconds(0.1f);
                remaining -= 0.1f;
            }
            // Auto-select No when countdown hits 0
            OnNo();
        }

        private void OnYes()
        {
            bool ok = PlayerController.Instance.UseContinue();
            if (!ok) { OnNo(); return; }
            GameManager.Instance.SetState(GameState.Playing);
        }

        private void OnNo()
        {
            GameManager.Instance.SetState(GameState.GameOver);
        }
    }
}
