// No game-specific imports needed here anymore

// --- Constants ---
const VOSK_SERVER_URL = "ws://localhost:8765";
const VOSK_BUFFER_SIZE = 4096;
// Note: VOICE_COMMANDS list itself isn't strictly needed here if we just pass raw text

// --- State Variables (Only export essential ones) ---
let websocket = null;
let audioContextForVoice = null; // Local reference to the AudioContext
let microphoneStream = null;
let scriptProcessor = null;
export let isVoiceRecognitionActive = false;
// Status is handled within quiz.js now, maybe export a 'getStatus' function? Or keep internal log.
// Let's just log status internally here for simplicity now.

// --- Helper Functions ---

function logStatus(message, isError = false) {
    console.log(`VOICE Status: ${message}`);
    // Update UI is now handled by quiz.js/quiz_main.js if needed
}

// Resampling Function (Copied from simple test)
function resampleBuffer(inputBuffer, targetSampleRate) {
  const inputData = inputBuffer.getChannelData(0);
  const inputSampleRate = inputBuffer.sampleRate;
  if (inputSampleRate === targetSampleRate) return inputData;
  // console.log(`Resampling from ${inputSampleRate} Hz to ${targetSampleRate} Hz`);
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

// --- Main Voice Functions (Exported) ---

export function initializeVoice() { // No longer expecting extAudioContext reliably
    if (isVoiceRecognitionActive) {
        console.warn("Voice recognition already active.");
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        logStatus("mic unavailable", true);
        alert("Browser doesn't support microphone access.");
        return;
    }
    logStatus('starting...');

    // --- Step 1: Get or Create AudioContext ---
    // (Your existing logic for this was mostly correct)
    if (!audioContextForVoice || audioContextForVoice.state === 'closed') {
        console.log("Creating new AudioContext for voice.");
        // Create it and assign it to our module-scoped variable
        audioContextForVoice = new (window.AudioContext || window.webkitAudioContext)();
    }

    // --- Step 2: Check if we have a valid AudioContext ---
    if (!audioContextForVoice) {
        console.error("Failed to get or create AudioContext!");
        logStatus("audioctx error", true);
        alert("Could not initialize audio context.");
        return; // Stop initialization
    }

    // --- Step 3: Ensure AudioContext is Running ---
    // It might be 'suspended' and need resuming, especially after user interaction.
    if (audioContextForVoice.state === 'suspended') {
        console.log("AudioContext is suspended, attempting to resume...");
        audioContextForVoice.resume().then(() => {
            console.log("AudioContext resumed successfully.");
            // NOW that context is running, proceed to microphone setup
            proceedWithMicSetup();
        }).catch(err => {
            console.error("Failed to resume AudioContext:", err);
            logStatus("audioctx resume error", true);
            alert("Could not resume audio context. Click the voice button again?");
            // Optional: clean up context if resume fails badly?
            // if (audioContextForVoice) audioContextForVoice.close();
            // audioContextForVoice = null;
        });
    } else if (audioContextForVoice.state === 'running') {
        console.log("AudioContext is already running.");
        // Context is already running, proceed directly to microphone setup
        proceedWithMicSetup();
    } else {
        // Handle other states like 'closed' if necessary, though the creation logic should prevent this.
        console.error(`AudioContext is in unexpected state: ${audioContextForVoice.state}`);
        logStatus(`audioctx state error: ${audioContextForVoice.state}`, true);
        alert(`Audio context has an unexpected status: ${audioContextForVoice.state}`);
    }
} // End of initializeVoice function


function proceedWithMicSetup() {
    console.log("Proceeding with microphone setup...");
    console.log('Using AudioContext Sample Rate:', audioContextForVoice.sampleRate);

    // Optional: Check if sample rate is suitable for resampling function
    // (This check can stay here or be removed if resampling handles various rates)
    if (audioContextForVoice.sampleRate !== 48000 && audioContextForVoice.sampleRate !== 44100 && audioContextForVoice.sampleRate !== 16000 ) {
        console.warn(`Unexpected AudioContext sample rate: ${audioContextForVoice.sampleRate}. Resampling accuracy might vary.`);
    }

    // --- Step 4: Get Microphone Access ---
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            // --- Step 5: Setup Audio Processing & WebSocket (Inside .then) ---
            console.log("Microphone access granted.");
            microphoneStream = stream; // Store the stream

            // Check for createScriptProcessor support (important!)
            if (!audioContextForVoice.createScriptProcessor) {
                 console.error("createScriptProcessor is not supported in this browser. AudioWorklet would be needed.");
                 alert("Your browser does not support the required audio processing. Voice control unavailable.");
                 stopVoiceRecognitionCleanup(false); // Clean up stream etc.
                 return;
            }

            // --- Create Audio Nodes ---
            const source = audioContextForVoice.createMediaStreamSource(microphoneStream);
            scriptProcessor = audioContextForVoice.createScriptProcessor(VOSK_BUFFER_SIZE, 1, 1);

            // --- Define Audio Processing ---
            scriptProcessor.onaudioprocess = (event) => {
                // Check WebSocket state FIRST
                if (!websocket || websocket.readyState !== WebSocket.OPEN || !isVoiceRecognitionActive) {
                    return; // Don't process if not connected or stopped
                }
                try {
                    const inputBuffer = event.inputBuffer;
                    const targetSampleRate = 16000; // Vosk's expected rate
                    const resampledData = resampleBuffer(inputBuffer, targetSampleRate);
                    const int16Data = new Int16Array(resampledData.length);
                    for (let i = 0; i < resampledData.length; i++) {
                        int16Data[i] = Math.max(-32768, Math.min(32767, resampledData[i] * 32767));
                    }

                    if (int16Data.length > 0) {
                        websocket.send(int16Data.buffer);
                    }
                } catch (error) { // Catch errors during audio processing/sending
                    console.error("Error processing or sending audio data:", error);
                    logStatus(`audio process/send error`, true);
                    // Consider stopping recognition if sending fails repeatedly
                    // stopVoiceRecognition();
                }
            };

            // --- Connect Audio Nodes ---
            source.connect(scriptProcessor);
            // Connect to destination to potentially hear yourself (usually NOT wanted)
            // scriptProcessor.connect(audioContextForVoice.destination);
            // OR Connect scriptProcessor to gain node(0) then to destination if you need silence
            scriptProcessor.connect(audioContextForVoice.destination); // For testing, you might hear mic input
            // Note: For production, you usually don't connect the scriptProcessor back to the destination
            // unless you specifically want the user to hear their processed audio.
            // If you want silence:
            // const gainNode = audioContextForVoice.createGain();
            // gainNode.gain.setValueAtTime(0, audioContextForVoice.currentTime);
            // scriptProcessor.connect(gainNode);
            // gainNode.connect(audioContextForVoice.destination);


            // --- Setup WebSocket Connection ---
            logStatus('connecting to WebSocket...');
            websocket = new WebSocket(VOSK_SERVER_URL);

            websocket.onopen = () => {
                console.log("WebSocket connection established.");
                isVoiceRecognitionActive = true; // Set active flag ONLY after successful connection
                logStatus('listening');
                 // Update button state visually if needed (e.g., color)
                 const voiceButton = document.getElementById('voiceButton');
                 if(voiceButton) voiceButton.style.backgroundColor = '#dc3545'; // Red = active
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // console.log("Message received:", data); // Keep for debugging if needed
                    if (data.command && typeof window.processVoiceCommand === 'function') {
                        // Call the globally defined function in quiz.js
                         console.log("Command received from server:", data.command); // Log specific command
                        window.processVoiceCommand(data.command);
                    } else if (data.partial) {
                        // console.log("Partial:", data.partial); // Optional: log partial results
                    } else {
                        // Log unexpected messages
                        console.log("Received unexpected message format:", data);
                    }
                } catch (error) {
                    console.error("Error processing message from server:", error);
                }
            };

            websocket.onerror = (error) => {
                console.error("WebSocket error:", error);
                logStatus(`ws error`, true);
                alert("WebSocket connection error. Is the Vosk server running?");
                // Attempt cleanup if WebSocket fails badly
                stopVoiceRecognitionCleanup(false); // Don't try to close a broken socket
            };

            websocket.onclose = (event) => {
                console.log("WebSocket connection closed:", event.code, event.reason, `Was clean: ${event.wasClean}`);
                logStatus(`disconnected (${event.code})`, !event.wasClean);
                // Important: Call the cleanup function when the socket closes unexpectedly or normally
                // Pass false because the socket is already closed or closing.
                stopVoiceRecognitionCleanup(false);
            };

            // --- End of successful setup inside .then() ---

        }) // End of .then(stream => ...)
        .catch(err => {
            // --- Step 4 Failed: Handle Microphone Access Error ---
            console.error("Error accessing microphone:", err);
            logStatus(`mic error: ${err.name}`, true);
            if(err.name === 'NotAllowedError') {
                alert("Microphone access was denied. Please allow microphone access in browser settings.");
            } else if (err.name === 'NotFoundError') {
                 alert("No microphone detected on this device.");
            } else {
                alert(`Could not access microphone: ${err.message}`);
            }
            // No stream or nodes created yet, just ensure context is potentially closed if needed
            stopVoiceRecognitionCleanup(false); // Use cleanup to reset flags etc.
        }); // End of .catch(err => ...)

} // End of proceedWithMicSetup function


