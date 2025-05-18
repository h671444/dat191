let latestGazeData = null; // Stores the latest {x, y} gaze data

// gazeDot smoothing variables
let dotTargetX = null;
let dotTargetY = null;
let dotCurrentX = null;
let dotCurrentY = null;
const DOT_SMOOTHING_FACTOR = 0.1; // Lower is smoother
let dotUpdateLoopId = null;

// dwell click simulation settings
const DWELL_TIME = 1500; 
const DWELL_INDICATOR_COLOR = 'rgba(0, 255, 0, 0.6)';
const DWELL_HYSTERESIS_MARGIN = 30;
let dwellStartTime = null;
let lastDwellElement = null;

async function initializeWebGazer() {
    console.log("[webgazer.js] Attempting to initialize WebGazer on this page...");
    try {
        if (typeof webgazer === "undefined") {
            console.error("[webgazer.js] WebGazer library not loaded.");
            return;
        }

        if (typeof webgazer.getCameraConstraints === 'function') {
            const currentConstraints = webgazer.getCameraConstraints();
            console.log("[webgazer.js] Current camera constraints at start of initializeWebGazer:", currentConstraints);
        } else {
            console.log("[webgazer.js] webgazer.getCameraConstraints is not a function at start.");
        }
        if (typeof webgazer.isReady === 'function') {
            console.log("[webgazer.js] webgazer.isReady() at start of initializeWebGazer:", webgazer.isReady());
        }

        // selectUSBcamera.js
        console.log("[webgazer.js] Assuming selectUSBcamera.js has set constraints. Proceeding to begin().");

        console.log("[webgazer.js] Calling webgazer.begin()..."); 
        await webgazer.setRegression('ridge')
            .setTracker('TFFacemesh')
            .showPredictionPoints(false)
            .showVideoPreview(true) //
            .saveDataAcrossSessions(true) 
            .begin()
            .catch(err => {
                console.error('[webgazer.js] WebGazer failed to begin:', err);
            });

        // stop new click recalibration
        if (webgazer && webgazer.params) {
            webgazer.params.useClickRecalibration = false;
        }

        // remove original click event listener
        if (webgazer.params && webgazer.params.events && webgazer.params.events.click) {
            window.removeEventListener('click', webgazer.params.events.click);
        }

        if (dotUpdateLoopId === null) {
            updateGazeDotPosition();
        }

        webgazer.setGazeListener(function(data, clock) {
            latestGazeData = data; 
            if (data) {
                let mirroredX = window.innerWidth - data.x;
                dotTargetX = mirroredX;
                dotTargetY = data.y;

                if (dotCurrentX === null) {
                    dotCurrentX = mirroredX;
                    dotCurrentY = data.y;
                }
            }
        });
        
        console.log("[webgazer.js] WebGazer initialization flow complete. Listener set.");

    } catch (err) {
        console.error('[webgazer.js] General error in initializeWebGazer:', err);
    }
}

initializeWebGazer();

function updateGazeDotPosition() {
    const gazeDot = document.getElementById('gazeDot');

    if (dotTargetX !== null && dotTargetY !== null && gazeDot) {
        // Interpolate current dot position towards target
        dotCurrentX += (dotTargetX - dotCurrentX) * DOT_SMOOTHING_FACTOR;
        dotCurrentY += (dotTargetY - dotCurrentY) * DOT_SMOOTHING_FACTOR;

        gazeDot.style.display = 'block';
        gazeDot.style.left = dotCurrentX + 'px';
        gazeDot.style.top = dotCurrentY + 'px';

        // Use unmirrored X for hit-testing
        let hitTestX = window.innerWidth - dotCurrentX;
        let elementUnderGaze = document.elementFromPoint(hitTestX, dotCurrentY);
        let dwellTargetElement = null;
        if (elementUnderGaze) {
            dwellTargetElement = elementUnderGaze.closest('[data-gaze-interactive="true"]');
        }

        if (lastDwellElement && dwellStartTime) {
            // check if gaze is still within hysteresis bounds
            const rect = lastDwellElement.getBoundingClientRect();
            let dwellTestX = window.innerWidth - dotCurrentX;
            const isWithinHysteresis = (
                dwellTestX >= rect.left - DWELL_HYSTERESIS_MARGIN &&
                dwellTestX <= rect.right + DWELL_HYSTERESIS_MARGIN &&
                dotCurrentY >= rect.top - DWELL_HYSTERESIS_MARGIN &&
                dotCurrentY <= rect.bottom + DWELL_HYSTERESIS_MARGIN
            );

            if (isWithinHysteresis) {
                // check dwell time
                const elapsedTime = Date.now() - dwellStartTime;
                drawDwellIndicator(lastDwellElement, elapsedTime / DWELL_TIME);

                if (elapsedTime >= DWELL_TIME) {

                    if (lastDwellElement.classList.contains('game-card')) {
                        // handling for game cards
                        const link = lastDwellElement.querySelector('a');
                        if (link && link.href) {
                            //console.log(`Dwell: Navigating to game card link: ${link.href}`);
                            window.location.href = link.href;
                        }
                    } else {
                        //console.log("Dwell: Simulating click on:", lastDwellElement);
                        lastDwellElement.click();
                    }
                    clearDwellState(); 
                }
            } else {
                clearDwellState();
            }
        } else {
            // check if gaze ENTERED a new interactive element
            if (dwellTargetElement) {
                lastDwellElement = dwellTargetElement;
                dwellStartTime = Date.now();
                drawDwellIndicator(lastDwellElement, 0);
            } else {
                // gaze is not over an interactive element
                clearDwellState(); 
            }
        }

    } else if (gazeDot) {
        // hide dot if no target data
        gazeDot.style.display = 'none';
        clearDwellState(); 
    }

    // request next frame
    dotUpdateLoopId = requestAnimationFrame(updateGazeDotPosition);
}

// dwell indicator functions

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
        gazeDot.style.backgroundColor = `rgba(0, 255, 0, ${0.4 + progress * 0.5})`; 
        gazeDot.style.transform = `translate(-50%, -50%) scale(${1 + progress * 0.5})`; 
        gazeDot.style.transition = 'transform 0.1s ease-out, background-color 0.1s ease-out';
    }
}

function removeDwellIndicator(element) {
    const gazeDot = document.getElementById('gazeDot');
    if (gazeDot) {
        gazeDot.style.transform = 'translate(-50%, -50%) scale(1)';
        gazeDot.style.backgroundColor = 'rgba(255, 0, 0, 0.8)'; 
        gazeDot.style.transition = 'none'; 
    }
}