# Eye Tracking Game Hub

A web-based game hub featuring educational games with eye-tracking capabilities. Currently includes:
- Quiz Game: Test your knowledge across various categories and difficulty levels
- Pong Breaker: A classic brick breaker game with a twist

## Features
- Eye tracking integration using WebGazer.js
- Quiz Game with multiple categories and difficulty levels
- Pong Breaker game with eye-tracking controls
- Calibration system for accurate eye tracking

## Project Structure
```
dat191/
├── src/                    # Source code
│   ├── index.html         # Main game hub page
│   ├── calibration.html   # Eye tracking calibration page
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   │   └── components/   # Modular components
│   │       └── eyeTracking/  # Eye tracking related code
│   └── games/            # Individual game implementations
├── assets/               # Static assets
└── node_modules/        # Dependencies (generated)
```

## Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Modern web browser with webcam support

## Installation

1. Clone the repository:
```bash
git clone https://github.com/h671444/dat191.git
cd dat191
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:8080/calibration.html`

## Technologies Used
- HTML5/CSS3
- JavaScript (ES6+)
- jsPsych for experiment management
- WebGazer.js for eye tracking
- EyeGesturesLite for gaze data processing

## Games

### Quiz Game
- Multiple categories of questions
- Three difficulty levels: Easy, Medium, Hard
- Score tracking
- Eye-tracking integration for accessibility

### Pong Breaker
- Classic brick breaker gameplay
- Eye-tracking controls
- Progressive difficulty

## Technologies Used
- HTML5
- CSS3
- JavaScript
- WebGazer.js for eye-tracking functionality

