using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;

/// <summary>
/// Handles player weapons and combat
/// </summary>
public class WeaponController : MonoBehaviour
{
    [Header("Weapon Settings")]
    [SerializeField] private List<WeaponData> availableWeapons = new List<WeaponData>();
    [SerializeField] private Transform weaponHolder;
    [SerializeField] private Camera playerCamera;
    [SerializeField] private LayerMask shootableLayers;
    
    [Header("Weapon Effects")]
    [SerializeField] private GameObject muzzleFlashPrefab;
    [SerializeField] private GameObject bulletImpactPrefab;
    [SerializeField] private GameObject bloodEffectPrefab;
    [SerializeField] private float impactEffectDuration = 2f;
    
    // Events
    public event Action<WeaponItem> OnWeaponChanged;
    public event Action<int, int> OnAmmoChanged;
    
    // Private variables
    private WeaponItem currentWeapon;
    private GameObject currentWeaponModel;
    private float nextFireTime = 0f;
    private bool isReloading = false;
    private Animator weaponAnimator;
    private InventorySystem inventorySystem;
    private AudioSource audioSource;
    
    private void Awake()
    {
        // Get references
        if (playerCamera == null)
        {
            playerCamera = Camera.main;
        }
        
        inventorySystem = GetComponent<InventorySystem>();
        
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
    }
    
    private void Start()
    {
        // Initialize with default weapon if available
        if (availableWeapons.Count > 0)
        {
            WeaponData defaultWeapon = availableWeapons[0];
            WeaponItem weaponItem = CreateWeaponItemFromData(defaultWeapon);
            EquipWeapon(weaponItem);
        }
    }
    
    private void Update()
    {
        if (currentWeapon == null || currentWeaponModel == null)
            return;
            
        // Handle weapon input
        if (Input.GetMouseButton(0) && !isReloading && Time.time >= nextFireTime)
        {
            FireWeapon();
        }
        
        // Handle reloading
        if (Input.GetKeyDown(KeyCode.R) && !isReloading)
        {
            StartCoroutine(ReloadWeapon());
        }
        
        // Handle weapon switching with number keys
        for (int i = 0; i < 9; i++)
        {
            if (Input.GetKeyDown(KeyCode.Alpha1 + i) && i < availableWeapons.Count)
            {
                WeaponData weaponData = availableWeapons[i];
                WeaponItem weaponItem = CreateWeaponItemFromData(weaponData);
                EquipWeapon(weaponItem);
                break;
            }
        }
    }
    
    /// <summary>
    /// Creates a WeaponItem from weapon data
    /// </summary>
    private WeaponItem CreateWeaponItemFromData(WeaponData data)
    {
        WeaponItem weaponItem = new WeaponItem
        {
            ItemName = data.weaponName,
            ItemDescription = data.description,
            ItemIcon = data.icon,
            Type = ItemType.Weapon,
            WeaponCategory = DetermineWeaponType(data),
            Damage = data.damage,
            FireRate = data.fireRate,
            AmmoCapacity = data.ammoCapacity,
            CurrentAmmo = data.ammoCapacity,
            Range = data.range,
            SpecialAbility = data.specialAbility
        };
        
        return weaponItem;
    }
    
    /// <summary>
    /// Determines the weapon type from the weapon data
    /// </summary>
    private WeaponType DetermineWeaponType(WeaponData data)
    {
        if (data.isMelee)
        {
            return WeaponType.Melee;
        }
        else if (data.weaponName.ToLower().Contains("pistol"))
        {
            return WeaponType.Pistol;
        }
        else if (data.weaponName.ToLower().Contains("shotgun"))
        {
            return WeaponType.Shotgun;
        }
        else if (data.weaponName.ToLower().Contains("machine"))
        {
            return WeaponType.MachineGun;
        }
        else if (data.weaponName.ToLower().Contains("staff"))
        {
            return WeaponType.MagicStaff;
        }
        
        // Default to pistol if no match
        return WeaponType.Pistol;
    }
    
    /// <summary>
    /// Equips a weapon
    /// </summary>
    public void EquipWeapon(WeaponItem weapon)
    {
        // Save current weapon
        WeaponItem previousWeapon = currentWeapon;
        
        // Update current weapon
        currentWeapon = weapon;
        
        // Destroy current weapon model if it exists
        if (currentWeaponModel != null)
        {
            Destroy(currentWeaponModel);
        }
        
        // Find weapon data
        WeaponData weaponData = availableWeapons.Find(w => w.weaponName == weapon.ItemName);
        
        if (weaponData != null && weaponData.weaponPrefab != null)
        {
            // Instantiate weapon model
            currentWeaponModel = Instantiate(weaponData.weaponPrefab, weaponHolder);
            
            // Position and scale weapon model
            currentWeaponModel.transform.localPosition = weaponData.positionOffset;
            currentWeaponModel.transform.localRotation = Quaternion.Euler(weaponData.rotationOffset);
            currentWeaponModel.transform.localScale = weaponData.scale;
            
            // Get weapon animator if available
            weaponAnimator = currentWeaponModel.GetComponent<Animator>();
            
            // Trigger events
            OnWeaponChanged?.Invoke(currentWeapon);
            OnAmmoChanged?.Invoke(currentWeapon.CurrentAmmo, currentWeapon.AmmoCapacity);
            
            // Play equip sound
            if (audioSource != null && weaponData.equipSound != null)
            {
                audioSource.PlayOneShot(weaponData.equipSound);
            }
        }
    }
    
