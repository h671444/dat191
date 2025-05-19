# NordicNeuroLabs Button Input System

This repository contains a Node.js-based system for testing and evaluating the button input method via serial communication. The setup is designed for technical evaluation of latency, precision, and reliability of button-based input, as used in MR-compatible environments.

---

## About

This project is a submodule of DAT191 at HVL, focusing exclusively on the button input method. It enables simulation, logging, and analysis of button presses sent over a serial port, with results broadcast to web clients via WebSocket.

---

## Project Structure

```
dat191/
├── src/
│   ├── games/
│   │   └── quiz/
│   │       ├── quiz-serial.css
│   │       ├── quiz-serial.html
│   │       └── quiz-serial.js
│   └── server/
│       ├── serialHandler.js
│       ├── serialInputHandler.js
│       └── webSocketHandler.js
├── scripts/
│   └── simulate_buttons.sh         # (If present) Bash script for simulating button presses
├── package.json
├── package-lock.json
└── README.md
```

---

## Prerequisites

- Node.js (v14 or higher recommended)
- socat (for creating virtual serial ports on macOS/Linux)
- Bash (for running simulation script)

---

## Setup & Usage

### 1. Create Virtual Serial Ports

Open a terminal and run:
```bash
socat -d -d pty,raw,echo=0 pty,raw,echo=0
```
Note the two device names printed (e.g., `/dev/ttys011` and `/dev/ttys012`).

### 2. Configure the Server

Edit `src/server/serialHandler.js` and set the `path` to one of the virtual ports (e.g., `/dev/ttys011`).

### 3. Install Dependencies

From the project root:
```bash
npm install
```

### 4. Start the Server

```bash
node src/server/serialHandler.js
```
You should see:
```
WebSocket server running on ws://localhost:8080
Serial port is open
```

### 5. Simulate Button Presses

If you have the script `scripts/simulate_buttons.sh`, set `PORT` to the other virtual port (e.g., `/dev/ttys012`), then run:
```bash
bash scripts/simulate_buttons.sh
```
This will send a series of simulated button presses to the server.

### 6. View Results

Latency and command logs will appear in the terminal running `serialHandler.js`.  
You can analyze these logs to evaluate system responsiveness.

---

## Technologies Used

- Node.js
- WebSocket
- serialport (npm package)
- socat (for virtual serial ports)
- Bash

---

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
