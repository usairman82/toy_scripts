using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;

/// <summary>
/// Handles player health, damage, and healing
/// </summary>
public class HealthSystem : MonoBehaviour
{
    [Header("Health Settings")]
    [SerializeField] private int maxHealth = 100;
    [SerializeField] private float regenerationRate = 0f; // Health regenerated per second (0 for no regeneration)
    [SerializeField] private float regenerationDelay = 5f; // Seconds to wait after taking damage before regenerating
    
    [Header("Damage Visualization")]
    [SerializeField] private MonoBehaviour damageVignette; // Reference to a vignette effect
    [SerializeField] private AudioClip damageSound;
    [SerializeField] private AudioClip healSound;
    [SerializeField] private AudioClip deathSound;
    
    // Events
    public event Action<int, int> OnHealthChanged; // Current health, max health
    public event Action OnDeath;
    
    // Private variables
    private int currentHealth;
    private float lastDamageTime = -999f;
    private bool isDead = false;
    private AudioSource audioSource;
    private UIManager uiManager;
    
    private void Awake()
    {
        currentHealth = maxHealth;
        audioSource = GetComponent<AudioSource>();
        
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
    }
    
    private void Start()
    {
        uiManager = FindObjectOfType<UIManager>();
        
        // Initialize health UI
        if (uiManager != null)
        {
            OnHealthChanged?.Invoke(currentHealth, maxHealth);
        }
    }
    
    private void Update()
    {
        // Handle health regeneration
        if (regenerationRate > 0 && currentHealth < maxHealth && !isDead)
        {
            if (Time.time > lastDamageTime + regenerationDelay)
            {
                float healthToAdd = regenerationRate * Time.deltaTime;
                int healthAddedInt = Mathf.FloorToInt(healthToAdd);
                
                if (healthAddedInt > 0)
                {
                    Heal(healthAddedInt);
                }
            }
        }
    }
    
    /// <summary>
    /// Apply damage to the player
    /// </summary>
    /// <param name="amount">Amount of damage to apply</param>
    /// <param name="damageSource">Optional source of the damage</param>
    public void TakeDamage(int amount, GameObject damageSource = null)
    {
        if (isDead)
            return;
            
        currentHealth -= amount;
        lastDamageTime = Time.time;
        
        // Clamp health to prevent negative values
        currentHealth = Mathf.Clamp(currentHealth, 0, maxHealth);
        
        // Trigger health changed event
        OnHealthChanged?.Invoke(currentHealth, maxHealth);
        
        // Play damage sound
        if (audioSource != null && damageSound != null)
        {
            audioSource.PlayOneShot(damageSound);
        }
        
        // Show damage vignette
        if (damageVignette != null)
        {
            StartCoroutine(FlashDamageVignette());
        }
        
        // Check for death
        if (currentHealth <= 0)
        {
            Die();
        }
    }
    
    /// <summary>
    /// Heal the player
    /// </summary>
    /// <param name="amount">Amount of health to restore</param>
    public void Heal(int amount)
    {
        if (isDead)
            return;
            
        currentHealth += amount;
        
        // Clamp health to prevent exceeding max health
        currentHealth = Mathf.Clamp(currentHealth, 0, maxHealth);
        
        // Trigger health changed event
        OnHealthChanged?.Invoke(currentHealth, maxHealth);
        
        // Play heal sound
        if (audioSource != null && healSound != null)
        {
            audioSource.PlayOneShot(healSound);
        }
    }
    
    /// <summary>
    /// Use a health item from inventory
    /// </summary>
    /// <param name="item">The health item to use</param>
    /// <returns>True if item was used successfully</returns>
    public bool UseHealthItem(HealthItem item)
    {
        if (isDead || currentHealth >= maxHealth)
            return false;
            
        Heal(item.HealthRestoreAmount);
        return true;
    }
    
    /// <summary>
    /// Handle player death
    /// </summary>
    private void Die()
    {
        if (isDead)
            return;
            
        isDead = true;
        
        // Play death sound
        if (audioSource != null && deathSound != null)
        {
            audioSource.PlayOneShot(deathSound);
        }
        
        // Trigger death event
        OnDeath?.Invoke();
        
        // Disable player controls
        PlayerController controller = GetComponent<PlayerController>();
        if (controller != null)
        {
            controller.enabled = false;
        }
        
        // Show death UI
        if (uiManager != null)
        {
            uiManager.ShowDeathPanel();
        }
    }
    
    /// <summary>
    /// Flash damage vignette effect when taking damage
    /// </summary>
    private IEnumerator FlashDamageVignette()
    {
        if (damageVignette != null)
        {
            damageVignette.enabled = true;
            yield return new WaitForSeconds(0.5f);
            damageVignette.enabled = false;
        }
    }
    
    /// <summary>
    /// Reset player health (used when respawning)
    /// </summary>
    public void ResetHealth()
    {
        isDead = false;
        currentHealth = maxHealth;
        OnHealthChanged?.Invoke(currentHealth, maxHealth);
    }
}
