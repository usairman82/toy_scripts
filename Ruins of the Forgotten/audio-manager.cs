using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Audio;

/// <summary>
/// Manages all audio in the game, including music, sound effects, and ambient sounds
/// </summary>
public class AudioManager : MonoBehaviour
{
    [System.Serializable]
    public class SoundCategory
    {
        public string categoryName;
        public AudioClip[] clips;
        [Range(0f, 1f)]
        public float volume = 1f;
        [Range(0.1f, 3f)]
        public float pitchVariation = 1f;
        public bool loop = false;
        public AudioMixerGroup mixerGroup;
    }
    
    [Header("Audio Categories")]
    [SerializeField] private SoundCategory musicCategory;
    [SerializeField] private SoundCategory sfxCategory;
    [SerializeField] private SoundCategory ambientCategory;
    [SerializeField] private SoundCategory voiceCategory;
    
    [Header("Audio Sources")]
    [SerializeField] private AudioSource musicSource;
    [SerializeField] private AudioSource sfxSource;
    [SerializeField] private AudioSource ambientSource;
    [SerializeField] private AudioSource voiceSource;
    [SerializeField] private int sfxSourcePoolSize = 5;
    
    [Header("Audio Settings")]
    [SerializeField] private AudioMixer audioMixer;
    [SerializeField] private float defaultMusicVolume = 0.5f;
    [SerializeField] private float defaultSFXVolume = 0.8f;
    [SerializeField] private float defaultAmbientVolume = 0.6f;
    [SerializeField] private float defaultVoiceVolume = 1f;
    [SerializeField] private float fadeInTime = 2f;
    [SerializeField] private float fadeOutTime = 2f;
    
    // Singleton instance
    public static AudioManager Instance { get; private set; }
    
    // List of sfx sources for pooling
    private List<AudioSource> sfxSources = new List<AudioSource>();
    
    // Dictionary for fast audio clip lookup
    private Dictionary<string, AudioClip> audioClipDict = new Dictionary<string, AudioClip>();
    
    // Current music track reference
    private AudioClip currentMusicTrack;
    private AudioClip currentAmbientTrack;
    private Coroutine musicFadeCoroutine;
    private Coroutine ambientFadeCoroutine;
    
