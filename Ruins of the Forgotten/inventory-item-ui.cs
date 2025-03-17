using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System;

/// <summary>
/// UI representation of an inventory item
/// </summary>
public class InventoryItemUI : MonoBehaviour
{
    [SerializeField] private Image itemIcon;
    [SerializeField] private TextMeshProUGUI itemNameText;
    [SerializeField] private TextMeshProUGUI itemTypeText;
    [SerializeField] private TextMeshProUGUI ammoText;
    [SerializeField] private Button useButton;
    [SerializeField] private Button dropButton;
    [SerializeField] private GameObject selectionHighlight;
    [SerializeField] private Image backgroundImage;
    [SerializeField] private Color normalColor = Color.white;
    [SerializeField] private Color questItemColor = new Color(1f, 0.8f, 0.2f);
    
    // Event for when this item is selected
    public event Action<InventoryItem> OnItemSelected;
    
    // Reference to the inventory item this UI represents
    private InventoryItem item;
    
    private void Start()
    {
        // Set up button listeners
        if (useButton != null)
        {
            useButton.onClick.AddListener(OnUseButtonClicked);
        }
        
        if (dropButton != null)
        {
            dropButton.onClick.AddListener(OnDropButtonClicked);
        }
        
        // Set selection to off initially
        if (selectionHighlight != null)
        {
            selectionHighlight.SetActive(false);
        }
    }
    
    /// <summary>
    /// Sets the item this UI element represents
    /// </summary>
    public void SetItem(InventoryItem newItem)
    {
        item = newItem;
        
        if (item != null)
        {
            // Set item icon
            if (itemIcon != null && item.ItemIcon != null)
            {
                itemIcon.sprite = item.ItemIcon;
                itemIcon.gameObject.SetActive(true);
            }
            else if (itemIcon != null)
            {
                itemIcon.gameObject.SetActive(false);
            }
            
            // Set item name
            if (itemNameText != null)
            {
                itemNameText.text = item.ItemName;
            }
            
            // Set item type text
            if (itemTypeText != null)
            {
                itemTypeText.text = item.Type.ToString();
            }
            
            // Set ammo text if weapon
            if (ammoText != null)
            {
                WeaponItem weaponItem = item as WeaponItem;
                if (weaponItem != null && weaponItem.WeaponCategory != WeaponType.Melee)
                {
                    ammoText.text = $"{weaponItem.CurrentAmmo}/{weaponItem.AmmoCapacity}";
                    ammoText.gameObject.SetActive(true);
                }
                else
                {
                    ammoText.gameObject.SetActive(false);
                }
            }
            
            // Set background color based on item type
            if (backgroundImage != null)
            {
                backgroundImage.color = item.IsQuestItem ? questItemColor : normalColor;
            }
            
            // Configure buttons based on item type
            if (useButton != null)
            {
                switch (item.Type)
                {
                    case ItemType.Weapon:
                        useButton.gameObject.SetActive(true);
                        useButton.GetComponentInChildren<TextMeshProUGUI>().text = "Equip";
                        break;
                        
                    case ItemType.HealthItem:
                        useButton.gameObject.SetActive(true);
                        useButton.GetComponentInChildren<TextMeshProUGUI>().text = "Use";
                        break;
                        
                    case ItemType.Scroll:
                        useButton.gameObject.SetActive(true);
                        useButton.GetComponentInChildren<TextMeshProUGUI>().text = "Read";
                        break;
                        
                    case ItemType.KeyItem:
                    case ItemType.QuestItem:
                        useButton.gameObject.SetActive(false);
                        break;
                        
                    default:
                        useButton.gameObject.SetActive(true);
                        useButton.GetComponentInChildren<TextMeshProUGUI>().text = "Use";
                        break;
                }
            }
            
            // Configure drop button
            if (dropButton != null)
            {
                // Quest items and key items cannot be dropped
                dropButton.gameObject.SetActive(!item.IsQuestItem && item.Type != ItemType.KeyItem);
            }
        }
    }
    
    /// <summary>
    /// Updates the item data (e.g., for ammo changes)
    /// </summary>
    public void UpdateItem(InventoryItem updatedItem)
    {
        if (updatedItem != null && item != null && updatedItem.ItemName == item.ItemName)
        {
            item = updatedItem;
            
            // Update ammo text if weapon
            if (ammoText != null)
            {
                WeaponItem weaponItem = item as WeaponItem;
                if (weaponItem != null && weaponItem.WeaponCategory != WeaponType.Melee)
                {
                    ammoText.text = $"{weaponItem.CurrentAmmo}/{weaponItem.AmmoCapacity}";
                }
            }
        }
    }
    
