using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace VirtuaCop2
{
    public enum GameState
    {
        MainMenu,
        Playing,
        ClearPoint,
        StageClear,
        Continue,
        GameOver,
        Ranking,
        Ending
    }

    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public GameState State { get; private set; } = GameState.MainMenu;

        public event Action<GameState> OnStateChanged;

        public static readonly float[] StageTimeLimits = { 180f, 200f, 220f };

        private float stageStartTime;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void SetState(GameState newState)
        {
            State = newState;
            OnStateChanged?.Invoke(newState);
        }

        public void StartStage(int stageIndex)
        {
            stageStartTime = Time.time;
            SetState(GameState.Playing);
            SceneManager.LoadScene($"Stage{stageIndex}");
        }

        public void LoadMainMenu()
        {
            SetState(GameState.MainMenu);
            SceneManager.LoadScene("MainMenu");
        }

        public float GetElapsedStageTime() => Time.time - stageStartTime;

        public float GetRemainingStageTime(int stageIndex)
        {
            float limit = StageTimeLimits[Mathf.Clamp(stageIndex - 1, 0, 2)];
            return Mathf.Max(0f, limit - GetElapsedStageTime());
        }
    }
}
