using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Mummy specific AI behavior
/// </summary>
public class MummyBehavior : MonoBehaviour
{
    [Header("Mummy Settings")]
    [SerializeField] private float attackRange = 2.5f;
    [SerializeField] private float attackCooldown = 2f;
    [SerializeField] private int attackDamage = 15;
    [SerializeField] private float paralyzeChance = 0.3f;
    [SerializeField] private float paralyzeDuration = 3f;
    [SerializeField] private float wanderRadius = 10f;
    [SerializeField] private float bandageUnravelSpeed = 0.1f;
    
    [Header("Visual Effects")]
    [SerializeField] private GameObject graspEffectPrefab;
    [SerializeField] private GameObject paralyzeEffectPrefab;
    [SerializeField] private GameObject bandageTrailPrefab;
    [SerializeField] private Transform[] bandageSpawnPoints;
    [SerializeField] private float effectDuration = 0.5f;
    
    [Header("Audio")]
    [SerializeField] private AudioClip[] attackSounds;
    [SerializeField] private AudioClip[] paralyzeAttackSounds;
    [SerializeField] private AudioClip[] alertSounds;
    [SerializeField] private AudioClip[] deathSounds;
    [SerializeField] private AudioClip[] ambientMoanSounds;
    
    // Component references
    private Animator animator;
    private NavMeshAgent navAgent;
    private EnemyAI enemyAI;
    private EnemyHealth health;
    private AudioSource audioSource;
    
    // Private variables
    private float nextAttackTime = 0f;
    private float nextAmbientSoundTime = 0f;
    private bool isDead = false;
    private GameObject player;
    private List<GameObject> activeBandageTrails = new List<GameObject>();
    private float bandageUnravelAmount = 0f;
    
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
        
