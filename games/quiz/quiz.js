// --- State Variables ---
let questions = {};
let selectedCategory = "";
let selectedDifficulty = "";
let currentQuestionIndex = 0; // Although you shift array, might be useful later
let currentQuestions = [];
let score = 0;
let currentCorrectAnswer = null; // To store the correct key ('A', 'B', 'C', 'D') for the current question
let currentQuizState = 'CATEGORY_SELECT'; // States: CATEGORY_SELECT, DIFFICULTY_SELECT, AWAITING_ANSWER, SHOWING_ANSWER

// --- Initialization & Question Loading ---

// Load questions when called (will be called by quiz_main.js)
export async function loadQuestions() {
    console.log("Loading quiz questions...");
    try {
        // Make sure this path is correct relative to quiz.html
        const response = await fetch("../../assets/data/questions.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Questions loaded:", data);
        questions = data.categories;
        displayCategories();
        // Set initial state
        currentQuizState = 'CATEGORY_SELECT';
        document.getElementById("category-selection").hidden = false;
        document.getElementById("difficulty-selection").hidden = true;
        document.getElementById("quiz-area").hidden = true;

    } catch (error) {
        console.error("Failed to load questions:", error);
        // Display error to user?
        document.body.innerHTML = `<h1>Error loading questions. Please check console.</h1><p>${error.message}</p>`;
    }
}

// --- UI Display Functions ---

const displayCategories = () => {
    const categoriesDiv = document.getElementById("categories");
    if (!categoriesDiv) return;
    categoriesDiv.innerHTML = ""; // Clear previous buttons

    Object.keys(questions).forEach(category => {
        let btn = document.createElement("button");
        btn.innerText = category;
        btn.classList.add("category-btn");
        // Set an ID for voice targeting if needed? Or use text matching.
        btn.onclick = () => selectCategory(category);
        categoriesDiv.appendChild(btn);
    });
};

const displayDifficulties = () => {
    // This currently uses hardcoded buttons in HTML, which is fine.
    // If difficulties were dynamic, we'd populate #difficulties here.
    document.getElementById("category-selection").hidden = true;
    document.getElementById("difficulty-selection").hidden = false;
    document.getElementById("quiz-area").hidden = true;
    currentQuizState = 'DIFFICULTY_SELECT';
};

const displayQuizArea = () => {
    document.getElementById("category-selection").hidden = true;
    document.getElementById("difficulty-selection").hidden = true;
    document.getElementById("quiz-area").hidden = false;
    currentQuizState = 'AWAITING_ANSWER';
};

const showQuestion = () => {
    console.log("Current questions array:", currentQuestions);
    if (!currentQuestions || currentQuestions.length === 0) {
        alert(`Quiz ferdig! Din poengsum: ${score}`);
        // Reset to category selection or main menu?
        loadQuestions(); // Reload for now
        return;
    }

    let questionObj = currentQuestions[0]; // Get the next question
    currentCorrectAnswer = questionObj.correct; // Store correct answer key for voice check

    document.getElementById("question").innerText = questionObj.question;
    updateScore(); // Update score display

    let optionsDiv = document.getElementById("options");
    optionsDiv.innerHTML = ""; // Clear previous options

    // Ensure answers exist and are an object
    if (questionObj.answers && typeof questionObj.answers === 'object') {
         Object.keys(questionObj.answers).forEach(key => {
            let btn = document.createElement("button");
            btn.innerText = `${key}: ${questionObj.answers[key]}`;
            btn.classList.add("option-btn");
            // Add data-key attribute for easier voice targeting if needed
            btn.setAttribute('data-answer-key', key);
            btn.onclick = () => checkAnswer(key); // Pass only the selected key
            optionsDiv.appendChild(btn);
         });
    } else {
        console.error("Invalid answers format for question:", questionObj);
        // Handle error, maybe skip question
         currentQuestions.shift();
         setTimeout(showQuestion, 100); // Move to next quickly
         return;
    }

    currentQuizState = 'AWAITING_ANSWER'; // Ensure state is correct
};


// --- Core Logic Functions ---

const selectCategory = (category) => {
    console.log("Category selected:", category);
    selectedCategory = category;
    displayDifficulties();
};
window.selectCategory = selectCategory; // <-- ADD THIS LINE

const selectDifficulty = (difficulty) => {
    console.log("Difficulty selected:", difficulty);
    selectedDifficulty = difficulty;
    prepareQuizQuestions();
};
window.selectDifficulty = selectDifficulty; // <-- ADD THIS LINE

