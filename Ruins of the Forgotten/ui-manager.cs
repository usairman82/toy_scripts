using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;

/// <summary>
/// Manages all UI elements and screens in the game
/// </summary>
public class UIManager : MonoBehaviour
{
    [Header("HUD Elements")]
    [SerializeField] private GameObject hudPanel;
    [SerializeField] private Image healthBar;
    [SerializeField] private TextMeshProUGUI healthText;
    [SerializeField] private TextMeshProUGUI ammoText;
    [SerializeField] private TextMeshProUGUI objectiveText;
    [SerializeField] private Image weaponIcon;
    
    [Header("Inventory UI")]
    [SerializeField] private GameObject inventoryPanel;
    [SerializeField] private Transform inventoryItemContainer;
    [SerializeField] private GameObject inventoryItemPrefab;
    [SerializeField] private TextMeshProUGUI itemDescriptionText;
    
    [Header("Lore UI")]
    [SerializeField] private GameObject lorePanel;
    [SerializeField] private TextMeshProUGUI loreTitleText;
    [SerializeField] private TextMeshProUGUI loreContentText;
    [SerializeField] private Button closeButton;
    
    [Header("Pause Menu")]
    [SerializeField] private GameObject pauseMenuPanel;
    [SerializeField] private Button resumeButton;
    [SerializeField] private Button settingsButton;
    [SerializeField] private Button mainMenuButton;
    
    [Header("Death UI")]
    [SerializeField] private GameObject deathPanel;
    [SerializeField] private Button respawnButton;
    [SerializeField] private Button quitButton;
    
    [Header("Level Complete UI")]
    [SerializeField] private GameObject levelCompletePanel;
    [SerializeField] private TextMeshProUGUI levelCompleteText;
    [SerializeField] private Button nextLevelButton;
    
    [Header("Crosshair")]
    [SerializeField] private Image crosshair;
    [SerializeField] private Sprite defaultCrosshair;
    [SerializeField] private Sprite interactCrosshair;
    
    // Private variables
    private HealthSystem playerHealth;
    private WeaponController weaponController;
    private bool isPaused = false;
    private bool isInventoryOpen = false;
    private InventorySystem inventorySystem;
    
    private void Start()
    {
        // Find player references
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
        {
            playerHealth = player.GetComponent<HealthSystem>();
            weaponController = player.GetComponent<WeaponController>();
            inventorySystem = player.GetComponent<InventorySystem>();
        }
        
        // Subscribe to events
        if (playerHealth != null)
        {
            playerHealth.OnHealthChanged += UpdateHealthUI;
            playerHealth.OnDeath += ShowDeathPanel;
        }
        
        if (weaponController != null)
        {
            weaponController.OnWeaponChanged += UpdateWeaponUI;
            weaponController.OnAmmoChanged += UpdateAmmoUI;
        }
        
        if (inventorySystem != null)
        {
            inventorySystem.OnInventoryChanged += UpdateInventoryUI;
        }
        
        // Setup button listeners
        SetupButtonListeners();
        
        // Initial UI setup
        if (pauseMenuPanel != null) pauseMenuPanel.SetActive(false);
        if (inventoryPanel != null) inventoryPanel.SetActive(false);
        if (lorePanel != null) lorePanel.SetActive(false);
        if (deathPanel != null) deathPanel.SetActive(false);
        if (levelCompletePanel != null) levelCompletePanel.SetActive(false);
    }
    
    private void Update()
    {
        // Toggle pause menu
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            TogglePauseMenu();
        }
        
