window.onload = function() {
    webgazer.setGazeListener(function(data, elapsedTime) {
        if (data) {
            console.log("Gaze X: " + data.x + " Y: " + data.y);
        }
    }).begin();
};