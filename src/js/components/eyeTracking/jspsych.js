console.log("Clearing localStorage for fresh calibration...");
localStorage.clear();

// Initialize jsPsych with the WebGazer extension
const jsPsych = initJsPsych({
    extensions: [
        { 
            type: jsPsychExtensionWebgazer,
            params: { 
                save_data_across_sessions: true
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
             console.error("Error trying to stop jsPsych mouse calibration:", err);
        }
        
        // store calibration points before leaving page
        if (typeof webgazer !== 'undefined' && typeof webgazer.storePoints === 'function') {
            webgazer.storePoints(); 
        } else {
            // This might happen if webgazer failed to initialize
            console.warn("WebGazer or webgazer.storePoints() not available to save data.");
        }
        
        window.location.replace('index.html');
    }
});

// --- Timeline Setup --- 

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
    // can be 'view' or 'click'
    calibration_mode: 'view',
    repetitions_per_point: 1,
    randomize_calibration_order: true,
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
const timeline = [welcome, init_camera, calibration, validation, final_message];
jsPsych.run(timeline);
  