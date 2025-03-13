// Function to apply safe area insets for notched devices
function applySafeAreaInsets() {
    // Check if the browser supports safe area insets
    const hasSafeArea = CSS.supports('padding-top: env(safe-area-inset-top)') || 
                         CSS.supports('padding-top: constant(safe-area-inset-top)');
    
    if (!hasSafeArea) return;
    
    // Create a style element to add the CSS
    const style = document.createElement('style');
    
    // CSS rules to handle safe areas
    style.textContent = `
        @supports (padding-top: env(safe-area-inset-top)) or 
                  (padding-top: constant(safe-area-inset-top)) {
            
            body {
                /* Padding for the safe area */
                padding-top: env(safe-area-inset-top, 0);
                padding-left: env(safe-area-inset-left, 0);
                padding-right: env(safe-area-inset-right, 0);
                padding-bottom: env(safe-area-inset-bottom, 0);
            }
            
            /* Adjust UI elements to avoid safe areas */
            #healthDisplay, #scoreDisplay, #weaponDisplay {
                padding-left: calc(10px + env(safe-area-inset-left, 0));
            }
            
            #minimap {
                padding-right: calc(10px + env(safe-area-inset-right, 0));
            }
            
            /* Adjust mobile controls for safe areas */
            .mobile-controls .joystick.movement-joystick {
                left: calc(20px + env(safe-area-inset-left, 0));
                bottom: calc(20px + env(safe-area-inset-bottom, 0));
            }
            
            .mobile-controls .action-buttons {
                right: calc(20px + env(safe-area-inset-right, 0));
                bottom: calc(20px + env(safe-area-inset-bottom, 0));
            }
        }
    `;
    
    // Add the style to the head
    document.head.appendChild(style);
    
    console.log("Safe area insets applied for notched devices");
}

// Call this function early in the initialization process
document.addEventListener('DOMContentLoaded', applySafeAreaInsets);

// Add it to the window object so it can be called from elsewhere if needed
window.applySafeAreaInsets = applySafeAreaInsets;