    private void Awake()
    {
        // Singleton pattern
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            
            // Initialize audio sources if not set
            InitializeAudioSources();
            
            // Initialize audio clip dictionary
            InitializeAudioClipDictionary();
            
            // Load saved audio settings
            LoadAudioSettings();
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    private void Start()
    {
        // Initialize SFX source pool
        InitializeSFXSourcePool();
    }
    
    /// <summary>
    /// Initializes audio sources if they are not set in the inspector
    /// </summary>
    private void InitializeAudioSources()
    {
        if (musicSource == null)
        {
            GameObject musicObj = new GameObject("MusicSource");
            musicObj.transform.parent = transform;
            musicSource = musicObj.AddComponent<AudioSource>();
            musicSource.loop = true;
            musicSource.playOnAwake = false;
            
            if (musicCategory.mixerGroup != null)
                musicSource.outputAudioMixerGroup = musicCategory.mixerGroup;
        }
        
        if (sfxSource == null)
        {
            GameObject sfxObj = new GameObject("SFXSource");
            sfxObj.transform.parent = transform;
            sfxSource = sfxObj.AddComponent<AudioSource>();
            sfxSource.loop = false;
            sfxSource.playOnAwake = false;
            
            if (sfxCategory.mixerGroup != null)
                sfxSource.outputAudioMixerGroup = sfxCategory.mixerGroup;
        }
        
        if (ambientSource == null)
        {
            GameObject ambientObj = new GameObject("AmbientSource");
            ambientObj.transform.parent = transform;
            ambientSource = ambientObj.AddComponent<AudioSource>();
            ambientSource.loop = true;
            ambientSource.playOnAwake = false;
            
            if (ambientCategory.mixerGroup != null)
                ambientSource.outputAudioMixerGroup = ambientCategory.mixerGroup;
        }
        
        if (voiceSource == null)
        {
            GameObject voiceObj = new GameObject("VoiceSource");
            voiceObj.transform.parent = transform;
            voiceSource = voiceObj.AddComponent<AudioSource>();
            voiceSource.loop = false;
            voiceSource.playOnAwake = false;
            
            if (voiceCategory.mixerGroup != null)
                voiceSource.outputAudioMixerGroup = voiceCategory.mixerGroup;
        }
    }
    
    /// <summary>
    /// Initializes the SFX source pool for multiple simultaneous sound effects
    /// </summary>
    private void InitializeSFXSourcePool()
    {
        // Clear existing pool
        sfxSources.Clear();
        
        // Add primary sfx source
        sfxSources.Add(sfxSource);
        
        // Create additional sources
        for (int i = 1; i < sfxSourcePoolSize; i++)
        {
            GameObject sfxObj = new GameObject($"SFXSource_{i}");
            sfxObj.transform.parent = transform;
            AudioSource source = sfxObj.AddComponent<AudioSource>();
            source.loop = false;
            source.playOnAwake = false;
            
            if (sfxCategory.mixerGroup != null)
                source.outputAudioMixerGroup = sfxCategory.mixerGroup;
                
            sfxSources.Add(source);
        }
    }
    
    /// <summary>
    /// Initializes the audio clip dictionary for fast lookup
    /// </summary>
    private void InitializeAudioClipDictionary()
    {
        // Clear existing dictionary
        audioClipDict.Clear();
        
        // Add music clips
        AddClipsToDict(musicCategory.clips, "Music_");
        
        // Add sfx clips
        AddClipsToDict(sfxCategory.clips, "SFX_");
        
        // Add ambient clips
        AddClipsToDict(ambientCategory.clips, "Ambient_");
        
        // Add voice clips
        AddClipsToDict(voiceCategory.clips, "Voice_");
    }
    
    /// <summary>
    /// Adds clips to the dictionary with a prefix
    /// </summary>
    private void AddClipsToDict(AudioClip[] clips, string prefix)
    {
        if (clips == null)
            return;
            
        foreach (AudioClip clip in clips)
        {
            if (clip != null)
            {
                string key = prefix + clip.name;
                if (!audioClipDict.ContainsKey(key))
                {
                    audioClipDict.Add(key, clip);
                }
            }
        }
    }
    
    /// <summary>
    /// Loads saved audio settings from PlayerPrefs
    /// </summary>
    private void LoadAudioSettings()
    {
        float musicVolume = PlayerPrefs.GetFloat("MusicVolume", defaultMusicVolume);
        float sfxVolume = PlayerPrefs.GetFloat("SFXVolume", defaultSFXVolume);
        float ambientVolume = PlayerPrefs.GetFloat("AmbientVolume", defaultAmbientVolume);
        float voiceVolume = PlayerPrefs.GetFloat("VoiceVolume", defaultVoiceVolume);
        
        SetMusicVolume(musicVolume);
        SetSFXVolume(sfxVolume);
        SetAmbientVolume(ambientVolume);
        SetVoiceVolume(voiceVolume);
    }
    
    #region Volume Controls
    
    /// <summary>
    /// Sets the music volume
    /// </summary>
    public void SetMusicVolume(float volume)
    {
        // Clamp volume
        volume = Mathf.Clamp01(volume);
        
        // Set mixer value (convert to decibels)
        if (audioMixer != null)
        {
            audioMixer.SetFloat("MusicVolume", ConvertToDecibels(volume));
        }
        
        // Set source volume directly
        if (musicSource != null)
        {
            musicSource.volume = volume * musicCategory.volume;
        }
        
        // Save setting
        PlayerPrefs.SetFloat("MusicVolume", volume);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Sets the SFX volume
    /// </summary>
    public void SetSFXVolume(float volume)
    {
        // Clamp volume
        volume = Mathf.Clamp01(volume);
        
        // Set mixer value (convert to decibels)
        if (audioMixer != null)
        {
            audioMixer.SetFloat("SFXVolume", ConvertToDecibels(volume));
        }
        
        // Set source volumes directly
        foreach (AudioSource source in sfxSources)
        {
            if (source != null)
            {
                source.volume = volume * sfxCategory.volume;
            }
        }
        
        // Save setting
        PlayerPrefs.SetFloat("SFXVolume", volume);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Sets the ambient volume
    /// </summary>
    public void SetAmbientVolume(float volume)
    {
        // Clamp volume
        volume = Mathf.Clamp01(volume);
        
        // Set mixer value (convert to decibels)
        if (audioMixer != null)
        {
            audioMixer.SetFloat("AmbientVolume", ConvertToDecibels(volume));
        }
        
        // Set source volume directly
        if (ambientSource != null)
        {
            ambientSource.volume = volume * ambientCategory.volume;
        }
        
        // Save setting
        PlayerPrefs.SetFloat("AmbientVolume", volume);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Sets the voice volume
    /// </summary>
    public void SetVoiceVolume(float volume)
    {
        // Clamp volume
        volume = Mathf.Clamp01(volume);
        
        // Set mixer value (convert to decibels)
        if (audioMixer != null)
        {
            audioMixer.SetFloat("VoiceVolume", ConvertToDecibels(volume));
        }
        
        // Set source volume directly
        if (voiceSource != null)
        {
            voiceSource.volume = volume * voiceCategory.volume;
        }
        
        // Save setting
        PlayerPrefs.SetFloat("VoiceVolume", volume);
        PlayerPrefs.Save();
    }
    
    /// <summary>
    /// Converts linear volume (0-1) to decibels for audio mixer
    /// </summary>
    private float ConvertToDecibels(float linearVolume)
    {
        // Avoid log(0)
        if (linearVolume <= 0.0001f)
            return -80f; // Minimum decibel value (effectively muted)
            
        return 20f * Mathf.Log10(linearVolume);
    }
    
    #endregion
    
    #region Music Functions
    
    /// <summary>
    /// Plays a music track with optional crossfade
    /// </summary>
    public void PlayMusic(string trackName, bool fade = true)
    {
        // Look up the track
        AudioClip track = GetAudioClip("Music_" + trackName);
        
        if (track == null)
        {
            Debug.LogWarning($"Music track not found: {trackName}");
            return;
        }
        
        // If it's already playing, do nothing
        if (currentMusicTrack == track && musicSource.isPlaying)
            return;
            
        // Store reference to current track
        currentMusicTrack = track;
        
        if (fade)
        {
            // Stop any existing fade
            if (musicFadeCoroutine != null)
                StopCoroutine(musicFadeCoroutine);
                
            // Start new fade
            musicFadeCoroutine = StartCoroutine(FadeMusicTrack(track));
        }
        else
        {
            // Play immediately
            musicSource.clip = track;
            musicSource.Play();
        }
    }
    
    /// <summary>
    /// Stops the currently playing music
    /// </summary>
    public void StopMusic(bool fade = true)
    {
        if (fade)
        {
            // Stop any existing fade
            if (musicFadeCoroutine != null)
                StopCoroutine(musicFadeCoroutine);
                
            // Start fade out
            musicFadeCoroutine = StartCoroutine(FadeMusicOut());
        }
        else
        {
            // Stop immediately
            musicSource.Stop();
            currentMusicTrack = null;
        }
    }
    
    /// <summary>
    /// Fades in a new music track
    /// </summary>
    private IEnumerator FadeMusicTrack(AudioClip newTrack)
    {
        float startVolume = musicSource.volume;
        float targetVolume = PlayerPrefs.GetFloat("MusicVolume", defaultMusicVolume) * musicCategory.volume;
        
        // Fade out current track
        if (musicSource.isPlaying)
        {
            float fadeOutTime = fadeOutTime;
            float timer = 0;
            
            while (timer < fadeOutTime)
            {
                timer += Time.deltaTime;
                musicSource.volume = Mathf.Lerp(startVolume, 0, timer / fadeOutTime);
                yield return null;
            }
            
            musicSource.Stop();
        }
        
        // Set new track and start playing
        musicSource.volume = 0;
        musicSource.clip = newTrack;
        musicSource.Play();
        
        // Fade in new track
        float fadeInTime = fadeInTime;
        float fadeTimer = 0;
        
        while (fadeTimer < fadeInTime)
        {
            fadeTimer += Time.deltaTime;
            musicSource.volume = Mathf.Lerp(0, targetVolume, fadeTimer / fadeInTime);
            yield return null;
        }
        
        // Ensure final volume is set
        musicSource.volume = targetVolume;
    }
    
    /// <summary>
    /// Fades out the current music track
    /// </summary>
    private IEnumerator FadeMusicOut()
    {
        if (!musicSource.isPlaying)
            yield break;
            
        float startVolume = musicSource.volume;
        float timer = 0;
        
        while (timer < fadeOutTime)
        {
            timer += Time.deltaTime;
            musicSource.volume = Mathf.Lerp(startVolume, 0, timer / fadeOutTime);
            yield return null;
        }
        
        musicSource.Stop();
        currentMusicTrack = null;
    }
    
    #endregion
    
    #region Ambient Functions
    
    /// <summary>
    /// Plays an ambient sound track with optional crossfade
    /// </summary>
    public void PlayAmbient(string trackName, bool fade = true)
    {
        // Look up the track
        AudioClip track = GetAudioClip("Ambient_" + trackName);
        
        if (track == null)
        {
            Debug.LogWarning($"Ambient track not found: {trackName}");
            return;
        }
        
        // If it's already playing, do nothing
        if (currentAmbientTrack == track && ambientSource.isPlaying)
            return;
            
        // Store reference to current track
        currentAmbientTrack = track;
        
        if (fade)
        {
            // Stop any existing fade
            if (ambientFadeCoroutine != null)
                StopCoroutine(ambientFadeCoroutine);
                
            // Start new fade
            ambientFadeCoroutine = StartCoroutine(FadeAmbientTrack(track));
        }
        else
        {
            // Play immediately
            ambientSource.clip = track;
            ambientSource.Play();
        }
    }
    
    /// <summary>
    /// Stops the currently playing ambient sound
    /// </summary>
    public void StopAmbient(bool fade = true)
    {
        if (fade)
        {
            // Stop any existing fade
            if (ambientFadeCoroutine != null)
                StopCoroutine(ambientFadeCoroutine);
                
            // Start fade out
            ambientFadeCoroutine = StartCoroutine(FadeAmbientOut());
        }
        else
        {
            // Stop immediately
            ambientSource.Stop();
            currentAmbientTrack = null;
        }
    }
    
    /// <summary>
    /// Fades in a new ambient track
    /// </summary>
    private IEnumerator FadeAmbientTrack(AudioClip newTrack)
    {
        float startVolume = ambientSource.volume;
        float targetVolume = PlayerPrefs.GetFloat("AmbientVolume", defaultAmbientVolume) * ambientCategory.volume;
        
        // Fade out current track
        if (ambientSource.isPlaying)
        {
            float fadeOutTime = fadeOutTime;
            float timer = 0;
            
            while (timer < fadeOutTime)
            {
                timer += Time.deltaTime;
                ambientSource.volume = Mathf.Lerp(startVolume, 0, timer / fadeOutTime);
                yield return null;
            }
            
            ambientSource.Stop();
        }
        
        // Set new track and start playing
        ambientSource.volume = 0;
        ambientSource.clip = newTrack;
        ambientSource.Play();
        
        // Fade in new track
        float fadeInTime = fadeInTime;
        float fadeTimer = 0;
        
        while (fadeTimer < fadeInTime)
        {
            fadeTimer += Time.deltaTime;
            ambientSource.volume = Mathf.Lerp(0, targetVolume, fadeTimer / fadeInTime);
            yield return null;
        }
        
        // Ensure final volume is set
        ambientSource.volume = targetVolume;
    }
    
    /// <summary>
    /// Fades out the current ambient track
    /// </summary>
    private IEnumerator FadeAmbientOut()
    {
        if (!ambientSource.isPlaying)
            yield break;
            
        float startVolume = ambientSource.volume;
        float timer = 0;
        
        while (timer < fadeOutTime)
        {
            timer += Time.deltaTime;
            ambientSource.volume = Mathf.Lerp(startVolume, 0, timer / fadeOutTime);
            yield return null;
        }
        
        ambientSource.Stop();
        currentAmbientTrack = null;
    }
    
    #endregion
    
    #region SFX Functions
    
    /// <summary>
    /// Plays a sound effect with optional pitch variation
    /// </summary>
    public void PlaySFX(string sfxName, bool usePitchVariation = true)
    {
        // Look up the sound effect
        AudioClip clip = GetAudioClip("SFX_" + sfxName);
        
        if (clip == null)
        {
            Debug.LogWarning($"SFX not found: {sfxName}");
            return;
        }
        
        // Get an available SFX source
        AudioSource source = GetAvailableSFXSource();
        
        if (source == null)
        {
            Debug.LogWarning("No available SFX sources");
            return;
        }
        
        // Set clip
        source.clip = clip;
        
        // Apply pitch variation if desired
        if (usePitchVariation)
        {
            float randomPitch = 1f / sfxCategory.pitchVariation + Random.Range(0f, sfxCategory.pitchVariation - 1f);
            source.pitch = randomPitch;
        }
        else
        {
            source.pitch = 1f;
        }
        
        // Play the sound
        source.Play();
    }
    
    /// <summary>
    /// Plays a sound effect at a specific position in 3D space
    /// </summary>
    public void PlaySFXAt(string sfxName, Vector3 position, bool usePitchVariation = true)
    {
        // Look up the sound effect
        AudioClip clip = GetAudioClip("SFX_" + sfxName);
        
        if (clip == null)
        {
            Debug.LogWarning($"SFX not found: {sfxName}");
            return;
        }
        
        // Get volume from settings
        float volume = PlayerPrefs.GetFloat("SFXVolume", defaultSFXVolume) * sfxCategory.volume;
        
        // Apply pitch variation if desired
        float pitch = 1f;
        if (usePitchVariation)
        {
            pitch = 1f / sfxCategory.pitchVariation + Random.Range(0f, sfxCategory.pitchVariation - 1f);
        }
        
        // Play at position using static method
        AudioSource.PlayClipAtPoint(clip, position, volume);
        
        // Note: PlayClipAtPoint doesn't support pitch variation or mixer groups
        // For a more complete solution, you'd need to instantiate temporary AudioSource objects
    }
    
    /// <summary>
    /// Gets an available SFX source from the pool
    /// </summary>
    private AudioSource GetAvailableSFXSource()
    {
        // First, look for a source that's not playing
        foreach (AudioSource source in sfxSources)
        {
            if (!source.isPlaying)
            {
                return source;
            }
        }
        
        // If all are playing, return the one that started playing first (oldest)
        AudioSource oldestSource = sfxSources[0];
        float oldestTime = float.MaxValue;
        
        foreach (AudioSource source in sfxSources)
        {
            if (source.time < oldestTime)
            {
                oldestTime = source.time;
                oldestSource = source;
            }
        }
        
        return oldestSource;
    }
    
    #endregion
    
    #region Voice Functions
    
    /// <summary>
    /// Plays a voice line
    /// </summary>
    public void PlayVoice(string voiceName)
    {
        // Look up the voice clip
        AudioClip clip = GetAudioClip("Voice_" + voiceName);
        
        if (clip == null)
        {
            Debug.LogWarning($"Voice clip not found: {voiceName}");
            return;
        }
        
        // Stop any currently playing voice
        voiceSource.Stop();
        
        // Set clip and play
        voiceSource.clip = clip;
        voiceSource.Play();
    }
    
    /// <summary>
    /// Stops the currently playing voice line
    /// </summary>
    public void StopVoice()
    {
        voiceSource.Stop();
    }
    
    #endregion
    
    /// <summary>
    /// Gets an audio clip from the dictionary
    /// </summary>
    private AudioClip GetAudioClip(string key)
    {
        if (audioClipDict.ContainsKey(key))
        {
            return audioClipDict[key];
        }
        
        return null;
    }
}