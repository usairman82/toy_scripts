using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Sets up and configures Level 2: "The Hall of Kings" - "The Whispering Tombs"
/// </summary>
public class Level2Setup : MonoBehaviour
{
    [Header("Level References")]
    [SerializeField] private Transform playerSpawnPoint;
    [SerializeField] private GameObject mummyPrefab;
    [SerializeField] private GameObject tombRaiderPrefab;
    [SerializeField] private GameObject environmentPrefab;
    [SerializeField] private AudioClip levelMusic;
    [SerializeField] private AudioClip ambientSound;
    
    [Header("Level Settings")]
    [SerializeField] private float fallingBlockTrapDelay = 0.5f;
    [SerializeField] private float fallingBlockTrapForce = 20f;
    [SerializeField] private int fallingBlockTrapDamage = 30;
    
    // References to managers
    private GameManager gameManager;
    private LevelManager levelManager;
    private AudioManager audioManager;
    private Level2Builder levelBuilder;
    
    private void Awake()
    {
        // Find or create necessary managers
        InitializeManagers();
        
        // Find level builder
        levelBuilder = FindObjectOfType<Level2Builder>();
        
        // Set up environment
        SetupEnvironment();
        
        // Spawn enemies
        SpawnEnemies();
        
        // Set up initial objectives
        SetupObjectives();
    }
    
    /// <summary>
    /// Finds or creates necessary game managers
    /// </summary>
    private void InitializeManagers()
    {
        // Find GameManager
        gameManager = FindObjectOfType<GameManager>();
        if (gameManager == null)
        {
            GameObject gameManagerObj = new GameObject("GameManager");
            gameManager = gameManagerObj.AddComponent<GameManager>();
        }
        
        // Find LevelManager
        levelManager = FindObjectOfType<LevelManager>();
        if (levelManager == null)
        {
            GameObject levelManagerObj = new GameObject("LevelManager");
            levelManager = levelManagerObj.AddComponent<LevelManager>();
            
            // Configure level manager for Level 2
            levelManager.SetLevelInfo("The Hall of Kings", 
                "Navigate the long corridor of crypts and find the missing keystone to open the door.");
        }
        
        // Find AudioManager
        audioManager = FindObjectOfType<AudioManager>();
        if (audioManager == null)
        {
            GameObject audioManagerObj = new GameObject("AudioManager");
            audioManager = audioManagerObj.AddComponent<AudioManager>();
        }
        
        // If no spawn point set, try to find one from the level builder
        if (playerSpawnPoint == null && levelBuilder != null)
        {
            playerSpawnPoint = levelBuilder.GetPlayerSpawnPoint();
        }
        
        // Set initial spawn point in GameManager
        if (playerSpawnPoint != null)
        {
            gameManager.SetCheckpoint(playerSpawnPoint);
        }
    }
    
    /// <summary>
    /// Sets up the level environment
    /// </summary>
    private void SetupEnvironment()
    {
        // Instantiate environment if it exists
        if (environmentPrefab != null)
        {
            Instantiate(environmentPrefab, Vector3.zero, Quaternion.identity);
        }
        
        // Play level music
        if (audioManager != null)
        {
            if (levelMusic != null)
            {
                audioManager.PlayMusic("Level2", true);
            }
            
            if (ambientSound != null)
            {
                audioManager.PlayAmbient("Tombs", true);
            }
        }
        else if (levelMusic != null)
        {
            // Fallback if no audio manager
            AudioSource audioSource = GetComponent<AudioSource>();
            if (audioSource == null)
            {
                audioSource = gameObject.AddComponent<AudioSource>();
            }
            
            audioSource.clip = levelMusic;
            audioSource.loop = true;
            audioSource.volume = 0.7f;
            audioSource.Play();
        }
    }
    
    /// <summary>
    /// Spawns enemies in the level
    /// </summary>
    private void SpawnEnemies()
    {
        if (levelBuilder == null)
            return;
            
        // Spawn mummies
        SpawnEnemyType("Mummy", mummyPrefab);
        
        // Spawn tomb raiders
        SpawnEnemyType("TombRaider", tombRaiderPrefab);
    }
    
