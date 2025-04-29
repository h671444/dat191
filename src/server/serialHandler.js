const { SerialPort } = require('serialport');
const WebSocket = require('ws');

// Set up the real serial port
const port = new SerialPort({
  path: '/dev/ttys003', // Replace with the correct serial port path
  baudRate: 9600,       // Match the baud rate of your device
});

// Add event listener for when the serial port is open
port.on('open', () => {
  console.log('Serial port is open');
});

// Add error handling for the serial port
port.on('error', (err) => {
  console.error('Serial Port Error:', err.message);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Forward serial data to WebSocket clients
  port.on('data', (data) => {
    console.log('Raw Serial Data:', data); // Log raw data as a buffer
    const message = data.toString().trim();
    console.log('Serial Data Received:', message);

    // Forward data to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log('Sending to WebSocket client:', message);
        client.send(message);
      } else {
        console.log('WebSocket client not ready');
      }
    });
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:8080');