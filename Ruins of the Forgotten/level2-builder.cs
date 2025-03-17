using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Builds Level a: "The Hall of Kings" - "The Whispering Tombs"
/// </summary>
public class Level2Builder : MonoBehaviour
{
    [Header("Environment Prefabs")]
    [SerializeField] private GameObject floorPrefab;
    [SerializeField] private GameObject wallPrefab;
    [SerializeField] private GameObject columnPrefab;
    [SerializeField] private GameObject torchPrefab;
    [SerializeField] private GameObject tombPrefab;
    [SerializeField] private GameObject sarcophagusPrefab;
    [SerializeField] private GameObject exitGatePrefab;
    [SerializeField] private GameObject treasureChestPrefab;
    
    [Header("Interactive Elements")]
    [SerializeField] private GameObject doorPrefab;
    [SerializeField] private GameObject keystonePrefab;
    [SerializeField] private GameObject trapPrefab;
    [SerializeField] private GameObject pressurePlatePrefab;
    [SerializeField] private GameObject fallingBlockPrefab;
    [SerializeField] private GameObject spikesPrefab;
    [SerializeField] private GameObject lorePrefab;
    
    [Header("Level Layout")]
    [SerializeField] private TextAsset levelLayoutFile;
    [SerializeField] private float gridSize = 4f;
    [SerializeField] private float wallHeight = 5f;
    
    [Header("Trap Settings")]
    [SerializeField] private float trapTriggerRadius = 2f;
    [SerializeField] private float trapResetTime = 5f;
    [SerializeField] private int trapDamage = 15;
    
    // Level data
    private char[,] levelGrid;
    private int gridWidth;
    private int gridHeight;
    
    // Object collections for references
    private List<GameObject> doors = new List<GameObject>();
    private List<GameObject> pressurePlates = new List<GameObject>();
    private List<Transform> enemySpawnPoints = new List<Transform>();
    private List<Transform> trapPositions = new List<Transform>();
    private Transform keystone;
    private Transform exitGate;
    
    private void Awake()
    {
        // Parse level layout
        ParseLevelLayout();
        
        // Build level
        BuildLevel();
        
        // Set up traps and puzzles
        SetupTrapsAndPuzzles();
    }
    
    /// <summary>
    /// Parses the level layout file
    /// </summary>
    private void ParseLevelLayout()
    {
        if (levelLayoutFile == null)
        {
            // Create a default layout if no file is provided
            CreateDefaultLayout();
            return;
        }
        
        string[] lines = levelLayoutFile.text.Split('\n');
        
        // Determine grid dimensions
        gridHeight = lines.Length;
        gridWidth = lines[0].TrimEnd().Length;
        
        // Initialize grid
        levelGrid = new char[gridWidth, gridHeight];
        
        // Parse each line into the grid
        for (int y = 0; y < gridHeight; y++)
        {
            string line = lines[y].TrimEnd();
            
            for (int x = 0; x < Mathf.Min(line.Length, gridWidth); x++)
            {
                levelGrid[x, y] = line[x];
            }
        }
    }
    