const prepareQuizQuestions = () => {
    let availableQuestions = [];

    if (selectedCategory === "Tilfeldig spørsmål") {
        // Flatten questions from all categories
        Object.values(questions).forEach(catData => {
            if (catData && catData.questions) {
                availableQuestions.push(...catData.questions);
            }
        });
    } else if (questions[selectedCategory] && questions[selectedCategory].questions) {
        availableQuestions = questions[selectedCategory].questions;
    } else {
        console.error("Selected category not found or has no questions:", selectedCategory);
        alert("Error: Category not found. Returning to selection.");
        loadQuestions(); // Go back to start
        return;
    }

    // Filter by difficulty
    currentQuestions = availableQuestions.filter(q => q.difficulty && q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());

    if (currentQuestions.length === 0) {
        console.warn(`No questions found for category '${selectedCategory}' and difficulty '${selectedDifficulty}'`);
        alert(`Ingen spørsmål funnet for '${selectedCategory}' (${selectedDifficulty}). Prøv en annen kombinasjon.`);
        // Go back to difficulty selection? Or category? Back to category for now.
        displayCategories();
        currentQuizState = 'CATEGORY_SELECT';
        document.getElementById("category-selection").hidden = false;
        document.getElementById("difficulty-selection").hidden = true;
        document.getElementById("quiz-area").hidden = true;
        return;
    }

    currentQuestions = shuffleArray(currentQuestions);
    score = 0; // Reset score for new quiz
    displayQuizArea();
    showQuestion(); // Show the first question
};


// checkAnswer now only needs the selected key, uses stored correct key
const checkAnswer = (selectedKey) => {
    if (currentQuizState !== 'AWAITING_ANSWER') return; // Prevent accidental checks

    let buttons = document.querySelectorAll(".option-btn");
    let isCorrect = selectedKey === currentCorrectAnswer;

    // Disable buttons and apply styling
    buttons.forEach(btn => {
        btn.disabled = true;
        const btnKey = btn.getAttribute('data-answer-key'); // Get key from data attribute

        if (btnKey === currentCorrectAnswer) {
            btn.classList.add("correct");
        }
        if (btnKey === selectedKey) {
            btn.classList.add(isCorrect ? "correct" : "incorrect");
        }
    });

    if (isCorrect) {
        score++;
        updateScore();
    }

    currentQuizState = 'SHOWING_ANSWER'; // Intermediate state

    // Move to the next question after a delay
    setTimeout(() => {
        currentQuestions.shift(); // Remove the answered question
        showQuestion(); // Display the next one (or end quiz)
    }, 2500); // 2.5 second delay
};


