# DAT191 Voice Controlled Applications

This repository hosts voice-controlled web applications, with a primary focus on a Voice Quiz game.

## Featured Application: Voice Quiz

The Voice Quiz is an interactive web-based game where users can select categories, choose difficulty levels, and answer multiple-choice questions using voice commands.

### Quiz Features

* **Voice Control:** Navigate menus and answer questions using spoken commands.
* **Multiple Categories:** Choose from various topics like "Generell Kunnskap" (General Knowledge), "Historie" (History), "Geografi" (Geography), and "Vitenskap" (Science).
* **Random Questions:** Option to get questions from any category.
* **Difficulty Levels:** Select "Lett" (Easy), "Middels" (Medium), or "Vanskelig" (Hard).
* **Interactive UI:** Visual feedback for selections and answers.
* **Score Tracking:** Keep track of your correct answers.
* **Norwegian Language:** Quiz questions and UI are primarily in Norwegian. Voice commands are expected in English (e.g., "history", "easy", "a") and are mapped to Norwegian equivalents by the backend Vosk server.

### How the Voice Quiz Works

The quiz application is a frontend web application that communicates with a separate backend Vosk WebSocket server for speech recognition.

1.  **Frontend (Client-Side - `games/quiz/`)**:
    * **`quiz.html`**: The main HTML structure for the game.
    * **`quiz.css`**: Styles for the quiz interface.
    * **`quiz_main.js`**: Initializes the quiz, loads questions, and sets up the voice control button.
    * **`quiz.js`**: Manages the quiz game logic, state (Finite State Machine for category/difficulty/answering), question display, answer checking, and score. It defines `window.processVoiceCommand(command)` which is called by `quiz_voice.js`.
    * **`quiz_voice.js`**: Handles microphone access using the Web Audio API, captures audio, resamples it to 16kHz PCM, and sends it to the Vosk WebSocket server. It receives recognized commands (e.g., "history", "easy", "a", "b") from the server and passes them to `quiz.js`.
    * **`../../assets/data/questions.json`**: Contains the quiz questions, categories, difficulties, and answers.

2.  **Backend (Server-Side - Requires separate `vosk-server` project)**:
    * A Python-based WebSocket server (`quiz_server.py` from the `vosk-server` project) listens for audio data.
    * It uses the Vosk Speech Recognition Toolkit with an English model (`model-en`) and a predefined grammar list tailored to quiz commands (categories, difficulties, answers A/B/C/D, navigation).
    * Recognized commands are sent back to the `quiz_voice.js` module in the frontend.

The diagrammer folder (`games/quiz/diagrammer/`) contains Mermaid diagrams illustrating the Finite State Machine (FSM), flowchart, component interactions, and sequence of operations.

### Project Structure 
├── assets
│   ├── data
│   │   └── questions.json 
│   └── images
│       └── logo
│           └── NNL logo.png
├── games
│   └── quiz
│       ├── diagrammer
│       │   ├── FSM.md 
│       │   ├── flowchart.md 
│       │   ├── komponenter.md 
│       │   ├── seq_diagram.md 
│       │   └── seq_diagram_expired.md 
│       ├── quiz.css 
│       ├── quiz.html 
│       ├── quiz.js 
│       ├── quiz_main.js 
│       └── quiz_voice.js 
└── README.md                      


### Prerequisites

To run the Voice Quiz application fully with voice control, you need:

1.  **A Modern Web Browser:** Chrome, Firefox, Edge, etc., that supports the Web Audio API (`getUserMedia`, `AudioContext`, `ScriptProcessorNode`) and WebSockets.
2.  **Microphone:** For voice input.
3.  **Running Vosk Server:** The `vosk-server` project (which includes `quiz_server.py` and the Vosk English model) **must be running separately**. This server handles the speech-to-text processing.
    * Ensure the Vosk server is configured to listen on `ws://localhost:8765` (as hardcoded in `quiz_voice.js` and `PongBreaker.js`).
    * The Vosk server needs its own Vosk model (e.g., `model-en`).

### Setup and Running the Quiz

1.  **Set up the Vosk Server:**
    * Clone the `vosk-server` repository from [https://github.com/h669796/vosk-server](https://github.com/h669796/vosk-server).
    * Follow its README to install Python dependencies (Vosk, websockets) and ensure the Vosk English model is correctly placed.
    * Run the `quiz_server.py` from the `vosk-server` project. It should indicate it's listening on `ws://localhost:8765`.

2.  **Run the Quiz Application (this `dat191voice` repository):**
    * **Option 1 (Simple):**
        * Clone this `dat191voice` repository.
        * Open the `games/quiz/quiz.html` file directly in your web browser.
    * **Option 2 (Using a local server - Recommended for avoiding potential CORS issues with `Workspace`):**
        * Clone this `dat191voice` repository.
        * Navigate to the root directory of `dat191voice` in your terminal.
        * If you have Python installed, you can run a simple HTTP server:
            ```bash
            python -m http.server
            ```
            Or for Python 2:
            ```bash
            python -m SimpleHTTPServer
            ```
        * Open your browser and go to `http://localhost:8000/games/quiz/quiz.html`. (The port might vary depending on your server).

3.  **Enable Voice Control:**
    * Once `quiz.html` is loaded, click the "Start Stemme Kontroll" (Start Voice Control) button.
    * Your browser will likely ask for microphone permission. **Allow** it.
    * The button should change to "Stopp Stemme Kontroll," and the application will start sending audio to the Vosk server.

4.  **Play:**
    * **Say a category name** (e.g., "history", "science", "general knowledge", "random question").
    * **Say a difficulty level** (e.g., "easy", "medium", "hard").
    * **Say the letter of your answer** (e.g., "a", "b", "c", "d").
    * You can also say "home" to return to the main game hub (if implemented to navigate away from the quiz page).

### Voice Commands Recognized by Vosk Server

The backend `vosk-server` is configured with the following English commands (which are then processed by the frontend `quiz.js`):

* **Categories:**
    * `general knowledge`
    * `history`
    * `geography`
    * `science`
    * `random question`
* **Difficulties:**
    * `easy`
    * `medium`
    * `hard`
* **Answers:**
    * `a`
    * `b`
    * `c`
    * `d`
* **Navigation/Control (Frontend might use some of these):**
    * `start` (Primarily for other games like PongBreaker)
    * `stop`
    * `home` (Implemented in `quiz.js` to go to `index.html`)

### Troubleshooting

* **Voice control not working:**
    * Ensure the `vosk-server` (`quiz_server.py`) is running and accessible at `ws://localhost:8765`. Check its console for errors.
    * Make sure you've granted microphone permission to the browser for the quiz page.
    * Check the browser's developer console (usually F12) in `quiz.html` for any errors related to WebSockets, Web Audio, or JavaScript.
    * Verify your microphone is working and selected as the default input device.
* **"Error loading questions":**
    * If running `quiz.html` directly from the filesystem (`file:///...`), `Workspace` for `questions.json` might be blocked by browser security (CORS). Running via a local HTTP server is recommended.
* **Poor recognition accuracy:**
    * Speak clearly.
    * Ensure minimal background noise.
    * The Vosk model and grammar are tuned for the specific commands listed. Other phrases will likely not be recognized correctly.

---
