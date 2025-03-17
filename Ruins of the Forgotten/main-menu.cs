using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;

/// <summary>
/// Controls the main menu functionality
/// </summary>
public class MainMenu : MonoBehaviour
{
    [Header("Menu Panels")]
    [SerializeField] private GameObject mainPanel;
    [SerializeField] private GameObject optionsPanel;
    [SerializeField] private GameObject creditsPanel;
    [SerializeField] private GameObject levelSelectPanel;
    
    [Header("Button References")]
    [SerializeField] private Button newGameButton;
    [SerializeField] private Button continueButton;
    [SerializeField] private Button optionsButton;
    [SerializeField] private Button creditsButton;
    [SerializeField] private Button quitButton;
    [SerializeField] private Button backToMainButton;
    
    [Header("Level Select")]
    [SerializeField] private Button[] levelButtons;
    [SerializeField] private string[] levelSceneNames;
    [SerializeField] private bool enableAllLevels = false;
    
    [Header("Options")]
    [SerializeField] private Slider musicVolumeSlider;
    [SerializeField] private Slider sfxVolumeSlider;
    [SerializeField] private Slider sensitivitySlider;
    [SerializeField] private Toggle fullscreenToggle;
    [SerializeField] private TMP_Dropdown resolutionDropdown;
    [SerializeField] private TMP_Dropdown qualityDropdown;
    
    [Header("Audio")]
    [SerializeField] private AudioClip menuMusic;
    [SerializeField] private AudioClip buttonClickSound;
    [SerializeField] private AudioClip buttonHoverSound;
    
    // Private variables
    private AudioSource audioSource;
    private int highestUnlockedLevel = 0;
    
    private void Awake()
    {
        // Get audio source
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
        
        // Set up default panel visibility
        if (mainPanel != null) mainPanel.SetActive(true);
        if (optionsPanel != null) optionsPanel.SetActive(false);
        if (creditsPanel != null) creditsPanel.SetActive(false);
        if (levelSelectPanel != null) levelSelectPanel.SetActive(false);
        
        // Check if continue is available
        CheckContinueAvailability();
        
        // Load player prefs for options
        LoadOptions();
        
        // Set up button listeners
        SetupButtonListeners();
    }
    
    private void Start()
    {
        // Play menu music
        if (audioSource != null && menuMusic != null)
        {
            audioSource.clip = menuMusic;
            audioSource.loop = true;
            audioSource.Play();
        }
        
        // Unlock levels based on player progress
        UpdateLevelButtons();
    }
    
    /// <summary>
    /// Sets up button click listeners
    /// </summary>
    private void SetupButtonListeners()
    {
        // Main menu buttons
        if (newGameButton != null)
            newGameButton.onClick.AddListener(OnNewGameClicked);
            
        if (continueButton != null)
            continueButton.onClick.AddListener(OnContinueClicked);
            
        if (optionsButton != null)
            optionsButton.onClick.AddListener(OnOptionsClicked);
            
        if (creditsButton != null)
            creditsButton.onClick.AddListener(OnCreditsClicked);
            
        if (quitButton != null)
            quitButton.onClick.AddListener(OnQuitClicked);
            
        if (backToMainButton != null)
            backToMainButton.onClick.AddListener(OnBackToMainClicked);
            
        // Options sliders
        if (musicVolumeSlider != null)
            musicVolumeSlider.onValueChanged.AddListener(OnMusicVolumeChanged);
            
        if (sfxVolumeSlider != null)
            sfxVolumeSlider.onValueChanged.AddListener(OnSFXVolumeChanged);
            
        if (sensitivitySlider != null)
            sensitivitySlider.onValueChanged.AddListener(OnSensitivityChanged);
            
        if (fullscreenToggle != null)
            fullscreenToggle.onValueChanged.AddListener(OnFullscreenToggled);
            
        if (resolutionDropdown != null)
            resolutionDropdown.onValueChanged.AddListener(OnResolutionChanged);
            
        if (qualityDropdown != null)
            qualityDropdown.onValueChanged.AddListener(OnQualityChanged);
            
        // Level buttons
        for (int i = 0; i < levelButtons.Length; i++)
        {
            int levelIndex = i; // Capture for lambda
            if (levelButtons[i] != null)
                levelButtons[i].onClick.AddListener(() => OnLevelSelected(levelIndex));
        }
    }
    
