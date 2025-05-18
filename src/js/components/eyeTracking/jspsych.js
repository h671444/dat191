// localStorage.clear(); // Removed: selectUSBcamera.js handles fresh ID setting.

// Initialize jsPsych with the WebGazer extension
const jsPsych = initJsPsych({
    extensions: [
        { 
            type: jsPsychExtensionWebgazer,
            params: { 
                auto_initialize: false // Let WebGazer sleep until we open it later
            }
        }
    ],
    on_finish: async function() {
        // Stop mouse calibration influence via jsPsych extension if possible
        try {
            if (jsPsych.extensions.webgazer && typeof jsPsych.extensions.webgazer.stopMouseCalibration === 'function') {
                await jsPsych.extensions.webgazer.stopMouseCalibration();
            }
        } catch (err) {
             // console.error("Error trying to stop jsPsych mouse calibration:", err);
        }
        
        // store calibration points before leaving page
        if (typeof webgazer !== 'undefined' && typeof webgazer.storePoints === 'function') {
            webgazer.storePoints(); 
        } else {
            // console.warn("WebGazer or webgazer.storePoints() not available to save data.");
        }
        
        // Release the camera track before navigating
        if (typeof webgazer !== 'undefined' && typeof webgazer.endVideo === 'function') {
            try {
                console.log("[jspsych.js] Attempting to end video before navigating...");
                await webgazer.endVideo(); // free the camera
                console.log("[jspsych.js] Video ended.");
            } catch (e) {
                console.warn("[jspsych.js] Error calling webgazer.endVideo() on finish:", e);
            }
        }

        window.location.replace('index.html');
    }
});

const welcome = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <div class="calibration-text">
            <h1>Øyesporing oppsett</h1>
            <p>Før du får tilgang til spillobbyen, må vi kalibrere øyesporingen.</p>
            <p>Dette vil hjelpe oss med å spore øyebevegelsene dine.</p>
            <p>Vennligst vent på at kalibreringen starter.</p>
        </div>
    `
};

/* 1 ── choose / confirm the correct camera once */
const pick_cam = {
  type: jsPsychInitializeCamera,
  // device_id: '9af0d43fa559598f92be014a2b3ac71999fd737558cb257626490d34414cff53', // Removed: selectUSBcamera.js should set it, or user picks

  async on_finish(d) {
    // d.device_id is from jsPsychInitializeCamera if UI was shown and user picked.
    // localStorage.getItem('selectedUSBdeviceId') is from our selectUSBcamera.js helper.
    const finalDeviceId = localStorage.getItem('selectedUSBdeviceId') || d.device_id;
    
    if (finalDeviceId) {
        console.log("[jspsych.js pick_cam.on_finish] Confirming constraints for deviceId:", finalDeviceId);
        await webgazer.setCameraConstraints({
          video: { deviceId: { exact: finalDeviceId } }
        });
    } else {
        console.warn("[jspsych.js pick_cam.on_finish] No deviceId available to set constraints.");
    }
    // No longer storing wgDeviceId here, selectUSBcamera.js handles setting selectedUSBdeviceId for index.html
  },

  instructions: `
    <div class="calibration-text">
            <p>Vennligst plasser ansiktet ditt i midten av kamera slik at boksen lyser grønt.</p>
            <p>Klikk på "Tillat" hvis nettleseren ber om tilgang til kameraet ditt.</p>
    </div>`
};

/* 2 ── WebGazer starts *after* constraints are set */
const init_camera = { 
    type: jsPsychWebgazerInitCamera,
    instructions: `
    <div class="calibration-text">
        <p>For å aktivere øyesporing trenger vi tilgang til webkameraet ditt.</p>
        <p>Vennligst plasser ansiktet ditt i midten av kamera slik at boksen lyser grønt.</p>
        <p>Klikk på "Tillat" hvis nettleseren ber om tilgang til kameraet ditt.</p>
    </div>
    `
};

// Calibration points in percentage [x, y]
const calibrationPoints = [
    [5, 5],    [50, 5],   [95, 5],
    [5, 50],   [50, 50],  [95, 50],
    [5, 95],   [50, 95],  [95, 95]
];

const calibration = {
    type: jsPsychWebgazerCalibrate,
    calibration_points: calibrationPoints,
    calibration_mode: 'view',
    repetitions_per_point: 1,
    randomize_calibration_order: false,
    time_to_saccade: 500,
    instructions: `
        <div class="calibration-text">
            <p>Nå skal vi kalibrere øyesporingen.</p>
            <p>Det vil dukke opp flere punkter på skjermen.</p>
            <p>Se på hvert punkt til punktet flytter seg.</p>
            <p>Vær så nøyaktig som mulig.</p>
        </div>
    `
};

const validation = {
    type: jsPsychWebgazerValidate,
    validation_points: calibrationPoints,
    validation_duration: 2000,
    show_validation_data: false, // Set to true for debugging calibration accuracy
    instructions: `
        <div class="calibration-text">
            <p>Nå skal vi teste hvor nøyaktig kalibreringen er.</p>
            <p>Se på hvert punkt som dukker opp på skjermen.</p>
            <p>Du trenger ikke å klikke - bare følg punktet med øynene dine.</p>
        </div>
    `
};

const final_message = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: ` 
        <div class="calibration-text">
            <h1>Oppsett fullført!</h1>
            <p>Øyesporing er nå kalibrert.</p>
            <p>Vennligst vent på at du blir videresendt til spillobbyen.</p>
        </div>
    `
};

// Build and run the timeline
const timeline = [welcome, pick_cam, init_camera, calibration, validation, final_message];
jsPsych.run(timeline);