/* =================================
   Initial Setup & Global Variables
================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let particles = [];  // Array for particles

// Set canvas size to match window size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Recalculate block offset
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Sound playback: AudioContext activated after user interaction
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(frequency, type = 'sine') {
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

// In-game objects & variables
let paddle, ball, blocks = [];
let score = 0;
let lives = 3;
let isGameRunning = false;
let isGameOver = false;
let isGameWin = false;
let animationId;
const keys = { ArrowLeft: false, ArrowRight: false };

// Paddle Settings
const paddleWidth = 100;
const paddleHeight = 20;
const paddleMarginBottom = 30;
const paddleSpeed = 12;

// Ball Settings
const ballRadius = 10;
let ballSpeed = 7;

// Block Settings (Rows, Columns, Size, Padding)
const blockRowCount = 6; // Increased from 5 to 6
const blockColumnCount = 8;
const blockWidth = 75;
const blockHeight = 20;
const blockPadding = 10;
const blockOffsetTop = 50;
// Horizontal offset: center the blocks based on canvas width
let blockOffsetLeft = (canvas.width - (blockColumnCount * (blockWidth + blockPadding)) + blockPadding) / 2;

/* =================================
   Initialize Game Objects
================================= */
function init() {
  // Initialize Paddle
  paddle = {
    width: paddleWidth,
    height: paddleHeight,
    x: (canvas.width - paddleWidth) / 2,
    y: canvas.height - paddleMarginBottom - paddleHeight,
    color: '#ff4757'
  };
  // Initialize Ball (positioned at the center above the paddle)
  ball = {
    x: canvas.width / 2,
    y: paddle.y - ballRadius,
    radius: ballRadius,
    speed: ballSpeed,
    dx: ballSpeed * (Math.random() < 0.5 ? -1 : 1),
    dy: -ballSpeed,
    color: '#ffa502'
  };
  // Initialize Blocks
  blocks = [];
  blockOffsetLeft = (canvas.width - (blockColumnCount * (blockWidth + blockPadding)) + blockPadding) / 2;
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
  particles = []; // Reset particles as well
}
// Return a different color for each row
function getBlockColor(row) {
  const colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
  return colors[row % colors.length];
}

/* =================================
   Drawing Functions
================================= */
// Draw Paddle
function drawPaddle() {
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  // Draw outline in white
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
}
// Draw Ball
function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}
// Draw Blocks
function drawBlocks() {
  for (let r = 0; r < blockRowCount; r++) {
    for (let c = 0; c < blockColumnCount; c++) {
      let b = blocks[r][c];
      if (b.status === 1) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, blockWidth, blockHeight);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(b.x, b.y, blockWidth, blockHeight);
      }
    }
  }
}
// Draw HUD (Score & Lives)
function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px Segoe UI';
  ctx.fillText('Score: ' + score, 20, 30);
  ctx.fillText('Lives: ' + lives, canvas.width - 100, 30);
}
// Update and draw particles (Block destruction effect)
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

