using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Controls enemy AI behavior
/// </summary>
public class EnemyAI : MonoBehaviour
{
    [Header("AI Settings")]
    [SerializeField] private EnemyType enemyType;
    [SerializeField] private float sightRange = 20f;
    [SerializeField] private float attackRange = 2f;
    [SerializeField] private float chaseSpeed = 3.5f;
    [SerializeField] private float patrolSpeed = 2f;
    [SerializeField] private float attackCooldown = 2f;
    [SerializeField] private float alertnessDecayRate = 0.2f; // How quickly alertness decays
    [SerializeField] private LayerMask playerLayer;
    [SerializeField] private LayerMask obstacleLayers;
    
    [Header("Patrol Settings")]
    [SerializeField] private Vector3[] patrolPoints;
    [SerializeField] private float patrolWaitTime = 2f;
    [SerializeField] private float patrolPointThreshold = 1f;
    
    [Header("Special Abilities")]
    [SerializeField] private bool canTeleport = false;
    [SerializeField] private float teleportCooldown = 5f;
    [SerializeField] private GameObject teleportEffect;
    [SerializeField] private bool canPhaseThrough = false;
    [SerializeField] private bool canJumpAttack = false;
    [SerializeField] private float jumpAttackCooldown = 6f;
    [SerializeField] private float jumpAttackSpeed = 10f;
    [SerializeField] private bool canParalyze = false;
    [SerializeField] private float paralyzeChance = 0.3f;
    [SerializeField] private float paralyzeDuration = 3f;
    
    [Header("Audio")]
    [SerializeField] private AudioClip[] idleSounds;
    [SerializeField] private AudioClip[] alertSounds;
    [SerializeField] private AudioClip[] attackSounds;
    [SerializeField] private AudioClip[] deathSounds;
    [SerializeField] private float minIdleSoundInterval = 5f;
    [SerializeField] private float maxIdleSoundInterval = 15f;
    
    // Component references
    private NavMeshAgent navAgent;
    private Animator animator;
    private EnemyHealth health;
    private AudioSource audioSource;
    
    // AI state
    private enum AIState { Patrol, Chase, Attack, SearchLastKnownPosition, Idle }
    private AIState currentState = AIState.Patrol;
    private GameObject player;
    private Vector3 lastKnownPlayerPosition;
    private bool playerInSightRange = false;
    private bool playerInAttackRange = false;
    private float alertness = 0f; // 0 = unaware, 100 = fully aware
    private int currentPatrolIndex = 0;
    private float nextAttackTime = 0f;
    private float lastTeleportTime = -999f;
    private float lastJumpAttackTime = -999f;
    private float nextIdleSoundTime = 0f;
    private bool isPatrolWaiting = false;
    
    private void Awake()
    {
        navAgent = GetComponent<NavMeshAgent>();
        animator = GetComponent<Animator>();
        health = GetComponent<EnemyHealth>();
        audioSource = GetComponent<AudioSource>();
        
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.spatialBlend = 1f; // 3D sound
        }
        
        // Find player
        player = GameObject.FindGameObjectWithTag("Player");
        
        // Configure NavMeshAgent
        if (navAgent != null)
        {
            navAgent.speed = patrolSpeed;
            navAgent.stoppingDistance = attackRange * 0.8f;
        }
        
        // Generate patrol points if not set
        if (patrolPoints == null || patrolPoints.Length == 0)
        {
            GenerateRandomPatrolPoints();
        }
        
