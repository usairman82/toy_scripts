using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Handles weapon pickups in the game world
/// </summary>
public class WeaponPickup : InteractableBase
{
    [Header("Weapon Settings")]
    [SerializeField] private WeaponData weaponData;
    [SerializeField] private bool rotateDisplay = true;
    [SerializeField] private float rotationSpeed = 30f;
    [SerializeField] private float hoverHeight = 0.2f;
    [SerializeField] private float hoverSpeed = 1f;
    
    [Header("Pickup Effects")]
    [SerializeField] private string pickupEffectName = "WeaponPickup";
    [SerializeField] private AudioClip pickupSound;
    [SerializeField] private GameObject pickupVFXPrefab;
    
    // Private variables
    private Transform weaponDisplayTransform;
    private Vector3 initialPosition;
    private float hoverOffset = 0f;
    
    protected override void Start()
    {
        base.Start();
        
        // Set up weapon display
        initialPosition = transform.position;
        
        // Find weapon mesh for display
        weaponDisplayTransform = transform.GetChild(0);
        if (weaponDisplayTransform == null)
        {
            weaponDisplayTransform = transform;
        }
        
        // Update interaction prompt
        if (weaponData != null)
        {
            interactionPrompt = $"Press E to pick up {weaponData.weaponName}";
        }
        else
        {
            interactionPrompt = "Press E to pick up weapon";
        }
    }
    
    private void Update()
    {
        // Rotate display
        if (rotateDisplay && weaponDisplayTransform != null)
        {
            weaponDisplayTransform.Rotate(Vector3.up * rotationSpeed * Time.deltaTime);
        }
        
        // Hover effect
        if (hoverHeight > 0)
        {
            hoverOffset = Mathf.Sin(Time.time * hoverSpeed) * hoverHeight;
            transform.position = initialPosition + Vector3.up * hoverOffset;
        }
    }
    
    public override void Interact(GameObject interactor)
    {
        // Check if interactor has weapon controller
        WeaponController weaponController = interactor.GetComponent<WeaponController>();
        if (weaponController != null && weaponData != null)
        {
            // Create weapon item
            WeaponItem weaponItem = CreateWeaponItemFromData();
            
            // Add to inventory
            InventorySystem inventory = interactor.GetComponent<InventorySystem>();
            if (inventory != null)
            {
                // Try to add to inventory
                bool added = inventory.AddItem(weaponItem);
                
                if (added)
                {
                    OnWeaponPickedUp(interactor);
                }
                else
                {
                    // Inventory full, equip directly
                    weaponController.EquipWeapon(weaponItem);
                    OnWeaponPickedUp(interactor);
                }
            }
            else
            {
                // No inventory, equip directly
                weaponController.EquipWeapon(weaponItem);
                OnWeaponPickedUp(interactor);
            }
        }
    }
    
    /// <summary>
    /// Creates a WeaponItem from the weapon data
    /// </summary>
    private WeaponItem CreateWeaponItemFromData()
    {
        WeaponItem weaponItem = new WeaponItem
        {
            ItemName = weaponData.weaponName,
            ItemDescription = weaponData.description,
            ItemIcon = weaponData.icon,
            Type = ItemType.Weapon,
            WeaponCategory = DetermineWeaponType(),
            Damage = weaponData.damage,
            FireRate = weaponData.fireRate,
            AmmoCapacity = weaponData.ammoCapacity,
            CurrentAmmo = weaponData.ammoCapacity,
            Range = weaponData.range,
            SpecialAbility = weaponData.specialAbility
        };
        
        return weaponItem;
    }
    
    /// <summary>
    /// Determines the weapon type from the weapon data
    /// </summary>
    private WeaponType DetermineWeaponType()
    {
        if (weaponData.isMelee)
        {
            return WeaponType.Melee;
        }
        else if (weaponData.weaponName.ToLower().Contains("pistol"))
        {
            return WeaponType.Pistol;
        }
        else if (weaponData.weaponName.ToLower().Contains("shotgun"))
        {
            return WeaponType.Shotgun;
        }
        else if (weaponData.weaponName.ToLower().Contains("machine"))
        {
            return WeaponType.MachineGun;
        }
        else if (weaponData.weaponName.ToLower().Contains("staff"))
        {
            return WeaponType.MagicStaff;
        }
        
        // Default to pistol if no match
        return WeaponType.Pistol;
    }
    