    #region Button Click Handlers
    
    /// <summary>
    /// Handles click on New Game button
    /// </summary>
    private void OnNewGameClicked()
    {
        PlayButtonSound();
        
        // Show level select if available, otherwise start first level
        if (levelSelectPanel != null && enableAllLevels)
        {
            mainPanel.SetActive(false);
            levelSelectPanel.SetActive(true);
        }
        else
        {
            // Start first level
            StartLevel(0);
        }
    }
    
    /// <summary>
    /// Handles click on Continue button
    /// </summary>
    private void OnContinueClicked()
    {
        PlayButtonSound();
        
        // Load saved level
        int savedLevel = PlayerPrefs.GetInt("CurrentLevel", 0);
        StartLevel(savedLevel);
    }
    
    /// <summary>
    /// Handles click on Options button
    /// </summary>
    private void OnOptionsClicked()
    {
        PlayButtonSound();
        
        mainPanel.SetActive(false);
        optionsPanel.SetActive(true);
    }
    
    /// <summary>
    /// Handles click on Credits button
    /// </summary>
    private void OnCreditsClicked()
    {
        PlayButtonSound();
        
        mainPanel.SetActive(false);
        creditsPanel.SetActive(true);
    }
    
    /// <summary>
    /// Handles click on Quit button
    /// </summary>
    private void OnQuitClicked()
    {
        PlayButtonSound();
        
        // Quit the game
        #if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
        #else
        Application.Quit();
        #endif
    }
    
    /// <summary>
    /// Handles click on Back button
    /// </summary>
    private void OnBackToMainClicked()
    {
        PlayButtonSound();
        
        // Hide all panels except main
        if (optionsPanel != null) optionsPanel.SetActive(false);
        if (creditsPanel != null) creditsPanel.SetActive(false);
        if (levelSelectPanel != null) levelSelectPanel.SetActive(false);
        
        // Show main panel
        if (mainPanel != null) mainPanel.SetActive(true);
    }
    
    /// <summary>
    /// Handles level selection
    /// </summary>
    private void OnLevelSelected(int levelIndex)
    {
        PlayButtonSound();
        
        StartLevel(levelIndex);
    }
    
    #endregion
    
    #region Options Handlers
    
    /// <summary>
    /// Handles music volume change
    /// </summary>
    private void OnMusicVolumeChanged(float value)
    {
        // Update music volume
        AudioListener.volume = value;
        
        // Save to player prefs
        PlayerPrefs.SetInt("QualityLevel", qualityIndex);
        PlayerPrefs.Save();
    }
    
    #endregion
    
    #region Helper Methods
    
    /// <summary>
    /// Checks if continue is available
    /// </summary>
    private void CheckContinueAvailability()
    {
        if (continueButton != null)
        {
            // Check if there's a saved game
            bool hasSavedGame = PlayerPrefs.HasKey("CurrentLevel");
            continueButton.interactable = hasSavedGame;
        }
    }
    
