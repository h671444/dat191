let latestGazeData = null; // Stores the latest {x, y} gaze data

// Gaze Dot Smoothing Variables
let dotTargetX = null;
let dotTargetY = null;
let dotCurrentX = null;
let dotCurrentY = null;
const DOT_SMOOTHING_FACTOR = 0.1; // Lower is smoother
let dotUpdateLoopId = null;

// Dwell Click Simulation Settings
const DWELL_TIME = 1500; // Milliseconds needed to trigger click
const DWELL_INDICATOR_COLOR = 'rgba(0, 255, 0, 0.6)';
const DWELL_HYSTERESIS_MARGIN = 30;
let dwellStartTime = null;
let lastDwellElement = null;

// Initialize WebGazer
async function initializeWebGazer() {
    try {
        if (typeof webgazer === "undefined") {
            //console.error("WebGazer library not loaded.");
            return;
        }
        await webgazer.setRegression('ridge')
            .setTracker('TFFacemesh')
            .showPredictionPoints(false)
            .showVideoPreview(false)
            .saveDataAcrossSessions(true)
            .begin();

        // Stop new click recalibration
        if (webgazer && webgazer.params) {
            webgazer.params.useClickRecalibration = false;
        }

        // Remove original click event listener
        if (webgazer.params && webgazer.params.events && webgazer.params.events.click) {
            window.removeEventListener('click', webgazer.params.events.click);
        }

        // Start the dot update loop
        if (dotUpdateLoopId === null) {
            updateGazeDotPosition();
        }

        webgazer.setGazeListener(function(data, clock) {
            latestGazeData = data; // Store latest raw data
            // Update target position for smooth dot
            if (data) {
                dotTargetX = data.x;
                dotTargetY = data.y;
                // Initialize current position if first data point
                if (dotCurrentX === null) {
                    dotCurrentX = data.x;
                    dotCurrentY = data.y;
                }
            }
        });
        
        //console.log('WebGazer initialized and listener set.');

    } catch (err) {
        //console.error('Failed to initialize WebGazer:', err);
    }
}

// Initialize WebGazer automatically
initializeWebGazer();

// Gaze Dot Update and Dwell Logic Loop
function updateGazeDotPosition() {
    const gazeDot = document.getElementById('gazeDot');

    if (dotTargetX !== null && dotTargetY !== null && gazeDot) {
        // Interpolate current dot position towards target
        dotCurrentX += (dotTargetX - dotCurrentX) * DOT_SMOOTHING_FACTOR;
        dotCurrentY += (dotTargetY - dotCurrentY) * DOT_SMOOTHING_FACTOR;

        // Update dot's visual style
        gazeDot.style.display = 'block';
        gazeDot.style.left = dotCurrentX + 'px';
        gazeDot.style.top = dotCurrentY + 'px';

        // --- Dwell Click Logic with Hysteresis ---
        let elementUnderGaze = document.elementFromPoint(dotCurrentX, dotCurrentY);
        let dwellTargetElement = null;
        if (elementUnderGaze) {
            dwellTargetElement = elementUnderGaze.closest('[data-gaze-interactive="true"]');
        }

        if (lastDwellElement && dwellStartTime) {
            // Timer active: Check if gaze is still within hysteresis bounds
            const rect = lastDwellElement.getBoundingClientRect();
            const isWithinHysteresis = (
                dotCurrentX >= rect.left - DWELL_HYSTERESIS_MARGIN &&
                dotCurrentX <= rect.right + DWELL_HYSTERESIS_MARGIN &&
                dotCurrentY >= rect.top - DWELL_HYSTERESIS_MARGIN &&
                dotCurrentY <= rect.bottom + DWELL_HYSTERESIS_MARGIN
            );

            if (isWithinHysteresis) {
                // Still within tolerance: Check dwell time
                const elapsedTime = Date.now() - dwellStartTime;
                drawDwellIndicator(lastDwellElement, elapsedTime / DWELL_TIME);

                if (elapsedTime >= DWELL_TIME) {
                    // --- Handle Dwell Completion ---
                    if (lastDwellElement.classList.contains('game-card')) {
                        // Special handling for game cards: navigate link
                        const link = lastDwellElement.querySelector('a');
                        if (link && link.href) {
                            //console.log(`Dwell: Navigating to game card link: ${link.href}`);
                            window.location.href = link.href;
                        }
                    } else {
                        // Default behavior: simulate click
                        //console.log("Dwell: Simulating click on:", lastDwellElement);
                        lastDwellElement.click();
                    }
                    // --- End Dwell Completion Handling ---
                    clearDwellState(); // Reset after action
                }
            } else {
                // Moved outside hysteresis bounds: Reset
                clearDwellState();
            }
        } else {
            // Timer inactive: Check if gaze ENTERED a new interactive element
            if (dwellTargetElement) {
                lastDwellElement = dwellTargetElement;
                dwellStartTime = Date.now();
                drawDwellIndicator(lastDwellElement, 0);
            } else {
                // Gaze is not over an interactive element
                clearDwellState(); 
            }
        }
        // --- End Dwell Click Logic ---

    } else if (gazeDot) {
        // Hide dot if no target data
        gazeDot.style.display = 'none';
        clearDwellState(); 
    }

    // Request next frame
    dotUpdateLoopId = requestAnimationFrame(updateGazeDotPosition);
}

// Dwell Indicator Functions

function clearDwellState() {
    if (lastDwellElement) {
        removeDwellIndicator(lastDwellElement);
        lastDwellElement = null;
    }
    dwellStartTime = null;
}

function drawDwellIndicator(element, progress) {
    const gazeDot = document.getElementById('gazeDot');
    if (gazeDot) {
        gazeDot.style.backgroundColor = `rgba(0, 255, 0, ${0.4 + progress * 0.5})`; // Fade to green
        gazeDot.style.transform = `translate(-50%, -50%) scale(${1 + progress * 0.5})`; // Grow slightly
        gazeDot.style.transition = 'transform 0.1s ease-out, background-color 0.1s ease-out';
    }
}

function removeDwellIndicator(element) {
    const gazeDot = document.getElementById('gazeDot');
    if (gazeDot) {
        gazeDot.style.transform = 'translate(-50%, -50%) scale(1)';
        gazeDot.style.backgroundColor = 'rgba(255, 0, 0, 0.8)'; // Back to default red
        gazeDot.style.transition = 'none'; // Snap back
    }
}

// --- REMOVED: Simple Mouse Move Logger ---
/*
window.addEventListener('mousemove', function(event) {
    // Log mouse coordinates sparsely to avoid flooding the console
    // We can use a simple debounce/throttle technique if needed, but let's start simple
    // console.log(`Mouse moved to: X=${event.clientX}, Y=${event.clientY}`); 
    // ^ Commented out by default to avoid flooding, uncomment if needed for testing
}, false);
*/ 