
let questions = {};
let selectedCategory = "";
let selectedDifficulty = "";
let currentQuestions = [];
let score = 0;

const ws = new WebSocket('ws://localhost:8080');
ws.addEventListener('open', () => console.log('Serial WebSocket connected'));
ws.addEventListener('message', (event) => {
  const msg = event.data.trim().toUpperCase();
  console.log('Serial command received:', msg);
  handleSerialCommand(msg);
});

function handleSerialCommand(command) {
  switch (command) {
    case 'UP':
      navigate(-1);
      break;
    case 'DOWN':
      navigate(1);
      break;
    case 'SELECT':
      activate();
      break;
    default:
      console.warn('Unknown serial command:', command);
  }
}



function getCurrentContainer() {
  if (!document.getElementById('category-selection').hidden) {
    return document.getElementById('category-selection');
  } else if (!document.getElementById('difficulty-selection').hidden) {
    return document.getElementById('difficulty-selection');
  } else {
    return document.getElementById('quiz-area');
  }
}

function getCurrentTargets() {
  const container = getCurrentContainer();
  return Array.from(container.querySelectorAll('.dwell-target'))
    .filter((el) => !el.hidden)
    .filter((el) => {
      const st = window.getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden';
    });
}

function navigate(direction) {
  const targets = getCurrentTargets();
  if (!targets.length) return;

  let idx = targets.findIndex((el) => el.classList.contains('serial-focused'));
  if (idx >= 0) targets[idx].classList.remove('serial-focused');

  if (idx < 0) {
    
    const container = getCurrentContainer();
    idx = container.id === 'quiz-area' ? Math.floor(targets.length / 2) : 0; 
    idx = (idx + direction + targets.length) % targets.length;
  }

  targets[idx].classList.add('serial-focused');
  console.log('Focused on:', targets[idx]);
}

function activate() {
  const target = document.querySelector('.serial-focused');
  if (target) {
    console.log('Activating:', target);
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }
}

function focusFirst() {

  document.querySelectorAll('.serial-focused').forEach((el) => el.classList.remove('serial-focused'));
  const targets = getCurrentTargets();
  if (!targets.length) return;

  const container = getCurrentContainer();
  const idx = container.id === 'quiz-area' ? Math.floor(targets.length / 2) : 0;

  targets[idx].classList.add('serial-focused');
  console.log('Initial focus:', targets[idx]);
}



async function loadQuestions() {
  const resp = await fetch('../../assets/data/questions.json'); 
  const data = await resp.json();
  questions = data.categories;
  displayCategories();
  focusFirst();
}

function displayCategories() {
  const div = document.getElementById('categories');
  div.innerHTML = '';
  Object.keys(questions).forEach((cat) => {
    const btn = document.createElement('button');
    btn.innerText = cat;
    btn.className = 'category-btn dwell-target';
    btn.onclick = () => selectCategory(cat);
    div.appendChild(btn);
  });
  
  document.getElementById('tilfeldige-sporsmaal').classList.add('dwell-target');
}

function selectCategory(cat) {
  selectedCategory = cat;
  document.getElementById('category-selection').hidden = true;
  document.getElementById('difficulty-selection').hidden = false;
  
  setTimeout(focusFirst, 0);
}

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  
  document.querySelectorAll('.difficulty-btn').forEach((b) => b.classList.add('dwell-target'));
  loadQuiz();
}

function loadQuiz() {
  document.getElementById('difficulty-selection').hidden = true;
  document.getElementById('quiz-area').hidden = false;

  const allQs =
    selectedCategory === 'Tilfeldig spørsmål'
      ? Object.values(questions).flatMap((c) => c.questions)
      : questions[selectedCategory].questions;

  currentQuestions = shuffle(allQs.filter((q) => q.difficulty === selectedDifficulty));
  showQuestion();
}

function showQuestion() {
  if (!currentQuestions.length) {
    alert('Quiz ferdig!');
    return window.location.reload();
  }

  const q = currentQuestions.shift();
  document.getElementById('question').innerText = q.question;
  document.getElementById('score').innerText = score;

  const opts = document.getElementById('options');
  opts.innerHTML = '';
  Object.entries(q.answers).forEach(([k, text]) => {
    const b = document.createElement('button');
    b.innerText = `${k}: ${text}`;
    b.className = 'option-btn dwell-target';
    b.onclick = () => checkAnswer(k, q.correct);
    opts.appendChild(b);
  });


  setTimeout(focusFirst, 0);
}

function checkAnswer(sel, corr) {
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((b) => {
    b.disabled = true;
    if (b.innerText.startsWith(corr)) b.classList.add('correct');
    if (b.innerText.startsWith(sel)) b.classList.add(sel === corr ? 'correct' : 'incorrect');
  });
  if (sel === corr) score++;
  setTimeout(showQuestion, 2000);
}

function shuffle(a) {
  return a.sort(() => Math.random() - 0.5);
}

function returnToHome() {
  window.location.href = '/index.html';
}


document.querySelector('.nav-home-btn')?.classList.add('dwell-target');


loadQuestions();
