let questions = {};
let selectedCategory = "";
let selectedDifficulty = "";
let currentQuestionIndex = 0; 
let currentQuestions = [];
let score = 0;
let currentCorrectAnswer = null; 
let currentQuizState = 'CATEGORY_SELECT'; 

export async function loadQuestions() {
    console.log("Loading quiz questions...");
    try {
        
        const response = await fetch("../../assets/data/questions.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Questions loaded:", data);
        questions = data.categories;
        displayCategories();
        
        currentQuizState = 'CATEGORY_SELECT';
        document.getElementById("category-selection").hidden = false;
        document.getElementById("difficulty-selection").hidden = true;
        document.getElementById("quiz-area").hidden = true;

    } catch (error) {
        console.error("Failed to load questions:", error);
        
        document.body.innerHTML = `<h1>Error loading questions. Please check console.</h1><p>${error.message}</p>`;
    }
}

const displayCategories = () => {
    const categoriesDiv = document.getElementById("categories");
    if (!categoriesDiv) return;
    categoriesDiv.innerHTML = ""; 

    Object.keys(questions).forEach(category => {
        let btn = document.createElement("button");
        btn.innerText = category;
        btn.classList.add("category-btn");
        
        btn.onclick = () => selectCategory(category);
        categoriesDiv.appendChild(btn);
    });
};

const displayDifficulties = () => {
    
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
        
        loadQuestions(); 
        return;
    }

    let questionObj = currentQuestions[0]; 
    currentCorrectAnswer = questionObj.correct; 

    document.getElementById("question").innerText = questionObj.question;
    updateScore(); 

    let optionsDiv = document.getElementById("options");
    optionsDiv.innerHTML = ""; 

    
    if (questionObj.answers && typeof questionObj.answers === 'object') {
         Object.keys(questionObj.answers).forEach(key => {
            let btn = document.createElement("button");
            btn.innerText = `${key}: ${questionObj.answers[key]}`;
            btn.classList.add("option-btn");
            
            btn.setAttribute('data-answer-key', key);
            btn.onclick = () => checkAnswer(key); 
            optionsDiv.appendChild(btn);
         });
    } else {
        console.error("Invalid answers format for question:", questionObj);
        
         currentQuestions.shift();
         setTimeout(showQuestion, 100); 
         return;
    }

    currentQuizState = 'AWAITING_ANSWER'; 
};

const selectCategory = (category) => {
    console.log("Category selected:", category);
    selectedCategory = category;
    displayDifficulties();
};
window.selectCategory = selectCategory; 

const selectDifficulty = (difficulty) => {
    console.log("Difficulty selected:", difficulty);
    selectedDifficulty = difficulty;
    prepareQuizQuestions();
};
window.selectDifficulty = selectDifficulty; 

const prepareQuizQuestions = () => {
    let availableQuestions = [];

    if (selectedCategory === "Tilfeldig spørsmål") {
        
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
        loadQuestions(); 
        return;
    }

    currentQuestions = availableQuestions.filter(q => q.difficulty && q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());

    if (currentQuestions.length === 0) {
        console.warn(`No questions found for category '${selectedCategory}' and difficulty '${selectedDifficulty}'`);
        alert(`Ingen spørsmål funnet for '${selectedCategory}' (${selectedDifficulty}). Prøv en annen kombinasjon.`);
        
        displayCategories();
        currentQuizState = 'CATEGORY_SELECT';
        document.getElementById("category-selection").hidden = false;
        document.getElementById("difficulty-selection").hidden = true;
        document.getElementById("quiz-area").hidden = true;
        return;
    }

    currentQuestions = shuffleArray(currentQuestions);
    score = 0; 
    displayQuizArea();
    showQuestion(); 
};

