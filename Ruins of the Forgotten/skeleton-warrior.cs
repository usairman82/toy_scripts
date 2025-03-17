using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Skeleton Warrior specific AI behavior
/// </summary>
public class SkeletonWarriorBehavior : MonoBehaviour
{
    [Header("Skeleton Warrior Settings")]
    [SerializeField] private float attackRange = 2f;
    [SerializeField] private float attackCooldown = 1.5f;
    [SerializeField] private int attackDamage = 10;
    [SerializeField] private float blockChance = 0.3f;
    [SerializeField] private float blockDamageReduction = 0.5f;
    [SerializeField] private GameObject shieldObject;
    
    [Header("Visual Effects")]
    [SerializeField] private GameObject attackSwingEffectPrefab;
    [SerializeField] private GameObject blockEffectPrefab;
    [SerializeField] private float effectDuration = 0.5f;
    
    [Header("Audio")]
    [SerializeField] private AudioClip[] attackSounds;
    [SerializeField] private AudioClip[] blockSounds;
    [SerializeField] private AudioClip[] alertSounds;
    [SerializeField] private AudioClip[] deathSounds;
    
    // Component references
    private Animator animator;
    private NavMeshAgent navAgent;
    private EnemyAI enemyAI;
    private EnemyHealth health;
    private AudioSource audioSource;
    
    // Private variables
    private float nextAttackTime = 0f;
    private bool isBlocking = false;
    private bool isDead = false;
    private GameObject player;
    
    private void Awake()
    {
        // Get components
        animator = GetComponent<Animator>();
        navAgent = GetComponent<NavMeshAgent>();
        enemyAI = GetComponent<EnemyAI>();
        health = GetComponent<EnemyHealth>();
        audioSource = GetComponent<AudioSource>();
        
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.spatialBlend = 1f; // 3D sound
        }
        
        // Set initial state
        isBlocking = false;
        if (shieldObject != null)
        {
            shieldObject.SetActive(true);
        }
    }
    
    private void Start()
    {
        // Find player
        player = GameObject.FindGameObjectWithTag("Player");
        
        // Subscribe to health damage event
        if (health != null)
        {
            health.OnDamageTaken += OnDamageTaken;
            health.OnDeath += OnDeath;
        }
    }
    
    private void Update()
    {
        if (isDead)
            return;
            
        // Update behavior based on state
        UpdateBehavior();
    }
    
    /// <summary>
    /// Updates the skeleton warrior behavior
    /// </summary>
    private void UpdateBehavior()
    {
        if (player == null || enemyAI == null)
            return;
            
        // Get current state from EnemyAI
        AIState currentState = enemyAI.CurrentState;
        
        // Handle blocking - decide to block or not
        DecideBlocking(currentState);
        
        // Handle animation states
        if (animator != null)
        {
            animator.SetBool("IsBlocking", isBlocking);
        }
        
        // If in attack range and cooldown elapsed, attack
        if (currentState == AIState.Attack && Time.time >= nextAttackTime)
        {
            Attack();
        }
    }
    
    /// <summary>
    /// Decides whether to block or not
    /// </summary>
    private void DecideBlocking(AIState currentState)
    {
        // Don't block if dead
        if (health != null && health.IsDead)
        {
            isBlocking = false;
            return;
        }
        
        // Only block in combat, not when patrolling
        if (currentState == AIState.Patrol || currentState == AIState.Idle)
        {
            isBlocking = false;
            return;
        }
        
        // Random chance to block during combat
        if (currentState == AIState.Attack || currentState == AIState.Chase)
        {
            // Stop blocking when attacking
            if (Time.time >= nextAttackTime - 0.5f && Time.time <= nextAttackTime + 0.5f)
            {
                isBlocking = false;
                return;
            }
            
            // Random chance to block
            if (Random.value < blockChance)
            {
                isBlocking = true;
            }
            else
            {
                isBlocking = false;
            }
        }
    }
    
    /// <summary>
    /// Performs an attack
    /// </summary>
    private void Attack()
    {
        // Set next attack time
        nextAttackTime = Time.time + attackCooldown;
        
        // Stop blocking when attacking
        isBlocking = false;
        
        // Trigger attack animation
        if (animator != null)
        {
            animator.SetTrigger("Attack");
        }
        
        // Play attack sound
        PlayRandomSound(attackSounds);
        
        // Schedule actual damage to be applied during animation
        StartCoroutine(ApplyDamageWithDelay(0.5f));
    }
    
    /// <summary>
    /// Applies damage after a delay (matched to animation)
    /// </summary>
    private IEnumerator ApplyDamageWithDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (player == null || isDead)
            yield break;
            
        // Check distance to player
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        
        if (distanceToPlayer <= attackRange)
        {
            // Check if player is in front of skeleton
            Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
            float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);
            
            // If player is in the attack cone (60 degrees)
            if (angleToPlayer <= 60f)
            {
                // Show attack effect
                if (attackSwingEffectPrefab != null)
                {
                    Vector3 effectPosition = transform.position + transform.forward * 1f + Vector3.up * 1f;
                    GameObject effectObj = Instantiate(attackSwingEffectPrefab, effectPosition, transform.rotation);
                    Destroy(effectObj, effectDuration);
                }
                
                // Deal damage to player
                HealthSystem playerHealth = player.GetComponent<HealthSystem>();
                if (playerHealth != null)
                {
                    playerHealth.TakeDamage(attackDamage, gameObject);
                }
            }
        }
    }
    
    /// <summary>
    /// Handles damage taken event
    /// </summary>
    private void OnDamageTaken(int amount, bool wasCritical)
    {
        // If blocking, reduce damage
        if (isBlocking)
        {
            // Show block effect
            if (blockEffectPrefab != null && shieldObject != null)
            {
                GameObject effectObj = Instantiate(blockEffectPrefab, shieldObject.transform.position, shieldObject.transform.rotation);
                Destroy(effectObj, effectDuration);
            }
            
            // Play block sound
            PlayRandomSound(blockSounds);
        }
    }
    
    /// <summary>
    /// Handles death event
    /// </summary>
    private void OnDeath()
    {
        isDead = true;
        
        // Play death sound
        PlayRandomSound(deathSounds);
        
        // Disable shield
        if (shieldObject != null)
        {
            shieldObject.SetActive(false);
        }
    }
    
    /// <summary>
    /// Plays a random sound from the provided array
    /// </summary>
    private void PlayRandomSound(AudioClip[] sounds)
    {
        if (sounds.Length == 0 || audioSource == null)
            return;
            
        int randomIndex = Random.Range(0, sounds.Length);
        audioSource.PlayOneShot(sounds[randomIndex]);
    }
    
    private void OnDestroy()
    {
        // Unsubscribe from events
        if (health != null)
        {
            health.OnDamageTaken -= OnDamageTaken;
            health.OnDeath -= OnDeath;
        }
    }
}

/// <summary>
/// Extension of EnemyHealth for Skeleton Warrior specifics
/// </summary>
public static class SkeletonWarriorHealthExtensions
{
    /// <summary>
    /// Modifies damage based on blocking state
    /// </summary>
    public static int CalculateModifiedDamage(this EnemyHealth health, int damage, bool isBlocking, float blockDamageReduction)
    {
        if (isBlocking)
        {
            // Reduce damage when blocking
            return Mathf.FloorToInt(damage * (1f - blockDamageReduction));
        }
        
        return damage;
    }
}

/// <summary>
/// State enum for enemy AI
/// </summary>
public enum AIState
{
    Patrol,
    Chase,
    Attack,
    SearchLastKnownPosition,
    Idle
}
