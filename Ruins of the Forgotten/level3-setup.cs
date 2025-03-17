using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Sets up and configures Level 3: "The Shadow Maze" - "Lost in Darkness"
/// </summary>
public class Level3Setup : MonoBehaviour
{
    [Header("Level References")]
    [SerializeField] private Transform playerSpawnPoint;
    [SerializeField] private GameObject spectralWraithPrefab;
    [SerializeField] private GameObject guardianStatuePrefab;
    [SerializeField] private GameObject environmentPrefab;
    [SerializeField] private AudioClip levelMusic;
    [SerializeField] private AudioClip ambientSound;
    
    [Header("Lighting")]
    [SerializeField] private Color mazeAmbientColor = new Color(0.05f, 0.05f, 0.1f);
    [SerializeField] private float torchLightIntensity = 1.5f;
    [SerializeField] private float torchLightRange = 8f;
    [SerializeField] private Color torchLightColor = new Color(1f, 0.7f, 0.3f);
    
    [Header("Fog Settings")]
    [SerializeField] private bool enableFog = true;
    [SerializeField] private Color fogColor = new Color(0.01f, 0.01f, 0.02f);
    [SerializeField] private float fogDensity = 0.05f;
    
    // References to managers
    private GameManager gameManager;
    private LevelManager levelManager;
    private AudioManager audioManager;
    private Level3Builder levelBuilder;
    
    private void Awake()
    {
        // Find or create necessary managers
        InitializeManagers();
        
        // Find level builder
        levelBuilder = FindObjectOfType<Level3Builder>();
        
        // Set up lighting and atmosphere
        SetupLightingAndAtmosphere();
        
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
            
            // Configure level manager for Level 3
            levelManager.SetLevelInfo("The Shadow Maze", 
                "Navigate the dark labyrinth and find the golden key to unlock the exit.");
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
    /// Sets up lighting and atmosphere for the maze level
    /// </summary>
    private void SetupLightingAndAtmosphere()
    {
        // Set ambient color
        RenderSettings.ambientLight = mazeAmbientColor;
        
        // Configure fog
        RenderSettings.fog = enableFog;
        RenderSettings.fogColor = fogColor;
        RenderSettings.fogMode = FogMode.Exponential;
        RenderSettings.fogDensity = fogDensity;
        
        // Configure torch lights
        Light[] torchLights = FindObjectsOfType<Light>();
        foreach (Light light in torchLights)
        {
            if (light.type == LightType.Point)
            {
                light.color = torchLightColor;
                light.intensity = torchLightIntensity;
                light.range = torchLightRange;
                
                // Add flickering to torch lights
                if (!light.gameObject.GetComponent<TorchFlicker>())
                {
                    light.gameObject.AddComponent<TorchFlicker>();
                }
            }
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
                audioManager.PlayMusic("ShadowMaze", true);
            }
            
            if (ambientSound != null)
            {
                audioManager.PlayAmbient("MazeAmbience", true);
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
            
        // Spawn spectral wraiths
        SpawnEnemyType("Wraith", spectralWraithPrefab);
        
        // Spawn guardian statues
        SpawnEnemyType("Guardian", guardianStatuePrefab);
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
                    case "Wraith":
                        ConfigureWraith(enemyObj);
                        break;
                        
                    case "Guardian":
                        ConfigureGuardian(enemyObj);
                        break;
                }
            }
        }
    }
    
    /// <summary>
    /// Configures a spectral wraith enemy
    /// </summary>
    private void ConfigureWraith(GameObject wraithObj)
    {
        // Get components
        EnemyAI enemyAI = wraithObj.GetComponent<EnemyAI>();
        EnemyHealth enemyHealth = wraithObj.GetComponent<EnemyHealth>();
        SpectralWraithBehavior wraithBehavior = wraithObj.GetComponent<SpectralWraithBehavior>();
        
        // Configure AI
        if (enemyAI != null)
        {
            enemyAI.SetEnemyType(EnemyType.SpectralWraith);
        }
        
        // Configure health
        if (enemyHealth != null)
        {
            enemyHealth.SetMaxHealth(40);
            enemyHealth.SetBulletImmunity(false);
        }
        
        // Configure behavior
        if (wraithBehavior != null)
        {
            // Make some wraiths teleport more frequently
            if (UnityEngine.Random.value < 0.3f)
            {
                wraithBehavior.SetTeleportCooldown(3f);
            }
        }
    }
    
    /// <summary>
    /// Configures a guardian statue enemy
    /// </summary>
    private void ConfigureGuardian(GameObject guardianObj)
    {
        // Get components
        EnemyAI enemyAI = guardianObj.GetComponent<EnemyAI>();
        EnemyHealth enemyHealth = guardianObj.GetComponent<EnemyHealth>();
        GuardianStatueBehavior guardianBehavior = guardianObj.GetComponent<GuardianStatueBehavior>();
        
        // Configure AI
        if (enemyAI != null)
        {
            enemyAI.SetEnemyType(EnemyType.GuardianStatue);
            
            // Disable AI initially - statues are dormant until approached
            enemyAI.enabled = false;
        }
        
        // Configure health
        if (enemyHealth != null)
        {
            enemyHealth.SetMaxHealth(150);
            enemyHealth.SetBulletImmunity(true);
        }
        
        // Configure behavior
        if (guardianBehavior != null)
        {
            // Some guardians have longer activation range
            if (UnityEngine.Random.value < 0.3f)
            {
                guardianBehavior.SetActivationDistance(15f);
            }
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
        levelManager.AddObjective("Navigate through the shadow maze");
        levelManager.AddObjective("Find and solve the symbol puzzles");
        levelManager.AddObjective("Locate the golden key to unlock the exit");
    }
}

/// <summary>
/// Adds flickering effect to torch lights
/// </summary>
public class TorchFlicker : MonoBehaviour
{
    [SerializeField] private float minIntensity = 0.8f;
    [SerializeField] private float maxIntensity = 1.2f;
    [SerializeField] private float cycleSpeed = 3.0f;
    
    private Light torchLight;
    private float baseIntensity;
    private float randomOffset;
    
    private void Start()
    {
        torchLight = GetComponent<Light>();
        if (torchLight != null)
        {
            baseIntensity = torchLight.intensity;
            randomOffset = UnityEngine.Random.Range(0f, 100f);
        }
    }
    
    private void Update()
    {
        if (torchLight != null)
        {
            // Create a random but smooth flicker effect
            float noise = Mathf.PerlinNoise(randomOffset, Time.time * cycleSpeed);
            float intensityModifier = Mathf.Lerp(minIntensity, maxIntensity, noise);
            torchLight.intensity = baseIntensity * intensityModifier;
        }
    }
}