using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

/// <summary>
/// Collection of classes for level interactive elements
/// </summary>

/// <summary>
/// Trigger zone for level completion
/// </summary>
public class LevelExitZone : MonoBehaviour
{
    [SerializeField] private bool requireKey = true;
    [SerializeField] private AudioClip exitSound;
    
    private LevelManager levelManager;
    
    private void Start()
    {
        levelManager = FindObjectOfType<LevelManager>();
    }
    
    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            // Play sound
            if (exitSound != null)
            {
                AudioSource.PlayClipAtPoint(exitSound, transform.position);
            }
            
            // Notify level manager
            if (levelManager != null)
            {
                levelManager.OnPlayerReachedExit();
            }
        }
    }
}

/// <summary>
/// Checkpoint for player respawn
/// </summary>
public class Checkpoint : MonoBehaviour
{
    [SerializeField] private bool isInitialSpawn = false;
    [SerializeField] private AudioClip checkpointSound;
    [SerializeField] private GameObject activationEffect;
    [SerializeField] private float effectDuration = 2f;
    
    private bool isActivated = false;
    private GameManager gameManager;
    
    private void Start()
    {
        gameManager = FindObjectOfType<GameManager>();
        
        // Automatically set if this is the initial spawn
        if (isInitialSpawn && gameManager != null)
        {
            gameManager.SetCheckpoint(transform);
        }
    }
    
    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player") && !isActivated)
        {
            ActivateCheckpoint();
        }
    }
    
    /// <summary>
    /// Activates the checkpoint
    /// </summary>
    private void ActivateCheckpoint()
    {
        isActivated = true;
        
        // Set checkpoint in game manager
        if (gameManager != null)
        {
            gameManager.SetCheckpoint(transform);
        }
        
        // Play checkpoint sound
        if (checkpointSound != null)
        {
            AudioSource.PlayClipAtPoint(checkpointSound, transform.position);
        }
        
        // Show activation effect
        if (activationEffect != null)
        {
            GameObject effect = Instantiate(activationEffect, transform.position, Quaternion.identity);
            Destroy(effect, effectDuration);
        }
    }
}

/// <summary>
/// Trigger area for objectives
/// </summary>
public class ObjectiveTrigger : MonoBehaviour
{
    [SerializeField] private string objectiveID;
    [SerializeField] private ObjectiveTriggerType triggerType;
    [SerializeField] private bool oneTimeOnly = true;
    [SerializeField] private AudioClip triggerSound;
    
    private bool triggered = false;
    private LevelManager levelManager;
    
    private void Start()
    {
        levelManager = FindObjectOfType<LevelManager>();
    }
    
    private void OnTriggerEnter(Collider other)
    {
        if (triggered && oneTimeOnly)
            return;
            
        if (other.CompareTag("Player"))
        {
            // Play trigger sound
            if (triggerSound != null)
            {
                AudioSource.PlayClipAtPoint(triggerSound, transform.position);
            }
            
            // Process trigger based on type
            ProcessTrigger();
            
            triggered = true;
        }
    }
    
    /// <summary>
    /// Processes the trigger based on its type
    /// </summary>
    private void ProcessTrigger()
    {
        // This would need to be expanded to handle different objective types
        // For now, just debug log
        Debug.Log($"Trigger {objectiveID} activated: {triggerType}");
    }
}

/// <summary>
/// Types of objective triggers
/// </summary>
public enum ObjectiveTriggerType
{
    ReachArea,
    FindItem,
    SolvePuzzle,
    DefeatEnemy
}

/// <summary>
/// Activates or deactivates objects based on triggers
/// </summary>
public class ObjectActivator : MonoBehaviour
{
    [SerializeField] private GameObject[] objectsToActivate;
    [SerializeField] private GameObject[] objectsToDeactivate;
    [SerializeField] private ActivatorTriggerType triggerType = ActivatorTriggerType.OnTriggerEnter;
    [SerializeField] private bool requiresKey = false;
    [SerializeField] private string requiredKeyName;
    [SerializeField] private float activationDelay = 0f;
    [SerializeField] private bool oneTimeOnly = true;
    [SerializeField] private AudioClip activationSound;
    [SerializeField] private UnityEvent onActivated;
    
    private bool activated = false;
    
    private void OnTriggerEnter(Collider other)
    {
        if (triggerType == ActivatorTriggerType.OnTriggerEnter && !activated && other.CompareTag("Player"))
        {
            TryActivate(other.gameObject);
        }
    }
    
    private void OnTriggerStay(Collider other)
    {
        if (triggerType == ActivatorTriggerType.OnTriggerStay && !activated && other.CompareTag("Player"))
        {
            TryActivate(other.gameObject);
        }
    }
    
