const { SerialPort } = require('serialport');

function setupSerialInput(serialPath, baudRate, onDataCallback) {
  const port = new SerialPort({
    path: serialPath,
    baudRate: baudRate,
  });

  // Event listener for when the serial port is open
  port.on('open', () => {
    console.log(`Serial port ${serialPath} is open`);
  });

  // Event listener for serial port errors
  port.on('error', (err) => {
    console.error('Serial Port Error:', err.message);
  });

  // Event listener for incoming serial data
  port.on('data', (data) => {
    const message = data.toString().trim();
    console.log('Serial Data Received:', message);
    if (onDataCallback) {
      onDataCallback(message); // Pass the data to the callback
    }
  });

  return port;
}

module.exports = { setupSerialInput };