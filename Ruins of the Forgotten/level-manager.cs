using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Manages the current level's specific details and objectives
/// </summary>
public class LevelManager : MonoBehaviour
{
    [Header("Level Information")]
    [SerializeField] private string levelName;
    [SerializeField] private string levelDescription;
    [SerializeField] private Sprite levelIcon;
    
    [Header("Level Objectives")]
    [SerializeField] private LevelObjective[] objectives;
    [SerializeField] private bool requireAllObjectives = true;
    
    [Header("Level Exit")]
    [SerializeField] private GameObject exitDoor;
    [SerializeField] private string requiredKeyName;
    [SerializeField] private GameObject levelCompleteZone;
    
    [Header("Audio")]
    [SerializeField] private AudioClip backgroundMusic;
    [SerializeField] private AudioClip objectiveCompleteSound;
    [SerializeField] private AudioClip keyFoundSound;
    
    // Private variables
    private UIManager uiManager;
    private GameManager gameManager;
    private bool levelComplete = false;
    private HashSet<string> completedObjectives = new HashSet<string>();
    private AudioSource audioSource;
    
    private void Awake()
    {
        // Get components
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
        
        // Find managers
        uiManager = FindObjectOfType<UIManager>();
        gameManager = FindObjectOfType<GameManager>();
    }
    
    private void Start()
    {
        // Play background music
        if (audioSource != null && backgroundMusic != null)
        {
            audioSource.clip = backgroundMusic;
            audioSource.loop = true;
            audioSource.Play();
        }
        
        // Initialize objectives
        InitializeObjectives();
        
        // Initialize level complete zone
        if (levelCompleteZone != null)
        {
            levelCompleteZone.SetActive(false);
        }
    }
    
    /// <summary>
    /// Initializes level objectives
    /// </summary>
    private void InitializeObjectives()
    {
        // Iterate through objectives and set up any initialization
        foreach (LevelObjective objective in objectives)
        {
            objective.Initialize();
            
            // Subscribe to objective complete event
            objective.OnObjectiveCompleted += HandleObjectiveCompleted;
        }
        
        // Update UI with initial objectives
        UpdateObjectiveUI();
    }
    
    /// <summary>
    /// Updates the objective UI display
    /// </summary>
    private void UpdateObjectiveUI()
    {
        if (uiManager == null)
            return;
            
        // Create objective text
        string objectiveText = "Objectives:\n";
        foreach (LevelObjective objective in objectives)
        {
            string status = completedObjectives.Contains(objective.ID) ? "<color=green>✓</color>" : " ";
            objectiveText += $"{status} {objective.DisplayText}\n";
        }
        
        // Always add find key and exit objective
        string keyStatus = HasFoundKey() ? "<color=green>✓</color>" : " ";
        objectiveText += $"{keyStatus} Find the key to exit\n";
        
        // Update UI
        uiManager.UpdateObjective(objectiveText);
    }
    
    /// <summary>
    /// Handles objective completion
    /// </summary>
    private void HandleObjectiveCompleted(string objectiveID)
    {
        // Add to completed objectives
        completedObjectives.Add(objectiveID);
        
        // Play sound
        if (audioSource != null && objectiveCompleteSound != null)
        {
            audioSource.PlayOneShot(objectiveCompleteSound);
        }
        
        // Update UI
        UpdateObjectiveUI();
        
        // Check if all required objectives are complete
        CheckLevelProgress();
    }
    
    /// <summary>
    /// Checks if player has the key in inventory
    /// </summary>
    private bool HasFoundKey()
    {
        // Find player
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null)
            return false;
            
        // Check inventory
        InventorySystem inventory = player.GetComponent<InventorySystem>();
        if (inventory == null)
            return false;
            
