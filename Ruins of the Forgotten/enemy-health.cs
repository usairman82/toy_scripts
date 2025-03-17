using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Handles enemy health, damage, and death
/// </summary>
public class EnemyHealth : MonoBehaviour
{
    [Header("Health Settings")]
    [SerializeField] private int maxHealth = 100;
    [SerializeField] private bool isImmuneToBullets = false;
    [SerializeField] private float damageModifier = 1f;
    
    [Header("Death Settings")]
    [SerializeField] private float deathDelay = 3f;
    [SerializeField] private GameObject deathEffect;
    [SerializeField] private GameObject[] lootDropPrefabs;
    [SerializeField] private float dropChance = 0.4f;
    
    [Header("UI")]
    [SerializeField] private GameObject healthBarPrefab;
    [SerializeField] private Vector3 healthBarOffset = new Vector3(0, 2.2f, 0);
    [SerializeField] private float healthBarDisplayTime = 5f;
    
    [Header("Effects")]
    [SerializeField] private GameObject damageEffect;
    [SerializeField] private float damageEffectDuration = 0.1f;
    [SerializeField] private AudioClip[] damageClips;
    [SerializeField] private AudioClip[] deathClips;
    
    // Public properties
    public bool IsDead { get; private set; }
    public float LastDamageTime { get; private set; } = -999f;
    
    // Private variables
    private int currentHealth;
    private EnemyAI enemyAI;
    private Animator animator;
    private Collider[] colliders;
    private Rigidbody[] rigidbodies;
    private AudioSource audioSource;
    private GameObject healthBarInstance;
    private Image healthBarFill;
    private float healthBarHideTime;
    
    private void Awake()
    {
        // Get components
        enemyAI = GetComponent<EnemyAI>();
        animator = GetComponent<Animator>();
        colliders = GetComponentsInChildren<Collider>();
        rigidbodies = GetComponentsInChildren<Rigidbody>();
        audioSource = GetComponent<AudioSource>();
        
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.spatialBlend = 1f; // 3D sound
        }
        
        // Initialize health
        currentHealth = maxHealth;
        IsDead = false;
    }
    
    private void Start()
    {
        // Create health bar if prefab is assigned
        if (healthBarPrefab != null)
        {
            healthBarInstance = Instantiate(healthBarPrefab, transform.position + healthBarOffset, Quaternion.identity);
            healthBarInstance.transform.SetParent(transform);
            
            // Find health bar fill component
            healthBarFill = healthBarInstance.GetComponentInChildren<Image>();
            
            // Initially hide health bar
            healthBarInstance.SetActive(false);
        }
    }
    
    private void Update()
    {
        // Hide health bar after display time
        if (healthBarInstance != null && healthBarInstance.activeSelf)
        {
            if (Time.time > healthBarHideTime)
            {
                healthBarInstance.SetActive(false);
            }
            else
            {
                // Make health bar face camera
                if (Camera.main != null)
                {
                    healthBarInstance.transform.LookAt(Camera.main.transform);
                    healthBarInstance.transform.Rotate(0, 180, 0);
                }
            }
        }
    }
    
    /// <summary>
    /// Apply damage to the enemy
    /// </summary>
    /// <param name="amount">Amount of damage to apply</param>
    /// <param name="fromMelee">Whether damage is from melee (bypasses bullet immunity)</param>
    public void TakeDamage(int amount, bool fromMelee = false)
    {
        // Ignore damage if already dead
        if (IsDead)
            return;
            
        // Check bullet immunity
        if (isImmuneToBullets && !fromMelee)
        {
            // Play bullet deflection effect/sound
            PlayDamageEffect(transform.position, true);
            return;
        }
        
        // Apply damage modifier
        int adjustedDamage = Mathf.RoundToInt(amount * damageModifier);
        
        // Apply damage
        currentHealth -= adjustedDamage;
        LastDamageTime = Time.time;
        
        // Show health bar
        if (healthBarInstance != null)
        {
            healthBarInstance.SetActive(true);
            healthBarHideTime = Time.time + healthBarDisplayTime;
            
            // Update health bar fill
            if (healthBarFill != null)
            {
                healthBarFill.fillAmount = (float)currentHealth / maxHealth;
            }
        }
        
        // Play damage effect
        PlayDamageEffect(transform.position);
        
        // Alert AI
        if (enemyAI != null)
        {
            enemyAI.OnDamageTaken();
        }
        
        // Play damage animation if not dead
        if (animator != null && currentHealth > 0)
        {
            animator.SetTrigger("Damage");
        }
        
        // Check for death
        if (currentHealth <= 0)
        {
            Die();
        }
    }
    
    /// <summary>
    /// Handles enemy death
    /// </summary>
    private void Die()
    {
        if (IsDead)
            return;
            
        IsDead = true;
        
        // Play death animation if available
        if (animator != null)
        {
            animator.SetTrigger("Death");
        }
        
        // Play death sound
        if (audioSource != null && deathClips.Length > 0)
        {
            int randomIndex = Random.Range(0, deathClips.Length);
            audioSource.PlayOneShot(deathClips[randomIndex]);
        }
        
        // Spawn death effect
        if (deathEffect != null)
        {
            Instantiate(deathEffect, transform.position + Vector3.up, Quaternion.identity);
        }
        
        // Disable AI and colliders
        if (enemyAI != null)
        {
            enemyAI.enabled = false;
        }
        
        foreach (Collider col in colliders)
        {
            col.enabled = false;
        }
        
        // Optionally convert to ragdoll
        if (rigidbodies.Length > 0 && animator != null)
        {
            animator.enabled = false;
            
            foreach (Rigidbody rb in rigidbodies)
            {
                rb.isKinematic = false;
                rb.useGravity = true;
            }
        }
        
        // Drop loot
        DropLoot();
        
        // Destroy the enemy after delay
        Destroy(gameObject, deathDelay);
    }
    
    /// <summary>
    /// Drops loot based on chance
    /// </summary>
    private void DropLoot()
    {
        if (lootDropPrefabs.Length == 0 || Random.value > dropChance)
            return;
            
        // Choose random loot prefab
        int randomIndex = Random.Range(0, lootDropPrefabs.Length);
        GameObject lootPrefab = lootDropPrefabs[randomIndex];
        
        if (lootPrefab != null)
        {
            // Spawn loot slightly above ground
            Vector3 dropPosition = transform.position + Vector3.up * 0.5f;
            Instantiate(lootPrefab, dropPosition, Quaternion.identity);
        }
    }
    
    /// <summary>
    /// Plays damage effect and sound
    /// </summary>
    private void PlayDamageEffect(Vector3 position, bool bulletDeflection = false)
    {
        // Spawn damage effect
        if (damageEffect != null)
        {
            GameObject effect = Instantiate(damageEffect, position, Quaternion.identity);
            Destroy(effect, damageEffectDuration);
        }
        
        // Play damage sound
        if (audioSource != null && damageClips.Length > 0)
        {
            int randomIndex = Random.Range(0, damageClips.Length);
            audioSource.PlayOneShot(damageClips[randomIndex]);
        }
    }
    
    /// <summary>
    /// Heals the enemy by the specified amount
    /// </summary>
    public void Heal(int amount)
    {
        if (IsDead)
            return;
            
        currentHealth += amount;
        currentHealth = Mathf.Clamp(currentHealth, 0, maxHealth);
        
        // Update health bar if visible
        if (healthBarInstance != null && healthBarInstance.activeSelf && healthBarFill != null)
        {
            healthBarFill.fillAmount = (float)currentHealth / maxHealth;
        }
    }
}