/* =================================
   Game Logic (Movement & Collision Detection)
================================= */
// Move paddle (keyboard controls)
function movePaddle() {
  if ((keys.ArrowLeft || keys.KeyA) && paddle.x > 0) {
    paddle.x -= paddleSpeed;
  }
  if ((keys.ArrowRight || keys.KeyD) && paddle.x + paddle.width < canvas.width) {
    paddle.x += paddleSpeed;
  }
}
// Move paddle with mouse (for improved UX)
canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  let mouseX = e.clientX - rect.left;
  paddle.x = mouseX - paddle.width / 2;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
});
// Move ball and check collisions with walls and paddle
// Move ball and check collisions with walls and paddle
function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Collision with left/right walls
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx = -ball.dx;
    playSound(200, 'sine');
  }
  // Collision with ceiling
  if (ball.y - ball.radius < 0) {
    ball.dy = -ball.dy;
    playSound(200, 'sine');
  }
  // Collision detection with paddle
  if (
    ball.y + ball.radius > paddle.y && 
    ball.y - ball.radius < paddle.y + paddle.height &&
    ball.x + ball.radius > paddle.x && 
    ball.x - ball.radius < paddle.x + paddle.width
  ) {
    // Calculate overlaps
    let overlapLeft = ball.x + ball.radius - paddle.x;
    let overlapRight = (paddle.x + paddle.width) - (ball.x - ball.radius);
    let overlapTop = ball.y + ball.radius - paddle.y;
    let overlapBottom = (paddle.y + paddle.height) - (ball.y - ball.radius);
    
    // Find the smallest overlap to determine primary hit side
    let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    
    if (minOverlap === overlapTop) {
      // Hit top of paddle
      let collidePoint = ball.x - (paddle.x + paddle.width / 2);
      collidePoint = collidePoint / (paddle.width / 2);
      let angle = collidePoint * (Math.PI / 3); // Max 60° bounce angle
      ball.dx = ball.speed * Math.sin(angle);
      ball.dy = -ball.speed * Math.cos(angle);
      // Position adjustment: move ball above paddle
      ball.y = paddle.y - ball.radius;
      // Check and correct horizontal overlap (for corners)
      if (ball.x + ball.radius > paddle.x + paddle.width) {
        ball.x = paddle.x + paddle.width + ball.radius; // Right edge
      } else if (ball.x - ball.radius < paddle.x) {
        ball.x = paddle.x - ball.radius; // Left edge
      }
    } else if (minOverlap === overlapLeft) {
      // Hit left side
      ball.dx = -Math.abs(ball.dx); // Bounce left
      ball.x = paddle.x - ball.radius; // Move ball left of paddle
      // Add slight vertical nudge if dy is small (shallow angle)
      if (Math.abs(ball.dy) < 1) {
        ball.dy = -2; // Small upward push
      }
      // Correct vertical overlap if near top
      if (ball.y + ball.radius > paddle.y) {
        ball.y = paddle.y - ball.radius;
      }
    } else if (minOverlap === overlapRight) {
      // Hit right side
      ball.dx = Math.abs(ball.dx); // Bounce right
      ball.x = paddle.x + paddle.width + ball.radius; // Move ball right of paddle
      // Add slight vertical nudge if dy is small
      if (Math.abs(ball.dy) < 1) {
        ball.dy = -2; // Small upward push
      }
      // Correct vertical overlap if near top
      if (ball.y + ball.radius > paddle.y) {
        ball.y = paddle.y - ball.radius;
      }
    } else if (minOverlap === overlapBottom) {
      // Hit bottom (unlikely since paddle is at bottom of screen)
      ball.dy = Math.abs(ball.dy);
      ball.y = paddle.y + paddle.height + ball.radius;
    }
    
    // Play sound (should only trigger once per real collision now)
    playSound(300, 'sine');
  }
  // Ball reaches bottom of screen → decrease life
  if (ball.y + ball.radius > canvas.height) {
    lives--;
    if (lives > 0) {
      resetBallAndPaddle();
    } else {
      isGameOver = true;
      isGameRunning = false;
      showOverlay('Game Over<br>Click or press Space to restart');
    }
  }
}
// Collision detection with blocks
function collisionDetection() {
  for (let r = 0; r < blockRowCount; r++) {
    for (let c = 0; c < blockColumnCount; c++) {
      let b = blocks[r][c];
      if (b.status === 1) {
        if (
          ball.x > b.x && ball.x < b.x + blockWidth &&
          ball.y - ball.radius < b.y + blockHeight &&
          ball.y + ball.radius > b.y
        ) {
          // Determine which side the ball hit
          if (ball.x > b.x && ball.x < b.x + blockWidth) {
            ball.dy = -ball.dy; // Hit top or bottom
          } else {
            ball.dx = -ball.dx; // Hit left or right
          }
          b.status = 0;
          score += 10;
          // Increase ball speed every 50 points, up to a max of 10
          if (score % 50 === 0 && ball.speed < 10) {
            let scalingFactor = (ball.speed + 0.5) / ball.speed;
            ball.dx *= scalingFactor;
            ball.dy *= scalingFactor;
            ball.speed += 0.5;
          }
          playSound(400, 'sine');
          // Generate particles (destruction effect)
          for (let i = 0; i < 10; i++) {
            particles.push({
              x: ball.x,
              y: ball.y,
              dx: (Math.random() - 0.5) * 4,
              dy: (Math.random() - 0.5) * 4,
              radius: 2,
              life: 1
            });
          }
          // Check win condition
          if (score === blockRowCount * blockColumnCount * 10) {
            isGameWin = true;
            isGameRunning = false;
            showOverlay('You Win!<br>Click or press Space to restart');
          }
        }
      }
    }
  }
}
// Reset ball and paddle positions on life loss
function resetBallAndPaddle() {
  paddle.x = (canvas.width - paddle.width) / 2;
  ball.x = canvas.width / 2;
  ball.y = paddle.y - ball.radius;
  ball.dx = ball.speed * (Math.random() < 0.5 ? -1 : 1);
  ball.dy = -ball.speed;
}

/* =================================
   Main Game Loop
================================= */
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBlocks();
  drawPaddle();
  drawBall();
  drawHUD();
  movePaddle();
  moveBall();
  collisionDetection();
  updateParticles();
  if (isGameRunning) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

/* =================================
   User Input Handling
================================= */
// Keyboard controls (move left/right, start/restart)
document.addEventListener('keydown', function(e) {
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
      e.code === 'KeyA' || e.code === 'KeyD') {
    keys[e.code] = true;
  }
  if (e.code === 'Space') {
    if (!isGameRunning) {
      if (isGameOver || isGameWin) {
        init();
      }
      startGame();
    }
  }
});
document.addEventListener('keyup', function(e) {
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
      e.code === 'KeyA' || e.code === 'KeyD') {
    keys[e.code] = false;
  }
});
// Click on canvas to start/restart the game
canvas.addEventListener('click', function() {
  if (!isGameRunning) {
    if (isGameOver || isGameWin) {
      init();
    }
    startGame();
  }
});

/* =================================
   Overlay Show/Hide
================================= */
function showOverlay(message) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = message;
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
}
function hideOverlay() {
  const overlay = document.getElementById('overlay');
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 300);
}

/* =================================
   Start Game
================================= */
function startGame() {
  hideOverlay();
  isGameRunning = true;
  gameLoop();
}

// Initialization on first load
init();