        return inventory.HasItem(requiredKeyName);
    }
    
    /// <summary>
    /// Called when key is found - unlocks exit
    /// </summary>
    public void OnKeyFound()
    {
        // Play key found sound
        if (audioSource != null && keyFoundSound != null)
        {
            audioSource.PlayOneShot(keyFoundSound);
        }
        
        // Update UI
        UpdateObjectiveUI();
        
        // Unlock exit door if it exists
        if (exitDoor != null)
        {
            // Change door appearance to show it's unlocked
            InteractableDoor door = exitDoor.GetComponent<InteractableDoor>();
            if (door != null)
            {
                // Custom logic to update door state
                door.Unlock();
            }
        }
        
        // Activate level complete zone
        if (levelCompleteZone != null)
        {
            levelCompleteZone.SetActive(true);
        }
        
        // Check level progress
        CheckLevelProgress();
    }
    
    /// <summary>
    /// Checks if all required objectives are complete
    /// </summary>
    private void CheckLevelProgress()
    {
        // If level already complete, ignore
        if (levelComplete)
            return;
            
        bool objectivesComplete = false;
        
        // Check if required objectives are complete
        if (requireAllObjectives)
        {
            // All objectives must be complete
            objectivesComplete = true;
            foreach (LevelObjective objective in objectives)
            {
                if (!completedObjectives.Contains(objective.ID))
                {
                    objectivesComplete = false;
                    break;
                }
            }
        }
        else
        {
            // At least one objective must be complete
            objectivesComplete = completedObjectives.Count > 0;
        }
        
        // Check if key is found and objectives are complete
        if (HasFoundKey() && objectivesComplete)
        {
            // Level is ready to be completed
            // Player still needs to reach the exit
            Debug.Log("Level ready to complete - reach the exit!");
        }
    }
    
    /// <summary>
    /// Triggered when player reaches the exit
    /// </summary>
    public void OnPlayerReachedExit()
    {
        // Check if player has the key and objectives are complete
        if (!HasFoundKey())
        {
            Debug.Log("You need the key to exit!");
            
            // Show message to player
            if (uiManager != null)
            {
                uiManager.ShowNotification("You need the key to exit!");
            }
            
            return;
        }
        
        bool objectivesComplete = false;
        
        // Check if required objectives are complete
        if (requireAllObjectives)
        {
            // All objectives must be complete
            objectivesComplete = true;
            foreach (LevelObjective objective in objectives)
            {
                if (!completedObjectives.Contains(objective.ID))
                {
                    objectivesComplete = false;
                    break;
                }
            }
        }
        else
        {
            // At least one objective must be complete
            objectivesComplete = completedObjectives.Count > 0;
        }
        
        if (!objectivesComplete)
        {
            Debug.Log("Complete the objectives before exiting!");
            
            // Show message to player
            if (uiManager != null)
            {
                uiManager.ShowNotification("Complete objectives before exiting!");
            }
            
            return;
        }
        
        // Complete level
        CompleteLevel();
    }
    
    /// <summary>
    /// Completes the level
    /// </summary>
    private void CompleteLevel()
    {
        if (levelComplete)
            return;
            
        levelComplete = true;
        
        // Call game manager to handle level completion
        if (gameManager != null)
        {
            gameManager.CompleteLevel();
        }
    }
    
    /// <summary>
    /// Adds a collectible to the player's inventory
    /// </summary>
    public void CollectItem(string itemID, string itemName, string itemDescription, Sprite itemIcon)
    {
        // Find player
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null)
            return;
            
        // Add to inventory
        InventorySystem inventory = player.GetComponent<InventorySystem>();
        if (inventory == null)
            return;
            
        // Create inventory item
        InventoryItem item = new InventoryItem
        {
            ItemName = itemName,
            ItemDescription = itemDescription,
            ItemIcon = itemIcon,
            Type = ItemType.Collectible
        };
        
        // Add to inventory
        inventory.AddItem(item);
        
        // If this is the key, call OnKeyFound
        if (itemName == requiredKeyName)
        {
            OnKeyFound();
        }
    }
    
    private void OnDestroy()
    {
        // Unsubscribe from events
        foreach (LevelObjective objective in objectives)
        {
            objective.OnObjectiveCompleted -= HandleObjectiveCompleted;
        }
    }
}

/// <summary>
/// Base class for level objectives
/// </summary>
[System.Serializable]
public abstract class LevelObjective
{
    [SerializeField] private string objectiveID;
    [SerializeField] private string displayText;
    
    // Event for objective completion
    public delegate void ObjectiveCompletedHandler(string objectiveID);
    public event ObjectiveCompletedHandler OnObjectiveCompleted;
    
    // Properties
    public string ID => objectiveID;
    public string DisplayText => displayText;
    
    // Abstract methods
    public abstract void Initialize();
    public abstract bool IsComplete();
    
    // Called when objective is completed
    protected void CompleteObjective()
    {
        OnObjectiveCompleted?.Invoke(objectiveID);
    }
}

/// <summary>
/// Objective to find a specific item
/// </summary>
[System.Serializable]
public class FindItemObjective : LevelObjective
{
    [SerializeField] private string itemName;
    
    public override void Initialize()
    {
        // No special initialization needed
    }
    
    public override bool IsComplete()
    {
        // Find player
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null)
            return false;
            
        // Check inventory
        InventorySystem inventory = player.GetComponent<InventorySystem>();
        if (inventory == null)
            return false;
            
        return inventory.HasItem(itemName);
    }
    
    // Call this when an item is found
    public void OnItemFound()
    {
        if (IsComplete())
        {
            CompleteObjective();
        }
    }
}

/// <summary>
/// Objective to defeat a specific number of enemies
/// </summary>
[System.Serializable]
public class DefeatEnemiesObjective : LevelObjective
{
    [SerializeField] private EnemyType enemyType;
    [SerializeField] private int requiredCount;
    
    private int currentCount = 0;
    
    public override void Initialize()
    {
        // Register for enemy death events
        // This would need a way to subscribe to enemy death events
    }
    
    public override bool IsComplete()
    {
        return currentCount >= requiredCount;
    }
    
    // Call this when an enemy is defeated
    public void OnEnemyDefeated(EnemyType type)
    {
        if (type == enemyType)
        {
            currentCount++;
            
            if (IsComplete())
            {
                CompleteObjective();
            }
        }
    }
}

/// <summary>
/// Objective to reach a specific area
/// </summary>
[System.Serializable]
public class ReachAreaObjective : LevelObjective
{
    [SerializeField] private string areaName;
    
    private bool reached = false;
    
    public override void Initialize()
    {
        // No special initialization needed
    }
    
    public override bool IsComplete()
    {
        return reached;
    }
    
    // Call this when the area is reached
    public void OnAreaReached()
    {
        reached = true;
        CompleteObjective();
    }
}

/// <summary>
/// Objective to solve a puzzle
/// </summary>
[System.Serializable]
public class SolvePuzzleObjective : LevelObjective
{
    [SerializeField] private string puzzleID;
    
    private bool solved = false;
    
    public override void Initialize()
    {
        // No special initialization needed
    }
    
    public override bool IsComplete()
    {
        return solved;
    }
    
    // Call this when the puzzle is solved
    public void OnPuzzleSolved()
    {
        solved = true;
        CompleteObjective();
    }
}