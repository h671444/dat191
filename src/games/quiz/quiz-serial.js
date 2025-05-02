// --- State ---
let questions = {};
let selectedCategory = "";
let selectedDifficulty = "";
let currentQuestions = [];
let score = 0;

// --- WebSocket / Serial ---
const ws = new WebSocket('ws://localhost:8080');
ws.addEventListener('open', () => console.log('Serial WebSocket connected'));
ws.addEventListener('message', e => {
  const cmd = e.data.trim().toUpperCase();
  console.log('Serial command received:', cmd);
  handleSerialCommand(cmd);
});

function handleSerialCommand(command) {
  switch (command) {
    case 'UP':      navigate(-1);  break;
    case 'DOWN':    navigate( 1);  break;
    case 'SELECT':  activate();    break;
    default:
      console.warn('Unknown serial command:', command);
  }
}

// --- Focus helpers ---

// returns whichever screen is visible
function getCurrentContainer() {
  if (!document.getElementById('category-selection').hidden)
    return document.getElementById('category-selection');
  if (!document.getElementById('difficulty-selection').hidden)
    return document.getElementById('difficulty-selection');
  return document.getElementById('quiz-area');
}

// get only visible .dwell-target elements
function getCurrentTargets() {
  const ctr = getCurrentContainer();
  return Array.from(ctr.querySelectorAll('.dwell-target'))
    .filter(el => !el.hidden)
    .filter(el => {
      const st = window.getComputedStyle(el);
      return st.display !== 'none'
          && st.visibility !== 'hidden';
    });
}

// move the yellow outline
function navigate(delta) {
  const items = getCurrentTargets();
  if (!items.length) return;

  let idx = items.findIndex(el =>
    el.classList.contains('serial-focused')
  );
  if (idx >= 0) items[idx].classList.remove('serial-focused');

  if (idx < 0) {
    // first nav on this screen
    const screen = getCurrentContainer().id;
    idx = (screen === 'quiz-area')
      ? Math.floor(items.length/2)
      : 0;
  } else {
    idx = (idx + delta + items.length) % items.length;
  }
  items[idx].classList.add('serial-focused');
}

// “Click” the focused button
function activate() {
  const tgt = document.querySelector('.serial-focused');
  if (tgt) tgt.click();
}

// clear old and outline the default
function focusFirst() {
  document.querySelectorAll('.serial-focused')
          .forEach(el => el.classList.remove('serial-focused'));

  const items = getCurrentTargets();
  if (!items.length) return;

  const screen = getCurrentContainer().id;
  const idx = (screen === 'quiz-area')
    ? Math.floor(items.length/2)
    : 0;

  items[idx].classList.add('serial-focused');
  console.log('Initial focus on:', items[idx]);
}

// call on next microtask so DOM has updated
function delayedFocus() {
  setTimeout(focusFirst, 0);
}

// --- Quiz Logic ---

async function loadQuestions() {
  const res = await fetch('../../assets/data/questions.json');
  const data = await res.json();
  questions = data.categories;
  buildCategoryButtons();
  delayedFocus();
}

function buildCategoryButtons() {
  const div = document.getElementById('categories');
  div.innerHTML = '';
  Object.keys(questions).forEach(cat => {
    const btn = document.createElement('button');
    btn.innerText = cat;
    btn.className = 'category-btn dwell-target';
    btn.onclick = () => selectCategory(cat);
    div.appendChild(btn);
  });
}

function selectCategory(cat) {
  selectedCategory = cat;
  document.getElementById('category-selection').hidden   = true;
  document.getElementById('difficulty-selection').hidden = false;
  delayedFocus();  // ←–– outline “Lett” immediately
}

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  startQuiz();
}

function startQuiz() {
  document.getElementById('difficulty-selection').hidden = true;
  document.getElementById('quiz-area').hidden           = false;

  const allQs = (selectedCategory === 'Tilfeldig spørsmål')
    ? Object.values(questions).flatMap(c => c.questions)
    : questions[selectedCategory].questions;

  currentQuestions = shuffle(
    allQs.filter(q => q.difficulty === selectedDifficulty)
  );
  showQuestion();
}

function showQuestion() {
  if (!currentQuestions.length) {
    alert('Quiz ferdig!');
    return window.location.reload();
  }

  const q = currentQuestions.shift();
  document.getElementById('question').innerText = q.question;
  document.getElementById('score').innerText    = score;

  const opts = document.getElementById('options');
  opts.innerHTML = '';
  Object.entries(q.answers).forEach(([key, text]) => {
    const b = document.createElement('button');
    b.innerText   = `${key}: ${text}`;
    b.className   = 'option-btn dwell-target';
    b.onclick     = () => checkAnswer(key, q.correct);
    opts.appendChild(b);
  });

  delayedFocus();  // ←–– outline center answer on load
}

function checkAnswer(sel, corr) {
  document.querySelectorAll('.option-btn').forEach(b => {
    b.disabled = true;
    if (b.innerText.startsWith(corr)) b.classList.add('correct');
    if (b.innerText.startsWith(sel))
      b.classList.add(sel === corr ? 'correct' : 'incorrect');
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

// start it up
loadQuestions();
