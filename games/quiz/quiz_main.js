// Import initializers and voice control functions
import { loadQuestions } from './quiz.js'; // Use named export
import { initializeVoice, stopVoiceRecognition, isVoiceRecognitionActive } from './quiz_voice.js';
// import { audioCtx } from './quiz.js'; // Import the shared AudioContext

document.addEventListener('DOMContentLoaded', () => {
    console.log("Quiz DOM Loaded. Initializing...");

    // Load quiz data and display initial category screen
    loadQuestions();

    // --- Voice Control Button Setup ---
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voiceButton';
    voiceButton.textContent = 'Start Stemme Kontroll'; // Use Norwegian?
    // Apply some basic styling (adjust as needed)
    voiceButton.style.position = 'fixed'; // Use fixed to stay relative to viewport
    voiceButton.style.bottom = '20px';
    voiceButton.style.left = '20px';
    voiceButton.style.padding = '12px 20px';
    voiceButton.style.fontSize = '1rem';
    voiceButton.style.cursor = 'pointer';
    voiceButton.style.zIndex = '2000'; // Ensure it's above other elements
    voiceButton.style.backgroundColor = '#0095ff';
    voiceButton.style.color = 'white';
    voiceButton.style.border = 'none';
    voiceButton.style.borderRadius = '8px';


    voiceButton.onclick = () => {
        if (!isVoiceRecognitionActive) {
            // Pass the shared AudioContext when initializing
            initializeVoice();
            voiceButton.textContent = 'Stopp Stemme Kontroll';
        } else {
            stopVoiceRecognition();
            voiceButton.textContent = 'Start Stemme Kontroll';
        }
    };
    document.body.appendChild(voiceButton);

     // --- Other Global Listeners ---
     window.addEventListener('beforeunload', () => {
        stopVoiceRecognition(); // Clean up on page leave
    });

     console.log("Quiz initialization complete.");
});