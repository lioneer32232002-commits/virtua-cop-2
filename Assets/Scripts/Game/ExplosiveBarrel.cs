// Assets/Scripts/Game/ExplosiveBarrel.cs
using UnityEngine;

namespace VirtuaCop2
{
    public class ExplosiveBarrel : MonoBehaviour
    {
        [SerializeField] private float radius = 3f;

        // Called when shot (Layer: EnemyBody reused, or new layer)
        public void Explode()
        {
            Collider[] hits = Physics.OverlapSphere(transform.position, radius, LayerMask.GetMask("EnemyBody", "EnemyHead"));
            foreach (var c in hits)
                c.GetComponentInParent<EnemyController>()?.OnHit(HitZone.Body);

            Destroy(gameObject);
        }
    }
}
