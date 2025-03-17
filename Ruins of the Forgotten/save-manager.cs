using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.IO;
using System;

/// <summary>
/// Manages saving and loading game data
/// </summary>
public class SaveManager : MonoBehaviour
{
    [Serializable]
    public class SaveData
    {
        // Player data
        public int currentHealth;
        public int maxHealth;
        public List<SavedInventoryItem> inventory = new List<SavedInventoryItem>();
        public string equippedWeaponName;
        
        // Game progression data
        public int currentLevel;
        public int highestUnlockedLevel;
        public Vector3 checkpointPosition;
        public Quaternion checkpointRotation;
        public List<string> collectedSecrets = new List<string>();
        public List<string> unlockedAchievements = new List<string>();
        
        // Settings data
        public float musicVolume;
        public float sfxVolume;
        public float sensitivityValue;
        public bool invertYAxis;
        
        // Timestamp
        public string saveDateTime;
    }
    
    [Serializable]
    public class SavedInventoryItem
    {
        public string itemName;
        public string itemType;
        public int quantity = 1;
        public int currentAmmo; // For weapons only
    }
    
    [Header("Save Settings")]
    [SerializeField] private string saveFileName = "savegame.json";
    [SerializeField] private bool useEncryption = true;
    [SerializeField] private string encryptionKey = "RuinsOfTheForgottenSaveKey2023";
    
    // Singleton instance
    public static SaveManager Instance { get; private set; }
    
    // Save data
    private SaveData currentSaveData;
    
