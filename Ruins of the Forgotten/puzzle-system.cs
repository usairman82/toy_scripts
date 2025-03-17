using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

/// <summary>
/// Base class for puzzles in the game
/// </summary>
public abstract class PuzzleBase : MonoBehaviour
{
    [Header("Puzzle Settings")]
    [SerializeField] protected string puzzleID;
    [SerializeField] protected string puzzleName;
    [SerializeField] protected string puzzleDescription;
    [SerializeField] protected bool solved = false;
    
    [Header("Puzzle Events")]
    [SerializeField] protected UnityEvent onPuzzleSolved;
    [SerializeField] protected AudioClip solveSound;
    [SerializeField] protected GameObject solveEffect;
    [SerializeField] protected float effectDuration = 2f;
    
    // Properties
    public string ID => puzzleID;
    public string Name => puzzleName;
    public string Description => puzzleDescription;
    public bool IsSolved => solved;
    
    // Abstract methods that derived classes must implement
    protected abstract bool CheckSolution();
    protected abstract void ResetPuzzle();
    
    // Method to solve the puzzle
    protected virtual void SolvePuzzle()
    {
        if (solved)
            return;
            
        solved = true;
        
        // Play solve sound
        if (solveSound != null)
        {
            AudioSource.PlayClipAtPoint(solveSound, transform.position);
        }
        
        // Show solve effect
        if (solveEffect != null)
        {
            GameObject effect = Instantiate(solveEffect, transform.position, Quaternion.identity);
            Destroy(effect, effectDuration);
        }
        
        // Fire solve event
        onPuzzleSolved?.Invoke();
        
        // Notify any objective system
        NotifyObjectiveSystem();
    }
    
    // Notifies the objective system that the puzzle is solved
    protected virtual void NotifyObjectiveSystem()
    {
        // Find SolvePuzzleObjective components
        SolvePuzzleObjective[] objectives = FindObjectsOfType<MonoBehaviour>() as SolvePuzzleObjective[];
        
        foreach (SolvePuzzleObjective objective in objectives)
        {
            if (objective != null && objective.ID == puzzleID)
            {
                objective.OnPuzzleSolved();
            }
        }
    }
}

/// <summary>
/// Lever puzzle - requires multiple levers to be in correct positions
/// </summary>
public class LeverPuzzle : PuzzleBase
{
    [System.Serializable]
    public class LeverData
    {
        public InteractableLever lever;
        public bool requiredState;
    }
    
    [Header("Lever Settings")]
    [SerializeField] private LeverData[] levers;
    [SerializeField] private bool checkContinuously = true;
    
    private void Update()
    {
        if (solved)
            return;
            
        if (checkContinuously)
        {
            if (CheckSolution())
            {
                SolvePuzzle();
            }
        }
    }
    
    protected override bool CheckSolution()
    {
        foreach (LeverData data in levers)
        {
            if (data.lever == null || data.lever.IsOn != data.requiredState)
            {
                return false;
            }
        }
        
        return true;
    }
    
    protected override void ResetPuzzle()
    {
        solved = false;
        
        // Reset all levers to starting position
        foreach (LeverData data in levers)
        {
            if (data.lever != null)
            {
                data.lever.SetState(!data.requiredState);
            }
        }
    }
    
    // Called by any lever when it changes state
    public void OnLeverStateChanged()
    {
        if (solved || checkContinuously)
            return;
            
        if (CheckSolution())
        {
            SolvePuzzle();
        }
    }
}

/// <summary>
/// Interactive lever that can be toggled on/off
/// </summary>
public class InteractableLever : InteractableBase
{
    [Header("Lever Settings")]
    [SerializeField] private bool isOn = false;
    [SerializeField] private Transform leverTransform;
    [SerializeField] private Vector3 onRotation = new Vector3(0, 0, 45);
    [SerializeField] private Vector3 offRotation = new Vector3(0, 0, -45);
    [SerializeField] private float leverSpeed = 5f;
    [SerializeField] private AudioClip leverSound;
    
