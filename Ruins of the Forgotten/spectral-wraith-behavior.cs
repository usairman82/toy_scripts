using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Spectral Wraith specific AI behavior
/// </summary>
public class SpectralWraithBehavior : MonoBehaviour
{
    [Header("Spectral Wraith Settings")]
    [SerializeField] private float attackRange = 2.5f;
    [SerializeField] private float attackCooldown = 2f;
    [SerializeField] private int attackDamage = 12;
    [SerializeField] private float teleportCooldown = 5f;
    [SerializeField] private float teleportMinDistance = 5f;
    [SerializeField] private float teleportMaxDistance = 12f;
    [SerializeField] private float phaseWallCooldown = 10f;
    [SerializeField] private LayerMask phaseableLayers;
    
    [Header("Visual Effects")]
    [SerializeField] private GameObject ghostlyTouchEffectPrefab;
    [SerializeField] private GameObject teleportEffectPrefab;
    [SerializeField] private GameObject phaseEffectPrefab;
    [SerializeField] private Material defaultMaterial;
    [SerializeField] private Material phaseMaterial;
    [SerializeField] private float effectDuration = 1f;
    
    [Header("Audio")]
    [SerializeField] private AudioClip[] attackSounds;
    [SerializeField] private AudioClip teleportSound;
    [SerializeField] private AudioClip phaseSound;
    [SerializeField] private AudioClip[] deathSounds;
    [SerializeField] private AudioClip[] ambientSounds;
    
    // Component references
    private Animator animator;
    private NavMeshAgent navAgent;
    private EnemyAI enemyAI;
    private EnemyHealth health;
    private AudioSource audioSource;
    private Renderer[] renderers;
    
    // Private variables
    private float nextAttackTime = 0f;
    private float nextTeleportTime = 0f;
    private float nextPhaseTime = 0f;
    private bool isDead = false;
    private GameObject player;
    private bool isPhasing = false;
    private Vector3 phaseTarget;
    private Vector3 originalScale;
    
    private void Awake()
    {
        // Get components
        animator = GetComponent<Animator>();
        navAgent = GetComponent<NavMeshAgent>();
        enemyAI = GetComponent<EnemyAI>();
        health = GetComponent<EnemyHealth>();
        audioSource = GetComponent<AudioSource>();
        renderers = GetComponentsInChildren<Renderer>();
        
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.spatialBlend = 1f; // 3D sound
        }
        
        // Set initial visual state
        if (defaultMaterial != null)
        {
            foreach (Renderer renderer in renderers)
            {
                renderer.material = defaultMaterial;
            }
        }
        
        // Store original scale
        originalScale = transform.localScale;
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
        
        // Set initial teleport time
        nextTeleportTime = Time.time + Random.Range(3f, 7f);
        
        // Set initial phase time
        nextPhaseTime = Time.time + Random.Range(15f, 20f);
        