const shuffleArray = (array) => {
    // Fisher-Yates shuffle for better randomness
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const updateScore = () => {
    const scoreSpan = document.getElementById("score");
    if (scoreSpan) {
        scoreSpan.innerText = score;
    }
};

// Make this globally accessible for the voice module to call
// Make this globally accessible for the voice module to call
// Make this globally accessible for the voice module to call
// Make this globally accessible for the voice module to call
window.processVoiceCommand = (command) => {
  // Log the raw command received and the current state for debugging
  console.log(`Processing voice command: "${command}" in state: ${currentQuizState}`);

  // Convert received command to lowercase and trim whitespace for reliable matching
  const commandLower = command.toLowerCase().trim();

  // Determine action based on the current state of the quiz
  switch (currentQuizState) {

      case 'CATEGORY_SELECT': // This part should already be correct from the previous step
          // Define the mapping from English voice command to Norwegian category name
          const categoryMap = {
              "general knowledge": "Generell Kunnskap",
              "history": "Historie",         // TODO: Ensure mapping exists for all categories in JSON/Python grammar
              "geography": "Geografi",       // TODO: Ensure mapping exists for all categories in JSON/Python grammar
              "science": "Vitenskap",        // TODO: Ensure mapping exists for all categories in JSON/Python grammar
              "random question": "Tilfeldig spørsmål" // Mapping for the random button
          };
          // Find the Norwegian category name corresponding to the English command
          const targetCategory = categoryMap[commandLower];

          if (targetCategory) {
               // If a mapping was found, proceed with feedback and selection
               console.log(`Match: Selecting category "${targetCategory}" (from "${commandLower}")`);

               // --- Add Visual Feedback ---
              let targetButton = null;
              // Find the button among dynamically generated ones
              const buttons = document.querySelectorAll("#categories .category-btn");
              buttons.forEach(btn => {
                if (btn.innerText === targetCategory) {
                    targetButton = btn;
                }
              });

              // Also check the hardcoded "Tilfeldig spørsmål" button if needed
              if (!targetButton && targetCategory === "Tilfeldig spørsmål") {
                targetButton = document.getElementById("tilfeldige-sporsmaal");
              }

              // Apply feedback if button found, then proceed
              if (targetButton) {
                  // Add the highlight class
                  targetButton.classList.add('voice-selected-feedback');

                  // Set a timer to remove the class and THEN call selectCategory
                  setTimeout(() => {
                      targetButton.classList.remove('voice-selected-feedback');
                      // Call selectCategory AFTER the feedback timeout
                      selectCategory(targetCategory); // Proceed to next step
                  }, 750); // Wait 750ms (adjust timing as needed)

              } else {
                  // Fallback if button DOM element not found (shouldn't usually happen)
                  console.warn("Target category button not found for feedback:", targetCategory);
                  selectCategory(targetCategory); // Proceed without feedback
              }
              // --- End Visual Feedback ---

          } else {
              // If no mapping found, log it
              console.log("No matching category found for voice command:", commandLower);
          }
          break; // End of CATEGORY_SELECT case


      // ***** THIS IS THE UPDATED BLOCK *****
      case 'DIFFICULTY_SELECT':
           // Define the mapping from English voice command to Norwegian difficulty value
          const difficultyMap = {
              "easy": "lett",
              "medium": "middels",
              "hard": "vanskelig"
          };
           // Find the Norwegian difficulty value corresponding to the English command
          const targetDifficulty = difficultyMap[commandLower]; // e.g., "lett"

          if (targetDifficulty) {
              // If a mapping was found, proceed with feedback and selection
              console.log(`Match: Selecting difficulty "${targetDifficulty}" (from "${commandLower}")`);

              // --- Add Visual Feedback ---
              let targetButton = null;
              // Find the button using the data-difficulty attribute (make sure you added this in quiz.html)
              const buttons = document.querySelectorAll(".difficulty-btn");
              buttons.forEach(btn => {
                  // Check if the button's data-difficulty matches the target value
                  if (btn.getAttribute('data-difficulty') === targetDifficulty) {
                      targetButton = btn;
                  }
              });

              // Apply feedback if button found, then proceed
              if (targetButton) {
                  // Add the highlight class
                  targetButton.classList.add('voice-selected-feedback');

                  // Set a timer to remove the class and THEN call selectDifficulty
                  setTimeout(() => {
                      targetButton.classList.remove('voice-selected-feedback');
                      // Call selectDifficulty AFTER the feedback timeout
                      selectDifficulty(targetDifficulty); // Proceed to next step
                  }, 750); // Wait 750ms (adjust timing as needed)

              } else {
                  // Fallback if button DOM element not found
                  console.warn("Target difficulty button not found for feedback:", targetDifficulty);
                  selectDifficulty(targetDifficulty); // Proceed without feedback
              }
              // --- End Visual Feedback ---

          } else {
              // If no mapping found, log it
              console.log("No matching difficulty found for voice command:", commandLower);
          }
          break; // End of DIFFICULTY_SELECT case
      // ***** END OF UPDATED BLOCK *****


      case 'AWAITING_ANSWER': // This part remains the same
          // Define the mapping for answer letters (lowercase voice command to uppercase key)
          const answerMap = {
              "a": "A",
              "b": "B",
              "c": "C",
              "d": "D"
           };
          // Find the uppercase answer key corresponding to the lowercase voice command
          const selectedKey = answerMap[commandLower];

          if (selectedKey) {
               // If a valid answer key (A, B, C, or D) was spoken, call checkAnswer
              console.log(`Match: Checking answer "${selectedKey}" (from "${commandLower}")`);
              checkAnswer(selectedKey); // Pass the uppercase key (e.g., "A")
          } else {
               // If command wasn't a, b, c, or d, log it
              console.log("No matching answer option (A, B, C, D) found for voice command:", commandLower);
          }
          break; // End of AWAITING_ANSWER case

      case 'SHOWING_ANSWER': // This part remains the same
          // Currently, the quiz automatically moves to the next question after a delay.
          // We don't need to process commands like "next" here unless we change that logic.
          // For now, just ignore commands received while the answer is shown.
          console.log("Ignoring voice command while showing answer.");
          break; // End of SHOWING_ANSWER case

      default: // This part remains the same
           // Handle commands that might be global, or log unexpected state issues
           if (commandLower === "home") { // Example: Global command to go home
                console.log("Match: Going home");
                returnToHome(); // Assuming returnToHome() is globally accessible or defined here
           } else {
               console.log(`Voice command "${commandLower}" received in unexpected state: ${currentQuizState}`);
           }
          break; // End of default case
  }
}; // End of processVoiceCommand function

// Navigation function (already present)
const returnToHome = () => {
    window.location.href = "/index.html"; // Make sure this path is correct
};
// Make it globally available if the button's onclick needs it in strict module mode
window.returnToHome = returnToHome;