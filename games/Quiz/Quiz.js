let questions = {}
let selectedCategory = "";
let selectedDifficulty = "";
let currentQuestionIndex = 0;
let currentQuestions = [];

const loadQuestions = async () => {
    const response = await fetch("../../assets/questions.json")
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

  if(selectedCategory === "random") {
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
  if (selected === correct) {
    alert("Riktig");
  } else {
    alert("Feil");
  }

  //removes used question from our currentQuestion array (removes first elem)
  currentQuestions.shift();
  showQuestion();
}

const shuffleArray = (array) => {
  return array.sort(() => Math.random() - 0.5);
}


window.onload = loadQuestions;