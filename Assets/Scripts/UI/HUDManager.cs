// Assets/Scripts/UI/HUDManager.cs
using System.Collections;
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
        [SerializeField] private Text       weaponLabel;
        [SerializeField] private Text       ammoText;
        [SerializeField] private GameObject reloadBar;   // parent object
        [SerializeField] private Image      reloadFill;  // fill image

        [Header("Score")]
        [SerializeField] private Text scoreText;
        [SerializeField] private Text hiScoreText;

        [Header("Continue")]
        [SerializeField] private Text continueText;

        [Header("Flash")]
        [SerializeField] private Image innocentFlashPanel;   // full-screen red, alpha 0 normally

        private void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        void Start()
        {
            if (PlayerController.Instance != null)
                PlayerController.Instance.OnHealthChanged += UpdateHealth;
            if (WeaponSystem.Instance != null)
            {
                WeaponSystem.Instance.OnWeaponChanged += (t, a) => { UpdateWeaponLabel(t); UpdateAmmo(a); };
                WeaponSystem.Instance.OnAmmoChanged   += UpdateAmmo;
                WeaponSystem.Instance.OnReloadStart   += ShowReloadBar;
                WeaponSystem.Instance.OnReloadEnd     += HideReloadBar;
            }
            if (ScoringSystem.Instance != null)
                ScoringSystem.Instance.OnScoreChanged += UpdateScore;

            HideReloadBar();
            if (innocentFlashPanel != null) innocentFlashPanel.color = new Color(1, 0, 0, 0);
        }

        void Update()
        {
            if (crosshair != null)
                crosshair.position = Input.mousePosition;
        }

        // Task 1.4 compat shim: signature widened to float to match PlayerController.OnHealthChanged.
        // Task 1.5 will replace with proper half-heart sprite logic.
        public void UpdateHealth(float health)
        {
            if (healthSlots == null) return;
            int wholeHearts = Mathf.FloorToInt(health);
            for (int i = 0; i < healthSlots.Length; i++)
            {
                if (healthSlots[i] == null) continue;
                healthSlots[i].sprite = (i < wholeHearts) ? heartFull : heartEmpty;
                healthSlots[i].color  = (i < wholeHearts) ? new Color(0.95f, 0.25f, 0.25f) : new Color(0.25f, 0.25f, 0.25f);
            }
        }

        public void UpdateWeaponLabel(WeaponType type)
        {
            if (weaponLabel == null) return;
            weaponLabel.text = type switch
            {
                WeaponType.Pistol     => "PISTOL",
                WeaponType.MachineGun => "M.GUN",
                WeaponType.Shotgun    => "SHOTGUN",
                _                     => "?"
            };
        }

        public void UpdateAmmo(int ammo)
        {
            if (ammoText != null) ammoText.text = ammo.ToString("D2");
        }

        public void UpdateScore(int score)
        {
            if (scoreText != null) scoreText.text   = score.ToString("D6");
            if (hiScoreText != null && ScoringSystem.Instance != null)
                hiScoreText.text = ScoringSystem.Instance.HiScore.ToString("D6");
        }

        private void ShowReloadBar()
        {
            if (reloadBar == null) return;
            reloadBar.SetActive(true);
            StartCoroutine(AnimateReloadBar());
        }

        private void HideReloadBar()
        {
            StopCoroutine(nameof(AnimateReloadBar));
            if (reloadBar != null) reloadBar.SetActive(false);
        }

        private IEnumerator AnimateReloadBar()
        {
            float elapsed = 0f;
            float duration = WeaponSystem.ReloadDuration;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                if (reloadFill != null) reloadFill.fillAmount = elapsed / duration;
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
            if (innocentFlashPanel == null) yield break;
            innocentFlashPanel.color = new Color(1, 0, 0, 0.4f);
            yield return new WaitForSeconds(0.2f);
            innocentFlashPanel.color = new Color(1, 0, 0, 0f);
        }
    }
}
