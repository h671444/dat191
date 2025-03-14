window.onload = () => {
    console.log("Initializing GazeCloudAPI...");

    GazeCloudAPI.OnCalibrationComplete = function () {
        console.log("Calibration complete! Eye tracking started.");
    };

    GazeCloudAPI.OnResult = function (GazeData) {
        // GazeData.state: 0 = valid data; -1 = face tracking lost; 1 = uncalibrated
        if (GazeData.state === 0) {
            let x = GazeData.docX; // Gaze X-coordinate in document
            let y = GazeData.docY; // Gaze Y-coordinate in document

            console.log(`Gaze Position: X=${x}, Y=${y}`);

            // Move the gaze indicator
            let gazeDot = document.getElementById("gazeDot");
            if (gazeDot) {
                gazeDot.style.left = `${x}px`;
                gazeDot.style.top = `${y}px`;
            }
        } else {
            console.log("Gaze data not valid. State:", GazeData.state);
        }
    };

    GazeCloudAPI.OnCamDenied = function () {
        console.log("Camera access denied.");
    };

    GazeCloudAPI.OnError = function (msg) {
        console.log("Error:", msg);
    };

    // Start eye tracking
    GazeCloudAPI.StartEyeTracking();
};