        // Initialize idle sound timer
        nextIdleSoundTime = Time.time + Random.Range(minIdleSoundInterval, maxIdleSoundInterval);
    }
    
    private void Update()
    {
        if (health != null && health.IsDead)
            return;
            
        CheckPlayerDistance();
        UpdateAwareness();
        HandleAIState();
        UpdateAnimator();
        PlayIdleSound();
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
            
            // Wait for paralysis duration
            yield return new WaitForSeconds(paralyzeDuration);
            
            // Re-enable player movement
            playerController.enabled = true;
        }
    }
    
    /// <summary>
    /// Waits at a patrol point for a set time
    /// </summary>
    private IEnumerator WaitAtPatrolPoint()
    {
        isPatrolWaiting = true;
        
        // Stop moving
        navAgent.velocity = Vector3.zero;
        
        // Wait at patrol point
        yield return new WaitForSeconds(patrolWaitTime);
        
        isPatrolWaiting = false;
    }
    
    /// <summary>
    /// Looks around after reaching last known player position
    /// </summary>
    private IEnumerator LookAround()
    {
        // Switch to idle state
        currentState = AIState.Idle;
        
        // Look in different directions
        Quaternion originalRotation = transform.rotation;
        Quaternion targetRotation;
        
        // Look left
        targetRotation = Quaternion.Euler(0, transform.eulerAngles.y - 90, 0);
        float elapsedTime = 0f;
        while (elapsedTime < 1f)
        {
            transform.rotation = Quaternion.Slerp(originalRotation, targetRotation, elapsedTime);
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        
        // Look right
        yield return new WaitForSeconds(0.5f);
        originalRotation = transform.rotation;
        targetRotation = Quaternion.Euler(0, transform.eulerAngles.y + 180, 0);
        elapsedTime = 0f;
        while (elapsedTime < 1f)
        {
            transform.rotation = Quaternion.Slerp(originalRotation, targetRotation, elapsedTime);
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        
        // Resume patrol
        currentState = AIState.Patrol;
    }
    
    /// <summary>
    /// Updates animator parameters based on AI state
    /// </summary>
    private void UpdateAnimator()
    {
        if (animator == null)
            return;
            
        // Update movement parameters
        float speed = navAgent.velocity.magnitude;
        animator.SetFloat("Speed", speed);
        
        // Update state parameters
        animator.SetBool("IsChasing", currentState == AIState.Chase);
        animator.SetBool("IsAttacking", currentState == AIState.Attack);
    }
    
    /// <summary>
    /// Generates random patrol points around spawn position
    /// </summary>
    private void GenerateRandomPatrolPoints()
    {
        int pointCount = Random.Range(3, 6);
        patrolPoints = new Vector3[pointCount];
        
        for (int i = 0; i < pointCount; i++)
        {
            // Generate random point in a circle around spawn position
            float angle = i * (360f / pointCount);
            float radius = Random.Range(5f, 15f);
            
            Vector3 direction = Quaternion.Euler(0, angle, 0) * Vector3.forward;
            Vector3 point = transform.position + direction * radius;
            
            // Ensure point is on navmesh
            NavMeshHit hit;
            if (NavMesh.SamplePosition(point, out hit, 10f, NavMesh.AllAreas))
            {
                patrolPoints[i] = hit.position;
            }
            else
            {
                patrolPoints[i] = transform.position; // Fallback to spawn position
            }
        }
    }
    
    /// <summary>
    /// Plays a random idle sound at intervals
    /// </summary>
    private void PlayIdleSound()
    {
        if (idleSounds.Length == 0 || audioSource == null)
            return;
            
        if (Time.time >= nextIdleSoundTime)
        {
            // Only play idle sounds when not aggroed
            if (alertness < 30f)
            {
                int randomIndex = Random.Range(0, idleSounds.Length);
                audioSource.PlayOneShot(idleSounds[randomIndex]);
            }
            
            // Set next sound time
            nextIdleSoundTime = Time.time + Random.Range(minIdleSoundInterval, maxIdleSoundInterval);
        }
    }
    
    /// <summary>
    /// Plays a random sound from the provided array
    /// </summary>
    private void PlaySound(AudioClip[] sounds)
    {
        if (sounds.Length == 0 || audioSource == null)
            return;
            
        int randomIndex = Random.Range(0, sounds.Length);
        audioSource.PlayOneShot(sounds[randomIndex]);
    }
    
    /// <summary>
    /// Called when enemy takes damage - increases alertness
    /// </summary>
    public void OnDamageTaken()
    {
        alertness = 100f;
        
        if (player != null)
        {
            lastKnownPlayerPosition = player.transform.position;
        }
    }
    
    #endregion
    
    // Draw gizmos for debug visualization
    private void OnDrawGizmosSelected()
    {
        // Draw sight range
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, sightRange);
        
        // Draw attack range
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);
        
        // Draw patrol points
        if (patrolPoints != null)
        {
            Gizmos.color = Color.blue;
            foreach (Vector3 point in patrolPoints)
            {
                Gizmos.DrawSphere(point, 0.5f);
            }
        }
    }
}

