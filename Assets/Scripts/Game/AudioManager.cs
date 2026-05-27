// Assets/Scripts/Game/AudioManager.cs
using UnityEngine;

namespace VirtuaCop2
{
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [SerializeField] private AudioSource musicSource;
        [SerializeField] private AudioSource sfxSource;

        [Header("BGM")]
        [SerializeField] private AudioClip bgmStage1;
        [SerializeField] private AudioClip bgmStage2;
        [SerializeField] private AudioClip bgmStage3;
        [SerializeField] private AudioClip bgmStage4;
        [SerializeField] private AudioClip bgmBoss;
        [SerializeField] private AudioClip bgmBossFinal;

        [Header("SFX")]
        [SerializeField] private AudioClip sfxPistol;
        [SerializeField] private AudioClip sfxMachineGun;
        [SerializeField] private AudioClip sfxShotgun;
        [SerializeField] private AudioClip sfxReload;
        [SerializeField] private AudioClip sfxEnemyDeath;
        [SerializeField] private AudioClip sfxPlayerHit;
        [SerializeField] private AudioClip sfxInnocent;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        void Start()
        {
            if (WeaponSystem.Instance != null)
            {
                WeaponSystem.Instance.OnFired += () => PlaySFX(GetFireClip());
                WeaponSystem.Instance.OnReloadStart += () => PlaySFX(sfxReload);
            }
            if (PlayerController.Instance != null)
                PlayerController.Instance.OnHealthChanged += h => PlaySFX(sfxPlayerHit);
        }

        public void PlayBGM(int stageIndex)
        {
            AudioClip clip = stageIndex switch
            {
                1 => bgmStage1,
                2 => bgmStage2,
                3 => bgmStage3,
                4 => bgmStage4,
                _ => null
            };
            if (clip == null) return;
            if (musicSource == null) return;
            musicSource.clip = clip;
            musicSource.loop = true;
            musicSource.Play();
        }

        public void PlayBossBGM()
        {
            if (bgmBoss == null || musicSource == null) return;
            musicSource.clip = bgmBoss;
            musicSource.loop = true;
            musicSource.Play();
        }

        public void PlaySFX(AudioClip clip)
        {
            if (clip != null) sfxSource.PlayOneShot(clip);
        }

        public void PlayOneShot(AudioClip clip)
        {
            if (clip != null && sfxSource != null) sfxSource.PlayOneShot(clip);
        }

        public void PlayEnemyDeath() => PlaySFX(sfxEnemyDeath);
        public void PlayInnocent()   => PlaySFX(sfxInnocent);

        private AudioClip GetFireClip() => WeaponSystem.Instance.CurrentWeapon switch
        {
            WeaponType.Pistol     => sfxPistol,
            WeaponType.MachineGun => sfxMachineGun,
            WeaponType.Shotgun    => sfxShotgun,
            _                     => null
        };
    }
}
