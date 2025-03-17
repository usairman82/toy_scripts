using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Builds Level 1: "The Threshold of the Damned" procedurally
/// </summary>
public class Level1Builder : MonoBehaviour
{
    [Header("Environment Prefabs")]
    [SerializeField] private GameObject floorPrefab;
    [SerializeField] private GameObject wallPrefab;
    [SerializeField] private GameObject pillarPrefab;
    [SerializeField] private GameObject torchPrefab;
    [SerializeField] private GameObject rubblePrefab;
    [SerializeField] private GameObject pedestalPrefab;
    [SerializeField] private GameObject exitGatePrefab;
    
    [Header("Interactive Elements")]
    [SerializeField] private GameObject doorPrefab;
    [SerializeField] private GameObject keyPrefab;
    [SerializeField] private GameObject secretLeverPrefab;
    [SerializeField] private GameObject treasureChestPrefab;
    [SerializeField] private GameObject lorePrefab;
    
    [Header("Level Layout")]
    [SerializeField] private TextAsset levelLayoutFile;
    [SerializeField] private float gridSize = 4f;
    [SerializeField] private float wallHeight = 5f;
    
    // Level data
    private char[,] levelGrid;
    private int gridWidth;
    private int gridHeight;
    
    // Object collections
    private List<GameObject> doors = new List<GameObject>();
    private List<GameObject> levers = new List<GameObject>();
    private List<GameObject> enemies = new List<GameObject>();
    
    private void Awake()
    {
        // Load and parse level layout
        ParseLevelLayout();
        
        // Build level
        BuildLevel();
        
        // Set up gameplay elements
        SetupGameplayElements();
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
        // Simple 20x20 layout
        gridWidth = 20;
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
        
        // Add some inner walls
        for (int x = 5; x < 15; x++)
        {
            levelGrid[x, 5] = 'W';
        }
        
        for (int y = 5; y < 15; y++)
        {
            levelGrid[5, y] = 'W';
        }
        
        // Add a door
        levelGrid[10, 5] = 'D';
        
        // Add key
        levelGrid[15, 15] = 'K';
        
        // Add exit
        levelGrid[gridWidth - 2, gridHeight - 2] = 'E';
        
        // Add player spawn
        levelGrid[2, 2] = 'P';
        
        // Add some enemies
        levelGrid[8, 8] = 'S'; // Skeleton
        levelGrid[12, 12] = 'H'; // Hound
        
        // Add some decorations
        levelGrid[3, 3] = 'T'; // Torch
        levelGrid[3, 7] = 'T'; // Torch
        levelGrid[7, 3] = 'T'; // Torch
        levelGrid[7, 7] = 'T'; // Torch
        
        levelGrid[15, 5] = 'C'; // Chest
        levelGrid[5, 15] = 'L'; // Lore scroll
    }
    
