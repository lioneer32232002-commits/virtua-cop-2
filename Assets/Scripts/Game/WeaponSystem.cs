using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace VirtuaCop2
{
    public enum WeaponType { Pistol, MachineGun, Shotgun }

    [Serializable]
    public class WeaponData
    {
        public WeaponType type;
        public int maxAmmo;
        public float fireRate;
        public int pellets;
        public float spreadAngle;
    }

    public class WeaponSystem : MonoBehaviour
    {
        public static WeaponSystem Instance { get; private set; }

        public static readonly Dictionary<WeaponType, WeaponData> Stats = new()
        {
            [WeaponType.Pistol]     = new WeaponData { type = WeaponType.Pistol,     maxAmmo = 10, fireRate = 0.30f, pellets = 1, spreadAngle = 0f },
            [WeaponType.MachineGun] = new WeaponData { type = WeaponType.MachineGun, maxAmmo = 30, fireRate = 0.08f, pellets = 1, spreadAngle = 0f },
            [WeaponType.Shotgun]    = new WeaponData { type = WeaponType.Shotgun,    maxAmmo =  6, fireRate = 0.60f, pellets = 5, spreadAngle = 4f },
        };

        public const float ReloadDuration = 1.2f;

        public WeaponType CurrentWeapon { get; private set; } = WeaponType.Pistol;
        public int CurrentAmmo { get; private set; }
        public bool IsReloading { get; private set; }

        public event Action<WeaponType, int> OnWeaponChanged;
        public event Action<int>             OnAmmoChanged;
        public event Action                  OnFired;
        public event Action                  OnReloadStart;
        public event Action                  OnReloadEnd;

        private float lastFireTime = -999f;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        public void Initialize()
        {
            CurrentWeapon = WeaponType.Pistol;
            CurrentAmmo   = Stats[WeaponType.Pistol].maxAmmo;
            IsReloading   = false;
            OnWeaponChanged?.Invoke(CurrentWeapon, CurrentAmmo);
        }

        public bool TryFire()
        {
            if (IsReloading) return false;
            if (CurrentAmmo <= 0) { StartReload(); return false; }

            var data = Stats[CurrentWeapon];
            if (Time.time - lastFireTime < data.fireRate) return false;

            lastFireTime = Time.time;
            CurrentAmmo--;
            OnAmmoChanged?.Invoke(CurrentAmmo);
            OnFired?.Invoke();

            if (CurrentAmmo <= 0 && CurrentWeapon != WeaponType.Pistol)
                SwitchToPistol();

            return true;
        }

        public void StartReload()
        {
            if (IsReloading) return;
            IsReloading = true;
            OnReloadStart?.Invoke();
            StartCoroutine(ReloadCoroutine());
        }

        private IEnumerator ReloadCoroutine()
        {
            yield return new WaitForSeconds(ReloadDuration);
            CurrentAmmo = Stats[CurrentWeapon].maxAmmo;
            IsReloading = false;
            OnReloadEnd?.Invoke();
            OnAmmoChanged?.Invoke(CurrentAmmo);
        }

        public void PickUpWeapon(WeaponType type)
        {
            if (type == WeaponType.Pistol) return;
            StopAllCoroutines();
            IsReloading   = false;
            CurrentWeapon = type;
            CurrentAmmo   = Stats[type].maxAmmo;
            OnWeaponChanged?.Invoke(CurrentWeapon, CurrentAmmo);
        }

        private void SwitchToPistol()
        {
            CurrentWeapon = WeaponType.Pistol;
            CurrentAmmo   = Stats[WeaponType.Pistol].maxAmmo;
            OnWeaponChanged?.Invoke(CurrentWeapon, CurrentAmmo);
        }
    }
}