    /// <summary>
    /// Loads saved options
    /// </summary>
    private void LoadOptions()
    {
        // Load and apply music volume
        if (musicVolumeSlider != null)
        {
            float musicVolume = PlayerPrefs.GetFloat("MusicVolume", 0.75f);
            musicVolumeSlider.value = musicVolume;
            AudioListener.volume = musicVolume;
        }
        
        // Load and apply SFX volume
        if (sfxVolumeSlider != null)
        {
            float sfxVolume = PlayerPrefs.GetFloat("SFXVolume", 0.75f);
            sfxVolumeSlider.value = sfxVolume;
            // Would set mixer group volume here in a full implementation
        }
        
        // Load and apply sensitivity
        if (sensitivitySlider != null)
        {
            float sensitivity = PlayerPrefs.GetFloat("MouseSensitivity", 2f);
            sensitivitySlider.value = sensitivity;
        }
        
        // Load and apply fullscreen setting
        if (fullscreenToggle != null)
        {
            bool isFullscreen = PlayerPrefs.GetInt("Fullscreen", 1) == 1;
            fullscreenToggle.isOn = isFullscreen;
            Screen.fullScreen = isFullscreen;
        }
        
        // Load and apply resolution
        if (resolutionDropdown != null)
        {
            // Populate resolution dropdown (simplified)
            resolutionDropdown.ClearOptions();
            List<string> resOptions = new List<string> { "1280x720", "1920x1080", "2560x1440" };
            resolutionDropdown.AddOptions(resOptions);
            
            int resolutionIndex = PlayerPrefs.GetInt("Resolution", 1);
            resolutionDropdown.value = resolutionIndex;
        }
        
        // Load and apply quality setting
        if (qualityDropdown != null)
        {
            // Populate quality dropdown
            qualityDropdown.ClearOptions();
            List<string> options = new List<string>(QualitySettings.names);
            qualityDropdown.AddOptions(options);
            
            int qualityLevel = PlayerPrefs.GetInt("QualityLevel", QualitySettings.GetQualityLevel());
            qualityDropdown.value = qualityLevel;
            QualitySettings.SetQualityLevel(qualityLevel);
        }
    }
    
    /// <summary>
    /// Updates level buttons based on player progress
    /// </summary>
    private void UpdateLevelButtons()
    {
        // Get the highest unlocked level
        highestUnlockedLevel = PlayerPrefs.GetInt("HighestUnlockedLevel", 0);
        
        // If debug mode, unlock all levels
        if (enableAllLevels)
        {
            highestUnlockedLevel = levelButtons.Length - 1;
        }
        
        // Update button interactability
        for (int i = 0; i < levelButtons.Length; i++)
        {
            if (levelButtons[i] != null)
            {
                levelButtons[i].interactable = (i <= highestUnlockedLevel);
            }
        }
    }
    
    /// <summary>
    /// Starts the specified level
    /// </summary>
    private void StartLevel(int levelIndex)
    {
        if (levelIndex < 0 || levelIndex >= levelSceneNames.Length)
            return;
            
        // Load level scene
        SceneManager.LoadScene(levelSceneNames[levelIndex]);
    }
    
    /// <summary>
    /// Plays button click sound
    /// </summary>
    private void PlayButtonSound()
    {
        if (audioSource != null && buttonClickSound != null)
        {
            audioSource.PlayOneShot(buttonClickSound);
        }
    }
    
    #endregion
}
.SetFloat("MusicVolume", value);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Handles SFX volume change
    /// </summary>
    private void OnSFXVolumeChanged(float value)
    {
        // Would update SFX volume mixer group
        // For this example, we'll just save the value
        PlayerPrefs.SetFloat("SFXVolume", value);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Handles sensitivity slider change
    /// </summary>
    private void OnSensitivityChanged(float value)
    {
        // Save sensitivity to player prefs
        PlayerPrefs.SetFloat("MouseSensitivity", value);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Handles fullscreen toggle
    /// </summary>
    private void OnFullscreenToggled(bool isFullscreen)
    {
        // Update screen mode
        Screen.fullScreen = isFullscreen;
        
        // Save to player prefs
        PlayerPrefs.SetInt("Fullscreen", isFullscreen ? 1 : 0);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Handles resolution dropdown change
    /// </summary>
    private void OnResolutionChanged(int resolutionIndex)
    {
        // This would update actual resolution
        // For this example, we'll just save the index
        PlayerPrefs.SetInt("Resolution", resolutionIndex);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Handles quality dropdown change
    /// </summary>
    private void OnQualityChanged(int qualityIndex)
    {
        // Update quality level
        QualitySettings.SetQualityLevel(qualityIndex);
        
        // Save to player prefs
        PlayerPrefs