    /// <summary>
    /// Builds the level based on the parsed layout
    /// </summary>
    private void BuildLevel()
    {
        // Create parent object for organization
        GameObject environment = new GameObject("Environment");
        
        // Create floor
        GameObject floor = new GameObject("Floor");
        floor.transform.parent = environment.transform;
        
        // Create a single large floor
        if (floorPrefab != null)
        {
            Vector3 floorSize = new Vector3(gridWidth * gridSize, 1f, gridHeight * gridSize);
            Vector3 floorPosition = new Vector3(gridWidth * gridSize / 2f - gridSize / 2f, 0f, gridHeight * gridSize / 2f - gridSize / 2f);
            
            GameObject floorObj = Instantiate(floorPrefab, floorPosition, Quaternion.identity, floor.transform);
            floorObj.transform.localScale = floorSize;
        }
        
        // Create walls and objects
        GameObject walls = new GameObject("Walls");
        walls.transform.parent = environment.transform;
        
        GameObject objects = new GameObject("Objects");
        objects.transform.parent = environment.transform;
        
        // Place objects based on grid
        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                Vector3 position = new Vector3(x * gridSize, 0f, y * gridSize);
                char cellType = levelGrid[x, y];
                
                switch (cellType)
                {
                    case 'W': // Wall
                        if (wallPrefab != null)
                        {
                            GameObject wallObj = Instantiate(wallPrefab, position + new Vector3(0, wallHeight / 2f, 0), Quaternion.identity, walls.transform);
                            wallObj.transform.localScale = new Vector3(gridSize, wallHeight, gridSize);
                        }
                        break;
                    
                    case 'P': // Pillar
                        if (pillarPrefab != null)
                        {
                            GameObject pillarObj = Instantiate(pillarPrefab, position + new Vector3(0, wallHeight / 2f, 0), Quaternion.identity, objects.transform);
                        }
                        break;
                    
                    case 'T': // Torch
                        if (torchPrefab != null)
                        {
                            GameObject torchObj = Instantiate(torchPrefab, position + new Vector3(0, wallHeight / 2f, 0), Quaternion.identity, objects.transform);
                        }
                        break;
                    
                    case 'R': // Rubble
                        if (rubblePrefab != null)
                        {
                            GameObject rubbleObj = Instantiate(rubblePrefab, position, Quaternion.identity, objects.transform);
                        }
                        break;
                    
                    case 'D': // Door
                        if (doorPrefab != null)
                        {
                            GameObject doorObj = Instantiate(doorPrefab, position, Quaternion.identity, objects.transform);
                            doors.Add(doorObj);
                        }
                        break;
                    
                    case 'K': // Key
                        if (keyPrefab != null)
                        {
                            GameObject keyObj = Instantiate(keyPrefab, position + new Vector3(0, 1f, 0), Quaternion.identity, objects.transform);
                        }
                        break;
                    
                    case 'L': // Lever
                        if (secretLeverPrefab != null)
                        {
                            GameObject leverObj = Instantiate(secretLeverPrefab, position + new Vector3(0, 1f, 0), Quaternion.identity, objects.transform);
                            levers.Add(leverObj);
                        }
                        break;
                    
                    case 'C': // Chest
                        if (treasureChestPrefab != null)
                        {
                            GameObject chestObj = Instantiate(treasureChestPrefab, position, Quaternion.identity, objects.transform);
                        }
                        break;
                    
                    case 'S': // Skeleton
                        // Enemy spawns are handled by Level1Setup
                        // We just mark spawn locations here
                        break;
                    
                    case 'H': // Hound
                        // Enemy spawns are handled by Level1Setup
                        // We just mark spawn locations here
                        break;
                    
                    case 'E': // Exit
                        if (exitGatePrefab != null)
                        {
                            GameObject exitObj = Instantiate(exitGatePrefab, position, Quaternion.identity, objects.transform);
                        }
                        break;
                    
                    case 'O': // Lore scroll/book
                        if (lorePrefab != null)
                        {
                            GameObject loreObj = Instantiate(lorePrefab, position + new Vector3(0, 1f, 0), Quaternion.identity, objects.transform);
                        }
                        break;
                    
                    case 'X': // Player spawn (handled by Level1Setup)
                        // Just mark the location, actual spawn is set in Level1Setup
                        break;
                    
                    default:
                        // Empty space or unknown character
                        break;
                }
            }
        }
    }
    
    /// <summary>
    /// Sets up gameplay elements and connections between objects
    /// </summary>
    private void SetupGameplayElements()
    {
        // Connect levers to doors (if any)
        ConnectLeversAndDoors();
        
        // Set up traps
        SetupTraps();
        
        // Set up environmental triggers
        SetupEnvironmentalTriggers();
    }
    
    /// <summary>
    /// Connects levers to doors for puzzle elements
    /// </summary>
    private void ConnectLeversAndDoors()
    {
        if (levers.Count == 0 || doors.Count == 0)
            return;
        
        // For a simple level, connect first lever to first door, second lever to second door, etc.
        for (int i = 0; i < Mathf.Min(levers.Count, doors.Count); i++)
        {
            GameObject lever = levers[i];
            GameObject door = doors[i];
            
            InteractableLever leverComponent = lever.GetComponent<InteractableLever>();
            InteractableDoor doorComponent = door.GetComponent<InteractableDoor>();
            
            if (leverComponent != null && doorComponent != null)
            {
                // Add a listener to the lever's event
                UnityEngine.Events.UnityAction toggleAction = () => doorComponent.ToggleDoor();
                
                // Get the UnityEvent from the lever
                System.Reflection.FieldInfo fieldInfo = typeof(InteractableLever).GetField("onLeverToggle", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                UnityEngine.Events.UnityEvent leverEvent = fieldInfo.GetValue(leverComponent) as UnityEngine.Events.UnityEvent;
                
                // Add the door toggle action to the lever event
                if (leverEvent != null)
                {
                    leverEvent.AddListener(toggleAction);
                }
            }
        }
    }
    
    /// <summary>
    /// Sets up traps in the level
    /// </summary>
    private void SetupTraps()
    {
        // This would set up spike traps, falling blocks, etc.
        // For now, we'll leave it as a placeholder
    }
    
    /// <summary>
    /// Sets up environmental triggers like falling pillars, cave-ins, etc.
    /// </summary>
    private void SetupEnvironmentalTriggers()
    {
        // This would set up triggered events like collapsing ceilings, falling pillars, etc.
        // For now, we'll leave it as a placeholder
    }
    
    /// <summary>
    /// Returns the spawn positions for enemy types
    /// </summary>
    public List<Vector3> GetEnemySpawnPositions(EnemyType enemyType)
    {
        List<Vector3> positions = new List<Vector3>();
        
        char typeChar = ' ';
        switch (enemyType)
        {
            case EnemyType.SkeletonWarrior:
                typeChar = 'S';
                break;
            case EnemyType.CursedHound:
                typeChar = 'H';
                break;
            default:
                return positions;
        }
        
        // Find all positions for this enemy type
        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                if (levelGrid[x, y] == typeChar)
                {
                    positions.Add(new Vector3(x * gridSize, 0f, y * gridSize));
                }
            }
        }
        
        return positions;
    }
    
    /// <summary>
    /// Returns the player spawn position
    /// </summary>
    public Vector3 GetPlayerSpawnPosition()
    {
        for (int x = 0; x < gridWidth; x++)
        {
            for (int y = 0; y < gridHeight; y++)
            {
                if (levelGrid[x, y] == 'X')
                {
                    return new Vector3(x * gridSize, 0f, y * gridSize);
                }
            }
        }
        
        // Default to position (2,2) if no spawn marked
        return new Vector3(2 * gridSize, 0f, 2 * gridSize);
    }
}
