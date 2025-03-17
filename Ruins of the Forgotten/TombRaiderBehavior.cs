using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Tomb Raider specific AI behavior (a human enemy with firearms)
/// </summary>
public class TombRaiderBehavior : MonoBehaviour
{
    [Header("Tomb Raider Settings")]
    [SerializeField] private float shootRange = 15f;
    [SerializeField] private float minimumRange = 5f; // Will try to maintain this distance
    [SerializeField] private float shootCooldown = 1.2f;
    [SerializeField] private int shootDamage = 20;
    [SerializeField] private float accuracy = 0.8f; // 0-1, higher is more accurate
    [SerializeField] private Transform gunMuzzle;
    
    [Header("Cover System")]
    [SerializeField] private float coverSearchRadius = 10f;
    [SerializeField] private LayerMask coverLayers;
    [SerializeField] private float coverStayTime = 3f;
    [SerializeField] private float flankerChance = 0.3f; // Chance to be a flanker that moves around cover
    
    [Header("Visual Effects")]
    [SerializeField] private GameObject muzzleFlashPrefab;
    [SerializeField] private GameObject bulletImpactPrefab;
    [SerializeField] private LineRenderer bulletTracer;
    [SerializeField] private float tracerDuration = 0.1f;
    
    [Header("Audio")]
    [SerializeField] private AudioClip[] shootSounds;
    [SerializeField] private AudioClip[] reloadSounds;
    [SerializeField] private AudioClip[] alertSounds;
    [SerializeField] private AudioClip[] deathSounds;
    [SerializeField] private AudioClip[] tauntSounds;
    
    // Component references
    private Animator animator;
    private NavMeshAgent navAgent;
    private EnemyAI enemyAI;
    private EnemyHealth health;
    private AudioSource audioSource;
    
    // Private variables
    private float nextShootTime = 0f;
    private bool isDead = false;
    private GameObject player;
    private Transform currentCoverPoint;
    private bool isFlanker;
    private bool isInCover = false;
    private int currentAmmo = 12;
    private int maxAmmo = 12;
    private bool isReloading = false;
    
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
        
        // Determine if this is a flanker (affects tactics)
        isFlanker = Random.value < flankerChance;
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
        
