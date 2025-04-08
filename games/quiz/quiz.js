let questions = {}
let selectedCategory = "";
let selectedDifficulty = "";
let currentQuestionIndex = 0;
let currentQuestions = [];
let score = 0;

// itialize WebGazer
async function initializeWebGazer() {
    try {
        if (typeof webgazer === "undefined") {
            console.error("WebGazer not loaded.");
            return;
        }

        console.log("Starting WebGazer...");
        await webgazer.setRegression('ridge')
            .setTracker('TFFacemesh')
            .showPredictionPoints(false)
            .begin();
        
        const dot = document.getElementById('gazeDot');
        if (dot) {
            webgazer.setGazeListener(function(data, clock) {
                if (data == null) return;
                dot.style.display = 'block';
                dot.style.left = data.x + 'px';
                dot.style.top = data.y + 'px';
            });
        }
        
        console.log('WebGazer initialized in Quiz');
    } catch (err) {
        console.error('Failed to initialize WebGazer:', err);
    }
}

// initialize everything when the page loads
window.onload = async () => {
    console.log("Loading quiz...");
    await initializeWebGazer();
    loadQuestions();
};

const loadQuestions = async () => {
    const response = await fetch("../../assets/data/questions.json")
    const data = await response.json();
    console.log(data)
    questions = data.categories;

    displayCategories();
}

const displayCategories = () => {
  const categoriesDiv = document.getElementById("categories");
  categoriesDiv.innerHTML = "";

  Object.keys(questions).forEach(category => {
    let btn = document.createElement("button");
    btn.innerText = category;
    btn.classList.add("category-btn");
    btn.onclick = () => selectCategory(category);
    categoriesDiv.appendChild(btn);


  })
}

const selectCategory = (category) => {
  selectedCategory = category;

  document.getElementById("category-selection").hidden = true;
  document.getElementById("difficulty-selection").hidden = false;
}

const selectDifficulty = (difficulty) => {
  selectedDifficulty = difficulty;

  loadQuiz();
}

const loadQuiz = () => {
  document.getElementById("difficulty-selection").hidden = true;
  document.getElementById("quiz-area").hidden = false;

  let availiableQuestions = [];

  if(selectedCategory === "Tilfeldig spørsmål") {
    Object.values(questions).forEach(category => {
      availiableQuestions.push(...category.questions);
    });
  } else {
    availiableQuestions = questions[selectedCategory].questions;
  }

  currentQuestions = availiableQuestions.filter(q => q.difficulty === selectedDifficulty);
  currentQuestions = shuffleArray(currentQuestions);
  
  currentQuestionIndex = 0;
  showQuestion();
}

const showQuestion = () => {
  console.log(currentQuestions);
  if (currentQuestionIndex >= currentQuestions.length) {
    alert("Quiz ferdig!");
    location.reload();
    return;
  }

  let questionObj = currentQuestions[0];
  document.getElementById("question").innerText = questionObj.question;

  let optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  Object.keys(questionObj.answers).forEach(key => {
    let btn = document.createElement("button");
    btn.innerText = `${key}: ${questionObj.answers[key]}`;
    btn.classList.add("option-btn");
    btn.onclick = () => checkAnswer(key, questionObj.correct);
    optionsDiv.appendChild(btn);
  })
}

const checkAnswer = (selected, correct) => {
  let buttons = document.querySelectorAll(".option-btn");
  let isCorrect = selected === correct;

  buttons.forEach(btn => {
      btn.disabled = true; 

      if (btn.innerText.startsWith(correct)) {
          btn.classList.add("correct"); 
      } 
      if (btn.innerText.startsWith(selected)) {
          btn.classList.add(isCorrect ? "correct" : "incorrect");
      }
  });

  if (isCorrect) {
      score++;
      updateScore();
  }

  //move to next question after a short delay
  setTimeout(() => {
      currentQuestions.shift(); 
      showQuestion();
  }, 2500);
};

const shuffleArray = (array) => {
  return array.sort(() => Math.random() - 0.5);
}

const updateScore = () => {
  document.getElementById("score").innerText = score;
};

const returnToHome = () => {
  window.location.href = "/index.html";
};