const checkAnswer = (selectedKey) => {
    if (currentQuizState !== 'AWAITING_ANSWER') return; 

    let buttons = document.querySelectorAll(".option-btn");
    let isCorrect = selectedKey === currentCorrectAnswer;

    buttons.forEach(btn => {
        btn.disabled = true;
        const btnKey = btn.getAttribute('data-answer-key'); 

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

    currentQuizState = 'SHOWING_ANSWER'; 

    setTimeout(() => {
        currentQuestions.shift(); 
        showQuestion(); 
    }, 2500); 
};

const shuffleArray = (array) => {
    
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

window.processVoiceCommand = (command) => {
  
  console.log(`Processing voice command: "${command}" in state: ${currentQuizState}`);

  const commandLower = command.toLowerCase().trim();

  switch (currentQuizState) {

      case 'CATEGORY_SELECT': 
          
          const categoryMap = {
              "general knowledge": "Generell Kunnskap",
              "history": "Historie",         
              "geography": "Geografi",       
              "science": "Vitenskap",        
              "random question": "Tilfeldig spørsmål" 
          };
          
          const targetCategory = categoryMap[commandLower];

          if (targetCategory) {
               
               console.log(`Match: Selecting category "${targetCategory}" (from "${commandLower}")`);

               
              let targetButton = null;
              
              const buttons = document.querySelectorAll("#categories .category-btn");
              buttons.forEach(btn => {
                if (btn.innerText === targetCategory) {
                    targetButton = btn;
                }
              });

              
              if (!targetButton && targetCategory === "Tilfeldig spørsmål") {
                targetButton = document.getElementById("tilfeldige-sporsmaal");
              }

              
              if (targetButton) {
                  
                  targetButton.classList.add('voice-selected-feedback');

                  
                  setTimeout(() => {
                      targetButton.classList.remove('voice-selected-feedback');
                      
                      selectCategory(targetCategory); 
                  }, 750); 

              } else {
                  
                  console.warn("Target category button not found for feedback:", targetCategory);
                  selectCategory(targetCategory); 
              }
              

          } else {
              
              console.log("No matching category found for voice command:", commandLower);
          }
          break; 

      case 'DIFFICULTY_SELECT':
           
          const difficultyMap = {
              "easy": "lett",
              "medium": "middels",
              "hard": "vanskelig"
          };
           
          const targetDifficulty = difficultyMap[commandLower]; 

          if (targetDifficulty) {
              
              console.log(`Match: Selecting difficulty "${targetDifficulty}" (from "${commandLower}")`);

              
              let targetButton = null;
              
              const buttons = document.querySelectorAll(".difficulty-btn");
              buttons.forEach(btn => {
                  
                  if (btn.getAttribute('data-difficulty') === targetDifficulty) {
                      targetButton = btn;
                  }
              });

              
              if (targetButton) {
                  
                  targetButton.classList.add('voice-selected-feedback');

                  
                  setTimeout(() => {
                      targetButton.classList.remove('voice-selected-feedback');
                      
                      selectDifficulty(targetDifficulty); 
                  }, 750); 

              } else {
                  
                  console.warn("Target difficulty button not found for feedback:", targetDifficulty);
                  selectDifficulty(targetDifficulty); 
              }
              

          } else {
              
              console.log("No matching difficulty found for voice command:", commandLower);
          }
          break; 
      


      case 'AWAITING_ANSWER': 
          
          const answerMap = {
              "a": "A",
              "b": "B",
              "c": "C",
              "d": "D"
           };
          
          const selectedKey = answerMap[commandLower];

          if (selectedKey) {
               
              console.log(`Match: Checking answer "${selectedKey}" (from "${commandLower}")`);
              checkAnswer(selectedKey); 
          } else {
               
              console.log("No matching answer option (A, B, C, D) found for voice command:", commandLower);
          }
          break; 

      case 'SHOWING_ANSWER': 
          
          
          
          console.log("Ignoring voice command while showing answer.");
          break; 

      default: 
           
           if (commandLower === "home") { 
                console.log("Match: Going home");
                returnToHome(); 
           } else {
               console.log(`Voice command "${commandLower}" received in unexpected state: ${currentQuizState}`);
           }
          break; 
  }
}; 


const returnToHome = () => {
    window.location.href = "/index.html"; 
};

window.returnToHome = returnToHome;