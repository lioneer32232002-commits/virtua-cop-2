using System.Collections;
using UnityEngine;

namespace VirtuaCop2
{
    public class WeaponPickup : MonoBehaviour
    {
        [SerializeField] private WeaponType weaponType = WeaponType.MachineGun;
        [SerializeField] private float      lifeTime   = 2f;

        void Start() => StartCoroutine(AutoDestroy());

        private IEnumerator AutoDestroy()
        {
            yield return new WaitForSeconds(lifeTime);
            Destroy(gameObject);
        }

        public void OnShot()
        {
            WeaponSystem.Instance?.PickUpWeapon(weaponType);
            Destroy(gameObject);
        }
    }
}
