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
            if (isPaused || dolly == null || dolly.m_Path == null) return;
            // Treat railSpeed as "fraction of full path per second" so the value is
            // unit-agnostic — works the same whether Position Units is Normalized,
            // PathUnits, or Distance. Without the maxPos scaling, railSpeed=0.05
            // produces wildly different stage durations across unit modes, and the
            // original Mathf.Min(..., 1f) clamp made the camera freeze after the
            // first segment when Position Units = PathUnits.
            var maxPos = dolly.m_Path.FromPathNativeUnits(dolly.m_Path.MaxPos, dolly.m_PositionUnits);
            var step   = railSpeed * maxPos * Time.deltaTime;
            dolly.m_PathPosition = Mathf.Min(dolly.m_PathPosition + step, maxPos);
        }

        public void Pause()  => isPaused = true;
        public void Resume() => isPaused = false;
        public void SetSpeed(float speed) => railSpeed = speed;
    }
}