/// <summary>
/// Enum for the different enemy types
/// </summary>
public enum EnemyType
{
    SkeletonWarrior,
    Mummy,
    TombRaider,
    GuardianStatue,
    CursedHound,
    SpectralWraith
}>
    /// Checks if player is within sight or attack range
    /// </summary>
    private void CheckPlayerDistance()
    {
        if (player == null)
            return;
            
        // Calculate distances
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        
        // Check if player is in sight range
        playerInSightRange = distanceToPlayer <= sightRange;
        
        // Check if player is in attack range
        playerInAttackRange = distanceToPlayer <= attackRange;
        
        // Line of sight check
        if (playerInSightRange)
        {
            // Check if there are obstacles between enemy and player
            Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
            RaycastHit hit;
            
            if (Physics.Raycast(transform.position + Vector3.up, directionToPlayer, out hit, sightRange, obstacleLayers))
            {
                if (hit.collider.gameObject != player)
                {
                    // Can't see player, obstacle in the way
                    playerInSightRange = false;
                }
            }
        }
    }
    
    /// <summary>
    /// Updates enemy alertness level based on player proximity
    /// </summary>
    private void UpdateAwareness()
    {
        // Increase alertness if player is in sight
        if (playerInSightRange)
        {
            lastKnownPlayerPosition = player.transform.position;
            alertness += Time.deltaTime * 50f; // Increase alertness rapidly when seeing player
            
            // Play alert sound when first becoming alert
            if (alertness >= 50f && alertness - Time.deltaTime * 50f < 50f)
            {
                PlaySound(alertSounds);
            }
        }
        else
        {
            // Decrease alertness over time
            alertness -= Time.deltaTime * alertnessDecayRate * 10f;
        }
        
        // Clamp alertness
        alertness = Mathf.Clamp(alertness, 0f, 100f);
        
        // Respond to damage by increasing alertness
        if (health != null && health.LastDamageTime > Time.time - 2f)
        {
            alertness = 100f;
            lastKnownPlayerPosition = player.transform.position;
        }
    }
    
    /// <summary>
    /// Handles AI state machine based on alertness and player proximity
    /// </summary>
    private void HandleAIState()
    {
        // Determine state based on alertness and player position
        if (alertness < 30f)
        {
            currentState = AIState.Patrol;
        }
        else if (alertness >= 30f && alertness < 70f)
        {
            // Investigate last known position
            if (!playerInSightRange)
            {
                currentState = AIState.SearchLastKnownPosition;
            }
            else
            {
                currentState = AIState.Chase;
            }
        }
        else // alertness >= 70f
        {
            if (playerInAttackRange)
            {
                currentState = AIState.Attack;
            }
            else if (playerInSightRange || Vector3.Distance(transform.position, lastKnownPlayerPosition) > 2f)
            {
                currentState = AIState.Chase;
            }
            else
            {
                currentState = AIState.SearchLastKnownPosition;
            }
        }
        
        // Execute current state
        switch (currentState)
        {
            case AIState.Patrol:
                Patrol();
                break;
                
            case AIState.Chase:
                ChasePlayer();
                break;
                
            case AIState.Attack:
                AttackPlayer();
                break;
                
            case AIState.SearchLastKnownPosition:
                SearchLastKnownPosition();
                break;
                
            case AIState.Idle:
                Idle();
                break;
        }
    }
    
    #region AI State Behaviors
    
    /// <summary>
    /// Patrol behavior - moves between patrol points
    /// </summary>
    private void Patrol()
    {
        if (patrolPoints.Length == 0)
            return;
            
        // Set patrol speed
        navAgent.speed = patrolSpeed;
        
        // Check if waiting at patrol point
        if (isPatrolWaiting)
            return;
            
        // Check if reached patrol point
        if (navAgent.remainingDistance <= patrolPointThreshold)
        {
            // Start waiting coroutine
            StartCoroutine(WaitAtPatrolPoint());
            
            // Move to next patrol point
            currentPatrolIndex = (currentPatrolIndex + 1) % patrolPoints.Length;
        }
        
        // Set destination to current patrol point
        if (!isPatrolWaiting && navAgent.remainingDistance <= patrolPointThreshold)
        {
            navAgent.SetDestination(patrolPoints[currentPatrolIndex]);
        }
    }
    
    /// <summary>
    /// Chase behavior - pursues the player
    /// </summary>
    private void ChasePlayer()
    {
        // Set chase speed
        navAgent.speed = chaseSpeed;
        
        // Update destination to player position
        if (playerInSightRange)
        {
            navAgent.SetDestination(player.transform.position);
            lastKnownPlayerPosition = player.transform.position;
        }
        else
        {
            navAgent.SetDestination(lastKnownPlayerPosition);
        }
        
        // Handle special abilities during chase
        HandleSpecialAbilities();
    }
    
    /// <summary>
    /// Attack behavior - attempts to attack the player
    /// </summary>
    private void AttackPlayer()
    {
        // Face player
        if (player != null)
        {
            Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
            Quaternion lookRotation = Quaternion.LookRotation(new Vector3(directionToPlayer.x, 0, directionToPlayer.z));
            transform.rotation = Quaternion.Slerp(transform.rotation, lookRotation, Time.deltaTime * 5f);
        }
        
        // Stop moving when attacking
        navAgent.SetDestination(transform.position);
        
        // Attack if cooldown elapsed
        if (Time.time >= nextAttackTime)
        {
            // Trigger attack
            Attack();
            
            // Set next attack time
            nextAttackTime = Time.time + attackCooldown;
        }
    }
    
    /// <summary>
    /// Search behavior - investigates player's last known position
    /// </summary>
    private void SearchLastKnownPosition()
    {
        // Set patrol speed
        navAgent.speed = patrolSpeed;
        
        // Move to last known player position
        navAgent.SetDestination(lastKnownPlayerPosition);
        
        // If reached last known position, start patrolling
        if (Vector3.Distance(transform.position, lastKnownPlayerPosition) <= patrolPointThreshold)
        {
            // Look around for a moment before returning to patrol
            StartCoroutine(LookAround());
        }
    }
    
    /// <summary>
    /// Idle behavior - stands and looks around
    /// </summary>
    private void Idle()
    {
        // Stop moving
        navAgent.SetDestination(transform.position);
        
        // Look around occasionally (implemented in LookAround coroutine)
    }
    
    #endregion
    
    #region Helper Methods
    
    /// <summary>
    /// Performs the attack
    /// </summary>
    private void Attack()
    {
        // Trigger attack animation
        if (animator != null)
        {
            animator.SetTrigger("Attack");
        }
        
        // Play attack sound
        PlaySound(attackSounds);
        
        // For melee enemies, check if player is in front and within range
        if (enemyType != EnemyType.TombRaider) // Tomb raiders use guns
        {
            if (playerInAttackRange)
            {
                Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
                float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);
                
                // If player is in front (within 60 degrees cone)
                if (angleToPlayer <= 60f)
                {
                    // Deal damage to player
                    HealthSystem playerHealth = player.GetComponent<HealthSystem>();
                    if (playerHealth != null)
                    {
                        int damage = DetermineAttackDamage();
                        playerHealth.TakeDamage(damage, gameObject);
                        
                        // Apply paralyze effect if applicable
                        if (canParalyze && Random.value <= paralyzeChance)
                        {
                            StartCoroutine(ParalyzePlayer());
                        }
                    }
                }
            }
        }
        else
        {
            // For ranged enemies (TombRaider), perform ranged attack
            PerformRangedAttack();
        }
    }
    
    /// <summary>
    /// Determines attack damage based on enemy type
    /// </summary>
    private int DetermineAttackDamage()
    {
        switch (enemyType)
        {
            case EnemyType.SkeletonWarrior:
                return 10;
            case EnemyType.Mummy:
                return 15;
            case EnemyType.TombRaider:
                return 20;
            case EnemyType.GuardianStatue:
                return 25;
            case EnemyType.CursedHound:
                return 8;
            case EnemyType.SpectralWraith:
                return 12;
            default:
                return 10;
        }
    }
    
    /// <summary>
    /// Performs a ranged attack (for ranged enemy types)
    /// </summary>
    private void PerformRangedAttack()
    {
        if (player == null)
            return;
            
        // Create bullet/projectile object
        // This would be replaced with actual projectile instantiation in a full implementation
        Debug.Log($"{gameObject.name} fired a ranged attack at the player");
        
        // Simple raycast implementation for now
        Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
        RaycastHit hit;
        
        if (Physics.Raycast(transform.position + Vector3.up * 1.5f, directionToPlayer, out hit, sightRange))
        {
            if (hit.collider.gameObject == player)
            {
                // Hit player
                HealthSystem playerHealth = player.GetComponent<HealthSystem>();
                if (playerHealth != null)
                {
                    int damage = DetermineAttackDamage();
                    playerHealth.TakeDamage(damage, gameObject);
                }
            }
        }
    }
    
    /// <summary>
    /// Handles special abilities based on enemy type
    /// </summary>
    private void HandleSpecialAbilities()
    {
        // Teleport ability (Spectral Wraith)
        if (canTeleport && Time.time - lastTeleportTime >= teleportCooldown)
        {
            // Only teleport if player is far enough away
            float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
            
            if (distanceToPlayer > attackRange * 2 && distanceToPlayer < sightRange)
            {
                TeleportTowardsPlayer();
                lastTeleportTime = Time.time;
            }
        }
        
        // Jump attack ability (Cursed Hound)
        if (canJumpAttack && Time.time - lastJumpAttackTime >= jumpAttackCooldown)
        {
            float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
            
            if (distanceToPlayer > attackRange && distanceToPlayer < sightRange * 0.7f)
            {
                StartCoroutine(PerformJumpAttack());
                lastJumpAttackTime = Time.time;
            }
        }
        
        // Phase through walls ability (Spectral Wraith)
        if (canPhaseThrough)
        {
            // This would be handled by adjusting NavMeshAgent area costs
            // or implementing custom pathfinding that ignores certain obstacles
        }
    }
    
    /// <summary>
    /// Teleports the enemy closer to the player
    /// </summary>
    private void TeleportTowardsPlayer()
    {
        if (player == null)
            return;
            
        // Calculate teleport position (closer to player but not too close)
        Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
        Vector3 teleportPosition = player.transform.position - directionToPlayer * attackRange * 1.5f;
        
        // Ensure teleport position is on navmesh
        NavMeshHit hit;
        if (NavMesh.SamplePosition(teleportPosition, out hit, 5f, NavMesh.AllAreas))
        {
            // Show teleport effect at current position
            if (teleportEffect != null)
            {
                Instantiate(teleportEffect, transform.position, Quaternion.identity);
            }
            
            // Teleport
            transform.position = hit.position;
            
            // Show teleport effect at new position
            if (teleportEffect != null)
            {
                Instantiate(teleportEffect, transform.position, Quaternion.identity);
            }
        }
    }
    
    /// <summary>
    /// Performs a jump attack (for Cursed Hound)
    /// </summary>
    private IEnumerator PerformJumpAttack()
    {
        if (player == null)
            yield break;
            
        // Prepare jump (animation)
        if (animator != null)
        {
            animator.SetTrigger("JumpAttack");
        }
        
        // Wait for animation to prepare
        yield return new WaitForSeconds(0.5f);
        
        // Calculate jump trajectory
        Vector3 startPosition = transform.position;
        Vector3 targetPosition = player.transform.position;
        
        // Temporarily disable navmesh agent
        navAgent.enabled = false;
        
        // Perform jump
        float jumpDuration = Vector3.Distance(startPosition, targetPosition) / jumpAttackSpeed;
        float elapsedTime = 0f;
        
        while (elapsedTime < jumpDuration)
        {
            // Update target position as player moves
            targetPosition = player.transform.position;
            
            // Calculate position with arc
            float t = elapsedTime / jumpDuration;
            float height = Mathf.Sin(t * Mathf.PI) * 2f; // Arc height
            
            Vector3 newPosition = Vector3.Lerp(startPosition, targetPosition, t);
            newPosition.y += height;
            
            // Move enemy
            transform.position = newPosition;
            
            // Look toward target
            transform.LookAt(new Vector3(targetPosition.x, transform.position.y, targetPosition.z));
            
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        
        // Land at final position
        transform.position = new Vector3(targetPosition.x, Mathf.Max(targetPosition.y, startPosition.y), targetPosition.z);
        
        // Re-enable navmesh agent
        navAgent.enabled = true;
        
        // Attack immediately after landing
        if (Vector3.Distance(transform.position, player.transform.position) <= attackRange * 1.5f)
        {
            Attack();
        }
    }
    
    /// <summary