    /// <summary>
    /// Spawn enemies of a specific type at given spawn points
    /// </summary>
    private void SpawnEnemyType(string typeName, GameObject prefab)
    {
        if (prefab == null || levelBuilder == null)
            return;
            
        // Get spawn points for this enemy type
        List<Transform> spawnPoints = levelBuilder.GetEnemySpawnPoints(typeName);
        
        foreach (Transform spawnPoint in spawnPoints)
        {
            if (spawnPoint != null)
            {
                GameObject enemyObj = Instantiate(prefab, spawnPoint.position, spawnPoint.rotation);
                
                // Configure enemy based on type
                switch (typeName)
                {
                    case "Mummy":
                        ConfigureMummy(enemyObj);
                        break;
                        
                    case "TombRaider":
                        ConfigureTombRaider(enemyObj);
                        break;
                }
            }
        }
    }
    
    /// <summary>
    /// Configures a mummy enemy
    /// </summary>
    private void ConfigureMummy(GameObject mummyObj)
    {
        // Get components
        EnemyAI enemyAI = mummyObj.GetComponent<EnemyAI>();
        EnemyHealth enemyHealth = mummyObj.GetComponent<EnemyHealth>();
        MummyBehavior mummyBehavior = mummyObj.GetComponent<MummyBehavior>();
        
        // Configure AI
        if (enemyAI != null)
        {
            enemyAI.SetEnemyType(EnemyType.Mummy);
        }
        
        // Configure health
        if (enemyHealth != null)
        {
            enemyHealth.SetMaxHealth(80);
            enemyHealth.SetBulletImmunity(false);
        }
        
        // Configure behavior
        if (mummyBehavior != null)
        {
            // Adjust paralyze chance based on difficulty or other factors
            mummyBehavior.SetParalyzeChance(0.3f);
        }
    }
    
    /// <summary>
    /// Configures a tomb raider enemy
    /// </summary>
    private void ConfigureTombRaider(GameObject raiderObj)
    {
        // Get components
        EnemyAI enemyAI = raiderObj.GetComponent<EnemyAI>();
        EnemyHealth enemyHealth = raiderObj.GetComponent<EnemyHealth>();
        TombRaiderBehavior raiderBehavior = raiderObj.GetComponent<TombRaiderBehavior>();
        
        // Configure AI
        if (enemyAI != null)
        {
            enemyAI.SetEnemyType(EnemyType.TombRaider);
        }
        
        // Configure health
        if (enemyHealth != null)
        {
            enemyHealth.SetMaxHealth(60);
            enemyHealth.SetBulletImmunity(false);
        }
        
        // Configure behavior (tomb raiders use guns)
        if (raiderBehavior != null)
        {
            raiderBehavior.SetShootDamage(15);
        }
    }
    
    /// <summary>
    /// Sets up initial objectives for the level
    /// </summary>
    private void SetupObjectives()
    {
        if (levelManager == null)
            return;
            
        // Add objectives
        levelManager.AddObjective("Find the missing keystone to unlock the exit");
        levelManager.AddObjective("Navigate through the trapped tomb chambers");
        levelManager.AddObjective("Discover the ancient scrolls about the curse");
    }
    
    /// <summary>
    /// Sets up trap behavior classes if not already done by the builder
    /// </summary>
    private void SetupTraps()
    {
        // Find all falling block traps and configure them
        FallingBlockTrigger[] fallingBlockTriggers = FindObjectsOfType<FallingBlockTrigger>();
        foreach (FallingBlockTrigger trigger in fallingBlockTriggers)
        {
            if (trigger != null)
            {
                trigger.SetDelay(fallingBlockTrapDelay);
                trigger.SetForce(fallingBlockTrapForce);
                trigger.SetDamage(fallingBlockTrapDamage);
            }
        }
    }
}

/// <summary>
/// Controls a falling block trap
/// </summary>
public class FallingBlockTrigger : MonoBehaviour
{
    private GameObject fallingBlock;
    private float delay = 0.5f;
    private float force = 20f;
    private int damage = 30;
    private bool triggered = false;
    
    /// <summary>
    /// Sets the falling block GameObject
    /// </summary>
    public void SetFallingBlock(GameObject block)
    {
        fallingBlock = block;
    }
    
    /// <summary>
    /// Sets the delay before the block falls
    /// </summary>
    public void SetDelay(float newDelay)
    {
        delay = newDelay;
    }
    
    /// <summary>
    /// Sets the force with which the block falls
    /// </summary>
    public void SetForce(float newForce)
    {
        force = newForce;
    }
    
    /// <summary>
    /// Sets the damage the trap does
    /// </summary>
    public void SetDamage(int newDamage)
    {
        damage = newDamage;
    }
    
    private void OnTriggerEnter(Collider other)
    {
        // Only trigger once
        if (triggered || fallingBlock == null)
            return;
            
        // Only trigger for player
        if (other.CompareTag("Player"))
        {
            triggered = true;
            StartCoroutine(TriggerFallingBlock());
        }
    }
    