function stopVoiceRecognitionCleanup(closeSocket = true) {
    // ...(Your existing cleanup logic seems mostly okay)...
    // Just double-check it resets isVoiceRecognitionActive = false; at the end
    // and updates button visuals.
     if (!isVoiceRecognitionActive && !microphoneStream && !websocket && !scriptProcessor && (!audioContextForVoice || audioContextForVoice.state === 'closed') ) {
         // console.log("Cleanup check: Nothing seems active or context already closed."); // Debug log
         return; // Nothing to clean up
     }
     console.log("Cleaning up voice recognition resources...");

     // Disconnect nodes first
     if (scriptProcessor) {
         try { scriptProcessor.disconnect(); } catch(e) { console.warn("Error disconnecting scriptProcessor:", e); }
         scriptProcessor = null;
         console.log("ScriptProcessor disconnected");
     }
     // We need to disconnect the source node too if it exists
     // (Requires storing the source node variable globally/module-scoped)
     // let mediaStreamSourceNode = null; // Define near top with other state vars
     // Inside proceedWithMicSetup: mediaStreamSourceNode = audioContextForVoice.createMediaStreamSource(microphoneStream);
     // Here in cleanup:
     // if(mediaStreamSourceNode) {
     //    try { mediaStreamSourceNode.disconnect(); } catch(e) { console.warn("Error disconnecting source node:", e); }
     //    mediaStreamSourceNode = null;
     //    console.log("MediaStreamSource node disconnected");
     // }


     // Stop microphone tracks
     if (microphoneStream) {
         microphoneStream.getTracks().forEach(track => track.stop());
         microphoneStream = null;
         console.log("Microphone stream stopped");
     }

     // Close WebSocket
     if (websocket) {
         if (closeSocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
              console.log("Attempting to close WebSocket...");
             websocket.close(1000, "Client requested disconnect"); // Close cleanly
         }
         // Nullify callbacks to prevent potential issues after close
         websocket.onopen = websocket.onmessage = websocket.onerror = websocket.onclose = null;
         websocket = null;
          console.log("WebSocket reference cleaned up");
     }

     // Reset state flag ***AFTER*** cleanup is done
     isVoiceRecognitionActive = false;
     logStatus('stopped');

      // Update button text/style back after stopping
      const voiceButton = document.getElementById('voiceButton');
      if (voiceButton) {
          voiceButton.textContent = 'Start Stemme Kontroll';
          voiceButton.style.backgroundColor = '#0095ff'; // Blue = inactive
      }

     // Optionally close the AudioContext here if you want it fully reset each time
     // if (audioContextForVoice && audioContextForVoice.state !== 'closed') {
     //    console.log("Closing AudioContext.");
     //    audioContextForVoice.close();
     //    audioContextForVoice = null;
     // }
 }

export function stopVoiceRecognition() {
    if (!isVoiceRecognitionActive && !microphoneStream && !websocket && !scriptProcessor) {
        console.log("Voice recognition not active, nothing to stop.");
        return;
    }
    console.log("Stop Voice Recognition requested...");
    logStatus('stopping...');
    // Call cleanup, pass true to indicate the WebSocket should be intentionally closed if open
    stopVoiceRecognitionCleanup(true);
}

