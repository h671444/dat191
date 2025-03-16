// Initialize WebGazer when the page loads
window.onload = function() {
    // Start WebGazer
    webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener(handleGaze)
        .begin()
        .then(setupCalibration)
        .catch(err => console.error('Error initializing WebGazer:', err));
};

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
    
    // Show prediction points
    webgazer.showPredictionPoints(true);
    console.log('WebGazer is ready!');
}

// Basic styling for the gaze prediction dot
const style = document.createElement('style');
style.textContent = `
    #gazeDot {
        position: fixed;
        width: 10px;
        height: 10px;
        background: red;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999999;
    }
`;
document.head.appendChild(style); 