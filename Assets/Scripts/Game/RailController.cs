// Assets/Scripts/Game/RailController.cs
using UnityEngine;
using Cinemachine;

namespace VirtuaCop2
{
    // Attach to the GameObject that has CinemachineSmoothPath or
    // CinemachineTrackedDolly. Controls camera advance speed.
    [RequireComponent(typeof(CinemachineVirtualCamera))]
    public class RailController : MonoBehaviour
    {
        public static RailController Instance { get; private set; }

        [SerializeField] private float railSpeed = 0.05f;   // dolly position units/sec

        private CinemachineTrackedDolly dolly;
        private bool isPaused = false;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            var vcam = GetComponent<CinemachineVirtualCamera>();
            dolly    = vcam.GetCinemachineComponent<CinemachineTrackedDolly>();
        }

        void Update()
        {
            if (!isPaused && dolly != null)
                dolly.m_PathPosition = Mathf.Min(dolly.m_PathPosition + railSpeed * Time.deltaTime, 1f);
        }

        public void Pause()  => isPaused = true;
        public void Resume() => isPaused = false;
        public void SetSpeed(float speed) => railSpeed = speed;
    }
}
