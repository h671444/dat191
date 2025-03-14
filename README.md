# NordicNeuroLabs Game Hub

A web-based game hub featuring educational games with eye-tracking capabilities. Currently includes:
- Quiz Game: Test your knowledge across various categories and difficulty levels
- Pong Breaker: A classic brick breaker game with a twist

## Project Structure
```
dat191/
├── src/              # Source code
│   ├── index.html    # Main game hub page
│   ├── css/          # Stylesheets
│   ├── js/          # JavaScript files
│   └── games/       # Individual game implementations
├── assets/          # Static assets
│   ├── images/      # Images and graphics
│   │   ├── logo/    # Brand logos
│   │   └── games/   # Game-specific images
│   └── data/        # JSON and other data files
└── node_modules/    # Dependencies (generated)
```

## Prerequisites
- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

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

The application will be available at `http://localhost:8080`

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

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