    [Header("Events")]
    [SerializeField] private UnityEvent onLeverOn;
    [SerializeField] private UnityEvent onLeverOff;
    [SerializeField] private UnityEvent onLeverToggle;
    
    // Public properties
    public bool IsOn => isOn;
    
    private Quaternion targetRotation;
    private AudioSource audioSource;
    private LeverPuzzle parentPuzzle;
    
    protected override void Start()
    {
        base.Start();
        
        interactionPrompt = isOn ? "Press E to pull lever down" : "Press E to pull lever up";
        
        if (leverTransform != null)
        {
            leverTransform.localRotation = Quaternion.Euler(isOn ? onRotation : offRotation);
        }
        
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
        
        // Find parent puzzle if any
        parentPuzzle = GetComponentInParent<LeverPuzzle>();
    }
    
    private void Update()
    {
        // Handle lever animation
        if (leverTransform != null)
        {
            leverTransform.localRotation = Quaternion.Slerp(
                leverTransform.localRotation,
                Quaternion.Euler(isOn ? onRotation : offRotation),
                Time.deltaTime * leverSpeed
            );
        }
    }
    
    public override void Interact(GameObject interactor)
    {
        // Toggle lever state
        ToggleState();
    }
    
    /// <summary>
    /// Toggles the lever state
    /// </summary>
    public void ToggleState()
    {
        isOn = !isOn;
        
        // Update interaction prompt
        interactionPrompt = isOn ? "Press E to pull lever down" : "Press E to pull lever up";
        
        // Play sound
        if (audioSource != null && leverSound != null)
        {
            audioSource.PlayOneShot(leverSound);
        }
        
        // Trigger events
        if (isOn)
        {
            onLeverOn?.Invoke();
        }
        else
        {
            onLeverOff?.Invoke();
        }
        
        onLeverToggle?.Invoke();
        
        // Notify parent puzzle if any
        if (parentPuzzle != null)
        {
            parentPuzzle.OnLeverStateChanged();
        }
    }
    
    /// <summary>
    /// Sets the lever state directly
    /// </summary>
    public void SetState(bool state)
    {
        if (isOn != state)
        {
            ToggleState();
        }
    }
}

/// <summary>
/// Pressure plate that activates when stepped on
/// </summary>
public class PressurePlate : MonoBehaviour
{
    [Header("Pressure Plate Settings")]
    [SerializeField] private float activationHeight = 0.1f;
    [SerializeField] private float activationTime = 0.5f;
    [SerializeField] private bool staysPressed = false;
    [SerializeField] private LayerMask activationLayers;
    [SerializeField] private AudioClip pressSound;
    [SerializeField] private AudioClip releaseSound;
    
    [Header("Events")]
    [SerializeField] private UnityEvent onPressed;
    [SerializeField] private UnityEvent onReleased;
    
    // Private variables
    private Transform plateTransform;
    private Vector3 initialPosition;
    private Vector3 pressedPosition;
    private bool isPressed = false;
    private float pressTime = 0f;
    private AudioSource audioSource;
    
    private void Awake()
    {
        // Get the plate transform (usually this object)
        plateTransform = transform;
        initialPosition = plateTransform.localPosition;
        pressedPosition = initialPosition - new Vector3(0, activationHeight, 0);
        
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
    }
    
    private void OnTriggerEnter(Collider other)
    {
        // Check if object is on valid layer
        if (((1 << other.gameObject.layer) & activationLayers) != 0)
        {
            Press();
        }
    }
    
    private void OnTriggerExit(Collider other)
    {
        // Check if object is on valid layer
        if (((1 << other.gameObject.layer) & activationLayers) != 0 && !staysPressed)
        {
            Release();
        }
    }
    
    private void Update()
    {
        // Handle plate animation
        if (isPressed)
        {
            plateTransform.localPosition = Vector3.Lerp(
                plateTransform.localPosition,
                pressedPosition,
                Time.deltaTime * 10f
            );
            
            // If plate should release after time
            if (!staysPressed && pressTime > 0 && Time.time > pressTime)
            {
                Release();
            }
        }
        else
        {
            plateTransform.localPosition = Vector3.Lerp(
                plateTransform.localPosition,
                initialPosition,
                Time.deltaTime * 5f
            );
        }
    }
    
