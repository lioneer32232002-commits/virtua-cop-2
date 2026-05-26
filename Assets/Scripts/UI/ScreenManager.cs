// Assets/Scripts/UI/ScreenManager.cs
using System.Collections.Generic;
using UnityEngine;

namespace VirtuaCop2
{
    public class ScreenManager : MonoBehaviour
    {
        public static ScreenManager Instance { get; private set; }

        [SerializeField] private GameObject mainMenuScreen;
        [SerializeField] private GameObject hudScreen;
        [SerializeField] private GameObject stageClearScreen;
        [SerializeField] private GameObject continueScreen;
        [SerializeField] private GameObject gameOverScreen;
        [SerializeField] private GameObject rankingScreen;
        [SerializeField] private GameObject endingScreen;

        private Dictionary<GameState, GameObject> screenMap;

        void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;

            screenMap = new()
            {
                [GameState.MainMenu]   = mainMenuScreen,
                [GameState.Playing]    = hudScreen,
                [GameState.ClearPoint] = hudScreen,
                [GameState.StageClear] = stageClearScreen,
                [GameState.Continue]   = continueScreen,
                [GameState.GameOver]   = gameOverScreen,
                [GameState.Ranking]    = rankingScreen,
                [GameState.Ending]     = endingScreen,
            };
        }

        void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnStateChanged += ShowScreenForState;
                ShowScreenForState(GameManager.Instance.State);
            }

            if (PlayerController.Instance != null)
            {
                PlayerController.Instance.OnDeath    += () => GameManager.Instance?.SetState(GameState.Continue);
                PlayerController.Instance.OnGameOver += () => GameManager.Instance?.SetState(GameState.GameOver);
            }
        }

        private void ShowScreenForState(GameState state)
        {
            foreach (var kv in screenMap)
                kv.Value?.SetActive(kv.Key == state);
        }
    }
}