    /// <summary>
    /// Fires the current weapon
    /// </summary>
    private void FireWeapon()
    {
        // Check ammo
        if (currentWeapon.WeaponCategory != WeaponType.Melee && currentWeapon.CurrentAmmo <= 0)
        {
            // Play empty sound
            WeaponData weaponData = availableWeapons.Find(w => w.weaponName == currentWeapon.ItemName);
            if (audioSource != null && weaponData != null && weaponData.emptySound != null)
            {
                audioSource.PlayOneShot(weaponData.emptySound);
            }
            
            return;
        }
        
        // Set next fire time based on fire rate
        nextFireTime = Time.time + (1f / currentWeapon.FireRate);
        
        // Get weapon data
        WeaponData weaponData = availableWeapons.Find(w => w.weaponName == currentWeapon.ItemName);
        
        // Play firing animation if available
        if (weaponAnimator != null)
        {
            weaponAnimator.SetTrigger("Fire");
        }
        
        // Play sound
        if (audioSource != null && weaponData != null && weaponData.fireSound != null)
        {
            audioSource.PlayOneShot(weaponData.fireSound);
        }
        
        // Show muzzle flash
        if (muzzleFlashPrefab != null && weaponData != null && !weaponData.isMelee)
        {
            GameObject muzzleFlash = Instantiate(muzzleFlashPrefab, weaponData.muzzlePosition, Quaternion.identity);
            muzzleFlash.transform.parent = currentWeaponModel.transform;
            Destroy(muzzleFlash, 0.1f);
        }
        
        // Process weapon firing based on type
        if (currentWeapon.WeaponCategory == WeaponType.Melee)
        {
            HandleMeleeAttack(weaponData);
        }
        else if (currentWeapon.WeaponCategory == WeaponType.Shotgun)
        {
            HandleShotgunFire(weaponData);
        }
        else
        {
            HandleStandardFire(weaponData);
        }
        
        // Update ammo for non-melee weapons
        if (currentWeapon.WeaponCategory != WeaponType.Melee)
        {
            currentWeapon.CurrentAmmo--;
            OnAmmoChanged?.Invoke(currentWeapon.CurrentAmmo, currentWeapon.AmmoCapacity);
        }
    }
    
    /// <summary>
    /// Handles melee weapon attacks
    /// </summary>
    private void HandleMeleeAttack(WeaponData weaponData)
    {
        // Cast a wider ray or use a sphere cast for melee
        RaycastHit[] hits = Physics.SphereCastAll(playerCamera.transform.position, 
                                               weaponData.meleeRadius, 
                                               playerCamera.transform.forward, 
                                               currentWeapon.Range, 
                                               shootableLayers);
        
        foreach (RaycastHit hit in hits)
        {
            // Check for enemy
            EnemyHealth enemyHealth = hit.collider.GetComponent<EnemyHealth>();
            if (enemyHealth != null)
            {
                enemyHealth.TakeDamage(currentWeapon.Damage);
                
                // Show blood effect
                if (bloodEffectPrefab != null)
                {
                    GameObject bloodEffect = Instantiate(bloodEffectPrefab, hit.point, Quaternion.LookRotation(hit.normal));
                    Destroy(bloodEffect, impactEffectDuration);
                }
            }
            else
            {
                // Show impact effect for non-enemy objects
                if (bulletImpactPrefab != null)
                {
                    GameObject impact = Instantiate(bulletImpactPrefab, hit.point, Quaternion.LookRotation(hit.normal));
                    Destroy(impact, impactEffectDuration);
                }
            }
            
            // Apply force to rigidbodies
            if (hit.rigidbody != null)
            {
                hit.rigidbody.AddForce(-hit.normal * weaponData.impactForce);
            }
        }
    }
    
    /// <summary>
    /// Handles shotgun weapon firing
    /// </summary>
    private void HandleShotgunFire(WeaponData weaponData)
    {
        // For shotguns, fire multiple pellets
        for (int i = 0; i < weaponData.pelletsPerShot; i++)
        {
            // Add random spread
            Vector3 spread = new Vector3(
                UnityEngine.Random.Range(-weaponData.spread, weaponData.spread),
                UnityEngine.Random.Range(-weaponData.spread, weaponData.spread),
                UnityEngine.Random.Range(-weaponData.spread, weaponData.spread)
            );
            
            // Calculate direction with spread
            Vector3 direction = playerCamera.transform.forward + spread;
            
            // Cast ray
            RaycastHit hit;
            if (Physics.Raycast(playerCamera.transform.position, direction, out hit, currentWeapon.Range, shootableLayers))
            {
                ProcessRaycastHit(hit, weaponData);
            }
        }
    }
    