    /// <summary>
    /// Presses the pressure plate
    /// </summary>
    public void Press()
    {
        if (isPressed)
            return;
            
        isPressed = true;
        
        // Set release time if temporary
        if (!staysPressed && activationTime > 0)
        {
            pressTime = Time.time + activationTime;
        }
        
        // Play sound
        if (audioSource != null && pressSound != null)
        {
            audioSource.PlayOneShot(pressSound);
        }
        
        // Trigger events
        onPressed?.Invoke();
    }
    
    /// <summary>
    /// Releases the pressure plate
    /// </summary>
    public void Release()
    {
        if (!isPressed)
            return;
            
        isPressed = false;
        pressTime = 0f;
        
        // Play sound
        if (audioSource != null && releaseSound != null)
        {
            audioSource.PlayOneShot(releaseSound);
        }
        
        // Trigger events
        onReleased?.Invoke();
    }
    
    /// <summary>
    /// Force the plate to stay pressed
    /// </summary>
    public void LockPressed()
    {
        if (!isPressed)
        {
            Press();
        }
        
        staysPressed = true;
    }
    
    /// <summary>
    /// Force the plate to release even if something is on it
    /// </summary>
    public void ForceRelease()
    {
        staysPressed = false;
        Release();
    }
}

/// <summary>
/// Combination lock puzzle
/// </summary>
public class CombinationLockPuzzle : PuzzleBase
{
    [System.Serializable]
    public class Lock
    {
        public InteractableDial dial;
        public int correctValue;
    }
    
    [Header("Combination Settings")]
    [SerializeField] private Lock[] locks;
    [SerializeField] private bool checkContinuously = true;
    [SerializeField] private bool resetOnIncorrect = false;
    
    private void Update()
    {
        if (solved)
            return;
            
        if (checkContinuously)
        {
            if (CheckSolution())
            {
                SolvePuzzle();
            }
        }
    }
    
    protected override bool CheckSolution()
    {
        foreach (Lock lockData in locks)
        {
            if (lockData.dial == null || lockData.dial.CurrentValue != lockData.correctValue)
            {
                if (resetOnIncorrect)
                {
                    ResetPuzzle();
                }
                return false;
            }
        }
        
        return true;
    }
    
    protected override void ResetPuzzle()
    {
        solved = false;
        
        // Reset all dials to zero or random position
        foreach (Lock lockData in locks)
        {
            if (lockData.dial != null)
            {
                lockData.dial.ResetToZero();
            }
        }
    }
    
    // Called by any dial when it changes value
    public void OnDialValueChanged()
    {
        if (solved || checkContinuously)
            return;
            
        if (CheckSolution())
        {
            SolvePuzzle();
        }
    }
}

/// <summary>
/// Interactive dial that can be rotated to select a value
/// </summary>
public class InteractableDial : InteractableBase
{
    [Header("Dial Settings")]
    [SerializeField] private int minValue = 0;
    [SerializeField] private int maxValue = 9;
    [SerializeField] private int currentValue = 0;
    [SerializeField] private Transform dialTransform;
    [SerializeField] private float rotationSpeed = 5f;
    [SerializeField] private AudioClip dialSound;
    
    [Header("Events")]
    [SerializeField] private UnityEvent<int> onValueChanged;
    
    // Public property
    public int CurrentValue => currentValue;
    
    private CombinationLockPuzzle parentPuzzle;
    private AudioSource audioSource;
    
    protected override void Start()
    {
        base.Start();
        
        interactionPrompt = "Press E to turn dial";
        
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
        
        // Update dial rotation to match current value
        UpdateDialRotation();
        
        // Find parent puzzle if any
        parentPuzzle = GetComponentInParent<CombinationLockPuzzle>();
    }
    
    private void Update()
    {
        // Smooth rotation animation
        if (dialTransform != null)
        {
            Quaternion targetRotation = Quaternion.Euler(0, GetRotationForValue(currentValue), 0);
            dialTransform.localRotation = Quaternion.Slerp(
                dialTransform.localRotation,
                targetRotation,
                Time.deltaTime * rotationSpeed
            );
        }
    }
    
