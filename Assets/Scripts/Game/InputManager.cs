using UnityEngine;

namespace VirtuaCop2
{
    [RequireComponent(typeof(Camera))]
    public class InputManager : MonoBehaviour
    {
        public static InputManager Instance { get; private set; }

        private Camera mainCam;

        private int LayerEnemyBody;
        private int LayerEnemyHead;
        private int LayerEnemyWeapon;
        private int LayerInnocent;
        private int LayerWeaponPickup;
        private int LayerBossWeak;
        private LayerMask ShootableMask;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            mainCam  = GetComponent<Camera>();

            LayerEnemyBody    = LayerMask.NameToLayer("EnemyBody");
            LayerEnemyHead    = LayerMask.NameToLayer("EnemyHead");
            LayerEnemyWeapon  = LayerMask.NameToLayer("EnemyWeapon");
            LayerInnocent     = LayerMask.NameToLayer("Innocent");
            LayerWeaponPickup = LayerMask.NameToLayer("WeaponPickup");
            LayerBossWeak     = LayerMask.NameToLayer("BossWeakPoint");

            ShootableMask =
                (1 << LayerEnemyBody)
                | (1 << LayerEnemyHead)
                | (1 << LayerEnemyWeapon)
                | (1 << LayerInnocent)
                | (1 << LayerWeaponPickup)
                | (1 << LayerBossWeak);
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

            var data = WeaponSystem.Stats[WeaponSystem.Instance.CurrentWeapon];

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
