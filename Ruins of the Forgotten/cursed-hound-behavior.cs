using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Cursed Hound specific AI behavior
/// </summary>
public class CursedHoundBehavior : MonoBehaviour
{
    [Header("Cursed Hound Settings")]
    [SerializeField] private float attackRange = 2f;
    [SerializeField] private float attackCooldown = 1f;
    [SerializeField] private int attackDamage = 8;
    [SerializeField] private float jumpAttackRange = 8f;
    [SerializeField] private float jumpAttackCooldown = 6f;
    [SerializeField] private int jumpAttackDamage = 12;
    [SerializeField] private float packHowlRadius = 20f;
    [SerializeField] private LayerMask houndLayer;
    
    [Header("Visual Effects")]
    [SerializeField] private GameObject biteEffectPrefab;
    [SerializeField] private GameObject jumpAttackEffectPrefab;
    [SerializeField] private GameObject eyeGlowObject;
    [SerializeField] private float effectDuration = 0.5f;
    
    [Header("Audio")]
    [SerializeField] private AudioClip[] attackSounds;
    [SerializeField] private AudioClip jumpSound;
    [SerializeField] private AudioClip howlSound;
    [SerializeField] private AudioClip[] deathSounds;
    [SerializeField] private AudioClip[] idleSounds;
    
    // Component references
    private Animator animator;
    private NavMeshAgent navAgent;
    private EnemyAI enemyAI;
    private EnemyHealth health;
    private AudioSource audioSource;
    
    // Private variables
    private float nextAttackTime = 0f;
    private float nextJumpAttackTime = 0f;
    private float nextHowlTime = 0f;
    private bool isDead = false;
    private GameObject player;
    private bool isJumping = false;
    private Vector3 jumpTarget;
    
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
        
        // Enable eye glow
        if (eyeGlowObject != null)
        {
            eyeGlowObject.SetActive(true);
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
        
        // Set initial jump attack time
        nextJumpAttackTime = Time.time + Random.Range(3f, 5f);
        
        // Set initial howl time
        nextHowlTime = Time.time + Random.Range(10f, 20f);
    }
    
    private void Update()
    {
        if (isDead || isJumping)
            return;
            
        // Update behavior based on state
        UpdateBehavior();
        
        // Play random idle sounds occasionally
        if (Random.value < 0.001f && audioSource != null && idleSounds.Length > 0)
        {
            int randomIndex = Random.Range(0, idleSounds.Length);
            audioSource.PlayOneShot(idleSounds[randomIndex], 0.5f);
        }
        
        // Check if time to howl
        if (Time.time >= nextHowlTime)
        {
            Howl();
        }
    }
    