    private void Awake()
    {
        // Singleton pattern
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            
            // Initialize save data
            currentSaveData = new SaveData();
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    /// <summary>
    /// Saves the current game state
    /// </summary>
    public void SaveGame()
    {
        // Get references
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        GameManager gameManager = FindObjectOfType<GameManager>();
        
        if (player == null || gameManager == null)
        {
            Debug.LogWarning("Cannot save game: Player or GameManager not found");
            return;
        }
        
        // Get player data
        HealthSystem healthSystem = player.GetComponent<HealthSystem>();
        InventorySystem inventorySystem = player.GetComponent<InventorySystem>();
        WeaponController weaponController = player.GetComponent<WeaponController>();
        
        if (healthSystem != null)
        {
            currentSaveData.currentHealth = healthSystem.CurrentHealth;
            currentSaveData.maxHealth = healthSystem.MaxHealth;
        }
        
        // Save inventory items
        currentSaveData.inventory.Clear();
        if (inventorySystem != null)
        {
            List<InventoryItem> items = inventorySystem.GetAllItems();
            foreach (InventoryItem item in items)
            {
                SavedInventoryItem savedItem = new SavedInventoryItem
                {
                    itemName = item.ItemName,
                    itemType = item.Type.ToString()
                };
                
                // If it's a weapon, save ammo
                WeaponItem weaponItem = item as WeaponItem;
                if (weaponItem != null)
                {
                    savedItem.currentAmmo = weaponItem.CurrentAmmo;
                }
                
                currentSaveData.inventory.Add(savedItem);
            }
        }
        
        // Save equipped weapon
        if (weaponController != null && weaponController.CurrentWeapon != null)
        {
            currentSaveData.equippedWeaponName = weaponController.CurrentWeapon.ItemName;
        }
        
        // Save game progression
        if (gameManager != null)
        {
            currentSaveData.currentLevel = gameManager.CurrentLevel;
            currentSaveData.highestUnlockedLevel = gameManager.HighestUnlockedLevel;
            
            // Save checkpoint position
            Transform checkpoint = gameManager.GetCurrentCheckpoint();
            if (checkpoint != null)
            {
                currentSaveData.checkpointPosition = checkpoint.position;
                currentSaveData.checkpointRotation = checkpoint.rotation;
            }
        }
        
        // Save settings data
        currentSaveData.musicVolume = PlayerPrefs.GetFloat("MusicVolume", 0.75f);
        currentSaveData.sfxVolume = PlayerPrefs.GetFloat("SFXVolume", 0.75f);
        currentSaveData.sensitivityValue = PlayerPrefs.GetFloat("MouseSensitivity", 2f);
        currentSaveData.invertYAxis = PlayerPrefs.GetInt("InvertY", 0) == 1;
        
        // Add timestamp
        currentSaveData.saveDateTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        
        // Write to file
        WriteToFile();
        
        Debug.Log("Game saved successfully");
    }
    
    /// <summary>
    /// Loads the saved game state
    /// </summary>
    /// <returns>True if load was successful</returns>
    public bool LoadGame()
    {
        // Try to load save data from file
        if (!ReadFromFile())
        {
            Debug.LogWarning("No save file found or file is corrupted");
            return false;
        }
        
        // Get references
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        GameManager gameManager = FindObjectOfType<GameManager>();
        
        if (player == null || gameManager == null)
        {
            Debug.LogWarning("Cannot load game: Player or GameManager not found");
            return false;
        }
        
        // Apply player data
        HealthSystem healthSystem = player.GetComponent<HealthSystem>();
        InventorySystem inventorySystem = player.GetComponent<InventorySystem>();
        WeaponController weaponController = player.GetComponent<WeaponController>();
        
        if (healthSystem != null)
        {
            healthSystem.SetHealth(currentSaveData.currentHealth, currentSaveData.maxHealth);
        }
        
        // Load inventory items
        if (inventorySystem != null)
        {
            // Clear current inventory
            inventorySystem.ClearInventory();
            
            // Add saved items
            foreach (SavedInventoryItem savedItem in currentSaveData.inventory)
            {
                ItemType itemType = ItemType.Collectible; // Default
                try
                {
                    itemType = (ItemType)Enum.Parse(typeof(ItemType), savedItem.itemType);
                }
                catch (Exception)
                {
                    Debug.LogWarning($"Unknown item type: {savedItem.itemType}");
                }
                
                InventoryItem newItem = null;
                
                switch (itemType)
                {
                    case ItemType.Weapon:
                        WeaponItem weaponItem = new WeaponItem();
                        weaponItem.ItemName = savedItem.itemName;
                        weaponItem.CurrentAmmo = savedItem.currentAmmo;
                        
                        // Find weapon data to populate other fields
                        WeaponData weaponData = FindWeaponData(savedItem.itemName);
                        if (weaponData != null)
                        {
                            weaponItem.ItemDescription = weaponData.description;
                            weaponItem.ItemIcon = weaponData.icon;
                            weaponItem.Damage = weaponData.damage;
                            weaponItem.FireRate = weaponData.fireRate;
                            weaponItem.AmmoCapacity = weaponData.ammoCapacity;
                            weaponItem.Range = weaponData.range;
                            weaponItem.SpecialAbility = weaponData.specialAbility;
                            weaponItem.WeaponCategory = DetermineWeaponType(weaponData);
                        }
                        
                        newItem = weaponItem;
                        break;
                        
                    case ItemType.HealthItem:
                        HealthItem healthItem = new HealthItem();
                        healthItem.ItemName = savedItem.itemName;
                        
                        // Determine health restore amount based on name
                        if (savedItem.itemName.Contains("Bandage"))
                        {
                            healthItem.HealthRestoreAmount = 25;
                            healthItem.HealthItemCategory = HealthItemType.Bandage;
                        }
                        else if (savedItem.itemName.Contains("Herb"))
                        {
                            healthItem.HealthRestoreAmount = 50;
                            healthItem.HealthItemCategory = HealthItemType.Herb;
                        }
                        else if (savedItem.itemName.Contains("Potion"))
                        {
                            healthItem.HealthRestoreAmount = 100;
                            healthItem.HealthItemCategory = HealthItemType.Potion;
                        }
                        
                        newItem = healthItem;
                        break;
                        
                    default:
                        // Generic item
                        newItem = new InventoryItem
                        {
                            ItemName = savedItem.itemName,
                            Type = itemType
                        };
                        break;
                }
                
                if (newItem != null)
                {
                    inventorySystem.AddItem(newItem);
                }
            }
        }
        
        // Equip saved weapon
        if (weaponController != null && !string.IsNullOrEmpty(currentSaveData.equippedWeaponName))
        {
            weaponController.EquipWeaponByName(currentSaveData.equippedWeaponName);
        }
        
        // Apply game progression
        if (gameManager != null)
        {
            gameManager.LoadLevel(currentSaveData.currentLevel);
            gameManager.SetHighestUnlockedLevel(currentSaveData.highestUnlockedLevel);
            
            // Set checkpoint position
            if (currentSaveData.checkpointPosition != Vector3.zero)
            {
                gameManager.SetCustomCheckpoint(
                    currentSaveData.checkpointPosition,
                    currentSaveData.checkpointRotation
                );
                
                // Teleport player to checkpoint
                player.transform.position = currentSaveData.checkpointPosition;
                player.transform.rotation = currentSaveData.checkpointRotation;
            }
        }
        
        // Apply settings
        PlayerPrefs.SetFloat("MusicVolume", currentSaveData.musicVolume);
        PlayerPrefs.SetFloat("SFXVolume", currentSaveData.sfxVolume);
        PlayerPrefs.SetFloat("MouseSensitivity", currentSaveData.sensitivityValue);
        PlayerPrefs.SetInt("InvertY", currentSaveData.invertYAxis ? 1 : 0);
        PlayerPrefs.Save();
        
        // Update audio settings
        AudioManager audioManager = FindObjectOfType<AudioManager>();
        if (audioManager != null)
        {
            audioManager.SetMusicVolume(currentSaveData.musicVolume);
            audioManager.SetSFXVolume(currentSaveData.sfxVolume);
        }
        
        Debug.Log("Game loaded successfully");
        return true;
    }
    
    /// <summary>
    /// Determines if there is a valid save file
    /// </summary>
    public bool HasSaveFile()
    {
        string filePath = GetSaveFilePath();
        return File.Exists(filePath);
    }
    
    /// <summary>
    /// Gets the save timestamp if available
    /// </summary>
    public string GetSaveTimestamp()
    {
        if (HasSaveFile() && ReadFromFile())
        {
            return currentSaveData.saveDateTime;
        }
        
        return "No save data";
    }
    
    /// <summary>
    /// Deletes the save file
    /// </summary>
    public void DeleteSaveFile()
    {
        string filePath = GetSaveFilePath();
        
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
            Debug.Log("Save file deleted");
        }
    }
    
