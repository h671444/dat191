const VOSK_SERVER_URL = "ws";
const VOSK_BUFFER_SIZE = 4096;

let websocket = null;
let audioContextForVoice = null; 
let microphoneStream = null;
let scriptProcessor = null;
export let isVoiceRecognitionActive = false;

function logStatus(message, isError = false) {
    console.log(`VOICE Status: ${message}`);
    
}


function resampleBuffer(inputBuffer, targetSampleRate) {
  const inputData = inputBuffer.getChannelData(0);
  const inputSampleRate = inputBuffer.sampleRate;
  if (inputSampleRate === targetSampleRate) return inputData;
  
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

export function initializeVoice() { 
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

    
    
    if (!audioContextForVoice || audioContextForVoice.state === 'closed') {
        console.log("Creating new AudioContext for voice.");
        
        audioContextForVoice = new (window.AudioContext || window.webkitAudioContext)();
    }

    
    if (!audioContextForVoice) {
        console.error("Failed to get or create AudioContext!");
        logStatus("audioctx error", true);
        alert("Could not initialize audio context.");
        return; 
    }

    
    if (audioContextForVoice.state === 'suspended') {
        console.log("AudioContext is suspended, attempting to resume...");
        audioContextForVoice.resume().then(() => {
            console.log("AudioContext resumed successfully.");
            
            proceedWithMicSetup();
        }).catch(err => {
            console.error("Failed to resume AudioContext:", err);
            logStatus("audioctx resume error", true);
            alert("Could not resume audio context. Click the voice button again?");
            
            
            
        });
    } else if (audioContextForVoice.state === 'running') {
        console.log("AudioContext is already running.");
        
        proceedWithMicSetup();
    } else {
        
        console.error(`AudioContext is in unexpected state: ${audioContextForVoice.state}`);
        logStatus(`audioctx state error: ${audioContextForVoice.state}`, true);
        alert(`Audio context has an unexpected status: ${audioContextForVoice.state}`);
    }
} 


function proceedWithMicSetup() {
    console.log("Proceeding with microphone setup...");
    console.log('Using AudioContext Sample Rate:', audioContextForVoice.sampleRate);

    
    if (audioContextForVoice.sampleRate !== 48000 && audioContextForVoice.sampleRate !== 44100 && audioContextForVoice.sampleRate !== 16000 ) {
        console.warn(`Unexpected AudioContext sample rate: ${audioContextForVoice.sampleRate}. Resampling accuracy might vary.`);
    }
 
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }) 
        .then(stream => {
            
            console.log("Microphone access granted.");
            microphoneStream = stream; 

            
            if (!audioContextForVoice.createScriptProcessor) {
                 console.error("createScriptProcessor is not supported in this browser. AudioWorklet would be needed.");
                 alert("Your browser does not support the required audio processing. Voice control unavailable.");
                 stopVoiceRecognitionCleanup(false); 
                 return;
            }

            
            const source = audioContextForVoice.createMediaStreamSource(microphoneStream);
            scriptProcessor = audioContextForVoice.createScriptProcessor(VOSK_BUFFER_SIZE, 1, 1);

            
            scriptProcessor.onaudioprocess = (event) => {
                
                if (!websocket || websocket.readyState !== WebSocket.OPEN || !isVoiceRecognitionActive) {
                    return; 
                }
                try {
                    const inputBuffer = event.inputBuffer;
                    const targetSampleRate = 16000; 
                    const resampledData = resampleBuffer(inputBuffer, targetSampleRate);
                    const int16Data = new Int16Array(resampledData.length);
                    for (let i = 0; i < resampledData.length; i++) {
                        int16Data[i] = Math.max(-32768, Math.min(32767, resampledData[i] * 32767));
                    }

                    if (int16Data.length > 0) {
                        websocket.send(int16Data.buffer);
                    }
                } catch (error) { 
                    console.error("Error processing or sending audio data:", error);
                    logStatus(`audio process/send error`, true);
                    
                    
                }
            };

            source.connect(scriptProcessor);
            
            scriptProcessor.connect(audioContextForVoice.destination); 
            
            logStatus('connecting to WebSocket...');
            websocket = new WebSocket(VOSK_SERVER_URL);

            websocket.onopen = () => {
                console.log("WebSocket connection established.");
                isVoiceRecognitionActive = true; 
                logStatus('listening');
                 
                 const voiceButton = document.getElementById('voiceButton');
                 if(voiceButton) voiceButton.style.backgroundColor = '#dc3545'; 
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.command && typeof window.processVoiceCommand === 'function') {
                        
                         console.log("Command received from server:", data.command); 
                        window.processVoiceCommand(data.command);
                    } else if (data.partial) {
                        
                    } else {
                        
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
                
                stopVoiceRecognitionCleanup(false); 
            };

            websocket.onclose = (event) => {
                console.log("WebSocket connection closed:", event.code, event.reason, `Was clean: ${event.wasClean}`);
                logStatus(`disconnected (${event.code})`, !event.wasClean);
                
                
                stopVoiceRecognitionCleanup(false);
            };

        }) 
        .catch(err => {
            
            console.error("Error accessing microphone:", err);
            logStatus(`mic error: ${err.name}`, true);
            if(err.name === 'NotAllowedError') {
                alert("Microphone access was denied. Please allow microphone access in browser settings.");
            } else if (err.name === 'NotFoundError') {
                 alert("No microphone detected on this device.");
            } else {
                alert(`Could not access microphone: ${err.message}`);
            }
            
            stopVoiceRecognitionCleanup(false); 
        }); 

} 

function stopVoiceRecognitionCleanup(closeSocket = true) {
    
    
    
     if (!isVoiceRecognitionActive && !microphoneStream && !websocket && !scriptProcessor && (!audioContextForVoice || audioContextForVoice.state === 'closed') ) {
         
         return; 
     }
     console.log("Cleaning up voice recognition resources...");

     
     if (scriptProcessor) {
         try { scriptProcessor.disconnect(); } catch(e) { console.warn("Error disconnecting scriptProcessor:", e); }
         scriptProcessor = null;
         console.log("ScriptProcessor disconnected");
     }
     
     if (microphoneStream) {
         microphoneStream.getTracks().forEach(track => track.stop());
         microphoneStream = null;
         console.log("Microphone stream stopped");
     }

     if (websocket) {
         if (closeSocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
              console.log("Attempting to close WebSocket...");
             websocket.close(1000, "Client requested disconnect"); 
         }
         
         websocket.onopen = websocket.onmessage = websocket.onerror = websocket.onclose = null;
         websocket = null;
          console.log("WebSocket reference cleaned up");
     }

     isVoiceRecognitionActive = false;
     logStatus('stopped');

      const voiceButton = document.getElementById('voiceButton');
      if (voiceButton) {
          voiceButton.textContent = 'Start Stemme Kontroll';
          voiceButton.style.backgroundColor = '#0095ff'; 
      }

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