    /// <summary>
    /// Updates the hound behavior
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
            animator.SetBool("IsRunning", currentState == AIState.Chase);
        }
        
        // Check for jump attack opportunity
        if (currentState == AIState.Chase && Time.time >= nextJumpAttackTime)
        {
            float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
            if (distanceToPlayer <= jumpAttackRange && distanceToPlayer > attackRange)
            {
                // Check if there's a clear path
                RaycastHit hit;
                Vector3 dirToPlayer = (player.transform.position - transform.position).normalized;
                if (!Physics.Raycast(transform.position, dirToPlayer, out hit, distanceToPlayer) || hit.collider.gameObject == player)
                {
                    JumpAttack();
                    return;
                }
            }
        }
        
        // If in attack range and cooldown elapsed, attack
        if (currentState == AIState.Attack && Time.time >= nextAttackTime)
        {
            BiteAttack();
        }
    }
    
    /// <summary>
    /// Performs a standard bite attack
    /// </summary>
    private void BiteAttack()
    {
        // Set next attack time
        nextAttackTime = Time.time + attackCooldown;
        
        // Trigger attack animation
        if (animator != null)
        {
            animator.SetTrigger("Bite");
        }
        
        // Play attack sound
        PlayRandomSound(attackSounds);
        
        // Schedule actual damage to be applied during animation
        StartCoroutine(ApplyBiteDamageWithDelay(0.3f));
    }
    
    /// <summary>
    /// Performs a jump attack
    /// </summary>
    private void JumpAttack()
    {
        // Set next jump attack time
        nextJumpAttackTime = Time.time + jumpAttackCooldown;
        
        // Set jump target
        jumpTarget = player.transform.position;
        
        // Trigger jump animation
        if (animator != null)
        {
            animator.SetTrigger("Jump");
        }
        
        // Play jump sound
        if (audioSource != null && jumpSound != null)
        {
            audioSource.PlayOneShot(jumpSound);
        }
        
        // Start jump sequence
        StartCoroutine(PerformJumpSequence());
    }
    
    /// <summary>
    /// Performs the jump attack sequence
    /// </summary>
    private IEnumerator PerformJumpSequence()
    {
        isJumping = true;
        
        // Disable nav agent during jump
        if (navAgent != null)
        {
            navAgent.enabled = false;
        }
        
        // Get jump start position
        Vector3 startPos = transform.position;
        
        // Calculate jump trajectory
        float jumpDuration = 0.8f;
        float elapsedTime = 0f;
        
        while (elapsedTime < jumpDuration)
        {
            // Calculate position along arc
            float t = elapsedTime / jumpDuration;
            float height = Mathf.Sin(t * Mathf.PI) * 3f; // Max height of 3 units
            
            // Update position
            Vector3 newPos = Vector3.Lerp(startPos, jumpTarget, t);
            newPos.y += height;
            transform.position = newPos;
            
            // Face jump direction
            Vector3 lookDir = jumpTarget - startPos;
            lookDir.y = 0;
            if (lookDir != Vector3.zero)
            {
                transform.rotation = Quaternion.LookRotation(lookDir);
            }
            
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        
        // Land at target
        transform.position = new Vector3(jumpTarget.x, jumpTarget.y, jumpTarget.z);
        
        // Show jump attack effect
        if (jumpAttackEffectPrefab != null)
        {
            GameObject effectObj = Instantiate(jumpAttackEffectPrefab, transform.position, Quaternion.identity);
            Destroy(effectObj, effectDuration);
        }
        
        // Apply damage to player if in range
        float landingDistanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        if (landingDistanceToPlayer <= attackRange * 1.5f)
        {
            // Deal damage to player
            HealthSystem playerHealth = player.GetComponent<HealthSystem>();
            if (playerHealth != null)
            {
                playerHealth.TakeDamage(jumpAttackDamage, gameObject);
            }
        }
        
        // Re-enable nav agent
        if (navAgent != null)
        {
            navAgent.enabled = true;
        }
        
        // End jump sequence
        isJumping = false;
    }
    
    /// <summary>
    /// Howls to alert other hounds in the area
    /// </summary>
    private void Howl()
    {
        // Set next howl time
        nextHowlTime = Time.time + Random.Range(20f, 30f);
        
        // Trigger howl animation
        if (animator != null)
        {
            animator.SetTrigger("Howl");
        }
        
        // Play howl sound
        if (audioSource != null && howlSound != null)
        {
            audioSource.PlayOneShot(howlSound);
        }
        
        // Alert other hounds in the area
        Collider[] nearbyHounds = Physics.OverlapSphere(transform.position, packHowlRadius, houndLayer);
        foreach (Collider hound in nearbyHounds)
        {
            if (hound.gameObject != gameObject)
            {
                // Get the EnemyAI component
                EnemyAI houndAI = hound.GetComponent<EnemyAI>();
                if (houndAI != null && player != null)
                {
                    // Alert the other hound to the player's position
                    houndAI.OnAlertReceived(player.transform.position);
                }
            }
        }
    }
    
    /// <summary>
    /// Applies bite damage after a delay (matched to animation)
    /// </summary>
    private IEnumerator ApplyBiteDamageWithDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (player == null || isDead)
            yield break;
            
        // Check distance to player
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        
        if (distanceToPlayer <= attackRange)
        {
            // Check if player is in front of hound
            Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
            float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);
            
            // If player is in the attack cone (90 degrees)
            if (angleToPlayer <= 45f)
            {
                // Show bite effect
                if (biteEffectPrefab != null)
                {
                    Vector3 effectPosition = transform.position + transform.forward * 1f + Vector3.up * 0.5f;
                    GameObject effectObj = Instantiate(biteEffectPrefab, effectPosition, transform.rotation);
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
        // Cancel jump if in progress
        if (isJumping)
        {
            StopAllCoroutines();
            isJumping = false;
            
            // Re-enable nav agent
            if (navAgent != null)
            {
                navAgent.enabled = true;
            }
        }
        
        // Play damage animation
        if (animator != null)
        {
            animator.SetTrigger("Damage");
        }
        
        // Immediately howl for help if heavily damaged
        if (health != null && health.CurrentHealthPercent < 0.3f && Time.time >= nextHowlTime - 15f)
        {
            Howl();
        }
    }
    
    /// <summary>
    /// Handles death event
    /// </summary>
    private void OnDeath()
    {
        isDead = true;
        
        // Cancel jump if in progress
        if (isJumping)
        {
            StopAllCoroutines();
            isJumping = false;
        }
        
        // Play death sound
        PlayRandomSound(deathSounds);
        
        // Play death animation
        if (animator != null)
        {
            animator.SetTrigger("Death");
        }
        
        // Disable components
        if (navAgent != null)
        {
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
