using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Manages game state, level progression, and player progression
/// </summary>
public class GameManager : MonoBehaviour
{
    [Header("Level Settings")]
    [SerializeField] private string[] levelNames;
    [SerializeField] private string[] levelObjectives;
    
    [Header("Checkpoint System")]
    [SerializeField] private Transform initialSpawnPoint;
    
    [Header("Game Settings")]
    [SerializeField] private float gameStartDelay = 2f;
    [SerializeField] private AudioClip levelStartMusic;
    [SerializeField] private AudioClip levelCompleteSound;
    
    // Singleton instance
    public static GameManager Instance { get; private set; }
    
    // Public properties
    public int CurrentLevel { get; private set; } = 0;
    public bool IsGamePaused { get; private set; } = false;
    
    // Private variables
    private Transform currentCheckpoint;
    private GameObject playerObject;
    private UIManager uiManager;
    private AudioSource audioSource;
    private bool isLevelComplete = false;
    
    // Event for level complete
    public delegate void LevelCompleteHandler(int levelIndex);
    public event LevelCompleteHandler OnLevelComplete;
    
    private void Awake()
    {
        // Singleton pattern
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
            return;
        }
        
        // Get components
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
    }
    
    private void Start()
    {
        // Find player and UI manager
        FindSceneReferences();
        
        // Set initial checkpoint
        if (initialSpawnPoint != null)
        {
            currentCheckpoint = initialSpawnPoint;
        }
        
        // Start level with delay
        StartCoroutine(StartLevelWithDelay());
    }
    
    /// <summary>
    /// Finds necessary references in the scene
    /// </summary>
    private void FindSceneReferences()
    {
        playerObject = GameObject.FindGameObjectWithTag("Player");
        uiManager = FindObjectOfType<UIManager>();
        
        // Find initial spawn point if not set
        if (initialSpawnPoint == null)
        {
            GameObject spawnObj = GameObject.FindGameObjectWithTag("InitialSpawn");
            if (spawnObj != null)
            {
                initialSpawnPoint = spawnObj.transform;
                currentCheckpoint = initialSpawnPoint;
            }
        }
    }
    
    /// <summary>
    /// Starts the level after a short delay
    /// </summary>
    private IEnumerator StartLevelWithDelay()
    {
        yield return new WaitForSeconds(gameStartDelay);
        
        // Play level start music
        if (audioSource != null && levelStartMusic != null)
        {
            audioSource.clip = levelStartMusic;
            audioSource.Play();
        }
        
        // Set initial objective
        UpdateObjective();
    }
    
    /// <summary>
    /// Updates the current objective text
    /// </summary>
    private void UpdateObjective()
    {
        if (uiManager != null && CurrentLevel < levelObjectives.Length)
        {
            uiManager.UpdateObjective(levelObjectives[CurrentLevel]);
        }
    }
    
    /// <summary>
    /// Sets a new checkpoint for player respawn
    /// </summary>
    /// <param name="checkpoint">The new checkpoint transform</param>
    public void SetCheckpoint(Transform checkpoint)
    {
        if (checkpoint != null)
        {
            currentCheckpoint = checkpoint;
            Debug.Log("Checkpoint set: " + checkpoint.name);
        }
    }
    
    /// <summary>
    /// Respawns the player at the last checkpoint
    /// </summary>
    public void RespawnPlayer()
    {
        if (playerObject == null)
        {
            playerObject = GameObject.FindGameObjectWithTag("Player");
            if (playerObject == null)
                return;
        }
        
        // Reset player position
        if (currentCheckpoint != null)
        {
            CharacterController controller = playerObject.GetComponent<CharacterController>();
            if (controller != null)
            {
                // Disable controller to avoid physics conflicts during teleport
                controller.enabled = false;
                playerObject.transform.position = currentCheckpoint.position;
                playerObject.transform.rotation = currentCheckpoint.rotation;
                controller.enabled = true;
            }
            else
            {
                playerObject.transform.position = currentCheckpoint.position;
                playerObject.transform.rotation = currentCheckpoint.rotation;
            }
        }
        
        // Reset player health
        HealthSystem healthSystem = playerObject.GetComponent<HealthSystem>();
        if (healthSystem != null)
        {
            healthSystem.ResetHealth();
        }
        
        // Re-enable player controls
        PlayerController playerController = playerObject.GetComponent<PlayerController>();
        if (playerController != null)
        {
            playerController.enabled = true;
        }
    }
    
    /// <summary>
    /// Completes the current level
    /// </summary>
    public void CompleteLevel()
    {
        if (isLevelComplete)
            return;
            
        isLevelComplete = true;
        
        // Play level complete sound
        if (audioSource != null && levelCompleteSound != null)
        {
            audioSource.PlayOneShot(levelCompleteSound);
        }
        
        // Show level complete UI
        if (uiManager != null)
        {
            string levelName = (CurrentLevel < levelNames.Length) ? levelNames[CurrentLevel] : "Level " + (CurrentLevel + 1);
            uiManager.ShowLevelCompletePanel(levelName);
        }
        
        // Trigger level complete event
        OnLevelComplete?.Invoke(CurrentLevel);
    }
    
    /// <summary>
    /// Loads the next level
    /// </summary>
    public void LoadNextLevel()
    {
        // Increment level counter
        CurrentLevel++;
        
        // Check if we've completed all levels
        if (CurrentLevel >= levelNames.Length)
        {
            // Game complete
            Debug.Log("All levels completed!");
            // Show game complete screen or return to main menu
            SceneManager.LoadScene("MainMenu");
            return;
        }
        
        // Load next level scene
        SceneManager.LoadScene(levelNames[CurrentLevel]);
        
        // Reset level complete flag
        isLevelComplete = false;
        
        // Update objective for new level
        StartCoroutine(SetupNewLevel());
    }
    
    /// <summary>
    /// Sets up the new level after loading
    /// </summary>
    private IEnumerator SetupNewLevel()
    {
        // Wait for level to load
        yield return new WaitForSeconds(0.5f);
        
        // Find references in new scene
        FindSceneReferences();
        
        // Update objective
        UpdateObjective();
    }
    
    /// <summary>
    /// Pauses or unpauses the game
    /// </summary>
    public void TogglePause()
    {
        IsGamePaused = !IsGamePaused;
        
        // Set time scale based on pause state
        Time.timeScale = IsGamePaused ? 0f : 1f;
        
        // Toggle pause menu in UI
        if (uiManager != null)
        {
            uiManager.TogglePauseMenu();
        }
    }
    
    /// <summary>
    /// Saves the game state (basic implementation)
    /// </summary>
    public void SaveGame()
    {
        // Save current level
        PlayerPrefs.SetInt("CurrentLevel", CurrentLevel);
        
        // Save player stats (would normally save more data)
        if (playerObject != null)
        {
            HealthSystem healthSystem = playerObject.GetComponent<HealthSystem>();
            if (healthSystem != null)
            {
                PlayerPrefs.SetInt("PlayerHealth", healthSystem.CurrentHealth);
            }
        }
        
        PlayerPrefs.Save();
        Debug.Log("Game saved!");
    }
    
    /// <summary>
    /// Loads the game state (basic implementation)
    /// </summary>
    public void LoadGame()
    {
        // Load level
        if (PlayerPrefs.HasKey("CurrentLevel"))
        {
            int savedLevel = PlayerPrefs.GetInt("CurrentLevel");
            
            // Only load if it's a valid level
            if (savedLevel < levelNames.Length)
            {
                CurrentLevel = savedLevel;
                SceneManager.LoadScene(levelNames[CurrentLevel]);
                
                // Setup will be called by SceneManager.OnSceneLoaded
            }
        }
        
        Debug.Log("Game loaded!");
    }
    
    private void OnDestroy()
    {
        // Ensure time scale is reset when game manager is destroyed
        Time.timeScale = 1f;
    }
}
