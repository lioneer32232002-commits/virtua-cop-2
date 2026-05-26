using UnityEngine;

namespace VirtuaCop2
{
    [RequireComponent(typeof(Camera))]
    public class InputManager : MonoBehaviour
    {
        public static InputManager Instance { get; private set; }

        private Camera mainCam;

        private static readonly int LayerEnemyBody    = LayerMask.NameToLayer("EnemyBody");
        private static readonly int LayerEnemyHead    = LayerMask.NameToLayer("EnemyHead");
        private static readonly int LayerEnemyWeapon  = LayerMask.NameToLayer("EnemyWeapon");
        private static readonly int LayerInnocent     = LayerMask.NameToLayer("Innocent");
        private static readonly int LayerWeaponPickup = LayerMask.NameToLayer("WeaponPickup");
        private static readonly int LayerBossWeak     = LayerMask.NameToLayer("BossWeakPoint");

        private static readonly LayerMask ShootableMask =
            (1 << LayerMask.NameToLayer("EnemyBody"))
            | (1 << LayerMask.NameToLayer("EnemyHead"))
            | (1 << LayerMask.NameToLayer("EnemyWeapon"))
            | (1 << LayerMask.NameToLayer("Innocent"))
            | (1 << LayerMask.NameToLayer("WeaponPickup"))
            | (1 << LayerMask.NameToLayer("BossWeakPoint"));

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            mainCam  = GetComponent<Camera>();
        }

        void Update()
        {
            HandleReloadInput();

            if (Input.GetMouseButtonDown(0))
                HandleFire();
        }

        private void HandleReloadInput()
        {
            if (Input.GetKeyDown(KeyCode.R))
            {
                WeaponSystem.Instance?.StartReload();
                return;
            }

            Vector3 mp = Input.mousePosition;
            bool offScreen = mp.x < 0 || mp.x > Screen.width || mp.y < 0 || mp.y > Screen.height;
            if (offScreen && Input.GetMouseButton(0))
                WeaponSystem.Instance?.StartReload();
        }

        private void HandleFire()
        {
            if (WeaponSystem.Instance == null) return;

            var data = WeaponSystem.Instance.Stats[WeaponSystem.Instance.CurrentWeapon];

            for (int i = 0; i < data.pellets; i++)
            {
                Vector3 screenPos = Input.mousePosition;

                if (data.pellets > 1)
                {
                    float spread = data.spreadAngle;
                    screenPos += new Vector3(
                        Random.Range(-spread, spread) * Screen.width  / 100f,
                        Random.Range(-spread, spread) * Screen.height / 100f,
                        0f);
                }

                Ray ray = mainCam.ScreenPointToRay(screenPos);

                if (!Physics.Raycast(ray, out RaycastHit hit, 100f, ShootableMask))
                    continue;

                int hitLayer = hit.collider.gameObject.layer;

                if (hitLayer == LayerEnemyBody)
                    hit.collider.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Body);
                else if (hitLayer == LayerEnemyHead)
                    hit.collider.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Head);
                else if (hitLayer == LayerEnemyWeapon)
                    hit.collider.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Weapon);
                else if (hitLayer == LayerInnocent)
                    hit.collider.GetComponent<InnocentController>()?.OnShot();
                else if (hitLayer == LayerWeaponPickup)
                    hit.collider.GetComponent<WeaponPickup>()?.OnShot();
                else if (hitLayer == LayerBossWeak)
                    hit.collider.GetComponentInParent<BossController>()?.OnWeakPointHit();
            }

            WeaponSystem.Instance.TryFire();
        }
    }
}
