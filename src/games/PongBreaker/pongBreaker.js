/* initial setup & global variables */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let particles = []; 

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let paddle, ball, blocks = [];
let score = 0;
let lives = 3;
let isGameRunning = false;
let isGameOver = false;
let isGameWin = false;
let animationId;
const keys = { ArrowLeft: false, ArrowRight: false };

const paddleWidth = 300;
const paddleHeight = 20;
const paddleMarginBottom = 30;
const paddleSpeed = 5;

const ballRadius = 10;
let ballSpeed = 10;

const blockRowCount = 6;
const blockColumnCount = 8;
const blockWidth = 75;
const blockHeight = 20;
const blockPadding = 10;
const blockOffsetTop = 50;
let blockOffsetLeft = (canvas.width - (blockColumnCount * (blockWidth + blockPadding)) + blockPadding) / 2;

function init() {

  paddle = {
    width: paddleWidth,
    height: paddleHeight,
    x: (canvas.width - paddleWidth) / 2,
    y: canvas.height - paddleMarginBottom - paddleHeight,
    color: '#ff4757'
  };

  ball = {
    x: canvas.width / 2,
    y: paddle.y - ballRadius,
    radius: ballRadius,
    speed: ballSpeed,
    dx: ballSpeed * (Math.random() < 0.5 ? -1 : 1),
    dy: -ballSpeed,
    color: '#ffa502'
  };
  // initialize blocks
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
  particles = [];

  ctx.textAlign = 'left'; 
  ctx.textBaseline = 'alphabetic';
}

function getBlockColor(row) {
  const colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
  return colors[row % colors.length];
}

function drawPaddle() {
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  // Draw outline in white
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

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

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px Segoe UI';
  ctx.fillText('Score: ' + score, 20, 30);
  ctx.fillText('Lives: ' + lives, 150, 30);
}


// move paddle (keyboard controls)
function movePaddle() {
  if ((keys.ArrowLeft || keys.KeyA) && paddle.x > 0) {
    paddle.x -= paddleSpeed;
  }
  if ((keys.ArrowRight || keys.KeyD) && paddle.x + paddle.width < canvas.width) {
    paddle.x += paddleSpeed;
  }
}

