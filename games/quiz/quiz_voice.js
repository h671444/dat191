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

export function initializeVoice(extAudioContext) { // Accept external AudioContext
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

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
          microphoneStream = stream;
          // Use the provided AudioContext
          audioContextForVoice = extAudioContext;
          if (!audioContextForVoice) {
               console.error("AudioContext was not provided!");
               logStatus("audioctx error", true);
               return;
          }
          // Ensure it's running
          if (audioContextForVoice.state === 'suspended') {
              audioContextForVoice.resume().then(() => {
                 console.log("AudioContext resumed for voice.");
                 console.log('AudioContext Sample Rate:', audioContextForVoice.sampleRate);
              });
          } else {
              console.log('AudioContext Sample Rate:', audioContextForVoice.sampleRate);
          }

          // Check if sample rate is correct for resampling function
           if (audioContextForVoice.sampleRate !== 48000 && audioContextForVoice.sampleRate !== 44100) {
                console.warn(`Unexpected AudioContext sample rate: ${audioContextForVoice.sampleRate}. Resampling might be inaccurate.`);
           }


          const source = audioContextForVoice.createMediaStreamSource(microphoneStream);
          scriptProcessor = audioContextForVoice.createScriptProcessor(VOSK_BUFFER_SIZE, 1, 1);

          scriptProcessor.onaudioprocess = (event) => {
            if (!websocket || websocket.readyState !== WebSocket.OPEN || !isVoiceRecognitionActive) {
                return;
            }
            const inputBuffer = event.inputBuffer;
            const targetSampleRate = 16000; // Vosk's expected rate
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
                logStatus(`send error`, true);
                stopVoiceRecognition();
            }
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContextForVoice.destination);

          logStatus('connecting...');
          websocket = new WebSocket(VOSK_SERVER_URL);

          websocket.onopen = () => {
              console.log("WebSocket connection established.");
              isVoiceRecognitionActive = true;
              logStatus('listening');
          };

          websocket.onmessage = (event) => {
              try {
                  const data = JSON.parse(event.data);
                   console.log("Message received:", data); // Log raw message
                  if (data.command && typeof window.processVoiceCommand === 'function') {
                      // Call the globally defined function in quiz.js
                      window.processVoiceCommand(data.command);
                  } else if (data.partial) {
                       console.log("Partial:", data.partial);
                  }
              } catch (error) {
                  console.error("Error processing message from server:", error);
              }
          };

          websocket.onerror = (error) => {
              console.error("WebSocket error:", error);
              logStatus(`ws error`, true);
          };

          websocket.onclose = (event) => {
              console.log("WebSocket connection closed:", event.code, event.reason);
              logStatus(`disconnected (${event.code})`, !event.wasClean);
              stopVoiceRecognitionCleanup(false);
          };
      })
      .catch(err => {
          console.error("Error accessing microphone:", err);
          logStatus(`mic error`, true);
          alert(`Could not access microphone: ${err.message}`);
          stopVoiceRecognitionCleanup(false);
      });
}

function stopVoiceRecognitionCleanup(closeSocket = true) {
    if (!isVoiceRecognitionActive && !microphoneStream && !websocket && !scriptProcessor) {
        return;
    }
    console.log("Cleaning up voice recognition resources...");

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
    // Don't close the shared audioCtx here
    if (websocket) {
        if (closeSocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
            websocket.close();
             console.log("WebSocket closed");
        }
        websocket = null;
    }
    isVoiceRecognitionActive = false;
    logStatus('stopped');
}

export function stopVoiceRecognition() {
     if (!isVoiceRecognitionActive && !microphoneStream && !websocket && !scriptProcessor) {
         console.log("Voice recognition not active, nothing to stop.");
        return;
    }
    console.log("Stop Voice Recognition requested...");
    logStatus('stopping...');
    stopVoiceRecognitionCleanup(true);
}