    /// <summary>
    /// Handles weapon pickup effects and destruction
    /// </summary>
    private void OnWeaponPickedUp(GameObject interactor)
    {
        // Play pickup sound
        if (pickupSound != null)
        {
            AudioSource.PlayClipAtPoint(pickupSound, transform.position);
        }
        
        // Play pickup VFX
        if (pickupVFXPrefab != null)
        {
            Instantiate(pickupVFXPrefab, transform.position, Quaternion.identity);
        }
        
        // Use special effects manager if available
        SpecialEffectsManager effectsManager = SpecialEffectsManager.Instance;
        if (effectsManager != null)
        {
            effectsManager.PlayEffect(pickupEffectName, transform.position, Quaternion.identity);
        }
        
        // Show pickup message
        UIManager uiManager = FindObjectOfType<UIManager>();
        if (uiManager != null && weaponData != null)
        {
            uiManager.ShowNotification($"Picked up {weaponData.weaponName}");
        }
        
        // Destroy the pickup
        Destroy(gameObject);
    }
    
    /// <summary>
    /// Set the weapon data for this pickup (useful for runtime spawning)
    /// </summary>
    public void SetWeaponData(WeaponData data)
    {
        weaponData = data;
        
        // Update interaction prompt
        if (weaponData != null)
        {
            interactionPrompt = $"Press E to pick up {weaponData.weaponName}";
        }
        
        // Update visual model
        if (weaponData != null && weaponData.weaponPrefab != null)
        {
            // Remove existing children
            foreach (Transform child in transform)
            {
                Destroy(child.gameObject);
            }
            
            // Instantiate weapon model
            GameObject weaponModel = Instantiate(weaponData.weaponPrefab, transform);
            
            // Configure model for display
            weaponModel.transform.localPosition = Vector3.zero;
            weaponModel.transform.localRotation = Quaternion.identity;
            
            // Adjust scale if needed
            weaponModel.transform.localScale = Vector3.one;
            
            // Remove any non-visual components
            Collider[] colliders = weaponModel.GetComponentsInChildren<Collider>();
            foreach (Collider collider in colliders)
            {
                Destroy(collider);
            }
            
            Rigidbody[] rigidbodies = weaponModel.GetComponentsInChildren<Rigidbody>();
            foreach (Rigidbody rigidbody in rigidbodies)
            {
                Destroy(rigidbody);
            }
            
            // Update display transform reference
            weaponDisplayTransform = weaponModel.transform;
        }
    }
}

/// <summary>
/// Factory class for creating weapon pickups
/// </summary>
public static class WeaponPickupFactory
{
    /// <summary>
    /// Creates a weapon pickup at the specified position
    /// </summary>
    public static GameObject CreateWeaponPickup(WeaponData weaponData, Vector3 position, Quaternion rotation)
    {
        // Create base GameObject
        GameObject pickupObj = new GameObject($"{weaponData.weaponName}Pickup");
        pickupObj.transform.position = position;
        pickupObj.transform.rotation = rotation;
        
        // Add collider
        SphereCollider collider = pickupObj.AddComponent<SphereCollider>();
        collider.isTrigger = true;
        collider.radius = 0.5f;
        
        // Add rigidbody for triggers
        Rigidbody rb = pickupObj.AddComponent<Rigidbody>();
        rb.isKinematic = true;
        
        // Add weapon pickup component
        WeaponPickup pickup = pickupObj.AddComponent<WeaponPickup>();
        pickup.SetWeaponData(weaponData);
        
        // Add light component for visual effect
        Light light = pickupObj.AddComponent<Light>();
        light.color = Color.yellow;
        light.intensity = 1.5f;
        light.range = 3f;
        
        return pickupObj;
    }
    
    /// <summary>
    /// Creates all weapon pickups for testing
    /// </summary>
    public static void CreateAllWeaponPickupsForTesting(Vector3 startPosition, float spacing = 2f)
    {
        // Create all weapon types
        WeaponData dagger = WeaponFactory.CreateDagger();
        WeaponData sword = WeaponFactory.CreateSword();
        WeaponData pistol = WeaponFactory.CreatePistol();
        WeaponData shotgun = WeaponFactory.CreateShotgun();
        WeaponData machineGun = WeaponFactory.CreateMachineGun();
        WeaponData staff = WeaponFactory.CreateAncientStaff();
        
        // Create pickups
        CreateWeaponPickup(dagger, startPosition, Quaternion.identity);
        CreateWeaponPickup(sword, startPosition + new Vector3(spacing, 0, 0), Quaternion.identity);
        CreateWeaponPickup(pistol, startPosition + new Vector3(spacing * 2, 0, 0), Quaternion.identity);
        CreateWeaponPickup(shotgun, startPosition + new Vector3(spacing * 3, 0, 0), Quaternion.identity);
        CreateWeaponPickup(machineGun, startPosition + new Vector3(spacing * 4, 0, 0), Quaternion.identity);
        CreateWeaponPickup(staff, startPosition + new Vector3(spacing * 5, 0, 0), Quaternion.identity);
    }
}