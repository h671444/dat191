// Import necessary parts from the other modules
import {
    initGame,
    startGame,
    setupGameEventListeners,
    showOverlay, // Keep using overlay from game? Yes.
    hideOverlay,
    isGameRunning,
    isGameOver,
    isGameWin,
    keys // Import keys state for Space bar handling
} from './pongBreaker_game.js';

import {
    initializeVoice,
    stopVoiceRecognition,
    isVoiceRecognitionActive, // Needed for button logic
    // voiceCommandStatus // Status is read by drawHUD in game module now
} from './pongBreaker_voice.js';


// --- Main Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing...");

    // Initialize game elements and state (draws initial frame)
    initGame();

    // Set up game-related event listeners (keyboard, mouse, resize)
    setupGameEventListeners();

    // --- Voice Control Button Setup ---
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voiceButton';
    voiceButton.textContent = 'Start Voice Control';
    voiceButton.style.position = 'absolute';
    voiceButton.style.top = '10px';
    voiceButton.style.left = '10px';
    voiceButton.style.padding = '10px';
    voiceButton.style.fontSize = '16px';
    voiceButton.style.cursor = 'pointer';

    voiceButton.onclick = () => {
        if (!isVoiceRecognitionActive) {
            initializeVoice(); // Call imported function
            // We don't update button text immediately, wait for status change?
            // Or assume it will likely succeed for now.
            voiceButton.textContent = 'Stop Voice Control';
        } else {
            stopVoiceRecognition(); // Call imported function
            voiceButton.textContent = 'Start Voice Control';
            // Status update is handled internally by stopVoiceRecognition now
        }
    };
    document.body.appendChild(voiceButton);

    // --- Exit Button Setup ---
    const exitButton = document.getElementById('exitButton');
    if (exitButton) {
         exitButton.addEventListener('click', () => {
            console.log("Exit button clicked (main)");
            stopVoiceRecognition(); // Stop voice before exiting
            // Add actual exit logic here
            alert("Exiting game (implement actual exit logic here)");
         });
    } else {
         console.warn("Exit button not found during main init!");
    }

     // --- Other Global Listeners ---
     window.addEventListener('beforeunload', () => {
        // Ensure voice recognition stops if user navigates away
        stopVoiceRecognition();
    });

    // Handle Space key for starting/restarting game (moved from game module)
    document.addEventListener('keydown', (e) => {
         if (e.code === 'Space') {
             if (!isGameRunning) {
                 if (isGameOver || isGameWin) {
                    initGame(); // Re-initialize game state
                    // If voice was stopped on game over/win, maybe restart it? Optional.
                 }
                 startGame();
             }
         }
    });

     // Show initial overlay message (it's hidden by startGame later)
     showOverlay("Click, press Space, or say Start");

     console.log("Initialization complete.");
});