        // Initialize ammo
        currentAmmo = maxAmmo;
    }
    
    private void Update()
    {
        if (isDead || isReloading)
            return;
            
        // Update behavior based on state
        UpdateBehavior();
    }
    
    /// <summary>
    /// Updates the tomb raider behavior
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
            animator.SetBool("IsInCover", isInCover);
            animator.SetBool("IsMoving", currentState == AIState.Chase);
        }
        
        // Check for cover if under attack and not in cover
        if (health != null && health.LastDamageTime > Time.time - 5f && !isInCover && currentState != AIState.Patrol)
        {
            TryFindCover();
        }
        
        // If in shooting range, try to shoot
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        if (distanceToPlayer <= shootRange && distanceToPlayer >= minimumRange && 
            (currentState == AIState.Attack || currentState == AIState.Chase) && 
            Time.time >= nextShootTime && currentAmmo > 0)
        {
            Shoot();
        }
        
        // If too close to player, try to back up
        if (distanceToPlayer < minimumRange && currentState == AIState.Attack && !isInCover)
        {
            BackAwayFromPlayer();
        }
        
        // If out of ammo, reload
        if (currentAmmo <= 0 && !isReloading)
        {
            StartCoroutine(Reload());
        }
    }
    
    /// <summary>
    /// Attempts to find cover nearby
    /// </summary>
    private void TryFindCover()
    {
        // Simple implementation - in a full game you would use a more sophisticated cover system
        // Find objects that could serve as cover
        Collider[] potentialCover = Physics.OverlapSphere(transform.position, coverSearchRadius, coverLayers);
        
        if (potentialCover.Length > 0)
        {
            // Find the best cover point (closest that blocks line of sight to player)
            Transform bestCover = null;
            float bestScore = float.MaxValue;
            
            foreach (Collider cover in potentialCover)
            {
                // Check if this cover blocks line of sight to player
                Vector3 coverPos = cover.transform.position;
                Vector3 directionToPlayer = (player.transform.position - coverPos).normalized;
                
                // Cast ray from cover to player
                RaycastHit hit;
                if (Physics.Raycast(coverPos, directionToPlayer, out hit, shootRange))
                {
                    if (hit.collider.gameObject != player)
                    {
                        // This cover blocks line of sight, calculate score based on distance
                        float distScore = Vector3.Distance(transform.position, coverPos);
                        
                        // If flanker, prefer cover to the sides
                        if (isFlanker)
                        {
                            Vector3 playerToCover = (coverPos - player.transform.position).normalized;
                            Vector3 playerToEnemy = (transform.position - player.transform.position).normalized;
                            
                            // Dot product close to 0 means the cover is to the side
                            float dotProduct = Vector3.Dot(playerToCover, playerToEnemy);
                            distScore *= Mathf.Abs(dotProduct) + 0.5f; // Lower score for side positions
                        }
                        
                        if (distScore < bestScore)
                        {
                            bestCover = cover.transform;
                            bestScore = distScore;
                        }
                    }
                }
            }
            
            // If found suitable cover, use it
            if (bestCover != null)
            {
                MoveToCover(bestCover);
            }
        }
    }
    
    /// <summary>
    /// Moves to a cover position
    /// </summary>
    private void MoveToCover(Transform cover)
    {
        currentCoverPoint = cover;
        
        // Calculate cover position (slightly away from the cover object, facing away from player)
        Vector3 playerToCover = (cover.position - player.transform.position).normalized;
        Vector3 coverPos = cover.position + playerToCover * 1.5f; // Stand behind cover
        
        // Set destination
        if (navAgent != null)
        {
            navAgent.SetDestination(coverPos);
        }
        
        // Start using cover behavior
        StartCoroutine(UseCover(cover));
    }
    
    /// <summary>
    /// Uses cover for a period of time
    /// </summary>
    private IEnumerator UseCover(Transform cover)
    {
        isInCover = true;
        
        // Wait until reaching cover position
        while (navAgent != null && navAgent.pathPending || navAgent.remainingDistance > navAgent.stoppingDistance)
        {
            yield return null;
        }
        
        if (animator != null)
        {
            animator.SetBool("IsInCover", true);
        }
        
        // Stay in cover, occasionally popping out to shoot
        float endCoverTime = Time.time + coverStayTime;
        
        while (Time.time < endCoverTime && cover != null && !isDead)
        {
            // Pop out and shoot if player is visible
            if (CanSeePlayer() && Time.time >= nextShootTime && currentAmmo > 0)
            {
                // Play "pop out" animation
                if (animator != null)
                {
                    animator.SetTrigger("PopOut");
                }
                
                yield return new WaitForSeconds(0.5f); // Wait for animation
                
                // Shoot
                Shoot();
                
                yield return new WaitForSeconds(1f); // Stay exposed briefly
                
                // Return to cover
                if (animator != null)
                {
                    animator.SetTrigger("ReturnToCover");
                }
                
                yield return new WaitForSeconds(0.5f); // Wait for animation
            }
            
            // Wait before next action
            yield return new WaitForSeconds(0.5f);
        }
        
        // If flanker, move to new position
        if (isFlanker && !isDead)
        {
            isInCover = false;
            if (animator != null)
            {
                animator.SetBool("IsInCover", false);
            }
            
            // Potentially find new cover
            TryFindCover();
        }
        else
        {
            // Return to normal behavior
            isInCover = false;
            if (animator != null)
            {
                animator.SetBool("IsInCover", false);
            }
        }
    }
    
    /// <summary>
    /// Checks if the player is visible
    /// </summary>
    private bool CanSeePlayer()
    {
        if (player == null)
            return false;
            
        // Check line of sight
        Vector3 dirToPlayer = (player.transform.position - transform.position).normalized;
        float dotProduct = Vector3.Dot(transform.forward, dirToPlayer);
        
        // Player is in front (140 degree cone)
        if (dotProduct > -0.7f)
        {
            RaycastHit hit;
            if (Physics.Raycast(transform.position + Vector3.up * 1.6f, dirToPlayer, out hit, shootRange))
            {
                return hit.collider.gameObject == player;
            }
        }
        
        return false;
    }
    
    /// <summary>
    /// Backs away from player if too close
    /// </summary>
    private void BackAwayFromPlayer()
    {
        if (navAgent == null || player == null)
            return;
            
        // Calculate position away from player
        Vector3 awayDir = (transform.position - player.transform.position).normalized;
        Vector3 targetPos = transform.position + awayDir * 5f;
        
        // Find valid position on NavMesh
        NavMeshHit hit;
        if (NavMesh.SamplePosition(targetPos, out hit, 5f, NavMesh.AllAreas))
        {
            navAgent.SetDestination(hit.position);
        }
    }
    
    /// <summary>
    /// Shoots at the player
    /// </summary>
    private void Shoot()
    {
        // Set next shoot time
        nextShootTime = Time.time + shootCooldown;
        
        // Decrease ammo
        currentAmmo--;
        
        // Play shoot animation
        if (animator != null)
        {
            animator.SetTrigger("Shoot");
        }
        
        // Play shoot sound
        PlayRandomSound(shootSounds);
        
        // Show muzzle flash
        if (muzzleFlashPrefab != null && gunMuzzle != null)
        {
            GameObject flash = Instantiate(muzzleFlashPrefab, gunMuzzle.position, gunMuzzle.rotation);
            Destroy(flash, 0.1f);
        }
        
        // Determine hit position (with accuracy factor)
        Vector3 targetPos = player.transform.position + Vector3.up * 1.5f; // Aim at player's upper body
        
        // Add inaccuracy
        float inaccuracy = (1f - accuracy) * 3f; // Up to 3 meters off at minimum accuracy
        targetPos += Random.insideUnitSphere * inaccuracy;
        
        // Determine direction
        Vector3 direction = (targetPos - gunMuzzle.position).normalized;
        
        // Show bullet tracer
        if (bulletTracer != null)
        {
            StartCoroutine(ShowBulletTracer(gunMuzzle.position, targetPos));
        }
        
        // Raycast to see if we hit anything
        RaycastHit hit;
        if (Physics.Raycast(gunMuzzle.position, direction, out hit, shootRange))
        {
            // Check if we hit the player
            if (hit.collider.gameObject == player)
            {
                // Deal damage to player
                HealthSystem playerHealth = player.GetComponent<HealthSystem>();
                if (playerHealth != null)
                {
                    playerHealth.TakeDamage(shootDamage, gameObject);
                }
            }
            
            // Show impact effect
            if (bulletImpactPrefab != null)
            {
                GameObject impact = Instantiate(bulletImpactPrefab, hit.point, Quaternion.LookRotation(hit.normal));
                Destroy(impact, 2f);
            }
        }
        
        // Occasionally taunt after shooting
        if (Random.value < 0.2f && tauntSounds.Length > 0)
        {
            StartCoroutine(PlayTauntAfterDelay(1f));
        }
    }
    
    /// <summary>
    /// Shows a bullet tracer effect
    /// </summary>
    private IEnumerator ShowBulletTracer(Vector3 startPos, Vector3 endPos)
    {
        bulletTracer.enabled = true;
        bulletTracer.SetPosition(0, startPos);
        bulletTracer.SetPosition(1, endPos);
        
        yield return new WaitForSeconds(tracerDuration);
        
        bulletTracer.enabled = false;
    }
    
    /// <summary>
    /// Reloads the weapon
    /// </summary>
    private IEnumerator Reload()
    {
        isReloading = true;
        
        // Play reload animation
        if (animator != null)
        {
            animator.SetTrigger("Reload");
        }
        
        // Play reload sound
        PlayRandomSound(reloadSounds);
        
        // Wait for reload time
        yield return new WaitForSeconds(2f);
        
        // Replenish ammo
        currentAmmo = maxAmmo;
        
        isReloading = false;
    }
    
    /// <summary>
    /// Plays a taunt sound after a delay
    /// </summary>
    private IEnumerator PlayTauntAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (!isDead)
        {
            PlayRandomSound(tauntSounds);
        }
    }
    
    /// <summary>
    /// Handles damage taken event
    /// </summary>
    private void OnDamageTaken(int amount, bool wasCritical)
    {
        // Consider finding cover when damaged
        if (!isInCover && Random.value < 0.7f) // 70% chance
        {
            TryFindCover();
        }
        
        // Play damage animation
        if (animator != null)
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
        isInCover = false;
        isReloading = false;
        
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
            navAgent.isStopped = true;
            navAgent.enabled = false;
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