using NUnit.Framework;
using VirtuaCop2;

namespace VirtuaCop2.Tests
{
    public class WeaponDataTests
    {
        [Test]
        public void Pistol_Has10Ammo()
        {
            Assert.AreEqual(10, WeaponSystem.Stats[WeaponType.Pistol].maxAmmo);
        }

        [Test]
        public void MachineGun_Has30Ammo()
        {
            Assert.AreEqual(30, WeaponSystem.Stats[WeaponType.MachineGun].maxAmmo);
        }

        [Test]
        public void Shotgun_Has5Pellets()
        {
            Assert.AreEqual(5, WeaponSystem.Stats[WeaponType.Shotgun].pellets);
        }

        [Test]
        public void MachineGun_FireRateFasterThanPistol()
        {
            Assert.Less(
                WeaponSystem.Stats[WeaponType.MachineGun].fireRate,
                WeaponSystem.Stats[WeaponType.Pistol].fireRate
            );
        }
    }
}
