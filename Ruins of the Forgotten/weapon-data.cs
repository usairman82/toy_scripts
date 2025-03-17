using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Scriptable object to define weapon data
/// </summary>
[CreateAssetMenu(fileName = "New Weapon", menuName = "Ruins of the Forgotten/Weapon")]
public class WeaponData : ScriptableObject
{
    [Header("Basic Info")]
    public string weaponName = "New Weapon";
    public string description = "Weapon description";
    public Sprite icon;
    public GameObject weaponPrefab;
    
    [Header("Weapon Type")]
    public bool isMelee = false;
    
    [Header("Stats")]
    public int damage = 10;
    public float fireRate = 1f; // Shots per second
    public int ammoCapacity = 10;
    public float range = 100f;
    public float spread = 0.01f; // Bullet spread
    public float impactForce = 30f; // Force applied to hit objects
    public string specialAbility = "";
    
    [Header("Shotgun Properties")]
    public int pelletsPerShot = 8; // Only for shotguns
    
    [Header("Melee Properties")]
    public float meleeRadius = 1.5f; // Only for melee weapons
    
    [Header("Positioning")]
    public Vector3 positionOffset = Vector3.zero;
    public Vector3 rotationOffset = Vector3.zero;
    public Vector3 scale = Vector3.one;
    public Transform muzzlePosition; // For fire effects
    
    [Header("Timings")]
    public float reloadTime = 1.5f;
    
    [Header("Audio")]
    public AudioClip fireSound;
    public AudioClip reloadSound;
    public AudioClip equipSound;
    public AudioClip emptySound;
}

/// <summary>
/// Example weapon data creation for the game's weapons
/// </summary>
public static class WeaponFactory
{
    /// <summary>
    /// Creates the dagger weapon data
    /// </summary>
    public static WeaponData CreateDagger()
    {
        WeaponData dagger = ScriptableObject.CreateInstance<WeaponData>();
        dagger.weaponName = "Dagger";
        dagger.description = "A quick dagger for close combat. Features fast attack speed.";
        dagger.isMelee = true;
        dagger.damage = 15;
        dagger.fireRate = 2.5f; // Attacks per second
        dagger.range = 2f;
        dagger.meleeRadius = 0.8f;
        dagger.specialAbility = "Quick attack speed";
        
        return dagger;
    }
    
    /// <summary>
    /// Creates the sword weapon data
    /// </summary>
    public static WeaponData CreateSword()
    {
        WeaponData sword = ScriptableObject.CreateInstance<WeaponData>();
        sword.weaponName = "Sword";
        sword.description = "A reliable sword with medium damage and reach. Can block enemy attacks.";
        sword.isMelee = true;
        sword.damage = 25;
        sword.fireRate = 1.5f; // Attacks per second
        sword.range = 2.5f;
        sword.meleeRadius = 1.2f;
        sword.specialAbility = "Blocks enemy attacks";
        
        return sword;
    }
    
    /// <summary>
    /// Creates the pistol weapon data
    /// </summary>
    public static WeaponData CreatePistol()
    {
        WeaponData pistol = ScriptableObject.CreateInstance<WeaponData>();
        pistol.weaponName = "Pistol";
        pistol.description = "A reliable pistol with medium damage and accuracy.";
        pistol.isMelee = false;
        pistol.damage = 30;
        pistol.fireRate = 2f; // Shots per second
        pistol.ammoCapacity = 12;
        pistol.range = 50f;
        pistol.spread = 0.01f;
        pistol.specialAbility = "Precise shots";
        pistol.reloadTime = 1.2f;
        
        return pistol;
    }
    
    /// <summary>
    /// Creates the shotgun weapon data
    /// </summary>
    public static WeaponData CreateShotgun()
    {
        WeaponData shotgun = ScriptableObject.CreateInstance<WeaponData>();
        shotgun.weaponName = "Shotgun";
        shotgun.description = "A powerful shotgun with high damage at close range. Knocks back enemies.";
        shotgun.isMelee = false;
        shotgun.damage = 15; // Per pellet
        shotgun.fireRate = 0.8f; // Shots per second
        shotgun.ammoCapacity = 6;
        shotgun.range = 20f;
        shotgun.spread = 0.05f;
        shotgun.impactForce = 80f;
        shotgun.pelletsPerShot = 8;
        shotgun.specialAbility = "Knockback enemies";
        shotgun.reloadTime = 2f;
        
        return shotgun;
    }
    
    /// <summary>
    /// Creates the machine gun weapon data
    /// </summary>
    public static WeaponData CreateMachineGun()
    {
        WeaponData machineGun = ScriptableObject.CreateInstance<WeaponData>();
        machineGun.weaponName = "Machine Gun";
        machineGun.description = "A rapid-fire machine gun with high rate of fire but high recoil.";
        machineGun.isMelee = false;
        machineGun.damage = 20;
        machineGun.fireRate = 8f; // Shots per second
        machineGun.ammoCapacity = 30;
        machineGun.range = 80f;
        machineGun.spread = 0.03f;
        machineGun.specialAbility = "High recoil";
        machineGun.reloadTime = 2.5f;
        
        return machineGun;
    }
    
    /// <summary>
    /// Creates the ancient staff weapon data
    /// </summary>
    public static WeaponData CreateAncientStaff()
    {
        WeaponData ancientStaff = ScriptableObject.CreateInstance<WeaponData>();
        ancientStaff.weaponName = "Ancient Staff";
        ancientStaff.description = "A mystical staff that shoots powerful magic bolts.";
        ancientStaff.isMelee = false;
        ancientStaff.damage = 40;
        ancientStaff.fireRate = 1f; // Shots per second
        ancientStaff.ammoCapacity = 5;
        ancientStaff.range = 100f;
        ancientStaff.spread = 0.005f;
        ancientStaff.specialAbility = "Shoots magic bolts";
        ancientStaff.reloadTime = 3f;
        
        return ancientStaff;
    }
}
