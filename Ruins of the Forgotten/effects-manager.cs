using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Manages particle effects, sounds, and other visual effects in the game
/// </summary>
public class SpecialEffectsManager : MonoBehaviour
{
    [System.Serializable]
    public class EffectEntry
    {
        public string effectName;
        public GameObject effectPrefab;
        public AudioClip[] soundOptions;
        public float duration = 2f;
        public bool poolEffect = true;
        public int poolSize = 5;
    }
    
    [Header("Effect References")]
    [SerializeField] private EffectEntry[] effects;
    
    [Header("Common Effects")]
    [SerializeField] private EffectEntry bulletImpactEffect;
    [SerializeField] private EffectEntry bloodSplatterEffect;
    [SerializeField] private EffectEntry muzzleFlashEffect;
    [SerializeField] private EffectEntry explosionEffect;
    [SerializeField] private EffectEntry magicEffect;
    [SerializeField] private EffectEntry footstepEffect;
    
    // Singleton instance
    public static SpecialEffectsManager Instance { get; private set; }
    
    // Object pools for effects
    private Dictionary<string, Queue<GameObject>> effectPools = new Dictionary<string, Queue<GameObject>>();
    private Dictionary<string, EffectEntry> effectDictionary = new Dictionary<string, EffectEntry>();
    
    private void Awake()
    {
        // Singleton pattern
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
            return;
        }
        
        // Initialize effect dictionary
        InitializeEffectDictionary();
        
