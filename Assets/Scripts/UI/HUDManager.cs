// Assets/Scripts/UI/HUDManager.cs
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace VirtuaCop2
{
    public class HUDManager : MonoBehaviour
    {
        public static HUDManager Instance { get; private set; }

        [Header("Crosshair")]
        [SerializeField] private RectTransform crosshair;

        [Header("Health")]
        [SerializeField] private Image[] healthSlots;      // 5 heart sprites
        [SerializeField] private Sprite  heartFull;
        [SerializeField] private Sprite  heartEmpty;

        [Header("Weapon & Ammo")]
        [SerializeField] private TextMeshProUGUI weaponLabel;
        [SerializeField] private TextMeshProUGUI ammoText;
        [SerializeField] private GameObject      reloadBar;   // parent object
        [SerializeField] private Image           reloadFill;  // fill image

        [Header("Score")]
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private TextMeshProUGUI hiScoreText;

        [Header("Continue")]
        [SerializeField] private TextMeshProUGUI continueText;

        [Header("Flash")]
        [SerializeField] private Image innocentFlashPanel;   // full-screen red, alpha 0 normally

        private void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start()
        {
            PlayerController.Instance.OnHealthChanged += UpdateHealth;
            WeaponSystem.Instance.OnWeaponChanged      += (t, a) => { UpdateWeaponLabel(t); UpdateAmmo(a); };
            WeaponSystem.Instance.OnAmmoChanged        += UpdateAmmo;
            WeaponSystem.Instance.OnReloadStart        += ShowReloadBar;
            WeaponSystem.Instance.OnReloadEnd          += HideReloadBar;
            ScoringSystem.Instance.OnScoreChanged      += UpdateScore;

            HideReloadBar();
            innocentFlashPanel.color = new Color(1, 0, 0, 0);
        }

        void Update()
        {
            // Move crosshair to mouse position
            crosshair.position = Input.mousePosition;
        }

        public void UpdateHealth(int health)
        {
            for (int i = 0; i < healthSlots.Length; i++)
                healthSlots[i].sprite = (i < health) ? heartFull : heartEmpty;
        }

        public void UpdateWeaponLabel(WeaponType type)
        {
            weaponLabel.text = type switch
            {
                WeaponType.Pistol     => "PISTOL",
                WeaponType.MachineGun => "M.GUN",
                WeaponType.Shotgun    => "SHOTGUN",
                _                     => "?"
            };
        }

        public void UpdateAmmo(int ammo) => ammoText.text = ammo.ToString("D2");

        public void UpdateScore(int score)
        {
            scoreText.text   = score.ToString("D6");
            hiScoreText.text = ScoringSystem.Instance.HiScore.ToString("D6");
        }

        private void ShowReloadBar()
        {
            reloadBar.SetActive(true);
            StartCoroutine(AnimateReloadBar());
        }

        private void HideReloadBar()
        {
            StopCoroutine(nameof(AnimateReloadBar));
            reloadBar.SetActive(false);
        }

        private IEnumerator AnimateReloadBar()
        {
            float elapsed = 0f;
            float duration = 1.2f;  // must match WeaponSystem.ReloadDuration
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                reloadFill.fillAmount = elapsed / duration;
                yield return null;
            }
        }

        public void TriggerInnocentFlash()
        {
            StopCoroutine(nameof(InnocentFlash));
            StartCoroutine(InnocentFlash());
        }

        private IEnumerator InnocentFlash()
        {
            innocentFlashPanel.color = new Color(1, 0, 0, 0.4f);
            yield return new WaitForSeconds(0.2f);
            innocentFlashPanel.color = new Color(1, 0, 0, 0f);
        }
    }
}
