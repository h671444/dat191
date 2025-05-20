
import { loadQuestions } from './quiz.js'; 
import { initializeVoice, stopVoiceRecognition, isVoiceRecognitionActive } from './quiz_voice.js';


document.addEventListener('DOMContentLoaded', () => {
    console.log("Quiz DOM Loaded. Initializing...");


    loadQuestions();
    
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voiceButton';
    voiceButton.textContent = 'Start Stemme Kontroll'; 
    
    voiceButton.style.position = 'fixed'; 
    voiceButton.style.bottom = '20px';
    voiceButton.style.left = '20px';
    voiceButton.style.padding = '12px 20px';
    voiceButton.style.fontSize = '1rem';
    voiceButton.style.cursor = 'pointer';
    voiceButton.style.zIndex = '2000'; 
    voiceButton.style.backgroundColor = '#0095ff';
    voiceButton.style.color = 'white';
    voiceButton.style.border = 'none';
    voiceButton.style.borderRadius = '8px';


    voiceButton.onclick = () => {
        if (!isVoiceRecognitionActive) {
            
            initializeVoice();
            voiceButton.textContent = 'Stopp Stemme Kontroll';
        } else {
            stopVoiceRecognition();
            voiceButton.textContent = 'Start Stemme Kontroll';
        }
    };
    document.body.appendChild(voiceButton);

     
     window.addEventListener('beforeunload', () => {
        stopVoiceRecognition(); 
    });

     console.log("Quiz initialization complete.");
});