// Assets/Scripts/Game/StageDirector.cs
using System;
using UnityEngine;
using UnityEngine.Playables;

namespace VirtuaCop2
{
    public class StageDirector : MonoBehaviour
    {
        public static StageDirector Instance { get; private set; }

        [SerializeField] private PlayableDirector mainTimeline;
        [SerializeField] private PlayableDirector routeATimeline;
        [SerializeField] private PlayableDirector routeBTimeline;
        [SerializeField] private int              stageIndex = 1;     // 1-3
        [SerializeField] private float            branchThreshold = 30f; // seconds

        private float   clearPointStartTime;
        private bool    inClearPoint = false;

        public event Action OnStageComplete;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
        }

        void OnDestroy()
        {
            if (EnemySpawner.Instance != null)
                EnemySpawner.Instance.OnWaveCleared -= HandleWaveCleared;
        }

        void Start()
        {
            if (EnemySpawner.Instance != null)
                EnemySpawner.Instance.OnWaveCleared += HandleWaveCleared;
            PlayerController.Instance?.Initialize();
            WeaponSystem.Instance?.Initialize();
            ScoringSystem.Instance?.Initialize();
            mainTimeline?.Play();
        }

        // Called by Timeline Signal (via Signal Receiver on this GameObject)
        public void OnClearPointReached()
        {
            inClearPoint       = true;
            clearPointStartTime = Time.time;
            mainTimeline?.Pause();
            RailController.Instance?.Pause();
            // EnemySpawner will fire OnWaveCleared when aliveCount hits 0
        }

        private void HandleWaveCleared()
        {
            if (!inClearPoint) return;
            inClearPoint = false;

            float elapsed = Time.time - clearPointStartTime;
            bool  fastClear = elapsed < branchThreshold;

            RailController.Instance?.Resume();

            if (routeATimeline != null && routeBTimeline != null)
            {
                mainTimeline?.Stop();
                PlayableDirector chosen = fastClear ? routeATimeline : routeBTimeline;
                chosen.Play();
                // Hook the route timeline to return to main after it finishes
                chosen.stopped += OnRouteTimelineFinished;
            }
            else
            {
                mainTimeline?.Resume();
            }
        }

        private void OnRouteTimelineFinished(PlayableDirector director)
        {
            director.stopped -= OnRouteTimelineFinished;
            mainTimeline.Play();
        }

        // Called by Timeline Signal at end of stage
        public void OnStageEnd()
        {
            float remaining = GameManager.Instance?.GetRemainingStageTime(stageIndex) ?? 0f;
            ScoringSystem.Instance?.AddStageClearBonus(PlayerController.Instance?.Health ?? 0, remaining);
            OnStageComplete?.Invoke();
            GameManager.Instance?.SetState(GameState.StageClear);
        }
    }
}
