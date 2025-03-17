using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Controls the heads-up display (HUD) UI elements during gameplay
/// </summary>
public class HUDController : MonoBehaviour
{
    [Header("Health Display")]
    [SerializeField] private Image healthBar;
    [SerializeField] private TextMeshProUGUI healthText;
    [SerializeField] private Image healthPulseOverlay;
    [SerializeField] private Color lowHealthColor = Color.red;
    [SerializeField] private Color normalHealthColor = Color.green;
    [SerializeField] private float lowHealthThreshold = 0.3f;
    [SerializeField] private float pulseSpeed = 3f;
    
    [Header("Weapon Display")]
    [SerializeField] private Image weaponIcon;
    [SerializeField] private TextMeshProUGUI ammoText;
    [SerializeField] private TextMeshProUGUI weaponNameText;
    [SerializeField] private GameObject ammoWarning;
    [SerializeField] private int lowAmmoThreshold = 3;
    
    [Header("Objectives")]
    [SerializeField] private TextMeshProUGUI objectiveText;
    [SerializeField] private GameObject objectivePanel;
    [SerializeField] private float objectiveShowDuration = 5f;
    
    [Header("Notifications")]
    [SerializeField] private GameObject notificationPanel;
    [SerializeField] private TextMeshProUGUI notificationText;
    [SerializeField] private float notificationDuration = 3f;
    [SerializeField] private Animator notificationAnimator;
    
    [Header("Damage Indicators")]
    [SerializeField] private Image damageVignette;
    [SerializeField] private Image directionIndicator;
    [SerializeField] private float damageIndicatorDuration = 0.5f;
    
    [Header("Interaction Prompt")]
    [SerializeField] private GameObject interactionPrompt;
    [SerializeField] private TextMeshProUGUI interactionText;
    
    [Header("Crosshair")]
    [SerializeField] private Image crosshair;
    [SerializeField] private Sprite defaultCrosshair;
    [SerializeField] private Sprite interactCrosshair;
    [SerializeField] private float crosshairSize = 20f;
    
    // Private variables
    private float currentHealthPercent = 1f;
    private Coroutine objectiveShowCoroutine;
    private Coroutine notificationCoroutine;
    private Coroutine damageCoroutine;
    
    // References
    private HealthSystem playerHealth;
    private WeaponController weaponController;
    
    private void Start()
    {
        // Find player references
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
        {
            playerHealth = player.GetComponent<HealthSystem>();
            weaponController = player.GetComponent<WeaponController>();
            
            // Subscribe to events
            if (playerHealth != null)
            {
                playerHealth.OnHealthChanged += UpdateHealthDisplay;
                playerHealth.OnDamageTaken += ShowDamageIndicator;
            }
            
            if (weaponController != null)
            {
                weaponController.OnWeaponChanged += UpdateWeaponDisplay;
                weaponController.OnAmmoChanged += UpdateAmmoDisplay;
            }
        }
        
        // Initialize UI elements
        InitializeUI();
    }
    
    private void Update()
    {
        // Pulse effect for low health
        UpdateLowHealthPulse();
    }
    
    /// <summary>
    /// Initializes UI elements
    /// </summary>
    private void InitializeUI()
    {
        // Hide panels that should be hidden initially
        if (objectivePanel != null)
            objectivePanel.SetActive(false);
            
        if (notificationPanel != null)
            notificationPanel.SetActive(false);
            
        if (interactionPrompt != null)
            interactionPrompt.SetActive(false);
            
        // Set damage vignette invisible
        if (damageVignette != null)
        {
            Color color = damageVignette.color;
            color.a = 0f;
            damageVignette.color = color;
        }
        
        // Set default crosshair
        if (crosshair != null && defaultCrosshair != null)
        {
            crosshair.sprite = defaultCrosshair;
            crosshair.rectTransform.sizeDelta = new Vector2(crosshairSize, crosshairSize);
        }
        
        // Hide ammo warning initially
        if (ammoWarning != null)
            ammoWarning.SetActive(false);
            
        // Initialize health display
        if (playerHealth != null)
        {
            UpdateHealthDisplay(playerHealth.CurrentHealth, playerHealth.MaxHealth);
        }
    }
    
    #region Health Display
    
    /// <summary>
    /// Updates the health display
    /// </summary>
    public void UpdateHealthDisplay(int currentHealth, int maxHealth)
    {
        currentHealthPercent = (float)currentHealth / maxHealth;
        
        // Update health bar
        if (healthBar != null)
        {
            healthBar.fillAmount = currentHealthPercent;
            
            // Change color based on health percent
            if (currentHealthPercent <= lowHealthThreshold)
            {
                healthBar.color = lowHealthColor;
            }
            else
            {
                healthBar.color = normalHealthColor;
            }
        }
        
        // Update health text
        if (healthText != null)
        {
            healthText.text = $"{currentHealth}/{maxHealth}";
        }
    }
    
