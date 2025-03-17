using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Handles player interactions with objects in the game world
/// </summary>
public class InteractionSystem : MonoBehaviour
{
    [Header("Interaction Settings")]
    [SerializeField] private float interactionDistance = 3f;
    [SerializeField] private LayerMask interactableLayers;
    [SerializeField] private KeyCode interactKey = KeyCode.E;
    
    [Header("UI References")]
    [SerializeField] private GameObject interactionPrompt;
    [SerializeField] private TextMeshProUGUI promptText;
    
    // Private variables
    private Camera playerCamera;
    private IInteractable currentInteractable;
    
    private void Start()
    {
        playerCamera = Camera.main;
        
        if (interactionPrompt != null)
        {
            interactionPrompt.SetActive(false);
        }
    }
    
    private void Update()
    {
        CheckForInteractables();
        HandleInteractionInput();
    }
    
    private void CheckForInteractables()
    {
        // Reset current interactable
        if (currentInteractable != null)
        {
            currentInteractable.OnHoverExit();
            currentInteractable = null;
            
            if (interactionPrompt != null)
            {
                interactionPrompt.SetActive(false);
            }
        }
        
        // Cast ray from camera center
        Ray ray = playerCamera.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0f));
        RaycastHit hit;
        
        // Check if ray hits an interactable object
        if (Physics.Raycast(ray, out hit, interactionDistance, interactableLayers))
        {
            // Check if object has interactable component
            IInteractable interactable = hit.collider.GetComponent<IInteractable>();
            
            if (interactable != null)
            {
                currentInteractable = interactable;
                currentInteractable.OnHoverEnter();
                
                // Show interaction prompt
                if (interactionPrompt != null && promptText != null)
                {
                    promptText.text = interactable.GetInteractionPrompt();
                    interactionPrompt.SetActive(true);
                }
            }
        }
    }
    
    private void HandleInteractionInput()
    {
        if (currentInteractable != null && Input.GetKeyDown(interactKey))
        {
            currentInteractable.Interact(this.gameObject);
        }
    }
}

/// <summary>
/// Interface for all interactable objects
/// </summary>
public interface IInteractable
{
    string GetInteractionPrompt();
    void OnHoverEnter();
    void OnHoverExit();
    void Interact(GameObject interactor);
}

/// <summary>
/// Base class for interactable objects that can be inherited from
/// </summary>
public abstract class InteractableBase : MonoBehaviour, IInteractable
{
    [SerializeField] protected string interactionPrompt = "Press E to interact";
    [SerializeField] protected Material highlightMaterial;
    [SerializeField] protected Renderer objectRenderer;
    
    protected Material originalMaterial;
    protected bool isHighlighted = false;
    
    protected virtual void Start()
    {
        if (objectRenderer == null)
        {
            objectRenderer = GetComponent<Renderer>();
        }
        
        if (objectRenderer != null)
        {
            originalMaterial = objectRenderer.material;
        }
    }
    
    public virtual string GetInteractionPrompt()
    {
        return interactionPrompt;
    }
    
    public virtual void OnHoverEnter()
    {
        if (objectRenderer != null && highlightMaterial != null && !isHighlighted)
        {
            objectRenderer.material = highlightMaterial;
            isHighlighted = true;
        }
    }
    
    public virtual void OnHoverExit()
    {
        if (objectRenderer != null && isHighlighted)
        {
            objectRenderer.material = originalMaterial;
            isHighlighted = false;
        }
    }
    
    public abstract void Interact(GameObject interactor);
}

/// <summary>
/// Example class for a door that can be opened
/// </summary>
public class InteractableDoor : InteractableBase
{
    [SerializeField] private bool isLocked = false;
    [SerializeField] private string requiredKeyName;
    [SerializeField] private AudioClip openSound;
    [SerializeField] private AudioClip lockedSound;
    [SerializeField] private float openAngle = 90f;
    [SerializeField] private float openSpeed = 2f;
    
    private bool isOpen = false;
    private AudioSource audioSource;
    private Quaternion initialRotation;
    private Quaternion targetRotation;
    
    protected override void Start()
    {
        base.Start();
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
        
        initialRotation = transform.rotation;
        targetRotation = initialRotation;
    }
    
    private void Update()
    {
        // Smooth door opening animation
        if (transform.rotation != targetRotation)
        {
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, Time.deltaTime * openSpeed);
        }
    }
    
    public override void Interact(GameObject interactor)
    {
        if (isLocked)
        {
            // Check if player has the required key
            InventorySystem inventory = interactor.GetComponent<InventorySystem>();
            if (inventory != null && inventory.HasItem(requiredKeyName))
            {
                isLocked = false;
                interactionPrompt = "Press E to open";
                
                // Play unlock sound
                if (audioSource != null && openSound != null)
                {
                    audioSource.clip = openSound;
                    audioSource.Play();
                }
                
                // Open the door
                ToggleDoor();
            }
            else
            {
                // Play locked sound
                if (audioSource != null && lockedSound != null)
                {
                    audioSource.clip = lockedSound;
                    audioSource.Play();
                }
            }
        }
        else
        {
            ToggleDoor();
        }
    }
    
    private void ToggleDoor()
    {
        isOpen = !isOpen;
        
        if (isOpen)
        {
            targetRotation = initialRotation * Quaternion.Euler(0, openAngle, 0);
            interactionPrompt = "Press E to close";
        }
        else
        {
            targetRotation = initialRotation;
            interactionPrompt = "Press E to open";
        }
        
        // Play door sound
        if (audioSource != null && openSound != null)
        {
            audioSource.clip = openSound;
            audioSource.Play();
        }
    }
}

/// <summary>
/// Example class for a pickup item
/// </summary>
public class InteractableItem : InteractableBase
{
    [SerializeField] private string itemName;
    [SerializeField] private string itemDescription;
    [SerializeField] private Sprite itemIcon;
    [SerializeField] private bool isQuestItem = false;
    [SerializeField] private AudioClip pickupSound;
    
    public override void Interact(GameObject interactor)
    {
        // Add to inventory
        InventorySystem inventory = interactor.GetComponent<InventorySystem>();
        if (inventory != null)
        {
            InventoryItem item = new InventoryItem
            {
                ItemName = itemName,
                ItemDescription = itemDescription,
                ItemIcon = itemIcon,
                IsQuestItem = isQuestItem
            };
            
            bool added = inventory.AddItem(item);
            
            if (added)
            {
                // Play pickup sound
                if (pickupSound != null)
                {
                    AudioSource.PlayClipAtPoint(pickupSound, transform.position);
                }
                
                // Destroy the item object
                Destroy(gameObject);
            }
        }
    }
}

/// <summary>
/// Example class for readable lore objects
/// </summary>
public class InteractableLore : InteractableBase
{
    [SerializeField] private string loreTitle;
    [SerializeField] private string loreText;
    [SerializeField] private AudioClip openSound;
    
    // Reference to the UI manager to show lore panel
    private UIManager uiManager;
    
    protected override void Start()
    {
        base.Start();
        uiManager = FindObjectOfType<UIManager>();
    }
    
    public override void Interact(GameObject interactor)
    {
        // Play sound
        if (openSound != null)
        {
            AudioSource.PlayClipAtPoint(openSound, transform.position);
        }
        
        // Show lore text in UI
        if (uiManager != null)
        {
            uiManager.ShowLorePanel(loreTitle, loreText);
        }
    }
}
