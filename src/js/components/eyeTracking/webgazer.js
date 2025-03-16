// Initialize WebGazer when the page loads
window.onload = function() {
    initializeWebGazer();
};

// Make sure WebGazer is available before initializing
function initializeWebGazer() {
    if (typeof webgazer === 'undefined') {
        console.error('WebGazer library not loaded');
        return;
    }

    webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener(handleGaze)
        .showPredictionPoints(false)  // Disable WebGazer's built-in prediction points
        .begin()
        .then(setupCalibration)
        .catch(err => console.error('Error initializing WebGazer:', err));
}

function handleGaze(data, clock) {
    if (!data) return;
    
    // You can use the gaze data here
    // data.x contains the predicted x coordinate
    // data.y contains the predicted y coordinate
    
    // Optional: Visualize the prediction point
    const dot = document.getElementById('gazeDot'); // Eye tracking dot in the html document
    if (dot) {
        dot.style.display = 'block';
        dot.style.left = data.x + 'px';
        dot.style.top = data.y + 'px';
    }
}

function setupCalibration() {
    const savedData = localStorage.getItem('webgazerGlobalData');
    if (savedData) {
        try {
            const calibrationData = JSON.parse(savedData);
            webgazer.setRegression(calibrationData);
            console.log('Loaded saved calibration data');
        } catch (err) {
            console.error('Failed to load calibration:', err);
        }
    }
    
    console.log('WebGazer is ready!');
} 