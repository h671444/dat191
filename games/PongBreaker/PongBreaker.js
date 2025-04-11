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

// Init av stemmestyring 
const VOSK_SERVER_URL = "ws://localhost:8765";
let websocket = null;
let audioContext = null;
let microphoneStream = null;
let scriptProcessor = null; // Or AudioWorkletNode
const VOSK_BUFFER_SIZE = 4096; // Size of audio chunks to send
let isVoiceRecognitionActive = false;
let voiceCommandStatus = 'disconnected'; // For potential UI feedback

const VOICE_COMMANDS = {
  LEFT: 'left',
  RIGHT: 'right',
  START: 'start',
  STOP: 'stop', // Added stop
  EXIT: 'exit'  // If you implement exit functionality
};

let voiceMovingLeft = false;
let voiceMovingRight = false;

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
const paddleSpeed = 10;

// Ball Settings
const ballRadius = 10;
let ballSpeed = 3;

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

  voiceMovingLeft = false;
  voiceMovingRight = false;

  const exitButton = document.getElementById('exitButton');
  if (exitButton) { // Check if button exists before adding listener
       exitButton.addEventListener('click', () => {
          console.log("Exit button clicked");
          stopVoiceRecognition(); // Stop voice before exiting
          // Add your actual exit logic here (e.g., redirect)
          // window.location.href = '/lobby.html';
          alert("Exiting game (implement actual exit logic here)");
       });
  } else {
       console.warn("Exit button not found during init!"); // Warning if button missing
  }
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

  ctx.fillStyle = voiceCommandStatus === 'listening' ? '#0f0' : (voiceCommandStatus === 'error' ? '#f00' : '#aaa');
  ctx.fillText(`Voice: ${voiceCommandStatus}`, canvas.width / 2 - 50, 30);
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

  // Combine keyboard and voice controls into single flags
  let moveLeft = keys.ArrowLeft || keys.KeyA || voiceMovingLeft;
  let moveRight = keys.ArrowRight || keys.KeyD || voiceMovingRight;

  // Optional: Prevent moving both directions at once if desired
  // if (moveLeft && moveRight) {
  //     moveLeft = false;
  //     moveRight = false;
  // }

  // Apply movement based ONLY on the combined flags
  if (moveLeft && paddle.x > 0) {
      paddle.x -= paddleSpeed;
  } else if (moveRight && paddle.x + paddle.width < canvas.width) {
      // Using 'else if' ensures paddle only moves one way per frame
      paddle.x += paddleSpeed;
  }

  // Clamp paddle position (Boundary checks)
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
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

function resampleBuffer(inputBuffer, targetSampleRate) {
  const inputData = inputBuffer.getChannelData(0); // Assuming mono audio
  const inputSampleRate = inputBuffer.sampleRate;

  if (inputSampleRate === targetSampleRate) {
      console.log("Input and target sample rates are the same. No resampling needed.");
      return inputData; // Return original data if rates match
  }

  console.log(`Resampling from ${inputSampleRate} Hz to ${targetSampleRate} Hz`);
  const outputLength = Math.floor(inputData.length * targetSampleRate / inputSampleRate);
  const outputData = new Float32Array(outputLength);
  const ratio = inputSampleRate / targetSampleRate;

  for (let i = 0; i < outputLength; i++) {
      const theoreticalIndex = i * ratio;
      const indexLow = Math.floor(theoreticalIndex);
      const indexHigh = Math.min(indexLow + 1, inputData.length - 1); // Clamp high index
      const weightHigh = theoreticalIndex - indexLow; // Weight for the higher index sample

      // Linear interpolation
      outputData[i] = inputData[indexLow] * (1 - weightHigh) + inputData[indexHigh] * weightHigh;
  }
  return outputData;
}