    /// <summary>
    /// Creates a default level layout if none is provided
    /// </summary>
    private void CreateDefaultLayout()
    {
        // Level 2 - The Hall of Kings - a long corridor with tombs and crypts
        gridWidth = 40;
        gridHeight = 20;
        levelGrid = new char[gridWidth, gridHeight];
        
        // Fill with empty space
        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                levelGrid[x, y] = '.';
            }
        }
        
        // Add outer walls
        for (int x = 0; x < gridWidth; x++)
        {
            levelGrid[x, 0] = 'W';
            levelGrid[x, gridHeight - 1] = 'W';
        }
        
        for (int y = 0; y < gridHeight; y++)
        {
            levelGrid[0, y] = 'W';
            levelGrid[gridWidth - 1, y] = 'W';
        }
        
        // Create main hall - central corridor
        int mainHallWidth = 6;
        int mainHallX = (gridWidth - mainHallWidth) / 2;
        
        // Side walls for main corridor
        for (int y = 0; y < gridHeight; y++)
        {
            levelGrid[mainHallX, y] = 'W';
            levelGrid[mainHallX + mainHallWidth, y] = 'W';
        }
        
        // Add columns along main corridor
        for (int y = 3; y < gridHeight - 3; y += 4)
        {
            levelGrid[mainHallX + 1, y] = 'C';
            levelGrid[mainHallX + mainHallWidth - 1, y] = 'C';
        }
        
        // Add torches
        for (int y = 5; y < gridHeight - 3; y += 8)
        {
            levelGrid[mainHallX, y] = 'T';
            levelGrid[mainHallX + mainHallWidth, y] = 'T';
        }
        
        // Add tombs and crypts along the sides
        for (int sideRoom = 0; sideRoom < 3; sideRoom++)
        {
            int roomY = 5 + sideRoom * 6;
            
            // Left side room (with tombs)
            levelGrid[mainHallX, roomY] = 'D'; // Door to room
            
            // Room bounds
            for (int x = 2; x < mainHallX; x++)
            {
                levelGrid[x, roomY - 3] = 'W';
                levelGrid[x, roomY + 3] = 'W';
            }
            
            // Add tombs
            for (int x = 3; x < mainHallX - 2; x += 3)
            {
                levelGrid[x, roomY - 2] = 'B'; // Tomb
                levelGrid[x, roomY + 2] = 'B'; // Tomb
            }
            
            // Right side room (with sarcophagi)
            levelGrid[mainHallX + mainHallWidth, roomY] = 'D'; // Door to room
            
            // Room bounds
            for (int x = mainHallX + mainHallWidth; x < gridWidth - 2; x++)
            {
                levelGrid[x, roomY - 3] = 'W';
                levelGrid[x, roomY + 3] = 'W';
            }
            
            // Add sarcophagi
            for (int x = mainHallX + mainHallWidth + 3; x < gridWidth - 3; x += 3)
            {
                levelGrid[x, roomY] = 'S'; // Sarcophagus
            }
            
            // Add trap in one room
            if (sideRoom == 1)
            {
                levelGrid[mainHallX + mainHallWidth + 5, roomY - 2] = 'X'; // Trap
                levelGrid[mainHallX + mainHallWidth + 5, roomY + 2] = 'P'; // Pressure plate
            }
            
            // Add keystone in last room
            if (sideRoom == 2)
            {
                levelGrid[mainHallX + mainHallWidth + 5, roomY] = 'K'; // Keystone
            }
        }
        
        // Add enemies
        // Mummies guarding the tombs
        levelGrid[mainHallX - 2, 5] = 'M'; // Mummy
        levelGrid[mainHallX - 2, 11] = 'M'; // Mummy
        levelGrid[mainHallX - 2, 17] = 'M'; // Mummy
        
        // Tomb raiders scattered around
        levelGrid[mainHallX + 3, 5] = 'R'; // Tomb Raider
        levelGrid[mainHallX + 3, 15] = 'R'; // Tomb Raider
        
        // Entry and exit points
        levelGrid[mainHallX + mainHallWidth/2, 1] = 'Z'; // Player spawn
        levelGrid[mainHallX + mainHallWidth/2, gridHeight - 2] = 'E'; // Exit
        
        // Add treasure chest
        levelGrid[4, 11] = 'C'; // Chest
        
        // Add lore scroll
        levelGrid[mainHallX + mainHallWidth - 2, 7] = 'L'; // Lore
        
        // Add falling ceiling trap
        levelGrid[mainHallX + 3, 10] = 'F'; // Falling block trap
    }
    
    /// <summary>
    /// Builds the level based on the level grid
    /// </summary>
    private void BuildLevel()
    {
        // Create parent objects for organization
        GameObject environment = new GameObject("Environment");
        GameObject interactives = new GameObject("Interactives");
        GameObject traps = new GameObject("Traps");
        
        // Create floor
        GameObject floor = CreateFloor(environment.transform);
        
        // Create walls and other objects based on grid
        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                Vector3 position = new Vector3(x * gridSize, 0f, y * gridSize);
                char cellType = levelGrid[x, y];
                
                switch (cellType)
                {
                    case 'W': // Wall
                        CreateWall(position, environment.transform);
                        break;
                        
                    case 'C': // Column
                        CreateColumn(position, environment.transform);
                        break;
                        
                    case 'T': // Torch
                        CreateTorch(position, environment.transform);
                        break;
                        
                    case 'B': // Tomb
                        CreateTomb(position, environment.transform);
                        break;
                        
                    case 'S': // Sarcophagus
                        CreateSarcophagus(position, environment.transform);
                        break;
                        
                    case 'D': // Door
                        CreateDoor(position, interactives.transform);
                        break;
                        
                    case 'K': // Keystone
                        CreateKeystone(position, interactives.transform);
                        break;
                        
                    case 'P': // Pressure Plate
                        CreatePressurePlate(position, interactives.transform);
                        break;
                        
                    case 'X': // Trap
                        CreateTrap(position, traps.transform);
                        break;
                        
                    case 'F': // Falling Block
                        CreateFallingBlock(position, traps.transform);
                        break;
                        
                    case 'E': // Exit
                        CreateExit(position, interactives.transform);
                        break;
                        
                    case 'L': // Lore
                        CreateLore(position, interactives.transform);
                        break;
                        
                    case 'Z': // Player Spawn
                        CreatePlayerSpawn(position);
                        break;
                        
                    case 'M': // Mummy
                        CreateEnemySpawn(position, "Mummy");
                        break;
                        
                    case 'R': // Tomb Raider
                        CreateEnemySpawn(position, "TombRaider");
                        break;
                }
            }
        }
    }
    
    #region Object Creation Methods
    
    /// <summary>
    /// Creates the floor for the level
    /// </summary>
    private GameObject CreateFloor(Transform parent)
    {
        GameObject floorObj = new GameObject("Floor");
        floorObj.transform.parent = parent;
        
        // Create a single large floor plane
        if (floorPrefab != null)
        {
            Vector3 floorSize = new Vector3(gridWidth * gridSize, 1f, gridHeight * gridSize);
            Vector3 floorPosition = new Vector3(gridWidth * gridSize / 2f - gridSize / 2f, 0f, gridHeight * gridSize / 2f - gridSize / 2f);
            
            GameObject floor = Instantiate(floorPrefab, floorPosition, Quaternion.identity, floorObj.transform);
            floor.transform.localScale = floorSize;
        }
        
        return floorObj;
    }
    
    /// <summary>
    /// Creates a wall at the specified position
    /// </summary>
    private GameObject CreateWall(Vector3 position, Transform parent)
    {
        if (wallPrefab != null)
        {
            Vector3 wallPos = position + new Vector3(0, wallHeight / 2f, 0);
            GameObject wallObj = Instantiate(wallPrefab, wallPos, Quaternion.identity, parent);
            wallObj.transform.localScale = new Vector3(gridSize, wallHeight, gridSize);
            return wallObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a column at the specified position
    /// </summary>
    private GameObject CreateColumn(Vector3 position, Transform parent)
    {
        if (columnPrefab != null)
        {
            Vector3 columnPos = position + new Vector3(0, wallHeight / 2f, 0);
            GameObject columnObj = Instantiate(columnPrefab, columnPos, Quaternion.identity, parent);
            return columnObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a torch at the specified position
    /// </summary>
    private GameObject CreateTorch(Vector3 position, Transform parent)
    {
        if (torchPrefab != null)
        {
            Vector3 torchPos = position + new Vector3(0, wallHeight / 2f, 0);
            GameObject torchObj = Instantiate(torchPrefab, torchPos, Quaternion.identity, parent);
            return torchObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a tomb at the specified position
    /// </summary>
    private GameObject CreateTomb(Vector3 position, Transform parent)
    {
        if (tombPrefab != null)
        {
            GameObject tombObj = Instantiate(tombPrefab, position, Quaternion.identity, parent);
            return tombObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a sarcophagus at the specified position
    /// </summary>
    private GameObject CreateSarcophagus(Vector3 position, Transform parent)
    {
        if (sarcophagusPrefab != null)
        {
            GameObject sarcophagusObj = Instantiate(sarcophagusPrefab, position, Quaternion.identity, parent);
            return sarcophagusObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a door at the specified position
    /// </summary>
    private GameObject CreateDoor(Vector3 position, Transform parent)
    {
        if (doorPrefab != null)
        {
            GameObject doorObj = Instantiate(doorPrefab, position, Quaternion.identity, parent);
            doors.Add(doorObj);
            return doorObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates the keystone at the specified position
    /// </summary>
    private GameObject CreateKeystone(Vector3 position, Transform parent)
    {
        if (keystonePrefab != null)
        {
            Vector3 keystonePos = position + new Vector3(0, 1f, 0);
            GameObject keystoneObj = Instantiate(keystonePrefab, keystonePos, Quaternion.identity, parent);
            keystone = keystoneObj.transform;
            
            // Add interaction component
            InteractableItem interactable = keystoneObj.GetComponent<InteractableItem>();
            if (interactable == null)
            {
                interactable = keystoneObj.AddComponent<InteractableItem>();
            }
            
            return keystoneObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a pressure plate at the specified position
    /// </summary>
    private GameObject CreatePressurePlate(Vector3 position, Transform parent)
    {
        if (pressurePlatePrefab != null)
        {
            Vector3 platePos = position + new Vector3(0, 0.05f, 0);
            GameObject plateObj = Instantiate(pressurePlatePrefab, platePos, Quaternion.identity, parent);
            pressurePlates.Add(plateObj);
            return plateObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a trap at the specified position
    /// </summary>
    private GameObject CreateTrap(Vector3 position, Transform parent)
    {
        if (trapPrefab != null)
        {
            GameObject trapObj = Instantiate(trapPrefab, position, Quaternion.identity, parent);
            
            // Store trap position for later setup
            trapPositions.Add(trapObj.transform);
            
            return trapObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a falling block trap at the specified position
    /// </summary>
    private GameObject CreateFallingBlock(Vector3 position, Transform parent)
    {
        if (fallingBlockPrefab != null)
        {
            // Position slightly above the player
            Vector3 blockPos = position + new Vector3(0, wallHeight, 0);
            GameObject blockObj = Instantiate(fallingBlockPrefab, blockPos, Quaternion.identity, parent);
            
            // Disable the trap initially
            Rigidbody rb = blockObj.GetComponent<Rigidbody>();
            if (rb != null)
            {
                rb.isKinematic = true;
            }
            
            // Add trigger zone below it
            GameObject triggerZone = new GameObject("TriggerZone");
            triggerZone.transform.parent = blockObj.transform.parent;
            triggerZone.transform.position = position;
            
            // Add collider
            SphereCollider sphereCollider = triggerZone.AddComponent<SphereCollider>();
            sphereCollider.radius = trapTriggerRadius;
            sphereCollider.isTrigger = true;
            
            // Add trigger script
            FallingBlockTrigger trigger = triggerZone.AddComponent<FallingBlockTrigger>();
            trigger.SetFallingBlock(blockObj);
            trigger.SetDamage(trapDamage);
            
            return blockObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates the exit at the specified position
    /// </summary>
    private GameObject CreateExit(Vector3 position, Transform parent)
    {
        if (exitGatePrefab != null)
        {
            GameObject exitObj = Instantiate(exitGatePrefab, position, Quaternion.identity, parent);
            exitGate = exitObj.transform;
            
            // Configure exit gate
            InteractableDoor door = exitObj.GetComponent<InteractableDoor>();
            if (door == null)
            {
                door = exitObj.AddComponent<InteractableDoor>();
            }
            
            // Make exit initially locked
            door.SetLocked(true);
            
            // Create exit zone trigger
            GameObject exitZone = new GameObject("ExitZone");
            exitZone.transform.parent = exitObj.transform;
            exitZone.transform.position = position;
            
            // Add collider
            BoxCollider boxCollider = exitZone.AddComponent<BoxCollider>();
            boxCollider.size = new Vector3(gridSize * 0.8f, 3f, gridSize * 0.8f);
            boxCollider.isTrigger = true;
            
            // Add exit script
            LevelExitZone exitZone2 = exitZone.AddComponent<LevelExitZone>();
            
            return exitObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a lore scroll/book at the specified position
    /// </summary>
    private GameObject CreateLore(Vector3 position, Transform parent)
    {
        if (lorePrefab != null)
        {
            Vector3 lorePos = position + new Vector3(0, 1f, 0);
            GameObject loreObj = Instantiate(lorePrefab, lorePos, Quaternion.identity, parent);
            
            // Add interaction component
            InteractableLore interactable = loreObj.GetComponent<InteractableLore>();
            if (interactable == null)
            {
                interactable = loreObj.AddComponent<InteractableLore>();
            }
            
            return loreObj;
        }
        return null;
    }
    
    /// <summary>
    /// Creates a player spawn point at the specified position
    /// </summary>
    private void CreatePlayerSpawn(Vector3 position)
    {
        GameObject spawnPoint = new GameObject("PlayerSpawn");
        spawnPoint.transform.position = position;
        spawnPoint.tag = "PlayerSpawn";
        
        // Store reference in the level manager
        LevelManager levelManager = FindObjectOfType<LevelManager>();
        if (levelManager != null)
        {
            levelManager.SetPlayerSpawnPoint(spawnPoint.transform);
        }
        
        // Store reference in the game manager
        GameManager gameManager = FindObjectOfType<GameManager>();
        if (gameManager != null)
        {
            gameManager.SetCheckpoint(spawnPoint.transform);
        }
    }
    
    /// <summary>
    /// Creates an enemy spawn point at the specified position
    /// </summary>
    private void CreateEnemySpawn(Vector3 position, string enemyType)
    {
        GameObject spawnPoint = new GameObject($"{enemyType}Spawn");
        spawnPoint.transform.position = position;
        
        // Add to spawn points list
        enemySpawnPoints.Add(spawnPoint.transform);
        
        // Store the enemy type in the name for reference
        spawnPoint.name = $"{enemyType}Spawn";
    }
    
    #endregion
    
    /// <summary>
    /// Sets up the traps and puzzles in the level
    /// </summary>
    private void SetupTrapsAndPuzzles()
    {
        // Connect pressure plates to traps
        ConnectPressurePlatesToTraps();
        
        // Set up the keystone puzzle for the exit gate
        SetupKeystonePuzzle();
    }
    
    /// <summary>
    /// Connects pressure plates to traps
    /// </summary>
    private void ConnectPressurePlatesToTraps()
    {
        // Simple 1:1 connection - first plate triggers first trap, etc.
        for (int i = 0; i < Mathf.Min(pressurePlates.Count, trapPositions.Count); i++)
        {
            GameObject plate = pressurePlates[i];
            Transform trapTransform = trapPositions[i];
            
            if (plate != null && trapTransform != null)
            {
                // Get the pressure plate component
                PressurePlate pressurePlate = plate.GetComponent<PressurePlate>();
                if (pressurePlate == null)
                {
                    pressurePlate = plate.AddComponent<PressurePlate>();
                }
                
                // Get the trap component
                TrapController trap = trapTransform.GetComponent<TrapController>();
                if (trap == null)
                {
                    trap = trapTransform.gameObject.AddComponent<TrapController>();
                    trap.SetDamage(trapDamage);
                }
                
                // Connect them using Unity events
                UnityEngine.Events.UnityAction activateAction = () => trap.ActivateTrap();
                
                // Get the UnityEvent from the pressure plate
                System.Reflection.FieldInfo fieldInfo = typeof(PressurePlate).GetField("onPressed", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                
                if (fieldInfo != null)
                {
                    UnityEngine.Events.UnityEvent pressedEvent = fieldInfo.GetValue(pressurePlate) as UnityEngine.Events.UnityEvent;
                    
                    if (pressedEvent != null)
                    {
                        pressedEvent.AddListener(activateAction);
                    }
                }
            }
        }
    }
    
    /// <summary>
    /// Sets up the keystone puzzle for the exit gate
    /// </summary>
    private void SetupKeystonePuzzle()
    {
        if (keystone == null || exitGate == null)
            return;
            
        // Get interactable component from keystone
        InteractableItem keystoneInteractable = keystone.GetComponent<InteractableItem>();
        
        // Get door component from exit gate
        InteractableDoor exitDoor = exitGate.GetComponent<InteractableDoor>();
        
        if (keystoneInteractable != null && exitDoor != null)
        {
            // Update keystone properties
            keystoneInteractable.SetItemName("Missing Keystone");
            keystoneInteractable.SetItemDescription("An ornate keystone that appears to fit in the exit gate.");
            
            // Update exit door to require the keystone
            exitDoor.SetRequiredKeyName("Missing Keystone");
        }
    }
    
    /// <summary>
    /// Gets all enemy spawn points for a specific type
    /// </summary>
    public List<Transform> GetEnemySpawnPoints(string enemyType)
    {
        List<Transform> filteredSpawns = new List<Transform>();
        
        foreach (Transform spawn in enemySpawnPoints)
        {
            if (spawn.name.Contains(enemyType))
            {
                filteredSpawns.Add(spawn);
            }
        }
        
        return filteredSpawns;
    }
    
    /// <summary>
    /// Gets the player spawn point
    /// </summary>
    public Transform GetPlayerSpawnPoint()
    {
        GameObject spawnObj = GameObject.FindGameObjectWithTag("PlayerSpawn");
        return spawnObj != null ? spawnObj.transform : null;
    }
}