    /// <summary>
    /// Attempts to activate the objects
    /// </summary>
    private void TryActivate(GameObject player)
    {
        // If already activated and one-time only, return
        if (activated && oneTimeOnly)
            return;
            
        // Check if key is required
        if (requiresKey)
        {
            InventorySystem inventory = player.GetComponent<InventorySystem>();
            if (inventory == null || !inventory.HasItem(requiredKeyName))
            {
                Debug.Log($"Missing required key: {requiredKeyName}");
                return;
            }
        }
        
        // Activate with delay
        if (activationDelay > 0)
        {
            StartCoroutine(ActivateWithDelay());
        }
        else
        {
            ActivateObjects();
        }
    }
    
    /// <summary>
    /// Activates objects after a delay
    /// </summary>
    private IEnumerator ActivateWithDelay()
    {
        yield return new WaitForSeconds(activationDelay);
        ActivateObjects();
    }
    
    /// <summary>
    /// Activates the specified objects
    /// </summary>
    private void ActivateObjects()
    {
        // Activate objects
        foreach (GameObject obj in objectsToActivate)
        {
            if (obj != null)
            {
                obj.SetActive(true);
            }
        }
        
        // Deactivate objects
        foreach (GameObject obj in objectsToDeactivate)
        {
            if (obj != null)
            {
                obj.SetActive(false);
            }
        }
        
        // Play activation sound
        if (activationSound != null)
        {
            AudioSource.PlayClipAtPoint(activationSound, transform.position);
        }
        
        // Invoke events
        onActivated?.Invoke();
        
        activated = true;
    }
    
    /// <summary>
    /// Public method to trigger activation (can be called from other scripts or events)
    /// </summary>
    public void Activate()
    {
        if (!activated || !oneTimeOnly)
        {
            ActivateObjects();
        }
    }
}

/// <summary>
/// Types of activator triggers
/// </summary>
public enum ActivatorTriggerType
{
    OnTriggerEnter,
    OnTriggerStay,
    OnInteract,
    OnObjectiveComplete
}

/// <summary>
/// Teleports the player to another location
/// </summary>
public class Teleporter : MonoBehaviour
{
    [SerializeField] private Transform destination;
    [SerializeField] private AudioClip teleportSound;
    [SerializeField] private GameObject teleportEffect;
    [SerializeField] private float effectDuration = 2f;
    [SerializeField] private bool teleportOnTrigger = true;
    [SerializeField] private bool requiresInteraction = false;
    
    private void OnTriggerEnter(Collider other)
    {
        if (teleportOnTrigger && other.CompareTag("Player"))
        {
            TeleportPlayer(other.gameObject);
        }
    }
    
    /// <summary>
    /// Public method to teleport the player (can be called from interaction system)
    /// </summary>
    public void TeleportPlayer(GameObject player)
    {
        if (destination == null || player == null)
            return;
            
        // Show effect at start position
        if (teleportEffect != null)
        {
            GameObject startEffect = Instantiate(teleportEffect, player.transform.position, Quaternion.identity);
            Destroy(startEffect, effectDuration);
        }
        
        // Play teleport sound
        if (teleportSound != null)
        {
            AudioSource.PlayClipAtPoint(teleportSound, player.transform.position);
        }
        
        // Get character controller if present
        CharacterController controller = player.GetComponent<CharacterController>();
        
        // Teleport player
        if (controller != null)
        {
            controller.enabled = false;
            player.transform.position = destination.position;
            player.transform.rotation = destination.rotation;
            controller.enabled = true;
        }
        else
        {
            player.transform.position = destination.position;
            player.transform.rotation = destination.rotation;
        }
        
        // Show effect at destination
        if (teleportEffect != null)
        {
            GameObject endEffect = Instantiate(teleportEffect, player.transform.position, Quaternion.identity);
            Destroy(endEffect, effectDuration);
        }
        
        // Play teleport sound at destination
        if (teleportSound != null)
        {
            AudioSource.PlayClipAtPoint(teleportSound, player.transform.position);
        }
    }
}

/// <summary>
/// Area trigger for objective completion
/// </summary>
public class AreaTrigger : MonoBehaviour
{
    [SerializeField] private string areaID;
    [SerializeField] private string areaName;
    [SerializeField] private AudioClip triggerSound;
    [SerializeField] private bool showNotification = true;
    [SerializeField] private string notificationText = "New area discovered";
    
    private bool triggered = false;
    private UIManager uiManager;
    
    private void Start()
    {
        uiManager = FindObjectOfType<UIManager>();
    }
    
    private void OnTriggerEnter(Collider other)
    {
        if (!triggered && other.CompareTag("Player"))
        {
            triggered = true;
            
            // Play trigger sound
            if (triggerSound != null)
            {
                AudioSource.PlayClipAtPoint(triggerSound, transform.position);
            }
            
            // Show notification
            if (showNotification && uiManager != null)
            {
                uiManager.ShowNotification(areaName + " - " + notificationText);
            }
            
            // Find any reach area objectives and complete them
            ReachAreaObjective[] objectives = FindObjectsOfType<MonoBehaviour>() as ReachAreaObjective[];
            foreach (ReachAreaObjective objective in objectives)
            {
                if (objective != null && objective.ID == areaID)
                {
                    objective.OnAreaReached();
                }
            }
        }
    }
}
