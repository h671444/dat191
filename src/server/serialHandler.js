// serialHandler.js

const { SerialPort } = require('serialport');
const { ByteLengthParser } = require('@serialport/parser-byte-length');
const WebSocket = require('ws');
const { broadcastMessage } = require('./webSocketHandler');

// 1) Åpne den serielle porten
const port = new SerialPort({
  path: '/dev/tty.usbserial-A104GCRM', // Oppdater denne om nødvendig
  baudRate: 57600,
});

// 2) Sett opp en parser som leser inn én byte om gangen
const parser = port.pipe(new ByteLengthParser({ length: 1 }));

// 3) Håndter lavnivå serial‐hendelser
port.on('open', () => console.log('Serial port is open'));
port.on('error', (err) => console.error('Serial Port Error:', err.message));

// 4) Start WebSocket‐serveren
const wss = new WebSocket.Server({ port: 8080 });
wss.on('listening', () =>
  console.log('WebSocket server running on ws://localhost:8080')
);
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

// 5) Les hver byte, map til kommando og broadcast
parser.on('data', (buf) => {
  const msg = buf.toString('utf8').trim(); // 'a', 'b', 'c' eller 'd'
  console.log('Serial Data Received:', msg);

  let command;
  switch (msg) {
    case 'a': // Venstre kontroller, øvre knapp
      command = 'UP';
      break;
    case 'b': // Venstre kontroller, nedre knapp
      command = 'DOWN';
      break;
    case 'c': // Høyre kontroller, nedre knapp
      command = 'SELECT';
      break;
    case 'd': // Høyre kontroller, øvre knapp (ignoreres foreløpig)
      console.log('Right controller upper button pressed (d)');
      return;
    default:
      console.log('Unknown input:', msg);
      return;
  }

  console.log('Broadcasting command:', command);
  broadcastMessage(wss, command);
});
