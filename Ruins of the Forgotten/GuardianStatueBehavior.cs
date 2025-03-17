using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Guardian Statue specific AI behavior
/// </summary>
public class GuardianStatueBehavior : MonoBehaviour
{
    [Header("Guardian Statue Settings")]
    [SerializeField] private float activationDistance = 10f;
    [SerializeField] private float attackRange = 3f;
    [SerializeField] private float attackCooldown = 3f;
    [SerializeField] private int smashDamage = 25;
    [SerializeField] private int groundPoundDamage = 20;
    [SerializeField] private float groundPoundRadius = 5f;
    [SerializeField] private float groundPoundCooldown = 10f;
    [SerializeField] private LayerMask playerLayer;
    
    [Header("Visual Effects")]
    [SerializeField] private GameObject eyeGlowObject;
    [SerializeField] private GameObject crackEffectPrefab;
    [SerializeField] private GameObject activationEffectPrefab;
    [SerializeField] private GameObject smashEffectPrefab;
    [SerializeField] private GameObject groundPoundEffectPrefab;
    [SerializeField] private GameObject deathEffectPrefab;
    
    [Header("Audio")]
    [SerializeField] private AudioClip activationSound;
    [SerializeField] private AudioClip footstepSound;
    [SerializeField] private AudioClip[] attackSounds;
    [SerializeField] private AudioClip groundPoundSound;
    [SerializeField] private AudioClip deathSound;
    
    // Component references
    private Animator animator;
    private NavMeshAgent navAgent;
    private EnemyAI enemyAI;
    private EnemyHealth health;
    private AudioSource audioSource;
    
    // Private variables
    private float nextAttackTime = 0f;
    private float nextGroundPoundTime = 0f;
    private bool isActivated = false;
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
        
        // Start deactivated
        if (navAgent != null)
        {
            navAgent.enabled = false;
        }
        
        if (eyeGlowObject != null)
        {
            eyeGlowObject.SetActive(false);
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
            
        // Check for activation
        if (!isActivated)
        {
            CheckForActivation();
        }
        else
        {
            // Update behavior
            UpdateBehavior();
            
            // Check for footstep sounds
            CheckFootstepSound();
        }
    }
    
    /// <summary>
    /// Checks if the statue should activate
    /// </summary>
    private void CheckForActivation()
    {
        if (player == null)
            return;
            
        // Activate if player is close or if damaged
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        if (distanceToPlayer <= activationDistance || (health != null && health.LastDamageTime > Time.time - 5f))
        {
            Activate();
        }
    }
    
    /// <summary>
    /// Activates the statue
    /// </summary>
    private void Activate()
    {
        isActivated = true;
        
        // Enable navigation
        if (navAgent != null)
        {
            navAgent.enabled = true;
        }
        
        // Enable eye glow
        if (eyeGlowObject != null)
        {
            eyeGlowObject.SetActive(true);
        }
        
        // Play activation animation
        if (animator != null)
        {
            animator.SetTrigger("Activate");
            animator.SetBool("IsActive", true);
        }
        
        // Play activation sound
        if (audioSource != null && activationSound != null)
        {
            audioSource.PlayOneShot(activationSound);
        }
        
        // Show activation effect
        if (activationEffectPrefab != null)
        {
            GameObject effectObj = Instantiate(activationEffectPrefab, transform.position, Quaternion.identity);
            Destroy(effectObj, 3f);
        }
        
        // Notify enemy AI that it's active
        if (enemyAI != null)
        {
            enemyAI.enabled = true;
        }
    }
    