        // Start ambient sound coroutine
        StartCoroutine(PlayAmbientSounds());
    }
    
    private void Update()
    {
        if (isDead || isPhasing)
            return;
            
        // Update behavior based on state
        UpdateBehavior();
    }
    
    /// <summary>
    /// Updates the wraith behavior
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
            animator.SetBool("IsFloating", currentState == AIState.Chase || currentState == AIState.Attack);
            animator.SetBool("IsHunting", currentState == AIState.Chase);
        }
        
        // Check for teleport opportunity
        if ((currentState == AIState.Chase || currentState == AIState.SearchLastKnownPosition) && Time.time >= nextTeleportTime)
        {
            float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
            if (distanceToPlayer > teleportMinDistance && distanceToPlayer < teleportMaxDistance)
            {
                TeleportBehindPlayer();
                return;
            }
        }
        
        // Check for phase through walls opportunity
        if (currentState == AIState.SearchLastKnownPosition && Time.time >= nextPhaseTime)
        {
            if (enemyAI.LastKnownPlayerPosition != Vector3.zero)
            {
                TryPhaseTowardsPosition(enemyAI.LastKnownPlayerPosition);
                return;
            }
        }
        
        // If in attack range and cooldown elapsed, attack
        if (currentState == AIState.Attack && Time.time >= nextAttackTime)
        {
            GhostlyTouchAttack();
        }
    }
    
    /// <summary>
    /// Performs a ghostly touch attack
    /// </summary>
    private void GhostlyTouchAttack()
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
        StartCoroutine(ApplyTouchDamageWithDelay(0.5f));
    }
    
    /// <summary>
    /// Teleports behind the player
    /// </summary>
    private void TeleportBehindPlayer()
    {
        // Set next teleport time
        nextTeleportTime = Time.time + teleportCooldown;
        
        // Calculate position behind player
        Vector3 directionFromPlayer = (transform.position - player.transform.position).normalized;
        Vector3 teleportPosition = player.transform.position + directionFromPlayer * 2f;
        
        // Ensure position is on navmesh
        NavMeshHit hit;
        if (NavMesh.SamplePosition(teleportPosition, out hit, 3f, NavMesh.AllAreas))
        {
            teleportPosition = hit.position;
        }
        
        // Show teleport effect at current position
        if (teleportEffectPrefab != null)
        {
            GameObject effectObj = Instantiate(teleportEffectPrefab, transform.position, Quaternion.identity);
            Destroy(effectObj, effectDuration);
        }
        
        // Play teleport sound
        if (audioSource != null && teleportSound != null)
        {
            audioSource.PlayOneShot(teleportSound);
        }
        
        // Teleport
        transform.position = teleportPosition;
        
        // Show teleport effect at new position
        if (teleportEffectPrefab != null)
        {
            GameObject effectObj = Instantiate(teleportEffectPrefab, transform.position, Quaternion.identity);
            Destroy(effectObj, effectDuration);
        }
        
        // Face the player
        if (player != null)
        {
            Vector3 lookDirection = (player.transform.position - transform.position).normalized;
            lookDirection.y = 0f;
            if (lookDirection != Vector3.zero)
            {
                transform.rotation = Quaternion.LookRotation(lookDirection);
            }
        }
        
        // Trigger teleport animation
        if (animator != null)
        {
            animator.SetTrigger("Teleport");
        }
    }
    
    /// <summary>
    /// Attempts to phase through walls towards a position
    /// </summary>
    private void TryPhaseTowardsPosition(Vector3 targetPosition)
    {
        // Check if there are obstacles between us and the target
        Vector3 direction = (targetPosition - transform.position).normalized;
        RaycastHit hit;
        
        if (Physics.Raycast(transform.position, direction, out hit, 15f, phaseableLayers))
        {
            // Found an obstacle to phase through
            phaseTarget = hit.point + direction * 3f; // Position on the other side
            
            // Make sure target is on navmesh
            NavMeshHit navHit;
            if (NavMesh.SamplePosition(phaseTarget, out navHit, 5f, NavMesh.AllAreas))
            {
                phaseTarget = navHit.position;
                
                // Start phasing
                StartCoroutine(PhaseSequence());
            }
        }
    }
    
    /// <summary>
    /// Performs the phase through walls sequence
    /// </summary>
    private IEnumerator PhaseSequence()
    {
        isPhasing = true;
        
        // Set next phase time
        nextPhaseTime = Time.time + phaseWallCooldown;
        
        // Disable nav agent during phase
        if (navAgent != null)
        {
            navAgent.enabled = false;
        }
        
        // Play phase sound
        if (audioSource != null && phaseSound != null)
        {
            audioSource.PlayOneShot(phaseSound);
        }
        
        // Show phase effect
        if (phaseEffectPrefab != null)
        {
            GameObject effectObj = Instantiate(phaseEffectPrefab, transform.position, Quaternion.identity);
            Destroy(effectObj, effectDuration * 2f);
        }
        
        // Apply phase material
        if (phaseMaterial != null)
        {
            foreach (Renderer renderer in renderers)
            {
                renderer.material = phaseMaterial;
            }
        }
        
        // Trigger phase animation
        if (animator != null)
        {
            animator.SetTrigger("Phase");
        }
        
        // Face the target
        Vector3 lookDirection = (phaseTarget - transform.position).normalized;
        lookDirection.y = 0f;
        if (lookDirection != Vector3.zero)
        {
            transform.rotation = Quaternion.LookRotation(lookDirection);
        }
        
        // Gradually move and scale during phasing
        Vector3 startPos = transform.position;
        float duration = 1.5f;
        float elapsedTime = 0f;
        
        while (elapsedTime < duration)
        {
            float t = elapsedTime / duration;
            
            // Scale down halfway, then scale back up
            float scaleMultiplier;
            if (t < 0.5f)
            {
                scaleMultiplier = 1f - t;
            }
            else
            {
                scaleMultiplier = t;
            }
            
            transform.localScale = originalScale * scaleMultiplier;
            
            // Move to target position
            transform.position = Vector3.Lerp(startPos, phaseTarget, t);
            
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        
        // Restore original scale
        transform.localScale = originalScale;
        
        // Reset to default material
        if (defaultMaterial != null)
        {
            foreach (Renderer renderer in renderers)
            {
                renderer.material = defaultMaterial;
            }
        }
        
        // Re-enable nav agent
        if (navAgent != null)
        {
            navAgent.enabled = true;
        }
        
        // End phasing
        isPhasing = false;
    }
    
    /// <summary>
    /// Applies touch damage after a delay (matched to animation)
    /// </summary>
    private IEnumerator ApplyTouchDamageWithDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (player == null || isDead)
            yield break;
            
        // Check distance to player
        float distanceToPlayer = Vector3.Distance(transform.position, player.transform.position);
        
        if (distanceToPlayer <= attackRange)
        {
            // Check if player is in front of wraith
            Vector3 directionToPlayer = (player.transform.position - transform.position).normalized;
            float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);
            
            // If player is in the attack cone (120 degrees, wider for ghostly being)
            if (angleToPlayer <= 60f)
            {
                // Show touch effect
                if (ghostlyTouchEffectPrefab != null)
                {
                    Vector3 effectPosition = transform.position + transform.forward * 1.5f + Vector3.up * 1f;
                    GameObject effectObj = Instantiate(ghostlyTouchEffectPrefab, effectPosition, transform.rotation);
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
    /// Plays ambient sounds periodically
    /// </summary>
    private IEnumerator PlayAmbientSounds()
    {
        while (!isDead && ambientSounds.Length > 0)
        {
            // Wait random interval
            float interval = Random.Range(5f, 15f);
            yield return new WaitForSeconds(interval);
            
            // Play random ambient sound
            PlayRandomSound(ambientSounds, 0.5f); // At half volume
        }
    }
    
    /// <summary>
    /// Handles damage taken event
    /// </summary>
    private void OnDamageTaken(int amount, bool wasCritical)
    {
        // Cancel phasing if in progress
        if (isPhasing)
        {
            StopAllCoroutines();
            isPhasing = false;
            
            // Restore original scale
            transform.localScale = originalScale;
            
            // Reset to default material
            if (defaultMaterial != null)
            {
                foreach (Renderer renderer in renderers)
                {
                    renderer.material = defaultMaterial;
                }
            }
            
            // Re-enable nav agent
            if (navAgent != null)
            {
                navAgent.enabled = true;
            }
            
            // Start ambient sounds again
            StartCoroutine(PlayAmbientSounds());
        }
        
        // Play damage animation
        if (animator != null)
        {
            animator.SetTrigger("Damage");
        }
        
        // Try to teleport away if heavily damaged
        if (health != null && health.CurrentHealthPercent < 0.3f && Time.time >= nextTeleportTime - 3f)
        {
            TeleportBehindPlayer();
        }
    }
    
    /// <summary>
    /// Handles death event
    /// </summary>
    private void OnDeath()
    {
        isDead = true;
        
        // Cancel phasing if in progress
        if (isPhasing)
        {
            StopAllCoroutines();
            isPhasing = false;
            
            // Restore original scale
            transform.localScale = originalScale;
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
        
        // Fade out effect for death
        StartCoroutine(FadeOutOnDeath());
    }
    
    /// <summary>
    /// Fades out the wraith when it dies
    /// </summary>
    private IEnumerator FadeOutOnDeath()
    {
        // Apply death material if available
        if (phaseMaterial != null)
        {
            foreach (Renderer renderer in renderers)
            {
                renderer.material = phaseMaterial;
            }
        }
        
        // Gradually fade out
        float duration = 3f;
        float elapsedTime = 0f;
        
        while (elapsedTime < duration)
        {
            float alpha = 1f - (elapsedTime / duration);
            
            // Apply fade to all renderers
            foreach (Renderer renderer in renderers)
            {
                Color color = renderer.material.color;
                color.a = alpha;
                renderer.material.color = color;
            }
            
            // Slowly rise up
            transform.position += Vector3.up * Time.deltaTime * 0.5f;
            
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        
        // Destroy the game object
        Destroy(gameObject);
    }
    
    /// <summary>
    /// Plays a random sound from the provided array
    /// </summary>
    private void PlayRandomSound(AudioClip[] sounds, float volume = 1f)
    {
        if (sounds.Length == 0 || audioSource == null)
            return;
            
        int randomIndex = Random.Range(0, sounds.Length);
        audioSource.PlayOneShot(sounds[randomIndex], volume);
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