    /// <summary>
    /// Handles standard weapon firing (pistol, rifle, etc.)
    /// </summary>
    private void HandleStandardFire(WeaponData weaponData)
    {
        // Add slight random spread
        Vector3 spread = new Vector3(
            UnityEngine.Random.Range(-weaponData.spread, weaponData.spread),
            UnityEngine.Random.Range(-weaponData.spread, weaponData.spread),
            UnityEngine.Random.Range(-weaponData.spread, weaponData.spread)
        );
        
        // Calculate direction with spread
        Vector3 direction = playerCamera.transform.forward + spread;
        
        // Cast ray
        RaycastHit hit;
        if (Physics.Raycast(playerCamera.transform.position, direction, out hit, currentWeapon.Range, shootableLayers))
        {
            ProcessRaycastHit(hit, weaponData);
        }
    }
    
    /// <summary>
    /// Processes a raycast hit
    /// </summary>
    private void ProcessRaycastHit(RaycastHit hit, WeaponData weaponData)
    {
        // Check for enemy
        EnemyHealth enemyHealth = hit.collider.GetComponent<EnemyHealth>();
        if (enemyHealth != null)
        {
            enemyHealth.TakeDamage(currentWeapon.Damage);
            
            // Show blood effect
            if (bloodEffectPrefab != null)
            {
                GameObject bloodEffect = Instantiate(bloodEffectPrefab, hit.point, Quaternion.LookRotation(hit.normal));
                Destroy(bloodEffect, impactEffectDuration);
            }
        }
        else
        {
            // Show impact effect
            if (bulletImpactPrefab != null)
            {
                GameObject impact = Instantiate(bulletImpactPrefab, hit.point, Quaternion.LookRotation(hit.normal));
                Destroy(impact, impactEffectDuration);
            }
        }
        
        // Apply force to rigidbodies
        if (hit.rigidbody != null)
        {
            hit.rigidbody.AddForce(-hit.normal * weaponData.impactForce);
        }
    }
    
    /// <summary>
    /// Reloads the current weapon
    /// </summary>
    private IEnumerator ReloadWeapon()
    {
        // Skip if melee weapon or already full ammo
        if (currentWeapon.WeaponCategory == WeaponType.Melee || 
            currentWeapon.CurrentAmmo >= currentWeapon.AmmoCapacity)
        {
            yield break;
        }
        
        // Start reloading
        isReloading = true;
        
        // Get weapon data
        WeaponData weaponData = availableWeapons.Find(w => w.weaponName == currentWeapon.ItemName);
        
        // Play reload animation if available
        if (weaponAnimator != null)
        {
            weaponAnimator.SetTrigger("Reload");
        }
        
        // Play reload sound
        if (audioSource != null && weaponData != null && weaponData.reloadSound != null)
        {
            audioSource.PlayOneShot(weaponData.reloadSound);
        }
        
        // Wait for reload time
        yield return new WaitForSeconds(weaponData.reloadTime);
        
        // Refill ammo
        currentWeapon.CurrentAmmo = currentWeapon.AmmoCapacity;
        
        // Update UI
        OnAmmoChanged?.Invoke(currentWeapon.CurrentAmmo, currentWeapon.AmmoCapacity);
        
        // End reloading
        isReloading = false;
    }
    
    /// <summary>
    /// Adds ammo for the current weapon (or a specific weapon type)
    /// </summary>
    public void AddAmmo(WeaponType weaponType, int amount)
    {
        // If current weapon matches type, add ammo directly
        if (currentWeapon != null && currentWeapon.WeaponCategory == weaponType)
        {
            currentWeapon.CurrentAmmo = Mathf.Min(currentWeapon.CurrentAmmo + amount, currentWeapon.AmmoCapacity);
            OnAmmoChanged?.Invoke(currentWeapon.CurrentAmmo, currentWeapon.AmmoCapacity);
        }
        
        // Also add ammo to inventory weapons of this type
        if (inventorySystem != null)
        {
            List<InventoryItem> weapons = inventorySystem.GetAllItems()
                .FindAll(item => item.Type == ItemType.Weapon);
                
            foreach (InventoryItem item in weapons)
            {
                WeaponItem weaponItem = item as WeaponItem;
                if (weaponItem != null && weaponItem.WeaponCategory == weaponType)
                {
                    weaponItem.CurrentAmmo = Mathf.Min(weaponItem.CurrentAmmo + amount, weaponItem.AmmoCapacity);
                }
            }
        }
    }
}