    /// <summary>
    /// Updates the low health pulse effect
    /// </summary>
    private void UpdateLowHealthPulse()
    {
        if (healthPulseOverlay != null)
        {
            if (currentHealthPercent <= lowHealthThreshold)
            {
                // Show and pulse the overlay
                Color color = healthPulseOverlay.color;
                color.a = 0.3f + Mathf.Sin(Time.time * pulseSpeed) * 0.3f; // Pulse between 0-0.6 alpha
                healthPulseOverlay.color = color;
                healthPulseOverlay.gameObject.SetActive(true);
            }
            else
            {
                // Hide the overlay
                healthPulseOverlay.gameObject.SetActive(false);
            }
        }
    }
    
    /// <summary>
    /// Shows the damage indicator when taking damage
    /// </summary>
    public void ShowDamageIndicator(int amount, GameObject damageSource)
    {
        // Cancel any existing damage coroutine
        if (damageCoroutine != null)
        {
            StopCoroutine(damageCoroutine);
        }
        
        // Start new damage effect
        damageCoroutine = StartCoroutine(DamageIndicatorEffect(damageSource));
    }
    
    /// <summary>
    /// Damage indicator fade effect coroutine
    /// </summary>
    private IEnumerator DamageIndicatorEffect(GameObject damageSource)
    {
        // Show vignette
        if (damageVignette != null)
        {
            Color color = damageVignette.color;
            color.a = 0.8f; // Start fully visible
            damageVignette.color = color;
        }
        
        // Show direction indicator if source is provided
        if (directionIndicator != null && damageSource != null)
        {
            // Calculate direction to damage source
            Vector3 dirToSource = damageSource.transform.position - transform.position;
            float angle = Mathf.Atan2(dirToSource.x, dirToSource.z) * Mathf.Rad2Deg;
            
            // Rotate the indicator to point toward the damage source
            directionIndicator.transform.rotation = Quaternion.Euler(0, 0, -angle);
            
            // Show the indicator
            directionIndicator.gameObject.SetActive(true);
        }
        
        // Fade out over time
        float elapsedTime = 0f;
        
        while (elapsedTime < damageIndicatorDuration)
        {
            elapsedTime += Time.deltaTime;
            float normalizedTime = elapsedTime / damageIndicatorDuration;
            
            // Fade vignette
            if (damageVignette != null)
            {
                Color color = damageVignette.color;
                color.a = Mathf.Lerp(0.8f, 0f, normalizedTime);
                damageVignette.color = color;
            }
            
            // Fade direction indicator
            if (directionIndicator != null && directionIndicator.gameObject.activeSelf)
            {
                Color color = directionIndicator.color;
                color.a = Mathf.Lerp(1f, 0f, normalizedTime);
                directionIndicator.color = color;
            }
            
            yield return null;
        }
        
        // Ensure elements are fully hidden
        if (damageVignette != null)
        {
            Color color = damageVignette.color;
            color.a = 0f;
            damageVignette.color = color;
        }
        
        if (directionIndicator != null)
        {
            directionIndicator.gameObject.SetActive(false);
            Color color = directionIndicator.color;
            color.a = 1f; // Reset alpha for next use
            directionIndicator.color = color;
        }
    }
    
    #endregion
    
    #region Weapon Display
    
    /// <summary>
    /// Updates the weapon display
    /// </summary>
    public void UpdateWeaponDisplay(WeaponItem weapon)
    {
        if (weapon == null)
            return;
            
        // Update weapon icon
        if (weaponIcon != null && weapon.ItemIcon != null)
        {
            weaponIcon.sprite = weapon.ItemIcon;
            weaponIcon.gameObject.SetActive(true);
        }
        
        // Update weapon name
        if (weaponNameText != null)
        {
            weaponNameText.text = weapon.ItemName;
        }
        
        // Update ammo display
        if (weapon.WeaponCategory != WeaponType.Melee)
        {
            UpdateAmmoDisplay(weapon.CurrentAmmo, weapon.AmmoCapacity);
        }
        else
        {
            if (ammoText != null)
            {
                ammoText.gameObject.SetActive(false);
            }
            
            if (ammoWarning != null)
            {
                ammoWarning.SetActive(false);
            }
        }
    }
    
