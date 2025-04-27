// Export necessary variables/functions for other modules
export let paddle, ball, blocks = [];
export let score = 0;
export let lives = 3;
export let isGameRunning = false;
export let isGameOver = false;
export let isGameWin = false;
export let animationId;
export const keys = { ArrowLeft: false, ArrowRight: false };

// Import voice state needed for paddle movement
import { voiceMovingLeft, voiceMovingRight } from './pongBreaker_voice.js';
// Import voice status for HUD drawing
import { voiceCommandStatus } from './pongBreaker_voice.js';


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

// --- Settings ---
const paddleWidth = 100;
const paddleHeight = 20;
const paddleMarginBottom = 30;
const paddleSpeed = 12;
const ballRadius = 10;
let ballSpeed = 3; // Initial speed
const blockRowCount = 6;
const blockColumnCount = 8;
const blockWidth = 75;
const blockHeight = 20;
const blockPadding = 10;
const blockOffsetTop = 50;
let blockOffsetLeft; // Calculated in init/resize

// --- Shared Audio Context (Exported) ---
// Create it here as game sounds use it too
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- Functions ---

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Recalculate block offset
  blockOffsetLeft = (canvas.width - (blockColumnCount * (blockWidth + blockPadding)) + blockPadding) / 2;
}

function playSound(frequency, type = 'sine') {
  // Use the exported audioCtx
  if (audioCtx.state === 'suspended') {
      audioCtx.resume(); // Ensure it's running for game sounds too
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.value = frequency;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
  osc.stop(audioCtx.currentTime + 0.1);
}

// Renamed from init to avoid conflict, exported
export function initGame() {
  resizeCanvas(); // Ensure layout is correct on init
  paddle = {
    width: paddleWidth, height: paddleHeight,
    x: (canvas.width - paddleWidth) / 2,
    y: canvas.height - paddleMarginBottom - paddleHeight,
    color: '#ff4757'
  };
  ball = {
    x: canvas.width / 2, y: paddle.y - ballRadius, radius: ballRadius, speed: ballSpeed,
    dx: ballSpeed * (Math.random() < 0.5 ? -1 : 1), dy: -ballSpeed, color: '#ffa502'
  };
  blocks = [];
  for (let r = 0; r < blockRowCount; r++) {
    blocks[r] = [];
    for (let c = 0; c < blockColumnCount; c++) {
      let blockX = blockOffsetLeft + c * (blockWidth + blockPadding);
      let blockY = blockOffsetTop + r * (blockHeight + blockPadding);
      blocks[r][c] = { x: blockX, y: blockY, status: 1, color: getBlockColor(r) };
    }
  }
  score = 0;
  lives = 3;
  isGameOver = false;
  isGameWin = false;
  isGameRunning = false; // Ensure game doesn't start immediately
  if (animationId) { // Clear previous loop if re-initializing
      cancelAnimationFrame(animationId);
      animationId = null;
  }
  particles = [];

  // Note: Voice flags (voiceMovingLeft/Right) are reset in the voice module's stop function
  // Note: Exit button listener is now set up in pongBreaker_main.js using exported functions

  // Initial draw after setup
  draw(); // Draw initial state
}

function getBlockColor(row) {
  const colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
  return colors[row % colors.length];
}

function drawPaddle() {
  if (!paddle) return; // Ensure paddle exists
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
  if (!ball) return;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawBlocks() {
  for (let r = 0; r < blockRowCount; r++) {
    if (!blocks[r]) continue;
    for (let c = 0; c < blockColumnCount; c++) {
      let b = blocks[r][c];
      if (b && b.status === 1) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, blockWidth, blockHeight);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(b.x, b.y, blockWidth, blockHeight);
      }
    }
  }
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px Segoe UI';
  ctx.fillText('Score: ' + score, 20, 30);
  ctx.fillText('Lives: ' + lives, canvas.width - 100, 30);

  // Use imported status
  ctx.fillStyle = voiceCommandStatus === 'listening' ? '#0f0' : (voiceCommandStatus === 'error' ? '#f00' : '#aaa');
  ctx.fillText(`Voice: ${voiceCommandStatus}`, canvas.width / 2 - 50, 30);
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.life -= 0.02;
    if (p.life <= 0) {
      particles.splice(i, 1);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + p.life + ')';
      ctx.fill();
    }
  }
}