        // Initialize object pools
        InitializeObjectPools();
    }
    
    /// <summary>
    /// Initializes the effect dictionary for fast lookups
    /// </summary>
    private void InitializeEffectDictionary()
    {
        // Add general effects
        foreach (EffectEntry effect in effects)
        {
            if (!string.IsNullOrEmpty(effect.effectName) && effect.effectPrefab != null)
            {
                effectDictionary[effect.effectName] = effect;
            }
        }
        
        // Add common effects
        if (bulletImpactEffect != null && bulletImpactEffect.effectPrefab != null)
        {
            effectDictionary["BulletImpact"] = bulletImpactEffect;
        }
        
        if (bloodSplatterEffect != null && bloodSplatterEffect.effectPrefab != null)
        {
            effectDictionary["BloodSplatter"] = bloodSplatterEffect;
        }
        
        if (muzzleFlashEffect != null && muzzleFlashEffect.effectPrefab != null)
        {
            effectDictionary["MuzzleFlash"] = muzzleFlashEffect;
        }
        
        if (explosionEffect != null && explosionEffect.effectPrefab != null)
        {
            effectDictionary["Explosion"] = explosionEffect;
        }
        
        if (magicEffect != null && magicEffect.effectPrefab != null)
        {
            effectDictionary["Magic"] = magicEffect;
        }
        
        if (footstepEffect != null && footstepEffect.effectPrefab != null)
        {
            effectDictionary["Footstep"] = footstepEffect;
        }
    }
    
    /// <summary>
    /// Initializes object pools for effects
    /// </summary>
    private void InitializeObjectPools()
    {
        // Create parent object for pools
        GameObject poolsParent = new GameObject("EffectPools");
        poolsParent.transform.parent = transform;
        
        // Create pools for each effect
        foreach (KeyValuePair<string, EffectEntry> effect in effectDictionary)
        {
            if (effect.Value.poolEffect && effect.Value.effectPrefab != null)
            {
                // Create pool container
                GameObject poolContainer = new GameObject(effect.Key + "Pool");
                poolContainer.transform.parent = poolsParent.transform;
                
                // Initialize pool
                Queue<GameObject> pool = new Queue<GameObject>();
                
                // Create initial instances
                for (int i = 0; i < effect.Value.poolSize; i++)
                {
                    GameObject obj = CreateEffectInstance(effect.Value.effectPrefab, poolContainer.transform);
                    obj.SetActive(false);
                    pool.Enqueue(obj);
                }
                
                // Store pool
                effectPools[effect.Key] = pool;
            }
        }
    }
    
    /// <summary>
    /// Creates a new instance of an effect
    /// </summary>
    private GameObject CreateEffectInstance(GameObject prefab, Transform parent)
    {
        GameObject obj = Instantiate(prefab, parent);
        
        // Ensure any particle systems don't auto-play
        ParticleSystem[] particleSystems = obj.GetComponentsInChildren<ParticleSystem>();
        foreach (ParticleSystem ps in particleSystems)
        {
            var main = ps.main;
            main.playOnAwake = false;
        }
        
        // Ensure any audio sources don't auto-play
        AudioSource[] audioSources = obj.GetComponentsInChildren<AudioSource>();
        foreach (AudioSource audioSource in audioSources)
        {
            audioSource.playOnAwake = false;
        }
        
        return obj;
    }
    
    /// <summary>
    /// Plays an effect at the specified position and rotation
    /// </summary>
    public GameObject PlayEffect(string effectName, Vector3 position, Quaternion rotation)
    {
        // Check if effect exists
        if (!effectDictionary.ContainsKey(effectName))
        {
            Debug.LogWarning("Effect not found: " + effectName);
            return null;
        }
        
        EffectEntry effect = effectDictionary[effectName];
        GameObject effectInstance;
        
        // Get from pool or instantiate
        if (effect.poolEffect && effectPools.ContainsKey(effectName))
        {
            // Get from pool
            Queue<GameObject> pool = effectPools[effectName];
            
            if (pool.Count > 0)
            {
                effectInstance = pool.Dequeue();
            }
            else
            {
                // Create new instance if pool is empty
                effectInstance = CreateEffectInstance(effect.effectPrefab, transform);
            }
            
            // Position and activate
            effectInstance.transform.position = position;
            effectInstance.transform.rotation = rotation;
            effectInstance.SetActive(true);
            
            // Play particle systems
            ParticleSystem[] particleSystems = effectInstance.GetComponentsInChildren<ParticleSystem>();
            foreach (ParticleSystem ps in particleSystems)
            {
                ps.Play();
            }
            
            // Return to pool after duration
            StartCoroutine(ReturnToPool(effectInstance, effect.duration, effectName));
        }
        else
        {
            // Just instantiate and destroy
            effectInstance = Instantiate(effect.effectPrefab, position, rotation);
            Destroy(effectInstance, effect.duration);
        }
        
        // Play sound if available
        PlayEffectSound(effect, position);
        
        return effectInstance;
    }
    
    /// <summary>
    /// Plays the effect's sound
    /// </summary>
    private void PlayEffectSound(EffectEntry effect, Vector3 position)
    {
        if (effect.soundOptions != null && effect.soundOptions.Length > 0)
        {
            // Choose random sound from options
            AudioClip sound = effect.soundOptions[Random.Range(0, effect.soundOptions.Length)];
            
            if (sound != null)
            {
                AudioSource.PlayClipAtPoint(sound, position);
            }
        }
    }
    
    /// <summary>
    /// Returns an effect to its pool after a delay
    /// </summary>
    private IEnumerator ReturnToPool(GameObject obj, float delay, string poolName)
    {
        yield return new WaitForSeconds(delay);
        
        // Stop particle systems
        ParticleSystem[] particleSystems = obj.GetComponentsInChildren<ParticleSystem>();
        foreach (ParticleSystem ps in particleSystems)
        {
            ps.Stop();
        }
        
        // Deactivate and return to pool
        obj.SetActive(false);
        
        if (effectPools.ContainsKey(poolName))
        {
            effectPools[poolName].Enqueue(obj);
        }
    }
    
    #region Common Effect Methods
    
    /// <summary>
    /// Plays a bullet impact effect
    /// </summary>
    public void PlayBulletImpact(Vector3 position, Vector3 normal)
    {
        Quaternion rotation = Quaternion.LookRotation(normal);
        PlayEffect("BulletImpact", position, rotation);
    }
    
    /// <summary>
    /// Plays a blood splatter effect
    /// </summary>
    public void PlayBloodSplatter(Vector3 position, Vector3 normal)
    {
        Quaternion rotation = Quaternion.LookRotation(normal);
        PlayEffect("BloodSplatter", position, rotation);
    }
    
    /// <summary>
    /// Plays a muzzle flash effect
    /// </summary>
    public void PlayMuzzleFlash(Transform muzzleTransform)
    {
        if (muzzleTransform != null)
        {
            PlayEffect("MuzzleFlash", muzzleTransform.position, muzzleTransform.rotation);
        }
    }
    
    /// <summary>
    /// Plays an explosion effect
    /// </summary>
    public void PlayExplosion(Vector3 position)
    {
        PlayEffect("Explosion", position, Quaternion.identity);
    }
    
    /// <summary>
    /// Plays a magic effect
    /// </summary>
    public void PlayMagicEffect(Vector3 position, Quaternion rotation)
    {
        PlayEffect("Magic", position, rotation);
    }
    
    /// <summary>
    /// Plays a footstep effect
    /// </summary>
    public void PlayFootstep(Vector3 position, string surfaceTag = "")
    {
        // Would normally check surface tag and play appropriate sound
        PlayEffect("Footstep", position, Quaternion.identity);
    }
    
    #endregion
}
