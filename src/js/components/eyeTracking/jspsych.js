// Initialize jsPsych with the WebGazer extension
const jsPsych = initJsPsych({
    extensions: [
        { type: jsPsychExtensionWebgazer }
    ],
    on_finish: function() {
        // Skip storage completely and force redirect
        window.location.replace('index.html');
    }
});

// caligration welcome message
const welcome = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <div class="calibration-text">
            <h1>Øyesporing oppsett</h1>
            <p>Før du får tilgang til spillobbyen, må vi kalibrere øyesporingen.</p>
            <p>Dette vil hjelpe oss med å spore øyebevegelsene dine.</p>
            <p>Trykk på en tast for å begynne.</p>
        </div>
    `
};

// camera initialization
const init_camera = {
    type: jsPsychWebgazerInitCamera,
    instructions: `
        <div class="calibration-text">
            <p>For å aktivere øyesporing trenger vi tilgang til webkameraet ditt.</p>
            <p>Vennligst plasser ansiktet ditt i midten av kamera slik at boksen lyser grønt.</p>
            <p>Klikk på "Tillat" når nettleseren ber om tilgang til kameraet ditt.</p>
        </div>
    `
};

// calibration points
const calibrationPoints = [
    [10, 10],    // Top-left corner
    [50, 10],    // Top middle
    [90, 10],    // Top-right corner
    [10, 50],    // Middle left
    [50, 50],    // Center
    [90, 50],    // Middle right
    [10, 90],    // Bottom-left corner
    [50, 90],    // Bottom middle
    [90, 90]     // Bottom-right corner
];

// Calibration points setup with custom text
const calibration = {
    type: jsPsychWebgazerCalibrate,
    calibration_points: calibrationPoints,
    calibration_mode: 'click',
    repetitions_per_point: 1,
    randomize_calibration_order: true,
    instructions: `
        <div class="calibration-text">
            <p>Nå skal vi kalibrere øyesporingen.</p>
            <p>Det vil dukke opp flere punkter på skjermen.</p>
            <p>Se på hvert punkt og klikk på det med musen.</p>
            <p>Vær så nøyaktig som mulig.</p>
        </div>
    `
};

// validation points setup with custom text
const validation = {
    type: jsPsychWebgazerValidate,
    validation_points: calibrationPoints,
    validation_duration: 2000,
    show_validation_data: true,
    instructions: `
        <div class="calibration-text">
            <p>Nå skal vi teste hvor nøyaktig kalibreringen er.</p>
            <p>Se på hvert punkt som dukker opp på skjermen.</p>
            <p>Du trenger ikke å klikke - bare følg punktet med øynene dine.</p>
        </div>
    `
};

// final message before redirect
const final_message = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <div class="calibration-text">
            <h1>Oppsett fullført!</h1>
            <p>Øyesporing er nå kalibrert.</p>
            <p>Du vil nå bli videresendt til spillobbyen.</p>
            <p>Trykk på en tast for å fortsette.</p>
        </div>
    `
};

// create the init timeline
const timeline = [];
timeline.push(welcome);
timeline.push(init_camera);
timeline.push(calibration);
timeline.push(validation);
timeline.push(final_message);

// run the program
jsPsych.run(timeline);
  