function movePaddle() {
  if (!paddle) return;
  // Use imported voice flags
  let moveLeft = keys.ArrowLeft || keys.KeyA || voiceMovingLeft;
  let moveRight = keys.ArrowRight || keys.KeyD || voiceMovingRight;

  if (moveLeft && paddle.x > 0) {
      paddle.x -= paddleSpeed;
  } else if (moveRight && paddle.x + paddle.width < canvas.width) {
      paddle.x += paddleSpeed;
  }

  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function moveBall() {
    if (!ball || !paddle) return;
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall collisions
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) { ball.dx = -ball.dx; playSound(200); }
  if (ball.y - ball.radius < 0) { ball.dy = -ball.dy; playSound(200); }

  // Paddle collision
  if (ball.y + ball.radius > paddle.y && ball.y - ball.radius < paddle.y + paddle.height &&
      ball.x + ball.radius > paddle.x && ball.x - ball.radius < paddle.x + paddle.width)
  {
    let collidePoint = ball.x - (paddle.x + paddle.width / 2);
    collidePoint = collidePoint / (paddle.width / 2);
    let angle = collidePoint * (Math.PI / 3);
    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = -ball.speed * Math.cos(angle); // Always bounce up
    ball.y = paddle.y - ball.radius; // Prevent sticking
    playSound(300);
  }

  // Bottom collision (lose life)
  if (ball.y + ball.radius > canvas.height) {
    lives--;
    if (lives > 0) {
      resetBallAndPaddle();
    } else {
      isGameOver = true;
      isGameRunning = false;
      showOverlay('Game Over<br>Click, press Space, or say Start');
    }
  }
}

function collisionDetection() {
    if (!ball) return;
  for (let r = 0; r < blockRowCount; r++) {
      if (!blocks[r]) continue;
    for (let c = 0; c < blockColumnCount; c++) {
      let b = blocks[r][c];
      if (b && b.status === 1) {
        if (ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + blockWidth &&
            ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + blockHeight)
        {
          ball.dy = -ball.dy; // Simple vertical bounce off blocks
          b.status = 0;
          score += 10;
          // Speed increase removed for simplicity, can be added back
          playSound(400);
          createParticles(ball.x, ball.y); // Particle effect

          // Check win condition
          if (checkWinCondition()) {
             isGameWin = true;
             isGameRunning = false;
             showOverlay('You Win!<br>Click, press Space, or say Start');
          }
          return; // Exit after one collision per frame
        }
      }
    }
  }
}

function checkWinCondition() {
     for (let r = 0; r < blockRowCount; r++) {
         if (!blocks[r]) continue;
         for (let c = 0; c < blockColumnCount; c++) {
             if (blocks[r][c] && blocks[r][c].status === 1) {
                 return false; // Found an active block
             }
         }
     }
     return true; // No active blocks found
}


function createParticles(x, y) {
     for (let i = 0; i < 10; i++) {
            particles.push({
              x: x, y: y,
              dx: (Math.random() - 0.5) * 4, dy: (Math.random() - 0.5) * 4,
              radius: 2, life: 1
            });
     }
}

function resetBallAndPaddle() {
    if (!paddle || !ball) return;
  paddle.x = (canvas.width - paddle.width) / 2;
  ball.x = canvas.width / 2;
  ball.y = paddle.y - ball.radius;
  ball.dx = ball.speed * (Math.random() < 0.5 ? -1 : 1);
  ball.dy = -ball.speed;
}

function gameLoop() {
  if (!isGameRunning) return; // Stop loop if game not running

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBlocks();
  drawPaddle();
  drawBall();
  drawHUD();
  updateParticles();

  movePaddle(); // Handle player input / voice flags
  moveBall();   // Move ball and handle collisions
  collisionDetection(); // Handle ball-block collisions

  animationId = requestAnimationFrame(gameLoop); // Continue loop
}

// Combined drawing function
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBlocks();
    drawPaddle();
    drawBall();
    drawHUD();
    updateParticles();
}


export function startGame() {
  if (isGameRunning) return; // Don't start if already running
  hideOverlay();
  isGameRunning = true;
  // Reset ball/paddle only if starting from game over/win state?
  // Or maybe reset always when starting? Let's reset always for now.
  resetBallAndPaddle();
  // Voice setup is now handled externally by pongBreaker_main.js calling initializeVoice
  gameLoop(); // Start the loop
}

// --- Overlay Functions (can be used by main module) ---
export function showOverlay(message) {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.innerHTML = message;
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
}

export function hideOverlay() {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);
}

// --- Event Listeners Setup (Called from main module) ---
export function setupGameEventListeners() {
    window.addEventListener('resize', () => {
        resizeCanvas();
        draw(); // Redraw static elements on resize
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = true;
        // Space handling moved to main module to interact with both game and voice state
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = false;
    });

    // Mouse controls
    canvas.addEventListener('mousemove', (e) => {
        if (!paddle) return;
        const rect = canvas.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        paddle.x = mouseX - paddle.width / 2;
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    });

    // Click on canvas to start/restart
    canvas.addEventListener('click', () => {
      if (!isGameRunning) {
        if (isGameOver || isGameWin) {
          initGame(); // Reinitialize game state
        }
        startGame();
      }
    });
}

// Initial Draw Call might be needed after init
// initGame(); // Call init explicitly? Or let main handle it. Let main handle it.