    /// <summary>
    /// Updates the guardian statue behavior
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
            animator.SetBool("IsWalking", currentState == AIState.Chase);
            animator.SetBool("IsAttacking", currentState == AIState.Attack);
        }
        
        // If in attack range and cooldown elapsed, attack
        if (currentState == AIState.Attack && Time.time >= nextAttackTime)
        {
            // Check if ground pound is available
            if (Time.time >= nextGroundPoundTime && Random.value < 0.3f) // 30% chance
            {
                GroundPoundAttack();
            }
            else
            {
                SmashAttack();
            }
        }
    }
    
    /// <summary>
    /// Performs a standard smash attack
    /// </summary>
    private void SmashAttack()
    {
        // Set next attack time
        nextAttackTime = Time.time + attackCooldown;
        
        // Trigger attack animation
        if (animator != null)
        {
            animator.SetTrigger("Smash");
        }
        
        // Play attack sound
        PlayRandomSound(attackSounds);
        
        // Schedule actual damage to be applied during animation
        StartCoroutine(ApplySmashDamageWithDelay(1f));
    }
    
    /// <summary>
    /// Performs an area-of-effect ground pound attack
    /// </summary>
    private void GroundPoundAttack()
    {
        // Set next attack time and next ground pound time
        nextAttackTime = Time.time + attackCooldown * 1.5f;
        nextGroundPoundTime = Time.time + groundPoundCooldown;
        
        // Trigger ground pound animation
        if (animator != null)
        {
            animator.SetTrigger("GroundPound");
        }
        
        // Play ground pound sound
        if (audioSource != null && groundPoundSound != null)
        {
            audioSource.PlayOneShot(groundPoundSound);
        }
        
        // Schedule area damage to be applied during animation
        StartCoroutine(ApplyGroundPoundWithDelay(1.2f));
    }
    
    /// <summary>
    /// Applies smash damage after a delay (matched to animation)
    /// </summary>
    private IEnumerator ApplySmashDamageWithDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (player == null || isDead)
            yield break;
            
        // Check distance to player
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        
        if (distanceToPlayer <= attackRange)
        {
            // Check if player is in front of statue
            Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
            float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);
            
            // If player is in the attack cone (120 degrees)
            if (angleToPlayer <= 60f)
            {
                // Show smash effect
                if (smashEffectPrefab != null)
                {
                    Vector3 effectPosition = transform.position + transform.forward * 2f + Vector3.up * 1f;
                    GameObject effectObj = Instantiate(smashEffectPrefab, effectPosition, transform.rotation);
                    Destroy(effectObj, 2f);
                }
                
                // Deal damage to player
                HealthSystem playerHealth = player.GetComponent<HealthSystem>();
                if (playerHealth != null)
                {
                    playerHealth.TakeDamage(smashDamage, gameObject);
                }
                
                // Apply knockback force
                Rigidbody playerRb = player.GetComponent<Rigidbody>();
                if (playerRb != null)
                {
                    playerRb.AddForce(directionToPlayer * 10f, ForceMode.Impulse);
                }
            }
        }
    }
    
    /// <summary>
    /// Applies ground pound damage after a delay (matched to animation)
    /// </summary>
    private IEnumerator ApplyGroundPoundWithDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (isDead)
            yield break;
            
        // Show ground pound effect
        if (groundPoundEffectPrefab != null)
        {
            GameObject effectObj = Instantiate(groundPoundEffectPrefab, transform.position, Quaternion.identity);
            Destroy(effectObj, 3f);
        }
        
        // Apply area damage
        Collider[] hitColliders = Physics.OverlapSphere(transform.position, groundPoundRadius, playerLayer);
        foreach (Collider hitCollider in hitColliders)
        {
            // Check if it's the player
            if (hitCollider.gameObject == player)
            {
                // Deal damage to player
                HealthSystem playerHealth = player.GetComponent<HealthSystem>();
                if (playerHealth != null)
                {
                    playerHealth.TakeDamage(groundPoundDamage, gameObject);
                }
                
                // Apply knockback force (away from statue)
                Rigidbody playerRb = player.GetComponent<Rigidbody>();
                if (playerRb != null)
                {
                    Vector3 direction = (player.transform.position - transform.position).normalized;
                    playerRb.AddForce(direction * 15f + Vector3.up * 5f, ForceMode.Impulse);
                }
            }
        }
    }
    
    /// <summary>
    /// Checks if footstep sound should be played
    /// </summary>
    private void CheckFootstepSound()
    {
        if (navAgent == null || footstepSound == null || audioSource == null)
            return;
            
        // Play footstep sound based on agent velocity and animation
        if (navAgent.velocity.magnitude > 0.5f && animator != null && animator.GetBool("IsWalking"))
        {
            // Get normalized time of walk cycle
            AnimatorStateInfo stateInfo = animator.GetCurrentAnimatorStateInfo(0);
            float normalizedTime = stateInfo.normalizedTime % 1f;
            
            // Play footstep at specific points in animation cycle
            if ((normalizedTime > 0.2f && normalizedTime < 0.3f) || 
                (normalizedTime > 0.7f && normalizedTime < 0.8f))
            {
                if (!audioSource.isPlaying)
                {
                    audioSource.PlayOneShot(footstepSound);
                }
            }
        }
    }
    
    /// <summary>
    /// Handles damage taken event
    /// </summary>
    private void OnDamageTaken(int amount, bool wasCritical)
    {
        // Activate if not already active
        if (!isActivated)
        {
            Activate();
        }
        
        // Show crack effect at random position on statue
        if (crackEffectPrefab != null)
        {
            Vector3 randomOffset = new Vector3(
                Random.Range(-0.5f, 0.5f),
                Random.Range(0.5f, 1.5f),
                Random.Range(-0.5f, 0.5f)
            );
            
            GameObject effectObj = Instantiate(crackEffectPrefab, transform.position + randomOffset, Quaternion.identity);
            effectObj.transform.parent = transform; // Parent to statue so it moves with it
            Destroy(effectObj, 30f); // Long duration to show accumulated damage
        }
        
        // Play damage animation if critical hit
        if (wasCritical && animator != null)
        {
            animator.SetTrigger("Damage");
        }
    }
    
    /// <summary>
    /// Handles death event
    /// </summary>
    private void OnDeath()
    {
        isDead = true;
        
        // Play death sound
        if (audioSource != null && deathSound != null)
        {
            audioSource.PlayOneShot(deathSound);
        }
        
        // Play death animation
        if (animator != null)
        {
            animator.SetTrigger("Death");
        }
        
        // Show death effect
        if (deathEffectPrefab != null)
        {
            GameObject effectObj = Instantiate(deathEffectPrefab, transform.position, Quaternion.identity);
            Destroy(effectObj, 5f);
        }
        
        // Disable components
        if (navAgent != null)
        {
            navAgent.isStopped = true;
            navAgent.enabled = false;
        }
        
        // Disable eye glow
        if (eyeGlowObject != null)
        {
            eyeGlowObject.SetActive(false);
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