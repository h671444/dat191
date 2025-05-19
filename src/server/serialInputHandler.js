const { SerialPort } = require('serialport');

function setupSerialInput(serialPath, baudRate, onDataCallback) {
  const port = new SerialPort({
    path: serialPath,
    baudRate: baudRate,
  });

  
  port.on('open', () => {
    console.log(`Serial port ${serialPath} is open`);
  });

 
  port.on('error', (err) => {
    console.error('Serial Port Error:', err.message);
  });


  port.on('data', (data) => {
    const message = data.toString().trim();
    console.log('Serial Data Received:', message);
    if (onDataCallback) {
      onDataCallback(message);
    }
  });

  return port;
}

module.exports = { setupSerialInput };