// move ball and check collisions with walls and paddle
function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // collision with left/right walls
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx = -ball.dx;
    playSound(200, 'sine');
  }
  // collision with ceiling
  if (ball.y - ball.radius < 0) {
    ball.dy = -ball.dy;
    playSound(200, 'sine');
  }
  // collision detection with paddle
  if (
    ball.y + ball.radius > paddle.y && 
    ball.y - ball.radius < paddle.y + paddle.height &&
    ball.x + ball.radius > paddle.x && 
    ball.x - ball.radius < paddle.x + paddle.width
  ) {
    // calculate overlaps
    let overlapLeft = ball.x + ball.radius - paddle.x;
    let overlapRight = (paddle.x + paddle.width) - (ball.x - ball.radius);
    let overlapTop = ball.y + ball.radius - paddle.y;
    let overlapBottom = (paddle.y + paddle.height) - (ball.y - ball.radius);
    
    // Find the smallest overlap to determine primary hit side
    let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    
    if (minOverlap === overlapTop) {
      // hit top of paddle
      let collidePoint = ball.x - (paddle.x + paddle.width / 2);
      collidePoint = collidePoint / (paddle.width / 2);
      let angle = collidePoint * (Math.PI / 3); // max 60 degree bounce angle
      ball.dx = ball.speed * Math.sin(angle);
      ball.dy = -ball.speed * Math.cos(angle);
      // position adjustment: move ball above paddle
      ball.y = paddle.y - ball.radius;
      // check and correct horizontal overlap (for corners)
      if (ball.x + ball.radius > paddle.x + paddle.width) {
        ball.x = paddle.x + paddle.width + ball.radius; // right edge
      } else if (ball.x - ball.radius < paddle.x) {
        ball.x = paddle.x - ball.radius; // left edge
      }
    } else if (minOverlap === overlapLeft) {
      // hit left side
      ball.dx = -Math.abs(ball.dx); 
      ball.x = paddle.x - ball.radius; 
      // add slight vertical nudge if dy is small
      if (Math.abs(ball.dy) < 1) {
        ball.dy = -2; 
      }
      // correct vertical overlap if near top
      if (ball.y + ball.radius > paddle.y) {
        ball.y = paddle.y - ball.radius;
      }
    } else if (minOverlap === overlapRight) {
      // hit right side
      ball.dx = Math.abs(ball.dx); 
      ball.x = paddle.x + paddle.width + ball.radius; 
      // add slight vertical nudge if dy is small
      if (Math.abs(ball.dy) < 1) {
        ball.dy = -2; 
      }
      // correct vertical overlap if near top
      if (ball.y + ball.radius > paddle.y) {
        ball.y = paddle.y - ball.radius;
      }
    } else if (minOverlap === overlapBottom) {
      // hit bottom
      ball.dy = Math.abs(ball.dy);
      ball.y = paddle.y + paddle.height + ball.radius;
    }
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
// collision detection with blocks
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
          // determine which side the ball hit
          if (ball.x > b.x && ball.x < b.x + blockWidth) {
            ball.dy = -ball.dy; // hit top or bottom
          } else {
            ball.dx = -ball.dx; // hit left or right
          }
          b.status = 0;
          score += 10;
          // increase ball speed every 50 points, up to a max of 10
          if (score % 50 === 0 && ball.speed < 10) {
            let scalingFactor = (ball.speed + 0.5) / ball.speed;
            ball.dx *= scalingFactor;
            ball.dy *= scalingFactor;
            ball.speed += 0.5;
          }
          playSound(400, 'sine');
          // generate particles (destruction effect)
          for (let i = 0; i < 5; i++) {
            particles.push({
              x: ball.x,
              y: ball.y,
              dx: (Math.random() - 0.5) * 4,
              dy: (Math.random() - 0.5) * 4,
              radius: 2,
              life: 1
            });
          }
          // check win condition
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

function resetBallAndPaddle() {
  paddle.x = (canvas.width - paddle.width) / 2;
  ball.x = canvas.width / 2;
  ball.y = paddle.y - ball.radius;
  ball.dx = ball.speed * (Math.random() < 0.5 ? -1 : 1);
  ball.dy = -ball.speed;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBlocks();
  drawPaddle();
  drawBall();
  drawHUD();
  
  // paddle control based on gaze or keyboard fallback
  if (typeof latestGazeData !== 'undefined' && latestGazeData !== null && latestGazeData.x !== null) {
    // Calculate the target x-position based on gaze, centered
    let targetX = latestGazeData.x - paddle.width / 2;
    
    if (targetX < 0) {
      targetX = 0;
    }
    if (targetX + paddle.width > canvas.width) {
      targetX = canvas.width - paddle.width;
    }
    
    // smoothly interpolate paddle's current x towards the target x
    const smoothingFactor = 0.4; 
    paddle.x += (targetX - paddle.x) * smoothingFactor;
    
  } else {
    // fallback to keyboard if gaze is not available
    movePaddle(); 
  }
  
  moveBall();
  collisionDetection();
  updateParticles();
  if (isGameRunning) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

// keyboard controls (move left/right, start/restart, exit)
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
  // exit with Escape key
  if (e.code === 'Escape') {
    exitGame(); 
  }
});
document.addEventListener('keyup', function(e) {
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
      e.code === 'KeyA' || e.code === 'KeyD') {
    keys[e.code] = false;
  }
});
// click on canvas to start/restart the game
canvas.addEventListener('click', function() {
  if (!isGameRunning) {
    if (isGameOver || isGameWin) {
      init();
    }
    startGame();
  }
});

// exit game function
function exitGame() {
  // console.log("Exiting game..."); 
  // pause the game loop if it's running
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null; // Clear the ID
    isGameRunning = false; 
    // console.log("Animation frame cancelled.");
  }
  // navigate back to the main lobby/hub
  try {
      window.location.href = '../../index.html'; 
      // console.log("Redirecting to index.html..."); 
  } catch (err) {
      console.error("Error during redirection:", err);
      alert("Could not redirect back to the main menu.");
  }
}


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


function startGame() {
  hideOverlay();
  isGameRunning = true;
  gameLoop();
}

// update and draw particles (block destruction effect)
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

init();