    /// <summary>
    /// Updates the ammo display
    /// </summary>
    public void UpdateAmmoDisplay(int currentAmmo, int maxAmmo)
    {
        if (ammoText != null)
        {
            // Only show ammo for weapons with ammo
            if (maxAmmo > 0)
            {
                ammoText.text = $"{currentAmmo}/{maxAmmo}";
                ammoText.gameObject.SetActive(true);
                
                // Show warning if low on ammo
                if (ammoWarning != null)
                {
                    ammoWarning.SetActive(currentAmmo <= lowAmmoThreshold && currentAmmo > 0);
                }
                
                // Change text color if out of ammo
                if (currentAmmo <= 0)
                {
                    ammoText.color = Color.red;
                }
                else
                {
                    ammoText.color = Color.white;
                }
            }
            else
            {
                ammoText.gameObject.SetActive(false);
                
                if (ammoWarning != null)
                {
                    ammoWarning.SetActive(false);
                }
            }
        }
    }
    
    #endregion
    
    #region Objectives
    
    /// <summary>
    /// Updates the objective text and shows the objective panel
    /// </summary>
    public void ShowObjective(string objective)
    {
        // Cancel any existing objective coroutine
        if (objectiveShowCoroutine != null)
        {
            StopCoroutine(objectiveShowCoroutine);
        }
        
        // Start new objective display
        objectiveShowCoroutine = StartCoroutine(ShowObjectiveCoroutine(objective));
    }
    
    /// <summary>
    /// Shows the objective panel for a duration
    /// </summary>
    private IEnumerator ShowObjectiveCoroutine(string objective)
    {
        // Set objective text
        if (objectiveText != null)
        {
            objectiveText.text = objective;
        }
        
        // Show objective panel
        if (objectivePanel != null)
        {
            objectivePanel.SetActive(true);
        }
        
        // Wait for duration
        yield return new WaitForSeconds(objectiveShowDuration);
        
        // Hide objective panel
        if (objectivePanel != null)
        {
            objectivePanel.SetActive(false);
        }
    }
    
    #endregion
    
    #region Notifications
    
    /// <summary>
    /// Shows a notification message
    /// </summary>
    public void ShowNotification(string message)
    {
        // Cancel any existing notification coroutine
        if (notificationCoroutine != null)
        {
            StopCoroutine(notificationCoroutine);
        }
        
        // Start new notification display
        notificationCoroutine = StartCoroutine(ShowNotificationCoroutine(message));
    }
    
    /// <summary>
    /// Shows a notification for a duration
    /// </summary>
    private IEnumerator ShowNotificationCoroutine(string message)
    {
        // Set notification text
        if (notificationText != null)
        {
            notificationText.text = message;
        }
        
        // Show notification panel
        if (notificationPanel != null)
        {
            notificationPanel.SetActive(true);
        }
        
        // Play animation if available
        if (notificationAnimator != null)
        {
            notificationAnimator.SetTrigger("Show");
        }
        
        // Wait for duration
        yield return new WaitForSeconds(notificationDuration);
        
        // Play hide animation if available
        if (notificationAnimator != null)
        {
            notificationAnimator.SetTrigger("Hide");
            
            // Wait for animation to complete
            yield return new WaitForSeconds(0.5f);
        }
        
        // Hide notification panel
        if (notificationPanel != null)
        {
            notificationPanel.SetActive(false);
        }
    }
    
    #endregion
    
    #region Interaction
    
    /// <summary>
    /// Shows the interaction prompt
    /// </summary>
    public void ShowInteractionPrompt(string promptText)
    {
        if (interactionPrompt != null)
        {
            interactionPrompt.SetActive(true);
            
            if (interactionText != null)
            {
                interactionText.text = promptText;
            }
        }
        
        // Change crosshair
        if (crosshair != null && interactCrosshair != null)
        {
            crosshair.sprite = interactCrosshair;
        }
    }
    
    /// <summary>
    /// Hides the interaction prompt
    /// </summary>
    public void HideInteractionPrompt()
    {
        if (interactionPrompt != null)
        {
            interactionPrompt.SetActive(false);
        }
        
        // Reset crosshair
        if (crosshair != null && defaultCrosshair != null)
        {
            crosshair.sprite = defaultCrosshair;
        }
    }
    
    #endregion
    
    private void OnDestroy()
    {
        // Unsubscribe from events
        if (playerHealth != null)
        {
            playerHealth.OnHealthChanged -= UpdateHealthDisplay;
            playerHealth.OnDamageTaken -= ShowDamageIndicator;
        }
        
        if (weaponController != null)
        {
            weaponController.OnWeaponChanged -= UpdateWeaponDisplay;
            weaponController.OnAmmoChanged -= UpdateAmmoDisplay;
        }
    }
}