const VOSK_SERVER_URL = "ws://localhost:8765"; // Make sure this matches your server
const VOSK_BUFFER_SIZE = 4096;

const toggleButton = document.getElementById('toggleButton');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');

let websocket = null;
let audioContext = null;
let microphoneStream = null;
let scriptProcessor = null;
let isListening = false;

// --- Core Functions ---

function resampleBuffer(inputBuffer, targetSampleRate) {
    const inputData = inputBuffer.getChannelData(0); // Assuming mono audio
    const inputSampleRate = inputBuffer.sampleRate;

    if (inputSampleRate === targetSampleRate) {
        console.log("Input and target sample rates are the same. No resampling needed.");
        return inputData; // Return original data if rates match
    }

    console.log(`Resampling from ${inputSampleRate} Hz to ${targetSampleRate} Hz`);
    const outputLength = Math.floor(inputData.length * targetSampleRate / inputSampleRate);
    const outputData = new Float32Array(outputLength);
    const ratio = inputSampleRate / targetSampleRate;

    for (let i = 0; i < outputLength; i++) {
        const theoreticalIndex = i * ratio;
        const indexLow = Math.floor(theoreticalIndex);
        const indexHigh = Math.min(indexLow + 1, inputData.length - 1); // Clamp high index
        const weightHigh = theoreticalIndex - indexLow; // Weight for the higher index sample

        // Linear interpolation
        outputData[i] = inputData[indexLow] * (1 - weightHigh) + inputData[indexHigh] * weightHigh;
    }
    return outputData;
}

function updateStatus(message, isError = false) {
    console.log(`Status Update: ${message}`);
    statusDiv.textContent = `Status: ${message}`;
    statusDiv.style.color = isError ? 'red' : 'black';
}

function updateResults(command) {
    console.log(`Result Update: ${command}`);
    resultsDiv.textContent = `Last Command: ${command}`;
}

function startListening() {
    if (isListening) return;
    updateStatus('Starting...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        updateStatus("getUserMedia not supported", true);
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            microphoneStream = stream;
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume AudioContext if needed (important!)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            console.log('AudioContext Sample Rate:', audioContext.sampleRate);

            const source = audioContext.createMediaStreamSource(microphoneStream);
            scriptProcessor = audioContext.createScriptProcessor(VOSK_BUFFER_SIZE, 1, 1);

            let audioChunksSent = 0; // Counter for debugging

            scriptProcessor.onaudioprocess = (event) => {
                if (!websocket || websocket.readyState !== WebSocket.OPEN || !isListening) {
                    return; // Don't process if not ready or not listening
                }
    
                const inputBuffer = event.inputBuffer; // Get the audio buffer at original sample rate (e.g., 48kHz)
    
                // --- RESAMPLE THE AUDIO ---
                const targetSampleRate = 16000; // Vosk's expected rate
                const resampledData = resampleBuffer(inputBuffer, targetSampleRate); // Returns Float32Array at 16kHz
    
                // --- Convert RESAMPLED Float32Array to Int16Array ---
                const int16Data = new Int16Array(resampledData.length);
                for (let i = 0; i < resampledData.length; i++) {
                    int16Data[i] = Math.max(-32768, Math.min(32767, resampledData[i] * 32767));
                }
    
                // --- Send the RESAMPLED and converted data ---
                try {
                    // DEBUG: Log sending attempts (optional, can comment out if console gets too noisy)
                    // console.log(`Sending resampled audio chunk (length: ${int16Data.length})`);
                    if (int16Data.length > 0) { // Only send if there's data after resampling
                         websocket.send(int16Data.buffer);
                    }
                } catch (error) {
                    console.error("Error sending audio data:", error);
                    updateStatus(`Error sending audio: ${error.message}`, true);
                    stopListening(); // Stop on send error
                }
            }; // <-- End of the modified onaudioprocess function

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination); // Necessary for onaudioprocess to fire

            // --- Connect WebSocket ---
            updateStatus('Connecting WebSocket...');
            websocket = new WebSocket(VOSK_SERVER_URL);

            websocket.onopen = () => {
                isListening = true; // Only set isListening *after* WebSocket is open
                toggleButton.textContent = 'Stop Listening';
                updateStatus('Connected & Listening...');
                 // DEBUG: Confirm WebSocket is open
                 console.log("WebSocket OPEN");
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                     // DEBUG: Log raw message
                     console.log("Message received from server:", event.data);
                    if (data.command) {
                        updateResults(data.command);
                    } else if (data.partial) {
                        // Optionally display partial results
                         console.log("Partial result:", data.partial);
                         // statusDiv.textContent = `Status: Hearing... ${data.partial}`; // Example
                    }
                } catch (error) {
                    console.error("Error parsing message from server:", error);
                    updateStatus(`Error parsing server message: ${error.message}`, true);
                }
            };

            websocket.onerror = (error) => {
                console.error("WebSocket error:", error);
                updateStatus(`WebSocket Error (Check console)`, true);
                // Don't call stopListening here, onclose will handle cleanup
            };

            websocket.onclose = (event) => {
                console.log("WebSocket connection closed:", event.code, event.reason);
                updateStatus(`WebSocket Closed: ${event.reason || 'Normal closure'} (${event.code})`, !event.wasClean);
                 // Ensure cleanup happens reliably on close
                 if (isListening) { // Prevent calling stop if already stopped manually
                    stopListeningCleanup();
                 }
            };

        })
        .catch(err => {
            console.error("Error accessing microphone:", err);
            updateStatus(`Microphone Error: ${err.message}`, true);
            alert("Could not access microphone. Please grant permission and ensure it's connected.");
            stopListeningCleanup(); // Ensure cleanup if mic fails
        });
}

// Performs the actual cleanup steps
function stopListeningCleanup() {
    isListening = false; // Ensure flag is set immediately

    if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
        console.log("ScriptProcessor disconnected");
    }
    // It's important to stop tracks *before* closing AudioContext
    if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
        console.log("Microphone stream stopped");
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().then(() => console.log("AudioContext closed"));
        audioContext = null;
    }
    if (websocket) {
         // Check readyState before closing, as onclose might trigger this cleanup
        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
            websocket.close();
             console.log("WebSocket closed");
        }
        websocket = null; // Clear reference
    }

    toggleButton.textContent = 'Start Listening';
    // Don't overwrite error status if stop was triggered by error
    if (!statusDiv.textContent.includes('Error') && !statusDiv.textContent.includes('Closed')) {
         updateStatus('Idle');
    }
     // Clear results when stopping
     updateResults('---');
}

// Public function called by button/event handlers
function stopListening() {
    if (!isListening && !microphoneStream && !websocket) { // Check if already stopped/idle
         console.log("Already stopped or idle.");
        return;
    }
    console.log("Stop Listening requested...");
    updateStatus('Stopping...');
    stopListeningCleanup();
}


// --- Event Listeners ---
toggleButton.addEventListener('click', () => {
    if (!isListening) {
        startListening();
    } else {
        stopListening();
    }
});

// Optional: Stop recognition if the page is closed/navigated away
window.addEventListener('beforeunload', () => {
    if (isListening) {
        stopListening();
    }
});