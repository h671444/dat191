// Import game functions/variables needed
import { startGame, initGame, audioCtx } from './pongBreaker_game.js';
// Import overlay functions if needed for status updates? Or handle status via exported variable.
// Let's export status and let main/game handle display.

// --- Constants ---
const VOSK_SERVER_URL = "ws://localhost:8765";
const VOSK_BUFFER_SIZE = 4096;
const VOICE_COMMANDS = {
  LEFT: 'left', RIGHT: 'right', START: 'start', STOP: 'stop', EXIT: 'exit'
};

// --- State Variables (Exported where needed) ---
let websocket = null;
let audioContextForVoice = null; // Use separate variable to avoid confusion? No, use imported audioCtx.
let microphoneStream = null;
let scriptProcessor = null;
export let isVoiceRecognitionActive = false;
export let voiceCommandStatus = 'disconnected'; // Export for HUD
export let voiceMovingLeft = false; // Export for movePaddle
export let voiceMovingRight = false; // Export for movePaddle

// --- Helper Functions ---

function updateStatus(message, isError = false) {
    console.log(`VOICE Status Update: ${message}`);
    voiceCommandStatus = message.toLowerCase(); // Update exported status
    // Note: Actual display update happens in drawHUD which reads this variable
}

// Resampling Function (Copied from simple test)
function resampleBuffer(inputBuffer, targetSampleRate) {
  const inputData = inputBuffer.getChannelData(0);
  const inputSampleRate = inputBuffer.sampleRate;
  if (inputSampleRate === targetSampleRate) return inputData;

  // console.log(`Resampling from ${inputSampleRate} Hz to ${targetSampleRate} Hz`); // Can be noisy
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

// Handle commands received from server
function handleVoiceCommand(command) {
  console.log("Voice command received:", command);
  switch (command) {
      case VOICE_COMMANDS.LEFT:
          voiceMovingLeft = true;
          voiceMovingRight = false;
          break;
      case VOICE_COMMANDS.RIGHT:
          voiceMovingRight = true;
          voiceMovingLeft = false;
          break;
      case VOICE_COMMANDS.STOP:
           voiceMovingLeft = false;
           voiceMovingRight = false;
          break;
      case VOICE_COMMANDS.START:
          // Use imported game functions
          // Check game state before acting (needs import)
          // Import isGameRunning, isGameOver, isGameWin from game module later if needed
          // For now, assume main module checks this, or just call startGame
           startGame(); // Let startGame handle internal checks
          break;
      case VOICE_COMMANDS.EXIT:
           console.log("Exit command received - Triggering exit logic via alert/stop for now");
           // For now, just stop voice and maybe alert
           stopVoiceRecognition();
           alert("Exiting game via voice (implement actual exit logic)");
           // Maybe stop the game loop too? Requires importing isGameRunning, animationId etc.
           // For simplicity, rely on user clicking Exit button which handles this.
          break;
      default:
          console.log("Unknown voice command:", command);
          break;
  }
}

// --- Main Voice Functions (Exported) ---

export function initializeVoice() {
  if (isVoiceRecognitionActive) {
       console.warn("Voice recognition already active.");
       return;
  }
   if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateStatus("mic unavailable", true);
      alert("Browser doesn't support microphone access.");
      return;
  }
  updateStatus('starting...');

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
          microphoneStream = stream;
          // Use imported audioCtx from game module
          audioContextForVoice = audioCtx; // Assign to local variable for clarity? Or just use audioCtx directly.
          if (!audioContextForVoice) {
               console.error("AudioContext not available from game module!");
               updateStatus("audioctx error", true);
               return;
          }
          if (audioContextForVoice.state === 'suspended') {
              audioContextForVoice.resume().then(() => {
                 console.log("AudioContext resumed for voice.");
                 console.log('AudioContext Sample Rate:', audioContextForVoice.sampleRate); // Log sample rate
              });
          } else {
              console.log('AudioContext Sample Rate:', audioContextForVoice.sampleRate); // Log sample rate
          }

          const source = audioContextForVoice.createMediaStreamSource(microphoneStream);
          scriptProcessor = audioContextForVoice.createScriptProcessor(VOSK_BUFFER_SIZE, 1, 1);

          scriptProcessor.onaudioprocess = (event) => {
            if (!websocket || websocket.readyState !== WebSocket.OPEN || !isVoiceRecognitionActive) {
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
                updateStatus(`send error`, true); // Simplified status
                stopVoiceRecognition();
            }
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContextForVoice.destination);

          updateStatus('connecting...');
          websocket = new WebSocket(VOSK_SERVER_URL);

          websocket.onopen = () => {
              console.log("WebSocket connection established.");
              isVoiceRecognitionActive = true;
              updateStatus('listening');
              // Button text update should happen in main module's event handler
          };

          websocket.onmessage = (event) => {
              try {
                  const data = JSON.parse(event.data);
                  if (data.command) {
                      handleVoiceCommand(data.command);
                  }
              } catch (error) {
                  console.error("Error parsing message from server:", error);
              }
          };

          websocket.onerror = (error) => {
              console.error("WebSocket error:", error);
              updateStatus(`ws error`, true);
              // stopVoiceRecognition(); // onclose will handle cleanup
          };

          websocket.onclose = (event) => {
              console.log("WebSocket connection closed:", event.code, event.reason);
              updateStatus(`disconnected (${event.code})`, !event.wasClean);
              // Ensure cleanup happens reliably on close
              stopVoiceRecognitionCleanup(false); // Don't try to close socket again
          };
      })
      .catch(err => {
          console.error("Error accessing microphone:", err);
          updateStatus(`mic error`, true);
          alert("Could not access microphone. Please grant permission and ensure it's connected.");
          stopVoiceRecognitionCleanup(false); // Cleanup if mic access fails
      });
}

// Renamed cleanup function to be internal
function stopVoiceRecognitionCleanup(closeSocket = true) {
    if (!isVoiceRecognitionActive && !microphoneStream && !websocket && !scriptProcessor) {
        return; // Nothing to clean up
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
    // DO NOT close the shared audioCtx here, game sounds still need it.
    // if (audioContextForVoice && audioContextForVoice.state !== 'closed') { ... }

    if (websocket) {
        if (closeSocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
            websocket.close();
             console.log("WebSocket closed");
        }
        websocket = null;
    }

    // Reset state variables
    isVoiceRecognitionActive = false;
    voiceMovingLeft = false;
    voiceMovingRight = false;
    // Update status only if it wasn't already an error/closed status
    if (!voiceCommandStatus.includes('error') && !voiceCommandStatus.includes('disconnect')) {
         updateStatus('stopped');
    }
     // Button text update happens in main module
}


// Exported function to be called externally (e.g., by button)
export function stopVoiceRecognition() {
     if (!isVoiceRecognitionActive && !microphoneStream && !websocket && !scriptProcessor) {
         console.log("Voice recognition not active, nothing to stop.");
        return;
    }
    console.log("Stop Voice Recognition requested...");
    updateStatus('stopping...');
    stopVoiceRecognitionCleanup(true); // Request socket close
}