    public override void Interact(GameObject interactor)
    {
        // Increment the value
        IncrementValue();
    }
    
    /// <summary>
    /// Increments the dial value
    /// </summary>
    public void IncrementValue()
    {
        // Increment value
        currentValue++;
        
        // Wrap around
        if (currentValue > maxValue)
        {
            currentValue = minValue;
        }
        
        // Update rotation
        UpdateDialRotation();
        
        // Play sound
        if (audioSource != null && dialSound != null)
        {
            audioSource.PlayOneShot(dialSound);
        }
        
        // Trigger events
        onValueChanged?.Invoke(currentValue);
        
        // Notify parent puzzle if any
        if (parentPuzzle != null)
        {
            parentPuzzle.OnDialValueChanged();
        }
    }
    
    /// <summary>
    /// Sets the dial to a specific value
    /// </summary>
    public void SetValue(int value)
    {
        if (value < minValue || value > maxValue)
            return;
            
        if (currentValue != value)
        {
            currentValue = value;
            UpdateDialRotation();
            onValueChanged?.Invoke(currentValue);
            
            // Notify parent puzzle if any
            if (parentPuzzle != null)
            {
                parentPuzzle.OnDialValueChanged();
            }
        }
    }
    
    /// <summary>
    /// Resets the dial to zero
    /// </summary>
    public void ResetToZero()
    {
        SetValue(minValue);
    }
    
    /// <summary>
    /// Updates the dial visual rotation based on current value
    /// </summary>
    private void UpdateDialRotation()
    {
        if (dialTransform != null)
        {
            float targetRotation = GetRotationForValue(currentValue);
            dialTransform.localRotation = Quaternion.Euler(0, targetRotation, 0);
        }
    }
    
    /// <summary>
    /// Calculates the rotation angle for a specific value
    /// </summary>
    private float GetRotationForValue(int value)
    {
        // Calculate rotation (divide the full rotation by the number of possible values)
        float valueRange = maxValue - minValue + 1;
        float degreesPerValue = 360f / valueRange;
        
        return value * degreesPerValue;
    }
}

/// <summary>
/// Matching symbols puzzle
/// </summary>
public class SymbolMatchingPuzzle : PuzzleBase
{
    [System.Serializable]
    public class SymbolPair
    {
        public InteractableSymbol symbolA;
        public InteractableSymbol symbolB;
        public bool isMatched = false;
    }
    
    [Header("Symbol Settings")]
    [SerializeField] private SymbolPair[] symbolPairs;
    [SerializeField] private float matchDelay = 1f;
    [SerializeField] private int maxActiveSymbols = 2;
    [SerializeField] private Material matchedMaterial;
    
    private List<InteractableSymbol> activeSymbols = new List<InteractableSymbol>();
    private bool isChecking = false;
    
    protected override bool CheckSolution()
    {
        foreach (SymbolPair pair in symbolPairs)
        {
            if (!pair.isMatched)
            {
                return false;
            }
        }
        
        return true;
    }
    
    protected override void ResetPuzzle()
    {
        solved = false;
        
        // Reset all symbol pairs
        foreach (SymbolPair pair in symbolPairs)
        {
            pair.isMatched = false;
            
            if (pair.symbolA != null)
            {
                pair.symbolA.ResetSymbol();
            }
            
            if (pair.symbolB != null)
            {
                pair.symbolB.ResetSymbol();
            }
        }
        
        // Clear active symbols
        activeSymbols.Clear();
        isChecking = false;
    }
    
    /// <summary>
    /// Called when a symbol is activated
    /// </summary>
    public void OnSymbolActivated(InteractableSymbol symbol)
    {
        if (solved || isChecking)
            return;
            
        // Add to active symbols
        if (!activeSymbols.Contains(symbol))
        {
            activeSymbols.Add(symbol);
        }
        
        // Check if we have the max number of active symbols
        if (activeSymbols.Count >= maxActiveSymbols)
        {
            StartCoroutine(CheckForMatch());
        }
    }
    
