// serialHandler.js

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const { broadcastMessage } = require('./webSocketHandler');

// 1) Open the serial port
const port = new SerialPort({
  path: '/tmp/ttyS1',
  baudRate: 9600,
});

// 2) Set up a line-based parser
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// 3) Handle low-level serial events
port.on('open', () => console.log('Serial port is open'));
port.on('error', err => console.error('Serial Port Error:', err.message));
port.on('data', data => console.log('Raw Serial Data:', data));

// 4) Start the WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
wss.on('listening', () => console.log('WebSocket server running on ws://localhost:8080'));
wss.on('connection', ws => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

// 5) Forward parsed lines — exactly once each — to all clients
parser.on('data', line => {
  const msg = line.trim();
  console.log('Serial Data Received:', msg);
  broadcastMessage(wss, msg);
});
