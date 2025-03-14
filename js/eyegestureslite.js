window.onload = () => {
    function onPoint(point,calibration){
        point[0]; // x
        point[1]; // y
        calibration; // true - for calibrated data, false if calibration is ongoing
    };
    
    const gestures = new EyeGestures('video', onPoint);
    // gestures.invisible(); // to disable blue tracker
    gestures.start();
}