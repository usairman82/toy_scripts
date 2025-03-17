using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;

/// <summary>
/// Manages the player's inventory of items
/// </summary>
public class InventorySystem : MonoBehaviour
{
    [Header("Inventory Settings")]
    [SerializeField] private int maxInventorySize = 20;
    
    // Event for UI updates
    public event Action<List<InventoryItem>> OnInventoryChanged;
    
    // Private variables
    private List<InventoryItem> inventory = new List<InventoryItem>();
    private UIManager uiManager;
    
    private void Start()
    {
        uiManager = FindObjectOfType<UIManager>();
    }
    
    /// <summary>
    /// Adds an item to the inventory
    /// </summary>
    /// <param name="item">The item to add</param>
    /// <returns>True if item was added successfully</returns>
    public bool AddItem(InventoryItem item)
    {
        if (inventory.Count >= maxInventorySize)
        {
            Debug.Log("Inventory full!");
            return false;
        }
        
        inventory.Add(item);
        
        // Trigger inventory update event
        OnInventoryChanged?.Invoke(inventory);
        
        Debug.Log($"Added {item.ItemName} to inventory");
        return true;
    }
    
    /// <summary>
    /// Removes an item from the inventory
    /// </summary>
    /// <param name="itemName">The name of the item to remove</param>
    /// <returns>True if item was removed successfully</returns>
    public bool RemoveItem(string itemName)
    {
        InventoryItem itemToRemove = inventory.Find(item => item.ItemName == itemName);
        
        if (itemToRemove != null)
        {
            inventory.Remove(itemToRemove);
            
            // Trigger inventory update event
            OnInventoryChanged?.Invoke(inventory);
            
            Debug.Log($"Removed {itemName} from inventory");
            return true;
        }
        
        Debug.Log($"Item {itemName} not found in inventory");
        return false;
    }
    
    /// <summary>
    /// Checks if the inventory contains an item by name
    /// </summary>
    /// <param name="itemName">The name of the item to check for</param>
    /// <returns>True if the item is in the inventory</returns>
    public bool HasItem(string itemName)
    {
        return inventory.Exists(item => item.ItemName == itemName);
    }
    
    /// <summary>
    /// Gets an item from the inventory by name
    /// </summary>
    /// <param name="itemName">The name of the item to get</param>
    /// <returns>The inventory item, or null if not found</returns>
    public InventoryItem GetItem(string itemName)
    {
        return inventory.Find(item => item.ItemName == itemName);
    }
    
    /// <summary>
    /// Gets all items in the inventory
    /// </summary>
    /// <returns>A list of all inventory items</returns>
    public List<InventoryItem> GetAllItems()
    {
        return inventory;
    }
    
    /// <summary>
    /// Toggles the inventory UI visibility
    /// </summary>
    public void ToggleInventoryUI()
    {
        if (uiManager != null)
        {
            uiManager.ToggleInventoryPanel(inventory);
        }
    }
}

/// <summary>
/// Represents an item in the inventory
/// </summary>
[System.Serializable]
public class InventoryItem
{
    public string ItemName;
    public string ItemDescription;
    public Sprite ItemIcon;
    public bool IsQuestItem;
    public ItemType Type;
    
    // For weapons
    public int Damage;
    public float FireRate;
    public int AmmoCapacity;
    
    // For health items
    public int HealthRestoreAmount;
}

/// <summary>
/// Enum for different types of inventory items
/// </summary>
public enum ItemType
{
    Weapon,
    AmmoPickup,
    HealthItem,
    KeyItem,
    Collectible,
    QuestItem,
    Scroll
}

/// <summary>
/// Class for key items that can unlock doors or trigger events
/// </summary>
[System.Serializable]
public class KeyItem : InventoryItem
{
    public string UnlockId; // ID of the door or object this key unlocks
    
    public KeyItem()
    {
        Type = ItemType.KeyItem;
    }
}

/// <summary>
/// Class for weapon items
/// </summary>
[System.Serializable]
public class WeaponItem : InventoryItem
{
    public WeaponType WeaponCategory;
    public int CurrentAmmo;
    public float Range;
    public string SpecialAbility;
    
    public WeaponItem()
    {
        Type = ItemType.Weapon;
    }
}

/// <summary>
/// Enum for different types of weapons
/// </summary>
public enum WeaponType
{
    Melee,
    Pistol,
    Shotgun,
    MachineGun,
    MagicStaff
}

/// <summary>
/// Class for health items
/// </summary>
[System.Serializable]
public class HealthItem : InventoryItem
{
    public HealthItemType HealthItemCategory;
    
    public HealthItem()
    {
        Type = ItemType.HealthItem;
    }
}

/// <summary>
/// Enum for different types of health items
/// </summary>
public enum HealthItemType
{
    Bandage,
    Herb,
    Potion
}