    /// <summary>
    /// Triggers the falling block after a delay
    /// </summary>
    private IEnumerator TriggerFallingBlock()
    {
        // Wait for delay
        yield return new WaitForSeconds(delay);
        
        // Enable physics on the block
        Rigidbody rb = fallingBlock.GetComponent<Rigidbody>();
        if (rb != null)
        {
            rb.isKinematic = false;
            rb.useGravity = true;
            rb.AddForce(Vector3.down * force, ForceMode.Impulse);
        }
        
        // Add damage component to the block
        TrapDamageDealer damageDealer = fallingBlock.GetComponent<TrapDamageDealer>();
        if (damageDealer == null)
        {
            damageDealer = fallingBlock.AddComponent<TrapDamageDealer>();
            damageDealer.SetDamage(damage);
        }
    }
}

/// <summary>
/// Component that deals damage to the player on collision
/// </summary>
public class TrapDamageDealer : MonoBehaviour
{
    private int damage = 30;
    private bool hasDamaged = false;
    
    /// <summary>
    /// Sets the damage amount
    /// </summary>
    public void SetDamage(int newDamage)
    {
        damage = newDamage;
    }
    
    private void OnCollisionEnter(Collision collision)
    {
        // Only damage player once
        if (hasDamaged)
            return;
            
        // Check if it's the player
        if (collision.gameObject.CompareTag("Player"))
        {
            // Apply damage
            HealthSystem playerHealth = collision.gameObject.GetComponent<HealthSystem>();
            if (playerHealth != null)
            {
                playerHealth.TakeDamage(damage, gameObject);
                hasDamaged = true;
            }
        }
    }
}

/// <summary>
/// Controller for spike traps and other static traps
/// </summary>
public class TrapController : MonoBehaviour
{
    private int damage = 15;
    private bool isActive = false;
    private float resetTime = 5f;
    private Animator animator;
    private AudioSource audioSource;
    
    private void Awake()
    {
        animator = GetComponent<Animator>();
        audioSource = GetComponent<AudioSource>();
        
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
    }
    
    /// <summary>
    /// Sets the damage amount
    /// </summary>
    public void SetDamage(int newDamage)
    {
        damage = newDamage;
    }
    
    /// <summary>
    /// Activates the trap
    /// </summary>
    public void ActivateTrap()
    {
        if (isActive)
            return;
            
        isActive = true;
        
        // Trigger animation
        if (animator != null)
        {
            animator.SetTrigger("Activate");
        }
        
        // Play sound
        if (audioSource != null)
        {
            audioSource.Play();
        }
        
        // Add collider for damage
        StartCoroutine(EnableDamageCollider());
        
        // Reset after time
        StartCoroutine(ResetTrap());
    }
    
    /// <summary>
    /// Enables the damage collider briefly
    /// </summary>
    private IEnumerator EnableDamageCollider()
    {
        // Create trigger collider
        GameObject damageZone = new GameObject("DamageZone");
        damageZone.transform.parent = transform;
        damageZone.transform.localPosition = Vector3.zero;
        
        BoxCollider collider = damageZone.AddComponent<BoxCollider>();
        collider.size = new Vector3(2f, 2f, 2f);
        collider.isTrigger = true;
        
        // Add damage script
        TrapTriggerZone triggerZone = damageZone.AddComponent<TrapTriggerZone>();
        triggerZone.SetDamage(damage);
        
        // Keep active briefly
        yield return new WaitForSeconds(0.5f);
        
        // Destroy damage zone
        Destroy(damageZone);
    }
    
    /// <summary>
    /// Resets the trap after a delay
    /// </summary>
    private IEnumerator ResetTrap()
    {
        yield return new WaitForSeconds(resetTime);
        
        isActive = false;
        
        // Reset animation
        if (animator != null)
        {
            animator.SetTrigger("Reset");
        }
    }
}

/// <summary>
/// Trigger zone that deals damage to the player
/// </summary>
public class TrapTriggerZone : MonoBehaviour
{
    private int damage = 15;
    
    /// <summary>
    /// Sets the damage amount
    /// </summary>
    public void SetDamage(int newDamage)
    {
        damage = newDamage;
    }
    
    private void OnTriggerEnter(Collider other)
    {
        // Check if it's the player
        if (other.CompareTag("Player"))
        {
            // Apply damage
            HealthSystem playerHealth = other.GetComponent<HealthSystem>();
            if (playerHealth != null)
            {
                playerHealth.TakeDamage(damage, gameObject);
            }
        }
    }
}