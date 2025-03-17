using UnityEngine;

/// <summary>
/// Controls the player's movement, camera, and perspective switching
/// </summary>
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float walkSpeed = 5f;
    [SerializeField] private float sprintSpeed = 8f;
    [SerializeField] private float jumpForce = 5f;
    [SerializeField] private float crouchHeight = 0.5f;
    [SerializeField] private float standingHeight = 2f;
    [SerializeField] private float gravity = -9.81f;

    [Header("Camera Settings")]
    [SerializeField] private Camera playerCamera;
    [SerializeField] private float lookSensitivity = 2f;
    [SerializeField] private float lookSmoothing = 0.1f;
    [SerializeField] private float maxLookUpAngle = 80f;
    [SerializeField] private float maxLookDownAngle = 80f;
    
    [Header("Perspective Settings")]
    [SerializeField] private bool isFirstPerson = true;
    [SerializeField] private Vector3 thirdPersonCameraOffset = new Vector3(0, 2f, -5f);
    [SerializeField] private GameObject playerModel; // Visible only in third-person mode
    
    // Private variables
    private CharacterController characterController;
    private float currentSpeed;
    private Vector3 moveDirection = Vector3.zero;
    private Vector3 velocity = Vector3.zero;
    private float rotationX = 0;
    private float rotationY = 0;
    private Vector2 currentLookDelta = Vector2.zero;
    private Vector2 targetLookDelta = Vector2.zero;
    private bool isCrouching = false;
    private bool isGrounded = false;
    private float originalHeight;
    private Transform cameraTransform;
    
    private void Awake()
    {
        characterController = GetComponent<CharacterController>();
        originalHeight = characterController.height;
        
        if (playerCamera == null)
        {
            playerCamera = Camera.main;
        }
        
        cameraTransform = playerCamera.transform;
        
        // Hide cursor in play mode
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
        
        // Set initial perspective
        SetPerspective(isFirstPerson);
    }
    
    private void Update()
    {
        HandleInput();
        HandleMovement();
        HandleLook();
    }
    
    private void HandleInput()
    {
        // Sprint
        if (Input.GetKey(KeyCode.LeftShift))
        {
            currentSpeed = sprintSpeed;
        }
        else
        {
            currentSpeed = walkSpeed;
        }
        
        // Crouch
        if (Input.GetKeyDown(KeyCode.LeftControl))
        {
            isCrouching = !isCrouching;
            characterController.height = isCrouching ? crouchHeight : standingHeight;
            
            // Adjust camera position when crouching
            Vector3 cameraPos = cameraTransform.localPosition;
            cameraPos.y = isCrouching ? 0.5f : 1.6f;
            cameraTransform.localPosition = cameraPos;
        }
        
        // Jump
        if (Input.GetKeyDown(KeyCode.Space) && isGrounded)
        {
            velocity.y = Mathf.Sqrt(jumpForce * -2f * gravity);
        }
        
        // Toggle perspective
        if (Input.GetKeyDown(KeyCode.T))
        {
            isFirstPerson = !isFirstPerson;
            SetPerspective(isFirstPerson);
        }
    }
    
    private void HandleMovement()
    {
        // Check if grounded
        isGrounded = characterController.isGrounded;
        
        if (isGrounded && velocity.y < 0)
        {
            velocity.y = -2f; // Small negative value instead of zero for consistent grounding
        }
        
        // Get input direction
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        
        // Convert to movement vector
        Vector3 move = transform.right * horizontal + transform.forward * vertical;
        
        // Apply movement
        characterController.Move(move * currentSpeed * Time.deltaTime);
        
        // Apply gravity
        velocity.y += gravity * Time.deltaTime;
        characterController.Move(velocity * Time.deltaTime);
    }
    
    private void HandleLook()
    {
        // Get mouse input
        float mouseX = Input.GetAxis("Mouse X") * lookSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * lookSensitivity;
        
        // Smooth mouse input
        targetLookDelta = new Vector2(mouseX, mouseY);
        currentLookDelta = Vector2.Lerp(currentLookDelta, targetLookDelta, 1f / lookSmoothing);
        
        // Apply rotation based on perspective
        if (isFirstPerson)
        {
            // Vertical rotation (camera)
            rotationX -= currentLookDelta.y;
            rotationX = Mathf.Clamp(rotationX, -maxLookUpAngle, maxLookDownAngle);
            playerCamera.transform.localRotation = Quaternion.Euler(rotationX, 0, 0);
            
            // Horizontal rotation (player)
            rotationY += currentLookDelta.x;
            transform.rotation = Quaternion.Euler(0, rotationY, 0);
        }
        else
        {
            // In third person, rotate entire player
            rotationY += currentLookDelta.x;
            transform.rotation = Quaternion.Euler(0, rotationY, 0);
            
            // Adjust camera position
            Vector3 desiredPosition = transform.position + transform.TransformDirection(thirdPersonCameraOffset);
            
            // Check for obstacles between player and camera
            RaycastHit hit;
            if (Physics.Linecast(transform.position, desiredPosition, out hit))
            {
                playerCamera.transform.position = hit.point;
            }
            else
            {
                playerCamera.transform.position = desiredPosition;
            }
            
            // Look at player
            playerCamera.transform.LookAt(transform.position + Vector3.up * 1.5f);
        }
    }
    
    private void SetPerspective(bool firstPerson)
    {
        // Configure based on perspective mode
        if (firstPerson)
        {
            // First-person setup
            playerCamera.transform.localPosition = new Vector3(0, 1.6f, 0);
            playerCamera.transform.localRotation = Quaternion.identity;
            
            // Hide player model in first person
            if (playerModel != null)
            {
                playerModel.SetActive(false);
            }
        }
        else
        {
            // Third-person setup
            playerCamera.transform.position = transform.position + transform.TransformDirection(thirdPersonCameraOffset);
            playerCamera.transform.LookAt(transform.position + Vector3.up * 1.5f);
            
            // Show player model in third person
            if (playerModel != null)
            {
                playerModel.SetActive(true);
            }
        }
    }
}
