const VOSK_SERVER_URL = "w";
const VOSK_BUFFER_SIZE = 4096;

const toggleButton = document.getElementById('toggleButton');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');

let websocket = null;
let audioContext = null;
let microphoneStream = null;
let scriptProcessor = null;
let isListening = false;



function resampleBuffer(inputBuffer, targetSampleRate) {
    const inputData = inputBuffer.getChannelData(0); 
    const inputSampleRate = inputBuffer.sampleRate;

    if (inputSampleRate === targetSampleRate) {
        console.log("Input and target sample rates are the same. No resampling needed.");
        return inputData; 
    }

    console.log(`Resampling from ${inputSampleRate} Hz to ${targetSampleRate} Hz`);
    const outputLength = Math.floor(inputData.length * targetSampleRate / inputSampleRate);
    const outputData = new Float32Array(outputLength);
    const ratio = inputSampleRate / targetSampleRate;

    for (let i = 0; i < outputLength; i++) {
        const theoreticalIndex = i * ratio;
        const indexLow = Math.floor(theoreticalIndex);
        const indexHigh = Math.min(indexLow + 1, inputData.length - 1); 
        const weightHigh = theoreticalIndex - indexLow; 

        
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

            
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            console.log('AudioContext Sample Rate:', audioContext.sampleRate);

            const source = audioContext.createMediaStreamSource(microphoneStream);
            scriptProcessor = audioContext.createScriptProcessor(VOSK_BUFFER_SIZE, 1, 1);

            let audioChunksSent = 0; 

            scriptProcessor.onaudioprocess = (event) => {
                if (!websocket || websocket.readyState !== WebSocket.OPEN || !isListening) {
                    return; 
                }
    
                const inputBuffer = event.inputBuffer; 
    
                
                const targetSampleRate = 16000; 
                const resampledData = resampleBuffer(inputBuffer, targetSampleRate); 
    
                
                const int16Data = new Int16Array(resampledData.length);
                for (let i = 0; i < resampledData.length; i++) {
                    int16Data[i] = Math.max(-32768, Math.min(32767, resampledData[i] * 32767));
                }
    
                
                try {
                    
                    
                    if (int16Data.length > 0) { 
                         websocket.send(int16Data.buffer);
                    }
                } catch (error) {
                    console.error("Error sending audio data:", error);
                    updateStatus(`Error sending audio: ${error.message}`, true);
                    stopListening(); 
                }
            }; 

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination); 

            
            updateStatus('Connecting WebSocket...');
            websocket = new WebSocket(VOSK_SERVER_URL);

            websocket.onopen = () => {
                isListening = true; 
                toggleButton.textContent = 'Stop Listening';
                updateStatus('Connected & Listening...');
                 
                 console.log("WebSocket OPEN");
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                     
                     console.log("Message received from server:", event.data);
                    if (data.command) {
                        updateResults(data.command);
                    } else if (data.partial) {
                        
                         console.log("Partial result:", data.partial);
                         
                    }
                } catch (error) {
                    console.error("Error parsing message from server:", error);
                    updateStatus(`Error parsing server message: ${error.message}`, true);
                }
            };

            websocket.onerror = (error) => {
                console.error("WebSocket error:", error);
                updateStatus(`WebSocket Error (Check console)`, true);
                
            };

            websocket.onclose = (event) => {
                console.log("WebSocket connection closed:", event.code, event.reason);
                updateStatus(`WebSocket Closed: ${event.reason || 'Normal closure'} (${event.code})`, !event.wasClean);
                 
                 if (isListening) { 
                    stopListeningCleanup();
                 }
            };

        })
        .catch(err => {
            console.error("Error accessing microphone:", err);
            updateStatus(`Microphone Error: ${err.message}`, true);
            alert("Could not access microphone. Please grant permission and ensure it's connected.");
            stopListeningCleanup(); 
        });
}


function stopListeningCleanup() {
    isListening = false; 

    if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
        console.log("ScriptProcessor disconnected");
    }
    
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
         
        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
            websocket.close();
             console.log("WebSocket closed");
        }
        websocket = null; 
    }

    toggleButton.textContent = 'Start Listening';
    
    if (!statusDiv.textContent.includes('Error') && !statusDiv.textContent.includes('Closed')) {
         updateStatus('Idle');
    }
     
     updateResults('---');
}


function stopListening() {
    if (!isListening && !microphoneStream && !websocket) { 
         console.log("Already stopped or idle.");
        return;
    }
    console.log("Stop Listening requested...");
    updateStatus('Stopping...');
    stopListeningCleanup();
}



toggleButton.addEventListener('click', () => {
    if (!isListening) {
        startListening();
    } else {
        stopListening();
    }
});


window.addEventListener('beforeunload', () => {
    if (isListening) {
        stopListening();
    }
});