function handleVoiceCommand(command) {
  console.log("Voice command received:", command);
  switch (command) {
      case VOICE_COMMANDS.LEFT:
          voiceMovingLeft = true;
          voiceMovingRight = false;
          // If you prefer discrete taps instead of holding:
          // paddle.x -= paddleSpeed * 3; // Move a fixed amount
          break;
      case VOICE_COMMANDS.RIGHT:
          voiceMovingRight = true;
          voiceMovingLeft = false;
          // If you prefer discrete taps instead of holding:
          // paddle.x += paddleSpeed * 3; // Move a fixed amount
          break;
      case VOICE_COMMANDS.STOP: // Command to stop paddle movement
           voiceMovingLeft = false;
           voiceMovingRight = false;
          break;
      case VOICE_COMMANDS.START:
          if (!isGameRunning) {
              if (isGameOver || isGameWin) {
                  init(); // Re-initialize if game was over
              }
              startGame();
          }
          break;
      case VOICE_COMMANDS.EXIT:
           // Implement exit logic (e.g., redirect or show menu)
           console.log("Exit command received - Implement exit logic");
           // window.location.href = '/lobby.html'; // Example
           // For now, just stop the game
           if (isGameRunning) {
               isGameRunning = false;
               if (animationId) cancelAnimationFrame(animationId);
               showOverlay('Exited via Voice<br>Click or press Space to restart');
           }
           // Maybe also stop voice recognition?
           // stopVoiceRecognition();
          break;
      default:
          console.log("Unknown voice command:", command);
          break;
  }
}

function setupVoiceRecognition() {
  if (isVoiceRecognitionActive || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Voice recognition already active or browser doesn't support getUserMedia.");
      voiceCommandStatus = 'unavailable';
      return;
  }

  // --- 1. Get Microphone Access ---
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
          microphoneStream = stream;
          // Ensure AudioContext is running (often needs user gesture)
          if (!audioContext || audioContext.state === 'suspended') {
              // Use the existing global audioCtx if available and resume it
               if (audioCtx && audioCtx.state === 'suspended') {
                  audioCtx.resume().then(() => console.log("AudioContext resumed for voice."));
                  audioContext = audioCtx; // Use the global one
               } else if (!audioCtx){
                  // Or create a new one if the global one wasn't set up
                  audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  console.log("New AudioContext created for voice.");
               } else {
                   audioContext = audioCtx; // Global one is likely running
               }
          } else if (!audioContext) {
               audioContext = audioCtx; // Use global if it exists
          }

          if (!audioContext) {
               console.error("Failed to get running AudioContext for voice.");
               voiceCommandStatus = 'error';
               return;
          }


          // --- 2. Connect WebSocket ---
          websocket = new WebSocket(VOSK_SERVER_URL);

          websocket.onopen = () => {
              console.log("WebSocket connection established.");
              voiceCommandStatus = 'connecting...'; // Temp status

               // --- 3. Process Audio ---
              const source = audioContext.createMediaStreamSource(microphoneStream);
              // Use ScriptProcessorNode (older, simpler for example, potential performance issues)
              // For production, research AudioWorkletNode
              scriptProcessor = audioContext.createScriptProcessor(VOSK_BUFFER_SIZE, 1, 1); // bufferSize, inputChannels, outputChannels

              scriptProcessor.onaudioprocess = (event) => {
                if (!websocket || websocket.readyState !== WebSocket.OPEN || !isVoiceRecognitionActive) { // <-- Use the correct variable name
                    return; // Don't process if not ready or not listening
                }
    
                const inputBuffer = event.inputBuffer; // Get the audio buffer at original sample rate (e.g., 48kHz)
    
                // --- RESAMPLE THE AUDIO ---
                const targetSampleRate = 16000; // Vosk's expected rate
                const resampledData = resampleBuffer(inputBuffer, targetSampleRate); // Returns Float32Array at 16kHz
    
                // --- Convert RESAMPLED Float32Array to Int16Array ---
                const int16Data = new Int16Array(resampledData.length);
                for (let i = 0; i < resampledData.length; i++) {
                    int16Data[i] = Math.max(-32768, Math.min(32767, resampledData[i] * 32767));
                }
    
                // --- Send the RESAMPLED and converted data ---
                try {
                    // DEBUG: Log sending attempts (optional, can comment out if console gets too noisy)
                    // console.log(`Sending resampled audio chunk (length: ${int16Data.length})`);
                    if (int16Data.length > 0) { // Only send if there's data after resampling
                         websocket.send(int16Data.buffer);
                    }
                } catch (error) {
                    console.error("Error sending audio data:", error);
                    updateStatus(`Error sending audio: ${error.message}`, true);
                    stopListening(); // Stop on send error
                }
            }; // <-- End of the modified onaudioprocess function

              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContext.destination); // Connect to output (needed for scriptProcessor)

              isVoiceRecognitionActive = true;
              voiceCommandStatus = 'listening';
              console.log("Voice recognition started.");
              // Optionally hide overlay if voice is started before game starts
               if (!isGameRunning && !isGameOver && !isGameWin) {
                   // hideOverlay(); // Or update overlay text
                    const overlay = document.getElementById('overlay');
                    overlay.innerHTML = "Voice Ready! Say 'Start'";
               }

          };

          websocket.onmessage = (event) => {
              // --- 5. Receive Commands ---
              try {
                  const data = JSON.parse(event.data);
                  if (data.command) {
                      handleVoiceCommand(data.command);
                  } else if (data.partial) {
                       // Optional: Display partial results somewhere?
                       // console.log("Partial:", data.partial);
                  }
              } catch (error) {
                  console.error("Error parsing message from server:", error);
              }
          };

          websocket.onerror = (error) => {
              console.error("WebSocket error:", error);
              voiceCommandStatus = 'error';
              stopVoiceRecognition(); // Stop recognition on error
          };

          websocket.onclose = (event) => {
              console.log("WebSocket connection closed:", event.code, event.reason);
              voiceCommandStatus = 'disconnected';
              isVoiceRecognitionActive = false; // Ensure flag is reset
              // Attempt to cleanup resources if not already done
               stopVoiceRecognition(false); // Call stop without closing socket again
          };

      })
      .catch(err => {
          console.error("Error accessing microphone:", err);
          voiceCommandStatus = 'mic error';
          alert("Could not access microphone. Please grant permission and ensure it's connected.");
      });
}

