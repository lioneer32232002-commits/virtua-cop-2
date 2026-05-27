using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace VirtuaCop2
{
    public class MainMenuController : MonoBehaviour
    {
        [SerializeField] private Button easyButton;
        [SerializeField] private Button normalButton;
        [SerializeField] private Button hardButton;
        [SerializeField] private string firstStageScene = "Stage1";

        void Awake()
        {
            DifficultyService.Initialize();
        }

        void Start()
        {
            if (easyButton   != null) easyButton.onClick.AddListener(() => StartGame(DifficultyLevel.Easy));
            if (normalButton != null) normalButton.onClick.AddListener(() => StartGame(DifficultyLevel.Normal));
            if (hardButton   != null) hardButton.onClick.AddListener(() => StartGame(DifficultyLevel.Hard));
        }

        private void StartGame(DifficultyLevel level)
        {
            DifficultyService.Apply(level);
            SceneManager.LoadScene(firstStageScene);
        }
    }
}