    /// <summary>
    /// Checks if active symbols match
    /// </summary>
    private IEnumerator CheckForMatch()
    {
        isChecking = true;
        
        // Wait for a moment
        yield return new WaitForSeconds(matchDelay);
        
        // Find if there's a matching pair
        SymbolPair matchedPair = null;
        foreach (SymbolPair pair in symbolPairs)
        {
            if (activeSymbols.Contains(pair.symbolA) && activeSymbols.Contains(pair.symbolB))
            {
                matchedPair = pair;
                break;
            }
        }
        
        // Process match result
        if (matchedPair != null)
        {
            // Found a match
            matchedPair.isMatched = true;
            
            // Mark symbols as matched
            if (matchedPair.symbolA != null)
            {
                matchedPair.symbolA.SetMatched(true, matchedMaterial);
            }
            
            if (matchedPair.symbolB != null)
            {
                matchedPair.symbolB.SetMatched(true, matchedMaterial);
            }
            
            // Check if puzzle is solved
            if (CheckSolution())
            {
                SolvePuzzle();
            }
        }
        else
        {
            // No match, reset active symbols
            foreach (InteractableSymbol symbol in activeSymbols)
            {
                symbol.ResetSymbol();
            }
        }
        
        // Clear active symbols
        activeSymbols.Clear();
        isChecking = false;
    }
}

/// <summary>
/// Interactive symbol for matching puzzles
/// </summary>
public class InteractableSymbol : InteractableBase
{
    [Header("Symbol Settings")]
    [SerializeField] private int symbolID;
    [SerializeField] private Material activeMaterial;
    [SerializeField] private Material inactiveMaterial;
    [SerializeField] private AudioClip activateSound;
    [SerializeField] private AudioClip matchSound;
    
    // Private variables
    private bool isActive = false;
    private bool isMatched = false;
    private SymbolMatchingPuzzle parentPuzzle;
    private AudioSource audioSource;
    
    protected override void Start()
    {
        base.Start();
        
        interactionPrompt = "Press E to reveal symbol";
        
        audioSource = GetComponent<AudioSource>();
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
        
        // Apply initial material
        if (objectRenderer != null)
        {
            objectRenderer.material = inactiveMaterial;
        }
        
        // Find parent puzzle
        parentPuzzle = GetComponentInParent<SymbolMatchingPuzzle>();
    }
    
    public override void Interact(GameObject interactor)
    {
        if (isMatched)
            return;
            
        ActivateSymbol();
    }
    
    /// <summary>
    /// Activates the symbol
    /// </summary>
    public void ActivateSymbol()
    {
        if (isMatched || isActive)
            return;
            
        isActive = true;
        
        // Apply active material
        if (objectRenderer != null && activeMaterial != null)
        {
            objectRenderer.material = activeMaterial;
        }
        
        // Play activate sound
        if (audioSource != null && activateSound != null)
        {
            audioSource.PlayOneShot(activateSound);
        }
        
        // Notify parent puzzle
        if (parentPuzzle != null)
        {
            parentPuzzle.OnSymbolActivated(this);
        }
    }
    
    /// <summary>
    /// Resets the symbol to inactive state
    /// </summary>
    public void ResetSymbol()
    {
        if (isMatched)
            return;
            
        isActive = false;
        
        // Apply inactive material
        if (objectRenderer != null && inactiveMaterial != null)
        {
            objectRenderer.material = inactiveMaterial;
        }
    }
    
    /// <summary>
    /// Sets the symbol as matched
    /// </summary>
    public void SetMatched(bool matched, Material matchMaterial)
    {
        isMatched = matched;
        
        if (matched)
        {
            // Apply matched material
            if (objectRenderer != null && matchMaterial != null)
            {
                objectRenderer.material = matchMaterial;
            }
            
            // Play match sound
            if (audioSource != null && matchSound != null)
            {
                audioSource.PlayOneShot(matchSound);
            }
        }
    }
    
    /// <summary>
    /// Gets the symbol ID for matching
    /// </summary>
    public int GetSymbolID()
    {
        return symbolID;
    }
}