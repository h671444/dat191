let latestGazeData = null; // Stores the latest {x, y} gaze data

// --- Dwell Click Simulation Settings ---
const DWELL_TIME_MS = 2500; // Increased from 1500ms (2.5 seconds)
const DWELL_TARGET_SELECTOR = '.dwell-target'; // CSS selector for clickable elements
let dwellTarget = null; // The element currently being dwelled on
let dwellStartTime = null; // Timestamp when dwelling started on the current target
let dwellFrameRequest = null; // Stores the requestAnimationFrame ID
// --- End Dwell Click Settings ---

// Initialize WebGazer
async function initializeWebGazer() {
    try {
        if (typeof webgazer === "undefined") {
            console.error("WebGazer not loaded.");
            return;
        }
        console.log("Starting WebGazer...");
        await webgazer.setRegression('ridge')
            .setTracker('TFFacemesh')
            .showPredictionPoints(false)
            .begin();
        
        const gazeDot = document.getElementById('gazeDot');
        
        webgazer.setGazeListener(function(data, clock) {
            // We only need the latest gaze data for the dwell check loop
            latestGazeData = data;
            
            // Update the dot position (visual feedback for gaze location)
            if (gazeDot && data) {
                gazeDot.style.display = 'block';
                gazeDot.style.left = data.x + 'px';
                gazeDot.style.top = data.y + 'px';
            } else if (gazeDot) {
                 gazeDot.style.display = 'none';
            }
        });

        // Start the dwell monitoring loop once WebGazer is ready
        if (dwellFrameRequest === null) { // Ensure it only starts once
             monitorDwell();
             console.log('WebGazer initialized. Dwell-click monitoring started.');
        }

    } catch (err) {
        console.error('Failed to initialize WebGazer:', err);
    }
}

// --- Dwell Click Monitoring Loop ---
function monitorDwell() {
    // Get the latest prediction data (might be null if tracking lost)
    // Using getCurrentPrediction() might also work if setGazeListener isn't fast enough, 
    // but latestGazeData from the listener is usually fine.
    const prediction = latestGazeData; 

    const gazeDot = document.getElementById('gazeDot'); // Get dot for visual feedback

    if (!prediction) {
        // No prediction, reset dwell state
        resetDwellState(gazeDot);
        dwellFrameRequest = requestAnimationFrame(monitorDwell); // Keep the loop running
        return;
    }

    const { x, y } = prediction;
    let currentTarget = null;

    // Find all potential target elements on the page
    const potentialTargets = document.querySelectorAll(DWELL_TARGET_SELECTOR);

    // Check if gaze is inside any potential target
    for (const target of potentialTargets) {
        const rect = target.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            currentTarget = target;
            break; // Found the topmost target under gaze
        }
    }

    if (currentTarget) {
        // --- Gaze is inside a target element ---
        if (currentTarget === dwellTarget) {
            // Still dwelling on the same target
            const elapsedTime = Date.now() - dwellStartTime;
            
            // Visual Feedback: Update dwell progress (e.g., change dot size/color)
            updateDwellFeedback(gazeDot, elapsedTime, DWELL_TIME_MS);

            if (elapsedTime >= DWELL_TIME_MS) {
                // Dwell time threshold reached!
                console.log(`Dwell-Click Triggered on:`, currentTarget);
                
                // --- Special Handling for Game Cards ---
                if (currentTarget.classList.contains('game-card')) {
                    const link = currentTarget.querySelector('a');
                    if (link && link.href) {
                        console.log(`Navigating to: ${link.href}`);
                        window.location.href = link.href; // Navigate to the link's destination
                    } else {
                        console.warn('Game card clicked, but no link found inside.');
                    }
                } else {
                    // --- Default Click Behaviour for other targets ---
                     currentTarget.click(); // Simulate the click for other elements
                }
                // --- End Special Handling ---
                
                resetDwellState(gazeDot);
            }
        } else {
            // Switched to a new target
            resetDwellState(gazeDot);
            dwellTarget = currentTarget;
            dwellStartTime = Date.now();
            console.log(`Dwelling started on:`, currentTarget);
            // Initial visual feedback
             updateDwellFeedback(gazeDot, 0, DWELL_TIME_MS);
        }
    } else {
        // --- Gaze is not inside any target element ---
        resetDwellState(gazeDot);
    }

    // Continue the loop
    dwellFrameRequest = requestAnimationFrame(monitorDwell);
}

function resetDwellState(gazeDot) {
    if (dwellTarget) {
         console.log(`Dwelling stopped on:`, dwellTarget);
    }
    dwellTarget = null;
    dwellStartTime = null;
    // Reset visual feedback
    if (gazeDot) {
        gazeDot.style.transform = 'translate(-50%, -50%) scale(1)'; // Reset size/scale
        gazeDot.style.backgroundColor = 'red'; // Reset color
    }
}

function updateDwellFeedback(gazeDot, elapsedTime, totalTime) {
    if (!gazeDot) return;
    const progress = Math.min(elapsedTime / totalTime, 1); // 0 to 1
    
    // Example: Change color and scale
    gazeDot.style.backgroundColor = `rgba(0, 255, 0, ${0.5 + progress * 0.5})`; // Fade to green
    gazeDot.style.transform = `translate(-50%, -50%) scale(${1 + progress * 0.5})`; // Grow slightly
}
// --- End Dwell Click Monitoring ---

// Initialize WebGazer automatically when the script loads
initializeWebGazer(); 