    /// <summary>
    /// Writes the save data to file
    /// </summary>
    private void WriteToFile()
    {
        string filePath = GetSaveFilePath();
        string jsonData = JsonUtility.ToJson(currentSaveData, true);
        
        // Encrypt data if enabled
        if (useEncryption)
        {
            jsonData = EncryptDecrypt(jsonData);
        }
        
        // Create directory if it doesn't exist
        string directory = Path.GetDirectoryName(filePath);
        if (!Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }
        
        // Write to file
        File.WriteAllText(filePath, jsonData);
    }
    
    /// <summary>
    /// Reads the save data from file
    /// </summary>
    /// <returns>True if read was successful</returns>
    private bool ReadFromFile()
    {
        string filePath = GetSaveFilePath();
        
        if (!File.Exists(filePath))
        {
            return false;
        }
        
        try
        {
            string jsonData = File.ReadAllText(filePath);
            
            // Decrypt data if encrypted
            if (useEncryption)
            {
                jsonData = EncryptDecrypt(jsonData);
            }
            
            currentSaveData = JsonUtility.FromJson<SaveData>(jsonData);
            return true;
        }
        catch (Exception e)
        {
            Debug.LogError($"Error reading save file: {e.Message}");
            return false;
        }
    }
    
    /// <summary>
    /// Gets the full path to the save file
    /// </summary>
    private string GetSaveFilePath()
    {
        return Path.Combine(Application.persistentDataPath, saveFileName);
    }
    
    /// <summary>
    /// Simple XOR encryption/decryption
    /// </summary>
    private string EncryptDecrypt(string data)
    {
        char[] result = data.ToCharArray();
        
        for (int i = 0; i < result.Length; i++)
        {
            result[i] = (char)(result[i] ^ encryptionKey[i % encryptionKey.Length]);
        }
        
        return new string(result);
    }
    
    /// <summary>
    /// Finds weapon data for a given weapon name
    /// </summary>
    private WeaponData FindWeaponData(string weaponName)
    {
        // Look for weapon scriptable objects in Resources folder
        WeaponData[] allWeapons = Resources.LoadAll<WeaponData>("ScriptableObjects/Weapons");
        
        foreach (WeaponData weapon in allWeapons)
        {
            if (weapon.weaponName == weaponName)
            {
                return weapon;
            }
        }
        
        // If not found, try to create a default one using the factory
        switch (weaponName)
        {
            case "Dagger":
                return WeaponFactory.CreateDagger();
            case "Sword":
                return WeaponFactory.CreateSword();
            case "Pistol":
                return WeaponFactory.CreatePistol();
            case "Shotgun":
                return WeaponFactory.CreateShotgun();
            case "Machine Gun":
                return WeaponFactory.CreateMachineGun();
            case "Ancient Staff":
                return WeaponFactory.CreateAncientStaff();
        }
        
        return null;
    }
    
    /// <summary>
    /// Determines weapon type from weapon data
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
}