function stopVoiceRecognition(closeSocket = true) {
  if (!isVoiceRecognitionActive && !microphoneStream && !websocket) {
      // console.log("Voice recognition not active.");
      return;
  }
  console.log("Stopping voice recognition...");

  if (scriptProcessor) {
      scriptProcessor.disconnect(); // Disconnect nodes
      scriptProcessor = null;
  }
   if (microphoneStream) {
       microphoneStream.getTracks().forEach(track => track.stop()); // Stop mic access
       microphoneStream = null;
   }
  // Don't close the AudioContext generally, as game sounds might use it.
  // if (audioContext && audioContext.state !== 'closed') {
  //    audioContext.close();
  //    audioContext = null;
  // }
  if (websocket) {
      if (closeSocket && websocket.readyState === WebSocket.OPEN) {
           websocket.close();
      }
      websocket = null; // Remove reference
  }

  isVoiceRecognitionActive = false;
  voiceCommandStatus = 'stopped';
  voiceMovingLeft = false; // Reset movement state
  voiceMovingRight = false;
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

  if (!isVoiceRecognitionActive) {
    setupVoiceRecognition(); // Attempt to start voice when game starts
 }

  gameLoop();
}

// Add button to start voice recognition 
// Change TO this:
document.addEventListener('DOMContentLoaded', () => {
  init(); // Initial game setup calls init, which will now set up the button listener

  // Add voice button
  const voiceButton = document.createElement('button');
  voiceButton.id = 'voiceButton';
  voiceButton.textContent = 'Start Voice Control';
  voiceButton.style.position = 'absolute';
  voiceButton.style.top = '10px';
  voiceButton.style.left = '10px';
  voiceButton.style.padding = '10px';
  voiceButton.style.fontSize = '16px';
  voiceButton.style.cursor = 'pointer';
  voiceButton.onclick = () => {
      if (!isVoiceRecognitionActive) {
          setupVoiceRecognition();
          voiceButton.textContent = 'Stop Voice Control';
      } else {
          stopVoiceRecognition();
          voiceButton.textContent = 'Start Voice Control';
          voiceCommandStatus = 'stopped';
          drawHUD();
      }
  };
  document.body.appendChild(voiceButton);

   // Stop voice recognition when navigating away
   window.addEventListener('beforeunload', () => {
      stopVoiceRecognition();
  });
});

// DO NOT call init() here again, it's called by the listener above.

// Initialization on first load
// init();