        // Set initial ambient sound time
        nextAmbientSoundTime = Time.time + Random.Range(5f, 15f);
    }
    
    private void Update()
    {
        if (isDead)
            return;
            
        // Update behavior based on state
        UpdateBehavior();
        
        // Check for ambient sounds
        CheckAmbientSounds();
        
        // Update bandage unravel effect
        UpdateBandageUnravel();
    }
    
    /// <summary>
    /// Updates the mummy behavior
    /// </summary>
    private void UpdateBehavior()
    {
        if (player == null || enemyAI == null)
            return;
            
        // Get current state from EnemyAI
        AIState currentState = enemyAI.CurrentState;
        
        // Handle animation states
        if (animator != null)
        {
            animator.SetBool("IsWalking", currentState == AIState.Patrol || currentState == AIState.SearchLastKnownPosition);
            animator.SetBool("IsChasing", currentState == AIState.Chase);
            animator.SetBool("IsAttacking", currentState == AIState.Attack);
        }
        
        // If in attack range and cooldown elapsed, attack
        if (currentState == AIState.Attack && Time.time >= nextAttackTime)
        {
            // Decide which attack to use
            if (Random.value < paralyzeChance)
            {
                ParalyzeAttack();
            }
            else
            {
                StandardAttack();
            }
        }
    }
    
    /// <summary>
    /// Checks if ambient sounds should be played
    /// </summary>
    private void CheckAmbientSounds()
    {
        if (Time.time >= nextAmbientSoundTime)
        {
            // Play random ambient sound
            if (ambientMoanSounds.Length > 0)
            {
                int index = Random.Range(0, ambientMoanSounds.Length);
                if (audioSource != null && ambientMoanSounds[index] != null)
                {
                    audioSource.PlayOneShot(ambientMoanSounds[index], 0.5f);
                }
            }
            
            // Set next ambient sound time
            nextAmbientSoundTime = Time.time + Random.Range(8f, 20f);
        }
    }
    
    /// <summary>
    /// Updates the bandage unravel effect based on movement and damage
    /// </summary>
    private void UpdateBandageUnravel()
    {
        // Increase unravel amount based on movement
        if (navAgent != null && navAgent.velocity.magnitude > 0.5f)
        {
            bandageUnravelAmount += navAgent.velocity.magnitude * Time.deltaTime * bandageUnravelSpeed;
        }
        
        // Spawn bandage trail at threshold values
        if (bandageUnravelAmount >= 1f && bandageSpawnPoints.Length > 0)
        {
            // Reset counter
            bandageUnravelAmount = 0f;
            
            // Choose random spawn point
            int spawnIndex = Random.Range(0, bandageSpawnPoints.Length);
            Transform spawnPoint = bandageSpawnPoints[spawnIndex];
            
            if (spawnPoint != null && bandageTrailPrefab != null)
            {
                // Spawn bandage trail
                GameObject bandageTrail = Instantiate(bandageTrailPrefab, spawnPoint.position, Quaternion.identity);
                
                // Add to active trails list
                activeBandageTrails.Add(bandageTrail);
                
                // Destroy after time
                StartCoroutine(DestroyBandageTrail(bandageTrail, 10f));
            }
        }
    }
    
    /// <summary>
    /// Destroys a bandage trail after a delay
    /// </summary>
    private IEnumerator DestroyBandageTrail(GameObject trail, float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (trail != null)
        {
            activeBandageTrails.Remove(trail);
            Destroy(trail);
        }
    }
    
    /// <summary>
    /// Performs a standard attack
    /// </summary>
    private void StandardAttack()
    {
        // Set next attack time
        nextAttackTime = Time.time + attackCooldown;
        
        // Trigger attack animation
        if (animator != null)
        {
            animator.SetTrigger("Attack");
        }
        
        // Play attack sound
        PlayRandomSound(attackSounds);
        
        // Schedule actual damage to be applied during animation
        StartCoroutine(ApplyDamageWithDelay(0.5f, false));
    }
    
    /// <summary>
    /// Performs a paralyzing attack
    /// </summary>
    private void ParalyzeAttack()
    {
        // Set next attack time (longer cooldown for special attack)
        nextAttackTime = Time.time + attackCooldown * 1.5f;
        
        // Trigger special attack animation
        if (animator != null)
        {
            animator.SetTrigger("ParalyzeAttack");
        }
        
        // Play paralyze attack sound
        PlayRandomSound(paralyzeAttackSounds);
        
        // Schedule damage with paralyze effect
        StartCoroutine(ApplyDamageWithDelay(0.7f, true));
    }
    
    /// <summary>
    /// Applies damage after a delay (matched to animation)
    /// </summary>
    private IEnumerator ApplyDamageWithDelay(float delay, bool paralyze)
    {
        yield return new WaitForSeconds(delay);
        
        if (player == null || isDead)
            yield break;
            
        // Check distance to player
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        
        if (distanceToPlayer <= attackRange)
        {
            // Check if player is in front of mummy
            Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
            float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);
            
            // If player is in the attack cone (90 degrees for mummy, wider than others)
            if (angleToPlayer <= 90f)
            {
                // Show attack effect
                GameObject effectPrefab = paralyze ? paralyzeEffectPrefab : graspEffectPrefab;
                if (effectPrefab != null)
                {
                    Vector3 effectPosition = transform.position + transform.forward * 1f + Vector3.up * 1f;
                    GameObject effectObj = Instantiate(effectPrefab, effectPosition, transform.rotation);
                    Destroy(effectObj, effectDuration);
                }
                
                // Deal damage to player
                HealthSystem playerHealth = player.GetComponent<HealthSystem>();
                if (playerHealth != null)
                {
                    playerHealth.TakeDamage(attackDamage, gameObject);
                    
                    // Apply paralyze effect if using paralyze attack
                    if (paralyze)
                    {
                        StartCoroutine(ParalyzePlayer());
                    }
                }
            }
        }
    }
    
    /// <summary>
    /// Temporarily paralyzes the player
    /// </summary>
    private IEnumerator ParalyzePlayer()
    {
        // Get player controller
        PlayerController playerController = player.GetComponent<PlayerController>();
        
        if (playerController != null)
        {
            // Disable player movement
            playerController.enabled = false;
            
            // Show paralyze effect
            if (paralyzeEffectPrefab != null)
            {
                GameObject effectObj = Instantiate(paralyzeEffectPrefab, player.transform.position, Quaternion.identity);
                Destroy(effectObj, paralyzeDuration);
            }
            
            // Wait for paralysis duration
            yield return new WaitForSeconds(paralyzeDuration);
            
            // Re-enable player movement
            playerController.enabled = true;
        }
    }
    
    /// <summary>
    /// Handles damage taken event
    /// </summary>
    private void OnDamageTaken(int amount, bool wasCritical)
    {
        // Play damage animation
        if (animator != null)
        {
            animator.SetTrigger("Damage");
        }
        
        // Increase bandage unravel amount
        bandageUnravelAmount += amount * 0.05f;
        
        // Spawn multiple bandage trails on heavy damage
        if (wasCritical && bandageSpawnPoints.Length > 0)
        {
            for (int i = 0; i < 3; i++)
            {
                if (bandageTrailPrefab != null)
                {
                    // Choose random spawn point
                    int spawnIndex = Random.Range(0, bandageSpawnPoints.Length);
                    Transform spawnPoint = bandageSpawnPoints[spawnIndex];
                    
                    if (spawnPoint != null)
                    {
                        // Spawn bandage trail
                        GameObject bandageTrail = Instantiate(bandageTrailPrefab, spawnPoint.position, Quaternion.identity);
                        
                        // Add to active trails list
                        activeBandageTrails.Add(bandageTrail);
                        
                        // Destroy after time
                        StartCoroutine(DestroyBandageTrail(bandageTrail, 10f));
                    }
                }
            }
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
        
        // Play death animation
        if (animator != null)
        {
            animator.SetTrigger("Death");
        }
        
        // Spawn many bandage trails
        if (bandageSpawnPoints.Length > 0 && bandageTrailPrefab != null)
        {
            for (int i = 0; i < bandageSpawnPoints.Length; i++)
            {
                if (bandageSpawnPoints[i] != null)
                {
                    GameObject bandageTrail = Instantiate(bandageTrailPrefab, bandageSpawnPoints[i].position, Quaternion.identity);
                    Destroy(bandageTrail, 15f);
                }
            }
        }
        
        // Clean up
        StopAllCoroutines();
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
        
        // Clean up any remaining bandage trails
        foreach (GameObject trail in activeBandageTrails)
        {
            if (trail != null)
            {
                Destroy(trail);
            }
        }
        
        activeBandageTrails.Clear();
    }
}