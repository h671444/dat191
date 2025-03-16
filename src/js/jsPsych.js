// Initialize jsPsych with the WebGazer extension
const jsPsych = initJsPsych({
    extensions: [
        { type: jsPsychExtensionWebgazer }
    ],
    on_finish: function() {
        // Store calibration state
        const calibrationData = webgazer.getRegression();
        if (calibrationData) {
            localStorage.setItem('webgazerGlobalData', JSON.stringify(calibrationData));
        }
        
        // Redirect to game hub
        try {
            window.location.replace('../index.html');
        } catch (e) {
            console.error('Redirect failed:', e);
            window.location.href = '../index.html';
        }
    }
});

// Define welcome message
const welcome = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h1>Øyesporing oppsett</h1>
        <p>Før du får tilgang til spillobbyen, må vi kalibrere øyesporingen.</p>
        <p>Dette vil hjelpe oss med å spore øyebevegelsene dine.</p>
        <p>Trykk på en tast for å begynne.</p>
    `
};

// Camera initialization with custom text
const init_camera = {
    type: jsPsychWebgazerInitCamera,
    instructions: `
        <p>For å aktivere øyesporing trenger vi tilgang til webkameraet ditt.</p>
        <p>Vennligst plasser ansiktet ditt i midten av kamera slik at boksen lyser grønt.</p>
        <p>Klikk på "Tillat" når nettleseren ber om tilgang til kameraet ditt.</p>
    `
};

// Calibration points setup with custom text
const calibration = {
    type: jsPsychWebgazerCalibrate,
    calibration_points: [
        [25, 25], [75, 25], [50, 50], [25, 75], [75, 75]
    ],
    calibration_mode: 'click',
    repetitions_per_point: 2,
    randomize_calibration_order: true,
    instructions: `
        <p>Nå skal vi kalibrere øyesporingen.</p>
        <p>Det vil dukke opp flere punkter på skjermen.</p>
        <p>Se på hvert punkt og klikk på det med musen.</p>
        <p>Vær så nøyaktig som mulig.</p>
    `
};

// Validation points setup with custom text
const validation = {
    type: jsPsychWebgazerValidate,
    validation_points: [
        [25, 25], [75, 25], [50, 50], [25, 75], [75, 75]
    ],
    validation_duration: 2000,
    show_validation_data: true,
    instructions: `
        <p>Nå skal vi teste hvor nøyaktig kalibreringen er.</p>
        <p>Se på hvert punkt som dukker opp på skjermen.</p>
        <p>Du trenger ikke å klikke - bare følg punktet med øynene dine.</p>
    `
};

// Final message before redirect
const final_message = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <h1>Oppsett fullført!</h1>
        <p>Øyesporing er nå kalibrert.</p>
        <p>Du vil nå bli videresendt til spillobbyen.</p>
        <p>Trykk på en tast for å fortsette.</p>
    `
};

// Create the init timeline
const timeline = [];
timeline.push(welcome);
timeline.push(init_camera);
timeline.push(calibration);
timeline.push(validation);
timeline.push(final_message);

// Run the experiment
jsPsych.run(timeline);
  