        // Toggle inventory
        if (Input.GetKeyDown(KeyCode.I))
        {
            ToggleInventoryPanel();
        }
    }
    
    private void SetupButtonListeners()
    {
        // Pause menu buttons
        if (resumeButton != null)
            resumeButton.onClick.AddListener(TogglePauseMenu);
            
        if (settingsButton != null)
            settingsButton.onClick.AddListener(ShowSettingsPanel);
            
        if (mainMenuButton != null)
            mainMenuButton.onClick.AddListener(LoadMainMenu);
            
        // Death panel buttons
        if (respawnButton != null)
            respawnButton.onClick.AddListener(Respawn);
            
        if (quitButton != null)
            quitButton.onClick.AddListener(LoadMainMenu);
            
        // Next level button
        if (nextLevelButton != null)
            nextLevelButton.onClick.AddListener(LoadNextLevel);
            
        // Close lore button
        if (closeButton != null)
            closeButton.onClick.AddListener(() => { if (lorePanel != null) lorePanel.SetActive(false); });
    }
    
    #region Health UI
    
    /// <summary>
    /// Updates the health bar and text based on current player health
    /// </summary>
    public void UpdateHealthUI(int currentHealth, int maxHealth)
    {
        if (healthBar != null)
        {
            healthBar.fillAmount = (float)currentHealth / maxHealth;
        }
        
        if (healthText != null)
        {
            healthText.text = $"{currentHealth}/{maxHealth}";
        }
    }
    
    #endregion
    
    #region Weapon UI
    
    /// <summary>
    /// Updates the weapon icon and name in the HUD
    /// </summary>
    public void UpdateWeaponUI(WeaponItem weapon)
    {
        if (weaponIcon != null && weapon != null && weapon.ItemIcon != null)
        {
            weaponIcon.sprite = weapon.ItemIcon;
            weaponIcon.gameObject.SetActive(true);
        }
        else if (weaponIcon != null)
        {
            weaponIcon.gameObject.SetActive(false);
        }
    }
    
    /// <summary>
    /// Updates the ammo count in the HUD
    /// </summary>
    public void UpdateAmmoUI(int currentAmmo, int maxAmmo)
    {
        if (ammoText != null)
        {
            // Only show ammo for ranged weapons
            if (maxAmmo > 0)
            {
                ammoText.text = $"{currentAmmo}/{maxAmmo}";
                ammoText.gameObject.SetActive(true);
            }
            else
            {
                ammoText.gameObject.SetActive(false);
            }
        }
    }
    
    #endregion
    
    #region Inventory UI
    
    /// <summary>
    /// Toggles the inventory panel visibility
    /// </summary>
    public void ToggleInventoryPanel(List<InventoryItem> items = null)
    {
        if (inventoryPanel == null)
            return;
            
        isInventoryOpen = !isInventoryOpen;
        inventoryPanel.SetActive(isInventoryOpen);
        
        // If opening the inventory, update it with current items
        if (isInventoryOpen && inventorySystem != null)
        {
            UpdateInventoryUI(items ?? inventorySystem.GetAllItems());
            
            // Pause the game when inventory is open
            Time.timeScale = 0f;
            
            // Show cursor
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
        else
        {
            // Resume game when inventory is closed
            if (!isPaused)
            {
                Time.timeScale = 1f;
                
                // Hide cursor
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
            }
        }
    }
    
    /// <summary>
    /// Updates the inventory UI with the current items
    /// </summary>
    public void UpdateInventoryUI(List<InventoryItem> items)
    {
        if (inventoryItemContainer == null || inventoryItemPrefab == null)
            return;
            
        // Clear existing items
        foreach (Transform child in inventoryItemContainer)
        {
            Destroy(child.gameObject);
        }
        
        // Add new items
        foreach (InventoryItem item in items)
        {
            GameObject newItemObj = Instantiate(inventoryItemPrefab, inventoryItemContainer);
            InventoryItemUI itemUI = newItemObj.GetComponent<InventoryItemUI>();
            
            if (itemUI != null)
            {
                itemUI.SetItem(item);
                itemUI.OnItemSelected += DisplayItemDescription;
                
                // Setup item use functionality
                Button useButton = itemUI.GetUseButton();
                if (useButton != null)
                {
                    useButton.onClick.AddListener(() => UseInventoryItem(item));
                }
            }
        }
    }
    
    /// <summary>
    /// Displays the description for a selected inventory item
    /// </summary>
    private void DisplayItemDescription(InventoryItem item)
    {
        if (itemDescriptionText != null && item != null)
        {
            itemDescriptionText.text = item.ItemDescription;
        }
    }
    
    /// <summary>
    /// Uses an inventory item (health item, weapon, etc.)
    /// </summary>
    private void UseInventoryItem(InventoryItem item)
    {
        if (item == null)
            return;
            
        switch (item.Type)
        {
            case ItemType.HealthItem:
                HealthItem healthItem = item as HealthItem;
                if (healthItem != null && playerHealth != null)
                {
                    bool used = playerHealth.UseHealthItem(healthItem);
                    if (used && inventorySystem != null)
                    {
                        inventorySystem.RemoveItem(item.ItemName);
                    }
                }
                break;
                
            case ItemType.Weapon:
                WeaponItem weaponItem = item as WeaponItem;
                if (weaponItem != null && weaponController != null)
                {
                    weaponController.EquipWeapon(weaponItem);
                }
                break;
                
            case ItemType.Scroll:
                ShowLorePanel(item.ItemName, item.ItemDescription);
                break;
        }
    }
    
    #endregion
    
    #region Lore UI
    
    /// <summary>
    /// Shows the lore panel with the specified title and content
    /// </summary>
    public void ShowLorePanel(string title, string content)
    {
        if (lorePanel == null)
            return;
            
        lorePanel.SetActive(true);
        
        if (loreTitleText != null)
            loreTitleText.text = title;
            
        if (loreContentText != null)
            loreContentText.text = content;
            
        // Pause the game when reading lore
        Time.timeScale = 0f;
        
        // Show cursor
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }
    
    /// <summary>
    /// Closes the lore panel
    /// </summary>
    public void CloseLorePanel()
    {
        if (lorePanel == null)
            return;
            
        lorePanel.SetActive(false);
        
        // Resume game if not otherwise paused
        if (!isPaused && !isInventoryOpen)
        {
            Time.timeScale = 1f;
            
            // Hide cursor
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }
    }
    
    #endregion
    
    #region Pause Menu
    
    /// <summary>
    /// Toggles the pause menu
    /// </summary>
    public void TogglePauseMenu()
    {
        isPaused = !isPaused;
        
        if (pauseMenuPanel != null)
            pauseMenuPanel.SetActive(isPaused);
            
        // Set time scale based on pause state
        Time.timeScale = isPaused ? 0f : 1f;
        
        // Show/hide cursor
        Cursor.lockState = isPaused ? CursorLockMode.None : CursorLockMode.Locked;
        Cursor.visible = isPaused;
    }
    
    /// <summary>
    /// Shows the settings panel
    /// </summary>
    public void ShowSettingsPanel()
    {
        // Implementation for settings panel
        Debug.Log("Settings panel not implemented yet");
    }
    
    /// <summary>
    /// Loads the main menu scene
    /// </summary>
    public void LoadMainMenu()
    {
        Time.timeScale = 1f;
        SceneManager.LoadScene("MainMenu");
    }
    
    #endregion
    
    #region Death UI
    
    /// <summary>
    /// Shows the death panel when player dies
    /// </summary>
    public void ShowDeathPanel()
    {
        if (deathPanel == null)
            return;
            
        deathPanel.SetActive(true);
        
        // Pause the game
        Time.timeScale = 0f;
        
        // Show cursor
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }
    
    /// <summary>
    /// Respawns the player at the last checkpoint
    /// </summary>
    public void Respawn()
    {
        if (deathPanel != null)
            deathPanel.SetActive(false);
            
        // Find game manager to handle respawn
        GameManager gameManager = FindObjectOfType<GameManager>();
        if (gameManager != null)
        {
            gameManager.RespawnPlayer();
        }
        
        // Resume game
        Time.timeScale = 1f;
        
        // Hide cursor
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }
    
    #endregion
    
    #region Level Complete UI
    
    /// <summary>
    /// Shows the level complete panel
    /// </summary>
    public void ShowLevelCompletePanel(string levelName)
    {
        if (levelCompletePanel == null)
            return;
            
        levelCompletePanel.SetActive(true);
        
        if (levelCompleteText != null)
            levelCompleteText.text = $"Level Complete: {levelName}";
            
        // Pause the game
        Time.timeScale = 0f;
        
        // Show cursor
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }
    
    /// <summary>
    /// Loads the next level
    /// </summary>
    public void LoadNextLevel()
    {
        // Find game manager to handle level transition
        GameManager gameManager = FindObjectOfType<GameManager>();
        if (gameManager != null)
        {
            gameManager.LoadNextLevel();
        }
        
        // Resume game
        Time.timeScale = 1f;
    }
    
    #endregion
    
    #region Objective UI
    
    /// <summary>
    /// Updates the objective text in the HUD
    /// </summary>
    public void UpdateObjective(string objective)
    {
        if (objectiveText != null)
        {
            objectiveText.text = objective;
            
            // Optional: animate the objective text when it changes
            StartCoroutine(PulseObjectiveText());
        }
    }
    
    /// <summary>
    /// Animates the objective text to draw attention
    /// </summary>
    private IEnumerator PulseObjectiveText()
    {
        if (objectiveText == null)
            yield break;
            
        Color originalColor = objectiveText.color;
        
        // Pulse animation
        for (float t = 0; t < 1; t += Time.unscaledDeltaTime)
        {
            float pulse = 0.5f + Mathf.PingPong(t * 2, 0.5f);
            objectiveText.color = new Color(originalColor.r, originalColor.g, originalColor.b, pulse);
            yield return null;
        }
        
        // Reset to original color
        objectiveText.color = originalColor;
    }
    
    #endregion
    
    #region Crosshair
    
    /// <summary>
    /// Sets the crosshair to indicate interactive objects
    /// </summary>
    public void SetInteractiveCrosshair(bool isInteractive)
    {
        if (crosshair != null)
        {
            crosshair.sprite = isInteractive ? interactCrosshair : defaultCrosshair;
        }
    }
    
    #endregion
    
    private void OnDestroy()
    {
        // Unsubscribe from events
        if (playerHealth != null)
        {
            playerHealth.OnHealthChanged -= UpdateHealthUI;
            playerHealth.OnDeath -= ShowDeathPanel;
        }
        
        if (weaponController != null)
        {
            weaponController.OnWeaponChanged -= UpdateWeaponUI;
            weaponController.OnAmmoChanged -= UpdateAmmoUI;
        }
        
        if (inventorySystem != null)
        {
            inventorySystem.OnInventoryChanged -= UpdateInventoryUI;
        }
    }
}