let questions = {}
let selectedCategory = "";
let selectedDifficulty = "";
let currentQuestionIndex = 0;
let currentQuestions = [];
let score = 0;

// Define functions first
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
    btn.classList.add("category-btn", "dwell-target");
    btn.onclick = () => selectCategory(category);
    categoriesDiv.appendChild(btn);
  });
  
  const randomBtn = document.getElementById("tilfeldige-sporsmaal");
  if(randomBtn) {
      randomBtn.classList.add("dwell-target");
  }
}

const selectCategory = (category) => {
  selectedCategory = category;

  document.getElementById("category-selection").hidden = true;
  document.getElementById("difficulty-selection").hidden = false;
}

const selectDifficulty = (difficulty) => {
  selectedDifficulty = difficulty;
  document.querySelectorAll('#difficulty-selection .difficulty-btn').forEach(btn => {
      btn.classList.add("dwell-target");
  });
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
    btn.classList.add("option-btn", "dwell-target");
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

// Add dwell target to static buttons after defining functions
const homeBtn = document.querySelector(".nav-home-btn");
if (homeBtn) {
    homeBtn.classList.add("dwell-target");
}

document.querySelectorAll('#difficulty-selection .difficulty-btn').forEach(btn => {
      btn.classList.add("dwell-target");
});

// --- Start loading questions AFTER all functions are defined ---
loadQuestions();