using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Sets up and configures Level 1: "The Threshold of the Damned"
/// </summary>
public class Level1Setup : MonoBehaviour
{
    [Header("Level References")]
    [SerializeField] private Transform playerSpawnPoint;
    [SerializeField] private GameObject enemyPrefabs;
    [SerializeField] private GameObject environmentPrefab;
    [SerializeField] private AudioClip levelMusic;
    
    [Header("Enemy Spawns")]
    [SerializeField] private Transform[] skeletonSpawnPoints;
    [SerializeField] private Transform[] houndSpawnPoints;
    
    // References to managers
    private GameManager gameManager;
    private LevelManager levelManager;
    
    private void Awake()
    {
        // Find or create necessary managers
        InitializeManagers();
        
        // Set up environment
        SetupEnvironment();
        
        // Spawn enemies
        SpawnEnemies();
    }
    
    /// <summary>
    /// Finds or creates necessary game managers
    /// </summary>
    private void InitializeManagers()
    {
        // Find GameManager, create if not found
        gameManager = FindObjectOfType<GameManager>();
        if (gameManager == null)
        {
            GameObject gameManagerObj = new GameObject("GameManager");
            gameManager = gameManagerObj.AddComponent<GameManager>();
        }
        
        // Find LevelManager, create if not found
        levelManager = FindObjectOfType<LevelManager>();
        if (levelManager == null)
        {
            GameObject levelManagerObj = new GameObject("LevelManager");
            levelManager = levelManagerObj.AddComponent<LevelManager>();
            
            // Configure level manager for Level 1
            // This would be better done through the inspector with a prefab
            levelManager.SetLevelInfo("The Threshold of the Damned", 
                "Find a way to unlock the ancient gates in this ruined stone entrance.");
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
        if (levelMusic != null)
        {
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
        // This is a placeholder - you would have prefabs for each enemy type
        // For now, we'll assume a single enemy prefab that we'll configure
        if (enemyPrefabs == null)
            return;
            
        // Spawn skeleton warriors
        SpawnEnemyType(skeletonSpawnPoints, EnemyType.SkeletonWarrior);
        
        // Spawn cursed hounds
        SpawnEnemyType(houndSpawnPoints, EnemyType.CursedHound);
    }
    
    /// <summary>
    /// Spawn enemies of a specific type at given spawn points
    /// </summary>
    private void SpawnEnemyType(Transform[] spawnPoints, EnemyType enemyType)
    {
        if (spawnPoints == null || spawnPoints.Length == 0 || enemyPrefabs == null)
            return;
            
        foreach (Transform spawnPoint in spawnPoints)
        {
            if (spawnPoint != null)
            {
                GameObject enemyObj = Instantiate(enemyPrefabs, spawnPoint.position, spawnPoint.rotation);
                
                // Configure enemy
                EnemyAI enemyAI = enemyObj.GetComponent<EnemyAI>();
                if (enemyAI != null)
                {
                    // Set enemy type
                    enemyAI.SetEnemyType(enemyType);
                }
                
                // Configure health based on enemy type
                EnemyHealth enemyHealth = enemyObj.GetComponent<EnemyHealth>();
                if (enemyHealth != null)
                {
                    // Set health based on enemy type
                    ConfigureEnemyHealth(enemyHealth, enemyType);
                }
            }
        }
    }
    
    /// <summary>
    /// Configures enemy health based on type
    /// </summary>
    private void ConfigureEnemyHealth(EnemyHealth health, EnemyType enemyType)
    {
        switch (enemyType)
        {
            case EnemyType.SkeletonWarrior:
                health.SetMaxHealth(50);
                health.SetBulletImmunity(false);
                break;
                
            case EnemyType.CursedHound:
                health.SetMaxHealth(30);
                health.SetBulletImmunity(false);
                break;
                
            case EnemyType.GuardianStatue:
                health.SetMaxHealth(150);
                health.SetBulletImmunity(true);
                break;
                
            default:
                health.SetMaxHealth(50);
                health.SetBulletImmunity(false);
                break;
        }
    }
}