    /// <summary>
    /// Called when this item is clicked
    /// </summary>
    public void OnClick()
    {
        if (item != null)
        {
            // Invoke selected event
            OnItemSelected?.Invoke(item);
            
            // Show selection highlight
            if (selectionHighlight != null)
            {
                selectionHighlight.SetActive(true);
            }
        }
    }
    
    /// <summary>
    /// Called when this item is deselected
    /// </summary>
    public void Deselect()
    {
        if (selectionHighlight != null)
        {
            selectionHighlight.SetActive(false);
        }
    }
    
    /// <summary>
    /// Called when the use button is clicked
    /// </summary>
    private void OnUseButtonClicked()
    {
        if (item == null)
            return;
            
        // Find UI manager
        UIManager uiManager = FindObjectOfType<UIManager>();
        if (uiManager != null)
        {
            uiManager.UseInventoryItem(item);
        }
    }
    
    /// <summary>
    /// Called when the drop button is clicked
    /// </summary>
    private void OnDropButtonClicked()
    {
        if (item == null)
            return;
            
        // Find inventory system
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null)
        {
            InventorySystem inventorySystem = player.GetComponent<InventorySystem>();
            if (inventorySystem != null)
            {
                // Remove from inventory
                inventorySystem.RemoveItem(item.ItemName);
                
                // Spawn dropped item in world
                SpawnDroppedItem();
            }
        }
    }
    
    /// <summary>
    /// Spawns the dropped item in the world
    /// </summary>
    private void SpawnDroppedItem()
    {
        // Find player for position
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null)
            return;
            
        // Calculate drop position (in front of player)
        Vector3 dropPosition = player.transform.position + player.transform.forward * 1.5f;
        
        // Spawn appropriate pickup based on item type
        if (item.Type == ItemType.Weapon)
        {
            WeaponItem weaponItem = item as WeaponItem;
            if (weaponItem != null)
            {
                // Find weapon data
                WeaponData weaponData = null;
                
                // Search Resources for weapon data
                WeaponData[] allWeapons = Resources.LoadAll<WeaponData>("ScriptableObjects/Weapons");
                foreach (WeaponData weapon in allWeapons)
                {
                    if (weapon.weaponName == weaponItem.ItemName)
                    {
                        weaponData = weapon;
                        break;
                    }
                }
                
                // If not found, create one using the factory
                if (weaponData == null)
                {
                    switch (weaponItem.ItemName)
                    {
                        case "Dagger":
                            weaponData = WeaponFactory.CreateDagger();
                            break;
                        case "Sword":
                            weaponData = WeaponFactory.CreateSword();
                            break;
                        case "Pistol":
                            weaponData = WeaponFactory.CreatePistol();
                            break;
                        case "Shotgun":
                            weaponData = WeaponFactory.CreateShotgun();
                            break;
                        case "Machine Gun":
                            weaponData = WeaponFactory.CreateMachineGun();
                            break;
                        case "Ancient Staff":
                            weaponData = WeaponFactory.CreateAncientStaff();
                            break;
                    }
                }
                
                // Create weapon pickup
                if (weaponData != null)
                {
                    GameObject pickup = WeaponPickupFactory.CreateWeaponPickup(weaponData, dropPosition, Quaternion.identity);
                    
                    // Set current ammo in the pickup
                    WeaponPickup pickupComponent = pickup.GetComponent<WeaponPickup>();
                    if (pickupComponent != null)
                    {
                        pickupComponent.SetCurrentAmmo(weaponItem.CurrentAmmo);
                    }
                }
            }
        }
        else
        {
            // Generic pickup for other item types
            // Note: In a full implementation, you'd have specific pickup logic for each item type
            Debug.Log($"Dropped item {item.ItemName} at {dropPosition}");
        }
    }
    
    /// <summary>
    /// Gets the use button
    /// </summary>
    public Button GetUseButton()
    {
        return useButton;
    }
    
    /// <summary>
    /// Gets the drop button
    /// </summary>
    public Button GetDropButton()
    {
        return dropButton;
    }
}